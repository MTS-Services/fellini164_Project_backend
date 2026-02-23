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


exports.getMonthlyPlanHierarchy = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
        planType: PlanType.MONTHLY,
      },
      include: {
        childPlans: {
          orderBy: { startDate: 'asc' },
          include: {
            childPlans: {
              orderBy: { startDate: 'asc' },
            },
          },
        },
      },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Monthly plan not found',
      });
    }

    // Organize by weeks and days
    const weeks = plan.childPlans.filter(p => p.planType === PlanType.WEEKLY);
    const directDays = plan.childPlans.filter(p => p.planType === PlanType.DAILY);

    const organizedPlan = {
      ...plan,
      weeks: weeks.map(week => ({
        ...week,
        days: week.childPlans || [],
      })),
      directDays,
    };

    delete organizedPlan.childPlans;

    res.json({
      success: true,
      data: organizedPlan,
    });
  } catch (error) {
    console.error('Error fetching monthly plan hierarchy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly plan hierarchy',
      error: error.message,
    });
  }
};

/**
 * Add a weekly plan to a monthly plan
 */
exports.addWeeklyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // Monthly plan ID
    const {
      title,
      description,
      startDate,
      dueDate,
      category,
      priority,
      status,
    } = req.body;

    // Verify monthly plan exists and belongs to user
    const monthlyPlan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
        planType: PlanType.MONTHLY,
      },
    });

    if (!monthlyPlan) {
      return res.status(404).json({
        success: false,
        message: 'Monthly plan not found',
      });
    }

    if (!title || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Title and startDate are required',
      });
    }

    // Validate dates are within monthly plan range
    const weekStart = new Date(startDate);
    const weekEnd = dueDate ? new Date(dueDate) : null;

    if (weekStart < monthlyPlan.startDate ||
      (monthlyPlan.dueDate && weekStart > monthlyPlan.dueDate)) {
      return res.status(400).json({
        success: false,
        message: 'Week start date must be within monthly plan date range',
      });
    }

    const weeklyPlan = await prisma.plan.create({
      data: {
        userId,
        parentPlanId: id,
        title,
        description: description || null,
        planType: PlanType.WEEKLY,
        startDate: weekStart,
        dueDate: weekEnd,
        category: category || monthlyPlan.category,
        priority: priority || monthlyPlan.priority,
        status: status || PlanStatusEnum.TODO,
        isManuallyCreated: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Weekly plan added to monthly plan successfully',
      data: weeklyPlan,
    });
  } catch (error) {
    console.error('Error adding weekly plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add weekly plan',
      error: error.message,
    });
  }
};

/**
 * Add a daily plan to a monthly plan or weekly plan
 */
exports.addDailyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // Parent plan ID (monthly or weekly)
    const {
      title,
      description,
      startDate,
      category,
      priority,
      status,
    } = req.body;

    // Verify parent plan exists and belongs to user
    const parentPlan = await prisma.plan.findFirst({
      where: {
        id,
        userId,
        planType: { in: [PlanType.MONTHLY, PlanType.WEEKLY] },
      },
    });

    if (!parentPlan) {
      return res.status(404).json({
        success: false,
        message: 'Parent plan not found',
      });
    }

    if (!title || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Title and startDate are required',
      });
    }

    // Validate date is within parent plan range
    const dayDate = new Date(startDate);

    if (dayDate < parentPlan.startDate ||
      (parentPlan.dueDate && dayDate > parentPlan.dueDate)) {
      return res.status(400).json({
        success: false,
        message: 'Day date must be within parent plan date range',
      });
    }

    // Set dueDate to end of day
    const dueDate = new Date(dayDate);
    dueDate.setHours(23, 59, 59, 999);

    const dailyPlan = await prisma.plan.create({
      data: {
        userId,
        parentPlanId: id,
        title,
        description: description || null,
        planType: PlanType.DAILY,
        startDate: dayDate,
        dueDate,
        category: category || parentPlan.category,
        priority: priority || parentPlan.priority,
        status: status || PlanStatusEnum.TODO,
        isManuallyCreated: true,
      },
    });

    res.status(201).json({
      success: true,
      message: `Daily plan added to ${parentPlan.planType.toLowerCase()} plan successfully`,
      data: dailyPlan,
    });
  } catch (error) {
    console.error('Error adding daily plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add daily plan',
      error: error.message,
    });
  }
};
