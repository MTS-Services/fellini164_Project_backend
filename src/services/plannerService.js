const prisma = require("../config/database");
const openaiService = require("./openaiService");
const taskService = require("./taskService");

const PLANNER_ACTIONS = [
  "GENERATE_PLAN",
  "RECALIBRATE_DAY",
  "REDUCE_OVERLOAD",
  "OPTIMIZE_SCHEDULE",
  "BALANCE_SCHEDULE",
  "FREE_EVENING",
  "CHAT",
];

class PlannerService {
  getDayBounds(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  getWeekBounds(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  getMonthBounds(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  getRangeForView(viewType, date = new Date()) {
    switch (viewType) {
      case "WEEKLY":
        return this.getWeekBounds(date);
      case "MONTHLY":
        return this.getMonthBounds(date);
      case "DAILY":
      default:
        return this.getDayBounds(date);
    }
  }

  resolvePlanDateRange(dateRange, { startDate, endDate } = {}) {
    const now = new Date();

    switch (dateRange) {
      case "TODAY": {
        const bounds = this.getDayBounds(now);
        return { ...bounds, viewType: "DAILY", anchor: now, dateRange };
      }
      case "THIS_WEEK": {
        const bounds = this.getWeekBounds(now);
        return { ...bounds, viewType: "WEEKLY", anchor: now, dateRange };
      }
      case "THIS_MONTH": {
        const bounds = this.getMonthBounds(now);
        return { ...bounds, viewType: "MONTHLY", anchor: now, dateRange };
      }
      case "CUSTOM": {
        if (!startDate || !endDate) {
          const error = new Error(
            "startDate and endDate are required for CUSTOM date range",
          );
          error.statusCode = 400;
          throw error;
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(end.getTime()) ||
          start > end
        ) {
          const error = new Error("Invalid custom date range");
          error.statusCode = 400;
          throw error;
        }

        const daySpan = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        let viewType = "MONTHLY";
        if (daySpan <= 1) viewType = "DAILY";
        else if (daySpan <= 7) viewType = "WEEKLY";

        return { start, end, viewType, anchor: start, dateRange };
      }
      default: {
        const error = new Error(
          "Invalid dateRange. Valid values: TODAY, THIS_WEEK, THIS_MONTH, CUSTOM",
        );
        error.statusCode = 400;
        throw error;
      }
    }
  }

  buildItemInclude() {
    return {
      task: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          category: true,
          aiGenerated: true,
          estimatedMinutes: true,
          dueDate: true,
          dueTime: true,
          goalId: true,
        },
      },
      habit: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          category: true,
          aiSuggested: true,
          frequency: true,
          difficulty: true,
          reminderTime: true,
          goalId: true,
        },
      },
    };
  }

  formatBoardItem(item) {
    const linked = item.itemType === "TASK" ? item.task : item.habit;
    return {
      id: item.id,
      itemType: item.itemType,
      taskId: item.taskId,
      habitId: item.habitId,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      orderIndex: item.orderIndex,
      viewType: item.viewType,
      isCompleted: item.isCompleted,
      aiScheduled: item.aiScheduled,
      title: item.itemType === "TASK" ? item.task?.title : item.habit?.name,
      description: linked?.description || null,
      status: linked?.status || null,
      priority: item.task?.priority || null,
      category: linked?.category || null,
      isAi:
        item.aiScheduled ||
        item.task?.aiGenerated ||
        item.habit?.aiSuggested ||
        false,
      estimatedMinutes: item.task?.estimatedMinutes || null,
      task: item.task,
      habit: item.habit,
    };
  }

  async assertItemOwnership(itemId, userId) {
    const item = await prisma.plannerItem.findFirst({
      where: { id: itemId, userId },
    });

    if (!item) {
      const error = new Error("Planner item not found");
      error.statusCode = 404;
      throw error;
    }

    return item;
  }

  async validateLinkedItem(userId, itemType, taskId, habitId) {
    if (itemType === "TASK") {
      if (!taskId) {
        const error = new Error("taskId is required for TASK planner items");
        error.statusCode = 400;
        throw error;
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, userId },
        select: { id: true },
      });

      if (!task) {
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
      }

      return { taskId, habitId: null };
    }

    if (itemType === "HABIT") {
      if (!habitId) {
        const error = new Error("habitId is required for HABIT planner items");
        error.statusCode = 400;
        throw error;
      }

      const habit = await prisma.habit.findFirst({
        where: { id: habitId, userId },
        select: { id: true },
      });

      if (!habit) {
        const error = new Error("Habit not found");
        error.statusCode = 404;
        throw error;
      }

      return { taskId: null, habitId };
    }

    const error = new Error("Invalid itemType");
    error.statusCode = 400;
    throw error;
  }

  sanitizePlannerInput(data) {
    const allowed = [
      "itemType",
      "taskId",
      "habitId",
      "date",
      "startTime",
      "endTime",
      "orderIndex",
      "viewType",
      "isCompleted",
      "aiScheduled",
    ];
    const sanitized = {};
    for (const key of allowed) {
      if (data[key] !== undefined) sanitized[key] = data[key];
    }
    return sanitized;
  }

  async getBoard(userId, { viewType = "DAILY", date } = {}) {
    const anchor = date ? new Date(date) : new Date();
    const { start, end } = this.getRangeForView(viewType, anchor);

    const items = await prisma.plannerItem.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      include: this.buildItemInclude(),
      orderBy: [{ date: "asc" }, { orderIndex: "asc" }, { startTime: "asc" }],
    });

    const formatted = items.map((item) => this.formatBoardItem(item));

    if (viewType === "DAILY") {
      return {
        viewType,
        date: start.toISOString(),
        items: formatted,
      };
    }

    const grouped = {};
    for (const item of formatted) {
      const dayKey = new Date(item.date).toISOString().split("T")[0];
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(item);
    }

    return {
      viewType,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days: grouped,
      items: formatted,
    };
  }

  async getSummary(userId, { date } = {}) {
    const anchor = date ? new Date(date) : new Date();
    const { start, end } = this.getDayBounds(anchor);

    const [
      totalToday,
      completedToday,
      aiScheduledToday,
      upcomingTasks,
      activeHabits,
    ] = await Promise.all([
      prisma.plannerItem.count({
        where: { userId, date: { gte: start, lte: end } },
      }),
      prisma.plannerItem.count({
        where: { userId, date: { gte: start, lte: end }, isCompleted: true },
      }),
      prisma.plannerItem.count({
        where: { userId, date: { gte: start, lte: end }, aiScheduled: true },
      }),
      prisma.task.count({
        where: {
          userId,
          status: { notIn: ["COMPLETED", "CANCELED"] },
          parentTaskId: null,
        },
      }),
      prisma.habit.count({
        where: { userId, status: "ACTIVE", isActive: true },
      }),
    ]);

    return {
      scheduledToday: totalToday,
      completedToday,
      remainingToday: Math.max(totalToday - completedToday, 0),
      aiScheduledToday,
      unscheduledTasks: upcomingTasks,
      activeHabits,
    };
  }

  async getAvailableItems(userId, { date } = {}) {
    const anchor = date ? new Date(date) : new Date();
    const { start, end } = this.getDayBounds(anchor);

    const scheduled = await prisma.plannerItem.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { taskId: true, habitId: true },
    });

    const scheduledTaskIds = new Set(
      scheduled.map((s) => s.taskId).filter(Boolean),
    );
    const scheduledHabitIds = new Set(
      scheduled.map((s) => s.habitId).filter(Boolean),
    );

    const [tasks, habits] = await Promise.all([
      prisma.task.findMany({
        where: {
          userId,
          parentTaskId: null,
          status: { notIn: ["COMPLETED", "CANCELED"] },
          id: { notIn: [...scheduledTaskIds] },
        },
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          category: true,
          estimatedMinutes: true,
          dueDate: true,
          aiGenerated: true,
        },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        take: 50,
      }),
      prisma.habit.findMany({
        where: {
          userId,
          status: "ACTIVE",
          isActive: true,
          id: { notIn: [...scheduledHabitIds] },
        },
        select: {
          id: true,
          name: true,
          category: true,
          frequency: true,
          difficulty: true,
          reminderTime: true,
          aiSuggested: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return { tasks, habits };
  }

  async listItems(userId, filters = {}) {
    const where = { userId };

    if (filters.viewType) where.viewType = filters.viewType;
    if (filters.itemType) where.itemType = filters.itemType;
    if (filters.aiScheduled === true || filters.aiScheduled === "true") {
      where.aiScheduled = true;
    }

    if (filters.date) {
      const { start, end } = this.getDayBounds(new Date(filters.date));
      where.date = { gte: start, lte: end };
    } else if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    const items = await prisma.plannerItem.findMany({
      where,
      include: this.buildItemInclude(),
      orderBy: [{ date: "asc" }, { orderIndex: "asc" }, { startTime: "asc" }],
    });

    return items.map((item) => this.formatBoardItem(item));
  }

  async getItemById(itemId, userId) {
    const item = await prisma.plannerItem.findFirst({
      where: { id: itemId, userId },
      include: this.buildItemInclude(),
    });

    if (!item) {
      const error = new Error("Planner item not found");
      error.statusCode = 404;
      throw error;
    }

    return this.formatBoardItem(item);
  }

  async createItem(userId, data) {
    const sanitized = this.sanitizePlannerInput(data);

    if (!sanitized.itemType || !sanitized.date) {
      const error = new Error("itemType and date are required");
      error.statusCode = 400;
      throw error;
    }

    const links = await this.validateLinkedItem(
      userId,
      sanitized.itemType,
      sanitized.taskId,
      sanitized.habitId,
    );

    const item = await prisma.plannerItem.create({
      data: {
        userId,
        itemType: sanitized.itemType,
        taskId: links.taskId,
        habitId: links.habitId,
        date: new Date(sanitized.date),
        startTime: sanitized.startTime || null,
        endTime: sanitized.endTime || null,
        orderIndex: sanitized.orderIndex ?? 0,
        viewType: sanitized.viewType || "DAILY",
        isCompleted: sanitized.isCompleted || false,
        aiScheduled: sanitized.aiScheduled || false,
      },
      include: this.buildItemInclude(),
    });

    return this.formatBoardItem(item);
  }

  async bulkSchedule(
    userId,
    placements = [],
    { replaceRange, viewType = "DAILY", aiScheduled = false } = {},
  ) {
    if (!Array.isArray(placements) || placements.length === 0) {
      const error = new Error("placements must be a non-empty array");
      error.statusCode = 400;
      throw error;
    }

    const created = [];

    for (const placement of placements) {
      const item = await this.createItem(userId, {
        ...placement,
        viewType: placement.viewType || viewType,
        aiScheduled: placement.aiScheduled ?? aiScheduled,
      });
      created.push(item);
    }

    return { count: created.length, items: created };
  }

  async updateItem(itemId, userId, updateData) {
    await this.assertItemOwnership(itemId, userId);
    const data = this.sanitizePlannerInput(updateData);

    if (data.date) data.date = new Date(data.date);

    const item = await prisma.plannerItem.update({
      where: { id: itemId },
      data,
      include: this.buildItemInclude(),
    });

    return this.formatBoardItem(item);
  }

  async completeItem(itemId, userId) {
    return this.updateItem(itemId, userId, { isCompleted: true });
  }

  async deleteItem(itemId, userId) {
    await this.assertItemOwnership(itemId, userId);
    await prisma.plannerItem.delete({ where: { id: itemId } });
  }

  async getSchedulingContext(
    userId,
    { viewType = "DAILY", date, start, end } = {},
  ) {
    let rangeStart = start;
    let rangeEnd = end;

    if (!rangeStart || !rangeEnd) {
      const anchor = date ? new Date(date) : new Date();
      const bounds = this.getRangeForView(viewType, anchor);
      rangeStart = bounds.start;
      rangeEnd = bounds.end;
    }

    const [settings, currentItems, tasks, habits] = await Promise.all([
      prisma.userSettings.findUnique({ where: { userId } }),
      prisma.plannerItem.findMany({
        where: { userId, date: { gte: rangeStart, lte: rangeEnd } },
        include: this.buildItemInclude(),
        orderBy: [{ date: "asc" }, { orderIndex: "asc" }],
      }),
      prisma.task.findMany({
        where: {
          userId,
          parentTaskId: null,
          status: { notIn: ["COMPLETED", "CANCELED"] },
        },
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          estimatedMinutes: true,
          dueDate: true,
          category: true,
        },
        take: 30,
      }),
      prisma.habit.findMany({
        where: { userId, status: "ACTIVE", isActive: true },
        select: {
          id: true,
          name: true,
          frequency: true,
          difficulty: true,
          reminderTime: true,
          category: true,
        },
        take: 30,
      }),
    ]);

    return {
      viewType,
      dateRange: { start: rangeStart, end: rangeEnd },
      settings: settings || {},
      currentSchedule: currentItems.map((item) => this.formatBoardItem(item)),
      availableTasks: tasks,
      availableHabits: habits,
    };
  }

  async createPlan(userId, { prompt, dateRange, startDate, endDate }) {
    if (!prompt?.trim()) {
      const error = new Error(
        "prompt is required — describe what you want to plan",
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

    const resolved = this.resolvePlanDateRange(dateRange, {
      startDate,
      endDate,
    });
    const context = await this.getSchedulingContext(userId, {
      viewType: resolved.viewType,
      start: resolved.start,
      end: resolved.end,
    });

    const result = await openaiService.generateCreatePlan(prompt.trim(), {
      ...context,
      dateRangeLabel: dateRange,
    });

    const taskRefMap = new Map();
    const createdTasks = [];

    for (const taskDef of result.tasksToCreate || []) {
      const task = await taskService.createTask(userId, {
        title: taskDef.title,
        description: taskDef.description,
        category: taskDef.category,
        priority: taskDef.priority || "MEDIUM",
        estimatedMinutes: taskDef.estimatedMinutes,
        dueDate: taskDef.dueDate,
        aiGenerated: true,
        source: "AI_GENERATED",
      });
      taskRefMap.set(taskDef.ref, task.id);
      createdTasks.push(task);
    }

    const placements = [];

    for (const placement of result.placements || []) {
      let taskId = placement.taskId || null;
      let habitId = placement.habitId || null;

      if (placement.itemType === "TASK" && placement.taskRef) {
        taskId = taskRefMap.get(placement.taskRef) || null;
      }

      if (placement.itemType === "TASK" && !taskId) continue;
      if (placement.itemType === "HABIT" && !habitId) continue;

      placements.push({
        itemType: placement.itemType,
        taskId,
        habitId,
        date: placement.date,
        startTime: placement.startTime || null,
        endTime: placement.endTime || null,
        orderIndex: placement.orderIndex ?? 0,
        viewType: placement.viewType || resolved.viewType,
        aiScheduled: true,
      });
    }

    if (placements.length === 0) {
      const error = new Error(
        "Could not build a plan. Add tasks or habits first, or try a more specific prompt.",
      );
      error.statusCode = 422;
      throw error;
    }

    const previousSnapshot = context.currentSchedule;

    await prisma.plannerItem.deleteMany({
      where: {
        userId,
        date: { gte: resolved.start, lte: resolved.end },
      },
    });

    const scheduled = await this.bulkSchedule(userId, placements, {
      viewType: resolved.viewType,
      aiScheduled: true,
    });

    await prisma.aiRecommendation.create({
      data: {
        userId,
        type: "PLAN_ADJUSTMENT",
        title: result.title || "New plan created",
        description: result.message || "Your plan has been created.",
        reasoning: JSON.stringify({
          action: "CREATE_PLAN",
          prompt: prompt.trim(),
          dateRange,
          viewType: resolved.viewType,
          startDate: resolved.start.toISOString(),
          endDate: resolved.end.toISOString(),
          previousSnapshot,
          appliedItems: scheduled.items,
          createdTaskIds: createdTasks.map((t) => t.id),
        }),
        priority: 9,
        isApplied: true,
        appliedAt: new Date(),
      },
    });

    return {
      message: result.message || "Plan created successfully",
      dateRange,
      viewType: resolved.viewType,
      startDate: resolved.start,
      endDate: resolved.end,
      createdTasks,
      items: scheduled.items,
      board: await this.getBoard(userId, {
        viewType: resolved.viewType,
        date: resolved.anchor,
      }),
      tokensUsed: result.tokensUsed,
    };
  }

  async createAiSuggestion(
    userId,
    { action, viewType = "DAILY", date, message } = {},
  ) {
    if (!PLANNER_ACTIONS.includes(action)) {
      const error = new Error(
        `Invalid action. Valid actions: ${PLANNER_ACTIONS.join(", ")}`,
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

    const context = await this.getSchedulingContext(userId, { viewType, date });
    const result = await openaiService.suggestPlannerSchedule(
      action,
      message,
      context,
    );

    const recommendation = await prisma.aiRecommendation.create({
      data: {
        userId,
        type: "PLAN_ADJUSTMENT",
        title: result.title || "Planner suggestion",
        description: result.message,
        reasoning: JSON.stringify({
          suggestionId: null,
          action,
          viewType,
          date: date || new Date().toISOString(),
          message: result.message,
          placements: result.placements,
          previousSnapshot: context.currentSchedule,
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
      action,
      viewType,
      message: result.message,
      placements: result.placements,
      board: await this.previewPlacements(userId, result.placements, viewType),
      tokensUsed: result.tokensUsed,
    };
  }

  async previewPlacements(userId, placements, viewType) {
    const preview = [];

    for (const placement of placements) {
      let task = null;
      let habit = null;

      if (placement.itemType === "TASK" && placement.taskId) {
        task = await prisma.task.findFirst({
          where: { id: placement.taskId, userId },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            category: true,
            aiGenerated: true,
            estimatedMinutes: true,
          },
        });
      }

      if (placement.itemType === "HABIT" && placement.habitId) {
        habit = await prisma.habit.findFirst({
          where: { id: placement.habitId, userId },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            category: true,
            aiSuggested: true,
            frequency: true,
            difficulty: true,
          },
        });
      }

      preview.push({
        itemType: placement.itemType,
        taskId: placement.taskId || null,
        habitId: placement.habitId || null,
        date: placement.date,
        startTime: placement.startTime || null,
        endTime: placement.endTime || null,
        orderIndex: placement.orderIndex ?? 0,
        viewType: placement.viewType || viewType,
        aiScheduled: true,
        title: task?.title || habit?.name || "Unknown",
        task,
        habit,
      });
    }

    return preview;
  }

  async acceptAiSuggestion(suggestionId, userId) {
    const recommendation = await prisma.aiRecommendation.findFirst({
      where: {
        id: suggestionId,
        userId,
        type: "PLAN_ADJUSTMENT",
        isApplied: false,
        isDismissed: false,
      },
    });

    if (!recommendation) {
      const error = new Error(
        "Planner suggestion not found or already handled",
      );
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

    const { placements, viewType, date, previousSnapshot, action } = payload;
    const anchor = date ? new Date(date) : new Date();
    const { start, end } = this.getRangeForView(viewType || "DAILY", anchor);

    const deleteWhere = {
      userId,
      date: { gte: start, lte: end },
    };

    if (action !== "GENERATE_PLAN") {
      deleteWhere.aiScheduled = true;
    }

    await prisma.plannerItem.deleteMany({ where: deleteWhere });

    const created = await this.bulkSchedule(userId, placements, {
      viewType: viewType || "DAILY",
      aiScheduled: true,
    });

    await prisma.aiRecommendation.update({
      where: { id: suggestionId },
      data: {
        isApplied: true,
        appliedAt: new Date(),
        description: recommendation.description,
        reasoning: JSON.stringify({
          ...payload,
          previousSnapshot: previousSnapshot || [],
          appliedItems: created.items,
          action,
        }),
      },
    });

    return {
      message: "Plan accepted and applied",
      suggestionId,
      items: created.items,
      board: await this.getBoard(userId, {
        viewType: viewType || "DAILY",
        date,
      }),
    };
  }

  async dismissAiSuggestion(suggestionId, userId) {
    const recommendation = await prisma.aiRecommendation.findFirst({
      where: {
        id: suggestionId,
        userId,
        type: "PLAN_ADJUSTMENT",
        isApplied: false,
        isDismissed: false,
      },
    });

    if (!recommendation) {
      const error = new Error(
        "Planner suggestion not found or already handled",
      );
      error.statusCode = 404;
      throw error;
    }

    await prisma.aiRecommendation.update({
      where: { id: suggestionId },
      data: { isDismissed: true, dismissedAt: new Date() },
    });

    return { message: "Suggestion dismissed", suggestionId };
  }

  async undoLastAiChange(userId) {
    const lastApplied = await prisma.aiRecommendation.findFirst({
      where: {
        userId,
        type: "PLAN_ADJUSTMENT",
        isApplied: true,
      },
      orderBy: { appliedAt: "desc" },
    });

    if (!lastApplied) {
      const error = new Error("No applied planner suggestion to undo");
      error.statusCode = 404;
      throw error;
    }

    let payload;
    try {
      payload = JSON.parse(lastApplied.reasoning);
    } catch {
      const error = new Error("Invalid undo data");
      error.statusCode = 400;
      throw error;
    }

    const { previousSnapshot, viewType, date, appliedItems } = payload;
    const anchor = date ? new Date(date) : new Date();
    const { start, end } = this.getRangeForView(viewType || "DAILY", anchor);

    if (appliedItems?.length) {
      await prisma.plannerItem.deleteMany({
        where: { id: { in: appliedItems.map((i) => i.id) }, userId },
      });
    } else {
      await prisma.plannerItem.deleteMany({
        where: {
          userId,
          date: { gte: start, lte: end },
          aiScheduled: true,
        },
      });
    }

    if (previousSnapshot?.length) {
      for (const snap of previousSnapshot) {
        await prisma.plannerItem.create({
          data: {
            userId,
            itemType: snap.itemType,
            taskId: snap.taskId,
            habitId: snap.habitId,
            date: new Date(snap.date),
            startTime: snap.startTime,
            endTime: snap.endTime,
            orderIndex: snap.orderIndex ?? 0,
            viewType: snap.viewType || viewType || "DAILY",
            isCompleted: snap.isCompleted || false,
            aiScheduled: snap.aiScheduled || false,
          },
        });
      }
    }

    await prisma.aiRecommendation.update({
      where: { id: lastApplied.id },
      data: { isApplied: false, appliedAt: null },
    });

    return {
      message: "Last AI planner change undone",
      board: await this.getBoard(userId, {
        viewType: viewType || "DAILY",
        date,
      }),
    };
  }
}

module.exports = new PlannerService();
