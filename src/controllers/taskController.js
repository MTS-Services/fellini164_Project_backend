const prisma = require('../config/database');
const taskService = require('../services/taskService');
const openaiService = require('../services/openaiService');

const getErrorStatus = (error, fallback = 500) => error.statusCode || fallback;

// ==================== BASIC CRUD OPERATIONS ====================

exports.getAllTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      category: req.query.category,
      source: req.query.source,
      goalId: req.query.goalId,
      dailyPlanId: req.query.dailyPlanId,
      weeklyPlanId: req.query.weeklyPlanId,
      monthlyPlanId: req.query.monthlyPlanId,
      aiGenerated: req.query.aiGenerated,
      parentOnly: req.query.parentOnly,
      search: req.query.search,
      dueFilter: req.query.dueFilter,
      today: req.query.today,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      tags: req.query.tags ? req.query.tags.split(',') : undefined,
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await taskService.getAllTasks(userId, filters);

    res.json({
      success: true,
      count: result.tasks.length,
      tasks: result.tasks,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message,
    });
  }
};

exports.getBoardSummary = async (req, res) => {
  try {
    const summary = await taskService.getBoardSummary(req.user.id);
    res.json({ success: true, summary });
  } catch (error) {
    console.error('Get board summary error:', error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: 'Failed to fetch board summary',
      error: error.message,
    });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user.id);
    res.json({ success: true, task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createTask = async (req, res) => {
  try {
    const task = await taskService.createTask(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task,
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to create task',
    });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body, req.user.id);
    res.json({
      success: true,
      message: 'Task updated successfully',
      task,
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || 'Failed to update task',
    });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    await taskService.deleteTask(req.params.id, req.user.id);
    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || 'Failed to delete task',
    });
  }
};


// ==================== BULK OPERATIONS ====================

exports.bulkCreateTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tasks } = req.body;

    const tasksData = tasks.map((task) => ({ ...task, userId }));
    const result = await taskService.createBulkTasks(tasksData);

    res.status(201).json({
      success: true,
      message: `${result.count} tasks created successfully`,
      count: result.count,
      tasks: result.tasks,
    });
  } catch (error) {
    console.error('Bulk create tasks error:', error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to create tasks',
    });
  }
};

exports.bulkUpdateTasks = async (req, res) => {
  try {
    const { taskIds, updates } = req.body;
    const result = await taskService.bulkUpdateTasks(taskIds, updates, req.user.id);

    res.json({
      success: true,
      message: `${result.count} tasks updated successfully`,
      count: result.count,
    });
  } catch (error) {
    console.error('Bulk update tasks error:', error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || 'Failed to update tasks',
    });
  }
};

exports.bulkDeleteTasks = async (req, res) => {
  try {
    const { taskIds } = req.body;
    await taskService.bulkDeleteTasks(taskIds, req.user.id);

    res.json({
      success: true,
      message: `${taskIds.length} tasks deleted successfully`,
    });
  } catch (error) {
    console.error('Bulk delete tasks error:', error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to delete tasks',
    });
  }
};

// ==================== TASK STATUS OPERATIONS ====================

exports.updateTaskStatus = async (req, res) => {
  try {
    const task = await taskService.updateTaskStatus(
      req.params.id,
      req.user.id,
      req.body.status,
    );
    res.json({
      success: true,
      message: 'Task status updated',
      task,
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || 'Failed to update task status',
    });
  }
};

exports.completeTask = async (req, res) => {
  try {
    const task = await taskService.completeTask(
      req.params.id,
      req.user.id,
      req.body.actualMinutes,
    );
    res.json({
      success: true,
      message: 'Task marked as complete',
      task,
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || 'Failed to complete task',
    });
  }
};

exports.skipTask = async (req, res) => {
  try {
    const task = await taskService.skipTask(req.params.id, req.user.id, req.body.reason);
    res.json({
      success: true,
      message: 'Task skipped',
      task,
    });
  } catch (error) {
    console.error('Skip task error:', error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || 'Failed to skip task',
    });
  }
};

exports.getSubtasks = async (req, res) => {
  try {
    const subtasks = await taskService.getSubtasks(req.params.id, req.user.id);
    res.json({
      success: true,
      count: subtasks.length,
      subtasks,
    });
  } catch (error) {
    console.error('Get subtasks error:', error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || 'Failed to fetch subtasks',
    });
  }
};


// ==================== AI-POWERED FEATURES ====================

