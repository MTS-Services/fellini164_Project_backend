const prisma = require('../config/database');
const habitService = require('../services/habitService');
const habitReminderService = require('../services/habitReminderService');

// ==================== GET ALL HABITS ====================
exports.getAllHabits = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      category: req.query.category,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      frequency: req.query.frequency
    };

    const habits = await habitService.getAllHabits(userId, filters);

    res.json({
      success: true,
      count: habits.length,
      habits
    });
  } catch (error) {
    console.error('Get all habits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch habits',
      error: error.message
    });
  }
};

// ==================== GET HABIT BY ID ====================
exports.getHabitById = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.id;

    const habit = await habitService.getHabitById(habitId, userId);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    res.json({
      success: true,
      habit
    });
  } catch (error) {
    console.error('Get habit by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch habit',
      error: error.message
    });
  }
};

// ==================== CREATE HABIT ====================
exports.createHabit = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      category,
      frequency,
      difficulty,
      targetDays,
      targetTimesPerDay,
      reminderTime,
      aiSuggested
    } = req.body;

    // Validate required fields
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name and category are required'
      });
    }

    const habitData = {
      userId,
      name,
      description,
      category,
      frequency: frequency || 'DAILY',
      difficulty: difficulty || 'MEDIUM',
      targetDays: targetDays || [],
      targetTimesPerDay: targetTimesPerDay || 1,
      reminderTime,
      aiSuggested: aiSuggested || false
    };

    const habit = await habitService.createHabit(habitData);

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        type: 'HABIT_CREATED',
        description: `Created habit: ${name}`,
        metadata: { habitId: habit.id, category }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Habit created successfully',
      habit
    });
  } catch (error) {
    console.error('Create habit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create habit',
      error: error.message
    });
  }
};

// ==================== COMPLETE HABIT ====================
exports.completeHabit = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.id;
    const { notes, date } = req.body;

    // Verify habit belongs to user
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId }
    });

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    const completion = await habitService.completeHabit(habitId, {
      date: date ? new Date(date) : new Date(),
      notes
    });

    // Get updated habit with new streak
    const updatedHabit = await habitService.getHabitById(habitId, userId);

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        type: 'HABIT_COMPLETED',
        description: `Completed habit: ${habit.name}`,
        metadata: {
          habitId: habit.id,
          streak: updatedHabit.currentStreak,
          completionId: completion.id
        }
      }
    });

    // Check for streak milestones and send notifications
    if (updatedHabit.currentStreak % 7 === 0 && updatedHabit.currentStreak > 0) {
      await habitReminderService.sendStreakMilestoneNotification(habitId, userId);
    }

    res.json({
      success: true,
      message: 'Habit completed successfully',
      completion,
      habit: updatedHabit
    });
  } catch (error) {
    console.error('Complete habit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete habit',
      error: error.message
    });
  }
};

// ==================== UPDATE HABIT ====================
exports.updateHabit = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.id;

    // Verify habit belongs to user
    const existingHabit = await prisma.habit.findFirst({
      where: { id: habitId, userId }
    });

    if (!existingHabit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    const updateData = {};
    const allowedFields = [
      'name', 'description', 'category', 'frequency', 'difficulty',
      'targetDays', 'targetTimesPerDay', 'reminderTime', 'isActive'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const habit = await habitService.updateHabit(habitId, updateData);

    res.json({
      success: true,
      message: 'Habit updated successfully',
      habit
    });
  } catch (error) {
    console.error('Update habit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update habit',
      error: error.message
    });
  }
};

// ==================== DELETE HABIT ====================
exports.deleteHabit = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.id;

    // Verify habit belongs to user
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId }
    });

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    await habitService.deleteHabit(habitId);

    res.json({
      success: true,
      message: 'Habit deleted successfully'
    });
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete habit',
      error: error.message
    });
  }
};

// ==================== GET HABIT STATISTICS ====================
exports.getHabitStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await habitService.getHabitStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get habit stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch habit statistics',
      error: error.message
    });
  }
};

// ==================== GET HABIT HISTORY ====================
exports.getHabitHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.id;
    const days = parseInt(req.query.days) || 30;

    // Verify habit belongs to user
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId }
    });

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    const history = await habitService.getHabitHistory(habitId, days);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Get habit history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch habit history',
      error: error.message
    });
  }
};

// ==================== SKIP HABIT ====================
exports.skipHabit = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.id;
    const { reason } = req.body;

    // Verify habit belongs to user
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId }
    });

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    // Reset streak to 0
    await prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak: 0
      }
    });

    // Log the skip
    await prisma.activityLog.create({
      data: {
        userId,
        type: 'HABIT_COMPLETED',
        description: `Skipped habit: ${habit.name}`,
        metadata: {
          habitId: habit.id,
          reason: reason || 'Not specified',
          action: 'skip'
        }
      }
    });

    res.json({
      success: true,
      message: 'Habit skipped, streak reset to 0'
    });
  } catch (error) {
    console.error('Skip habit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to skip habit',
      error: error.message
    });
  }
};

// ==================== TEST EMAIL NOTIFICATION ====================
exports.testHabitEmail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { emailType, habitId } = req.body;

    if (!emailType) {
      return res.status(400).json({
        success: false,
        message: 'emailType is required (daily, milestone, streak-risk)'
      });
    }

    let result;

    switch (emailType) {
      case 'daily':
        // Test daily habit reminder
        result = await habitReminderService.sendDailyHabitReminders(userId);
        break;

      case 'milestone':
        // Test streak milestone email
        if (!habitId) {
          return res.status(400).json({
            success: false,
            message: 'habitId is required for milestone email'
          });
        }
        result = await habitReminderService.sendStreakMilestoneNotification(habitId, userId);
        break;

      case 'streak-risk':
        // Test streak at risk email
        if (!habitId) {
          return res.status(400).json({
            success: false,
            message: 'habitId is required for streak-risk email'
          });
        }
        result = await habitReminderService.sendStreakRiskNotification(habitId, userId);
        break;

      case 'single':
        // Test single habit reminder
        if (!habitId) {
          return res.status(400).json({
            success: false,
            message: 'habitId is required for single habit reminder'
          });
        }
        result = await habitReminderService.sendHabitReminder(habitId);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid emailType. Use: daily, milestone, streak-risk, or single'
        });
    }

    res.json({
      success: true,
      message: `Test email sent successfully`,
      emailType,
      result
    });
  } catch (error) {
    console.error('Test habit email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
};
