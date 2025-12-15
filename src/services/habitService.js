const prisma = require('../config/database');

class HabitService {
  // Get all habits
  async getAllHabits(userId, filters = {}) {
    const where = { userId };
    
    if (filters.category) {
      where.category = filters.category;
    }
    
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    
    const habits = await prisma.habit.findMany({
      where,
      include: {
        completions: {
          where: {
            date: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7))
            }
          },
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return habits;
  }
  
  // Create habit
  async createHabit(habitData) {
    const habit = await prisma.habit.create({
      data: habitData
    });
    
    return habit;
  }
  
  // Complete habit
  async completeHabit(habitId, completionData = {}) {
    // Create completion record
    const completion = await prisma.habitCompletion.create({
      data: {
        habitId,
        date: completionData.date || new Date(),
        notes: completionData.notes
      }
    });
    
    // Update habit statistics
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        completions: {
          orderBy: { date: 'desc' },
          take: 2
        }
      }
    });
    
    // Calculate streak
    let newStreak = 1;
    if (habit.completions.length > 1) {
      const lastCompletion = habit.completions[1];
      const daysDiff = Math.floor(
        (new Date() - new Date(lastCompletion.date)) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff === 1) {
        newStreak = habit.currentStreak + 1;
      }
    }
    
    // Update habit
    await prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, habit.longestStreak),
        totalCompletions: { increment: 1 }
      }
    });
    
    return completion;
  }
  
  // Update habit
  async updateHabit(habitId, updateData) {
    const habit = await prisma.habit.update({
      where: { id: habitId },
      data: updateData
    });
    
    return habit;
  }
  
  // Delete habit
  async deleteHabit(habitId) {
    await prisma.habit.delete({
      where: { id: habitId }
    });
  }
  
  // Get habit statistics
  async getHabitStats(userId) {
    const habits = await prisma.habit.findMany({
      where: { userId, isActive: true }
    });
    
    const totalCompletions = habits.reduce((sum, h) => sum + h.totalCompletions, 0);
    const avgStreak = habits.length > 0 
      ? habits.reduce((sum, h) => sum + h.currentStreak, 0) / habits.length 
      : 0;
    
    return {
      totalHabits: habits.length,
      totalCompletions,
      averageStreak: Math.round(avgStreak * 10) / 10,
      longestStreak: Math.max(...habits.map(h => h.longestStreak), 0)
    };
  }
}

module.exports = new HabitService();