exports.generateTaskWithAI = async (req, res) => {
  try {
    const { prompt, goalId, category } = req.body;
    const result = await taskService.generateTaskWithAI(req.user.id, {
      prompt,
      goalId,
      category,
    });

    res.status(201).json({
      success: true,
      message: 'Task generated successfully',
      task: result.task,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error('Generate task with AI error:', error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to generate task',
    });
  }
};

exports.generateTasksFromGoals = async (req, res) => {
  try {
    const userId = req.user.id;

    const goals = await prisma.goal.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    if (goals.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active goals found. Please create goals first.',
      });
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    const userContext = {
      wakeTime: userSettings?.wakeTime,
      workHours: `${userSettings?.productivityHoursStart} - ${userSettings?.productivityHoursEnd}`,
      timezone: userSettings?.timezone,
    };

    const result = await openaiService.generateTasksFromGoals(goals, userContext);

    if (!result.success) {
      throw new Error('Failed to generate tasks');
    }

    const tasksToCreate = result.tasks.map((task) => ({
      ...task,
      userId,
      aiGenerated: true,
      source: 'AI_GENERATED',
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
    }));

    const created = await taskService.createBulkTasks(tasksToCreate);

    res.status(201).json({
      success: true,
      message: `Generated ${created.count} tasks from your goals`,
      count: created.count,
      tasks: created.tasks,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error('Generate tasks from goals error:', error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to generate tasks from goals',
    });
  }
};

exports.generateDailyTasks = async (req, res) => {
  try {
    const userId = req.user.id;

    const [goals, habits, settings] = await Promise.all([
      prisma.goal.findMany({
        where: { userId, status: 'ACTIVE' },
        take: 10,
      }),
      prisma.habit.findMany({
        where: { userId, isActive: true },
        take: 10,
      }),
      prisma.userSettings.findUnique({
        where: { userId },
      }),
    ]);

    const userPreferences = {
      wakeTime: settings?.wakeTime,
      workHours: `${settings?.productivityHoursStart}-${settings?.productivityHoursEnd}`,
      focusAreas: goals.map((g) => g.category).join(', '),
    };

    const result = await openaiService.generateDailyTasks(goals, habits, userPreferences);

    if (!result.success) {
      throw new Error('Failed to generate daily tasks');
    }

    const today = new Date();
    const tasksToCreate = result.tasks.map((task) => ({
      ...task,
      userId,
      aiGenerated: true,
      source: 'AI_GENERATED',
      scheduledDate: today,
      dueDate: today,
    }));

    const created = await taskService.createBulkTasks(tasksToCreate);

    res.status(201).json({
      success: true,
      message: `Generated ${created.count} tasks for today`,
      count: created.count,
      tasks: created.tasks,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error('Generate daily tasks error:', error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to generate daily tasks',
    });
  }
};

exports.suggestWithAI = async (req, res) => {
  try {
    const result = await taskService.createAiSuggestion(
      req.params.id,
      req.user.id,
      {
        action: req.body.action,
        message: req.body.message,
        regenerate: req.body.regenerate === true,
      },
    );

    res.json({
      success: true,
      message: "Suggestion ready — accept to apply or dismiss to cancel",
      ...result,
    });
  } catch (error) {
    console.error('Task AI suggest error:', error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to create task suggestion',
    });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const result = await taskService.getAiSuggestions(
      req.params.id,
      req.user.id,
      { status: req.query.status || 'pending' },
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get task AI suggestions error:', error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to fetch suggestions',
    });
  }
};

exports.getSuggestion = async (req, res) => {
  try {
    const result = await taskService.getAiSuggestion(
      req.params.suggestionId,
      req.user.id,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get task AI suggestion error:', error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || 'Failed to fetch suggestion',
    });
  }
};

exports.acceptSuggestion = async (req, res) => {
  try {
    const result = await taskService.acceptAiSuggestion(
      req.params.suggestionId,
      req.user.id,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Accept task suggestion error:', error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || 'Failed to accept suggestion',
    });
  }
};

exports.dismissSuggestion = async (req, res) => {
  try {
    const result = await taskService.dismissAiSuggestion(
      req.params.suggestionId,
      req.user.id,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Dismiss task suggestion error:', error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || 'Failed to dismiss suggestion',
    });
  }
};

exports.undoAiChange = async (req, res) => {
  try {
    const result = await taskService.undoLastAiChange(
      req.params.id,
      req.user.id,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Undo task AI change error:', error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || 'Failed to undo AI change',
    });
  }
};

exports.magicSync = async (req, res) => {
  try {
    const result = await taskService.magicSync(req.user.id, req.body.userInput);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Magic sync error:', error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to sync tasks',
    });
  }
};


// ==================== ANALYTICS & INSIGHTS ====================

