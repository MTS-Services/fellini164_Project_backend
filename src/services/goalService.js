const prisma = require("../config/database");
const openaiService = require("./openaiService");

const PRIORITY_LEVEL_TO_INT = {
  LOW: 3,
  MEDIUM: 5,
  HIGH: 7,
  URGENT: 9,
};

const GOAL_CATEGORIES = [
  "HEALTH",
  "FITNESS",
  "HABITS",
  "MONEY",
  "CAREER",
  "RELATIONSHIPS",
  "PRODUCTIVITY",
  "ROUTINES",
  "PERSONAL_GROWTH",
  "LEARNING",
  "OTHER",
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

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        include: this.buildGoalListInclude(),
        orderBy: [{ isMainFocus: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.goal.count({ where }),
    ]);

    return {
      goals,
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
    } = data;

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
      include: this.buildGoalListInclude(),
    });

    return goal;
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
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

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
}

module.exports = new GoalService();
