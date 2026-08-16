const prisma = require("../config/database");
const openaiService = require("./openaiService");

const PLANNER_ACTIONS = [
  "GENERATE_PLAN",
  "RECALIBRATE_DAY",
  "REDUCE_OVERLOAD",
  "OPTIMIZE_SCHEDULE",
  "BALANCE_SCHEDULE",
  "FREE_EVENING",
  "CHAT",
];

const PLANNER_CHAT_TYPE = "planner";

const PLANNER_ACTION_LABELS = {
  GENERATE_PLAN: "Generate a plan",
  RECALIBRATE_DAY: "Recalibrate my day",
  REDUCE_OVERLOAD: "Reduce overload",
  OPTIMIZE_SCHEDULE: "Optimize schedule",
  BALANCE_SCHEDULE: "Balance my schedule",
  FREE_EVENING: "Free up my evening",
  CHAT: "Chat",
};

class PlannerService {
  /**
   * Calendar date helpers — always use YYYY-MM-DD + UTC midnight storage
   * so "today" does not shift a day when serialized to ISO (e.g. UTC+6).
   */
  getAppTimezone(userTimezone) {
    if (userTimezone && String(userTimezone).trim()) {
      return String(userTimezone).trim();
    }
    return process.env.APP_TIMEZONE || "Asia/Dhaka";
  }

  async resolveUserTimezone(userId) {
    if (!userId) return this.getAppTimezone();
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    // Schema default is "UTC" — treat that as "use app default" for calendar days
    if (settings?.timezone && settings.timezone !== "UTC") {
      return settings.timezone;
    }
    return this.getAppTimezone();
  }

