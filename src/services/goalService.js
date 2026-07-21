const prisma = require("../config/database");
const openaiService = require("./openaiService");

const PRIORITY_LEVEL_TO_INT = {
  LOW: 3,
  MEDIUM: 5,
  HIGH: 7,
  URGENT: 9,
};

const GOAL_CATEGORIES = [
  "CAREER",
  "HEALTH",
  "FINANCE",
  "PERSONAL",
  "EDUCATION",
];

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  category: true,
  dueDate: true,
  dueTime: true,
  estimatedMinutes: true,
  goalId: true,
  createdAt: true,
  completedAt: true,
};

const HABIT_SELECT = {
  id: true,
  name: true,
  description: true,
  category: true,
  status: true,
  reminderTime: true,
  targetDays: true,
  currentStreak: true,
  longestStreak: true,
  goalId: true,
  createdAt: true,
};

class GoalService {
  getDayBounds(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  mapPriorityLevel(priorityLevel) {
    if (!priorityLevel) return undefined;
    return PRIORITY_LEVEL_TO_INT[priorityLevel] ?? 5;
  }

  buildGoalListInclude() {
    return {
      tasks: {
        select: TASK_SELECT,
        orderBy: { createdAt: "desc" },
      },
      habits: {
        select: HABIT_SELECT,
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          tasks: true,
          habits: true,
        },
      },
    };
  }

