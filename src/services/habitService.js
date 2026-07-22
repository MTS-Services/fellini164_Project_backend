const prisma = require("../config/database");
const goalService = require("./goalService");
const openaiService = require("./openaiService");

class HabitService {
  getDayBounds(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  buildHabitListInclude() {
    return {
      goal: {
        select: { id: true, title: true, status: true },
      },
      completions: {
        where: {
          date: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
        orderBy: { date: "desc" },
      },
      _count: {
        select: { completions: true, plannerItems: true },
      },
    };
  }

  buildHabitDetailInclude() {
    return {
      goal: {
        select: { id: true, title: true, status: true, category: true },
      },
      completions: {
        orderBy: { date: "desc" },
        take: 60,
      },
      plannerItems: {
        orderBy: [{ date: "asc" }, { orderIndex: "asc" }],
        take: 10,
      },
      _count: {
        select: { completions: true, plannerItems: true },
      },
    };
  }

  async assertHabitOwnership(habitId, userId) {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
    });

    if (!habit) {
      const error = new Error("Habit not found");
      error.statusCode = 404;
      throw error;
    }

    return habit;
  }

  async validateGoalId(goalId, userId) {
    if (!goalId) return null;

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      select: { id: true },
    });

    if (!goal) {
      const error = new Error("Linked goal not found");
      error.statusCode = 404;
      throw error;
    }

    return goalId;
  }

  async refreshLinkedGoalProgress(goalId) {
    if (goalId) {
      await goalService.refreshProgress(goalId);
    }
  }

  sanitizeHabitInput(data) {
    const allowed = [
      "name",
      "description",
      "category",
      "frequency",
      "difficulty",
      "targetDays",
      "targetTimesPerDay",
      "reminderTime",
      "isActive",
      "status",
      "aiSuggested",
      "source",
      "goalId",
    ];

    const sanitized = {};
    for (const key of allowed) {
      if (data[key] !== undefined) sanitized[key] = data[key];
    }
    return sanitized;
  }

  async getAllHabits(userId, filters = {}) {
    const where = { userId };

    if (filters.category) where.category = filters.category;
    if (filters.frequency) where.frequency = filters.frequency;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.status) where.status = filters.status;
    if (filters.source) where.source = filters.source;
    if (filters.goalId) where.goalId = filters.goalId;

    if (filters.isActive === true || filters.isActive === "true") {
      where.isActive = true;
    } else if (filters.isActive === false || filters.isActive === "false") {
      where.isActive = false;
    }

    if (filters.aiSuggested === true || filters.aiSuggested === "true") {
      where.aiSuggested = true;
    } else if (
      filters.aiSuggested === false ||
      filters.aiSuggested === "false"
    ) {
      where.aiSuggested = false;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;

    const [habits, total] = await Promise.all([
      prisma.habit.findMany({
        where,
        include: this.buildHabitListInclude(),
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.habit.count({ where }),
    ]);

    return {
      habits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getHabitById(habitId, userId) {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
      include: this.buildHabitDetailInclude(),
    });

    if (!habit) {
      const error = new Error("Habit not found");
      error.statusCode = 404;
      throw error;
    }

    return habit;
  }

  async createHabit(userId, habitData) {
    const data = this.sanitizeHabitInput(habitData);

    if (!data.name?.trim()) {
      const error = new Error("Name is required");
      error.statusCode = 400;
      throw error;
    }

    if (!data.category) {
      const error = new Error("Category is required");
      error.statusCode = 400;
      throw error;
    }

    await this.validateGoalId(data.goalId, userId);

    const status =
      data.status || (data.isActive === false ? "PAUSED" : "ACTIVE");
    const habit = await prisma.habit.create({
      data: {
        userId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category,
        frequency: data.frequency || "DAILY",
        difficulty: data.difficulty || "MEDIUM",
        targetDays: data.targetDays || [],
        targetTimesPerDay: data.targetTimesPerDay ?? 1,
        reminderTime: data.reminderTime || null,
        isActive: status === "ACTIVE",
        status,
        aiSuggested: data.aiSuggested || false,
        source: data.source || (data.aiSuggested ? "AI" : "MANUAL"),
        goalId: data.goalId || null,
      },
      include: this.buildHabitDetailInclude(),
    });

    await this.refreshLinkedGoalProgress(habit.goalId);
    await this.logHabitActivity(userId, "HABIT_CREATED", {
      habitId: habit.id,
      name: habit.name,
      goalId: habit.goalId,
      source: habit.source,
    });

    return habit;
  }

  async updateHabit(habitId, userId, updateData) {
    const existing = await this.assertHabitOwnership(habitId, userId);
    const data = this.sanitizeHabitInput(updateData);

    if (data.goalId !== undefined) {
      if (data.goalId === null) {
        data.goalId = null;
      } else {
        await this.validateGoalId(data.goalId, userId);
      }
    }

    if (data.name) data.name = data.name.trim();
    if (data.description) data.description = data.description.trim();

    if (data.status) {
      data.isActive = data.status === "ACTIVE";
    } else if (data.isActive !== undefined) {
      data.status = data.isActive ? "ACTIVE" : "PAUSED";
    }

    const habit = await prisma.habit.update({
      where: { id: habitId },
      data,
      include: this.buildHabitDetailInclude(),
    });

    const goalIds = new Set([existing.goalId, habit.goalId].filter(Boolean));
    for (const goalId of goalIds) {
      await this.refreshLinkedGoalProgress(goalId);
    }

    return habit;
  }

  async deleteHabit(habitId, userId) {
    const habit = await this.assertHabitOwnership(habitId, userId);

    await prisma.habit.delete({
      where: { id: habitId },
    });

    await this.refreshLinkedGoalProgress(habit.goalId);
  }

  async togglePause(habitId, userId) {
    const habit = await this.assertHabitOwnership(habitId, userId);
    const nextStatus = habit.status === "PAUSED" ? "ACTIVE" : "PAUSED";

    return this.updateHabit(habitId, userId, {
      status: nextStatus,
      isActive: nextStatus === "ACTIVE",
    });
  }

  async markHabitStatusCompleted(habitId, userId) {
    return this.updateHabit(habitId, userId, {
      status: "COMPLETED",
      isActive: false,
    });
  }

  async completeHabit(habitId, userId, completionData = {}) {
    const habit = await this.assertHabitOwnership(habitId, userId);
    const completionDate = completionData.date
      ? new Date(completionData.date)
      : new Date();
    const { start, end } = this.getDayBounds(completionDate);

    const existingCompletion = await prisma.habitCompletion.findFirst({
      where: {
        habitId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    if (existingCompletion) {
      return {
        completion: existingCompletion,
        habit: await this.getHabitById(habitId, userId),
        alreadyCompleted: true,
      };
    }

    const completion = await prisma.habitCompletion.create({
      data: {
        habitId,
        date: completionDate,
        notes: completionData.notes || null,
      },
    });

    await this.recalculateHabitStats(habitId);
    await this.refreshLinkedGoalProgress(habit.goalId);

    const updatedHabit = await this.getHabitById(habitId, userId);
    await this.logHabitActivity(userId, "HABIT_COMPLETED", {
      habitId,
      completionId: completion.id,
      streak: updatedHabit.currentStreak,
    });

    return {
      completion,
      habit: updatedHabit,
      alreadyCompleted: false,
    };
  }

  async undoCompletion(habitId, userId, date = new Date()) {
    const habit = await this.assertHabitOwnership(habitId, userId);
    const { start, end } = this.getDayBounds(
      date ? new Date(date) : new Date(),
    );

    const completion = await prisma.habitCompletion.findFirst({
      where: {
        habitId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    if (!completion) {
      const error = new Error("Habit completion not found for this date");
      error.statusCode = 404;
      throw error;
    }

    await prisma.habitCompletion.delete({
      where: { id: completion.id },
    });

    await this.recalculateHabitStats(habitId);
    await this.refreshLinkedGoalProgress(habit.goalId);

    return this.getHabitById(habitId, userId);
  }

  async skipHabit(habitId, userId, reason = null) {
    const habit = await this.assertHabitOwnership(habitId, userId);

    const updated = await prisma.habit.update({
      where: { id: habitId },
      data: { currentStreak: 0 },
      include: this.buildHabitDetailInclude(),
    });

    await this.refreshLinkedGoalProgress(habit.goalId);
    await this.logHabitActivity(userId, "HABIT_COMPLETED", {
      habitId,
      action: "skip",
      reason: reason || "Not specified",
    });

    return updated;
  }

  async recalculateHabitStats(habitId) {
    const completions = await prisma.habitCompletion.findMany({
      where: { habitId },
      orderBy: { date: "asc" },
    });

    let currentStreak = 0;
    let longestStreak = 0;
    let runningStreak = 0;
    let previousDay = null;

    for (const completion of completions) {
      const day = this.getDayBounds(completion.date).start;

      if (!previousDay) {
        runningStreak = 1;
      } else {
        const daysDiff = Math.round(
          (day - previousDay) / (1000 * 60 * 60 * 24),
        );
        runningStreak = daysDiff === 1 ? runningStreak + 1 : 1;
      }

      longestStreak = Math.max(longestStreak, runningStreak);
      previousDay = day;
    }

    if (completions.length > 0) {
      const todayStart = this.getDayBounds().start;
      const lastDay = this.getDayBounds(
        completions[completions.length - 1].date,
      ).start;
      const daysSinceLastCompletion = Math.round(
        (todayStart - lastDay) / (1000 * 60 * 60 * 24),
      );
      currentStreak = daysSinceLastCompletion <= 1 ? runningStreak : 0;
    }

    await prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak,
        longestStreak,
        totalCompletions: completions.length,
      },
    });
  }

  async getHabitStats(userId) {
    const { start, end } = this.getDayBounds();

    const [habits, habitsCompletedToday] = await Promise.all([
      prisma.habit.findMany({ where: { userId } }),
      prisma.habitCompletion.count({
        where: {
          habit: { userId },
          date: { gte: start, lte: end },
        },
      }),
    ]);

    const activeHabits = habits.filter(
      (habit) => habit.status === "ACTIVE" && habit.isActive,
    );
    const totalCompletions = habits.reduce(
      (sum, habit) => sum + habit.totalCompletions,
      0,
    );
    const avgStreak =
      habits.length > 0
        ? habits.reduce((sum, habit) => sum + habit.currentStreak, 0) /
          habits.length
        : 0;

    return {
      totalHabits: habits.length,
      activeHabits: activeHabits.length,
      pausedHabits: habits.filter((habit) => habit.status === "PAUSED").length,
      completedHabits: habits.filter((habit) => habit.status === "COMPLETED")
        .length,
      totalCompletions,
      averageStreak: Math.round(avgStreak * 10) / 10,
      longestStreak: Math.max(...habits.map((habit) => habit.longestStreak), 0),
      habitsCompletedToday,
      completionRateToday: activeHabits.length
        ? Math.round((habitsCompletedToday / activeHabits.length) * 100)
        : 0,
    };
  }

  async getBoardSummary(userId) {
    const { start, end } = this.getDayBounds();

    const [active, paused, completed, total, completedToday] =
      await Promise.all([
        prisma.habit.count({
          where: { userId, status: "ACTIVE", isActive: true },
        }),
        prisma.habit.count({ where: { userId, status: "PAUSED" } }),
        prisma.habit.count({ where: { userId, status: "COMPLETED" } }),
        prisma.habit.count({ where: { userId } }),
        prisma.habitCompletion.count({
          where: {
            habit: { userId },
            date: { gte: start, lte: end },
          },
        }),
      ]);

    return {
      active,
      paused,
      completed,
      total,
      completedToday,
      remainingToday: Math.max(active - completedToday, 0),
    };
  }

  async getHabitsCompletedToday(userId) {
    const { start, end } = this.getDayBounds();

    return prisma.habitCompletion.count({
      where: {
        habit: { userId },
        date: { gte: start, lte: end },
      },
    });
  }

  async getHabitHistory(habitId, userId, days = 30) {
    await this.assertHabitOwnership(habitId, userId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return prisma.habitCompletion.findMany({
      where: {
        habitId,
        date: { gte: startDate },
      },
      orderBy: { date: "desc" },
    });
  }

  async generateHabitWithAI(userId, { prompt, goalId, category } = {}) {
    if (!openaiService.isConfigured()) {
      const error = new Error(
        "OpenAI service not configured. Please set OPENAI_API_KEY in .env file",
      );
      error.statusCode = 503;
      throw error;
    }

    if (!prompt?.trim()) {
      const error = new Error("prompt is required for AI habit generation");
      error.statusCode = 400;
      throw error;
    }

    let linkedGoal = null;
    if (goalId) {
      linkedGoal = await prisma.goal.findFirst({
        where: { id: goalId, userId },
        select: { id: true, title: true, category: true },
      });

      if (!linkedGoal) {
        const error = new Error("Linked goal not found");
        error.statusCode = 404;
        throw error;
      }
    }

    const activeGoals = await prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      select: { id: true, title: true, category: true },
      take: 10,
    });

    const result = await openaiService.generateHabit(prompt, {
      category: category || linkedGoal?.category,
      goals: activeGoals,
      goalId: linkedGoal?.id,
    });

    const suggestedGoalId = goalId || result.goal.suggestedGoalId || null;
    if (suggestedGoalId && !goalId) {
      await this.validateGoalId(suggestedGoalId, userId);
    }

    const habit = await this.createHabit(userId, {
      ...result.habit,
      goalId: suggestedGoalId,
      aiSuggested: true,
      source: "AI",
    });

    return { habit, tokensUsed: result.tokensUsed };
  }

  async improveHabitWithAI(habitId, userId, instructions = "") {
    const existing = await this.getHabitById(habitId, userId);

    if (!openaiService.isConfigured()) {
      const error = new Error(
        "OpenAI service not configured. Please set OPENAI_API_KEY in .env file",
      );
      error.statusCode = 503;
      throw error;
    }

    const result = await openaiService.improveHabit(existing, instructions);
    const improved = result.habit;

    await prisma.habit.update({
      where: { id: habitId },
      data: {
        name: improved.name,
        description: improved.description,
        category: improved.category,
        frequency: improved.frequency,
        difficulty: improved.difficulty,
        targetDays: improved.targetDays || [],
        targetTimesPerDay: improved.targetTimesPerDay ?? 1,
        reminderTime: improved.reminderTime || null,
      },
    });

    return this.getHabitById(habitId, userId);
  }

  async getHabitsNeedingReminders(time) {
    return prisma.habit.findMany({
      where: {
        isActive: true,
        status: "ACTIVE",
        reminderTime: time,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            settings: true,
          },
        },
      },
    });
  }

  async isHabitCompletedToday(habitId) {
    const { start, end } = this.getDayBounds();

    const completion = await prisma.habitCompletion.findFirst({
      where: {
        habitId,
        date: { gte: start, lte: end },
      },
    });

    return !!completion;
  }

  async getHabitsAtRisk(userId) {
    const habits = await prisma.habit.findMany({
      where: {
        userId,
        isActive: true,
        status: "ACTIVE",
        currentStreak: { gt: 0 },
      },
      include: {
        completions: {
          orderBy: { date: "desc" },
          take: 1,
        },
      },
    });

    const today = this.getDayBounds().start;

    return habits.filter((habit) => {
      if (habit.completions.length === 0) return false;

      const lastCompletion = this.getDayBounds(habit.completions[0].date).start;
      const daysSinceCompletion = Math.floor(
        (today - lastCompletion) / (1000 * 60 * 60 * 24),
      );

      return daysSinceCompletion >= 1;
    });
  }

  async logHabitActivity(userId, activityType, metadata) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          type: activityType,
          description: `Habit activity: ${activityType}`,
          metadata,
        },
      });
    } catch (error) {
      console.error("Failed to log habit activity:", error);
    }
  }
}

module.exports = new HabitService();
