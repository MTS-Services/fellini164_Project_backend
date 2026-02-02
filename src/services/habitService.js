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

    if (filters.frequency) {
      where.frequency = filters.frequency;
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

  // Get habit by ID
  async getHabitById(habitId, userId) {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
      include: {
        completions: {
          orderBy: { date: 'desc' },
          take: 30
        }
      }
    });

    return habit;
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
    // Check if already completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingCompletion = await prisma.habitCompletion.findFirst({
      where: {
        habitId,
        date: {
          gte: today
        }
      }
    });

    if (existingCompletion) {
      return existingCompletion;
    }

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
        (new Date(completion.date) - new Date(lastCompletion.date)) / (1000 * 60 * 60 * 24)
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
      activeHabits: habits.filter(h => h.isActive).length,
      totalCompletions,
      averageStreak: Math.round(avgStreak * 10) / 10,
      longestStreak: Math.max(...habits.map(h => h.longestStreak), 0),
      habitsCompletedToday: await this.getHabitsCompletedToday(userId)
    };
  }

  // Get habits completed today
  async getHabitsCompletedToday(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completions = await prisma.habitCompletion.findMany({
      where: {
        habit: {
          userId
        },
        date: {
          gte: today
        }
      }
    });

    return completions.length;
  }

  // Get habit history
  async getHabitHistory(habitId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const completions = await prisma.habitCompletion.findMany({
      where: {
        habitId,
        date: {
          gte: startDate
        }
      },
      orderBy: { date: 'desc' }
    });

    return completions;
  }

  // Get habits needing reminders
  async getHabitsNeedingReminders(time) {
    const habits = await prisma.habit.findMany({
      where: {
        isActive: true,
        reminderTime: time
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            settings: true
          }
        }
      }
    });

    return habits;
  }

  // Check if habit completed today
  async isHabitCompletedToday(habitId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completion = await prisma.habitCompletion.findFirst({
      where: {
        habitId,
        date: {
          gte: today
        }
      }
    });

    return !!completion;
  }

  // Get habits at risk (not completed today and past reminder time)
  async getHabitsAtRisk(userId) {
    const habits = await prisma.habit.findMany({
      where: {
        userId,
        isActive: true,
        currentStreak: {
          gt: 0
        }
      },
      include: {
        completions: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return habits.filter(habit => {
      if (habit.completions.length === 0) return false;

      const lastCompletion = new Date(habit.completions[0].date);
      lastCompletion.setHours(0, 0, 0, 0);

      const daysSinceCompletion = Math.floor(
        (today - lastCompletion) / (1000 * 60 * 60 * 24)
      );

      return daysSinceCompletion >= 1;
    });
  }
}

module.exports = new HabitService();
