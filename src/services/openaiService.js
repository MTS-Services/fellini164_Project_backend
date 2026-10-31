const OpenAI = require("openai");
const { resolveHabitWeekSchedule } = require("../utils/habitSchedule");

class OpenAIService {
  constructor() {
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    this._apiKey = null;
    this.client = null;
    this.refreshClient();
  }

  refreshClient() {
    if (process.env.NODE_ENV !== "production") {
      require("dotenv").config({ override: true });
    }

    this.model = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();

    const apiKey = (process.env.OPENAI_API_KEY || "").trim();

    if (!apiKey || apiKey === "your_openai_api_key_here") {
      if (this.client) {
        console.warn(
          "⚠️  WARNING: OPENAI_API_KEY not configured. OpenAI features will not work.",
        );
      }
      this.client = null;
      this._apiKey = null;
      return;
    }

    if (this._apiKey !== apiKey) {
      this.client = new OpenAI({ apiKey });
      this._apiKey = apiKey;
      console.log("✅ OpenAI service initialized successfully");
    }
  }

  isConfigured() {
    this.refreshClient();
    return this.client !== null;
  }

  async chat(messages, options = {}) {
    this.refreshClient();

    if (!this.client) {
      throw new Error(
        "OpenAI service not configured. Please set OPENAI_API_KEY in .env file",
      );
    }

    const { model, temperature, max_tokens, response_format, ...restOptions } =
      options;

    try {
      const completion = await this.client.chat.completions.create({
        model: model || this.model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 1500,
        ...(response_format ? { response_format } : {}),
        ...restOptions,
      });

      return {
        success: true,
        content: completion.choices[0].message.content,
        model: completion.model,
        usage: completion.usage,
      };
    } catch (error) {
      console.error("OpenAI Service Error:", error.message);

      if (error.status === 401) {
        throw new Error(
          "Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env file",
        );
      }

      if (error.status === 429) {
        const raw = String(error.message || "");
        const code = error.code || error.error?.code;
        const noCredits =
          code === "insufficient_quota" ||
          /no credits|insufficient.?quota|billing/i.test(raw);

        if (noCredits) {
          const err = new Error(
            "OpenAI account has no credits remaining. Add billing credits at https://platform.openai.com/settings/organization/billing then retry.",
          );
          err.statusCode = 402;
          throw err;
        }

        const err = new Error(
          "OpenAI rate limit exceeded. Please wait a minute and try again.",
        );
        err.statusCode = 429;
        throw err;
      }

      throw new Error(`OpenAI generation failed: ${error.message}`);
    }
  }

