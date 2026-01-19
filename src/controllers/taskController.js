const prisma = require('../config/database');
const taskService = require('../services/taskService');
const openaiService = require('../services/openaiService');


// ==================== BASIC CRUD OPERATIONS ====================

// Get all tasks
exports.getAllTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      category: req.query.category,
      source: req.query.source,
      today: req.query.today === 'true',
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      tags: req.query.tags ? req.query.tags.split(',') : undefined,
      goalId: req.query.goalId,
      dailyPlanId: req.query.dailyPlanId,
      weeklyPlanId: req.query.weeklyPlanId,
      monthlyPlanId: req.query.monthlyPlanId
    };
    
    const tasks = await taskService.getAllTasks(userId, filters);
    
    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

// Get task by ID
exports.getTaskById = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    
    const task = await taskService.getTaskById(taskId, userId);
    
    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(error.message === 'Task not found' ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

// Create task
exports.createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskData = {
      ...req.body,
      userId
    };
    
    const task = await taskService.createTask(taskData);
    
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message
    });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    
    const task = await taskService.updateTask(taskId, req.body, userId);
    
    res.json({
      success: true,
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message
    });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    
    await taskService.deleteTask(taskId, userId);
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message
    });
  }
};


// ==================== BULK OPERATIONS ====================

// Bulk create tasks
exports.bulkCreateTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tasks } = req.body;
    
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of tasks'
      });
    }
    
    const tasksData = tasks.map(task => ({
      ...task,
      userId
    }));
    
    const result = await taskService.createBulkTasks(tasksData);
    
    res.status(201).json({
      success: true,
      message: `${result.count} tasks created successfully`,
      count: result.count
    });
  } catch (error) {
    console.error('Bulk create tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tasks',
      error: error.message
    });
  }
};

// Bulk update tasks
exports.bulkUpdateTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskIds, updates } = req.body;
    
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of task IDs'
      });
    }
    
    const result = await taskService.bulkUpdateTasks(taskIds, updates, userId);
    
    res.json({
      success: true,
      message: `${result.count} tasks updated successfully`,
      count: result.count
    });
  } catch (error) {
    console.error('Bulk update tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tasks',
      error: error.message
    });
  }
};

// Bulk delete tasks
exports.bulkDeleteTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskIds } = req.body;
    
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of task IDs'
      });
    }
    
    await taskService.bulkDeleteTasks(taskIds, userId);
    
    res.json({
      success: true,
      message: `${taskIds.length} tasks deleted successfully`
    });
  } catch (error) {
    console.error('Bulk delete tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tasks',
      error: error.message
    });
  }
};


// ==================== TASK STATUS OPERATIONS ====================

// Mark task as complete
exports.completeTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    const { actualMinutes } = req.body;
    
    const task = await taskService.completeTask(taskId, userId, actualMinutes);
    
    res.json({
      success: true,
      message: 'Task marked as complete',
      task
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete task',
      error: error.message
    });
  }
};

// Skip task with reason
exports.skipTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    const { reason } = req.body;
    
    const task = await taskService.skipTask(taskId, userId, reason);
    
    res.json({
      success: true,
      message: 'Task skipped',
      task
    });
  } catch (error) {
    console.error('Skip task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to skip task',
      error: error.message
    });
  }
};


// ==================== AI-POWERED FEATURES ====================

// Generate tasks from goals
exports.generateTasksFromGoals = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's active goals
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        status: 'ACTIVE'
      }
    });
    
    if (goals.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active goals found. Please create goals first.'
      });
    }
    
    // Get user preferences
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId }
    });
    
    const userContext = {
      wakeTime: userSettings?.wakeTime,
      workHours: `${userSettings?.productivityHoursStart} - ${userSettings?.productivityHoursEnd}`,
      timezone: userSettings?.timezone
    };
    
    // Generate tasks using AI
    const result = await openaiService.generateTasksFromGoals(goals, userContext);
    
    if (!result.success) {
      throw new Error('Failed to generate tasks');
    }
    
    // Create tasks in database
    const tasksToCreate = result.tasks.map(task => ({
      ...task,
      userId,
      aiGenerated: true,
      source: 'AI_GENERATED',
      dueDate: task.dueDate ? new Date(task.dueDate) : null
    }));
    
    const createdTasks = await taskService.createBulkTasks(tasksToCreate);
    
    res.status(201).json({
      success: true,
      message: `Generated ${result.tasks.length} tasks from your goals`,
      tasks: result.tasks,
      tokensUsed: result.tokensUsed
    });
  } catch (error) {
    console.error('Generate tasks from goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate tasks from goals',
      error: error.message
    });
  }
};

// Generate daily tasks
exports.generateDailyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's goals and habits
    const [goals, habits, settings] = await Promise.all([
      prisma.goal.findMany({
        where: { userId, status: 'ACTIVE' },
        take: 10
      }),
      prisma.habit.findMany({
        where: { userId, isActive: true },
        take: 10
      }),
      prisma.userSettings.findUnique({
        where: { userId }
      })
    ]);
    
    const userPreferences = {
      wakeTime: settings?.wakeTime,
      workHours: `${settings?.productivityHoursStart}-${settings?.productivityHoursEnd}`,
      focusAreas: goals.map(g => g.category).join(', ')
    };
    
    // Generate daily tasks using AI
    const result = await openaiService.generateDailyTasks(goals, habits, userPreferences);
    
    if (!result.success) {
      throw new Error('Failed to generate daily tasks');
    }
    
    // Create tasks with today's date
    const today = new Date();
    const tasksToCreate = result.tasks.map(task => ({
      ...task,
      userId,
      aiGenerated: true,
      source: 'AI_GENERATED',
      scheduledDate: today,
      dueDate: today
    }));
    
    await taskService.createBulkTasks(tasksToCreate);
    
    res.status(201).json({
      success: true,
      message: `Generated ${result.tasks.length} tasks for today`,
      tasks: result.tasks,
      tokensUsed: result.tokensUsed
    });
  } catch (error) {
    console.error('Generate daily tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily tasks',
      error: error.message
    });
  }
};

// Breakdown complex task
exports.breakdownTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    
    const task = await taskService.getTaskById(taskId, userId);
    
    // Generate subtasks using AI
    const result = await openaiService.breakdownTask(task);
    
    if (!result.success) {
      throw new Error('Failed to breakdown task');
    }
    
    // Create subtasks
    const subtasksToCreate = result.subtasks.map(subtask => {
      // Remove 'order' field as it doesn't exist in schema
      const { order, ...validSubtask } = subtask;
      
      return {
        ...validSubtask,
        userId,
        parentTaskId: taskId,
        aiGenerated: true,
        source: 'AI_GENERATED',
        category: task.category,
        priority: subtask.priority || task.priority
      };
    });
    
    await taskService.createBulkTasks(subtasksToCreate);
    
    res.status(201).json({
      success: true,
      message: `Created ${result.subtasks.length} subtasks`,
      subtasks: result.subtasks,
      tokensUsed: result.tokensUsed
    });
  } catch (error) {
    console.error('Breakdown task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to breakdown task',
      error: error.message
    });
  }
};

// Magic Sync - Rebalance all tasks
exports.magicSync = async (req, res) => {
  try {
    const userId = req.user.id;
    const { userInput } = req.body;
    
    const result = await taskService.magicSync(userId, userInput);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Magic sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync tasks',
      error: error.message
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
