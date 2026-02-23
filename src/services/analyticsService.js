const prisma = require('../config/database');

class AnalyticsService {
  // Track user activity
  async trackActivity(userId, activityType, metadata = {}) {
    await prisma.activityLog.create({
      data: {
        userId,
        type: activityType,
        description: metadata.description || activityType,
        metadata: metadata,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      }
    });
  }

  // Update daily analytics
  async updateDailyAnalytics(userId, data) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.userAnalytics.upsert({
      where: {
        userId_date: {
          userId,
          date: today
        }
      },
      update: data,
      create: {
        userId,
        date: today,
        ...data
      }
    });
  }

  // Get user analytics
  async getUserAnalytics(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await prisma.userAnalytics.findMany({
      where: {
        userId,
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' }
    });

    return analytics;
  }

  // Get dashboard stats
  async getDashboardStats(userId) {
    const [
      goalsStats,
      habitsStats,
      tasksStats,
      recentActivity
    ] = await Promise.all([
      this._getGoalsStats(userId),
      this._getHabitsStats(userId),
      this._getTasksStats(userId),
      this._getRecentActivity(userId)
    ]);

    return {
      goals: goalsStats,
      habits: habitsStats,
      tasks: tasksStats,
      recentActivity
    };
  }

  // Calculate completion rates
  async getCompletionRates(userId, period = 'week') {
    const startDate = new Date();

    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const [completedTasks, totalTasks, habitCompletions] = await Promise.all([
      prisma.task.count({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: startDate }
        }
      }),
      prisma.task.count({
        where: {
          userId,
          createdAt: { gte: startDate }
        }
      }),
      prisma.habitCompletion.count({
        where: {
          habit: { userId },
          date: { gte: startDate }
        }
      })
    ]);

    return {
      taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      habitCompletions,
      period
    };
  }

  // Private helper methods
  async _getGoalsStats(userId) {
    const [total, completed, active] = await Promise.all([
      prisma.goal.count({ where: { userId } }),
      prisma.goal.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.goal.count({ where: { userId, status: 'ACTIVE' } })
    ]);

    return { total, completed, active };
  }

  async _getHabitsStats(userId) {
    const habits = await prisma.habit.findMany({
      where: { userId, isActive: true }
    });

    return {
      total: habits.length,
      averageStreak: habits.length > 0
        ? habits.reduce((sum, h) => sum + h.currentStreak, 0) / habits.length
        : 0,
      longestStreak: Math.max(...habits.map(h => h.longestStreak), 0)
    };
  }

  async _getTasksStats(userId) {
    const [total, completed, pending] = await Promise.all([
      prisma.task.count({ where: { userId } }),
      prisma.task.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.task.count({ where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } } })
    ]);

    return { total, completed, pending };
  }

  async _getRecentActivity(userId) {
    const activities = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return activities;
  }
}

module.exports = new AnalyticsService();