  parseAiJson(content) {
    let text = (content || "").trim();
    text = text
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();

    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error("Failed to parse AI response as JSON");
    }
  }

  formatGoalForAi(goal) {
    return {
      title: goal.title,
      description: goal.description || "",
      category: goal.category,
      priorityLevel: goal.priorityLevel || "MEDIUM",
      targetDate: goal.targetDate
        ? new Date(goal.targetDate).toISOString().split("T")[0]
        : null,
    };
  }

  /**
   * Ensure goal targetDate is a real future date (never a stale sample / past date).
   */
  ensureFutureTargetDate(rawDate, { minDays = 7, maxDays = 90 } = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + minDays);

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + maxDays);

    let candidate = rawDate ? new Date(rawDate) : null;
    if (!candidate || Number.isNaN(candidate.getTime())) {
      candidate = new Date(minDate);
      candidate.setDate(candidate.getDate() + 23); // ~30 days out default
    }

    candidate.setHours(0, 0, 0, 0);

    if (candidate <= today || candidate < minDate) {
      candidate = new Date(minDate);
      candidate.setDate(candidate.getDate() + 23);
    }

    if (candidate > maxDate) {
      candidate = new Date(maxDate);
    }

    return candidate.toISOString().split("T")[0];
  }

  /**
   * Local calendar YYYY-MM-DD (avoids UTC day shift from toISOString).
   */
  toLocalDateString(date = new Date()) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /**
   * Task due dates may be today, but never before today.
   * Past / invalid AI dates are clamped to today (YYYY-MM-DD).
   */
  ensureDueDateNotBeforeToday(rawDate) {
    if (rawDate === undefined || rawDate === null || rawDate === "") {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = this.toLocalDateString(today);

    const candidate = new Date(rawDate);
    if (Number.isNaN(candidate.getTime())) {
      return todayStr;
    }

    candidate.setHours(0, 0, 0, 0);
    if (candidate < today) {
      return todayStr;
    }

    return this.toLocalDateString(candidate);
  }

  /**
   * Task due dates must be today or a future day (never past).
   * Past / invalid / missing → today + preferDaysOut (default tomorrow).
   */
  ensureFutureDueDate(rawDate, { preferDaysOut = 1 } = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fallback = new Date(today);
    fallback.setDate(fallback.getDate() + Math.max(0, preferDaysOut));
    const fallbackStr = this.toLocalDateString(fallback);

    if (rawDate === undefined || rawDate === null || rawDate === "") {
      return fallbackStr;
    }

    const candidate = new Date(rawDate);
    if (Number.isNaN(candidate.getTime())) {
      return fallbackStr;
    }

    candidate.setHours(0, 0, 0, 0);
    if (candidate < today) {
      return fallbackStr;
    }

    return this.toLocalDateString(candidate);
  }

  /**
   * Priority from dueDate (Goals / Tasks rules):
   * Overdue → HIGH, Due Today → URGENT, Due Tomorrow → MEDIUM, Due in 2–3 days → LOW
   */
  resolvePriorityFromDueDate(dueDate) {
    if (!dueDate) return null;

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return null;
    due.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const in2Start = new Date(today);
    in2Start.setDate(in2Start.getDate() + 2);
    const in3End = new Date(today);
    in3End.setDate(in3End.getDate() + 3);
    in3End.setHours(23, 59, 59, 999);

    if (due < today) return "HIGH";
    if (due >= today && due <= todayEnd) return "URGENT";
    if (due >= tomorrowStart && due <= tomorrowEnd) return "MEDIUM";
    if (due >= in2Start && due <= in3End) return "LOW";
    return null;
  }

  /**
   * Keep task dueDate on/after today and on/before linked goal targetDate when present.
   */
  alignTaskDueDateWithGoal(
    rawDate,
    linkedGoal = null,
    { preferDaysOut = 2 } = {},
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let due = this.ensureDueDateNotBeforeToday(rawDate);

    // If AI omitted a date, pick a sensible upcoming default (not forced to today)
    if (!due) {
      const fallback = new Date(today);
      fallback.setDate(fallback.getDate() + preferDaysOut);
      due = this.toLocalDateString(fallback);
    }

    const goalTarget = linkedGoal?.targetDate
      ? new Date(linkedGoal.targetDate)
      : null;

    if (goalTarget && !Number.isNaN(goalTarget.getTime())) {
      goalTarget.setHours(0, 0, 0, 0);
      const dueDate = new Date(due);
      dueDate.setHours(0, 0, 0, 0);

      // Never schedule the task after the goal's target date
      if (goalTarget >= today && dueDate > goalTarget) {
        due = this.toLocalDateString(goalTarget);
      }

      // If goal is soon (within 3 days), keep the task within that window
      const daysToGoal = Math.round(
        (goalTarget.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (daysToGoal >= 0 && daysToGoal <= 3 && dueDate > goalTarget) {
        due = this.toLocalDateString(goalTarget);
      }
    }

    return due;
  }

  normalizeImprovedGoal(parsed, existingGoal) {
    const existing = this.formatGoalForAi(existingGoal);

    if (!parsed?.title?.trim() || !parsed?.description?.trim()) {
      throw new Error("AI response missing required goal fields");
    }

    const validCategories = [
      "CAREER",
      "HEALTH",
      "FINANCE",
      "PERSONAL",
      "EDUCATION",
    ];
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

    const category = validCategories.includes(parsed.category)
      ? parsed.category
      : existing.category;

    const priorityLevel = validPriorities.includes(parsed.priorityLevel)
      ? parsed.priorityLevel
      : existing.priorityLevel;

    return {
      title: parsed.title.trim(),
      description: parsed.description.trim(),
      category,
      priorityLevel,
      targetDate: this.ensureFutureTargetDate(
        parsed.targetDate || existing.targetDate,
      ),
    };
  }

  formatTaskForAi(task) {
    return {
      title: task.title,
      description: task.description || "",
      category: task.category,
      priority: task.priority || "MEDIUM",
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : null,
      dueTime: task.dueTime || null,
      estimatedMinutes: task.estimatedMinutes ?? null,
      status: task.status,
      tags: task.tags || [],
      goalTitle: task.goal?.title || null,
    };
  }

  normalizeImprovedTask(parsed, existingTask) {
    const existing = this.formatTaskForAi(existingTask);

    if (!parsed?.title?.trim() || !parsed?.description?.trim()) {
      throw new Error("AI response missing required task fields");
    }

    const validCategories = [
      "CAREER",
      "HEALTH",
      "FINANCE",
      "PERSONAL",
      "EDUCATION",
    ];
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

    const category = validCategories.includes(parsed.category)
      ? parsed.category
      : existing.category;

    const priority = validPriorities.includes(parsed.priority)
      ? parsed.priority
      : existing.priority;

    let dueDate = existing.dueDate;
    if (parsed.dueDate) {
      const parsedDate = new Date(parsed.dueDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        dueDate = parsedDate.toISOString().split("T")[0];
      }
    } else if (parsed.dueDate === null) {
      dueDate = null;
    }

    const estimatedMinutes =
      parsed.estimatedMinutes != null
        ? Number(parsed.estimatedMinutes)
        : existing.estimatedMinutes;

    return {
      title: parsed.title.trim(),
      description: parsed.description.trim(),
      category,
      priority,
      dueDate,
      dueTime: parsed.dueTime ?? existing.dueTime,
      estimatedMinutes: Number.isFinite(estimatedMinutes)
        ? estimatedMinutes
        : existing.estimatedMinutes,
    };
  }

  formatHabitForAi(habit) {
    return {
      name: habit.name,
      description: habit.description || "",
      category: habit.category,
      frequency: habit.frequency || "DAILY",
      difficulty: habit.difficulty || "MEDIUM",
      targetDays: habit.targetDays || [],
      targetTimesPerDay: habit.targetTimesPerDay ?? 1,
      reminderTime: habit.reminderTime || null,
      startDate: habit.startDate || null,
      endDate: habit.endDate || null,
      status: habit.status,
      currentStreak: habit.currentStreak || 0,
      goalTitle: habit.goal?.title || null,
    };
  }

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

  getWeekDays() {
    return [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ];
  }

  timeToMinutes(value) {
    if (!value || typeof value !== "string") return null;
    const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }

  minutesToTime(totalMinutes) {
    const mins = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  getNowMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  /**
   * Random 3-5 weekdays (may include Sat/Sun). Never force Mon-Fri only.
   */
  pickRandomHabitTargetDays(rawDays) {
    const weekDays = this.getWeekDays();
    const cleaned = (Array.isArray(rawDays) ? rawDays : [])
      .map((d) =>
        String(d || "")
          .toUpperCase()
          .trim(),
      )
      .filter((d) => weekDays.includes(d));
    const unique = [...new Set(cleaned)];

    const isFixedWeekdaysOnly =
      unique.length === 5 &&
      ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].every((d) =>
        unique.includes(d),
      ) &&
      !unique.includes("SATURDAY") &&
      !unique.includes("SUNDAY");

    if (
      unique.length >= 3 &&
      unique.length <= 5 &&
      !isFixedWeekdaysOnly &&
      unique.length < 7
    ) {
      return unique.sort((a, b) => weekDays.indexOf(a) - weekDays.indexOf(b));
    }

    const pool = [...weekDays];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const count = 3 + Math.floor(Math.random() * 3); // 3-5
    let picked = pool.slice(0, count);

    // Prefer variety: if result is still Mon-Fri only, swap one in for a weekend day
    const pickedSet = new Set(picked);
    const weekdaysOnly = [...pickedSet].every((d) =>
      ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(d),
    );
    if (weekdaysOnly) {
      const weekend = Math.random() < 0.5 ? "SATURDAY" : "SUNDAY";
      picked[picked.length - 1] = weekend;
      picked = [...new Set(picked)];
    }

    return picked.sort((a, b) => weekDays.indexOf(a) - weekDays.indexOf(b));
  }

  /**
   * reminderTime must be after now, not a fixed 08:00, and avoid busy slots.
   */
  ensureReminderTimeAfterNow(rawTime, { busyTimes = [] } = {}) {
    const nowMin = this.getNowMinutes();
    const minAllowed = Math.min(nowMin + 15, 23 * 60 + 45);
    const busy = new Set(
      (busyTimes || [])
        .map((t) => this.timeToMinutes(t))
        .filter((m) => m != null),
    );

    let candidate = this.timeToMinutes(rawTime);
    const looksLikeDefaultSample = rawTime === "08:00" || rawTime === "8:00";

    // Reject missing, past, or fixed sample times
    if (candidate == null || candidate <= nowMin || looksLikeDefaultSample) {
      candidate = minAllowed + Math.floor(Math.random() * 8) * 15;
    }

    if (candidate <= nowMin) {
      candidate = minAllowed;
    }

    // Find a free slot after now (15-min steps)
    let attempts = 0;
    while (busy.has(candidate) && attempts < 48) {
      candidate += 15;
      if (candidate >= 24 * 60) {
        candidate = minAllowed;
      }
      if (candidate <= nowMin) {
        candidate = minAllowed;
      }
      attempts += 1;
    }

    if (candidate >= 24 * 60) {
      candidate = 23 * 60 + 45;
    }

    return this.minutesToTime(candidate);
  }

  /**
   * When dueDate is set, always provide a dueTime.
   * Today → after now. Future day → AI time or a varied daytime default.
   */
  pickVariedDaytimeSlot(seed = "") {
    const slots = [
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "13:00",
      "13:30",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
    ];
    const key = `${seed}-${Date.now()}-${Math.random()}`;
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return slots[hash % slots.length];
  }

  ensureDueTimeForDueDate(rawTime, dueDate, { seed = "" } = {}) {
    if (!dueDate) return rawTime || null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return rawTime || null;
    due.setHours(0, 0, 0, 0);

    if (due.getTime() === today.getTime()) {
      return this.ensureReminderTimeAfterNow(rawTime);
    }

    const sampleDefaults = new Set([
      "08:00",
      "8:00",
      "09:00",
      "9:00",
      "14:00",
    ]);
    const normalized = typeof rawTime === "string" ? rawTime.trim() : rawTime;
    const candidate = this.timeToMinutes(normalized);
    if (!normalized || sampleDefaults.has(String(normalized)) || candidate == null) {
      return this.pickVariedDaytimeSlot(seed || String(dueDate));
    }

    return this.minutesToTime(candidate);
  }

  /**
   * Derive effort fields from priority / due urgency so AI tasks
   * are not stuck on estimatedMinutes=30, difficulty=5, energy=medium.
   */
  normalizeGeneratedTaskEffort({
    priority,
    dueDate,
    estimatedMinutes,
    difficultyLevel,
    energyLevelRequired,
    title = "",
  } = {}) {
    const due = dueDate ? new Date(dueDate) : null;
    let resolvedPriority = ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)
      ? priority
      : "MEDIUM";

    if (due && !Number.isNaN(due.getTime())) {
      due.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayDiff = Math.round(
        (due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (dayDiff === 0) resolvedPriority = "URGENT";
      else if (dayDiff === 1) resolvedPriority = "MEDIUM";
      else if (dayDiff >= 2 && dayDiff <= 3) resolvedPriority = "LOW";
    }

    const profiles = {
      URGENT: {
        minutes: [45, 60, 75, 90],
        difficulty: [7, 8, 9],
        energy: ["high", "high", "medium"],
      },
      HIGH: {
        minutes: [40, 55, 70, 85],
        difficulty: [6, 7, 8],
        energy: ["high", "medium"],
      },
      MEDIUM: {
        minutes: [25, 35, 45, 60],
        difficulty: [4, 5, 6],
        energy: ["medium", "medium", "low"],
      },
      LOW: {
        minutes: [15, 20, 30, 40],
        difficulty: [2, 3, 4],
        energy: ["low", "low", "medium"],
      },
    };

    const profile = profiles[resolvedPriority] || profiles.MEDIUM;
    let hash = 0;
    const seed = `${title}|${resolvedPriority}|${dueDate || ""}`;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }

    const pick = (arr) => arr[hash % arr.length];

    const rawMinutes = Number(estimatedMinutes);
    const rawDifficulty = Number(difficultyLevel);
    const rawEnergy = String(energyLevelRequired || "")
      .toLowerCase()
      .trim();

    const looksLikeSampleMinutes = !Number.isFinite(rawMinutes) || rawMinutes === 30;
    const looksLikeSampleDifficulty =
      !Number.isFinite(rawDifficulty) || rawDifficulty === 5;
    const looksLikeSampleEnergy =
      !rawEnergy || rawEnergy === "medium";

    // If AI returned the classic sample trio, replace all from priority profile
    const forceProfile =
      looksLikeSampleMinutes &&
      looksLikeSampleDifficulty &&
      looksLikeSampleEnergy;

    let minutes = forceProfile || looksLikeSampleMinutes
      ? pick(profile.minutes)
      : Math.min(Math.max(Math.round(rawMinutes), 5), 240);

    let difficulty = forceProfile || looksLikeSampleDifficulty
      ? pick(profile.difficulty)
      : Math.min(Math.max(Math.round(rawDifficulty), 1), 10);

    let energy = forceProfile || looksLikeSampleEnergy
      ? pick(profile.energy)
      : ["low", "medium", "high"].includes(rawEnergy)
        ? rawEnergy
        : pick(profile.energy);

    // Nudge longer tasks slightly harder
    if (minutes >= 75 && difficulty < 7) difficulty += 1;
    if (minutes <= 20 && difficulty > 4) difficulty -= 1;

    return {
      priority: resolvedPriority,
      estimatedMinutes: minutes,
      difficultyLevel: difficulty,
      energyLevelRequired: energy,
    };
  }

  normalizeImprovedHabit(parsed, existingHabit, options = {}) {
    const existing = this.formatHabitForAi(existingHabit);

    if (!parsed?.name?.trim() || !parsed?.description?.trim()) {
      throw new Error("AI response missing required habit fields");
    }

    const validCategories = [
      "CAREER",
      "HEALTH",
      "FINANCE",
      "FITNESS",
      "WELLNESS",
      "PRODUCTIVITY",
      "PERSONAL",
      "EDUCATION",
    ];
    const validFrequencies = ["DAILY", "WEEKLY", "MONTHLY"];
    const validDifficulties = ["EASY", "MEDIUM", "HARD"];

    const targetTimesPerDay =
      parsed.targetTimesPerDay != null
        ? Number(parsed.targetTimesPerDay)
        : existing.targetTimesPerDay;

    return {
      name: parsed.name.trim(),
      description: parsed.description.trim(),
      category: validCategories.includes(parsed.category)
        ? parsed.category
        : existing.category,
      frequency: validFrequencies.includes(parsed.frequency)
        ? parsed.frequency
        : existing.frequency,
      difficulty: validDifficulties.includes(parsed.difficulty)
        ? parsed.difficulty
        : existing.difficulty,
      targetDays: this.pickRandomHabitTargetDays(
        parsed.targetDays || existing.targetDays,
      ),
      targetTimesPerDay: Number.isFinite(targetTimesPerDay)
        ? targetTimesPerDay
        : existing.targetTimesPerDay,
      reminderTime: this.ensureReminderTimeAfterNow(
        parsed.reminderTime ?? existing.reminderTime,
        { busyTimes: options.busyTimes || [] },
      ),
    };
  }

  // AI Life Coach Chat
  async lifeCoachChat(prompt, conversationHistory = [], userContext = {}) {
    if (!this.client) {
      throw new Error(
        "OpenAI service not configured. Please set OPENAI_API_KEY in .env file",
      );
    }

    const systemPrompt = `You are an empathetic and motivating AI Life Coach dedicated to helping users achieve their goals and improve their lives.

Your coaching style:
- Empathetic and understanding, yet motivating
- Ask thoughtful questions to help users discover insights
- Provide actionable advice and strategies
- Focus on sustainable habits and realistic goal-setting
- Celebrate progress and encourage resilience
- Use frameworks like SMART goals, habit stacking, and growth mindset

Areas of expertise:
- Personal productivity and time management
- Goal setting and achievement
- Habit formation and breaking bad habits
- Work-life balance
- Stress management and mindfulness
- Career development
- Health and fitness motivation
- Relationship and communication skills

Conversation approach:
- Be warm, supportive, and non-judgmental
- Listen actively to user concerns
- Provide specific, actionable advice
- Reference proven frameworks and techniques
- Encourage self-reflection
- Track progress and celebrate wins

FORMATTING INSTRUCTIONS (VERY IMPORTANT):
- Use proper spacing between paragraphs (add double line breaks)
- Keep paragraphs short (2-4 sentences maximum)
- Use bullet points or numbered lists when presenting multiple items
- Separate different topics or ideas with clear spacing
- Break up long blocks of text to make them easy to read
- Format like a conversation, not a dense essay

User context: ${userContext.goals ? `Current goals: ${userContext.goals}` : "No specific goals set yet"}
${userContext.challenges ? `Challenges: ${userContext.challenges}` : ""}

Remember: You're here to guide, support, and empower - not to judge or prescribe rigid solutions.`;

    // Build message array with conversation history
    const messages = [{ role: "system", content: systemPrompt }];

    // Add conversation history (last 15 messages for context)
    if (conversationHistory.length > 0) {
      const lastMessages = conversationHistory.slice(-15);
      lastMessages.forEach((msg) => {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      });
    }

    // Add current prompt
    messages.push({
      role: "user",
      content: prompt,
    });

    return this.chat(messages, { max_tokens: 1500, temperature: 0.8 });
  }

  // Suggest tasks based on goals
  async suggestTasks(goals, timeAvailable, context = {}) {
    const systemPrompt = `You are an AI productivity expert helping users break down their goals into actionable tasks.

Create a prioritized list of tasks that:
- Are specific and actionable
- Can be completed in the given timeframe
- Move the user closer to their goals
- Are realistic and achievable
- Follow the SMART framework

Consider:
- Task dependencies and logical order
- Energy levels (high-focus vs. low-focus tasks)
- Quick wins vs. long-term investments
- Time blocking and batching similar tasks

Format each task with:
- Clear action verb
- Estimated time
- Priority level (High/Medium/Low)
- Brief rationale`;

    const userMessage = `Help me create a task list based on my goals and available time.

Goals: ${goals}
Time available: ${timeAvailable}
${context.workingHours ? `Working hours: ${context.workingHours}` : ""}
${context.preferences ? `Preferences: ${context.preferences}` : ""}

Please suggest 5-10 specific, actionable tasks prioritized by impact.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    return this.chat(messages, { max_tokens: 1500 });
  }

  // Suggest morning routine
  async suggestMorningRoutine(wakeUpTime, workStartTime, preferences = {}) {
    const systemPrompt = `You are an AI wellness and productivity coach specializing in morning routines.

Create a personalized morning routine that:
- Energizes and prepares the user for the day
- Includes physical movement
- Incorporates mindfulness or mental preparation
- Allows time for nutrition
- Builds momentum for the day
- Is realistic and sustainable

Consider proven elements:
- Hydration upon waking
- Movement (stretching, exercise, walk)
- Mindfulness (meditation, journaling, gratitude)
- Nutrition (healthy breakfast)
- Planning (reviewing day's priorities)
- Personal care and grooming
- Avoiding phone/email initially (if possible)

Format with specific time blocks and activities.`;

    const userMessage = `Create a morning routine for me.

Wake up time: ${wakeUpTime}
Work starts: ${workStartTime}
${preferences.exercisePreference ? `Exercise preference: ${preferences.exercisePreference}` : ""}
${preferences.dietaryNeeds ? `Dietary needs: ${preferences.dietaryNeeds}` : ""}
${preferences.personalGoals ? `Personal goals: ${preferences.personalGoals}` : ""}

Please create a structured morning routine with time blocks.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    return this.chat(messages, { max_tokens: 1200 });
  }

  // Quick AI response (for general questions)
  async quickResponse(prompt) {
    const systemPrompt = `You are a helpful AI assistant that provides concise, accurate, and actionable responses.
Be friendly, clear, and specific. Focus on practical advice and solutions.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];

    return this.chat(messages, { max_tokens: 800 });
  }

  /**
   * Reset Daily Plan - The Trust Engine
   * Adapts a daily plan when life happens
   * This is not a gimmick - it's about building trust with users
   */
  async resetDailyPlan(resetContext, userSettings = {}) {
    const reasonMap = {
      LOW_ENERGY: "User is experiencing low energy today",
      UNEXPECTED_MEETINGS: "Unexpected meetings came up",
      LOST_FOCUS: "User lost focus or procrastinated",
      PERSONAL_STUFF: "Personal matters need attention",
      JUST_ONE_OF_THOSE_DAYS: "User is having one of those difficult days",
      OTHER: "User needs to adapt the plan",
    };

    const reasonDescription =
      reasonMap[resetContext.reason] || "User wants to reset their day";
    const currentTime =
      resetContext.currentTime || new Date().toLocaleTimeString();

    const systemPrompt = `You are Elyxa, an empathetic AI productivity coach who helps users adapt their plans when life happens.

CORE PHILOSOPHY:
- No guilt, no judgment - life is unpredictable
- Build trust through realistic, achievable adaptations
- Focus on 2-3 top priorities instead of overwhelming tasks
- Break large tasks into smaller, manageable steps
- Adapt to reality, don't ignore it

RESET PRINCIPLES:
1. **Preserve Top Priorities** - Keep the 2-3 most important tasks
2. **Defer Non-Urgent** - Move less critical items to tomorrow/later
3. **Break Down Tasks** - Simplify remaining tasks into smaller steps
4. **Adjust Time Blocks** - Create realistic focus blocks based on remaining time
5. **Add Buffer Time** - Include breaks and recovery time
6. **Encourage Progress** - Any progress is better than paralysis

CRITICAL FORMATTING REQUIREMENTS:
The "content" field MUST be a well-structured, organized plan with:
- **Overview** section explaining the adapted focus
- Numbered sections (1, 2, 3, etc.)
- Time blocks with specific times (e.g., 09:00 - 10:30)
- Clear activity descriptions
- Key Goals section listing 2-3 main priorities
- Success Tips section with practical advice

Use markdown formatting with headers (##), bold text (**), and bullet points.
Make it look professional and easy to follow.

TONE:
- Supportive and understanding
- Practical and solution-focused
- Encouraging without being preachy
- Professional but warm

FORMAT YOUR RESPONSE AS JSON:
{
  "content": "FULL STRUCTURED PLAN - Must include Overview, numbered sections with time blocks, Key Goals, and Success Tips. Use the same professional format as the original plan.",
  "morningRoutine": "Brief description of adapted morning tasks (if still relevant to current time)",
  "afternoonTasks": "Brief description of realistic afternoon focus blocks",
  "eveningRoutine": "Brief description of simplified evening wind-down",
  "summary": "Brief explanation of what was changed and why (1-2 sentences)",
  "adaptationSteps": [
    "Kept top 2 priorities: [specific tasks from original plan]",
    "Deferred to tomorrow: [specific tasks from original plan]",
    "Broke down into smaller steps: [specific task modification]",
    "Adjusted focus blocks to match remaining time"
  ],
  "encouragement": "Short, genuine encouragement message (1 sentence)"
}`;

    const userMessage = `Reset my daily plan - life happened and I need to adapt.

**Current Situation:**
- Reason: ${reasonDescription}
${resetContext.customReason ? `- Additional context: ${resetContext.customReason}` : ""}
- Current time: ${currentTime}
- Progress so far: ${resetContext.tasksCompleted}/${resetContext.tasksTotal} tasks completed (${Math.round(resetContext.completionRate)}%)

**Original Plan:**
${resetContext.previousPlan}

**User Settings:**
- Wake time: ${userSettings?.wakeTime || "7:00 AM"}
- Work hours: ${userSettings?.workHoursPerDay || 8} hours/day
- Preferred break length: ${userSettings?.preferredBreakLength || "15 minutes"}

IMPORTANT INSTRUCTIONS:
1. Analyze the original plan structure above (notice the **Overview**, numbered sections, time blocks, **Key Goals**, **Success Tips**)
2. Create an adapted plan that KEEPS THE SAME PROFESSIONAL STRUCTURE
3. The "content" field must be a COMPLETE, WELL-ORGANIZED plan with:
   - **Overview:** Brief summary of adapted focus (2-3 sentences)
   - **1. Morning Routine** (if applicable): Time blocks with specific times and activities
   - **2. Work/Study Blocks**: Focused sessions with time blocks (keep top 2-3 priorities)
   - **3. Afternoon/Evening**: Simplified activities with time blocks
   - **4. Key Goals**: List 2-3 main priorities (reduced from original)
   - **5. Success Tips**: 3-4 practical tips for the adapted plan

4. ADAPT the plan by:
   - Keeping only the 2-3 highest priority tasks from the original
   - Adjusting time blocks to fit remaining day
   - Simplifying complex tasks into smaller steps
   - Adding buffer time between activities
   - Making it achievable given the current situation

5. Use the SAME markdown formatting style as the original plan
6. Make time blocks realistic based on current time: ${currentTime}

Remember: The goal is progress, not perfection. Make it achievable and trust-building.

Respond ONLY with valid JSON. The "content" field must be a fully formatted, structured plan like the original.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    try {
      const response = await this.chat(messages, {
        max_tokens: 2500,
        temperature: 0.7,
      });

      // Parse JSON response
      let adaptedPlan;
      try {
        // Try to extract JSON from response (in case AI wraps it in code blocks)
        let jsonContent = response.content.trim();

        // Remove markdown code blocks if present
        if (jsonContent.startsWith("```json")) {
          jsonContent = jsonContent
            .replace(/```json\s*/g, "")
            .replace(/```\s*$/g, "");
        } else if (jsonContent.startsWith("```")) {
          jsonContent = jsonContent
            .replace(/```\s*/g, "")
            .replace(/```\s*$/g, "");
        }

        adaptedPlan = JSON.parse(jsonContent);

        // Validate that content is properly structured
        if (!adaptedPlan.content || adaptedPlan.content.length < 100) {
          throw new Error("Content too short - need full structured plan");
        }
      } catch (parseError) {
        // If JSON parsing fails, create a structured fallback based on original plan
        console.warn(
          "Failed to parse JSON response, creating structured fallback",
        );
        console.error("Parse error:", parseError.message);

        // Extract key information from original plan
        const originalLines = resetContext.previousPlan.split("\n");
        const keyTasks = originalLines
          .filter(
            (line) => line.includes("**Key Goals**") || line.match(/^\s*-\s+/m),
          )
          .slice(0, 5);

        adaptedPlan = {
          content: this._createFallbackStructuredPlan(
            resetContext,
            reasonDescription,
            currentTime,
          ),
          morningRoutine:
            "Simplified morning routine focused on essential preparation",
          afternoonTasks: "Focus on top 2 priorities with adequate break time",
          eveningRoutine:
            "Light wind-down activities and planning for tomorrow",
          summary:
            "Plan adapted to focus on top priorities while being realistic about current circumstances",
          adaptationSteps: [
            "Keeping top 2 priorities from original plan",
            "Deferring non-urgent tasks to tomorrow",
            "Breaking remaining tasks into smaller, manageable steps",
            "Adjusted focus blocks to match remaining time in the day",
          ],
          encouragement: "Life happened. We've adapted. Let's make progress.",
        };
      }

      return {
        ...adaptedPlan,
        usage: response.usage,
        model: response.model,
      };
    } catch (error) {
      console.error("Error in resetDailyPlan:", error);
      throw error;
    }
  }

  /**
   * Helper method to create a structured fallback plan when JSON parsing fails
   * @private
   */
  _createFallbackStructuredPlan(resetContext, reasonDescription, currentTime) {
    const now = new Date();
    const currentHour = now.getHours();

    // Determine what part of day we're in
    const isLateDay = currentHour >= 15;
    const isMidDay = currentHour >= 12 && currentHour < 15;

    let plan = `**Overview:** Today's plan has been adapted to focus on achievable goals given your current situation (${reasonDescription}). We're prioritizing your top 2-3 most important tasks while being realistic about time and energy.\n\n`;

    // Only include morning routine if it's still morning
    if (currentHour < 12) {
      plan += `**1. Remaining Morning Tasks**\n`;
      plan += `   - ${String(currentHour).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} - ${String(currentHour + 1).padStart(2, "0")}:00: Focus on top priority task (90-minute block)\n`;
      plan += `   - ${String(currentHour + 1).padStart(2, "0")}:00 - ${String(currentHour + 1).padStart(2, "0")}:15: Break (stretch, hydrate, snack)\n`;
      plan += `   - ${String(currentHour + 1).padStart(2, "0")}:15 - 12:00: Continue with priority work\n\n`;
    }

    // Afternoon tasks
    if (!isLateDay) {
      const startHour = isMidDay ? Math.max(currentHour, 12) : 13;
      plan += `**${currentHour < 12 ? "2" : "1"}. Afternoon Focus Blocks**\n`;
      plan += `   - ${String(startHour).padStart(2, "0")}:00 - ${String(startHour + 1).padStart(2, "0")}:30: Work on second priority task\n`;
      plan += `   - ${String(startHour + 1).padStart(2, "0")}:30 - ${String(startHour + 1).padStart(2, "0")}:45: Short break\n`;
      plan += `   - ${String(startHour + 1).padStart(2, "0")}:45 - ${String(startHour + 3).padStart(2, "0")}:00: Complete remaining essential tasks\n\n`;
    }

    // Evening routine
    const eveningStart = isLateDay ? Math.max(currentHour + 1, 17) : 17;
    plan += `**${currentHour < 12 ? "3" : isLateDay ? "1" : "2"}. Evening Wind-Down**\n`;
    plan += `   - ${String(eveningStart).padStart(2, "0")}:00 - ${String(eveningStart + 1).padStart(2, "0")}:00: Review day's progress and plan tomorrow\n`;
    plan += `   - ${String(eveningStart + 1).padStart(2, "0")}:00 - ${String(eveningStart + 2).padStart(2, "0")}:00: Light activity or personal time\n`;
    plan += `   - ${String(eveningStart + 2).padStart(2, "0")}:00 onwards: Relaxation and preparation for tomorrow\n\n`;

    // Key goals - simplified to top 2-3
    plan += `**${currentHour < 12 ? "4" : isLateDay ? "2" : "3"}. Key Goals (Adapted)**\n`;
    plan += `   - Complete top priority task from original plan\n`;
    if (!isLateDay) {
      plan += `   - Make progress on second priority task\n`;
    }
    plan += `   - Review and plan for tomorrow's tasks\n\n`;

    // Success tips
    plan += `**${currentHour < 12 ? "5" : isLateDay ? "3" : "4"}. Success Tips**\n`;
    plan += `   - Focus on progress, not perfection - any forward movement counts\n`;
    plan += `   - Take breaks every 60-90 minutes to maintain focus and energy\n`;
    plan += `   - If a task feels overwhelming, break it into 15-minute mini-tasks\n`;
    plan += `   - Remember: adapting your plan shows wisdom, not weakness\n`;

    return plan;
  }

  // ==================== TASK GENERATION FUNCTIONS ====================

  // Generate tasks from goals
  async generateTasksFromGoals(goals, userContext = {}) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const systemPrompt = `You are an expert AI task generator. Your role is to break down user goals into specific, actionable tasks.

REQUIREMENTS:
1. Each task must be specific and actionable
2. Include estimated time in minutes
3. Assign priority (LOW, MEDIUM, HIGH, URGENT)
4. Categorize by goal category
5. Suggest appropriate due dates
6. Consider task dependencies
7. Break complex tasks into subtasks

Return ONLY valid JSON array with this exact structure:
[
  {
    "title": "Task title",
    "description": "Detailed description",
    "priority": "HIGH",
    "category": "HEALTH",
    "estimatedMinutes": 30,
    "dueDate": "2026-01-20",
    "energyLevelRequired": "medium",
    "tags": ["exercise", "morning"],
    "aiRecommendation": "Why this task is important",
    "difficultyLevel": 5
  }
]

Valid priorities: LOW, MEDIUM, HIGH, URGENT
Valid categories: CAREER, HEALTH, FINANCE, FITNESS, WELLNESS, PRODUCTIVITY, PERSONAL, EDUCATION
Valid energy levels: low, medium, high
Difficulty: 1-10 scale`;

    const userMessage = `Generate actionable tasks for these goals:\n\n${JSON.stringify(goals, null, 2)}\n\nUser Context:\n${JSON.stringify(userContext, null, 2)}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    try {
      const response = await this.chat(messages, {
        max_tokens: 2000,
        temperature: 0.7,
      });

      // Parse JSON response
      let tasksText = response.content.trim();

      // Remove markdown code blocks if present
      tasksText = tasksText.replace(/```json\n?/g, "").replace(/```\n?/g, "");

      const tasks = JSON.parse(tasksText);

      return {
        success: true,
        tasks,
        tokensUsed: response.usage?.total_tokens,
      };
    } catch (error) {
      console.error("Failed to generate tasks:", error);
      throw new Error("Failed to generate tasks from goals");
    }
  }

  // Break down complex task into subtasks
  async breakdownTask(task, userContext = {}) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const systemPrompt = `You are an expert at breaking down complex tasks into manageable subtasks.

Analyze the given task and break it into 3-7 specific, sequential subtasks.

Return ONLY valid JSON array:
[
  {
    "title": "Subtask title",
    "description": "What to do",
    "estimatedMinutes": 15,
    "priority": "HIGH"
  }
]`;

    const userMessage = `Break down this task:\n\nTitle: ${task.title}\nDescription: ${task.description || "No description"}\nEstimated Time: ${task.estimatedMinutes || "unknown"} minutes`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    try {
      const response = await this.chat(messages, {
        max_tokens: 1000,
        temperature: 0.6,
      });

      let subtasksText = response.content.trim();
      subtasksText = subtasksText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");

      const subtasks = JSON.parse(subtasksText);

      return {
        success: true,
        subtasks,
        tokensUsed: response.usage?.total_tokens,
      };
    } catch (error) {
      console.error("Failed to breakdown task:", error);
      throw new Error("Failed to break down task");
    }
  }

  // Generate a single task from a user prompt
  async generateSingleTask(prompt, context = {}) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const today = this.toLocalDateString();
    const nowTime = this.minutesToTime(this.getNowMinutes());
    const sampleDue = new Date();
    sampleDue.setDate(sampleDue.getDate() + 2);
    const sampleDueStr = this.toLocalDateString(sampleDue);
    const sampleDueTime = this.pickVariedDaytimeSlot(prompt || sampleDueStr);
    const sampleEffort = this.normalizeGeneratedTaskEffort({
      priority: "MEDIUM",
      dueDate: sampleDueStr,
      title: prompt || "sample",
    });

    const linkedGoal = context.linkedGoal || null;
    const goalTargetHint = linkedGoal?.targetDate
      ? this.toLocalDateString(linkedGoal.targetDate)
      : null;

    const systemPrompt = `You are an expert productivity coach. Generate ONE actionable task from the user's prompt.

Today's date is ${today}. Current time is ${nowTime} (24h).

Return ONLY valid JSON:
{
  "task": {
    "title": "Clear task title",
    "description": "What to do and why",
    "category": "PRODUCTIVITY",
    "priority": "MEDIUM",
    "dueDate": "${sampleDueStr}",
    "dueTime": "${sampleDueTime}",
    "estimatedMinutes": ${sampleEffort.estimatedMinutes},
    "energyLevelRequired": "${sampleEffort.energyLevelRequired}",
    "difficultyLevel": ${sampleEffort.difficultyLevel},
    "tags": ["focus"]
  },
  "goal": {
    "suggestedGoalId": null
  }
}

Valid priorities: LOW, MEDIUM, HIGH, URGENT
Valid categories: CAREER, HEALTH, FINANCE, FITNESS, WELLNESS, PRODUCTIVITY, PERSONAL, EDUCATION
Valid energy levels: low, medium, high
difficultyLevel: integer 1-10
estimatedMinutes: integer 5-240

dueDate rules (IMPORTANT):
- dueDate must be ISO YYYY-MM-DD on or after today (${today}), or null. Never use a past date.
- Prefer an upcoming date that fits the work (often tomorrow, 2–3 days, or within a week) — do NOT default every task to today.
- Use today ONLY when the user clearly means today / urgent / immediate (e.g. "today", "right now", "ASAP").
- If a linked goal has targetDate, set dueDate on or before that goal targetDate and aligned with the goal timeline.
- Priority should match urgency of the chosen dueDate (today→URGENT, tomorrow→MEDIUM, 2–3 days→LOW, overdue never).
- If dueDate is today, dueTime (HH:mm) MUST be after the current time (${nowTime}).
- If dueDate is a future day, still always set dueTime to a reasonable daytime HH:mm (never null). Vary the time — do NOT always use 14:00.
- Never return dueTime as null when dueDate is set.

Effort rules (IMPORTANT — do NOT always use 30 / medium / 5):
- estimatedMinutes, energyLevelRequired, and difficultyLevel MUST vary with priority and task complexity.
- URGENT/HIGH → longer time (often 45–90), energy high or medium, difficulty 6–9.
- MEDIUM → moderate time (25–60), energy medium (sometimes low), difficulty 4–6.
- LOW / later → shorter time (15–40), energy low or medium, difficulty 2–4.
- Quick admin tasks → lower minutes + lower difficulty. Deep research/writing → higher minutes + higher difficulty.
- Never copy a fixed sample trio of 30 + medium + 5 for every task.

If active goals are provided, set suggestedGoalId to the best matching goal id or null.`;

    const goalsForPrompt = (context.goals || []).map((g) => ({
      id: g.id,
      title: g.title,
      category: g.category,
      targetDate: g.targetDate ? this.toLocalDateString(g.targetDate) : null,
      priorityLevel: g.priorityLevel || null,
    }));

    const goalsContext = goalsForPrompt.length
      ? `\nActive goals (align dueDate with the matched goal when relevant):\n${JSON.stringify(goalsForPrompt, null, 2)}`
      : "";

    const categoryHint = context.category
      ? `\nPreferred category: ${context.category}`
      : "";
    const goalHint = context.goalId
      ? `\nLink this task to goal ID: ${context.goalId}${
          goalTargetHint ? ` (goal targetDate: ${goalTargetHint})` : ""
        }`
      : "";

    const userMessage = `User prompt: ${prompt}${categoryHint}${goalHint}${goalsContext}`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      {
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: "json_object" },
      },
    );

    const parsed = this.parseAiJson(response.content);

    const matchedGoalId =
      context.goalId ||
      parsed.goal?.suggestedGoalId ||
      parsed.suggestedGoalId ||
      null;

    const matchedGoal =
      linkedGoal ||
      (context.goals || []).find((g) => g.id === matchedGoalId) ||
      null;

    const dueDate = this.alignTaskDueDateWithGoal(
      parsed.task?.dueDate || parsed.dueDate || null,
      matchedGoal,
    );

    const title = parsed.task?.title || parsed.title;
    const effort = this.normalizeGeneratedTaskEffort({
      priority: parsed.task?.priority || parsed.priority || "MEDIUM",
      dueDate,
      estimatedMinutes:
        parsed.task?.estimatedMinutes ?? parsed.estimatedMinutes,
      difficultyLevel:
        parsed.task?.difficultyLevel ?? parsed.difficultyLevel,
      energyLevelRequired:
        parsed.task?.energyLevelRequired || parsed.energyLevelRequired,
      title,
    });

    return {
      success: true,
      task: {
        title,
        description: parsed.task?.description || parsed.description || null,
        category:
          parsed.task?.category ||
          parsed.category ||
          context.category ||
          "OTHER",
        priority: effort.priority,
        dueDate,
        dueTime: this.ensureDueTimeForDueDate(
          parsed.task?.dueTime || parsed.dueTime || null,
          dueDate,
          { seed: title || prompt },
        ),
        estimatedMinutes: effort.estimatedMinutes,
        energyLevelRequired: effort.energyLevelRequired,
        difficultyLevel: effort.difficultyLevel,
        tags: parsed.task?.tags || parsed.tags || [],
        aiRecommendation:
          parsed.task?.aiRecommendation || parsed.aiRecommendation || null,
      },
      goal: {
        suggestedGoalId: matchedGoalId,
      },
      tokensUsed: response.usage?.total_tokens,
    };
  }

  // Improve an existing task by its ID and current data
  async improveTask(existingTask, instructions = "") {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const current = this.formatTaskForAi(existingTask);

    const systemPrompt = `You improve an existing user task. Read the current task data and return an improved version.

Update only: title, description, category, priority, dueDate, dueTime, estimatedMinutes.
Do NOT change status, goal, or create subtasks.

The improved title and description MUST be different and better than the current ones.
Make the task more specific, clear, and actionable when possible.
If the user gives instructions, apply them to THIS task only.

Return ONLY valid JSON:
{
  "title": "Improved title",
  "description": "Improved description",
  "category": "PRODUCTIVITY",
  "priority": "MEDIUM",
  "dueDate": "2026-07-10",
  "dueTime": "09:00",
  "estimatedMinutes": 30
}

Valid priorities: LOW, MEDIUM, HIGH, URGENT
Valid categories: CAREER, HEALTH, FINANCE, FITNESS, WELLNESS, PRODUCTIVITY, PERSONAL, EDUCATION
dueDate must be ISO date (YYYY-MM-DD) or null.`;

    const userMessage = `Task ID: ${existingTask.id}

Current task:
${JSON.stringify(current, null, 2)}

${
  instructions?.trim()
    ? `Improve this task using these instructions: ${instructions.trim()}`
    : "Improve this task to make it clearer, more specific, and more actionable."
}`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      {
        temperature: 0.8,
        max_tokens: 700,
        response_format: { type: "json_object" },
      },
    );

    const parsed = this.parseAiJson(response.content);
    const task = this.normalizeImprovedTask(parsed, existingTask);

    return {
      success: true,
      task,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  // Generate a single habit from a user prompt
  async generateHabit(prompt, context = {}) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const busyTimes = context.busyReminderTimes || [];

    const systemPrompt = `You are an expert habit coach. Generate ONE sustainable habit from the user's prompt.

Current time is ${nowTime} (24h). Today's date is ${now.toISOString().split("T")[0]}.

Return ONLY valid JSON:
{
  "habit": {
    "name": "Clear habit name",
    "description": "Why this habit matters and how to practice it",
    "category": "PERSONAL",
    "frequency": "DAILY",
    "difficulty": "MEDIUM",
    "targetDays": ["MONDAY", "WEDNESDAY", "FRIDAY"],
    "targetTimesPerDay": 1,
    "reminderTime": "HH:mm",
    "timeSlots": [],
    "startDate": null,
    "endDate": null
  },
  "goal": {
    "suggestedGoalId": null
  }
}

Valid categories: CAREER, HEALTH, FINANCE, FITNESS, WELLNESS, PRODUCTIVITY, PERSONAL, EDUCATION
Valid frequency: DAILY, WEEKLY, MONTHLY
Valid difficulty: EASY, MEDIUM, HARD

HARD RULES:
- Schedule window (server will also parse this — follow it):
  - If the user says "for a week" / "this week" / "7 days" → 7 consecutive days starting TODAY. Set startDate and endDate (YYYY-MM-DD) and targetDays to those 7 weekdays.
  - If they name a weekday ("from Monday", "starting Thursday") use the next occurrence of that day as startDate.
  - If they name a calendar date ("from 2026-09-15", "from 15 Sep") use that date as startDate (not in the past).
  - If they give a date/day AND a week, start there and span 7 days.
  - If they say "for N days" / "for N weeks", use that duration from the start.
- If NO week/date/day window is requested, targetDays must be a RANDOM subset of 3-5 days from MONDAY..SUNDAY (can include Saturday/Sunday). Never always Mon-Fri. Never all 7 days in that default case.
- reminderTime must be HH:mm AFTER the current time (${nowTime}). Never use a past time. Never default to 08:00 unless that is still after now and uniquely fitting.
- targetTimesPerDay defaults to 1. Do NOT invent multiple daily occurrences.
- ONLY if the user prompt clearly asks for multiple times (keywords like "multiple times", "twice", "2 times", "3 times", "4 times", "3x a day"), set targetTimesPerDay to that number (2–4 typical) and return DISTINCT timeSlots. Never merge them into one range like 07:00–20:00.
- Avoid these busy reminder times if possible: ${busyTimes.length ? busyTimes.join(", ") : "none"}
- If active goals are provided, set suggestedGoalId to the best matching goal id or null.`;

    const goalsContext = context.goals?.length
      ? `\nActive goals:\n${JSON.stringify(context.goals, null, 2)}`
      : "";
    const categoryHint = context.category
      ? `\nPreferred category: ${context.category}`
      : "";
    const goalHint = context.goalId
      ? `\nLink to goal ID: ${context.goalId}`
      : "";

    const userMessage = `User prompt: ${prompt}${categoryHint}${goalHint}${goalsContext}\nCurrent time: ${nowTime}`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      {
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: "json_object" },
      },
    );

    const parsed = this.parseAiJson(response.content);
    const habit = parsed.habit || parsed;
    const validCategories = [
      "CAREER",
      "HEALTH",
      "FINANCE",
      "FITNESS",
      "WELLNESS",
      "PRODUCTIVITY",
      "PERSONAL",
      "EDUCATION",
    ];
    const validFrequencies = ["DAILY", "WEEKLY", "MONTHLY"];
    const validDifficulties = ["EASY", "MEDIUM", "HARD"];
    const inferredTimes = this.inferTimesPerDayFromText(
      `${prompt} ${habit.name || ""} ${habit.description || ""}`,
    );
    const aiTimes =
      habit.targetTimesPerDay != null ? Number(habit.targetTimesPerDay) : 1;
    const timesPerDay = Math.max(
      inferredTimes,
      Number.isFinite(aiTimes) && aiTimes >= 2 ? aiTimes : 1,
    );

    const schedule = resolveHabitWeekSchedule(prompt, now);

    return {
      success: true,
      habit: {
        name: habit.name,
        description: habit.description || null,
        category: validCategories.includes(habit.category)
          ? habit.category
          : context.category || "PERSONAL",
        frequency: validFrequencies.includes(habit.frequency)
          ? habit.frequency
          : "DAILY",
        difficulty: validDifficulties.includes(habit.difficulty)
          ? habit.difficulty
          : "MEDIUM",
        targetDays: schedule
          ? schedule.targetDays
          : this.pickRandomHabitTargetDays(habit.targetDays),
        targetTimesPerDay: timesPerDay >= 2 ? timesPerDay : 1,
        reminderTime: this.ensureReminderTimeAfterNow(habit.reminderTime, {
          busyTimes,
        }),
        timeSlots: timesPerDay >= 2 ? habit.timeSlots || [] : [],
        startDate: schedule?.startDate || null,
        endDate: schedule?.endDate || null,
        schedule: schedule
          ? {
              startDate: schedule.startDateOnly,
              endDate: schedule.endDateOnly,
              durationDays: schedule.durationDays,
              label: schedule.label,
            }
          : null,
      },
      goal: {
        suggestedGoalId:
          parsed.goal?.suggestedGoalId ||
          parsed.suggestedGoalId ||
          context.goalId ||
          null,
      },
      tokensUsed: response.usage?.total_tokens,
    };
  }

  // Improve an existing habit by its ID and current data
  async improveHabit(existingHabit, instructions = "", options = {}) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const current = this.formatHabitForAi(existingHabit);
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const systemPrompt = `You improve an existing user habit. Read the current habit data and return an improved version.

Update only: name, description, category, frequency, difficulty, targetDays, targetTimesPerDay, reminderTime.
Do NOT change status, goal, streaks, completions, or create tasks.
Current time is ${nowTime}.

The improved name and description MUST be different and better than the current ones.
Make the habit more specific, realistic, and sustainable when possible.
If the user gives instructions, apply them to THIS habit only.

Return ONLY valid JSON:
{
  "name": "Improved habit name",
  "description": "Improved habit description",
  "category": "PERSONAL",
  "frequency": "DAILY",
  "difficulty": "MEDIUM",
  "targetDays": ["TUESDAY", "THURSDAY", "SATURDAY"],
  "targetTimesPerDay": 1,
  "reminderTime": "HH:mm"
}

Valid categories: CAREER, HEALTH, FINANCE, FITNESS, WELLNESS, PRODUCTIVITY, PERSONAL, EDUCATION
Valid frequency: DAILY, WEEKLY, MONTHLY
Valid difficulty: EASY, MEDIUM, HARD
targetDays: random 3-5 days (can include Sat/Sun), never fixed Mon-Fri only.
reminderTime: HH:mm AFTER current time (${nowTime}). Do not default to 08:00.`;

    const userMessage = `Habit ID: ${existingHabit.id}

Current habit:
${JSON.stringify(current, null, 2)}

${
  instructions?.trim()
    ? `Improve this habit using these instructions: ${instructions.trim()}`
    : "Improve this habit to make it clearer, more specific, and easier to maintain."
}`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      {
        temperature: 0.8,
        max_tokens: 700,
        response_format: { type: "json_object" },
      },
    );

    const parsed = this.parseAiJson(response.content);
    const habit = this.normalizeImprovedHabit(
      parsed.habit || parsed,
      existingHabit,
      { busyTimes: options.busyTimes || [] },
    );

    return {
      success: true,
      habit,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  // Suggest task adjustments based on user behavior
  async suggestTaskAdjustments(taskHistory, userPatterns) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const systemPrompt = `You are an AI productivity coach analyzing user task completion patterns.

Based on task history and patterns, suggest adjustments to:
1. Task priorities
2. Time estimates
3. Task scheduling
4. Task difficulty
5. Task breakdown needs

Return JSON object:
{
  "adjustments": [
    {
      "taskId": "task-id",
      "suggestion": "What to change",
      "reason": "Why this change helps",
      "priority": "HIGH"
    }
  ],
  "generalRecommendations": [
    "Overall productivity advice"
  ]
}`;

    const userMessage = `Analyze this task history and patterns:\n\nHistory: ${JSON.stringify(taskHistory, null, 2)}\n\nPatterns: ${JSON.stringify(userPatterns, null, 2)}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    try {
      const response = await this.chat(messages, {
        max_tokens: 1500,
        temperature: 0.7,
      });

      let adjustmentsText = response.content.trim();
      adjustmentsText = adjustmentsText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");

      const adjustments = JSON.parse(adjustmentsText);

      return {
        success: true,
        ...adjustments,
        tokensUsed: response.usage?.total_tokens,
      };
    } catch (error) {
      console.error("Failed to suggest adjustments:", error);
      throw new Error("Failed to generate task adjustments");
    }
  }

  // Generate daily task list from user goals and habits
  async generateDailyTasks(userGoals, userHabits, userPreferences = {}) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const systemPrompt = `You are an AI daily planner creating a personalized task list.

Create 5-10 specific, actionable tasks for today based on user's goals and habits.

Consider:
- User's wake time and sleep schedule
- Work hours and productivity peaks
- Goal priorities
- Habit streaks to maintain
- Energy levels throughout the day
- Realistic time constraints

Return ONLY valid JSON array:
[
  {
    "title": "Task title",
    "description": "What to do",
    "priority": "HIGH",
    "category": "PRODUCTIVITY",
Return ONLY valid JSON array:
[
  {
    "title": "Task title",
    "description": "What to do",
    "priority": "HIGH",
    "category": "PRODUCTIVITY",
    "estimatedMinutes": 45,
    "dueTime": "09:00",
    "energyLevelRequired": "high",
    "aiRecommendation": "Why this task today"
  }
]

Valid priorities: LOW, MEDIUM, HIGH, URGENT
Valid categories: CAREER, HEALTH, FINANCE, FITNESS, WELLNESS, PRODUCTIVITY, PERSONAL, EDUCATION`;

    const userMessage = `Generate today's tasks:\n\nGoals: ${JSON.stringify(userGoals, null, 2)}\n\nHabits: ${JSON.stringify(userHabits, null, 2)}\n\nPreferences:\n- Wake time: ${userPreferences.wakeTime || "7:00"}\n- Work hours: ${userPreferences.workHours || "9:00-17:00"}\n- Focus: ${userPreferences.focusAreas || "balanced"}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    try {
      const response = await this.chat(messages, {
        max_tokens: 2000,
        temperature: 0.7,
      });

      let tasksText = response.content.trim();
      tasksText = tasksText.replace(/```json\n?/g, "").replace(/```\n?/g, "");

      const tasks = JSON.parse(tasksText);

      return {
        success: true,
        tasks,
        tokensUsed: response.usage?.total_tokens,
      };
    } catch (error) {
      console.error("Failed to generate daily tasks:", error);
      throw new Error("Failed to generate daily tasks");
    }
  }

  // Analyze task completion patterns
  async analyzeTaskPatterns(completedTasks, skippedTasks) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const systemPrompt = `You are an AI productivity analyst examining task completion patterns.

Analyze the completed and skipped tasks to identify:
1. Productivity patterns
2. Time management issues
3. Task preference patterns
4. Optimal work times
5. Areas for improvement

Return JSON object:
{
  "patterns": [
    {
      "type": "PRODUCTIVITY_PEAK",
      "description": "Pattern description",
      "suggestion": "Actionable recommendation"
    }
  ],
  "insights": [
    "Key insight about productivity"
  ],
  "recommendations": [
    "Specific action to improve"
  ]
}

Valid pattern types: PRODUCTIVITY_PEAK, SKIP_PATTERN, TIME_ESTIMATION, ENERGY_LEVEL, CATEGORY_PREFERENCE`;

    const userMessage = `Analyze these patterns:\n\nCompleted Tasks: ${JSON.stringify(completedTasks.slice(0, 20), null, 2)}\n\nSkipped Tasks: ${JSON.stringify(skippedTasks.slice(0, 10), null, 2)}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    try {
      const response = await this.chat(messages, {
        max_tokens: 1500,
        temperature: 0.6,
      });

      let analysisText = response.content.trim();
      analysisText = analysisText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");

      const analysis = JSON.parse(analysisText);

      return {
        success: true,
        ...analysis,
        tokensUsed: response.usage?.total_tokens,
      };
    } catch (error) {
      console.error("Failed to analyze patterns:", error);
      throw new Error("Failed to analyze task patterns");
    }
  }

  // Generate a single goal (metadata only — no tasks/habits)
  async generateGoal(userPrompt, context = {}) {
    const today = new Date().toISOString().split("T")[0];
    const systemPrompt = `You are an expert life coach helping users define clear, achievable goals.

Generate ONLY goal metadata. Do NOT create tasks, habits, or action steps.
Today's date is ${today}.

Return ONLY valid JSON with this exact structure:
{
  "title": "Goal title",
  "description": "2-3 sentence motivating description",
  "category": "CAREER",
  "priorityLevel": "MEDIUM",
  "targetDate": "YYYY-MM-DD"
}

Valid categories: ${[
      "CAREER",
      "HEALTH",
      "FINANCE",
      "PERSONAL",
      "EDUCATION",
    ].join(", ")}

Valid priorityLevel: LOW, MEDIUM, HIGH, URGENT

HARD RULES for targetDate:
- Must be ISO date YYYY-MM-DD
- Must be AFTER today (${today})
- Choose a realistic future date within the next 7 to 90 days based on the goal
- NEVER copy example dates. NEVER use past dates.`;

    const userMessage = context.category
      ? `User prompt: ${userPrompt}\nPreferred category: ${context.category}\nToday: ${today}`
      : `User prompt: ${userPrompt}\nToday: ${today}`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.7, max_tokens: 500 },
    );

    let content = response.content.trim();
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    const parsed = JSON.parse(content);

    return {
      success: true,
      goal: {
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        priorityLevel: parsed.priorityLevel || "MEDIUM",
        targetDate: this.ensureFutureTargetDate(parsed.targetDate),
      },
      tokensUsed: response.usage?.total_tokens,
    };
  }

  // Improve an existing goal by its current data (goalId-based)
  async improveGoal(existingGoal, instructions = "") {
    const current = this.formatGoalForAi(existingGoal);
    const today = new Date().toISOString().split("T")[0];

    const systemPrompt = `You improve an existing user goal. Read the current goal data and return an improved version.

Update only: title, description, category, priorityLevel, targetDate.
Do NOT create tasks or habits.
Today's date is ${today}.

The improved title and description must be different and better than the current ones.
Make the goal more specific, clear, and measurable when possible.

Return ONLY valid JSON:
{
  "title": "Improved title",
  "description": "Improved description",
  "category": "CAREER",
  "priorityLevel": "MEDIUM",
  "targetDate": "YYYY-MM-DD"
}

Valid categories: CAREER, HEALTH, FINANCE, PERSONAL, EDUCATION
Valid priorityLevel: LOW, MEDIUM, HIGH, URGENT
targetDate must be AFTER today (${today}), ISO YYYY-MM-DD, within the next 7-90 days. Never use past dates.`;

    const userMessage = `Goal ID: ${existingGoal.id}

Current goal:
${JSON.stringify(current, null, 2)}

${
  instructions?.trim()
    ? `Improve this goal using these instructions: ${instructions.trim()}`
    : "Improve this goal to make it clearer, more specific, and more actionable."
}`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      {
        temperature: 0.8,
        max_tokens: 700,
        response_format: { type: "json_object" },
      },
    );

    const parsed = this.parseAiJson(response.content);
    const goal = this.normalizeImprovedGoal(parsed, existingGoal);

    return {
      success: true,
      goal,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  /**
   * Goal AI Assistant — preview changes for a goal (suggest → accept/dismiss → undo).
   * Actions: CHAT | IMPROVE_DESCRIPTION | ADD_TASKS | ADD_HABITS
   */
  async suggestGoalAssistant(action, userMessage = "", context = {}) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const goalCategories = "CAREER, HEALTH, FINANCE, PERSONAL, EDUCATION";
    const habitCategories =
      "CAREER, HEALTH, FINANCE, FITNESS, WELLNESS, PRODUCTIVITY, PERSONAL, EDUCATION";

    const actionInstructions = {
      CHAT:
        userMessage?.trim() ||
        "Suggest helpful improvements for this goal based on its current state.",
      IMPROVE_DESCRIPTION:
        "Improve ONLY the goal title and description to be clearer, more specific, and motivating. Do NOT propose tasks or habits unless the user message asks for them.",
      ADD_TASKS:
        "Propose 2-4 new actionable tasks that help achieve this goal. Do NOT change goal fields unless clearly needed. Leave proposedHabits empty.",
      ADD_HABITS:
        "Propose 1-3 new sustainable habits that support this goal. Do NOT change goal fields unless clearly needed. Leave proposedTasks empty. Default each habit to 1 time per day. ONLY if the user message asks for multiple times (2 times, 3 times, 4 times, twice, multiple times), set targetTimesPerDay to that number and return distinct timeSlots (fromTime/toTime) — never one combined range.",
    };

    const todayStr = this.toLocalDateString();
    const sampleTaskDue = this.ensureFutureDueDate(null, { preferDaysOut: 3 });
    const sampleGoalTarget = this.ensureFutureTargetDate(null, {
      minDays: 14,
      maxDays: 90,
    });

    const systemPrompt = `You are a Goal AI Assistant for a productivity app.

You suggest changes for ONE existing goal. The frontend will preview your suggestion and the user can Accept or Cancel.

Today's date is ${todayStr}.

Return ONLY valid JSON with this exact structure:
{
  "title": "Short suggestion title",
  "message": "Friendly message explaining what you suggest (2-4 sentences)",
  "proposedGoal": {
    "title": "Updated title or same",
    "description": "Updated description or same",
    "category": "CAREER",
    "priorityLevel": "MEDIUM",
    "targetDate": "${sampleGoalTarget}"
  },
  "proposedTasks": [
    {
      "title": "Task title",
      "description": "What to do",
      "priority": "MEDIUM",
      "category": "CAREER",
      "estimatedMinutes": 30,
      "dueDate": "${sampleTaskDue}"
    }
  ],
  "proposedHabits": [
    {
      "name": "Habit name",
      "description": "How to practice it",
      "category": "PERSONAL",
      "frequency": "DAILY",
      "difficulty": "MEDIUM",
      "targetDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      "targetTimesPerDay": 1,
      "reminderTime": "08:00"
    }
  ]
}

Rules:
- Always return proposedGoal (use current values if unchanged).
- proposedTasks / proposedHabits can be empty arrays.
- Action guidance: ${actionInstructions[action] || actionInstructions.CHAT}
- Goal categories: ${goalCategories}
- Task categories: ${goalCategories}
- Habit categories: ${habitCategories}
- priorityLevel / task priority: LOW, MEDIUM, HIGH, URGENT
- Habit frequency: DAILY, WEEKLY, MONTHLY
- Habit difficulty: EASY, MEDIUM, HARD
- Habit targetTimesPerDay defaults to 1. Multiple distinct timeSlots only when the user asks for 2/3/4 times or "multiple times".
- Dates must be ISO YYYY-MM-DD or null
- Task dueDate MUST be on or AFTER today (${todayStr}). Never use a past date. Today or any future day is fine.
- Goal targetDate MUST be on or AFTER today when set.
- Task priority MUST follow dueDate:
  - overdue (past) → HIGH
  - due today → URGENT
  - due tomorrow → MEDIUM
  - due in 2–3 days → LOW
- Do NOT invent IDs for tasks/habits — they will be created on accept`;

    const userPayload = {
      action,
      userMessage: userMessage || null,
      goal: context.goal,
      linkedTasks: context.linkedTasks || [],
      linkedHabits: context.linkedHabits || [],
    };

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Suggest changes for this goal:\n${JSON.stringify(userPayload, null, 2)}`,
        },
      ],
      {
        temperature: 0.7,
        max_tokens: 1800,
        response_format: { type: "json_object" },
      },
    );

    const parsed = this.parseAiJson(response.content);
    const existingGoal = context.rawGoal || context.goal;

    const proposedGoal = this.normalizeImprovedGoal(
      parsed.proposedGoal || parsed.goal || parsed,
      existingGoal,
    );

    const validTaskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    const validGoalCats = [
      "CAREER",
      "HEALTH",
      "FINANCE",
      "PERSONAL",
      "EDUCATION",
    ];
    const validHabitCats = [
      "CAREER",
      "HEALTH",
      "FINANCE",
      "FITNESS",
      "WELLNESS",
      "PRODUCTIVITY",
      "PERSONAL",
      "EDUCATION",
    ];
    const validFrequencies = ["DAILY", "WEEKLY", "MONTHLY"];
    const validDifficulties = ["EASY", "MEDIUM", "HARD"];

    const proposedTasks = (
      Array.isArray(parsed.proposedTasks) ? parsed.proposedTasks : []
    )
      .filter((t) => t?.title?.trim())
      .map((t, index) => {
        const dueDate = this.ensureFutureDueDate(t.dueDate, {
          preferDaysOut: index + 1,
        });
        const duePriority = this.resolvePriorityFromDueDate(dueDate);
        const aiPriority = validTaskPriorities.includes(t.priority)
          ? t.priority
          : "MEDIUM";

        return {
          title: t.title.trim(),
          description: t.description?.trim() || null,
          // Due-date rules win when they apply (today / tomorrow / 2–3 days / overdue)
          priority: duePriority || aiPriority,
          category: validGoalCats.includes(t.category)
            ? t.category
            : proposedGoal.category,
          estimatedMinutes:
            t.estimatedMinutes != null ? Number(t.estimatedMinutes) : null,
          dueDate,
        };
      });

    const proposedHabits = (
      Array.isArray(parsed.proposedHabits) ? parsed.proposedHabits : []
    )
      .filter((h) => h?.name?.trim())
      .map((h) => {
        const times = this.inferTimesPerDayFromText(userMessage || "");
        return {
          name: h.name.trim(),
          description: h.description?.trim() || null,
          category: validHabitCats.includes(h.category) ? h.category : "PERSONAL",
          frequency: validFrequencies.includes(h.frequency)
            ? h.frequency
            : "DAILY",
          difficulty: validDifficulties.includes(h.difficulty)
            ? h.difficulty
            : "MEDIUM",
          targetDays: Array.isArray(h.targetDays) ? h.targetDays : [],
          targetTimesPerDay: times >= 2 ? times : 1,
          reminderTime: h.reminderTime || null,
          timeSlots: times >= 2 ? h.timeSlots || [] : [],
        };
      });

    // Enforce action focus
    let tasks = proposedTasks;
    let habits = proposedHabits;
    if (action === "IMPROVE_DESCRIPTION") {
      tasks = [];
      habits = [];
    } else if (action === "ADD_TASKS") {
      habits = [];
      if (tasks.length === 0) {
        throw new Error("AI did not propose any tasks");
      }
    } else if (action === "ADD_HABITS") {
      tasks = [];
      if (habits.length === 0) {
        throw new Error("AI did not propose any habits");
      }
    }

    return {
      success: true,
      title: parsed.title || "Goal suggestion",
      message:
        parsed.message ||
        "Here is a suggested update for your goal. Accept to apply or cancel to discard.",
      proposedGoal,
      proposedTasks: tasks,
      proposedHabits: habits,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  normalizePlannerPlanPlacements(placements = [], context = {}) {
    return (placements || []).map((p, index) => {
      const itemType = p.itemType === "HABIT" ? "HABIT" : "TASK";
      const existingTaskId =
        itemType === "TASK" && typeof p.taskId === "string" && p.taskId
          ? p.taskId
          : null;
      const existingHabitId =
        itemType === "HABIT" && typeof p.habitId === "string" && p.habitId
          ? p.habitId
          : null;

      const placement = {
        itemType,
        taskId: existingTaskId,
        habitId: existingHabitId,
        date: p.date,
        startTime: p.startTime || null,
        endTime: p.endTime || null,
        orderIndex: p.orderIndex ?? index,
        viewType: p.viewType || context.viewType || "DAILY",
      };

      if (itemType === "TASK" && !existingTaskId) {
        const title = String(
          p.title || p.name || p.newTask?.title || "",
        ).trim();
        if (title) {
          placement.newTask = {
            title,
            description:
              p.description || p.newTask?.description || null,
            priority: p.priority || p.newTask?.priority || "MEDIUM",
            category: p.category || p.newTask?.category || "PERSONAL",
            estimatedMinutes:
              p.estimatedMinutes || p.newTask?.estimatedMinutes || 45,
          };
        }
      }

      if (itemType === "HABIT" && !existingHabitId) {
        const name = String(
          p.title || p.name || p.newHabit?.name || "",
        ).trim();
        if (name) {
          placement.newHabit = {
            name,
            description:
              p.description || p.newHabit?.description || null,
            category: p.category || p.newHabit?.category || "PERSONAL",
            frequency: p.frequency || p.newHabit?.frequency || "DAILY",
            difficulty: p.difficulty || p.newHabit?.difficulty || "MEDIUM",
            reminderTime:
              p.startTime || p.newHabit?.reminderTime || null,
          };
        }
      }

      return placement;
    });
  }

  // GENERATE_PLAN / Create Plan — AI may reuse existing items or propose new ones
  async generatePlannerPlan(prompt, context = {}) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const range = context.dateRange || {};
    const startIso = range.start
      ? new Date(range.start).toISOString().split("T")[0]
      : null;
    const endIso = range.end
      ? new Date(range.end).toISOString().split("T")[0]
      : null;
    const planDates = Array.isArray(context.planDates) ? context.planDates : [];
    const dayCount = planDates.length || 1;
    const taskCount = (context.availableTasks || []).length;
    const habitCount = (context.availableHabits || []).length;
    const isNewUser = taskCount === 0 && habitCount === 0;

    const minPlacements = Math.min(
      dayCount * 2,
      Math.max(dayCount, isNewUser ? dayCount * 2 : taskCount + habitCount),
    );
    const maxPlacements = Math.min(dayCount * 4, 80);
    const d1 = planDates[0] || startIso;
    const d2 = planDates[1] || d1;

    const systemPrompt = `You are Elyxa's Planner AI. The Planner is the planning/organization layer. Tasks and Habits are the actual actionable items.

GOAL:
Build a personalized plan from the user's prompt, goals, routine, available time, AND existing tasks/habits.

ITEM RULES:
- Tasks are one-time / actionable items. Schedule each TASK at most once.
- Habits are repeating activities. Reuse the same habit across multiple days.
- Prefer EXISTING tasks/habits by their real IDs when they already match the user's request. Do not create duplicates.
- If an existing item is close in meaning/title, REUSE its id. Do not invent a second copy.
- Create NEW tasks/habits only when nothing existing covers that work.
- For a new user (no existing items), generate a balanced mix of tasks AND habits from their goals/profile/prompt.
- For an existing user, organize current items into the plan first, then add only the missing pieces.
- Do NOT edit existing task/habit titles or structure. Reuse by ID.

Return ONLY valid JSON:
{
  "title": "Personalized weekly plan",
  "message": "I reused your existing habits and added the missing tasks. Accept to save.",
  "reasoning": "Brief explanation",
  "placements": [
    {
      "itemType": "HABIT",
      "taskId": null,
      "habitId": "existing-habit-uuid",
      "date": "${d1}",
      "startTime": "07:00",
      "endTime": "07:30",
      "orderIndex": 0,
      "viewType": "DAILY"
    },
    {
      "itemType": "TASK",
      "taskId": null,
      "habitId": null,
      "title": "Draft portfolio case study",
      "description": "Write the first case study outline",
      "priority": "HIGH",
      "category": "CAREER",
      "estimatedMinutes": 60,
      "date": "${d2}",
      "startTime": "09:00",
      "endTime": "10:00",
      "orderIndex": 0,
      "viewType": "DAILY"
    }
  ]
}

COVERAGE:
- The range has ${dayCount} day(s). Every date MUST appear at least once:
${planDates.length ? planDates.join(", ") : `${startIso} to ${endIso}`}
- Return between ${minPlacements} and ${maxPlacements} placements.
- Spread work across the range. Do not stack everything on day one.

TIME:
- Dates must stay within ${startIso} to ${endIso}.
- viewType: ${context.viewType || "DAILY"}
- startTime/endTime: HH:mm (24h), realistic durations, no overlaps on the same day.
- Respect wake/sleep and productivity hours from settings.
- Task categories: CAREER, HEALTH, FINANCE, PERSONAL, EDUCATION
- Habit categories: CAREER, HEALTH, FINANCE, FITNESS, WELLNESS, PRODUCTIVITY, PERSONAL, EDUCATION
- Habit frequency: DAILY, WEEKLY, MONTHLY
- Task priority: LOW, MEDIUM, HIGH, URGENT`;

    const userPrompt = `What to plan: ${prompt}

Date range: ${context.dateRangeLabel || "CUSTOM"} (${startIso} to ${endIso})
Days to cover (${dayCount}): ${planDates.length ? planDates.join(", ") : `${startIso}..${endIso}`}
View type: ${context.viewType || "DAILY"}
User is ${isNewUser ? "NEW (no existing tasks/habits — generate both)" : "EXISTING (reuse first, then fill gaps)"}

User profile / routine:
${JSON.stringify(context.profile || {}, null, 2)}

Active goals:
${JSON.stringify(context.goals || [], null, 2)}

User settings:
${JSON.stringify(context.settings || {}, null, 2)}

Current schedule:
${JSON.stringify(context.currentSchedule || [], null, 2)}

Existing tasks (reuse by taskId when relevant):
${JSON.stringify(context.availableTasks || [], null, 2)}

Existing habits (reuse by habitId when relevant):
${JSON.stringify(context.availableHabits || [], null, 2)}`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.7,
        max_tokens: dayCount > 7 ? 4000 : 3000,
        response_format: { type: "json_object" },
      },
    );

    const parsed = this.parseAiJson(response.content);

    return {
      success: true,
      title: parsed.title || "Personalized plan",
      message:
        parsed.message ||
        "Your plan is ready. Accept to save tasks, habits, and the schedule.",
      reasoning: parsed.reasoning || null,
      placements: this.normalizePlannerPlanPlacements(
        parsed.placements,
        context,
      ),
      tokensUsed: response.usage?.total_tokens,
    };
  }

  // Recalibrate / optimize — scheduling only, never creates task/habit content
  async suggestPlannerSchedule(action, userMessage = "", context = {}) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    if (action === "GENERATE_PLAN") {
      return this.generatePlannerPlan(
        userMessage ||
          "Create a personalized plan from my goals, routine, available time, and existing tasks and habits.",
        context,
      );
    }

    const actionPrompts = {
      GENERATE_PLAN: "Build a suggested plan from available tasks and habits.",
      RECALIBRATE_DAY:
        "Recalibrate the existing day: reorganize and reschedule current tasks/habits using progress, missed or overdue items, priorities, and available time. Do not generate a new set of tasks or habits.",
      REDUCE_OVERLOAD:
        "Reduce overload by moving or spacing items. Remove non-essential placements if needed.",
      OPTIMIZE_SCHEDULE: "Optimize timing for productivity and energy levels.",
      BALANCE_SCHEDULE: "Balance the schedule across the day or week.",
      FREE_EVENING:
        "Free up the evening by moving items earlier or removing low-priority placements.",
      CHAT: userMessage || "Adjust the schedule based on the user request.",
    };

    const systemPrompt = `You are a Planner AI for a productivity app. You ONLY handle scheduling.

CRITICAL RULES — you MUST follow:
- Do NOT edit task titles, descriptions, subtasks, categories, or habit content.
- Do NOT create new tasks or habits.
- ONLY schedule existing tasks and habits by their IDs into date/time slots.
- You CAN: reorder items, rebalance workload, move time slots, optimize timing, reduce overload, create focus spacing.

Return ONLY valid JSON:
{
  "title": "Suggested plan",
  "message": "Friendly message asking user to accept the plan",
  "reasoning": "Brief explanation of scheduling changes",
  "placements": [
    {
      "itemType": "TASK",
      "taskId": "existing-task-uuid",
      "habitId": null,
      "date": "2026-05-13",
      "startTime": "06:00",
      "endTime": "07:00",
      "orderIndex": 0,
      "viewType": "DAILY"
    }
  ]
}

Valid itemType: TASK, HABIT
For TASK use taskId only. For HABIT use habitId only.
startTime/endTime format: HH:mm (24h) or null for monthly overview items.
viewType: DAILY, WEEKLY, MONTHLY
Only use taskId/habitId from the provided available lists.`;

    const instruction = actionPrompts[action] || actionPrompts.CHAT;

    const userPrompt = `Action: ${action}
Instruction: ${instruction}
${userMessage ? `User message: ${userMessage}` : ""}
${context.energyLevel ? `User energy today: ${context.energyLevel} (LOW = lighter load / more spacing, MEDIUM = balanced, HIGH = denser productive blocks)` : ""}

User settings:
${JSON.stringify(context.settings || {}, null, 2)}

Current schedule:
${JSON.stringify(context.currentSchedule || [], null, 2)}

Available tasks:
${JSON.stringify(context.availableTasks || [], null, 2)}

Available habits:
${JSON.stringify(context.availableHabits || [], null, 2)}

Date range:
${JSON.stringify(context.dateRange || {}, null, 2)}`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      },
    );

    const parsed = this.parseAiJson(response.content);
    const placements = (parsed.placements || []).map((p, index) => ({
      itemType: p.itemType,
      taskId: p.itemType === "TASK" ? p.taskId : null,
      habitId: p.itemType === "HABIT" ? p.habitId : null,
      date: p.date,
      startTime: p.startTime || null,
      endTime: p.endTime || null,
      orderIndex: p.orderIndex ?? index,
      viewType: p.viewType || context.viewType || "DAILY",
    }));

    return {
      success: true,
      title: parsed.title || "Planner suggestion",
      message:
        parsed.message ||
        "I've built a suggested plan. Do you want to keep it?",
      reasoning: parsed.reasoning || null,
      placements,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  // Create Plan modal — generate and/or organize tasks + habits, then schedule
  async generateCreatePlan(prompt, context = {}) {
    return this.generatePlannerPlan(prompt, context);
  }

  /**
   * Task AI Assistant — preview only (suggest → accept/dismiss → undo).
   * Actions: CHAT | IMPROVE_DESCRIPTION | BREAKDOWN
   */
  async suggestTaskAssistant(action, userMessage = "", context = {}) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const task = context.rawTask || context.task || {};
    const categories = "CAREER, HEALTH, FINANCE, PERSONAL, EDUCATION";

    if (action === "BREAKDOWN") {
      const result = await this.breakdownTask(task);
      return {
        success: true,
        title: "Break into subtasks",
        message:
          "Sure, I can update this task. This will:\n• add subtasks\n\nDo you want me to apply these changes?",
        proposedTask: null,
        proposedSubtasks: result.subtasks || [],
        tokensUsed: result.tokensUsed,
      };
    }

    if (action === "IMPROVE_DESCRIPTION") {
      const result = await this.improveTask(task, userMessage);
      return {
        success: true,
        title: "Improve description",
        message:
          "Sure, I can update this task. This will:\n• improve the title and description\n\nDo you want me to apply these changes?",
        proposedTask: result.task,
        proposedSubtasks: [],
        tokensUsed: result.tokensUsed,
      };
    }

    // CHAT — freeform; may improve task and/or propose subtasks
    const systemPrompt = `You are a Task AI Assistant for a productivity app.

You suggest changes for ONE existing task. The frontend will preview your suggestion; the user can Accept or Cancel.

Return ONLY valid JSON:
{
  "title": "Short suggestion title",
  "message": "Friendly message explaining what you suggest (2-4 sentences). End by asking if they want to apply.",
  "proposedTask": {
    "title": "Updated title or same",
    "description": "Updated description or same",
    "category": "CAREER",
    "priority": "MEDIUM",
    "dueDate": "2026-08-01",
    "dueTime": "09:00",
    "estimatedMinutes": 30
  },
  "proposedSubtasks": [
    {
      "title": "Subtask title",
      "description": "What to do",
      "estimatedMinutes": 15,
      "priority": "MEDIUM"
    }
  ]
}

Rules:
- Valid priorities: LOW, MEDIUM, HIGH, URGENT
- Valid categories: ${categories}
- If the user asks to break into subtasks / add steps, fill proposedSubtasks (3-7 items) and set proposedTask to null.
- If the user asks to improve description/title, fill proposedTask and leave proposedSubtasks empty.
- If both are needed, fill both.
- dueDate must be YYYY-MM-DD or null.
- Do NOT invent IDs.`;

    const userPrompt = `Current task:
${JSON.stringify(this.formatTaskForAi(task), null, 2)}

Existing subtasks:
${JSON.stringify(
  (context.subtasks || []).map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
  })),
  null,
  2,
)}

