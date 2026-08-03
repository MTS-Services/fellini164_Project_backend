const { randomUUID } = require("crypto");
const prisma = require("../config/database");
const openaiService = require("./openaiService");
const plannerService = require("./plannerService");

const FOCUS_AREAS = [
  "Career Growth",
  "Physical Fitness",
  "Mental Clarity",
  "Reduce Stress",
  "Productivity",
  "Healthy Habits",
];

const ROUTINE_TYPES = [
  "Corporate Professional",
  "Remote Freelancer",
  "Full-time Student",
  "Entrepreneur",
  "Creative Artist",
  "Stay-at-home Parent",
];

const COMMUNICATION_STYLES = [
  "Direct & Goal-Oriented",
  "Structured & Analytical",
  "Supportive & Encouraging",
  "Calm & Balanced",
];

const GOAL_CATEGORIES = [
  "CAREER",
  "HEALTH",
  "FINANCE",
  "PERSONAL",
  "EDUCATION",
];
const HABIT_CATEGORIES = [
  "CAREER",
  "HEALTH",
  "FINANCE",
  "FITNESS",
  "WELLNESS",
  "PRODUCTIVITY",
  "PERSONAL",
  "EDUCATION",
];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const HABIT_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY"];
const HABIT_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const ONBOARDING_TYPES = ["GOAL", "TASK", "HABIT", "PLAN_ADJUSTMENT"];

const STYLE_TO_TONE = {
  "Direct & Goal-Oriented": "coach",
  "Structured & Analytical": "productivity",
  "Supportive & Encouraging": "friendly",
  "Calm & Balanced": "therapist",
};

class OnboardingService {
  ensureConfigured() {
    if (!openaiService.isConfigured()) {
      const error = new Error(
        "OpenAI service not configured. Set OPENAI_API_KEY in .env",
      );
      error.statusCode = 503;
      throw error;
    }
  }

  mapPriorityLevel(priorityLevel) {
    const map = { LOW: 3, MEDIUM: 5, HIGH: 7, URGENT: 9 };
    return map[priorityLevel] ?? 5;
  }

  normalizeTime(value, fallback) {
    if (!value || typeof value !== "string") return fallback;
    const trimmed = value.trim();
    const match24 = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (match24) {
      return `${match24[1].padStart(2, "0")}:${match24[2]}`;
    }
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let hour = parseInt(match12[1], 10);
      const minute = match12[2];
      const period = match12[3].toUpperCase();
      if (period === "PM" && hour < 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      return `${String(hour).padStart(2, "0")}:${minute}`;
    }
    return fallback;
  }

  timeToMinutes(value) {
    const normalized = this.normalizeTime(value, null);
    if (!normalized) return null;
    const [h, m] = normalized.split(":").map(Number);
    return h * 60 + m;
  }