  buildGoalDetailInclude() {
    return {
      tasks: {
        select: TASK_SELECT,
        orderBy: { createdAt: "desc" },
      },
      habits: {
        select: HABIT_SELECT,
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          tasks: true,
          habits: true,
        },
      },
    };
  }

  async assertGoalOwnership(goalId, userId) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      const error = new Error("Goal not found");
      error.statusCode = 404;
      throw error;
    }

    return goal;
  }

  async calculateProgress(goalId) {
    const [tasks, habits] = await Promise.all([
      prisma.task.findMany({
        where: { goalId },
        select: { id: true, status: true },
      }),
      prisma.habit.findMany({
        where: { goalId },
        select: {
          id: true,
          status: true,
          completions: {
            where: {
              date: {
                gte: this.getDayBounds().start,
                lte: this.getDayBounds().end,
              },
            },
            select: { id: true },
            take: 1,
          },
        },
      }),
    ]);

    const totalItems = tasks.length + habits.length;
    if (totalItems === 0) {
      return {
        progress: 0,
        totalItems: 0,
        completedItems: 0,
        completedTasks: 0,
        completedHabits: 0,
        taskCount: 0,
        habitCount: 0,
      };
    }

    const completedTasks = tasks.filter(
      (task) => task.status === "COMPLETED",
    ).length;

    const completedHabits = habits.filter((habit) => {
      if (habit.status === "COMPLETED") return true;
      return habit.completions.length > 0;
    }).length;

    const completedItems = completedTasks + completedHabits;
    const progress = Math.round((completedItems / totalItems) * 100);

    return {
      progress,
      totalItems,
      completedItems,
      completedTasks,
      completedHabits,
      taskCount: tasks.length,
      habitCount: habits.length,
    };
  }

  async refreshProgress(goalId) {
    const stats = await this.calculateProgress(goalId);

    await prisma.goal.update({
      where: { id: goalId },
      data: { progress: stats.progress },
    });

    return stats;
  }

  async getAllGoals(userId, filters = {}) {
    const where = { userId };

    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.priorityLevel) where.priorityLevel = filters.priorityLevel;
    if (filters.source) where.source = filters.source;

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.minProgress || filters.maxProgress) {
      where.progress = {};
      if (filters.minProgress) {
        where.progress.gte = parseFloat(filters.minProgress);
      }
      if (filters.maxProgress) {
        where.progress.lte = parseFloat(filters.maxProgress);
      }
    }

    if (filters.dueFilter) {
      const now = new Date();
      const startOfDay = this.getDayBounds(now).start;
      const endOfDay = this.getDayBounds(now).end;

      switch (filters.dueFilter) {
        case "today":
          where.targetDate = { gte: startOfDay, lte: endOfDay };
          break;
        case "tomorrow": {
          const tomorrow = new Date(startOfDay);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowEnd = new Date(tomorrow);
          tomorrowEnd.setHours(23, 59, 59, 999);
          where.targetDate = { gte: tomorrow, lte: tomorrowEnd };
          break;
        }
        case "this_week": {
          const weekEnd = new Date(startOfDay);
          weekEnd.setDate(weekEnd.getDate() + 7);
          where.targetDate = { gte: startOfDay, lte: weekEnd };
          break;
        }
        case "this_month": {
          const monthEnd = new Date(startOfDay);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          where.targetDate = { gte: startOfDay, lte: monthEnd };
          break;
        }
        case "overdue":
          where.targetDate = { lt: startOfDay };
          where.status = "ACTIVE";
          break;
        default:
          break;
      }
    }

    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;

    const [goals, total, summary] = await Promise.all([
      prisma.goal.findMany({
        where,
        include: this.buildGoalListInclude(),
        orderBy: [{ isMainFocus: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.goal.count({ where }),
      this.getBoardSummary(userId),
    ]);

    return {
      goals,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGoalById(goalId, userId) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      include: this.buildGoalDetailInclude(),
    });

    if (!goal) {
      const error = new Error("Goal not found");
      error.statusCode = 404;
      throw error;
    }

    const progressDetails = await this.calculateProgress(goalId);

    return {
      ...goal,
      progressDetails,
    };
  }

  async createGoal(userId, data) {
    const {
      title,
      description,
      category,
      targetDate,
      priority,
      priorityLevel,
      isMainFocus,
      source,
      taskIds = [],
      habitIds = [],
    } = data;

    const hasTaskIds = Array.isArray(taskIds) && taskIds.length > 0;
    const hasHabitIds = Array.isArray(habitIds) && habitIds.length > 0;

    if (hasTaskIds) {
      const tasks = await prisma.task.findMany({
        where: { id: { in: taskIds }, userId },
        select: { id: true },
      });

      if (tasks.length !== taskIds.length) {
        const error = new Error("One or more tasks were not found");
        error.statusCode = 404;
        throw error;
      }
    }

    if (hasHabitIds) {
      const habits = await prisma.habit.findMany({
        where: { id: { in: habitIds }, userId },
        select: { id: true },
      });

      if (habits.length !== habitIds.length) {
        const error = new Error("One or more habits were not found");
        error.statusCode = 404;
        throw error;
      }
    }

    const goal = await prisma.goal.create({
      data: {
        userId,
        title,
        description,
        category,
        targetDate: targetDate ? new Date(targetDate) : null,
        priority: priority ?? this.mapPriorityLevel(priorityLevel) ?? 5,
        priorityLevel: priorityLevel || "MEDIUM",
        isMainFocus: isMainFocus || false,
        source: source || "MANUAL",
      },
    });

    if (hasTaskIds) {
      await prisma.task.updateMany({
        where: { id: { in: taskIds }, userId },
        data: { goalId: goal.id },
      });
    }

    if (hasHabitIds) {
      await prisma.habit.updateMany({
        where: { id: { in: habitIds }, userId },
        data: { goalId: goal.id },
      });
    }

    if (hasTaskIds || hasHabitIds) {
      await this.refreshProgress(goal.id);
    }

    return this.getGoalById(goal.id, userId);
  }

  async updateGoal(goalId, userId, updateData) {
    await this.assertGoalOwnership(goalId, userId);

    const data = { ...updateData };

    if (data.targetDate) {
      data.targetDate = new Date(data.targetDate);
    }

    if (data.priorityLevel) {
      data.priority = this.mapPriorityLevel(data.priorityLevel);
    }

    delete data.userId;
    delete data.id;
    delete data.progress;

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data,
      include: this.buildGoalDetailInclude(),
    });

    const progressDetails = await this.refreshProgress(goalId);

    return {
      ...goal,
      progressDetails,
    };
  }

  async deleteGoal(goalId, userId) {
    await this.assertGoalOwnership(goalId, userId);

    await prisma.goal.delete({
      where: { id: goalId },
    });
  }

  async pauseGoal(goalId, userId) {
    const goal = await this.assertGoalOwnership(goalId, userId);

    if (goal.status === "COMPLETED" || goal.status === "ARCHIVED") {
      const error = new Error(
        `Cannot toggle pause for a ${goal.status.toLowerCase()} goal`,
      );
      error.statusCode = 400;
      throw error;
    }

    const isPaused = goal.status === "PAUSED";

    return prisma.goal.update({
      where: { id: goalId },
      data: {
        status: isPaused ? "ACTIVE" : "PAUSED",
      },
      include: this.buildGoalListInclude(),
    });
  }

  async completeGoal(goalId, userId) {
    await this.assertGoalOwnership(goalId, userId);

    const progressDetails = await this.refreshProgress(goalId);

    return prisma.goal.update({
      where: { id: goalId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        progress: progressDetails.progress,
      },
      include: this.buildGoalDetailInclude(),
    });
  }

  async linkTasks(goalId, userId, taskIds = []) {
    await this.assertGoalOwnership(goalId, userId);

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      const error = new Error("taskIds array is required");
      error.statusCode = 400;
      throw error;
    }

    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId,
      },
      select: { id: true },
    });

    if (tasks.length !== taskIds.length) {
      const error = new Error("One or more tasks were not found");
      error.statusCode = 404;
      throw error;
    }

    await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        userId,
      },
      data: { goalId },
    });

    const progressDetails = await this.refreshProgress(goalId);

    return this.getGoalById(goalId, userId).then((goal) => ({
      ...goal,
      progressDetails,
    }));
  }

  async linkHabits(goalId, userId, habitIds = []) {
    await this.assertGoalOwnership(goalId, userId);

    if (!Array.isArray(habitIds) || habitIds.length === 0) {
      const error = new Error("habitIds array is required");
      error.statusCode = 400;
      throw error;
    }

    const habits = await prisma.habit.findMany({
      where: {
        id: { in: habitIds },
        userId,
      },
      select: { id: true },
    });

    if (habits.length !== habitIds.length) {
      const error = new Error("One or more habits were not found");
      error.statusCode = 404;
      throw error;
    }

    await prisma.habit.updateMany({
      where: {
        id: { in: habitIds },
        userId,
      },
      data: { goalId },
    });

    const progressDetails = await this.refreshProgress(goalId);

    return this.getGoalById(goalId, userId).then((goal) => ({
      ...goal,
      progressDetails,
    }));
  }

  async unlinkTask(goalId, userId, taskId) {
    await this.assertGoalOwnership(goalId, userId);

    const task = await prisma.task.findFirst({
      where: { id: taskId, userId, goalId },
    });

    if (!task) {
      const error = new Error("Linked task not found for this goal");
      error.statusCode = 404;
      throw error;
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { goalId: null },
    });

    await this.refreshProgress(goalId);

    return { message: "Task unlinked successfully" };
  }

  async unlinkHabit(goalId, userId, habitId) {
    await this.assertGoalOwnership(goalId, userId);

    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId, goalId },
    });

    if (!habit) {
      const error = new Error("Linked habit not found for this goal");
      error.statusCode = 404;
      throw error;
    }

    await prisma.habit.update({
      where: { id: habitId },
      data: { goalId: null },
    });

    await this.refreshProgress(goalId);

    return { message: "Habit unlinked successfully" };
  }

  async getGoalTasks(goalId, userId) {
    await this.assertGoalOwnership(goalId, userId);

    return prisma.task.findMany({
      where: { goalId, userId },
      select: TASK_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  async getGoalHabits(goalId, userId) {
    await this.assertGoalOwnership(goalId, userId);

    return prisma.habit.findMany({
      where: { goalId, userId },
      select: HABIT_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  async getGoalProgress(goalId, userId) {
    await this.assertGoalOwnership(goalId, userId);
    return this.refreshProgress(goalId);
  }

  async getBoardSummary(userId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const [active, paused, completedThisMonth, total] = await Promise.all([
      prisma.goal.count({ where: { userId, status: "ACTIVE" } }),
      prisma.goal.count({ where: { userId, status: "PAUSED" } }),
      prisma.goal.count({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.goal.count({ where: { userId } }),
    ]);

    return {
      active,
      paused,
      completedThisMonth,
      total,
    };
  }

  async generateGoalWithAI(userId, { prompt, category }) {
    if (!openaiService.isConfigured()) {
      const error = new Error(
        "OpenAI service not configured. Please set OPENAI_API_KEY in .env file",
      );
      error.statusCode = 503;
      throw error;
    }

    const result = await openaiService.generateGoal(prompt, { category });

    const goal = await this.createGoal(userId, {
      ...result.goal,
      source: "AI",
    });

    return {
      goal,
      tokensUsed: result.tokensUsed,
    };
  }

  async improveGoalWithAI(goalId, userId, instructions = "") {
    const existing = await this.assertGoalOwnership(goalId, userId);

    if (!openaiService.isConfigured()) {
      const error = new Error(
        "OpenAI service not configured. Please set OPENAI_API_KEY in .env file",
      );
      error.statusCode = 503;
      throw error;
    }

    const result = await openaiService.improveGoal(existing, instructions);
    const improved = result.goal;

    await prisma.goal.update({
      where: { id: goalId },
      data: {
        title: improved.title,
        description: improved.description,
        category: improved.category,
        priorityLevel: improved.priorityLevel,
        priority: this.mapPriorityLevel(improved.priorityLevel),
        targetDate: improved.targetDate ? new Date(improved.targetDate) : null,
      },
    });

    await this.refreshProgress(goalId);

    return this.getGoalById(goalId, userId);
  }

  buildGoalAiSnapshot(goal) {
    return {
      goal: {
        title: goal.title,
        description: goal.description,
        category: goal.category,
        priorityLevel: goal.priorityLevel,
        priority: goal.priority,
        targetDate: goal.targetDate
          ? new Date(goal.targetDate).toISOString()
          : null,
      },
      linkedTaskIds: (goal.tasks || []).map((t) => t.id),
      linkedHabitIds: (goal.habits || []).map((h) => h.id),
    };
  }

  async createAiSuggestion(goalId, userId, { action, message } = {}) {
    const GOAL_AI_ACTIONS = [
      "CHAT",
      "IMPROVE_DESCRIPTION",
      "ADD_TASKS",
      "ADD_HABITS",
    ];

    if (!GOAL_AI_ACTIONS.includes(action)) {
      const error = new Error(
        `Invalid action. Valid actions: ${GOAL_AI_ACTIONS.join(", ")}`,
      );
      error.statusCode = 400;
      throw error;
    }

    if (!openaiService.isConfigured()) {
      const error = new Error(
        "OpenAI service not configured. Please set OPENAI_API_KEY in .env file",
      );
      error.statusCode = 503;
      throw error;
    }

    if (action === "CHAT" && !message?.trim()) {
      const error = new Error("message is required for CHAT action");
      error.statusCode = 400;
      throw error;
    }

    const goal = await this.getGoalById(goalId, userId);
    const previousSnapshot = this.buildGoalAiSnapshot(goal);

    const result = await openaiService.suggestGoalAssistant(action, message, {
      goal: openaiService.formatGoalForAi(goal),
      rawGoal: goal,
      linkedTasks: (goal.tasks || []).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
      linkedHabits: (goal.habits || []).map((h) => ({
        id: h.id,
        name: h.name,
        status: h.status,
        category: h.category,
      })),
    });

    const recommendation = await prisma.aiRecommendation.create({
      data: {
        userId,
        type: "GOAL",
        title: result.title || "Goal suggestion",
        description: result.message,
        reasoning: JSON.stringify({
          suggestionId: null,
          goalId,
          action,
          message: message || null,
          proposedGoal: result.proposedGoal,
          proposedTasks: result.proposedTasks,
          proposedHabits: result.proposedHabits,
          previousSnapshot,
          createdTaskIds: [],
          createdHabitIds: [],
        }),
        priority: 8,
        isApplied: false,
        isDismissed: false,
      },
    });

    const reasoningPayload = JSON.parse(recommendation.reasoning);
    reasoningPayload.suggestionId = recommendation.id;
    await prisma.aiRecommendation.update({
      where: { id: recommendation.id },
      data: { reasoning: JSON.stringify(reasoningPayload) },
    });

    return {
      suggestionId: recommendation.id,
      goalId,
      action,
      message: result.message,
      proposedGoal: result.proposedGoal,
      proposedTasks: result.proposedTasks,
      proposedHabits: result.proposedHabits,
      goal,
      tokensUsed: result.tokensUsed,
    };
  }

  async acceptAiSuggestion(suggestionId, userId) {
    const recommendation = await prisma.aiRecommendation.findFirst({
      where: {
        id: suggestionId,
        userId,
        type: "GOAL",
        isApplied: false,
        isDismissed: false,
      },
    });

    if (!recommendation) {
      const error = new Error("Goal suggestion not found or already handled");
      error.statusCode = 404;
      throw error;
    }

    let payload;
    try {
      payload = JSON.parse(recommendation.reasoning);
    } catch {
      const error = new Error("Invalid suggestion data");
      error.statusCode = 400;
      throw error;
    }

    const {
      goalId,
      proposedGoal,
      proposedTasks = [],
      proposedHabits = [],
      previousSnapshot,
    } = payload;

    await this.assertGoalOwnership(goalId, userId);

    if (proposedGoal) {
      await prisma.goal.update({
        where: { id: goalId },
        data: {
          title: proposedGoal.title,
          description: proposedGoal.description,
          category: proposedGoal.category,
          priorityLevel: proposedGoal.priorityLevel,
          priority: this.mapPriorityLevel(proposedGoal.priorityLevel),
          targetDate: proposedGoal.targetDate
            ? new Date(proposedGoal.targetDate)
            : null,
        },
      });
    }

    const createdTaskIds = [];
    for (const task of proposedTasks) {
      const created = await prisma.task.create({
        data: {
          userId,
          title: task.title,
          description: task.description,
          priority: task.priority || "MEDIUM",
          category: task.category || null,
          estimatedMinutes: task.estimatedMinutes,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          goalId,
          aiGenerated: true,
          source: "AI_GENERATED",
        },
        select: { id: true },
      });
      createdTaskIds.push(created.id);
    }

    const createdHabitIds = [];
    for (const habit of proposedHabits) {
      const created = await prisma.habit.create({
        data: {
          userId,
          name: habit.name,
          description: habit.description,
          category: habit.category || "PERSONAL",
          frequency: habit.frequency || "DAILY",
          difficulty: habit.difficulty || "MEDIUM",
          targetDays: habit.targetDays || [],
          targetTimesPerDay: habit.targetTimesPerDay ?? 1,
          reminderTime: habit.reminderTime || null,
          aiSuggested: true,
          source: "AI",
          goalId,
          status: "ACTIVE",
          isActive: true,
        },
        select: { id: true },
      });
      createdHabitIds.push(created.id);
    }

    await this.refreshProgress(goalId);

    await prisma.aiRecommendation.update({
      where: { id: suggestionId },
      data: {
        isApplied: true,
        appliedAt: new Date(),
        reasoning: JSON.stringify({
          ...payload,
          previousSnapshot,
          createdTaskIds,
          createdHabitIds,
        }),
      },
    });

    const goal = await this.getGoalById(goalId, userId);

    return {
      message: "Suggestion applied successfully",
      suggestionId,
      goalId,
      createdTaskIds,
      createdHabitIds,
      goal,
    };
  }

  async dismissAiSuggestion(suggestionId, userId) {
    const recommendation = await prisma.aiRecommendation.findFirst({
      where: {
        id: suggestionId,
        userId,
        type: "GOAL",
        isApplied: false,
        isDismissed: false,
      },
    });

    if (!recommendation) {
      const error = new Error("Goal suggestion not found or already handled");
      error.statusCode = 404;
      throw error;
    }

    await prisma.aiRecommendation.update({
      where: { id: suggestionId },
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
      },
    });

    return {
      message: "Suggestion dismissed",
      suggestionId,
    };
  }

  async undoLastAiChange(goalId, userId) {
    await this.assertGoalOwnership(goalId, userId);

    const recommendations = await prisma.aiRecommendation.findMany({
      where: {
        userId,
        type: "GOAL",
        isApplied: true,
      },
      orderBy: { appliedAt: "desc" },
      take: 20,
    });

    const recommendation = recommendations.find((row) => {
      try {
        const payload = JSON.parse(row.reasoning || "{}");
        return payload.goalId === goalId;
      } catch {
        return false;
      }
    });

    if (!recommendation) {
      const error = new Error("No applied Goal AI change found to undo");
      error.statusCode = 404;
      throw error;
    }

    let payload;
    try {
      payload = JSON.parse(recommendation.reasoning);
    } catch {
      const error = new Error("Invalid suggestion data");
      error.statusCode = 400;
      throw error;
    }

    const {
      previousSnapshot,
      createdTaskIds = [],
      createdHabitIds = [],
    } = payload;

    if (createdTaskIds.length > 0) {
      await prisma.task.deleteMany({
        where: { id: { in: createdTaskIds }, userId, goalId },
      });
    }

    if (createdHabitIds.length > 0) {
      await prisma.habit.deleteMany({
        where: { id: { in: createdHabitIds }, userId, goalId },
      });
    }

    if (previousSnapshot?.goal) {
      const snap = previousSnapshot.goal;
      await prisma.goal.update({
        where: { id: goalId },
        data: {
          title: snap.title,
          description: snap.description,
          category: snap.category,
          priorityLevel: snap.priorityLevel,
          priority: snap.priority ?? this.mapPriorityLevel(snap.priorityLevel),
          targetDate: snap.targetDate ? new Date(snap.targetDate) : null,
        },
      });
    }

    await this.refreshProgress(goalId);

    await prisma.aiRecommendation.update({
      where: { id: recommendation.id },
      data: {
        isApplied: false,
        appliedAt: null,
      },
    });

    const goal = await this.getGoalById(goalId, userId);

    return {
      message: "Last Goal AI change undone",
      suggestionId: recommendation.id,
      goalId,
      goal,
    };
  }
}

module.exports = new GoalService();