User request: ${userMessage?.trim() || "Suggest helpful improvements for this task."}`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.7,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      },
    );

    const parsed = this.parseAiJson(response.content);
    let proposedTask = null;
    if (parsed.proposedTask) {
      proposedTask = this.normalizeImprovedTask(parsed.proposedTask, task);
    }

    const proposedSubtasks = Array.isArray(parsed.proposedSubtasks)
      ? parsed.proposedSubtasks
          .filter((s) => s?.title)
          .map((s) => ({
            title: String(s.title).trim(),
            description: s.description || null,
            estimatedMinutes: s.estimatedMinutes ?? null,
            priority: ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(s.priority)
              ? s.priority
              : task.priority || "MEDIUM",
          }))
      : [];

    return {
      success: true,
      title: parsed.title || "Task suggestion",
      message:
        parsed.message ||
        "I have a suggestion for this task. Do you want me to apply these changes?",
      proposedTask,
      proposedSubtasks,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  /**
   * Onboarding "Generate My Plan" — produce pending goals/tasks/habits/planner suggestions.
   */
  async generateOnboardingPlan(profile = {}) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const today = new Date().toISOString().slice(0, 10);
    const systemPrompt = `You are an onboarding AI planner for a productivity app (Elyxa).
Based on the user's onboarding profile, return ONLY valid JSON:

