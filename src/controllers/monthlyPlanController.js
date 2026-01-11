const prisma = require('../config/database');
const { PlanType, PlanCategory, PlanPriority, PlanStatusEnum } = require('@prisma/client');

/**
 * Create a new monthly plan
 */
exports.createMonthlyPlan = async (req, res) => {
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
        planType: PlanType.MONTHLY,
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
      message: 'Monthly plan created successfully',
      data: plan,
    });
  } catch (error) {
    console.error('Error creating monthly plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create monthly plan',
      error: error.message,
    });
  }
};

/**
 * Get all monthly plans for a user
 */
exports.getAllMonthlyPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, priority, status, startDate, endDate } = req.query;

    const filters = {
      userId,
      planType: PlanType.MONTHLY,
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
    console.error('Error fetching monthly plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly plans',
      error: error.message,
    });
  }
};

/**
 * Get a single monthly plan by ID
 */
exports.getMonthlyPlanById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
        planType: PlanType.MONTHLY,
      },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Monthly plan not found',
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error fetching monthly plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly plan',
      error: error.message,
    });
  }
};

/**
 * Update a monthly plan
 */
exports.updateMonthlyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, description, startDate, dueDate, category, priority, status } = req.body;

    const existingPlan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
        planType: PlanType.MONTHLY,
      },
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Monthly plan not found',
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
      message: 'Monthly plan updated successfully',
      data: updatedPlan,
    });
  } catch (error) {
    console.error('Error updating monthly plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update monthly plan',
      error: error.message,
    });
  }
};

/**
 * Delete a monthly plan
 */
exports.deleteMonthlyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingPlan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
        planType: PlanType.MONTHLY,
      },
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Monthly plan not found',
      });
    }

    await prisma.plan.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Monthly plan deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting monthly plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete monthly plan',
      error: error.message,
    });
  }
};
