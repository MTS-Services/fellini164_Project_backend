const prisma = require('../config/database');
const { PlanType, PlanCategory, PlanPriority, PlanStatusEnum } = require('@prisma/client');
const openaiService = require('../services/openaiService');

/**
 * Create a new daily plan
 */
exports.createDailyPlan = async (req, res) => {
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
        planType: PlanType.DAILY,
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
      message: 'Daily plan created successfully',
      data: plan,
    });
  } catch (error) {
    console.error('Error creating daily plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create daily plan',
      error: error.message,
    });
  }
};

/**
 * Get all daily plans for a user
 */
exports.getAllDailyPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, priority, status, startDate, endDate } = req.query;

    const filters = {
      userId,
      planType: PlanType.DAILY,
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
    console.error('Error fetching daily plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily plans',
      error: error.message,
    });
  }
};

/**
 * Get a single daily plan by ID
 */
exports.getDailyPlanById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
        planType: PlanType.DAILY,
      },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Daily plan not found',
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error fetching daily plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily plan',
      error: error.message,
    });
  }
};

/**
 * Update a daily plan
 */
exports.updateDailyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, description, startDate, dueDate, category, priority, status } = req.body;

    const existingPlan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
        planType: PlanType.DAILY,
      },
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Daily plan not found',
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
      message: 'Daily plan updated successfully',
      data: updatedPlan,
    });
  } catch (error) {
    console.error('Error updating daily plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update daily plan',
      error: error.message,
    });
  }
};

/**
 * Delete a daily plan
 */
exports.deleteDailyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingPlan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
        planType: PlanType.DAILY,
      },
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Daily plan not found',
      });
    }

    await prisma.plan.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Daily plan deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting daily plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete daily plan',
      error: error.message,
    });
  }
};

/**
 * Get today's plan for the user (helper for dashboard)
 */
exports.getTodayPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPlan = await prisma.dailyPlan.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      include: {
        resets: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!todayPlan) {
      return res.status(404).json({
        success: false,
        message: 'No plan found for today',
        data: null,
      });
    }

    res.json({
      success: true,
      data: todayPlan,
    });
  } catch (error) {
    console.error('Error fetching today plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s plan',
      error: error.message,
    });
  }
};


exports.resetMyDay = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId, reason, customReason, triggerType } = req.body;

    // Validate reason if provided
    const validReasons = ['LOW_ENERGY', 'UNEXPECTED_MEETINGS', 'LOST_FOCUS', 'PERSONAL_STUFF', 'JUST_ONE_OF_THOSE_DAYS', 'OTHER'];
    if (reason && !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset reason',
      });
    }

    // Find the plan to reset
    let dailyPlan;
    
    if (planId) {
      dailyPlan = await prisma.dailyPlan.findUnique({
        where: { id: planId },
      });
    } else {
      // Get today's plan if no planId provided
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      dailyPlan = await prisma.dailyPlan.findUnique({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
      });
    }

    if (!dailyPlan) {
      return res.status(404).json({
        success: false,
        message: 'Daily plan not found',
      });
    }

    if (dailyPlan.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to reset this plan',
      });
    }

    // Check if OpenAI is configured
    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'AI service not configured. Please set OPENAI_API_KEY.',
      });
    }

    // Snapshot current plan before reset
    const previousContent = dailyPlan.content;

    // Get user context for better adaptation
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Generate adapted plan using AI
    const resetContext = {
      reason: reason || 'USER_INITIATED',
      customReason: customReason || '',
      currentTime: new Date().toLocaleTimeString(),
      previousPlan: previousContent,
      completionRate: dailyPlan.completionRate,
      tasksCompleted: dailyPlan.tasksCompleted,
      tasksTotal: dailyPlan.tasksTotal,
    };

    const adaptedPlan = await openaiService.resetDailyPlan(resetContext, userSettings);

    // Update the daily plan with adapted content
    const updatedPlan = await prisma.dailyPlan.update({
      where: { id: dailyPlan.id },
      data: {
        content: adaptedPlan.content,
        morningRoutine: adaptedPlan.morningRoutine,
        afternoonTasks: adaptedPlan.afternoonTasks,
        eveningRoutine: adaptedPlan.eveningRoutine,
        resetCount: { increment: 1 },
        lastResetAt: new Date(),
      },
    });

    // Create reset record for tracking and analytics
    const resetRecord = await prisma.dailyPlanReset.create({
      data: {
        dailyPlanId: dailyPlan.id,
        reason: reason || null,
        customReason: customReason || null,
        previousContent,
        newContent: adaptedPlan.content,
        triggerType: triggerType || 'manual',
        adaptationSummary: adaptedPlan.summary || null,
      },
    });

    res.json({
      success: true,
      message: 'Your day has been reset to match reality.',
      data: {
        plan: updatedPlan,
        reset: resetRecord,
        adaptationSteps: adaptedPlan.adaptationSteps || [
          'Keeping top 2 priorities',
          'Deferring non-urgent tasks',
          'Breaking tasks into smaller steps',
          'Adjusting focus blocks',
        ],
        encouragement: 'Life happened. We\'ve adapted.',
      },
    });
  } catch (error) {
    console.error('Error resetting daily plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset your day',
      error: error.message,
    });
  }
};

/**
 * Get reset history for a daily plan
 */
exports.getResetHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.params;

    // Verify plan belongs to user
    const dailyPlan = await prisma.dailyPlan.findUnique({
      where: { id: planId },
    });

    if (!dailyPlan || dailyPlan.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Daily plan not found',
      });
    }

    const resets = await prisma.dailyPlanReset.findMany({
      where: { dailyPlanId: planId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      count: resets.length,
      data: resets,
    });
  } catch (error) {
    console.error('Error fetching reset history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reset history',
      error: error.message,
    });
  }
};

