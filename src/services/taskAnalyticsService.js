const prisma = require('../config/database');

class TaskAnalyticsService {
  
  // ==================== COMPLETION ANALYTICS ====================
  
  // Get task completion rate by time period
  async getCompletionRateByPeriod(userId, period = 'week') {
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }
    
    const [total, completed] = await Promise.all([
      prisma.task.count({
        where: {
          userId,
          createdAt: { gte: startDate }
        }
      }),
      prisma.task.count({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: startDate }
        }
      })
    ]);
    
    const rate = total > 0 ? (completed / total) * 100 : 0;
    
    return {
      period,
      total,
      completed,
      rate: Math.round(rate * 10) / 10,
      startDate,
      endDate: new Date()
    };
  }
  
  // Get completion trends over time
  async getCompletionTrends(userId, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        completedAt: true,
        category: true,
        priority: true
      }
    });
    
    // Group by day
    const dailyData = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = 0;
    }
    
    tasks.forEach(task => {
      const dateKey = task.completedAt.toISOString().split('T')[0];
      if (dailyData[dateKey] !== undefined) {
        dailyData[dateKey]++;
      }
    });
    
    return {
      days,
      startDate,
      endDate,
      dailyCompletions: dailyData,
      totalCompleted: tasks.length,
      averagePerDay: Math.round((tasks.length / days) * 10) / 10
    };
  }
  
  
  // ==================== CATEGORY ANALYTICS ====================
  
  // Get tasks by category
  async getTasksByCategory(userId) {
    const tasks = await prisma.task.groupBy({
      by: ['category', 'status'],
      where: { userId },
      _count: true
    });
    
    const categoryData = {};
    
    tasks.forEach(item => {
      const category = item.category || 'UNCATEGORIZED';
      if (!categoryData[category]) {
        categoryData[category] = {
          total: 0,
          completed: 0,
          pending: 0,
          inProgress: 0
        };
      }
      
      categoryData[category].total += item._count;
      
      switch (item.status) {
        case 'COMPLETED':
          categoryData[category].completed += item._count;
          break;
        case 'TODO':
          categoryData[category].pending += item._count;
          break;
        case 'IN_PROGRESS':
          categoryData[category].inProgress += item._count;
          break;
      }
    });
    
    // Calculate completion rate for each category
    Object.keys(categoryData).forEach(category => {
      const data = categoryData[category];
      data.completionRate = data.total > 0 
        ? Math.round((data.completed / data.total) * 100 * 10) / 10 
        : 0;
    });
    
    return categoryData;
  }
  
  
  // ==================== PRIORITY ANALYTICS ====================
  
  // Get tasks by priority
  async getTasksByPriority(userId) {
    const tasks = await prisma.task.groupBy({
      by: ['priority', 'status'],
      where: { userId },
      _count: true
    });
    
    const priorityData = {
      URGENT: { total: 0, completed: 0, pending: 0 },
      HIGH: { total: 0, completed: 0, pending: 0 },
      MEDIUM: { total: 0, completed: 0, pending: 0 },
      LOW: { total: 0, completed: 0, pending: 0 }
    };
    
    tasks.forEach(item => {
      priorityData[item.priority].total += item._count;
      
      if (item.status === 'COMPLETED') {
        priorityData[item.priority].completed += item._count;
      } else if (item.status === 'TODO' || item.status === 'IN_PROGRESS') {
        priorityData[item.priority].pending += item._count;
      }
    });
    
    // Calculate completion rate
    Object.keys(priorityData).forEach(priority => {
      const data = priorityData[priority];
      data.completionRate = data.total > 0 
        ? Math.round((data.completed / data.total) * 100 * 10) / 10 
        : 0;
    });
    
    return priorityData;
  }
  
  
  // ==================== TIME ANALYTICS ====================
  
  // Get time estimation accuracy
  async getTimeEstimationAccuracy(userId) {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        estimatedMinutes: { not: null },
        actualMinutes: { not: null }
      },
      select: {
        estimatedMinutes: true,
        actualMinutes: true,
        category: true
      }
    });
    
    if (tasks.length === 0) {
      return {
        message: 'Not enough data for time estimation analysis',
        tasksAnalyzed: 0
      };
    }
    
    const totalEstimated = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    const totalActual = tasks.reduce((sum, t) => sum + t.actualMinutes, 0);
    
    const accuracy = (totalEstimated / totalActual) * 100;
    const avgEstimated = totalEstimated / tasks.length;
    const avgActual = totalActual / tasks.length;
    const avgDeviation = avgActual - avgEstimated;
    
    return {
      tasksAnalyzed: tasks.length,
      totalEstimated,
      totalActual,
      accuracy: Math.round(accuracy * 10) / 10,
      avgEstimatedMinutes: Math.round(avgEstimated),
      avgActualMinutes: Math.round(avgActual),
      avgDeviationMinutes: Math.round(avgDeviation),
      recommendation: accuracy < 80 
        ? 'You tend to underestimate task duration. Add 20% buffer time.'
        : accuracy > 120
        ? 'You tend to overestimate task duration. You can schedule more tasks.'
        : 'Your time estimation is quite accurate!'
    };
  }
  
  // Get most productive hours
  async getMostProductiveHours(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { gte: startDate }
      },
      select: {
        completedAt: true
      }
    });
    
    const hourlyData = Array(24).fill(0);
    
    tasks.forEach(task => {
      const hour = task.completedAt.getHours();
      hourlyData[hour]++;
    });
    
    // Find peak hours
    const hoursWithCounts = hourlyData.map((count, hour) => ({ hour, count }));
    const sortedHours = hoursWithCounts
      .filter(h => h.count > 0)
      .sort((a, b) => b.count - a.count);
    
    const peakHours = sortedHours.slice(0, 3);
    
    return {
      hourlyDistribution: hourlyData,
      peakHours: peakHours.map(h => ({
        hour: `${h.hour}:00`,
        tasksCompleted: h.count
      })),
      leastProductiveHours: sortedHours.slice(-3).reverse().map(h => ({
        hour: `${h.hour}:00`,
        tasksCompleted: h.count
      }))
    };
  }
  
  
  // ==================== STREAK ANALYTICS ====================
  
  // Get current and longest streak
  async getStreakAnalytics(userId) {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'COMPLETED'
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true }
    });
    
    if (tasks.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        message: 'Start completing tasks to build your streak!'
      };
    }
    
    // Check current streak
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const completedToday = tasks.filter(t => 
        t.completedAt >= dayStart && t.completedAt <= dayEnd
      ).length;
      
      if (completedToday > 0) {
        currentStreak++;
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else if (i > 0) {
        // Break current streak
        if (currentStreak === 0) {
          tempStreak = 0;
        }
        break;
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastCompletedTask: tasks[0].completedAt,
      totalTasksCompleted: tasks.length
    };
  }
  
  
  // ==================== AI VS MANUAL ANALYTICS ====================
  
  // Compare AI-generated vs manual tasks
  async getAIvsManualComparison(userId) {
    const [aiTasks, manualTasks] = await Promise.all([
      prisma.task.findMany({
        where: { userId, aiGenerated: true },
        select: { status: true, completedAt: true }
      }),
      prisma.task.findMany({
        where: { userId, aiGenerated: false },
        select: { status: true, completedAt: true }
      })
    ]);
    
    const aiCompleted = aiTasks.filter(t => t.status === 'COMPLETED').length;
    const manualCompleted = manualTasks.filter(t => t.status === 'COMPLETED').length;
    
    const aiRate = aiTasks.length > 0 ? (aiCompleted / aiTasks.length) * 100 : 0;
    const manualRate = manualTasks.length > 0 ? (manualCompleted / manualTasks.length) * 100 : 0;
    
    return {
      aiGenerated: {
        total: aiTasks.length,
        completed: aiCompleted,
        completionRate: Math.round(aiRate * 10) / 10
      },
      manuallyCreated: {
        total: manualTasks.length,
        completed: manualCompleted,
        completionRate: Math.round(manualRate * 10) / 10
      },
      recommendation: aiRate > manualRate 
        ? 'AI-generated tasks have higher completion rate. Use AI more!'
        : 'Manual tasks work better for you. Customize AI suggestions.'
    };
  }
  
  
  // ==================== COMPREHENSIVE DASHBOARD ====================
  
  // Get complete analytics dashboard
  async getDashboard(userId) {
    const [
      completionRate,
      trends,
      categoryData,
      priorityData,
      timeAccuracy,
      productiveHours,
      streakData,
      aiComparison
    ] = await Promise.all([
      this.getCompletionRateByPeriod(userId, 'week'),
      this.getCompletionTrends(userId, 30),
      this.getTasksByCategory(userId),
      this.getTasksByPriority(userId),
      this.getTimeEstimationAccuracy(userId),
      this.getMostProductiveHours(userId, 30),
      this.getStreakAnalytics(userId),
      this.getAIvsManualComparison(userId)
    ]);
    
    return {
      summary: {
        weeklyCompletionRate: completionRate.rate,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        totalCompleted: trends.totalCompleted,
        avgPerDay: trends.averagePerDay
      },
      completionRate,
      trends,
      categoryBreakdown: categoryData,
      priorityBreakdown: priorityData,
      timeEstimation: timeAccuracy,
      productivityPattern: productiveHours,
      streaks: streakData,
      aiVsManual: aiComparison
    };
  }
}

module.exports = new TaskAnalyticsService();
