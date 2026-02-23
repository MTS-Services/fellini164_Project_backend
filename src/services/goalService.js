const prisma = require('../config/database');

class GoalService {
  // Get all goals for user
  async getAllGoals(userId, filters = {}) {
    const where = { userId };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const goals = await prisma.goal.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return goals;
  }

  // Get goal by ID
  async getGoalById(goalId) {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId }
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    return goal;
  }

  // Create goal
  async createGoal(goalData) {
    const goal = await prisma.goal.create({
      data: {
        ...goalData,
        targetDate: goalData.targetDate ? new Date(goalData.targetDate) : null
      }
    });

    return goal;
  }

  // Update goal
  async updateGoal(goalId, updateData) {
    if (updateData.targetDate) {
      updateData.targetDate = new Date(updateData.targetDate);
    }

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: updateData
    });

    return goal;
  }

  // Delete goal
  async deleteGoal(goalId) {
    await prisma.goal.delete({
      where: { id: goalId }
    });
  }

  // Mark goal as completed
  async completeGoal(goalId) {
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    return goal;
  }

  // Get goal statistics
  async getGoalStats(userId) {
    const [total, completed, active] = await Promise.all([
      prisma.goal.count({ where: { userId } }),
      prisma.goal.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.goal.count({ where: { userId, status: 'ACTIVE' } })
    ]);

    return {
      total,
      completed,
      active,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }
}

module.exports = new GoalService();
