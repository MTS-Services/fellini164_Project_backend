const prisma = require("../config/database");
const goalService = require("./goalService");
const openaiService = require("./openaiService");
const planFeatureService = require("./planFeatureService");
const { resolveHabitWeekSchedule } = require("../utils/habitSchedule");

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
        select: {
          id: true,
          title: true,
          status: true,
          targetDate: true,
        },
      },
      completions: {
        where: {
          date: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
        orderBy: { date: "desc" },
      },
      timeSlots: {
        orderBy: { orderIndex: "asc" },
      },
      _count: {
        select: { completions: true, plannerItems: true, timeSlots: true },
      },
    };
  }

  buildHabitDetailInclude() {
    return {
      goal: {
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          targetDate: true,
        },
      },
      completions: {
        orderBy: { date: "desc" },
        take: 60,
      },
      timeSlots: {
        orderBy: { orderIndex: "asc" },
      },
      plannerItems: {
        orderBy: [{ date: "asc" }, { orderIndex: "asc" }],
        take: 10,
      },
      _count: {
        select: { completions: true, plannerItems: true, timeSlots: true },
      },
    };
  }

  /** Calendar days from today (local start-of-day) to targetDate. Null if missing. */
  getCalendarDaysLeft(targetDate) {
    if (!targetDate) return null;
    const { start: today } = this.getDayBounds(new Date());
    const { start: target } = this.getDayBounds(new Date(targetDate));
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  addDays(baseDate, days) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * UI "Days Left" filter → days until linked goal.targetDate.
   * Values: ALL | 1-7 | 8-30 | 30+
   *
   * Note: in query strings, `+` is often decoded as a space, so `daysLeft=30+`
   * arrives as `"30 "` / `"30"`. Prefer `daysLeft=30plus` or `daysLeft=30%2B`.
   */
  normalizeDaysLeftFilter(raw) {
    if (raw == null || raw === "") return "ALL";

    let value = String(raw).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      // keep original
    }

    value = value.trim().toUpperCase().replace(/\s+/g, "").replace(/%2B/g, "+");

    if (value === "ALL" || value === "ALLDAYSLEFT") return "ALL";
    if (value === "1-7" || value === "1_7" || value === "1TO7") return "1-7";
    if (value === "8-30" || value === "8_30" || value === "8TO30")
      return "8-30";
    if (
      value === "30+" ||
      value === "30" || // `30+` often arrives as `30` after `+` → space
      value === "30PLUS" ||
      value === "OVER30" ||
      value === "30_PLUS" ||
      value === "GT30"
    ) {
      return "30+";
    }
    return null;
  }

  applyDaysLeftWhere(where, daysLeftFilter) {
    if (daysLeftFilter === "ALL") return where;

    const { start: today } = this.getDayBounds(new Date());

    let targetDate;
    if (daysLeftFilter === "1-7") {
      targetDate = {
        gte: this.addDays(today, 1),
        lt: this.addDays(today, 8),
      };
    } else if (daysLeftFilter === "8-30") {
      targetDate = {
        gte: this.addDays(today, 8),
        lt: this.addDays(today, 31),
      };
    } else if (daysLeftFilter === "30+") {
      targetDate = {
        gte: this.addDays(today, 31),
      };
    }

    where.goal = {
      is: {
        ...(where.goal?.is || {}),
        targetDate,
      },
    };

    return where;
  }

  enrichHabitWithDaysLeft(habit) {
    return this.formatHabitResponse(habit);
  }

  isValidHhMm(value) {
    return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  timeToMinutes(hhmm) {
    if (!this.isValidHhMm(hhmm)) return null;
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  minutesToTime(total) {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, total));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  addMinutesToTime(hhmm, minutes) {
    const start = this.timeToMinutes(hhmm);
    if (start == null) return null;
    return this.minutesToTime(start + minutes);
  }

  formatClockLabel(hhmm) {
    const minutes = this.timeToMinutes(hhmm);
    if (minutes == null) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
  }

  formatTimeSlot(slot) {
    if (!slot) return slot;
    return {
      id: slot.id,
      fromTime: slot.fromTime,
      toTime: slot.toTime,
      orderIndex: slot.orderIndex,
      fromTimeLabel: this.formatClockLabel(slot.fromTime),
      toTimeLabel: this.formatClockLabel(slot.toTime),
      label: `${this.formatClockLabel(slot.fromTime)} - ${this.formatClockLabel(slot.toTime)}`,
    };
  }

  formatHabitResponse(habit) {
    if (!habit) return habit;
    const timeSlots = (habit.timeSlots || []).map((slot) =>
      this.formatTimeSlot(slot),
    );
    const required = Math.max(
      timeSlots.length,
      habit.targetTimesPerDay || 1,
      1,
    );
    const { start, end } = this.getDayBounds();
    const completedToday = (habit.completions || []).filter((c) => {
      const t = new Date(c.date).getTime();
      return t >= start.getTime() && t <= end.getTime();
    }).length;

    return {
      ...habit,
      daysLeft: this.getCalendarDaysLeft(habit.goal?.targetDate),
      timeSlots,
      targetTimesPerDay: required,
      reminderTime: habit.reminderTime || timeSlots[0]?.fromTime || null,
      startDate: habit.startDate || null,
      endDate: habit.endDate || null,
      schedule:
        habit.startDate && habit.endDate
          ? {
              startDate: habit.startDate,
              endDate: habit.endDate,
              durationDays:
                Math.round(
                  (new Date(habit.endDate) - new Date(habit.startDate)) /
                    (1000 * 60 * 60 * 24),
                ) + 1,
            }
          : null,
      todayProgress: {
        completed: Math.min(completedToday, required),
        total: required,
        remaining: Math.max(required - completedToday, 0),
        label: `${Math.min(completedToday, required)}/${required}`,
      },
    };
  }

  /**
   * Detect "2 times", "3 times a day", "4x", "twice", "multiple times", etc.
   * Returns 1 when the text does not ask for multiple daily occurrences.
   */
  inferTimesPerDayFromText(text) {
    const raw = String(text || "").toLowerCase();
    if (!raw.trim()) return 1;

    const wordMap = [
      [/\b(four|4)\s*(times|x)\b/, 4],
      [/\bthrice\b/, 3],
      [/\b(three|3)\s*(times|x)\b/, 3],
      [/\btwice\b/, 2],
      [/\b(two|2)\s*(times|x)\b/, 2],
    ];
    for (const [pattern, count] of wordMap) {
      if (pattern.test(raw)) return count;
    }

    const numbered = raw.match(
      /\b([2-9]|1[0-9]|20)\s*(?:times|x)(?:\s*(?:a|per)\s*day)?\b/,
    );
    if (numbered) {
      const n = Number(numbered[1]);
      if (n >= 2 && n <= 20) return n;
    }

    if (
      /\bmultiple times\b/.test(raw) ||
      /\bseveral times\b/.test(raw) ||
      /\ba few times\b/.test(raw) ||
      /\bthroughout the day\b/.test(raw)
    ) {
      return 3;
    }

    return 1;
  }

  /**
   * Spread N distinct From/To windows across the day (never one combined range).
   */
  buildSpreadTimeSlots(count, reminderTime = null) {
    const n = Math.min(Math.max(Number(count) || 1, 1), 20);
    if (n < 2) return [];

    const startsByCount = {
      2: ["08:00", "18:00"],
      3: ["08:00", "13:00", "19:00"],
      4: ["08:00", "12:00", "16:00", "20:00"],
    };
    let starts = startsByCount[n];
    if (!starts) {
      const first = this.isValidHhMm(reminderTime) ? reminderTime : "08:00";
      const firstMin = this.timeToMinutes(first) ?? 8 * 60;
      const gap = Math.floor((12 * 60) / Math.max(n - 1, 1));
      starts = Array.from({ length: n }, (_, i) =>
        this.minutesToTime(firstMin + i * gap),
      );
    }

    if (this.isValidHhMm(reminderTime) && n >= 2) {
      starts = [reminderTime, ...starts.slice(1)];
    }

    return starts.map((fromTime, index) => ({
      fromTime,
      toTime: this.addMinutesToTime(fromTime, 20) || this.minutesToTime(
        (this.timeToMinutes(fromTime) || 8 * 60) + 20,
      ),
      orderIndex: index,
    }));
  }

  resolveAiTimeSlots({
    prompt = "",
    name = "",
    description = "",
    reminderTime = null,
    targetTimesPerDay = 1,
    rawSlots = null,
  } = {}) {
    const inferred = this.inferTimesPerDayFromText(
      `${prompt} ${name} ${description}`,
    );
    const requested = Number(targetTimesPerDay) || 1;
    const fromRaw = Array.isArray(rawSlots) ? rawSlots.length : 0;
    const count = Math.max(inferred, requested >= 2 ? requested : 1, fromRaw);

    if (count < 2) return [];

    if (Array.isArray(rawSlots) && rawSlots.length >= 2) {
      return this.normalizeTimeSlots(rawSlots, {
        reminderTime,
        targetTimesPerDay: count,
      });
    }

    return this.buildSpreadTimeSlots(count, reminderTime);
  }

  /**
   * Each occurrence is its own From/To window. Never merge into one range.
   * Empty input stays empty — does not invent slots for manual create.
   */
  normalizeTimeSlots(
    rawSlots,
    { reminderTime = null, targetTimesPerDay = 1 } = {},
  ) {
    const throwBad = (message) => {
      const error = new Error(message);
      error.statusCode = 400;
      throw error;
    };

    const slots = Array.isArray(rawSlots)
      ? rawSlots
          .filter((s) => s && (s.fromTime || s.toTime || s.startTime || s.endTime))
          .map((s) => ({
            fromTime: s.fromTime || s.startTime,
            toTime: s.toTime || s.endTime,
          }))
      : [];

    if (slots.length === 0) return [];

    const normalized = slots.map((slot, index) => {
      if (!this.isValidHhMm(slot.fromTime) || !this.isValidHhMm(slot.toTime)) {
        throwBad("Each time slot must have fromTime and toTime as HH:mm");
      }

      let fromMin = this.timeToMinutes(slot.fromTime);
      let toMin = this.timeToMinutes(slot.toTime);
      if (toMin <= fromMin) {
        toMin = Math.min(fromMin + 15, 23 * 60 + 59);
      }

      return {
        fromTime: this.minutesToTime(fromMin),
        toTime: this.minutesToTime(toMin),
        orderIndex: index,
      };
    });

    normalized.sort(
      (a, b) => this.timeToMinutes(a.fromTime) - this.timeToMinutes(b.fromTime),
    );

    for (let i = 0; i < normalized.length; i += 1) {
      normalized[i].orderIndex = i;
      if (i === 0) continue;
      const prev = normalized[i - 1];
      if (this.timeToMinutes(normalized[i].fromTime) < this.timeToMinutes(prev.toTime)) {
        throwBad(
          "Time slots cannot overlap. Give each occurrence its own From Time and To Time.",
        );
      }
    }

    return normalized;
  }

  async replaceTimeSlots(habitId, slots) {
    await prisma.habitTimeSlot.deleteMany({ where: { habitId } });
    if (!slots.length) return [];
    await prisma.habitTimeSlot.createMany({
      data: slots.map((slot) => ({
        habitId,
        fromTime: slot.fromTime,
        toTime: slot.toTime,
        orderIndex: slot.orderIndex,
      })),
    });
    return prisma.habitTimeSlot.findMany({
      where: { habitId },
      orderBy: { orderIndex: "asc" },
    });
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
      "startDate",
      "endDate",
      "timeSlots",
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

    // UI streak dropdown: All Streak | Active streak | No streak | Best streak
    const streakFilter = String(filters.streak || "ALL")
      .trim()
      .toUpperCase();
    let orderBy = { createdAt: "desc" };

    if (streakFilter === "ACTIVE") {
      where.currentStreak = { gt: 0 };
    } else if (streakFilter === "NONE" || streakFilter === "NO") {
      where.currentStreak = 0;
    } else if (streakFilter === "BEST") {
      where.longestStreak = { gt: 0 };
      where.currentStreak = { gt: 0 };
      orderBy = [{ longestStreak: "desc" }, { currentStreak: "desc" }];
    } else if (streakFilter !== "ALL") {
      const error = new Error(
        "Invalid streak filter. Valid values: ALL, ACTIVE, NONE, BEST",
      );
      error.statusCode = 400;
      throw error;
    }

    // UI days-left dropdown: All Days Left | 1-7 days | 8-30 days | 30+ days
    // Based on linked goal.targetDate (habits without a target date are excluded from ranges).
    const daysLeftFilter = this.normalizeDaysLeftFilter(filters.daysLeft);
    if (!daysLeftFilter) {
      const error = new Error(
        "Invalid daysLeft filter. Valid values: ALL, 1-7, 8-30, 30+",
      );
      error.statusCode = 400;
      throw error;
    }
    this.applyDaysLeftWhere(where, daysLeftFilter);
    if (daysLeftFilter !== "ALL" && streakFilter !== "BEST") {
      orderBy = { goal: { targetDate: "asc" } };
    }

    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;

    let habits;
    let total;

    if (streakFilter === "BEST") {
      const candidates = await prisma.habit.findMany({
        where,
        include: this.buildHabitListInclude(),
        orderBy,
      });

      const bestOnly = candidates.filter(
        (h) => h.currentStreak > 0 && h.currentStreak === h.longestStreak,
      );
      total = bestOnly.length;
      habits = bestOnly.slice(skip, skip + limit);
    } else {
      [habits, total] = await Promise.all([
        prisma.habit.findMany({
          where,
          include: this.buildHabitListInclude(),
          orderBy,
          skip,
          take: limit,
        }),
        prisma.habit.count({ where }),
      ]);
    }

    return {
      habits: habits.map((habit) => this.enrichHabitWithDaysLeft(habit)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
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

    return this.formatHabitResponse(habit);
  }

  async createHabit(userId, habitData) {
    await planFeatureService.assertCanCreateHabit(userId);

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

    const isAi = Boolean(data.aiSuggested) || data.source === "AI";
    const timeSlots = isAi
      ? this.resolveAiTimeSlots({
          prompt: habitData.prompt || "",
          name: data.name,
          description: data.description,
          reminderTime: data.reminderTime,
          targetTimesPerDay: data.targetTimesPerDay ?? 1,
          rawSlots: habitData.timeSlots,
        })
      : [];

    const schedule =
      habitData.schedule ||
      (isAi ? resolveHabitWeekSchedule(habitData.prompt || "") : null);

    const startDate = data.startDate
      ? new Date(data.startDate)
      : schedule?.startDate || null;
    const endDate = data.endDate
      ? new Date(data.endDate)
      : schedule?.endDate || null;
    const targetDays =
      schedule?.targetDays ||
      (Array.isArray(data.targetDays) ? data.targetDays : []) ||
      [];

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
        targetDays,
        targetTimesPerDay: timeSlots.length || data.targetTimesPerDay || 1,
        reminderTime: timeSlots[0]?.fromTime || data.reminderTime || null,
        startDate,
        endDate,
        isActive: status === "ACTIVE",
        status,
        aiSuggested: data.aiSuggested || false,
        source: data.source || (data.aiSuggested ? "AI" : "MANUAL"),
        goalId: data.goalId || null,
        ...(timeSlots.length
          ? {
              timeSlots: {
                create: timeSlots.map((slot) => ({
                  fromTime: slot.fromTime,
                  toTime: slot.toTime,
                  orderIndex: slot.orderIndex,
                })),
              },
            }
          : {}),
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

    return this.formatHabitResponse(habit);
  }

  async updateHabit(habitId, userId, updateData) {
    const existing = await this.assertHabitOwnership(habitId, userId);
    const data = this.sanitizeHabitInput(updateData);
    const incomingSlots = data.timeSlots;
    delete data.timeSlots;
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

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

    if (incomingSlots !== undefined && existing.source === "AI") {
      const slots = this.normalizeTimeSlots(incomingSlots, {
        reminderTime: data.reminderTime || existing.reminderTime,
        targetTimesPerDay:
          data.targetTimesPerDay ?? existing.targetTimesPerDay ?? 1,
      });
      await this.replaceTimeSlots(habitId, slots);
      if (slots.length >= 2) {
        data.targetTimesPerDay = slots.length;
        data.reminderTime = slots[0]?.fromTime || data.reminderTime || null;
      }
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

    return this.formatHabitResponse(habit);
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
    const slots = await prisma.habitTimeSlot.findMany({
      where: { habitId },
      orderBy: { orderIndex: "asc" },
    });
    const completionDate = completionData.date
      ? new Date(completionData.date)
      : new Date();
    const { start, end } = this.getDayBounds(completionDate);
    const required = Math.max(
      slots.length,
      habit.targetTimesPerDay || 1,
      1,
    );

    const todays = await prisma.habitCompletion.findMany({
      where: { habitId, date: { gte: start, lte: end } },
      orderBy: { completedAt: "asc" },
    });

    const buildProgress = (completedCount) => ({
      completed: Math.min(completedCount, required),
      total: required,
      remaining: Math.max(required - completedCount, 0),
      label: `${Math.min(completedCount, required)}/${required}`,
    });

    let timeSlot = null;
    if (completionData.timeSlotId) {
      timeSlot = slots.find((s) => s.id === completionData.timeSlotId);
      if (!timeSlot) {
        const error = new Error("Time slot not found for this habit");
        error.statusCode = 404;
        throw error;
      }
      const alreadyThisSlot = todays.find((c) => c.timeSlotId === timeSlot.id);
      if (alreadyThisSlot) {
        return {
          completion: alreadyThisSlot,
          habit: await this.getHabitById(habitId, userId),
          alreadyCompleted: true,
          progress: buildProgress(todays.length),
          message: `This time slot is already done today (${todays.length}/${required})`,
        };
      }
    } else if (slots.length > 0) {
      const done = new Set(todays.map((c) => c.timeSlotId).filter(Boolean));
      timeSlot = slots.find((s) => !done.has(s.id)) || null;
    }

    if (todays.length >= required && !completionData.timeSlotId) {
      return {
        completion: todays[todays.length - 1] || null,
        habit: await this.getHabitById(habitId, userId),
        alreadyCompleted: true,
        progress: buildProgress(todays.length),
        message: `All ${required} times for today are already completed`,
      };
    }

    if (!completionData.timeSlotId && todays.length >= required) {
      return {
        completion: todays[todays.length - 1],
        habit: await this.getHabitById(habitId, userId),
        alreadyCompleted: true,
        progress: buildProgress(todays.length),
      };
    }

    const completion = await prisma.habitCompletion.create({
      data: {
        habitId,
        date: completionDate,
        notes: completionData.notes || null,
        timeSlotId: timeSlot?.id || null,
      },
    });

    await this.recalculateHabitStats(habitId);
    await this.refreshLinkedGoalProgress(habit.goalId);

    const updatedHabit = await this.getHabitById(habitId, userId);
    const completedCount = todays.length + 1;
    await this.logHabitActivity(userId, "HABIT_COMPLETED", {
      habitId,
      completionId: completion.id,
      timeSlotId: timeSlot?.id || null,
      streak: updatedHabit.currentStreak,
    });

    return {
      completion,
      habit: updatedHabit,
      alreadyCompleted: false,
      progress: buildProgress(completedCount),
      message: `${completedCount}/${required} completed today`,
    };
  }

  async undoCompletion(habitId, userId, date = new Date(), timeSlotId = null) {
    const habit = await this.assertHabitOwnership(habitId, userId);
    const { start, end } = this.getDayBounds(
      date ? new Date(date) : new Date(),
    );

    const where = {
      habitId,
      date: { gte: start, lte: end },
    };
    if (timeSlotId) where.timeSlotId = timeSlotId;

    const completion = await prisma.habitCompletion.findFirst({
      where,
      orderBy: { completedAt: "desc" },
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

    return this.formatHabitResponse(updated);
  }

  async recalculateHabitStats(habitId) {
    const [habit, completions] = await Promise.all([
      prisma.habit.findUnique({
        where: { id: habitId },
        select: {
          targetTimesPerDay: true,
          _count: { select: { timeSlots: true } },
        },
      }),
      prisma.habitCompletion.findMany({
        where: { habitId },
        orderBy: { date: "asc" },
      }),
    ]);

    const requiredPerDay = Math.max(
      habit?._count?.timeSlots || habit?.targetTimesPerDay || 1,
      1,
    );

    const countsByDay = new Map();
    for (const completion of completions) {
      const key = this.getDayBounds(completion.date).start.getTime();
      countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
    }

    const completedDays = [...countsByDay.entries()]
      .filter(([, count]) => count >= requiredPerDay)
      .map(([key]) => key)
      .sort((a, b) => a - b);

    let currentStreak = 0;
    let longestStreak = 0;
    let runningStreak = 0;
    let previousDay = null;

    for (const dayMs of completedDays) {
      if (previousDay == null) {
        runningStreak = 1;
      } else {
        const daysDiff = Math.round((dayMs - previousDay) / (1000 * 60 * 60 * 24));
        runningStreak = daysDiff === 1 ? runningStreak + 1 : 1;
      }
      longestStreak = Math.max(longestStreak, runningStreak);
      previousDay = dayMs;
    }

    if (completedDays.length > 0) {
      const todayStart = this.getDayBounds().start.getTime();
      const lastDay = completedDays[completedDays.length - 1];
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

    const [active, paused, completed, total, activeHabits] = await Promise.all([
      prisma.habit.count({
        where: { userId, status: "ACTIVE", isActive: true },
      }),
      prisma.habit.count({ where: { userId, status: "PAUSED" } }),
      prisma.habit.count({ where: { userId, status: "COMPLETED" } }),
      prisma.habit.count({ where: { userId } }),
      prisma.habit.findMany({
        where: { userId, status: "ACTIVE", isActive: true },
        select: {
          id: true,
          targetTimesPerDay: true,
          _count: { select: { timeSlots: true } },
          completions: {
            where: { date: { gte: start, lte: end } },
            select: { id: true },
          },
        },
      }),
    ]);

    const completedToday = activeHabits.filter((habit) => {
      const required = Math.max(
        habit._count.timeSlots || habit.targetTimesPerDay || 1,
        1,
      );
      return habit.completions.length >= required;
    }).length;

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

    const allowedDays = await planFeatureService.clampHistoryDays(userId, days);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - allowedDays);
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

    await planFeatureService.consumeAiMessage(userId);

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

    const existingHabits = await prisma.habit.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        reminderTime: true,
        timeSlots: { select: { fromTime: true } },
      },
      take: 100,
    });

    const busyReminderTimes = existingHabits.flatMap((h) => [
      h.reminderTime,
      ...(h.timeSlots || []).map((s) => s.fromTime),
    ]).filter(Boolean);

    const result = await openaiService.generateHabit(prompt, {
      category: category || linkedGoal?.category,
      goals: activeGoals,
      goalId: linkedGoal?.id,
      busyReminderTimes,
    });

    const suggestedGoalId = goalId || result.goal.suggestedGoalId || null;
    if (suggestedGoalId && !goalId) {
      await this.validateGoalId(suggestedGoalId, userId);
    }

    const normalizedName = String(result.habit.name || "")
      .trim()
      .toLowerCase();
    const duplicate = existingHabits.find(
      (h) => String(h.name || "").trim().toLowerCase() === normalizedName,
    );
    if (duplicate) {
      const error = new Error(
        `A habit named "${result.habit.name}" already exists. Try a different prompt.`,
      );
      error.statusCode = 409;
      throw error;
    }

    const habit = await this.createHabit(userId, {
      ...result.habit,
      prompt,
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

    const otherHabits = await prisma.habit.findMany({
      where: {
        userId,
        isActive: true,
        id: { not: habitId },
      },
      select: {
        reminderTime: true,
        timeSlots: { select: { fromTime: true } },
      },
      take: 100,
    });

    const result = await openaiService.improveHabit(existing, instructions, {
      busyTimes: otherHabits
        .flatMap((h) => [h.reminderTime, ...(h.timeSlots || []).map((s) => s.fromTime)])
        .filter(Boolean),
    });
    const improved = result.habit;
    const slots = this.resolveAiTimeSlots({
      prompt: instructions,
      reminderTime: improved.reminderTime,
      rawSlots: improved.timeSlots,
    });

    await prisma.habit.update({
      where: { id: habitId },
      data: {
        name: improved.name,
        description: improved.description,
        category: improved.category,
        frequency: improved.frequency,
        difficulty: improved.difficulty,
        targetDays: improved.targetDays || [],
        targetTimesPerDay:
          slots.length >= 2
            ? slots.length
            : improved.targetTimesPerDay ?? existing.targetTimesPerDay ?? 1,
        reminderTime:
          slots[0]?.fromTime || improved.reminderTime || existing.reminderTime,
      },
    });
    if (slots.length >= 2) {
      await this.replaceTimeSlots(habitId, slots);
    }

    return this.getHabitById(habitId, userId);
  }

  async getHabitsNeedingReminders(time) {
    return prisma.habit.findMany({
      where: {
        isActive: true,
        status: "ACTIVE",
        OR: [
          { reminderTime: time },
          { timeSlots: { some: { fromTime: time } } },
        ],
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