// Get task statistics
exports.getTaskStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate)
    } : null;
    
    const stats = await taskService.getTaskStats(userId, dateRange);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task statistics',
      error: error.message
    });
  }
};

// Get productivity analytics
exports.getProductivityAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;
    
    const analytics = await taskService.getProductivityAnalytics(userId, days);
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get productivity analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch productivity analytics',
      error: error.message
    });
  }
};

// Detect patterns
exports.detectPatterns = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const patterns = await taskService.detectPatterns(userId);
    
    res.json({
      success: true,
      ...patterns
    });
  } catch (error) {
    console.error('Detect patterns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect patterns',
      error: error.message
    });
  }
};

// Get overdue tasks
exports.getOverdueTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const tasks = await taskService.getOverdueTasks(userId);
    
    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('Get overdue tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue tasks',
      error: error.message
    });
  }
};

// Get today's tasks
exports.getTodaysTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const tasks = await taskService.getTodaysTasks(userId);
    
    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('Get today\'s tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s tasks',
      error: error.message
    });
  }
};


// ==================== ADMIN MANAGEMENT ENDPOINTS ====================


exports.adminGetAllTasks = async (req, res) => {
  try {
    const { 
      userId, 
      status, 
      priority, 
      source, 
      category,
      aiGenerated,
      page = 1, 
      limit = 5000,
      search,
      startDate,
      endDate
    } = req.query;
    
    // Build where clause
    const where = {};
    
    if (userId) where.userId = userId;
    if (status) where.status = status.toUpperCase();
    if (priority) where.priority = priority.toUpperCase();
    if (source) where.source = source.toUpperCase();
    if (category) where.category = category;
    if (aiGenerated !== undefined) where.aiGenerated = aiGenerated === 'true';
    
   
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
 
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate);
      if (endDate) where.dueDate.lte = new Date(endDate);
    }
    
    // Get total count
    const totalCount = await prisma.task.count({ where });
    
    // Get tasks with pagination
    const tasks = await prisma.task.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            subscriptionPlan: true
          }
        },
        parentTask: {
          select: {
            id: true,
            title: true
          }
        },
        subtasks: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });
    
    res.json({
      success: true,
      count: tasks.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      tasks
    });
  } catch (error) {
    console.error('Admin get all tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

// Get specific user's tasks (Admin only)
exports.adminGetUserTasks = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, priority, limit = 1000 } = req.query;
    
    const where = { userId };
    if (status) where.status = status.toUpperCase();
    if (priority) where.priority = priority.toUpperCase();
    
    const tasks = await prisma.task.findMany({
      where,
      include: {
        parentTask: {
          select: { id: true, title: true }
        },
        subtasks: {
          select: { id: true, title: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });
    
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
        userStatus: true
      }
    });

    res.json({
      success: true,
      user,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('Admin get user tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user tasks',
      error: error.message
    });
  }
};

