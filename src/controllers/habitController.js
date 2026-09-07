const habitService = require("../services/habitService");
const habitReminderService = require("../services/habitReminderService");

const getErrorStatus = (error, fallback = 500) => error.statusCode || fallback;

exports.getAllHabits = async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      isActive: req.query.isActive,
      frequency: req.query.frequency,
      difficulty: req.query.difficulty,
      status: req.query.status,
      source: req.query.source,
      goalId: req.query.goalId,
      aiSuggested: req.query.aiSuggested,
      search: req.query.search,
      streak: req.query.streak,
      daysLeft: req.query.daysLeft,
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await habitService.getAllHabits(req.user.id, filters);

    res.json({
      success: true,
      count: result.habits.length,
      habits: result.habits,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get all habits error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: "Failed to fetch habits",
      error: error.message,
    });
  }
};

exports.getHabitById = async (req, res) => {
  try {
    const habit = await habitService.getHabitById(req.params.id, req.user.id);

    res.json({
      success: true,
      habit,
    });
  } catch (error) {
    console.error("Get habit by ID error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to fetch habit",
    });
  }
};

exports.createHabit = async (req, res) => {
  try {
    const habit = await habitService.createHabit(req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: "Habit created successfully",
      habit,
    });
  } catch (error) {
    console.error("Create habit error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Failed to create habit",
    });
  }
};

exports.completeHabit = async (req, res) => {
  try {
    const { notes, date, timeSlotId } = req.body;
    const result = await habitService.completeHabit(
      req.params.id,
      req.user.id,
      {
        date,
        notes,
        timeSlotId,
      },
    );

    if (
      result.habit.currentStreak % 7 === 0 &&
      result.habit.currentStreak > 0
    ) {
      await habitReminderService.sendStreakMilestoneNotification(
        req.params.id,
        req.user.id,
      );
    }

    res.json({
      success: true,
      message:
        result.message ||
        (result.alreadyCompleted
          ? "Habit already completed for this date"
          : "Habit completed successfully"),
      completion: result.completion,
      habit: result.habit,
      alreadyCompleted: result.alreadyCompleted,
      progress: result.progress,
    });
  } catch (error) {
    console.error("Complete habit error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to complete habit",
    });
  }
};

exports.updateHabit = async (req, res) => {
  try {
    const habit = await habitService.updateHabit(
      req.params.id,
      req.user.id,
      req.body,
    );

    res.json({
      success: true,
      message: "Habit updated successfully",
      habit,
    });
  } catch (error) {
    console.error("Update habit error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to update habit",
    });
  }
};

exports.deleteHabit = async (req, res) => {
  try {
    await habitService.deleteHabit(req.params.id, req.user.id);

    res.json({
      success: true,
      message: "Habit deleted successfully",
    });
  } catch (error) {
    console.error("Delete habit error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to delete habit",
    });
  }
};

exports.getHabitStats = async (req, res) => {
  try {
    const stats = await habitService.getHabitStats(req.user.id);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Get habit stats error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: "Failed to fetch habit statistics",
      error: error.message,
    });
  }
};

exports.getBoardSummary = async (req, res) => {
  try {
    const summary = await habitService.getBoardSummary(req.user.id);
    res.json({ success: true, summary });
  } catch (error) {
    console.error("Get habit board summary error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: "Failed to fetch habit board summary",
      error: error.message,
    });
  }
};

exports.getHabitHistory = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const history = await habitService.getHabitHistory(
      req.params.id,
      req.user.id,
      days,
    );

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error("Get habit history error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to fetch habit history",
    });
  }
};

exports.skipHabit = async (req, res) => {
  try {
    const habit = await habitService.skipHabit(
      req.params.id,
      req.user.id,
      req.body.reason,
    );

    res.json({
      success: true,
      message: "Habit skipped, streak reset to 0",
      habit,
    });
  } catch (error) {
    console.error("Skip habit error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to skip habit",
    });
  }
};

exports.undoCompletion = async (req, res) => {
  try {
    const habit = await habitService.undoCompletion(
      req.params.id,
      req.user.id,
      req.body.date,
      req.body.timeSlotId,
    );

    res.json({
      success: true,
      message: "Habit completion removed successfully",
      habit,
    });
  } catch (error) {
    console.error("Undo habit completion error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to undo habit completion",
    });
  }
};

exports.pauseHabit = async (req, res) => {
  try {
    const habit = await habitService.togglePause(req.params.id, req.user.id);

    res.json({
      success: true,
      message:
        habit.status === "PAUSED"
          ? "Habit paused successfully"
          : "Habit activated successfully",
      habit,
    });
  } catch (error) {
    console.error("Pause habit error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to toggle habit pause",
    });
  }
};

exports.completeHabitStatus = async (req, res) => {
  try {
    const habit = await habitService.markHabitStatusCompleted(
      req.params.id,
      req.user.id,
    );

    res.json({
      success: true,
      message: "Habit marked as completed",
      habit,
    });
  } catch (error) {
    console.error("Complete habit status error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to complete habit",
    });
  }
};

exports.generateHabitWithAI = async (req, res) => {
  try {
    const result = await habitService.generateHabitWithAI(req.user.id, {
      prompt: req.body.prompt,
      goalId: req.body.goalId,
      category: req.body.category,
    });

    res.status(201).json({
      success: true,
      message: "Habit generated successfully",
      habit: result.habit,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error("Generate habit with AI error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Failed to generate habit",
    });
  }
};

exports.improveHabitWithAI = async (req, res) => {
  try {
    const habit = await habitService.improveHabitWithAI(
      req.params.id,
      req.user.id,
      req.body.instructions,
    );

    res.json({
      success: true,
      message: "Habit improved successfully",
      habit,
    });
  } catch (error) {
    console.error("Improve habit with AI error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Failed to improve habit",
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
        message: "emailType is required (daily, milestone, streak-risk)",
      });
    }

    let result;

    switch (emailType) {
      case "daily":
        result = await habitReminderService.sendDailyHabitReminders(userId, {
          force: true,
        });
        break;

      case "milestone":
        if (!habitId) {
          return res.status(400).json({
            success: false,
            message: "habitId is required for milestone email",
          });
        }
        result = await habitReminderService.sendStreakMilestoneNotification(
          habitId,
          userId,
        );
        break;

      case "streak-risk":
        if (!habitId) {
          return res.status(400).json({
            success: false,
            message: "habitId is required for streak-risk email",
          });
        }
        result = await habitReminderService.sendStreakRiskNotification(
          habitId,
          userId,
        );
        break;

      case "single":
        // Test single habit reminder
        if (!habitId) {
          return res.status(400).json({
            success: false,
            message: "habitId is required for single habit reminder",
          });
        }
        result = await habitReminderService.sendHabitReminder(habitId, {
          force: true,
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          message:
            "Invalid emailType. Use: daily, milestone, streak-risk, or single",
        });
    }

    // Reflect the real outcome of the underlying send
    if (result && result.success === false) {
      return res.status(422).json({
        success: false,
        message: result.message || "Failed to send test email",
        emailType,
        result,
      });
    }

    res.json({
      success: true,
      message: "Test email sent successfully",
      emailType,
      result,
    });
  } catch (error) {
    console.error("Test habit email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
    });
  }
};