{
  "goals": [
    {
      "title": "Goal title",
      "description": "2-3 sentences",
      "category": "CAREER|HEALTH|FINANCE|PERSONAL|EDUCATION",
      "priorityLevel": "LOW|MEDIUM|HIGH|URGENT",
      "targetDate": "YYYY-MM-DD",
      "proposedTasks": [
        {
          "title": "Task title",
          "description": "What to do",
          "priority": "LOW|MEDIUM|HIGH|URGENT",
          "category": "CAREER|HEALTH|FINANCE|PERSONAL|EDUCATION",
          "estimatedMinutes": 30,
          "dueDate": "YYYY-MM-DD"
        }
      ],
      "proposedHabits": [
        {
          "name": "Habit name",
          "description": "How to practice",
          "category": "CAREER|HEALTH|FINANCE|FITNESS|WELLNESS|PRODUCTIVITY|PERSONAL|EDUCATION",
          "frequency": "DAILY|WEEKLY|MONTHLY",
          "difficulty": "EASY|MEDIUM|HARD",
          "targetDays": ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"],
          "targetTimesPerDay": 1,
          "reminderTime": "08:00"
        }
      ]
    }
  ],
  "tasks": [
    {
      "title": "Standalone task",
      "description": "What to do",
      "priority": "MEDIUM",
      "category": "PERSONAL",
      "estimatedMinutes": 45,
      "dueDate": "YYYY-MM-DD"
    }
  ],
  "habits": [
    {
      "name": "Standalone habit",
      "description": "How to practice",
      "category": "WELLNESS",
      "frequency": "DAILY",
      "difficulty": "EASY",
      "targetDays": ["MONDAY","WEDNESDAY","FRIDAY"],
      "targetTimesPerDay": 1,
      "reminderTime": "07:30"
    }
  ],
  "planner": {
    "date": "${today}",
    "message": "Short friendly summary of the day plan",
    "placements": [
      {
        "itemType": "TASK",
        "title": "Task title",
        "description": "1-2 sentence description of what to do",
        "startTime": "09:00",
        "endTime": "09:45",
        "orderIndex": 0
      },
      {
        "itemType": "HABIT",
        "title": "Habit name",
        "description": "1-2 sentence description of how to practice it",
        "startTime": "07:30",
        "endTime": "08:00",
        "orderIndex": 1
      }
    ]
  }
}