  toDateOnly(dateInput = new Date(), timeZone = "UTC") {
    if (typeof dateInput === "string") {
      const trimmed = dateInput.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
        // Prefer explicit calendar date from date-only query params
        // For full ISO, convert via timezone below
      }
    }

    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(date.getTime())) {
      return this.toDateOnly(new Date(), timeZone);
    }

    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  toUtcMidnight(dateInput, timeZone = "UTC") {
    const dateOnly = this.toDateOnly(dateInput, timeZone);
    return new Date(`${dateOnly}T00:00:00.000Z`);
  }

  getDayBounds(dateInput = new Date(), timeZone = "UTC") {
    const dateOnly = this.toDateOnly(dateInput, timeZone);
    const start = new Date(`${dateOnly}T00:00:00.000Z`);
    const end = new Date(`${dateOnly}T23:59:59.999Z`);
    return { start, end, dateOnly };
  }

  getWeekBounds(dateInput = new Date(), timeZone = "UTC") {
    const dateOnly = this.toDateOnly(dateInput, timeZone);
    const anchor = new Date(`${dateOnly}T00:00:00.000Z`);
    const day = anchor.getUTCDay(); // 0 Sun .. 6 Sat
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    const start = new Date(anchor);
    start.setUTCDate(start.getUTCDate() + diff);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return {
      start,
      end,
      dateOnly: this.toDateOnly(start, "UTC"),
    };
  }

  getMonthBounds(dateInput = new Date(), timeZone = "UTC") {
    const dateOnly = this.toDateOnly(dateInput, timeZone);
    const [y, m] = dateOnly.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    return { start, end, dateOnly };
  }

  getRangeForView(viewType, dateInput = new Date(), timeZone = "UTC") {
    switch (viewType) {
      case "WEEKLY":
        return this.getWeekBounds(dateInput, timeZone);
      case "MONTHLY":
        return this.getMonthBounds(dateInput, timeZone);
      case "DAILY":
      default:
        return this.getDayBounds(dateInput, timeZone);
    }
  }

  resolvePlanDateRange(dateRange, { startDate, endDate, timeZone } = {}) {
    const tz = this.getAppTimezone(timeZone);
    const now = new Date();

    switch (dateRange) {
      case "TODAY": {
        const bounds = this.getDayBounds(now, tz);
        return {
          ...bounds,
          viewType: "DAILY",
          anchor: bounds.start,
          dateRange,
        };
      }
      case "THIS_WEEK": {
        // Rolling week from today → today + 6 days (not Mon–Sun calendar week)
        const startBounds = this.getDayBounds(now, tz);
        const endDate = new Date(startBounds.start);
        endDate.setUTCDate(endDate.getUTCDate() + 6);
        const endOnly = this.toDateOnly(endDate, "UTC");
        const end = new Date(`${endOnly}T23:59:59.999Z`);
        return {
          start: startBounds.start,
          end,
          dateOnly: startBounds.dateOnly,
          viewType: "WEEKLY",
          anchor: startBounds.start,
          dateRange,
        };
      }
      case "THIS_MONTH": {
        const bounds = this.getMonthBounds(now, tz);
        return {
          ...bounds,
          viewType: "MONTHLY",
          anchor: bounds.start,
          dateRange,
        };
      }
      case "CUSTOM": {
        if (!startDate || !endDate) {
          const error = new Error(
            "startDate and endDate are required for CUSTOM date range",
          );
          error.statusCode = 400;
          throw error;
        }

        const startOnly = this.toDateOnly(startDate, tz);
        const endOnly = this.toDateOnly(endDate, tz);
        const start = new Date(`${startOnly}T00:00:00.000Z`);
        const end = new Date(`${endOnly}T23:59:59.999Z`);

        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(end.getTime()) ||
          start > end
        ) {
          const error = new Error("Invalid custom date range");
          error.statusCode = 400;
          throw error;
        }

        // end is 23:59:59.999, so floor the diff before counting the start day
        const daySpan = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        let viewType = "MONTHLY";
        if (daySpan <= 1) viewType = "DAILY";
        else if (daySpan <= 7) viewType = "WEEKLY";

        return {
          start,
          end,
          dateOnly: startOnly,
          viewType,
          anchor: start,
          dateRange,
        };
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

  /**
   * Every calendar day (YYYY-MM-DD) inside a resolved plan range.
   */
  listDatesInRange(start, end, { maxDays = 62 } = {}) {
    const dates = [];
    const cursor = this.toUtcMidnight(start, "UTC");
    const last = this.toUtcMidnight(end, "UTC");

    while (cursor <= last && dates.length < maxDays) {
      dates.push(this.toDateOnly(cursor, "UTC"));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return dates;
  }

  timeToMinutes(value) {
    if (!value || typeof value !== "string") return null;
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  minutesToTime(totalMinutes) {
    const clamped = Math.max(
      0,
      Math.min(23 * 60 + 59, Math.round(totalMinutes)),
    );
    const hours = String(Math.floor(clamped / 60)).padStart(2, "0");
    const minutes = String(clamped % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  /**
   * Usable scheduling window for auto-filled placements.
   */
  resolvePlanDayWindow(settings = {}) {
    const startMin =
      this.timeToMinutes(settings.productivityHoursStart) ??
      this.timeToMinutes(settings.wakeTime) ??
      9 * 60;
    let endMin =
      this.timeToMinutes(settings.productivityHoursEnd) ??
      this.timeToMinutes(settings.sleepTime) ??
      17 * 60;

    if (endMin <= startMin) endMin = Math.min(23 * 60 + 59, startMin + 8 * 60);

    return { startMin, endMin };
  }

  /**
   * Guarantee every day of the range has at least one placement.
   * The AI often returns only 1-2 items for long ranges, so we top up
   * empty days from the user's remaining tasks/habits.
   */
  fillEmptyPlanDays(
    placements = [],
    {
      dates = [],
      availableTasks = [],
      availableHabits = [],
      viewType = "DAILY",
      settings = {},
      minPerDay = 1,
    } = {},
  ) {
    if (!dates.length) return placements;

    const window = this.resolvePlanDayWindow(settings);
    const byDate = new Map(dates.map((date) => [date, []]));

    for (const placement of placements) {
      const date = placement.date;
      if (byDate.has(date)) {
        byDate.get(date).push(placement);
      }
    }

    const usedTaskIds = new Set(
      placements.filter((p) => p.taskId).map((p) => p.taskId),
    );

    const priorityRank = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    // Soonest due / most urgent first, so they land on the earliest empty days
    const unusedTasks = availableTasks
      .filter((task) => !usedTaskIds.has(task.id))
      .sort((a, b) => {
        const aDue = a.dueDate
          ? this.toDateOnly(a.dueDate, "UTC")
          : "9999-12-31";
        const bDue = b.dueDate
          ? this.toDateOnly(b.dueDate, "UTC")
          : "9999-12-31";
        if (aDue !== bDue) return aDue < bDue ? -1 : 1;
        return (
          (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2)
        );
      });

    const habits = [...availableHabits];
    let habitCursor = 0;

    // Never auto-schedule a task after its dueDate
    const takeTaskForDate = (date) => {
      const index = unusedTasks.findIndex(
        (task) => !task.dueDate || date <= this.toDateOnly(task.dueDate, "UTC"),
      );
      if (index === -1) return null;
      return unusedTasks.splice(index, 1)[0];
    };

    const takeHabit = () => {
      if (!habits.length) return null;
      const habit = habits[habitCursor % habits.length];
      habitCursor += 1;
      return habit;
    };

    for (const date of dates) {
      const dayItems = byDate.get(date) || [];
      const takenStarts = new Set(
        dayItems.map((item) => this.timeToMinutes(item.startTime)),
      );

      while (dayItems.length < minPerDay) {
        const task = takeTaskForDate(date);
        const habit = task ? null : takeHabit();

        if (!task && !habit) break;

        const duration = task
          ? Math.min(Math.max(task.estimatedMinutes || 45, 15), 120)
          : 30;

        // Habits keep their reminder time when it fits the day window
        const preferred = habit ? this.timeToMinutes(habit.reminderTime) : null;
        let startMin =
          preferred !== null && preferred + duration <= window.endMin
            ? preferred
            : window.startMin;

        while (
          takenStarts.has(startMin) &&
          startMin + duration < window.endMin
        ) {
          startMin += 30;
        }
        startMin = Math.min(startMin, Math.max(0, window.endMin - duration));
        takenStarts.add(startMin);

        const filled = {
          itemType: task ? "TASK" : "HABIT",
          taskId: task ? task.id : null,
          habitId: habit ? habit.id : null,
          date,
          startTime: this.minutesToTime(startMin),
          endTime: this.minutesToTime(
            Math.min(window.endMin, startMin + duration),
          ),
          orderIndex: dayItems.length,
          viewType,
          aiScheduled: true,
          autoFilled: true,
        };

        dayItems.push(filled);
        placements.push(filled);
      }
    }

    // Keep chronological ordering per day
    return placements
      .slice()
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        const aStart = this.timeToMinutes(a.startTime) ?? 0;
        const bStart = this.timeToMinutes(b.startTime) ?? 0;
        if (aStart !== bStart) return aStart - bStart;
        return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
      })
      .map((placement, index, all) => {
        const sameDayBefore = all
          .slice(0, index)
          .filter((p) => p.date === placement.date).length;
        return { ...placement, orderIndex: sameDayBefore };
      });
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
          goal: {
            select: { id: true, title: true, category: true },
          },
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
          targetTimesPerDay: true,
          goalId: true,
          goal: {
            select: { id: true, title: true, category: true },
          },
        },
      },
    };
  }

  formatBoardItem(item) {
    const linked = item.itemType === "TASK" ? item.task : item.habit;
    const goal = linked?.goal || null;

    return {
      id: item.id,
      itemType: item.itemType,
      taskId: item.taskId,
      habitId: item.habitId,
      date: this.toDateOnly(item.date, "UTC"),
      dateIso: item.date,
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
      goalId: linked?.goalId || goal?.id || null,
      goalTitle: goal?.title || null,
      goal: goal,
      progress: null,
      task: item.task,
      habit: item.habit,
    };
  }

  dayKey(date) {
    return this.toDateOnly(date, "UTC");
  }

  async enrichBoardCards(formattedItems) {
    if (!formattedItems.length) return formattedItems;

    const taskIds = [
      ...new Set(formattedItems.filter((i) => i.taskId).map((i) => i.taskId)),
    ];
    const habitIds = [
      ...new Set(formattedItems.filter((i) => i.habitId).map((i) => i.habitId)),
    ];

    const dates = formattedItems.map((i) => new Date(i.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const { start } = this.getDayBounds(minDate);
    const { end } = this.getDayBounds(maxDate);

    const [subtasks, completions] = await Promise.all([
      taskIds.length
        ? prisma.task.findMany({
            where: { parentTaskId: { in: taskIds } },
            select: { parentTaskId: true, status: true },
          })
        : Promise.resolve([]),
      habitIds.length
        ? prisma.habitCompletion.findMany({
            where: {
              habitId: { in: habitIds },
              date: { gte: start, lte: end },
            },
            select: { habitId: true, date: true },
          })
        : Promise.resolve([]),
    ]);

    const stepsByTask = {};
    for (const sub of subtasks) {
      if (!stepsByTask[sub.parentTaskId]) {
        stepsByTask[sub.parentTaskId] = { completed: 0, total: 0 };
      }
      stepsByTask[sub.parentTaskId].total += 1;
      if (sub.status === "COMPLETED") {
        stepsByTask[sub.parentTaskId].completed += 1;
      }
    }

    const completionsByHabitDay = {};
    for (const c of completions) {
      const key = `${c.habitId}:${this.dayKey(c.date)}`;
      completionsByHabitDay[key] = (completionsByHabitDay[key] || 0) + 1;
    }

    return formattedItems.map((item) => {
      if (item.itemType === "TASK" && item.taskId) {
        const steps = stepsByTask[item.taskId] || { completed: 0, total: 0 };
        const progress =
          steps.total > 0
            ? {
                type: "STEPS",
                completed: steps.completed,
                total: steps.total,
                label: `${steps.completed}/${steps.total} Steps`,
              }
            : null;

        return { ...item, progress };
      }

      if (item.itemType === "HABIT" && item.habitId) {
        const target = item.habit?.targetTimesPerDay || 1;
        const completed =
          completionsByHabitDay[`${item.habitId}:${this.dayKey(item.date)}`] ||
          0;

        return {
          ...item,
          progress: {
            type: "HABIT",
            completed,
            total: target,
            label: `${completed}/${target}`,
          },
        };
      }

      return item;
    });
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
    const timeZone = await this.resolveUserTimezone(userId);
    const anchor = date || new Date();
    const { start, end, dateOnly } = this.getRangeForView(
      viewType,
      anchor,
      timeZone,
    );

    const items = await prisma.plannerItem.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      include: this.buildItemInclude(),
      orderBy: [{ date: "asc" }, { orderIndex: "asc" }, { startTime: "asc" }],
    });

    const formatted = await this.enrichBoardCards(
      items.map((item) => this.formatBoardItem(item)),
    );

    if (viewType === "DAILY") {
      return {
        viewType,
        date: dateOnly || this.toDateOnly(start, "UTC"),
        items: formatted,
      };
    }

    const grouped = {};
    for (const item of formatted) {
      const key = this.dayKey(item.date);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    return {
      viewType,
      startDate: this.toDateOnly(start, "UTC"),
      endDate: this.toDateOnly(end, "UTC"),
      days: grouped,
      items: formatted,
    };
  }

  async getSummary(userId, { date } = {}) {
    const timeZone = await this.resolveUserTimezone(userId);
    const { start, end, dateOnly } = this.getDayBounds(
      date || new Date(),
      timeZone,
    );

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
      date: dateOnly,
      scheduledToday: totalToday,
      completedToday,
      remainingToday: Math.max(totalToday - completedToday, 0),
      aiScheduledToday,
      unscheduledTasks: upcomingTasks,
      activeHabits,
    };
  }

  async getAvailableItems(userId, { date } = {}) {
    const timeZone = await this.resolveUserTimezone(userId);
    const { start, end, dateOnly } = this.getDayBounds(
      date || new Date(),
      timeZone,
    );

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

    return { date: dateOnly, tasks, habits };
  }

  async listItems(userId, filters = {}) {
    const where = { userId };

    if (filters.viewType) where.viewType = filters.viewType;
    if (filters.itemType) where.itemType = filters.itemType;
    if (filters.aiScheduled === true || filters.aiScheduled === "true") {
      where.aiScheduled = true;
    }

    if (filters.date) {
      const { start, end } = this.getDayBounds(filters.date);
      where.date = { gte: start, lte: end };
    } else if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = this.toUtcMidnight(filters.startDate);
      }
      if (filters.endDate) {
        const endOnly = this.toDateOnly(filters.endDate);
        where.date.lte = new Date(`${endOnly}T23:59:59.999Z`);
      }
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
        date: this.toUtcMidnight(sanitized.date),
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

    if (data.date) data.date = this.toUtcMidnight(data.date);

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
    const timeZone = await this.resolveUserTimezone(userId);

    if (!rangeStart || !rangeEnd) {
      const bounds = this.getRangeForView(
        viewType,
        date || new Date(),
        timeZone,
      );
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

    const timeZone = await this.resolveUserTimezone(userId);
    const resolved = this.resolvePlanDateRange(dateRange, {
      startDate,
      endDate,
      timeZone,
    });
    const context = await this.getSchedulingContext(userId, {
      viewType: resolved.viewType,
      start: resolved.start,
      end: resolved.end,
      date: resolved.dateOnly,
    });

    if (
      (!context.availableTasks || context.availableTasks.length === 0) &&
      (!context.availableHabits || context.availableHabits.length === 0)
    ) {
      const error = new Error(
        "No tasks or habits available to schedule. Create tasks/habits first, then create a plan.",
      );
      error.statusCode = 422;
      throw error;
    }

    const planDates = this.listDatesInRange(resolved.start, resolved.end);

    const result = await openaiService.generateCreatePlan(prompt.trim(), {
      ...context,
      dateRangeLabel: dateRange,
      planDates,
    });

    const allowedTaskIds = new Set(
      (context.availableTasks || []).map((t) => t.id),
    );
    const allowedHabitIds = new Set(
      (context.availableHabits || []).map((h) => h.id),
    );
    const planDateSet = new Set(planDates);

    let placements = [];

    for (const placement of result.placements || []) {
      const taskId =
        placement.itemType === "TASK" && placement.taskId
          ? placement.taskId
          : null;
      const habitId =
        placement.itemType === "HABIT" && placement.habitId
          ? placement.habitId
          : null;

      if (placement.itemType === "TASK") {
        if (!taskId || !allowedTaskIds.has(taskId)) continue;
      } else if (placement.itemType === "HABIT") {
        if (!habitId || !allowedHabitIds.has(habitId)) continue;
      } else {
        continue;
      }

      const date = this.toDateOnly(placement.date || resolved.dateOnly, "UTC");
      // Drop placements the AI put outside the requested range
      if (planDateSet.size && !planDateSet.has(date)) continue;

      placements.push({
        itemType: placement.itemType,
        taskId,
        habitId,
        date,
        startTime: placement.startTime || null,
        endTime: placement.endTime || null,
        orderIndex: placement.orderIndex ?? 0,
        viewType: placement.viewType || resolved.viewType,
        aiScheduled: true,
      });
    }

    // Top up any day the AI left empty so the whole range is planned
    placements = this.fillEmptyPlanDays(placements, {
      dates: planDates,
      availableTasks: context.availableTasks || [],
      availableHabits: context.availableHabits || [],
      viewType: resolved.viewType,
      settings: context.settings || {},
      minPerDay: 1,
    });

    if (placements.length === 0) {
      const error = new Error(
        "Could not build a plan from your existing tasks/habits. Add more items or try a more specific prompt.",
      );
      error.statusCode = 422;
      throw error;
    }

    const autoFilledCount = placements.filter((p) => p.autoFilled).length;
    const coveredDates = new Set(placements.map((p) => p.date));
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
          startDate:
            resolved.dateOnly || this.toDateOnly(resolved.start, "UTC"),
          endDate: this.toDateOnly(resolved.end, "UTC"),
          previousSnapshot,
          appliedItems: scheduled.items,
          createdTaskIds: [],
          createdHabitIds: [],
          coverage: {
            totalDays: planDates.length,
            coveredDays: coveredDates.size,
            autoFilledCount,
          },
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
      date: resolved.dateOnly || this.toDateOnly(resolved.start, "UTC"),
      startDate: resolved.dateOnly || this.toDateOnly(resolved.start, "UTC"),
      endDate: this.toDateOnly(resolved.end, "UTC"),
      coverage: {
        totalDays: planDates.length,
        coveredDays: coveredDates.size,
        emptyDays: planDates.filter((date) => !coveredDates.has(date)),
        autoFilledCount,
        totalPlacements: placements.length,
      },
      items: scheduled.items,
      board: await this.getBoard(userId, {
        viewType: resolved.viewType,
        date: resolved.dateOnly || this.toDateOnly(resolved.start, "UTC"),
      }),
      tokensUsed: result.tokensUsed,
    };
  }

  async createAiSuggestion(
    userId,
    { action, viewType = "DAILY", date, message, energyLevel } = {},
  ) {
    if (!PLANNER_ACTIONS.includes(action)) {
      const error = new Error(
        `Invalid action. Valid actions: ${PLANNER_ACTIONS.join(", ")}`,
      );
      error.statusCode = 400;
      throw error;
    }

    const validEnergy = ["LOW", "MEDIUM", "HIGH"];
    if (energyLevel && !validEnergy.includes(energyLevel)) {
      const error = new Error(
        `Invalid energyLevel. Valid values: ${validEnergy.join(", ")}`,
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

    const timeZone = await this.resolveUserTimezone(userId);
    const planDate = date || this.toDateOnly(new Date(), timeZone);

    const context = await this.getSchedulingContext(userId, {
      viewType,
      date: planDate,
    });
    if (energyLevel) {
      context.energyLevel = energyLevel;
    }

    const result = await openaiService.suggestPlannerSchedule(
      action,
      message,
      context,
    );

    const placements = (result.placements || []).map((p, index) => ({
      itemType: p.itemType,
      taskId: p.itemType === "TASK" ? p.taskId || null : null,
      habitId: p.itemType === "HABIT" ? p.habitId || null : null,
      date: this.toDateOnly(p.date || planDate, "UTC"),
      startTime: p.startTime || null,
      endTime: p.endTime || null,
      orderIndex: p.orderIndex ?? index,
      viewType: p.viewType || viewType,
    }));

    const recommendation = await prisma.aiRecommendation.create({
      data: {
        userId,
        type: "PLAN_ADJUSTMENT",
        title: result.title || "Planner suggestion",
        description: result.message,
        reasoning: JSON.stringify({
          suggestionId: null,
          source: "PLANNER_AI_SUGGEST",
          action,
          viewType,
          date: planDate,
          userMessage: message?.trim() || null,
          message: result.message,
          energyLevel: energyLevel || null,
          placements,
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

    // Persist chat-panel transcript (user + assistant turns)
    const chat = await this.appendPlannerChatTurn(userId, {
      action,
      userMessage: message,
      assistantMessage: result.message,
      suggestionId: recommendation.id,
      tokensUsed: result.tokensUsed,
    });

    const included = this.buildIncludedSummary(placements);
    const board = await this.previewPlacements(userId, placements, viewType);

    return {
      suggestionId: recommendation.id,
      conversationId: chat.conversationId,
      action,
      viewType,
      date: planDate,
      energyLevel: energyLevel || null,
      message: result.message,
      placements,
      included,
      board,
      tokensUsed: result.tokensUsed,
    };
  }

  /**
   * One planner chat-panel conversation per user (Conversation.type = "planner").
   */
  async ensurePlannerChatConversation(userId) {
    const existing = await prisma.conversation.findFirst({
      where: { userId, type: PLANNER_CHAT_TYPE },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) return existing;

    return prisma.conversation.create({
      data: {
        userId,
        title: "Planner AI chat",
        type: PLANNER_CHAT_TYPE,
      },
    });
  }

  encodePlannerChatMeta({ action, suggestionId } = {}) {
    return JSON.stringify({
      kind: "planner",
      action: action || null,
      suggestionId: suggestionId || null,
    });
  }

  decodePlannerChatMeta(raw) {
    if (!raw || typeof raw !== "string") return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.kind === "planner") return parsed;
    } catch {
      // ignore non-JSON model values
    }
    return {};
  }

  resolvePlannerChatUserText(action, userMessage) {
    const trimmed = typeof userMessage === "string" ? userMessage.trim() : "";
    if (trimmed) return trimmed;
    return PLANNER_ACTION_LABELS[action] || action || "Planner request";
  }

  async appendPlannerChatTurn(
    userId,
    { action, userMessage, assistantMessage, suggestionId, tokensUsed } = {},
  ) {
    const conversation = await this.ensurePlannerChatConversation(userId);
    const userContent = this.resolvePlannerChatUserText(action, userMessage);
    const assistantContent =
      (typeof assistantMessage === "string" && assistantMessage.trim()) ||
      "Suggestion ready.";

    const meta = this.encodePlannerChatMeta({ action, suggestionId });

    const [userMsg, assistantMsg] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "user",
          content: userContent,
          model: meta,
        },
      }),
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: assistantContent,
          tokensUsed: tokensUsed != null ? Number(tokensUsed) : null,
          model: meta,
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return {
      conversationId: conversation.id,
      userMessage: this.formatPlannerChatMessage(userMsg),
      assistantMessage: this.formatPlannerChatMessage(assistantMsg),
    };
  }

  formatPlannerChatMessage(message) {
    const meta = this.decodePlannerChatMeta(message.model);
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      tokensUsed: message.tokensUsed ?? null,
      action: meta.action || null,
      suggestionId: meta.suggestionId || null,
    };
  }

  /**
   * Chat history for the planner right-side panel.
   * Default: newest page of messages, returned oldest→newest for UI render.
   */
  async getPlannerChatHistory(userId, { page = 1, limit = 50 } = {}) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const currentPage = Math.max(Number(page) || 1, 1);
    const skip = (currentPage - 1) * take;

    const conversation = await this.ensurePlannerChatConversation(userId);

    const total = await prisma.message.count({
      where: { conversationId: conversation.id },
    });

    // Fetch newest-first for the requested page, then reverse for chat UI order
    const rows = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { timestamp: "desc" },
      skip,
      take,
    });

    rows.reverse();

    return {
      conversationId: conversation.id,
      messages: rows.map((row) => this.formatPlannerChatMessage(row)),
      pagination: {
        page: currentPage,
        limit: take,
        total,
        totalPages: Math.max(1, Math.ceil(total / take) || 1),
      },
    };
  }

  async clearPlannerChatHistory(userId) {
    const conversation = await prisma.conversation.findFirst({
      where: { userId, type: PLANNER_CHAT_TYPE },
      orderBy: { updatedAt: "desc" },
    });

    if (!conversation) {
      return { conversationId: null, deleted: 0 };
    }

    const deleted = await prisma.message.deleteMany({
      where: { conversationId: conversation.id },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId: conversation.id,
      deleted: deleted.count,
    };
  }

  buildIncludedSummary(placements = []) {
    const tasks = [];
    const habits = [];

    for (const p of placements) {
      if (p.itemType === "TASK" && p.taskId) {
        tasks.push({
          taskId: p.taskId,
          date: p.date,
          startTime: p.startTime || null,
          endTime: p.endTime || null,
        });
      }
      if (p.itemType === "HABIT" && p.habitId) {
        habits.push({
          habitId: p.habitId,
          date: p.date,
          startTime: p.startTime || null,
          endTime: p.endTime || null,
        });
      }
    }

    return {
      totalItems: placements.length,
      taskCount: tasks.length,
      habitCount: habits.length,
      tasks,
      habits,
    };
  }

  formatPlannerAiSuggestion(recommendation) {
    let payload = {};
    try {
      payload = JSON.parse(recommendation.reasoning || "{}");
    } catch {
      payload = {};
    }

    const status = recommendation.isApplied
      ? "applied"
      : recommendation.isDismissed
        ? "dismissed"
        : "pending";

    const placements = Array.isArray(payload.placements)
      ? payload.placements
      : [];

    return {
      suggestionId: recommendation.id,
      status,
      source: payload.source || null,
      action: payload.action || null,
      viewType: payload.viewType || null,
      date: payload.date || null,
      dateRange: payload.dateRange || null,
      startDate: payload.startDate || null,
      endDate: payload.endDate || null,
      energyLevel: payload.energyLevel || null,
      title: recommendation.title,
      message: recommendation.description,
      placements,
      included: this.buildIncludedSummary(placements),
      isApplied: recommendation.isApplied,
      isDismissed: recommendation.isDismissed,
      appliedAt: recommendation.appliedAt || null,
      createdAt: recommendation.createdAt,
      updatedAt: recommendation.updatedAt,
    };
  }

  isPlannerSuggestHistory(payload = {}) {
    if (payload.source === "PLANNER_AI_SUGGEST") return true;
    if (payload.action === "CREATE_PLAN") return false;
    if (payload.dateRange) return false;
    return PLANNER_ACTIONS.includes(payload.action);
  }

  /**
   * History for POST /planner/ai/suggest only (pending / applied / dismissed).
   * Does not include create-plan records.
   */
  async listAiSuggestions(
    userId,
    { status = "all", page = 1, limit = 20 } = {},
  ) {
    const where = {
      userId,
      type: "PLAN_ADJUSTMENT",
      AND: [
        { NOT: { reasoning: { contains: '"action":"CREATE_PLAN"' } } },
        {
          OR: [
            { reasoning: { contains: '"source":"PLANNER_AI_SUGGEST"' } },
            ...PLANNER_ACTIONS.map((action) => ({
              reasoning: { contains: `"action":"${action}"` },
            })),
          ],
        },
      ],
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

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Fetch a wider page then filter legacy rows precisely
    const rows = await prisma.aiRecommendation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(300, skip + limitNum * 3),
    });

    const filtered = rows
      .map((row) => this.formatPlannerAiSuggestion(row))
      .filter((item) => this.isPlannerSuggestHistory(item));

    const total = filtered.length;
    const suggestions = filtered.slice(skip, skip + limitNum);

    return {
      status,
      count: suggestions.length,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
      suggestions,
    };
  }

  async parsePendingSuggestion(suggestionId, userId) {
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

    return { recommendation, payload };
  }

  async getAiSuggestion(suggestionId, userId) {
    const recommendation = await prisma.aiRecommendation.findFirst({
      where: {
        id: suggestionId,
        userId,
        type: "PLAN_ADJUSTMENT",
      },
    });

    if (!recommendation) {
      const error = new Error("Planner suggestion not found");
      error.statusCode = 404;
      throw error;
    }

    const formatted = this.formatPlannerAiSuggestion(recommendation);
    let board = null;

    if (formatted.status === "pending" && formatted.placements?.length) {
      board = await this.previewPlacements(
        userId,
        formatted.placements,
        formatted.viewType || "DAILY",
      );
    }

    return {
      ...formatted,
      board,
    };
  }

  async adjustAiSuggestion(suggestionId, userId, { placements, message } = {}) {
    const { recommendation, payload } = await this.parsePendingSuggestion(
      suggestionId,
      userId,
    );

    if (!Array.isArray(placements) || placements.length === 0) {
      const error = new Error("placements must be a non-empty array");
      error.statusCode = 400;
      throw error;
    }

    for (const placement of placements) {
      await this.validateLinkedItem(
        userId,
        placement.itemType,
        placement.taskId,
        placement.habitId,
      );
    }

    const normalizedPlacements = placements.map((p, index) => ({
      itemType: p.itemType,
      taskId: p.itemType === "TASK" ? p.taskId || null : null,
      habitId: p.itemType === "HABIT" ? p.habitId || null : null,
      date: this.toDateOnly(p.date || payload.date, "UTC"),
      startTime: p.startTime || null,
      endTime: p.endTime || null,
      orderIndex: p.orderIndex ?? index,
      viewType: p.viewType || payload.viewType || "DAILY",
    }));

    const nextPayload = {
      ...payload,
      placements: normalizedPlacements,
      message: message?.trim() || payload.message,
      adjustedAt: new Date().toISOString(),
    };

    await prisma.aiRecommendation.update({
      where: { id: suggestionId },
      data: {
        description: nextPayload.message,
        reasoning: JSON.stringify(nextPayload),
      },
    });

    const viewType = nextPayload.viewType || "DAILY";
    const board = await this.previewPlacements(
      userId,
      normalizedPlacements,
      viewType,
    );

    return {
      message: "Suggestion adjusted — accept to apply or dismiss to cancel",
      suggestionId: recommendation.id,
      action: nextPayload.action,
      viewType,
      date: nextPayload.date,
      placements: normalizedPlacements,
      included: this.buildIncludedSummary(normalizedPlacements),
      board,
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
            dueDate: true,
            dueTime: true,
            goalId: true,
            goal: {
              select: { id: true, title: true, category: true },
            },
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
            reminderTime: true,
            targetTimesPerDay: true,
            goalId: true,
            goal: {
              select: { id: true, title: true, category: true },
            },
          },
        });
      }

      // Same top-level card shape as GET /planner/board (status, priority, etc.)
      preview.push(
        this.formatBoardItem({
          id: null,
          itemType: placement.itemType,
          taskId: placement.taskId || null,
          habitId: placement.habitId || null,
          date: placement.date,
          startTime: placement.startTime || null,
          endTime: placement.endTime || null,
          orderIndex: placement.orderIndex ?? 0,
          viewType: placement.viewType || viewType,
          isCompleted: false,
          aiScheduled: true,
          task,
          habit,
        }),
      );
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
    const timeZone = await this.resolveUserTimezone(userId);
    const { start, end } = this.getRangeForView(
      viewType || "DAILY",
      date || new Date(),
      timeZone,
    );

    const deleteWhere = {
      userId,
      date: { gte: start, lte: end },
    };

    if (action !== "GENERATE_PLAN") {
      deleteWhere.aiScheduled = true;
    }

    await prisma.plannerItem.deleteMany({ where: deleteWhere });

    const normalizedPlacements = (placements || []).map((p, index) => ({
      ...p,
      date: this.toDateOnly(p.date || date, "UTC"),
      orderIndex: p.orderIndex ?? index,
    }));

    const created = await this.bulkSchedule(userId, normalizedPlacements, {
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
          source: payload.source || "PLANNER_AI_SUGGEST",
          placements: normalizedPlacements,
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
        date: date || this.toDateOnly(start, "UTC"),
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
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
        reasoning: JSON.stringify({
          ...(() => {
            try {
              return JSON.parse(recommendation.reasoning || "{}");
            } catch {
              return {};
            }
          })(),
          source: "PLANNER_AI_SUGGEST",
          dismissedAt: new Date().toISOString(),
        }),
      },
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
    const timeZone = await this.resolveUserTimezone(userId);
    const { start, end } = this.getRangeForView(
      viewType || "DAILY",
      date || new Date(),
      timeZone,
    );

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
            date: this.toUtcMidnight(snap.date),
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
