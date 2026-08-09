const prisma = require("../config/database");
const goalService = require("./goalService");
const openaiService = require("./openaiService");

class TaskService {
  getDayBounds(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  /**
   * Relative due label for nearby dates:
   * TODAY | TOMORROW | DATE | null (no dueDate)
   */
  resolveDueLabel(dueDate) {
    if (!dueDate) return null;

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return null;
    due.setHours(0, 0, 0, 0);

    const { start: todayStart } = this.getDayBounds();
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    if (due.getTime() === todayStart.getTime()) return "TODAY";
    if (due.getTime() === tomorrowStart.getTime()) return "TOMORROW";
    return "DATE";
  }

  /**
   * Priority badge from dueDate:
   * Overdue → HIGH, Due Today → URGENT, Due Tomorrow → MEDIUM, Due in 2–3 days → LOW
   */
  resolvePriorityFromDueDate(dueDate) {
    if (!dueDate) return null;

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return null;
    due.setHours(0, 0, 0, 0);

    const { start: todayStart, end: todayEnd } = this.getDayBounds();

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const in2Start = new Date(todayStart);
    in2Start.setDate(in2Start.getDate() + 2);
    const in3End = new Date(todayStart);
    in3End.setDate(in3End.getDate() + 3);
    in3End.setHours(23, 59, 59, 999);

    if (due < todayStart) {
      return { priority: "HIGH", dueStatus: "OVERDUE" };
    }
    if (due >= todayStart && due <= todayEnd) {
      return { priority: "URGENT", dueStatus: "DUE_TODAY" };
    }
    if (due >= tomorrowStart && due <= tomorrowEnd) {
      return { priority: "MEDIUM", dueStatus: "DUE_TOMORROW" };
    }
    if (due >= in2Start && due <= in3End) {
      return { priority: "LOW", dueStatus: "DUE_IN_2_3_DAYS" };
    }

    return { priority: null, dueStatus: "LATER" };
  }

  // Assert that the due date is not before the current date
  assertDueDateNotBeforeToday(dueDate) {
    if (dueDate === undefined || dueDate === null || dueDate === "") return;

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) {
      const error = new Error("Invalid due date");
      error.statusCode = 400;
      throw error;
    }

    due.setHours(0, 0, 0, 0);
    const { start: todayStart } = this.getDayBounds();

    if (due < todayStart) {
      const error = new Error(
        "Due date cannot be earlier than the current date",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  formatTaskResponse(task) {
    if (!task) return task;

    const dueLabel = this.resolveDueLabel(task.dueDate);
    const duePriority = this.resolvePriorityFromDueDate(task.dueDate);

    const formatted = {
      ...task,
      dueLabel,
      dueStatus: duePriority?.dueStatus || null,
      storedPriority: task.priority,
    };

    if (duePriority?.priority) {
      formatted.priority = duePriority.priority;
    }

    if (Array.isArray(task.subtasks)) {
      formatted.subtasks = task.subtasks.map((subtask) =>
        this.formatTaskResponse(subtask),
      );
    }

    return formatted;
  }

  buildTaskListInclude() {
    return {
      goal: {
        select: { id: true, title: true, status: true },
      },
      parentTask: {
        select: { id: true, title: true },
      },
      subtasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          estimatedMinutes: true,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { subtasks: true },
      },
    };
  }

  buildTaskDetailInclude() {
    return {
      goal: {
        select: { id: true, title: true, status: true, category: true },
      },
      parentTask: {
        select: { id: true, title: true, status: true },
      },
      subtasks: {
        orderBy: { createdAt: "asc" },
      },
      plannerItems: {
        orderBy: [{ date: "asc" }, { orderIndex: "asc" }],
        take: 10,
      },
    };
  }

  async assertTaskOwnership(taskId, userId) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    return task;
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

  async validateParentTaskId(parentTaskId, userId) {
    if (!parentTaskId) return null;

    const parent = await prisma.task.findFirst({
      where: { id: parentTaskId, userId },
      select: { id: true },
    });

    if (!parent) {
      const error = new Error("Parent task not found");
      error.statusCode = 404;
      throw error;
    }

    return parentTaskId;
  }

  async refreshLinkedGoalProgress(goalId) {
    if (goalId) {
      await goalService.refreshProgress(goalId);
    }
  }

  sanitizeTaskInput(data) {
    const allowed = [
      "title",
      "description",
      "status",
      "priority",
      "dueDate",
      "dueTime",
      "estimatedMinutes",
      "actualMinutes",
      "scheduledDate",
      "category",
      "tags",
      "goalId",
      "parentTaskId",
      "notes",
      "energyLevelRequired",
      "contextNeeded",
      "isRecurring",
      "recurrencePattern",
      "recurrenceDays",
      "difficultyLevel",
      "aiRecommendation",
      "source",
      "aiGenerated",
    ];

    const sanitized = {};
    for (const key of allowed) {
      if (data[key] !== undefined) {
        sanitized[key] = data[key];
      }
    }
    return sanitized;
  }

  // Get all tasks with advanced filtering
  async getAllTasks(userId, filters = {}) {
    const where = { userId };

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.category) where.category = filters.category;
    if (filters.source) where.source = filters.source;
    if (filters.goalId) where.goalId = filters.goalId;
    if (filters.dailyPlanId) where.dailyPlanId = filters.dailyPlanId;
    if (filters.weeklyPlanId) where.weeklyPlanId = filters.weeklyPlanId;
    if (filters.monthlyPlanId) where.monthlyPlanId = filters.monthlyPlanId;

    if (filters.aiGenerated === true || filters.aiGenerated === "true") {
      where.aiGenerated = true;
    } else if (
      filters.aiGenerated === false ||
      filters.aiGenerated === "false"
    ) {
      where.aiGenerated = false;
    }

    if (filters.parentOnly === true || filters.parentOnly === "true") {
      where.parentTaskId = null;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.startDate || filters.endDate) {
      where.dueDate = {};
      if (filters.startDate) where.dueDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.dueDate.lte = new Date(filters.endDate);
    }

    if (filters.dueFilter) {
      const { start, end } = this.getDayBounds();
      switch (filters.dueFilter) {
        case "today":
          where.dueDate = { gte: start, lte: end };
          break;
        case "tomorrow": {
          const tomorrowStart = new Date(start);
          tomorrowStart.setDate(tomorrowStart.getDate() + 1);
          const tomorrowEnd = new Date(tomorrowStart);
          tomorrowEnd.setHours(23, 59, 59, 999);
          where.dueDate = { gte: tomorrowStart, lte: tomorrowEnd };
          break;
        }
        case "this_week": {
          const weekEnd = new Date(start);
          weekEnd.setDate(weekEnd.getDate() + 7);
          where.dueDate = { gte: start, lte: weekEnd };
          break;
        }
        case "this_month": {
          const monthEnd = new Date(start);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          where.dueDate = { gte: start, lte: monthEnd };
          break;
        }
        case "overdue":
          where.dueDate = { lt: start };
          where.status = { notIn: ["COMPLETED", "CANCELED"] };
          break;
        default:
          break;
      }
    }

    if (filters.today) {
      const { start, end } = this.getDayBounds();
      where.OR = [
        { scheduledDate: { gte: start, lte: end } },
        { dueDate: { gte: start, lte: end } },
      ];
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: this.buildTaskListInclude(),
        orderBy: filters.orderBy || [
          { priority: "desc" },
          { dueDate: "asc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return {
      tasks: tasks.map((task) => this.formatTaskResponse(task)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTaskById(taskId, userId) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
      include: this.buildTaskDetailInclude(),
    });

    if (!task) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    return this.formatTaskResponse(task);
  }

  async createTask(userId, taskData) {
    const data = this.sanitizeTaskInput(taskData);

    if (!data.title?.trim()) {
      const error = new Error("Title is required");
      error.statusCode = 400;
      throw error;
    }

    this.assertDueDateNotBeforeToday(data.dueDate);

    await this.validateGoalId(data.goalId, userId);
    await this.validateParentTaskId(data.parentTaskId, userId);

    const duePriority = this.resolvePriorityFromDueDate(data.dueDate);

    const task = await prisma.task.create({
      data: {
        userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        status: data.status || "TODO",
        priority: duePriority?.priority || data.priority || "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        dueTime: data.dueTime || null,
        estimatedMinutes: data.estimatedMinutes ?? null,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        category: data.category || null,
        tags: data.tags || [],
        goalId: data.goalId || null,
        parentTaskId: data.parentTaskId || null,
        notes: data.notes || null,
        energyLevelRequired: data.energyLevelRequired || null,
        contextNeeded: data.contextNeeded || null,
        isRecurring: data.isRecurring || false,
        recurrencePattern: data.recurrencePattern || null,
        recurrenceDays: data.recurrenceDays || [],
        difficultyLevel: data.difficultyLevel ?? 5,
        aiRecommendation: data.aiRecommendation || null,
        aiGenerated: data.aiGenerated || false,
        source: data.source || (data.aiGenerated ? "AI_GENERATED" : "MANUAL"),
      },
      include: this.buildTaskDetailInclude(),
    });

    await this.refreshLinkedGoalProgress(task.goalId);

    await this.logTaskActivity(userId, "TASK_CREATED", {
      taskId: task.id,
      title: task.title,
      source: task.source,
      goalId: task.goalId,
    });

    return this.formatTaskResponse(task);
  }

  async createBulkTasks(tasksData) {
    const createdTasks = [];

    for (const item of tasksData) {
      const task = await this.createTask(item.userId, item);
      createdTasks.push(task);
    }

    return { count: createdTasks.length, tasks: createdTasks };
  }

  async updateTask(taskId, updateData, userId) {
    const existing = await this.assertTaskOwnership(taskId, userId);
    const data = this.sanitizeTaskInput(updateData);

    if (data.goalId !== undefined) {
      if (data.goalId === null) {
        data.goalId = null;
      } else {
        await this.validateGoalId(data.goalId, userId);
      }
    }

    if (data.parentTaskId !== undefined) {
      if (data.parentTaskId === null) {
        data.parentTaskId = null;
      } else {
        await this.validateParentTaskId(data.parentTaskId, userId);
      }
    }

    if (data.dueDate !== undefined) {
      this.assertDueDateNotBeforeToday(data.dueDate);
      if (data.dueDate) {
        data.dueDate = new Date(data.dueDate);
        const duePriority = this.resolvePriorityFromDueDate(data.dueDate);
        if (duePriority?.priority && data.priority === undefined) {
          data.priority = duePriority.priority;
        }
      } else {
        data.dueDate = null;
      }
    }
    if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
    if (data.title) data.title = data.title.trim();

    if (data.status === "COMPLETED" && !data.completedAt) {
      data.completedAt = new Date();
      data.completionCount = { increment: 1 };
    }

    if (data.status === "IN_PROGRESS" && !existing.startedAt) {
      data.startedAt = new Date();
    }

    if (data.status === "CANCELED" && !existing.canceledAt) {
      data.canceledAt = new Date();
    }

    if (data.status === "SKIPPED") {
      data.skipCount = { increment: 1 };
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: this.buildTaskDetailInclude(),
    });

    if (data.status === "COMPLETED") {
      await this.updateTaskStreak(taskId, userId);
    }

    const goalIds = new Set([existing.goalId, task.goalId].filter(Boolean));
    for (const goalId of goalIds) {
      await this.refreshLinkedGoalProgress(goalId);
    }

    await this.logTaskActivity(userId, "TASK_UPDATED", {
      taskId: task.id,
      title: task.title,
      changes: Object.keys(data),
    });

    return this.formatTaskResponse(task);
  }

  async updateTaskStatus(taskId, userId, status) {
    return this.updateTask(taskId, { status }, userId);
  }

  async deleteTask(taskId, userId) {
    const task = await this.assertTaskOwnership(taskId, userId);

    await prisma.task.delete({
      where: { id: taskId },
    });

    await this.refreshLinkedGoalProgress(task.goalId);
  }

  async bulkUpdateTasks(taskIds, updateData, userId) {
    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds }, userId },
      select: { id: true, goalId: true },
    });

    if (tasks.length !== taskIds.length) {
      const error = new Error("One or more tasks were not found");
      error.statusCode = 404;
      throw error;
    }

    const result = await prisma.task.updateMany({
      where: { id: { in: taskIds }, userId },
      data: this.sanitizeTaskInput(updateData),
    });

    const goalIds = new Set(tasks.map((t) => t.goalId).filter(Boolean));
    for (const goalId of goalIds) {
      await this.refreshLinkedGoalProgress(goalId);
    }

    return result;
  }

  async bulkDeleteTasks(taskIds, userId) {
    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds }, userId },
      select: { id: true, goalId: true },
    });

    await prisma.task.deleteMany({
      where: { id: { in: taskIds }, userId },
    });

    const goalIds = new Set(tasks.map((t) => t.goalId).filter(Boolean));
    for (const goalId of goalIds) {
      await this.refreshLinkedGoalProgress(goalId);
    }
  }

  async completeTask(taskId, userId, actualMinutes = null) {
    const task = await this.updateTask(
      taskId,
      {
        status: "COMPLETED",
        completedAt: new Date(),
        actualMinutes: actualMinutes ?? undefined,
      },
      userId,
    );

    if (task.dailyPlanId) {
      await this.updatePlanCompletion(task.dailyPlanId, "DailyPlan");
    }

    return task;
  }

  async skipTask(taskId, userId, reason = null) {
    const task = await this.assertTaskOwnership(taskId, userId);
    const skipReasons = [...(task.skipReasons || [])];
    if (reason) skipReasons.push(reason);

    return this.updateTask(
      taskId,
      {
        status: "SKIPPED",
        skipReasons,
      },
      userId,
    );
  }

  async getBoardSummary(userId) {
    const now = new Date();
    const { start, end } = this.getDayBounds(now);

    const [todo, inProgress, completed, overdue, total] = await Promise.all([
      prisma.task.count({
        where: { userId, status: "TODO", parentTaskId: null },
      }),
      prisma.task.count({
        where: { userId, status: "IN_PROGRESS", parentTaskId: null },
      }),
      prisma.task.count({
        where: { userId, status: "COMPLETED", parentTaskId: null },
      }),
      prisma.task.count({
        where: {
          userId,
          parentTaskId: null,
          status: { notIn: ["COMPLETED", "CANCELED"] },
          dueDate: { lt: start },
        },
      }),
      prisma.task.count({ where: { userId, parentTaskId: null } }),
    ]);

    const dueToday = await prisma.task.count({
      where: {
        userId,
        parentTaskId: null,
        status: { notIn: ["COMPLETED", "CANCELED"] },
        dueDate: { gte: start, lte: end },
      },
    });

    return { todo, inProgress, completed, overdue, dueToday, total };
  }

  async getSubtasks(taskId, userId) {
    await this.assertTaskOwnership(taskId, userId);

    return prisma.task.findMany({
      where: { parentTaskId: taskId, userId },
      orderBy: { createdAt: "asc" },
    });
  }

  buildTaskAiSnapshot(task) {
    return {
      task: {
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        dueTime: task.dueTime || null,
        estimatedMinutes: task.estimatedMinutes ?? null,
      },
      subtasks: (task.subtasks || []).map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        priority: s.priority,
        estimatedMinutes: s.estimatedMinutes,
        category: s.category,
        goalId: s.goalId,
        aiGenerated: s.aiGenerated,
        source: s.source,
      })),
    };
  }

  /**
   * Task AI Assistant — preview only (BREAKDOWN | IMPROVE_DESCRIPTION | CHAT).
   * Accept / dismiss / undo apply changes later.
   */
  async createAiSuggestion(
    taskId,
    userId,
    { action, message, regenerate = false } = {},
  ) {
    const TASK_AI_ACTIONS = ["CHAT", "IMPROVE_DESCRIPTION", "BREAKDOWN"];

    if (!TASK_AI_ACTIONS.includes(action)) {
      const error = new Error(
        `Invalid action. Valid actions: ${TASK_AI_ACTIONS.join(", ")}`,
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

    const task = await this.getTaskById(taskId, userId);

    if (action === "BREAKDOWN" && task.subtasks?.length > 0 && !regenerate) {
      const error = new Error(
        "Task already has subtasks. Set regenerate=true to replace them on accept.",
      );
      error.statusCode = 400;
      throw error;
    }

    const previousSnapshot = this.buildTaskAiSnapshot(task);
    const result = await openaiService.suggestTaskAssistant(action, message, {
      rawTask: task,
      task,
      subtasks: task.subtasks || [],
    });

    const recommendation = await prisma.aiRecommendation.create({
      data: {
        userId,
        type: "TASK",
        title: result.title || "Task suggestion",
        description: result.message,
        reasoning: JSON.stringify({
          suggestionId: null,
          taskId,
          action,
          message: message || null,
          regenerate: !!regenerate,
          proposedTask: result.proposedTask || null,
          proposedSubtasks: result.proposedSubtasks || [],
          previousSnapshot,
          createdSubtaskIds: [],
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
      taskId,
      action,
      message: result.message,
      title: result.title,
      proposedTask: result.proposedTask || null,
      proposedSubtasks: result.proposedSubtasks || [],
      regenerate: !!regenerate,
      task,
      tokensUsed: result.tokensUsed,
    };
  }

  parseTaskAiReasoning(recommendation) {
    try {
      return JSON.parse(recommendation.reasoning || "{}");
    } catch {
      return null;
    }
  }

  formatTaskAiSuggestion(
    recommendation,
    { includeTask = false, task = null } = {},
  ) {
    const payload = this.parseTaskAiReasoning(recommendation);
    if (!payload) {
      const error = new Error("Invalid suggestion data");
      error.statusCode = 400;
      throw error;
    }

    const status = recommendation.isApplied
      ? "applied"
      : recommendation.isDismissed
        ? "dismissed"
        : "pending";

    const formatted = {
      suggestionId: recommendation.id,
      taskId: payload.taskId || null,
      action: payload.action || null,
      title: recommendation.title,
      message: recommendation.description,
      userMessage: payload.message || null,
      proposedTask: payload.proposedTask || null,
      proposedSubtasks: payload.proposedSubtasks || [],
      regenerate: !!payload.regenerate,
      status,
      isApplied: recommendation.isApplied,
      isDismissed: recommendation.isDismissed,
      createdAt: recommendation.createdAt,
      appliedAt: recommendation.appliedAt || null,
      dismissedAt: recommendation.dismissedAt || null,
    };

    if (includeTask && task) {
      formatted.task = task;
    }

    return formatted;
  }

  async getAiSuggestions(taskId, userId, { status = "all" } = {}) {
    await this.assertTaskOwnership(taskId, userId);

    const where = {
      userId,
      type: "TASK",
    };

    if (status === "pending") {
      where.isApplied = false;
      where.isDismissed = false;
    } else if (status === "applied") {
      where.isApplied = true;
    } else if (status === "dismissed") {
      where.isDismissed = true;
    } else if (status !== "all") {
      const error = new Error(
        "Invalid status. Valid values: pending, applied, dismissed, all",
      );
      error.statusCode = 400;
      throw error;
    }

    const rows = await prisma.aiRecommendation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const suggestions = rows
      .map((row) => {
        try {
          return this.formatTaskAiSuggestion(row);
        } catch {
          return null;
        }
      })
      .filter((item) => item && item.taskId === taskId);

    return {
      taskId,
      status,
      count: suggestions.length,
      latest: suggestions[0] || null,
      suggestions,
    };
  }

  async getAiSuggestion(suggestionId, userId) {
    const recommendation = await prisma.aiRecommendation.findFirst({
      where: {
        id: suggestionId,
        userId,
        type: "TASK",
      },
    });

    if (!recommendation) {
      const error = new Error("Task suggestion not found");
      error.statusCode = 404;
      throw error;
    }

    const formatted = this.formatTaskAiSuggestion(recommendation);
    if (!formatted.taskId) {
      const error = new Error("Invalid suggestion data");
      error.statusCode = 400;
      throw error;
    }

    const task = await this.getTaskById(formatted.taskId, userId);
    return this.formatTaskAiSuggestion(recommendation, {
      includeTask: true,
      task,
    });
  }

  async acceptAiSuggestion(suggestionId, userId) {
    const recommendation = await prisma.aiRecommendation.findFirst({
      where: {
        id: suggestionId,
        userId,
        type: "TASK",
        isApplied: false,
        isDismissed: false,
      },
    });

    if (!recommendation) {
      const error = new Error("Task suggestion not found or already handled");
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
      taskId,
      proposedTask,
      proposedSubtasks = [],
      regenerate,
      previousSnapshot,
    } = payload;

    await this.assertTaskOwnership(taskId, userId);

    if (proposedTask) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          title: proposedTask.title,
          description: proposedTask.description,
          category: proposedTask.category || null,
          priority: proposedTask.priority || "MEDIUM",
          dueDate: proposedTask.dueDate ? new Date(proposedTask.dueDate) : null,
          dueTime: proposedTask.dueTime || null,
          estimatedMinutes: proposedTask.estimatedMinutes ?? null,
        },
      });
    }

    const createdSubtaskIds = [];
    if (proposedSubtasks.length > 0) {
      if (regenerate) {
        await prisma.task.deleteMany({
          where: { parentTaskId: taskId, userId },
        });
      }

      const parent = await this.getTaskById(taskId, userId);
      for (const subtask of proposedSubtasks) {
        const created = await this.createTask(userId, {
          title: subtask.title,
          description: subtask.description,
          estimatedMinutes: subtask.estimatedMinutes,
          priority: subtask.priority || parent.priority,
          category: parent.category,
          parentTaskId: taskId,
          goalId: parent.goalId,
          aiGenerated: true,
          source: "AI_GENERATED",
        });
        createdSubtaskIds.push(created.id);
      }
    }

    await prisma.aiRecommendation.update({
      where: { id: suggestionId },
      data: {
        isApplied: true,
        appliedAt: new Date(),
        reasoning: JSON.stringify({
          ...payload,
          previousSnapshot,
          createdSubtaskIds,
        }),
      },
    });

    const task = await this.getTaskById(taskId, userId);

    return {
      message: "Suggestion applied successfully",
      suggestionId,
      taskId,
      createdSubtaskIds,
      task,
    };
  }

  async dismissAiSuggestion(suggestionId, userId) {
    const recommendation = await prisma.aiRecommendation.findFirst({
      where: {
        id: suggestionId,
        userId,
        type: "TASK",
        isApplied: false,
        isDismissed: false,
      },
    });

    if (!recommendation) {
      const error = new Error("Task suggestion not found or already handled");
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

  async undoLastAiChange(taskId, userId) {
    await this.assertTaskOwnership(taskId, userId);

    const recommendations = await prisma.aiRecommendation.findMany({
      where: {
        userId,
        type: "TASK",
        isApplied: true,
      },
      orderBy: { appliedAt: "desc" },
      take: 20,
    });

    const recommendation = recommendations.find((row) => {
      try {
        const payload = JSON.parse(row.reasoning || "{}");
        return payload.taskId === taskId;
      } catch {
        return false;
      }
    });

    if (!recommendation) {
      const error = new Error("No applied Task AI change found to undo");
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

    const { previousSnapshot, createdSubtaskIds = [], regenerate } = payload;

    if (createdSubtaskIds.length > 0) {
      await prisma.task.deleteMany({
        where: {
          id: { in: createdSubtaskIds },
          userId,
          parentTaskId: taskId,
        },
      });
    }

    // Restore subtasks that were removed when regenerate=true
    if (regenerate && previousSnapshot?.subtasks?.length > 0) {
      for (const snap of previousSnapshot.subtasks) {
        await prisma.task.create({
          data: {
            id: snap.id,
            userId,
            title: snap.title,
            description: snap.description,
            status: snap.status || "TODO",
            priority: snap.priority || "MEDIUM",
            estimatedMinutes: snap.estimatedMinutes ?? null,
            category: snap.category || null,
            parentTaskId: taskId,
            goalId: snap.goalId || null,
            aiGenerated: !!snap.aiGenerated,
            source: snap.source || "MANUAL",
          },
        });
      }
    }

    if (previousSnapshot?.task) {
      const snap = previousSnapshot.task;
      await prisma.task.update({
        where: { id: taskId },
        data: {
          title: snap.title,
          description: snap.description,
          category: snap.category || null,
          priority: snap.priority || "MEDIUM",
          dueDate: snap.dueDate ? new Date(snap.dueDate) : null,
          dueTime: snap.dueTime || null,
          estimatedMinutes: snap.estimatedMinutes ?? null,
        },
      });
    }

    await prisma.aiRecommendation.update({
      where: { id: recommendation.id },
      data: {
        isApplied: false,
        appliedAt: null,
      },
    });

    const task = await this.getTaskById(taskId, userId);

    return {
      message: "Last Task AI change undone",
      suggestionId: recommendation.id,
      taskId,
      task,
    };
  }

  async generateTaskWithAI(userId, { prompt, goalId, category } = {}) {
    if (!openaiService.isConfigured()) {
      const error = new Error(
        "OpenAI service not configured. Please set OPENAI_API_KEY in .env file",
      );
      error.statusCode = 503;
      throw error;
    }

    if (!prompt?.trim()) {
      const error = new Error("prompt is required for AI task generation");
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

    const result = await openaiService.generateSingleTask(prompt, {
      category: category || linkedGoal?.category,
      goals: activeGoals,
      goalId: linkedGoal?.id,
    });

    const suggestedGoalId = goalId || result.goal.suggestedGoalId || null;
    if (suggestedGoalId && !goalId) {
      await this.validateGoalId(suggestedGoalId, userId);
    }

    const task = await this.createTask(userId, {
      ...result.task,
      goalId: suggestedGoalId,
      aiGenerated: true,
      source: "AI_GENERATED",
    });

    return { task, tokensUsed: result.tokensUsed };
  }

  async updateTaskStreak(taskId, userId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId },
    });

    if (!task || !task.isRecurring) return;

    // Check if completed yesterday or today
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const lastCompletion = task.completedAt;

    if (lastCompletion && lastCompletion >= yesterday) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          currentStreak: { increment: 1 },
        },
      });
    } else {
      // Reset streak
      await prisma.task.update({
        where: { id: taskId },
        data: {
          currentStreak: 1,
        },
      });
    }
  }

  async getOverdueTasks(userId) {
    const now = new Date();
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: { notIn: ["COMPLETED", "CANCELED"] },
        dueDate: {
          lt: now,
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return tasks.map((task) => this.formatTaskResponse(task));
  }

  // Get today's tasks
  async getTodaysTasks(userId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        OR: [
          {
            scheduledDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          {
            dueDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        ],
      },
      include: {
        subtasks: true,
      },
      orderBy: [{ priority: "desc" }, { dueTime: "asc" }],
    });

    return tasks.map((task) => this.formatTaskResponse(task));
  }

  // Get task statistics
  async getTaskStats(userId, dateRange = null) {
    const where = { userId };

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const [total, completed, pending, overdue, inProgress] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.task.count({ where: { ...where, status: "TODO" } }),
      prisma.task.count({
        where: {
          ...where,
          status: { notIn: ["COMPLETED", "CANCELED"] },
          dueDate: { lt: new Date() },
        },
      }),
      prisma.task.count({ where: { ...where, status: "IN_PROGRESS" } }),
    ]);

    // Calculate completion rate
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Get AI-generated vs manual stats
    const aiGenerated = await prisma.task.count({
      where: { ...where, aiGenerated: true },
    });

    const manual = total - aiGenerated;

    return {
      total,
      completed,
      pending,
      overdue,
      inProgress,
      completionRate: Math.round(completionRate * 10) / 10,
      aiGenerated,
      manual,
    };
  }

  async getProductivityAnalytics(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        completedAt: {
          gte: startDate,
        },
      },
      orderBy: { completedAt: "asc" },
    });

    // Group by day
    const dailyCompletion = {};
    tasks.forEach((task) => {
      const date = task.completedAt.toISOString().split("T")[0];
      dailyCompletion[date] = (dailyCompletion[date] || 0) + 1;
    });

    // Calculate average completion time
    const tasksWithTime = tasks.filter((t) => t.actualMinutes);
    const avgCompletionTime =
      tasksWithTime.length > 0
        ? tasksWithTime.reduce((sum, t) => sum + t.actualMinutes, 0) /
          tasksWithTime.length
        : 0;

    // Find most productive time
    const hourlyCompletion = {};
    tasks.forEach((task) => {
      const hour = task.completedAt.getHours();
      hourlyCompletion[hour] = (hourlyCompletion[hour] || 0) + 1;
    });

    const mostProductiveHour = Object.entries(hourlyCompletion).sort(
      (a, b) => b[1] - a[1],
    )[0];

    return {
      totalCompleted: tasks.length,
      dailyCompletion,
      avgCompletionTime: Math.round(avgCompletionTime),
      mostProductiveHour: mostProductiveHour
        ? `${mostProductiveHour[0]}:00`
        : null,
      currentStreak: await this.calculateCurrentStreak(userId),
    };
  }

  // Calculate current completion streak
  async calculateCurrentStreak(userId) {
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    while (true) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const completedToday = await prisma.task.count({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      if (completedToday === 0) break;

      streak++;
      currentDate.setDate(currentDate.getDate() - 1);

      // Limit to prevent infinite loop
      if (streak > 365) break;
    }

    return streak;
  }

  // Magic Sync - intelligently reorganize and rebalance tasks
  async magicSync(userId, userInput = null) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
      },
    });

    // Get all pending tasks
    const pendingTasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });

    if (pendingTasks.length === 0) {
      return {
        success: true,
        message: "No pending tasks to sync",
        tasksUpdated: 0,
      };
    }

    // Get today's date and time
    const now = new Date();
    const settings = user.settings;

    // Categorize tasks by urgency and energy level
    const urgent = pendingTasks.filter(
      (t) => t.priority === "URGENT" || (t.dueDate && t.dueDate < now),
    );
    const highPriority = pendingTasks.filter(
      (t) => t.priority === "HIGH" && !urgent.includes(t),
    );
    const mediumPriority = pendingTasks.filter((t) => t.priority === "MEDIUM");
    const lowPriority = pendingTasks.filter((t) => t.priority === "LOW");

    // Re-schedule tasks based on priority and time available
    const updates = [];
    let currentTime = new Date();

    // Schedule urgent tasks first
    for (const task of urgent) {
      updates.push({
        id: task.id,
        scheduledDate: currentTime,
        aiAdjusted: true,
        adjustmentReason: "Rescheduled by Magic Sync - Urgent priority",
      });
    }

    // Then high priority
    for (const task of highPriority) {
      currentTime = new Date(
        currentTime.getTime() + (task.estimatedMinutes || 30) * 60000,
      );
      updates.push({
        id: task.id,
        scheduledDate: currentTime,
        aiAdjusted: true,
        adjustmentReason: "Rescheduled by Magic Sync - High priority",
      });
    }

    // Update all tasks
    for (const update of updates) {
      await prisma.task.update({
        where: { id: update.id },
        data: {
          scheduledDate: update.scheduledDate,
          aiAdjusted: update.aiAdjusted,
          adjustmentReason: update.adjustmentReason,
        },
      });
    }

    return {
      success: true,
      message: "Tasks successfully synced and rebalanced",
      tasksUpdated: updates.length,
      prioritization: {
        urgent: urgent.length,
        high: highPriority.length,
        medium: mediumPriority.length,
        low: lowPriority.length,
      },
    };
  }

  // Detect patterns in task completion
  async detectPatterns(userId) {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        completedAt: { not: null },
      },
      orderBy: { completedAt: "desc" },
      take: 100,
    });

    if (tasks.length < 10) {
      return {
        message: "Not enough data to detect patterns yet",
        patterns: [],
      };
    }

    const patterns = [];

    // Pattern 1: Most skipped task categories
    const skippedTasks = await prisma.task.findMany({
      where: {
        userId,
        status: "SKIPPED",
      },
    });

    const skipsByCategory = {};
    skippedTasks.forEach((task) => {
      if (task.category) {
        skipsByCategory[task.category] =
          (skipsByCategory[task.category] || 0) + 1;
      }
    });

    const mostSkippedCategory = Object.entries(skipsByCategory).sort(
      (a, b) => b[1] - a[1],
    )[0];

    if (mostSkippedCategory) {
      patterns.push({
        type: "SKIP_PATTERN",
        description: `You frequently skip ${mostSkippedCategory[0]} tasks`,
        suggestion: `Consider breaking down ${mostSkippedCategory[0]} tasks into smaller steps`,
      });
    }

    // Pattern 2: Best productivity hours
    const hourlyData = {};
    tasks.forEach((task) => {
      const hour = task.completedAt.getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });

    const bestHour = Object.entries(hourlyData).sort((a, b) => b[1] - a[1])[0];

    if (bestHour) {
      patterns.push({
        type: "PRODUCTIVITY_PEAK",
        description: `Your peak productivity is around ${bestHour[0]}:00`,
        suggestion: `Schedule high-priority tasks during this time`,
      });
    }

    // Pattern 3: Task estimation accuracy
    const tasksWithEstimates = tasks.filter(
      (t) => t.estimatedMinutes && t.actualMinutes,
    );
    if (tasksWithEstimates.length > 5) {
      const avgEstimate =
        tasksWithEstimates.reduce((sum, t) => sum + t.estimatedMinutes, 0) /
        tasksWithEstimates.length;
      const avgActual =
        tasksWithEstimates.reduce((sum, t) => sum + t.actualMinutes, 0) /
        tasksWithEstimates.length;
      const accuracy = (avgEstimate / avgActual) * 100;

      if (accuracy < 80) {
        patterns.push({
          type: "ESTIMATION_ERROR",
          description: `You tend to underestimate task duration by ${Math.round(100 - accuracy)}%`,
          suggestion: "Add buffer time to your estimates",
        });
      } else if (accuracy > 120) {
        patterns.push({
          type: "ESTIMATION_ERROR",
          description: `You tend to overestimate task duration`,
          suggestion: "You can schedule more tasks than you think",
        });
      }
    }

    return {
      success: true,
      patterns,
      totalAnalyzed: tasks.length,
    };
  }

  // Update plan completion rate when task status changes
  async updatePlanCompletion(planId, planType) {
    const modelMap = {
      DailyPlan: prisma.dailyPlan,
      WeeklyPlan: prisma.weeklyPlan,
      MonthlyPlan: prisma.monthlyPlan,
    };

    const model = modelMap[planType];
    if (!model) return;

    const fieldMap = {
      DailyPlan: "dailyPlanId",
      WeeklyPlan: "weeklyPlanId",
      MonthlyPlan: "monthlyPlanId",
    };

    const field = fieldMap[planType];

    const tasks = await prisma.task.findMany({
      where: { [field]: planId },
    });

    if (tasks.length === 0) return;

    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const completionRate = (completed / tasks.length) * 100;

    await model.update({
      where: { id: planId },
      data: {
        completionRate: Math.round(completionRate * 10) / 10,
        tasksCompleted: completed,
        tasksTotal: tasks.length,
      },
    });
  }

  // Log task activity
  async logTaskActivity(userId, activityType, metadata) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          type: activityType,
          description: `Task activity: ${activityType}`,
          metadata,
        },
      });
    } catch (error) {
      console.error("Failed to log task activity:", error);
    }
  }
}

module.exports = new TaskService();
