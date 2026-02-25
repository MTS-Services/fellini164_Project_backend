const prisma = require('../config/database');


exports.getAllGoals = async (req, res) => {
  try {
    const userId = req.user.id; // Get from authenticated user

    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: goals.length,
      data: goals
    });

  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get goals',
      error: error.message
    });
  }
};


exports.getGoalById = async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await prisma.goal.findUnique({
      where: { id }
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    res.status(200).json({
      success: true,
      data: goal
    });

  } catch (error) {
    console.error('Get goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get goal',
      error: error.message
    });
  }
};


exports.createGoal = async (req, res) => {
  try {
    const userId = req.user.id; // Get from authenticated user
    const { title, description, category, targetDate, priority, isMainFocus } = req.body;

    const goal = await prisma.goal.create({
      data: {
        userId,
        title,
        description,
        category,
        targetDate: targetDate ? new Date(targetDate) : null,
        priority: priority || 5,
        isMainFocus: isMainFocus || false
      }
    });

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: goal
    });

  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create goal',
      error: error.message
    });
  }
};


exports.updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.targetDate) {
      updateData.targetDate = new Date(updateData.targetDate);
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Goal updated successfully',
      data: goal
    });

  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update goal',
      error: error.message
    });
  }
};


exports.deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.goal.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Goal deleted successfully'
    });

  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete goal',
      error: error.message
    });
  }
};