Rules:
- Return exactly 3 goals, 3 standalone tasks, 3 standalone habits, and 1 planner day.
- Each goal must include 1-3 proposedTasks and 1-2 proposedHabits.
- The planner MUST include exactly 5 placements: 3 with itemType "TASK" and 2 with itemType "HABIT" (in any order).
- Every planner placement MUST include a non-empty description (1-2 sentences).
- Habit targetDays must be a RANDOM subset of 3-5 weekdays (NOT all 7 days). Different habits should use different day sets when possible.
- Align everything with focusAreas, primaryFocus, routineType, day schedule, and communication style.
- HARD RULE: every startTime, endTime, reminderTime, and dueTime MUST be within dayStartTime and dayEndTime (inclusive). Never schedule outside this window.
- If dayStartTime is 06:30 and dayEndTime is 22:30, all times must be between 06:30 and 22:30.
- Dates must be ISO YYYY-MM-DD. Times HH:mm 24h.
- Do NOT invent IDs.`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Create my onboarding plan from this profile:\n${JSON.stringify(profile, null, 2)}`,
        },
      ],
      {
        temperature: 0.7,
        max_tokens: 3500,
        response_format: { type: "json_object" },
      },
    );

    const parsed = this.parseAiJson(response.content);

    return {
      goals: Array.isArray(parsed.goals) ? parsed.goals.slice(0, 5) : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.slice(0, 5) : [],
      habits: Array.isArray(parsed.habits) ? parsed.habits.slice(0, 5) : [],
      planner: parsed.planner || null,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  /**
   * Regenerate a single onboarding suggestion of one type.
   */
  async regenerateOnboardingItem(type, profile = {}, previousTitle = "") {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const today = new Date().toISOString().slice(0, 10);
    const windowNote = `HARD RULE: any reminderTime/startTime/endTime/dueTime must be between ${profile.dayStartTime || "06:30"} and ${profile.dayEndTime || "22:30"}.`;
    const typeGuide = {
      GOAL: `Return JSON: { "goal": { "title","description","category","priorityLevel","targetDate","proposedTasks":[...],"proposedHabits":[...] } }. Habit reminderTime must be inside the day window.`,
      TASK: `Return JSON: { "task": { "title","description","priority","category","estimatedMinutes","dueDate","dueTime" } }. dueTime must be inside the day window.`,
      HABIT: `Return JSON: { "habit": { "name","description","category","frequency","difficulty","targetDays","targetTimesPerDay","reminderTime" } }. reminderTime must be inside the day window. targetDays must be a random subset of 3-5 days, never all 7.`,
    };

    const response = await this.chat(
      [
        {
          role: "system",
          content: `You regenerate ONE ${type} suggestion for onboarding. ${typeGuide[type] || typeGuide.TASK}
${windowNote}
Use enums matching the app. Avoid repeating title "${previousTitle}". Today is ${today}.`,
        },
        {
          role: "user",
          content: `Profile:\n${JSON.stringify(profile, null, 2)}`,
        },
      ],
      {
        temperature: 0.8,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      },
    );

    return this.parseAiJson(response.content);
  }
}

module.exports = new OpenAIService();
