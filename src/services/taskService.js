const prisma = require('../config/database');

class TaskService {
  
  // ==================== CRUD OPERATIONS ====================
  
  // Get all tasks with advanced filtering
  async getAllTasks(userId, filters = {}) {
    const where = { userId };
    
    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }
    
    // Priority filter
    if (filters.priority) {
      where.priority = filters.priority;
    }
    
    // Category filter
    if (filters.category) {
      where.category = filters.category;
    }
    
    // Source filter (AI-generated vs manual)
    if (filters.source) {
      where.source = filters.source;
    }
    
    // Date range filters
    if (filters.startDate || filters.endDate) {
      where.dueDate = {};
      if (filters.startDate) {
        where.dueDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.dueDate.lte = new Date(filters.endDate);
      }
    }
    
    // Today's tasks
    if (filters.today) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      where.scheduledDate = {
        gte: startOfDay,
        lte: endOfDay
      };
    }
    
    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags
      };
    }
    
    // Link filters
    if (filters.goalId) where.goalId = filters.goalId;
    if (filters.dailyPlanId) where.dailyPlanId = filters.dailyPlanId;
    if (filters.weeklyPlanId) where.weeklyPlanId = filters.weeklyPlanId;
    if (filters.monthlyPlanId) where.monthlyPlanId = filters.monthlyPlanId;
    
    const tasks = await prisma.task.findMany({
      where,
      include: {
        subtasks: true,
        parentTask: true
      },
      orderBy: filters.orderBy || [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    
    return tasks;
  }
  
  // Get task by ID
  async getTaskById(taskId, userId = null) {
    const where = { id: taskId };
    if (userId) where.userId = userId;
    
    const task = await prisma.task.findUnique({
      where,
      include: {
        subtasks: {
          orderBy: { createdAt: 'asc' }
        },
        parentTask: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    return task;
  }
  
  // Create task (manual or AI-generated)
  async createTask(taskData) {
    const task = await prisma.task.create({
      data: {
        ...taskData,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        scheduledDate: taskData.scheduledDate ? new Date(taskData.scheduledDate) : null,
        source: taskData.source || (taskData.aiGenerated ? 'AI_GENERATED' : 'MANUAL')
      },
      include: {
        subtasks: true
      }
    });
    
    // Log activity
    await this.logTaskActivity(task.userId, 'TASK_CREATED', {
      taskId: task.id,
      title: task.title,
      source: task.source
    });
    
    return task;
  }
  
  // Bulk create tasks (useful for AI-generated tasks)
  async createBulkTasks(tasksData) {
    const tasks = await prisma.task.createMany({
      data: tasksData.map(task => ({
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        scheduledDate: task.scheduledDate ? new Date(task.scheduledDate) : null,
        source: task.source || (task.aiGenerated ? 'AI_GENERATED' : 'MANUAL')
      }))
    });
    
    return tasks;
  }
  
  // Update task
  async updateTask(taskId, updateData, userId = null) {
    const where = { id: taskId };
    if (userId) where.userId = userId;
    
    // Handle date conversions
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }
    if (updateData.scheduledDate) {
      updateData.scheduledDate = new Date(updateData.scheduledDate);
    }
    
    // Auto-set timestamps based on status changes
    if (updateData.status === 'COMPLETED' && !updateData.completedAt) {
      updateData.completedAt = new Date();
      updateData.completionCount = { increment: 1 };
    }
    
    if (updateData.status === 'IN_PROGRESS' && !updateData.startedAt) {
      updateData.startedAt = new Date();
    }
    
    if (updateData.status === 'CANCELED' && !updateData.canceledAt) {
      updateData.canceledAt = new Date();
    }
    
    if (updateData.status === 'SKIPPED') {
      updateData.skipCount = { increment: 1 };
    }
    
    const task = await prisma.task.update({
      where,
      data: updateData,
      include: {
        subtasks: true
      }
    });
    
    // Update streak if completed
    if (updateData.status === 'COMPLETED') {
      await this.updateTaskStreak(taskId, task.userId);
    }
    
    // Log activity
    await this.logTaskActivity(task.userId, 'TASK_UPDATED', {
      taskId: task.id,
      title: task.title,
      changes: Object.keys(updateData)
    });
    
    return task;
  }
  
  // Delete task
  async deleteTask(taskId, userId = null) {
    const where = { id: taskId };
    if (userId) where.userId = userId;
    
    await prisma.task.delete({
      where
    });
  }
  
  // Bulk update tasks
  async bulkUpdateTasks(taskIds, updateData, userId) {
    const where = {
      id: { in: taskIds },
      userId
    };
    
    const tasks = await prisma.task.updateMany({
      where,
      data: updateData
    });
    
    return tasks;
  }
  
  // Bulk delete tasks
  async bulkDeleteTasks(taskIds, userId) {
    const where = {
      id: { in: taskIds },
      userId
    };
    
    await prisma.task.deleteMany({ where });
  }
  
  
  // ==================== TASK COMPLETION & TRACKING ====================
  
  // Mark task as complete
  async completeTask(taskId, userId, actualMinutes = null) {
    const task = await this.updateTask(taskId, {
      status: 'COMPLETED',
      completedAt: new Date(),
      actualMinutes: actualMinutes || undefined
    }, userId);
    
    // Update related plan completion rates
    if (task.dailyPlanId) {
      await this.updatePlanCompletion(task.dailyPlanId, 'DailyPlan');
    }
    
    return task;
  }
  
  // Mark task as skipped with reason
  async skipTask(taskId, userId, reason = null) {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId }
    });
    
    if (!task) throw new Error('Task not found');
    
    const skipReasons = task.skipReasons || [];
    if (reason) skipReasons.push(reason);
    
    return await this.updateTask(taskId, {
      status: 'SKIPPED',
      skipReasons: skipReasons
    }, userId);
  }
  
  // Update task streak
  async updateTaskStreak(taskId, userId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId }
    });
    
    if (!task || !task.isRecurring) return;
    
    // Check if completed yesterday or today
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const lastCompletion = task.completedAt;
    
    if (lastCompletion && lastCompletion >= yesterday) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          currentStreak: { increment: 1 }
        }
      });
    } else {
      // Reset streak
      await prisma.task.update({
        where: { id: taskId },
        data: {
          currentStreak: 1
        }
      });
    }
  }
  
  
  // ==================== ANALYTICS & STATS ====================
  
  // Get overdue tasks
  async getOverdueTasks(userId) {
    const now = new Date();
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: { notIn: ['COMPLETED', 'CANCELED'] },
        dueDate: {
          lt: now
        }
      },
      orderBy: { dueDate: 'asc' }
    });
    
    return tasks;
  }
  
  // Get today's tasks
  async getTodaysTasks(userId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        OR: [
          {
            scheduledDate: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          {
            dueDate: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        ]
      },
      include: {
        subtasks: true
      },
      orderBy: [
        { priority: 'desc' },
        { dueTime: 'asc' }
      ]
    });
    
    return tasks;
  }
  
  // Get task statistics
  async getTaskStats(userId, dateRange = null) {
    const where = { userId };
    
    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end
      };
    }
    
    const [total, completed, pending, overdue, inProgress] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.task.count({ where: { ...where, status: 'TODO' } }),
      prisma.task.count({
        where: {
          ...where,
          status: { notIn: ['COMPLETED', 'CANCELED'] },
          dueDate: { lt: new Date() }
        }
      }),
      prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } })
    ]);
    
    // Calculate completion rate
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    // Get AI-generated vs manual stats
    const aiGenerated = await prisma.task.count({
      where: { ...where, aiGenerated: true }
    });
    
    const manual = total - aiGenerated;
    
    return {
      total,
      completed,
      pending,
      overdue,
      inProgress,
      completionRate: Math.round(completionRate * 10) / 10,
      aiGenerated,
      manual
    };
  }
  
  // Get productivity analytics
  async getProductivityAnalytics(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        completedAt: {
          gte: startDate
        }
      },
      orderBy: { completedAt: 'asc' }
    });
    
    // Group by day
    const dailyCompletion = {};
    tasks.forEach(task => {
      const date = task.completedAt.toISOString().split('T')[0];
      dailyCompletion[date] = (dailyCompletion[date] || 0) + 1;
    });
    
    // Calculate average completion time
    const tasksWithTime = tasks.filter(t => t.actualMinutes);
    const avgCompletionTime = tasksWithTime.length > 0
      ? tasksWithTime.reduce((sum, t) => sum + t.actualMinutes, 0) / tasksWithTime.length
      : 0;
    
    // Find most productive time
    const hourlyCompletion = {};
    tasks.forEach(task => {
      const hour = task.completedAt.getHours();
      hourlyCompletion[hour] = (hourlyCompletion[hour] || 0) + 1;
    });
    
    const mostProductiveHour = Object.entries(hourlyCompletion)
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      totalCompleted: tasks.length,
      dailyCompletion,
      avgCompletionTime: Math.round(avgCompletionTime),
      mostProductiveHour: mostProductiveHour ? `${mostProductiveHour[0]}:00` : null,
      currentStreak: await this.calculateCurrentStreak(userId)
    };
  }
  
  // Calculate current completion streak
  async calculateCurrentStreak(userId) {
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    while (true) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const completedToday = await prisma.task.count({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });
      
      if (completedToday === 0) break;
      
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
      
      // Limit to prevent infinite loop
      if (streak > 365) break;
    }
    
    return streak;
  }
  
  
  // ==================== MAGIC SYNC FEATURE ====================
  
  // Magic Sync - intelligently reorganize and rebalance tasks
  async magicSync(userId, userInput = null) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true
      }
    });
    
    // Get all pending tasks
    const pendingTasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' }
      ]
    });
    
    if (pendingTasks.length === 0) {
      return {
        success: true,
        message: 'No pending tasks to sync',
        tasksUpdated: 0
      };
    }
    
    // Get today's date and time
    const now = new Date();
    const settings = user.settings;
    
    // Categorize tasks by urgency and energy level
    const urgent = pendingTasks.filter(t => t.priority === 'URGENT' || (t.dueDate && t.dueDate < now));
    const highPriority = pendingTasks.filter(t => t.priority === 'HIGH' && !urgent.includes(t));
    const mediumPriority = pendingTasks.filter(t => t.priority === 'MEDIUM');
    const lowPriority = pendingTasks.filter(t => t.priority === 'LOW');
    
    // Re-schedule tasks based on priority and time available
    const updates = [];
    let currentTime = new Date();
    
    // Schedule urgent tasks first
    for (const task of urgent) {
      updates.push({
        id: task.id,
        scheduledDate: currentTime,
        aiAdjusted: true,
        adjustmentReason: 'Rescheduled by Magic Sync - Urgent priority'
      });
    }
    
    // Then high priority
    for (const task of highPriority) {
      currentTime = new Date(currentTime.getTime() + (task.estimatedMinutes || 30) * 60000);
      updates.push({
        id: task.id,
        scheduledDate: currentTime,
        aiAdjusted: true,
        adjustmentReason: 'Rescheduled by Magic Sync - High priority'
      });
    }
    
    // Update all tasks
    for (const update of updates) {
      await prisma.task.update({
        where: { id: update.id },
        data: {
          scheduledDate: update.scheduledDate,
          aiAdjusted: update.aiAdjusted,
          adjustmentReason: update.adjustmentReason
        }
      });
    }
    
    return {
      success: true,
      message: 'Tasks successfully synced and rebalanced',
      tasksUpdated: updates.length,
      prioritization: {
        urgent: urgent.length,
        high: highPriority.length,
        medium: mediumPriority.length,
        low: lowPriority.length
      }
    };
  }
  
  
  // ==================== AI PATTERN DETECTION ====================
  
  // Detect patterns in task completion
  async detectPatterns(userId) {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        completedAt: { not: null }
      },
      orderBy: { completedAt: 'desc' },
      take: 100
    });
    
    if (tasks.length < 10) {
      return {
        message: 'Not enough data to detect patterns yet',
        patterns: []
      };
    }
    
    const patterns = [];
    
    // Pattern 1: Most skipped task categories
    const skippedTasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'SKIPPED'
      }
    });
    
    const skipsByCategory = {};
    skippedTasks.forEach(task => {
      if (task.category) {
        skipsByCategory[task.category] = (skipsByCategory[task.category] || 0) + 1;
      }
    });
    
    const mostSkippedCategory = Object.entries(skipsByCategory)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostSkippedCategory) {
      patterns.push({
        type: 'SKIP_PATTERN',
        description: `You frequently skip ${mostSkippedCategory[0]} tasks`,
        suggestion: `Consider breaking down ${mostSkippedCategory[0]} tasks into smaller steps`
      });
    }
    
    // Pattern 2: Best productivity hours
    const hourlyData = {};
    tasks.forEach(task => {
      const hour = task.completedAt.getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });
    
    const bestHour = Object.entries(hourlyData)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (bestHour) {
      patterns.push({
        type: 'PRODUCTIVITY_PEAK',
        description: `Your peak productivity is around ${bestHour[0]}:00`,
        suggestion: `Schedule high-priority tasks during this time`
      });
    }
    
    // Pattern 3: Task estimation accuracy
    const tasksWithEstimates = tasks.filter(t => t.estimatedMinutes && t.actualMinutes);
    if (tasksWithEstimates.length > 5) {
      const avgEstimate = tasksWithEstimates.reduce((sum, t) => sum + t.estimatedMinutes, 0) / tasksWithEstimates.length;
      const avgActual = tasksWithEstimates.reduce((sum, t) => sum + t.actualMinutes, 0) / tasksWithEstimates.length;
      const accuracy = (avgEstimate / avgActual) * 100;
      
      if (accuracy < 80) {
        patterns.push({
          type: 'ESTIMATION_ERROR',
          description: `You tend to underestimate task duration by ${Math.round(100 - accuracy)}%`,
          suggestion: 'Add buffer time to your estimates'
        });
      } else if (accuracy > 120) {
        patterns.push({
          type: 'ESTIMATION_ERROR',
          description: `You tend to overestimate task duration`,
          suggestion: 'You can schedule more tasks than you think'
        });
      }
    }
    
    return {
      success: true,
      patterns,
      totalAnalyzed: tasks.length
    };
  }
  
  
  // ==================== HELPER FUNCTIONS ====================
  
  // Update plan completion rate when task status changes
  async updatePlanCompletion(planId, planType) {
    const modelMap = {
      'DailyPlan': prisma.dailyPlan,
      'WeeklyPlan': prisma.weeklyPlan,
      'MonthlyPlan': prisma.monthlyPlan
    };
    
    const model = modelMap[planType];
    if (!model) return;
    
    const fieldMap = {
      'DailyPlan': 'dailyPlanId',
      'WeeklyPlan': 'weeklyPlanId',
      'MonthlyPlan': 'monthlyPlanId'
    };
    
    const field = fieldMap[planType];
    
    const tasks = await prisma.task.findMany({
      where: { [field]: planId }
    });
    
    if (tasks.length === 0) return;
    
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const completionRate = (completed / tasks.length) * 100;
    
    await model.update({
      where: { id: planId },
      data: {
        completionRate: Math.round(completionRate * 10) / 10,
        tasksCompleted: completed,
        tasksTotal: tasks.length
      }
    });
  }
  
  // Log task activity
  async logTaskActivity(userId, activityType, metadata) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          type: activityType,
          description: `Task activity: ${activityType}`,
          metadata
        }
      });
    } catch (error) {
      console.error('Failed to log task activity:', error);
    }
  }
}

module.exports = new TaskService();