// Get task analytics dashboard (Admin only)
exports.adminGetTaskAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
    }
    
    // Get comprehensive statistics
    const [
      totalTasks,
      aiGeneratedTasks,
      manualTasks,
      completedTasks,
      pendingTasks,
      tasksByStatus,
      tasksByPriority,
      tasksBySource,
      tasksByCategory,
      aiCompletionRate,
      manualCompletionRate,
      tasksCreatedToday
    ] = await Promise.all([
      // Total tasks
      prisma.task.count({
        where: dateFilter.gte ? { createdAt: dateFilter } : {}
      }),
      
      // AI generated tasks
      prisma.task.count({
        where: {
          aiGenerated: true,
          ...(dateFilter.gte && { createdAt: dateFilter })
        }
      }),
      
      // Manual tasks
      prisma.task.count({
        where: {
          aiGenerated: false,
          ...(dateFilter.gte && { createdAt: dateFilter })
        }
      }),
      
      // Completed tasks
      prisma.task.count({
        where: {
          status: 'COMPLETED',
          ...(dateFilter.gte && { completedAt: dateFilter })
        }
      }),
      
      // Pending tasks (TODO + IN_PROGRESS)
      prisma.task.count({
        where: {
          status: { in: ['TODO', 'IN_PROGRESS'] },
          ...(dateFilter.gte && { createdAt: dateFilter })
        }
      }),
      
      // Tasks by status
      prisma.task.groupBy({
        by: ['status'],
        _count: true,
        where: dateFilter.gte ? { createdAt: dateFilter } : {}
      }),
      
      // Tasks by priority
      prisma.task.groupBy({
        by: ['priority'],
        _count: true,
        where: dateFilter.gte ? { createdAt: dateFilter } : {}
      }),
      
      // Tasks by source
      prisma.task.groupBy({
        by: ['source'],
        _count: true,
        where: dateFilter.gte ? { createdAt: dateFilter } : {}
      }),
      
      // Tasks by category
      prisma.task.groupBy({
        by: ['category'],
        _count: true,
        where: {
          category: { not: null },
          ...(dateFilter.gte && { createdAt: dateFilter })
        }
      }),
      
      // AI task completion rate
      prisma.task.findMany({
        where: {
          aiGenerated: true,
          ...(dateFilter.gte && { createdAt: dateFilter })
        },
        select: { status: true }
      }).then(tasks => {
        const completed = tasks.filter(t => t.status === 'COMPLETED').length;
        return tasks.length > 0 ? (completed / tasks.length * 100).toFixed(2) : 0;
      }),
      
      // Manual task completion rate
      prisma.task.findMany({
        where: {
          aiGenerated: false,
          ...(dateFilter.gte && { createdAt: dateFilter })
        },
        select: { status: true }
      }).then(tasks => {
        const completed = tasks.filter(t => t.status === 'COMPLETED').length;
        return tasks.length > 0 ? (completed / tasks.length * 100).toFixed(2) : 0;
      }),
      
      // Tasks created today
      prisma.task.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);
    
    // Format grouped data
    const statusBreakdown = {};
    tasksByStatus.forEach(item => {
      statusBreakdown[item.status] = item._count;
    });
    
    const priorityBreakdown = {};
    tasksByPriority.forEach(item => {
      priorityBreakdown[item.priority] = item._count;
    });
    
    const sourceBreakdown = {};
    tasksBySource.forEach(item => {
      sourceBreakdown[item.source] = item._count;
    });
    
    const categoryBreakdown = {};
    tasksByCategory.forEach(item => {
      categoryBreakdown[item.category] = item._count;
    });
    
    // Calculate AI vs Manual percentage
    const aiPercentage = totalTasks > 0 ? (aiGeneratedTasks / totalTasks * 100).toFixed(2) : 0;
    const manualPercentage = totalTasks > 0 ? (manualTasks / totalTasks * 100).toFixed(2) : 0;
    
    // Calculate overall completion rate
    const overallCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      analytics: {
        summary: {
          totalTasks,
          completedTasks,
          pendingTasks,
          tasksCreatedToday,
          overallCompletionRate: parseFloat(overallCompletionRate)
        },
        aiVsManual: {
          aiGenerated: {
            count: aiGeneratedTasks,
            percentage: parseFloat(aiPercentage),
            completionRate: parseFloat(aiCompletionRate)
          },
          manual: {
            count: manualTasks,
            percentage: parseFloat(manualPercentage),
            completionRate: parseFloat(manualCompletionRate)
          }
        },
        breakdown: {
          byStatus: statusBreakdown,
          byPriority: priorityBreakdown,
          bySource: sourceBreakdown,
          byCategory: categoryBreakdown
        }
      }
    });
  } catch (error) {
    console.error('Admin task analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task analytics',
      error: error.message
    });
  }
};

