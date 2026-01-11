const prisma = require('../config/database');
const { PlanType, PlanCategory, PlanPriority, PlanStatusEnum } = require('@prisma/client');

/**
 * Create a new plan (Daily, Weekly, Monthly, or Task)
 */
exports.createPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      planType, // DAILY, WEEKLY, MONTHLY, TASK
      startDate,
      dueDate,
      category, // WORK, PERSONAL, HEALTH
      priority, // LOW, MEDIUM, HIGH
      status, // TODO, IN_PROGRESS, DONE
    } = req.body;

    // Validation
    if (!title || !planType || !startDate || !category || !priority) {
      return res.status(400).json({
        success: false,
        message: 'Title, planType, startDate, category, and priority are required',
      });
    }

    // Validate enums
    if (!Object.values(PlanType).includes(planType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid planType. Must be DAILY, WEEKLY, MONTHLY, or TASK',
      });
    }

    if (!Object.values(PlanCategory).includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be WORK, PERSONAL, or HEALTH',
      });
    }

    if (!Object.values(PlanPriority).includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority. Must be LOW, MEDIUM, or HIGH',
      });
    }

    // Create plan
    const plan = await prisma.plan.create({
      data: {
        userId,
        title,
        description: description || null,
        planType,
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
      message: 'Plan created successfully',
      data: plan,
    });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create plan',
      error: error.message,
    });
  }
};

/**
 * Get all plans for a user with filters
 */
exports.getAllPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planType, category, priority, status, startDate, endDate } = req.query;

    // Build filter object
    const filters = {
      userId,
    };

    if (planType) filters.planType = planType;
    if (category) filters.category = category;
    if (priority) filters.priority = priority;
    if (status) filters.status = status;

    // Date range filter
    if (startDate || endDate) {
      filters.startDate = {};
      if (startDate) filters.startDate.gte = new Date(startDate);
      if (endDate) filters.startDate.lte = new Date(endDate);
    }

    const plans = await prisma.plan.findMany({
      where: filters,
      orderBy: [
        { priority: 'desc' }, // HIGH first
        { startDate: 'asc' },
      ],
    });

    res.json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans',
      error: error.message,
    });
  }
};

/**
 * Get plans by type (DAILY, WEEKLY, MONTHLY, TASK)
 */
exports.getPlansByType = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.params;

    if (!Object.values(PlanType).includes(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type',
      });
    }

    const plans = await prisma.plan.findMany({
      where: {
        userId,
        planType: type.toUpperCase(),
      },
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
    console.error('Error fetching plans by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans',
      error: error.message,
    });
  }
};

/**
 * Get a single plan by ID
 */
exports.getPlanById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plan',
      error: error.message,
    });
  }
};

/**
 * Update a plan
 */
exports.updatePlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      title,
      description,
      planType,
      startDate,
      dueDate,
      category,
      priority,
      status,
    } = req.body;

    // Check if plan exists and belongs to user
    const existingPlan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    // Build update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (planType !== undefined) updateData.planType = planType;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      // If status is DONE, set completedAt
      if (status === PlanStatusEnum.DONE && !existingPlan.completedAt) {
        updateData.completedAt = new Date();
      }
      // If status is changed from DONE, clear completedAt
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
      message: 'Plan updated successfully',
      data: updatedPlan,
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan',
      error: error.message,
    });
  }
};

/**
 * Delete a plan
 */
exports.deletePlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if plan exists and belongs to user
    const existingPlan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    await prisma.plan.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan',
      error: error.message,
    });
  }
};

/**
 * Get plan statistics
 */
exports.getPlanStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalPlans, byType, byStatus, byPriority] = await Promise.all([
      // Total plans
      prisma.plan.count({ where: { userId } }),

      // By type
      prisma.plan.groupBy({
        by: ['planType'],
        where: { userId },
        _count: true,
      }),

      // By status
      prisma.plan.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),

      // By priority
      prisma.plan.groupBy({
        by: ['priority'],
        where: { userId },
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        total: totalPlans,
        byType: byType.reduce((acc, item) => {
          acc[item.planType] = item._count;
          return acc;
        }, {}),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        byPriority: byPriority.reduce((acc, item) => {
          acc[item.priority] = item._count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error('Error fetching plan stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plan statistics',
      error: error.message,
    });
  }
};
