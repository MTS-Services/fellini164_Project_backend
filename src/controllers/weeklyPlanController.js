const prisma = require('../config/database');
const { PlanType, PlanCategory, PlanPriority, PlanStatusEnum } = require('@prisma/client');

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
