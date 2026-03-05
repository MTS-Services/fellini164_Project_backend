const prisma = require('../config/database');
const { PlanType, PlanCategory, PlanPriority, PlanStatusEnum } = require('@prisma/client');
const weeklyPlanTaskService = require('../services/weeklyPlanTaskService');

/**
 * Create a new weekly plan
 */
exports.createWeeklyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      startDate,
      dueDate,
      category,
      priority,
      status,
    } = req.body;

    if (!title || !startDate || !category || !priority) {
      return res.status(400).json({
        success: false,
        message: 'Title, startDate, category, and priority are required',
      });
    }

    const plan = await prisma.plan.create({
      data: {
        userId,
        title,
        description: description || null,
        planType: PlanType.WEEKLY,
        startDate: new Date(startDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        category,
        priority,
        status: status || PlanStatusEnum.TODO,
        isManuallyCreated: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Weekly plan created successfully',
      data: plan,
    });
  } catch (error) {
    console.error('Error creating weekly plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create weekly plan',
      error: error.message,
    });
  }
};

/**
 * Get all weekly plans for a user
 */
exports.getAllWeeklyPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, priority, status, startDate, endDate } = req.query;

    const filters = {
      userId,
      planType: PlanType.WEEKLY,
    };

    if (category) filters.category = category;
    if (priority) filters.priority = priority;
    if (status) filters.status = status;

    if (startDate || endDate) {
      filters.startDate = {};
      if (startDate) filters.startDate.gte = new Date(startDate);
      if (endDate) filters.startDate.lte = new Date(endDate);
    }

    const plans = await prisma.plan.findMany({
      where: filters,
      orderBy: [
        { priority: 'desc' },
        { startDate: 'asc' },
      ],
    });

    res.json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    console.error('Error fetching weekly plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly plans',
      error: error.message,
    });
  }
};

/**
 * Get a single weekly plan by ID
 */
exports.getWeeklyPlanById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
        planType: PlanType.WEEKLY,
      },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Weekly plan not found',
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error fetching weekly plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly plan',
      error: error.message,
    });
  }
};

/**
 * Update a weekly plan
 */
exports.updateWeeklyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, description, startDate, dueDate, category, priority, status } = req.body;

    const existingPlan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
        planType: PlanType.WEEKLY,
      },
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Weekly plan not found',
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      if (status === PlanStatusEnum.DONE && !existingPlan.completedAt) {
        updateData.completedAt = new Date();
      }
      if (status !== PlanStatusEnum.DONE && existingPlan.completedAt) {
        updateData.completedAt = null;
      }
    }

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Weekly plan updated successfully',
      data: updatedPlan,
    });
  } catch (error) {
    console.error('Error updating weekly plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update weekly plan',
      error: error.message,
    });
  }
};

/**
 * Delete a weekly plan
 */
exports.deleteWeeklyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingPlan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
        planType: PlanType.WEEKLY,
      },
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Weekly plan not found',
      });
    }

    await prisma.plan.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Weekly plan deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting weekly plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete weekly plan',
      error: error.message,
    });
  }
};

/**
 * Get ALL weekly plans (both AI-generated and manual) - UNIFIED VIEW
 */
exports.getAllWeeklyPlansUnified = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, sortBy = 'desc', limit = 1000 } = req.query;

    // Get AI-generated weekly plans from WeeklyPlan table
    const aiPlans = await prisma.weeklyPlan.findMany({
      where: {
        userId,
        ...(status && { status })
      },
      orderBy: { weekStartDate: sortBy === 'asc' ? 'asc' : 'desc' },
      take: parseInt(limit)
    });

    // Get manual weekly plans from Plan table
    const manualPlans = await prisma.plan.findMany({
      where: {
        userId,
        planType: PlanType.WEEKLY,
        ...(status && { status })
      },
      orderBy: { startDate: sortBy === 'asc' ? 'asc' : 'desc' },
      take: parseInt(limit)
    });

    // Transform to unified format
    const unifiedPlans = [
      // AI-generated plans
      ...aiPlans.map(plan => ({
        id: plan.id,
        title: plan.title,
        content: plan.content,
        startDate: plan.weekStartDate,
        endDate: plan.weekEndDate,
        status: plan.status,
        source: 'AI_GENERATED',
        aiGenerated: true,
        completionRate: plan.completionRate,
        weeklyGoals: plan.weeklyGoals,
        focusAreas: plan.focusAreas,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      })),
      // Manual plans
      ...manualPlans.map(plan => ({
        id: plan.id,
        title: plan.title,
        description: plan.description,
        startDate: plan.startDate,
        endDate: plan.dueDate,
        status: plan.status,
        source: 'MANUAL',
        category: plan.category,
        priority: plan.priority,
        isManuallyCreated: true,
        completedAt: plan.completedAt,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      }))
    ];

    // Sort by start date
    unifiedPlans.sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return sortBy === 'asc' ? dateA - dateB : dateB - dateA;
    });

    res.json({
      success: true,
      count: unifiedPlans.length,
      aiGenerated: aiPlans.length,
      manual: manualPlans.length,
      data: unifiedPlans
    });
  } catch (error) {
    console.error('Error fetching unified weekly plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly plans',
      error: error.message
    });
  }
};

/**
 * Get daily task summary for a weekly plan
 */
exports.getDailySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const weeklyPlan = await prisma.weeklyPlan.findFirst({
      where: { id, userId }
    });

    if (!weeklyPlan) {
      return res.status(404).json({
        success: false,
        message: 'Weekly plan not found'
      });
    }

    const summary = await weeklyPlanTaskService.getDailySummary(id);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily summary',
      error: error.message
    });
  }
};

/**
 * Get tasks for a specific day of the weekly plan
 */
exports.getTasksForDay = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, date } = req.params;

    // Verify ownership
    const weeklyPlan = await prisma.weeklyPlan.findFirst({
      where: { id, userId }
    });

    if (!weeklyPlan) {
      return res.status(404).json({
        success: false,
        message: 'Weekly plan not found'
      });
    }

    const tasks = await weeklyPlanTaskService.getTasksForDay(id, date);

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks for day:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

/**
 * Add a task to a specific day of the weekly plan
 */
exports.addTaskToDay = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { date, title, description, priority, category, estimatedMinutes } = req.body;

    if (!date || !title) {
      return res.status(400).json({
        success: false,
        message: 'Date and title are required'
      });
    }

    // Verify ownership
    const weeklyPlan = await prisma.weeklyPlan.findFirst({
      where: { id, userId }
    });

    if (!weeklyPlan) {
      return res.status(404).json({
        success: false,
        message: 'Weekly plan not found'
      });
    }

    const task = await weeklyPlanTaskService.addTaskToDay(userId, id, date, {
      title,
      description,
      priority,
      category,
      estimatedMinutes
    });

    res.status(201).json({
      success: true,
      message: 'Task added successfully',
      data: task
    });
  } catch (error) {
    console.error('Error adding task to day:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add task',
      error: error.message
    });
  }
};

/**
 * Mark a task as complete
 */
exports.completeTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, taskId } = req.params;

    // Verify weekly plan ownership
    const weeklyPlan = await prisma.weeklyPlan.findFirst({
      where: { id, userId }
    });

    if (!weeklyPlan) {
      return res.status(404).json({
        success: false,
        message: 'Weekly plan not found'
      });
    }

    const task = await weeklyPlanTaskService.completeTask(taskId, userId);

    res.json({
      success: true,
      message: 'Task marked as complete',
      data: task
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete task',
      error: error.message
    });
  }
};