// Get AI performance metrics (Admin only)
exports.adminGetAIPerformance = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get AI task statistics
    const [
      totalAITasks,
      aiTasksCompleted,
      aiTasksSkipped,
      aiTasksCanceled,
      mostCommonAICategories,
      aiTasksPerDay
    ] = await Promise.all([
      // Total AI tasks
      prisma.task.count({
        where: {
          aiGenerated: true,
          createdAt: { gte: startDate }
        }
      }),
      
      // AI tasks completed
      prisma.task.count({
        where: {
          aiGenerated: true,
          status: 'COMPLETED',
          createdAt: { gte: startDate }
        }
      }),
      
      // AI tasks skipped
      prisma.task.count({
        where: {
          aiGenerated: true,
          status: 'SKIPPED',
          createdAt: { gte: startDate }
        }
      }),
      
      // AI tasks canceled
      prisma.task.count({
        where: {
          aiGenerated: true,
          status: 'CANCELED',
          createdAt: { gte: startDate }
        }
      }),
      
      // Most common AI categories
      prisma.task.groupBy({
        by: ['category'],
        _count: true,
        where: {
          aiGenerated: true,
          category: { not: null },
          createdAt: { gte: startDate }
        },
        orderBy: { _count: { category: 'desc' } },
        take: 10
      }),
      
      // AI tasks created per day (last 7 days)
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM "Task"
        WHERE "aiGenerated" = true 
        AND "createdAt" >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      `
    ]);
    
    const completionRate = totalAITasks > 0 ? (aiTasksCompleted / totalAITasks * 100).toFixed(2) : 0;
    const skipRate = totalAITasks > 0 ? (aiTasksSkipped / totalAITasks * 100).toFixed(2) : 0;
    const cancelRate = totalAITasks > 0 ? (aiTasksCanceled / totalAITasks * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      period: `Last ${days} days`,
      aiPerformance: {
        totalAITasks,
        completed: aiTasksCompleted,
        skipped: aiTasksSkipped,
        canceled: aiTasksCanceled,
        completionRate: parseFloat(completionRate),
        skipRate: parseFloat(skipRate),
        cancelRate: parseFloat(cancelRate),
        topCategories: mostCommonAICategories.map(c => ({
          category: c.category,
          count: c._count
        })),
        dailyGeneration: aiTasksPerDay
      }
    });
  } catch (error) {
    console.error('Admin AI performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI performance metrics',
      error: error.message
    });
  }
};

// Manually edit a user's task (Admin only)
exports.adminUpdateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.userId;
    delete updateData.createdAt;
    
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      message: 'Task updated successfully by admin',
      task
    });
  } catch (error) {
    console.error('Admin update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message
    });
  }
};

// Delete a user's task (Admin only)
exports.adminDeleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Delete all subtasks first
    await prisma.task.deleteMany({
      where: { parentTaskId: taskId }
    });
    
    // Delete the main task
    await prisma.task.delete({
      where: { id: taskId }
    });
    
    res.json({
      success: true,
      message: 'Task and all subtasks deleted successfully by admin'
    });
  } catch (error) {
    console.error('Admin delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message
    });
  }
};

// Export tasks to CSV (Admin only)
exports.adminExportTasks = async (req, res) => {
  try {
    const { userId, startDate, endDate, status } = req.query;
    
    const where = {};
    if (userId) where.userId = userId;
    if (status) where.status = status.toUpperCase();
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const tasks = await prisma.task.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            fullName: true
          }
        },
        goal: {
          select: {
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Build CSV
    const csvHeader = 'ID,User Email,User Name,Title,Description,Status,Priority,Category,Source,AI Generated,Due Date,Completed At,Created At\n';
    const csvRows = tasks.map(task => {
      return [
        task.id,
        task.user.email,
        task.user.fullName || '',
        `"${task.title}"`,
        `"${task.description || ''}"`,
        task.status,
        task.priority,
        task.category || '',
        task.source,
        task.aiGenerated,
        task.dueDate || '',
        task.completedAt || '',
        task.createdAt
      ].join(',');
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tasks-export-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Admin export tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export tasks',
      error: error.message
    });
  }
};

// Get system health metrics for tasks (Admin only)
exports.adminGetSystemHealth = async (req, res) => {
  try {
    const [
      totalUsers,
      usersWithTasks,
      averageTasksPerUser,
      tasksCreatedLast24h,
      tasksCompletedLast24h,
      aiGenerationSuccessRate
    ] = await Promise.all([
      // Total users
      prisma.user.count({ where: { role: 'USER' } }),
      
      // Users with at least one task
      prisma.task.groupBy({
        by: ['userId'],
        _count: true
      }).then(result => result.length),
      
      // Average tasks per user
      prisma.task.groupBy({
        by: ['userId'],
        _count: true
      }).then(result => {
        const total = result.reduce((sum, item) => sum + item._count, 0);
        return result.length > 0 ? (total / result.length).toFixed(2) : 0;
      }),
      
      // Tasks created in last 24 hours
      prisma.task.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Tasks completed in last 24 hours
      prisma.task.count({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // AI generation success rate (tasks that weren't immediately deleted/canceled)
      prisma.task.count({
        where: {
          aiGenerated: true,
          status: { not: 'CANCELED' },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }).then(async (successCount) => {
        const totalAI = await prisma.task.count({
          where: {
            aiGenerated: true,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        });
        return totalAI > 0 ? (successCount / totalAI * 100).toFixed(2) : 0;
      })
    ]);
    
    const engagementRate = totalUsers > 0 ? (usersWithTasks / totalUsers * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      systemHealth: {
        users: {
          total: totalUsers,
          withTasks: usersWithTasks,
          engagementRate: parseFloat(engagementRate)
        },
        tasks: {
          averagePerUser: parseFloat(averageTasksPerUser),
          createdLast24h: tasksCreatedLast24h,
          completedLast24h: tasksCompletedLast24h
        },
        ai: {
          generationSuccessRate: parseFloat(aiGenerationSuccessRate)
        }
      }
    });
  } catch (error) {
    console.error('Admin system health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health metrics',
      error: error.message
    });
  }
};