  minutesToTime(totalMinutes) {
    const mins = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  getDayWindow(settingsOrProfile = {}) {
    const start = this.normalizeTime(
      settingsOrProfile.dayStartTime || settingsOrProfile.wakeTime,
      "06:30",
    );
    let end = this.normalizeTime(
      settingsOrProfile.dayEndTime || settingsOrProfile.sleepTime,
      "22:30",
    );

    const startMin = this.timeToMinutes(start);
    let endMin = this.timeToMinutes(end);

    // If end is before/equal start, treat as next-day end but clamp within same calendar day window by pushing end to 23:59
    if (endMin <= startMin) {
      end = "23:59";
      endMin = this.timeToMinutes(end);
    }

    return { start, end, startMin, endMin };
  }

  clampTimeToWindow(time, window, fallbackToStart = true) {
    const fallback = fallbackToStart ? window.start : window.end;
    const minutes = this.timeToMinutes(time);
    if (minutes == null) return fallback;
    if (minutes < window.startMin) return window.start;
    if (minutes > window.endMin) return window.end;
    return this.minutesToTime(minutes);
  }

  clampPlacementTimes(placement, window) {
    const duration =
      typeof placement.estimatedMinutes === "number"
        ? Math.min(Math.max(placement.estimatedMinutes, 15), 180)
        : 45;

    let start = this.clampTimeToWindow(placement.startTime, window, true);
    let startMin = this.timeToMinutes(start);
    let endMin = startMin + duration;

    if (placement.endTime) {
      const rawEnd = this.timeToMinutes(placement.endTime);
      if (rawEnd != null && rawEnd > startMin) {
        endMin = rawEnd;
      }
    }

    if (endMin > window.endMin) {
      endMin = window.endMin;
      startMin = Math.max(window.startMin, endMin - duration);
      start = this.minutesToTime(startMin);
    }

    if (endMin <= startMin) {
      endMin = Math.min(window.endMin, startMin + 15);
    }

    return {
      ...placement,
      startTime: start,
      endTime: this.minutesToTime(endMin),
    };
  }

  async ensureSettings(userId) {
    let settings = await prisma.userSettings.findUnique({ where: { userId } });
    if (!settings) {
      settings = await prisma.userSettings.create({ data: { userId } });
    }
    return settings;
  }

  async getStatus(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        onboardingCompleted: true,
        onboardingStep: true,
        fullName: true,
        email: true,
      },
    });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const settings = await this.ensureSettings(userId);
    const pendingCount = await prisma.aiRecommendation.count({
      where: {
        userId,
        isApplied: false,
        isDismissed: false,
        type: { in: ONBOARDING_TYPES },
        reasoning: { contains: '"source":"ONBOARDING"' },
      },
    });

    return {
      onboardingCompleted: user.onboardingCompleted,
      onboardingStep: user.onboardingStep,
      pendingSuggestions: pendingCount,
      profile: {
        focusAreas: settings.focusAreas || [],
        primaryFocus: settings.primaryFocus || null,
        routineType: settings.routineType || null,
        dayStartTime: settings.wakeTime,
        dayEndTime: settings.sleepTime,
        aiCommunicationStyle: settings.aiCommunicationStyle || null,
        aiTone: settings.aiTone,
      },
      options: {
        focusAreas: FOCUS_AREAS,
        routineTypes: ROUTINE_TYPES,
        communicationStyles: COMMUNICATION_STYLES,
      },
    };
  }

  async saveStep(userId, payload = {}) {
    const {
      step,
      focusAreas,
      primaryFocus,
      routineType,
      dayStartTime,
      dayEndTime,
      aiCommunicationStyle,
      markStart,
    } = payload;

    await this.ensureSettings(userId);

    const settingsData = {};

    if (Array.isArray(focusAreas)) {
      const cleaned = [
        ...new Set(focusAreas.map((v) => String(v).trim()).filter(Boolean)),
      ];
      const invalid = cleaned.filter((v) => !FOCUS_AREAS.includes(v));
      if (invalid.length) {
        const error = new Error(
          `Invalid focusAreas: ${invalid.join(", ")}. Valid: ${FOCUS_AREAS.join(", ")}`,
        );
        error.statusCode = 400;
        throw error;
      }
      if (cleaned.length > 0 && cleaned.length < 2) {
        const error = new Error("Pick at least 2 focus areas");
        error.statusCode = 400;
        throw error;
      }
      settingsData.focusAreas = cleaned;
    }

    if (primaryFocus !== undefined) {
      if (primaryFocus && !FOCUS_AREAS.includes(primaryFocus)) {
        const error = new Error("Invalid primaryFocus");
        error.statusCode = 400;
        throw error;
      }
      settingsData.primaryFocus = primaryFocus || null;
    }

    if (routineType !== undefined) {
      if (routineType && !ROUTINE_TYPES.includes(routineType)) {
        const error = new Error(
          `Invalid routineType. Valid: ${ROUTINE_TYPES.join(", ")}`,
        );
        error.statusCode = 400;
        throw error;
      }
      settingsData.routineType = routineType || null;
    }

    if (dayStartTime !== undefined) {
      settingsData.wakeTime = this.normalizeTime(dayStartTime, "06:30");
    }
    if (dayEndTime !== undefined) {
      settingsData.sleepTime = this.normalizeTime(dayEndTime, "22:30");
    }

    if (aiCommunicationStyle !== undefined) {
      if (
        aiCommunicationStyle &&
        !COMMUNICATION_STYLES.includes(aiCommunicationStyle)
      ) {
        const error = new Error(
          `Invalid aiCommunicationStyle. Valid: ${COMMUNICATION_STYLES.join(", ")}`,
        );
        error.statusCode = 400;
        throw error;
      }
      settingsData.aiCommunicationStyle = aiCommunicationStyle || null;
      if (aiCommunicationStyle && STYLE_TO_TONE[aiCommunicationStyle]) {
        settingsData.aiTone = STYLE_TO_TONE[aiCommunicationStyle];
      }
    }

    if (Object.keys(settingsData).length > 0) {
      await prisma.userSettings.update({
        where: { userId },
        data: settingsData,
      });
    }

    const userData = {};
    if (typeof step === "number" && step >= 0 && step <= 5) {
      userData.onboardingStep = step;
    } else if (markStart) {
      userData.onboardingStep = Math.max(
        (
          await prisma.user.findUnique({
            where: { id: userId },
            select: { onboardingStep: true },
          })
        )?.onboardingStep || 0,
        1,
      );
    }

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: userData });
    }

    return this.getStatus(userId);
  }

  buildProfile(settings) {
    return {
      focusAreas: settings.focusAreas || [],
      primaryFocus: settings.primaryFocus,
      routineType: settings.routineType,
      dayStartTime: settings.wakeTime,
      dayEndTime: settings.sleepTime,
      aiCommunicationStyle: settings.aiCommunicationStyle,
      aiTone: settings.aiTone,
    };
  }

  normalizeGoal(raw, window) {
    const category = GOAL_CATEGORIES.includes(raw?.category)
      ? raw.category
      : "PERSONAL";
    const priorityLevel = PRIORITIES.includes(raw?.priorityLevel)
      ? raw.priorityLevel
      : "MEDIUM";
    return {
      title: String(raw?.title || "New goal").slice(0, 200),
      description: raw?.description ? String(raw.description).slice(0, 2000) : null,
      category,
      priorityLevel,
      targetDate: raw?.targetDate || null,
      proposedTasks: Array.isArray(raw?.proposedTasks)
        ? raw.proposedTasks
            .map((t) => this.normalizeTask(t, window))
            .filter(Boolean)
        : [],
      proposedHabits: Array.isArray(raw?.proposedHabits)
        ? raw.proposedHabits
            .map((h) => this.normalizeHabit(h, window))
            .filter(Boolean)
        : [],
    };
  }

  normalizeTask(raw, window) {
    if (!raw?.title) return null;
    const dueTime = raw.dueTime
      ? this.clampTimeToWindow(raw.dueTime, window, true)
      : null;
    return {
      title: String(raw.title).slice(0, 200),
      description: raw.description
        ? String(raw.description).slice(0, 2000)
        : null,
      priority: PRIORITIES.includes(raw.priority) ? raw.priority : "MEDIUM",
      category: GOAL_CATEGORIES.includes(raw.category) ? raw.category : "PERSONAL",
      estimatedMinutes:
        typeof raw.estimatedMinutes === "number"
          ? Math.min(Math.max(raw.estimatedMinutes, 5), 480)
          : 30,
      dueDate: raw.dueDate || null,
      dueTime,
    };
  }

  normalizeHabit(raw, window) {
    if (!raw?.name && !raw?.title) return null;
    return {
      name: String(raw.name || raw.title).slice(0, 200),
      description: raw.description
        ? String(raw.description).slice(0, 2000)
        : null,
      category: HABIT_CATEGORIES.includes(raw.category)
        ? raw.category
        : "PERSONAL",
      frequency: HABIT_FREQUENCIES.includes(raw.frequency)
        ? raw.frequency
        : "DAILY",
      difficulty: HABIT_DIFFICULTIES.includes(raw.difficulty)
        ? raw.difficulty
        : "MEDIUM",
      targetDays: Array.isArray(raw.targetDays) ? raw.targetDays : [],
      targetTimesPerDay:
        typeof raw.targetTimesPerDay === "number"
          ? Math.min(Math.max(raw.targetTimesPerDay, 1), 10)
          : 1,
      reminderTime: this.clampTimeToWindow(
        raw.reminderTime || window.start,
        window,
        true,
      ),
    };
  }

  formatSuggestion(row) {
    let payload = {};
    try {
      payload = JSON.parse(row.reasoning || "{}");
    } catch {
      payload = {};
    }

    const status = row.isApplied
      ? "applied"
      : row.isDismissed
        ? "dismissed"
        : "pending";

    return {
      suggestionId: row.id,
      type: row.type,
      title: row.title,
      message: row.description,
      status,
      isApplied: row.isApplied,
      isDismissed: row.isDismissed,
      batchId: payload.batchId || null,
      source: payload.source || null,
      proposedGoal: payload.proposedGoal || null,
      proposedTask: payload.proposedTask || null,
      proposedHabit: payload.proposedHabit || null,
      proposedTasks: payload.proposedTasks || [],
      proposedHabits: payload.proposedHabits || [],
      planner: payload.planner || null,
      createdEntityId: payload.createdEntityId || null,
      createdAt: row.createdAt,
      appliedAt: row.appliedAt,
      dismissedAt: row.dismissedAt,
    };
  }

  async createRecommendation(userId, type, title, message, reasoning, priority = 8) {
    const recommendation = await prisma.aiRecommendation.create({
      data: {
        userId,
        type,
        title,
        description: message,
        reasoning: JSON.stringify(reasoning),
        priority,
        isApplied: false,
        isDismissed: false,
      },
    });

    const withId = { ...reasoning, suggestionId: recommendation.id };
    await prisma.aiRecommendation.update({
      where: { id: recommendation.id },
      data: { reasoning: JSON.stringify(withId) },
    });

    return this.formatSuggestion({
      ...recommendation,
      reasoning: JSON.stringify(withId),
    });
  }

  async generatePlan(userId) {
    this.ensureConfigured();

    const settings = await this.ensureSettings(userId);
    const profile = this.buildProfile(settings);

    if (!profile.focusAreas?.length) {
      const error = new Error(
        "Complete onboarding focus areas before generating a plan",
      );
      error.statusCode = 400;
      throw error;
    }

    // Dismiss previous pending onboarding suggestions
    await prisma.aiRecommendation.updateMany({
      where: {
        userId,
        isApplied: false,
        isDismissed: false,
        type: { in: ONBOARDING_TYPES },
        reasoning: { contains: '"source":"ONBOARDING"' },
      },
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
      },
    });

    const ai = await openaiService.generateOnboardingPlan(profile);
    const batchId = randomUUID();
    const suggestions = [];
    const window = this.getDayWindow(profile);

    for (const rawGoal of ai.goals || []) {
      const goal = this.normalizeGoal(rawGoal, window);
      suggestions.push(
        await this.createRecommendation(
          userId,
          "GOAL",
          goal.title,
          `AI suggested based on your profile`,
          {
            source: "ONBOARDING",
            batchId,
            dayWindow: { start: window.start, end: window.end },
            proposedGoal: {
              title: goal.title,
              description: goal.description,
              category: goal.category,
              priorityLevel: goal.priorityLevel,
              targetDate: goal.targetDate,
            },
            proposedTasks: goal.proposedTasks,
            proposedHabits: goal.proposedHabits,
          },
          9,
        ),
      );
    }

    for (const rawTask of ai.tasks || []) {
      const task = this.normalizeTask(rawTask, window);
      if (!task) continue;
      suggestions.push(
        await this.createRecommendation(
          userId,
          "TASK",
          task.title,
          "AI suggested based on your profile",
          {
            source: "ONBOARDING",
            batchId,
            dayWindow: { start: window.start, end: window.end },
            proposedTask: task,
          },
          7,
        ),
      );
    }

    for (const rawHabit of ai.habits || []) {
      const habit = this.normalizeHabit(rawHabit, window);
      if (!habit) continue;
      suggestions.push(
        await this.createRecommendation(
          userId,
          "HABIT",
          habit.name,
          "AI suggested based on your profile",
          {
            source: "ONBOARDING",
            batchId,
            dayWindow: { start: window.start, end: window.end },
            proposedHabit: habit,
          },
          7,
        ),
      );
    }

    if (ai.planner) {
      const plannerDate =
        ai.planner.date || new Date().toISOString().slice(0, 10);
      const placements = Array.isArray(ai.planner.placements)
        ? ai.planner.placements.map((p, index) =>
            this.clampPlacementTimes(
              {
                itemType: p.itemType === "HABIT" ? "HABIT" : "TASK",
                title: p.title || p.name || `Item ${index + 1}`,
                startTime: p.startTime || null,
                endTime: p.endTime || null,
                estimatedMinutes: p.estimatedMinutes,
                orderIndex: p.orderIndex ?? index,
                date: p.date || plannerDate,
              },
              window,
            ),
          )
        : [];

      suggestions.push(
        await this.createRecommendation(
          userId,
          "PLAN_ADJUSTMENT",
          "Suggested daily plan",
          ai.planner.message ||
            "I've built a suggested plan for your day based on your tasks, habits, and priorities.",
          {
            source: "ONBOARDING",
            batchId,
            dayWindow: { start: window.start, end: window.end },
            action: "GENERATE_PLAN",
            viewType: "DAILY",
            date: plannerDate,
            planner: {
              date: plannerDate,
              message: ai.planner.message || null,
              placements,
            },
            placements,
          },
          8,
        ),
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 5,
      },
    });

    const byType = {
      GOAL: suggestions.filter((s) => s.type === "GOAL"),
      TASK: suggestions.filter((s) => s.type === "TASK"),
      HABIT: suggestions.filter((s) => s.type === "HABIT"),
      PLAN_ADJUSTMENT: suggestions.filter((s) => s.type === "PLAN_ADJUSTMENT"),
    };

    return {
      batchId,
      tokensUsed: ai.tokensUsed || null,
      count: suggestions.length,
      byType: {
        goals: byType.GOAL.length,
        tasks: byType.TASK.length,
        habits: byType.HABIT.length,
        planner: byType.PLAN_ADJUSTMENT.length,
      },
      suggestions,
      status: await this.getStatus(userId),
    };
  }

  async listSuggestions(userId, { status = "pending", type } = {}) {
    const where = {
      userId,
      type: type ? type : { in: ONBOARDING_TYPES },
      reasoning: { contains: '"source":"ONBOARDING"' },
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
        "Invalid status. Use pending, applied, dismissed, or all",
      );
      error.statusCode = 400;
      throw error;
    }

    if (type && !ONBOARDING_TYPES.includes(type)) {
      const error = new Error(
        `Invalid type. Use ${ONBOARDING_TYPES.join(", ")}`,
      );
      error.statusCode = 400;
      throw error;
    }

    const rows = await prisma.aiRecommendation.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    const suggestions = rows.map((row) => this.formatSuggestion(row));

    return {
      status,
      type: type || "ALL",
      count: suggestions.length,
      suggestions,
    };
  }

  async getPendingRecommendation(suggestionId, userId) {
    const recommendation = await prisma.aiRecommendation.findFirst({
      where: {
        id: suggestionId,
        userId,
        isApplied: false,
        isDismissed: false,
        type: { in: ONBOARDING_TYPES },
      },
    });

    if (!recommendation) {
      const error = new Error("Suggestion not found or already handled");
      error.statusCode = 404;
      throw error;
    }

    let payload;
    try {
      payload = JSON.parse(recommendation.reasoning || "{}");
    } catch {
      const error = new Error("Invalid suggestion data");
      error.statusCode = 400;
      throw error;
    }

    if (payload.source !== "ONBOARDING") {
      const error = new Error("Not an onboarding suggestion");
      error.statusCode = 400;
      throw error;
    }

    return { recommendation, payload };
  }

  async acceptSuggestion(suggestionId, userId) {
    const { recommendation, payload } = await this.getPendingRecommendation(
      suggestionId,
      userId,
    );

    let created = null;

    if (recommendation.type === "GOAL") {
      created = await this.acceptGoal(userId, payload);
    } else if (recommendation.type === "TASK") {
      created = await this.acceptTask(userId, payload.proposedTask);
    } else if (recommendation.type === "HABIT") {
      created = await this.acceptHabit(userId, payload.proposedHabit);
    } else if (recommendation.type === "PLAN_ADJUSTMENT") {
      created = await this.acceptPlanner(userId, payload);
    } else {
      const error = new Error("Unsupported suggestion type");
      error.statusCode = 400;
      throw error;
    }

    await prisma.aiRecommendation.update({
      where: { id: suggestionId },
      data: {
        isApplied: true,
        appliedAt: new Date(),
        reasoning: JSON.stringify({
          ...payload,
          createdEntityId: created?.id || created?.goalId || null,
          created,
        }),
      },
    });

    return {
      suggestionId,
      type: recommendation.type,
      message: `${recommendation.type} accepted`,
      created,
    };
  }

  async acceptGoal(userId, payload) {
    const settings = await this.ensureSettings(userId);
    const window = this.getDayWindow(settings);
    const proposedGoal = payload.proposedGoal || {};
    const proposedTasks = (payload.proposedTasks || []).map((t) =>
      this.normalizeTask(t, window),
    );
    const proposedHabits = (payload.proposedHabits || []).map((h) =>
      this.normalizeHabit(h, window),
    );

    const goal = await prisma.goal.create({
      data: {
        userId,
        title: proposedGoal.title || "New goal",
        description: proposedGoal.description || null,
        category: GOAL_CATEGORIES.includes(proposedGoal.category)
          ? proposedGoal.category
          : "PERSONAL",
        priorityLevel: PRIORITIES.includes(proposedGoal.priorityLevel)
          ? proposedGoal.priorityLevel
          : "MEDIUM",
        priority: this.mapPriorityLevel(proposedGoal.priorityLevel),
        targetDate: proposedGoal.targetDate
          ? new Date(proposedGoal.targetDate)
          : null,
        source: "AI",
        isMainFocus: false,
      },
    });

    const createdTasks = [];
    for (const task of proposedTasks) {
      if (!task) continue;
      const created = await prisma.task.create({
        data: {
          userId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          category: task.category,
          estimatedMinutes: task.estimatedMinutes,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          dueTime: task.dueTime || null,
          goalId: goal.id,
          aiGenerated: true,
          source: "AI_GENERATED",
        },
      });
      createdTasks.push(created);
    }

    const createdHabits = [];
    for (const habit of proposedHabits) {
      if (!habit) continue;
      const created = await prisma.habit.create({
        data: {
          userId,
          name: habit.name,
          description: habit.description,
          category: habit.category,
          frequency: habit.frequency,
          difficulty: habit.difficulty,
          targetDays: habit.targetDays,
          targetTimesPerDay: habit.targetTimesPerDay,
          reminderTime: habit.reminderTime,
          goalId: goal.id,
          aiSuggested: true,
          source: "AI",
          status: "ACTIVE",
          isActive: true,
        },
      });
      createdHabits.push(created);
    }

    return {
      id: goal.id,
      goal,
      tasks: createdTasks,
      habits: createdHabits,
    };
  }

  async acceptTask(userId, proposedTask) {
    const settings = await this.ensureSettings(userId);
    const window = this.getDayWindow(settings);
    const task = this.normalizeTask(proposedTask, window);
    if (!task) {
      const error = new Error("Invalid proposed task");
      error.statusCode = 400;
      throw error;
    }

    return prisma.task.create({
      data: {
        userId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        estimatedMinutes: task.estimatedMinutes,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        dueTime: task.dueTime || null,
        aiGenerated: true,
        source: "AI_GENERATED",
      },
    });
  }

  async acceptHabit(userId, proposedHabit) {
    const settings = await this.ensureSettings(userId);
    const window = this.getDayWindow(settings);
    const habit = this.normalizeHabit(proposedHabit, window);
    if (!habit) {
      const error = new Error("Invalid proposed habit");
      error.statusCode = 400;
      throw error;
    }

    return prisma.habit.create({
      data: {
        userId,
        name: habit.name,
        description: habit.description,
        category: habit.category,
        frequency: habit.frequency,
        difficulty: habit.difficulty,
        targetDays: habit.targetDays,
        targetTimesPerDay: habit.targetTimesPerDay,
        reminderTime: habit.reminderTime,
        aiSuggested: true,
        source: "AI",
        status: "ACTIVE",
        isActive: true,
      },
    });
  }

  async acceptPlanner(userId, payload) {
    const settings = await this.ensureSettings(userId);
    const window = this.getDayWindow(settings);
    const placements = payload.placements || payload.planner?.placements || [];
    const date =
      payload.date ||
      payload.planner?.date ||
      new Date().toISOString().slice(0, 10);

    const resolved = [];

    for (const [index, placement] of placements.entries()) {
      const clamped = this.clampPlacementTimes(placement, window);
      const itemType = clamped.itemType === "HABIT" ? "HABIT" : "TASK";
      let taskId = clamped.taskId || null;
      let habitId = clamped.habitId || null;

      if (itemType === "TASK" && !taskId) {
        const task = await prisma.task.create({
          data: {
            userId,
            title: clamped.title || `Planned task ${index + 1}`,
            description: clamped.description || null,
            priority: "MEDIUM",
            estimatedMinutes: 30,
            dueDate: new Date(date),
            dueTime: clamped.startTime || null,
            aiGenerated: true,
            source: "AI_GENERATED",
          },
        });
        taskId = task.id;
      }

      if (itemType === "HABIT" && !habitId) {
        const habit = await prisma.habit.create({
          data: {
            userId,
            name:
              clamped.title ||
              clamped.name ||
              `Planned habit ${index + 1}`,
            description: clamped.description || null,
            category: "PERSONAL",
            frequency: "DAILY",
            difficulty: "MEDIUM",
            reminderTime: clamped.startTime || window.start,
            aiSuggested: true,
            source: "AI",
            status: "ACTIVE",
            isActive: true,
          },
        });
        habitId = habit.id;
      }

      resolved.push({
        itemType,
        taskId: itemType === "TASK" ? taskId : null,
        habitId: itemType === "HABIT" ? habitId : null,
        date,
        startTime: clamped.startTime || null,
        endTime: clamped.endTime || null,
        orderIndex: clamped.orderIndex ?? index,
      });
    }

    if (!resolved.length) {
      const error = new Error("Planner suggestion has no placements");
      error.statusCode = 400;
      throw error;
    }

    const created = await plannerService.bulkSchedule(userId, resolved, {
      viewType: "DAILY",
      aiScheduled: true,
    });

    return {
      id: created.items?.[0]?.id || null,
      date,
      dayWindow: { start: window.start, end: window.end },
      count: created.count,
      items: created.items,
    };
  }

  async dismissSuggestion(suggestionId, userId) {
    const { recommendation } = await this.getPendingRecommendation(
      suggestionId,
      userId,
    );

    await prisma.aiRecommendation.update({
      where: { id: suggestionId },
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
      },
    });

    return {
      suggestionId,
      type: recommendation.type,
      message: "Suggestion dismissed",
    };
  }

  async regenerateSuggestion(suggestionId, userId) {
    this.ensureConfigured();

    const { recommendation, payload } = await this.getPendingRecommendation(
      suggestionId,
      userId,
    );

    if (recommendation.type === "PLAN_ADJUSTMENT") {
      const error = new Error(
        "Planner suggestions only support accept or dismiss",
      );
      error.statusCode = 400;
      throw error;
    }

    const settings = await this.ensureSettings(userId);
    const profile = this.buildProfile(settings);
    const window = this.getDayWindow(profile);
    const previousTitle = recommendation.title;

    await prisma.aiRecommendation.update({
      where: { id: suggestionId },
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
      },
    });

    const regenerated = await openaiService.regenerateOnboardingItem(
      recommendation.type,
      profile,
      previousTitle,
    );

    const batchId = payload.batchId || randomUUID();
    const dayWindow = { start: window.start, end: window.end };

    if (recommendation.type === "GOAL") {
      const goal = this.normalizeGoal(regenerated.goal || regenerated, window);
      return this.createRecommendation(
        userId,
        "GOAL",
        goal.title,
        "Regenerated AI suggestion based on your profile",
        {
          source: "ONBOARDING",
          batchId,
          dayWindow,
          regeneratedFrom: suggestionId,
          proposedGoal: {
            title: goal.title,
            description: goal.description,
            category: goal.category,
            priorityLevel: goal.priorityLevel,
            targetDate: goal.targetDate,
          },
          proposedTasks: goal.proposedTasks,
          proposedHabits: goal.proposedHabits,
        },
        9,
      );
    }

    if (recommendation.type === "TASK") {
      const task = this.normalizeTask(regenerated.task || regenerated, window);
      if (!task) {
        const error = new Error("Failed to regenerate task suggestion");
        error.statusCode = 500;
        throw error;
      }
      return this.createRecommendation(
        userId,
        "TASK",
        task.title,
        "Regenerated AI suggestion based on your profile",
        {
          source: "ONBOARDING",
          batchId,
          dayWindow,
          regeneratedFrom: suggestionId,
          proposedTask: task,
        },
        7,
      );
    }

    const habit = this.normalizeHabit(regenerated.habit || regenerated, window);
    if (!habit) {
      const error = new Error("Failed to regenerate habit suggestion");
      error.statusCode = 500;
      throw error;
    }

    return this.createRecommendation(
      userId,
      "HABIT",
      habit.name,
      "Regenerated AI suggestion based on your profile",
      {
        source: "ONBOARDING",
        batchId,
        dayWindow,
        regeneratedFrom: suggestionId,
        proposedHabit: habit,
      },
      7,
    );
  }
}

module.exports = new OnboardingService();
