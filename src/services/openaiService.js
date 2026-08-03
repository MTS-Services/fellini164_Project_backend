const OpenAI = require("openai");

class OpenAIService {
  constructor() {
    this.model = "gpt-3.5-turbo";
    this._apiKey = null;
    this.client = null;
    this.refreshClient();
  }

  refreshClient() {
    if (process.env.NODE_ENV !== "production") {
      require("dotenv").config({ override: true });
    }

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
        throw new Error("Rate limit exceeded. Please try again later.");
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

    let targetDate = existing.targetDate;
    if (parsed.targetDate) {
      const parsedDate = new Date(parsed.targetDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        targetDate = parsedDate.toISOString().split("T")[0];
      }
    }

    return {
      title: parsed.title.trim(),
      description: parsed.description.trim(),
      category,
      priorityLevel,
      targetDate,
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
      status: habit.status,
      currentStreak: habit.currentStreak || 0,
      goalTitle: habit.goal?.title || null,
    };
  }

  normalizeImprovedHabit(parsed, existingHabit) {
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
      targetDays: Array.isArray(parsed.targetDays)
        ? parsed.targetDays
        : existing.targetDays,
      targetTimesPerDay: Number.isFinite(targetTimesPerDay)
        ? targetTimesPerDay
        : existing.targetTimesPerDay,
      reminderTime: parsed.reminderTime ?? existing.reminderTime,
    };
  }

  // Generate daily routine plan
  async generateDailyPlan(userInput, userPreferences = {}) {
    const systemPrompt = `You are an expert AI Life Coach specialized in creating personalized daily routine plans. 
Your task is to help users organize their day effectively based on their goals, responsibilities, and preferences.

Create structured, realistic, and actionable daily plans that include:
- Morning routine (wake up, exercise, breakfast, preparation)
- Work/study blocks with focused time
- Strategic breaks and meals
- Exercise or physical activity
- Personal development time
- Evening routine and wind-down

Consider:
- Work-life balance principles
- Productivity techniques (Pomodoro, time blocking)
- Energy management throughout the day
- The user's specific goals and constraints
- Realistic time allocations

Format your response with:
1. **Overview** - Brief summary of the day's focus
2. **Morning Routine** (time slots and activities)
3. **Work/Study Blocks** (with breaks)
4. **Afternoon/Evening** (activities and wind-down)
5. **Key Goals** - 3-5 priorities for the day
6. **Success Tips** - Practical advice

Be encouraging, practical, and specific with time allocations.`;

    const userMessage =
      userPreferences.wakeTime || userPreferences.workHours
        ? `Create a daily plan for me. ${userInput}\n\nMy preferences:\n- Wake time: ${userPreferences.wakeTime || "flexible"}\n- Work hours: ${userPreferences.workHours || "standard 9-5"}\n- Focus areas: ${userPreferences.focusAreas || "balanced productivity"}`
        : userInput;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    return this.chat(messages, { max_tokens: 2000 });
  }

  // Generate weekly plan
  async generateWeeklyPlan(userInput, userPreferences = {}) {
    const systemPrompt = `You are an expert AI Life Coach specialized in creating highly organized, comprehensive weekly routine plans.
Your task is to help users structure their entire week with strategic planning, detailed time blocks, and balanced priorities.

CREATE A COMPLETE 7-DAY STRUCTURED PLAN with DETAILED scheduling for EVERY day.

CORE PLANNING PRINCIPLES:
- Balance productivity with recovery
- Progressive energy management (build momentum through the week)
- Strategic task placement based on energy levels
- Include buffer time for unexpected events
- Integrate work, health, relationships, and personal growth
- Make it realistic and sustainable

FORMAT YOUR RESPONSE EXACTLY AS:

## 📋 Weekly Overview
**Week Theme:** [One-line theme for the week]
**Main Focus:** [Primary objective for the week]
**Success Definition:** [What makes this week successful]

---

## 📅 DETAILED DAILY PLANS

### Monday - [Date]
**Daily Theme:** Fresh Start & Momentum Building

**Morning Routine (6:00 AM - 9:00 AM)**
- 6:00 AM: Wake up, hydration (16 oz water)
- 6:15 AM: Morning meditation or journaling (10 min)
- 6:30 AM: Exercise (Cardio/Strength - 45 min)
- 7:15 AM: Shower & grooming
- 7:45 AM: Healthy breakfast & review daily goals
- 8:30 AM: Commute/Prepare for work

**Deep Work Block 1 (9:00 AM - 11:00 AM)**
- 9:00 AM - 10:30 AM: [Highest priority task - focused work]
- 10:30 AM - 10:45 AM: Break (stretch, walk, snack)
- 10:45 AM - 11:00 AM: Check emails and respond to urgent items

**Mid-Morning Block (11:00 AM - 12:30 PM)**
- 11:00 AM - 12:00 PM: [Secondary priority task]
- 12:00 PM - 12:30 PM: Administrative tasks, planning

**Lunch & Recharge (12:30 PM - 1:30 PM)**
- 12:30 PM: Healthy lunch (away from desk)
- 1:00 PM: Short walk or relaxation

**Afternoon Work Block (1:30 PM - 5:00 PM)**
- 1:30 PM - 3:00 PM: [Collaborative work or meetings]
- 3:00 PM - 3:15 PM: Break (hydration, movement)
- 3:15 PM - 5:00 PM: [Task completion or creative work]

**Evening Routine (5:00 PM - 10:00 PM)**
- 5:00 PM - 6:00 PM: Commute/Transition time
- 6:00 PM - 7:00 PM: Dinner preparation & eating
- 7:00 PM - 8:30 PM: [Personal project or hobby time]
- 8:30 PM - 9:30 PM: Relaxation (reading, family time, entertainment)
- 9:30 PM - 10:00 PM: Evening preparation (plan tomorrow, night routine)
- 10:00 PM: Sleep

**Monday's Top 3 Priorities:**
1. [Specific high-impact task]
2. [Important project milestone]
3. [Health/personal goal for the day]

---

### Tuesday - [Date]
**Daily Theme:** Building Momentum & Deep Focus

**Morning Routine (6:00 AM - 9:00 AM)**
- 6:00 AM: Wake up, hydration
- 6:15 AM: Light stretching or yoga (15 min)
- 6:30 AM: Exercise (HIIT or Sport - 40 min)
- 7:15 AM: Shower & grooming
- 7:45 AM: Nutritious breakfast & goal review
- 8:30 AM: Prepare for work day

**Deep Work Block 1 (9:00 AM - 11:00 AM)**
- 9:00 AM - 10:45 AM: [Most challenging task - peak focus]
- 10:45 AM - 11:00 AM: Quick break & energy boost

**Mid-Morning Block (11:00 AM - 12:30 PM)**
- 11:00 AM - 12:00 PM: [Progressive work on key project]
- 12:00 PM - 12:30 PM: Team check-ins or communications

**Lunch & Midday Break (12:30 PM - 1:30 PM)**
- 12:30 PM: Balanced lunch
- 1:00 PM: Mindful break (walk, meditation, or rest)

**Afternoon Work Block (1:30 PM - 5:00 PM)**
- 1:30 PM - 3:00 PM: [Important meetings or collaboration]
- 3:00 PM - 3:15 PM: Refresh break
- 3:15 PM - 5:00 PM: [Completion work or planning]

**Evening Routine (5:00 PM - 10:00 PM)**
- 5:00 PM - 6:00 PM: Transition & decompression
- 6:00 PM - 7:00 PM: Dinner & family time
- 7:00 PM - 8:00 PM: [Skill development or learning]
- 8:00 PM - 9:30 PM: Personal time (hobbies, socializing, relaxation)
- 9:30 PM - 10:00 PM: Wind-down routine
- 10:00 PM: Sleep

**Tuesday's Top 3 Priorities:**
1. [Critical task requiring deep focus]
2. [Collaboration or communication goal]
3. [Learning or skill-building activity]

---

### Wednesday - [Date]
**Daily Theme:** Peak Performance & Balance

**Morning Routine (6:00 AM - 9:00 AM)**
- 6:00 AM: Wake up, morning hydration
- 6:20 AM: Morning pages or gratitude practice
- 6:30 AM: Exercise (Mix cardio + strength - 45 min)
- 7:15 AM: Shower & self-care
- 7:45 AM: Power breakfast & mid-week review
- 8:30 AM: Work preparation

**Deep Work Block 1 (9:00 AM - 11:00 AM)**
- 9:00 AM - 10:30 AM: [High-value project work]
- 10:30 AM - 10:45 AM: Active break
- 10:45 AM - 11:00 AM: Quick administrative tasks

**Mid-Morning Block (11:00 AM - 12:30 PM)**
- 11:00 AM - 12:30 PM: [Focused execution on weekly goals]

**Lunch & Energy Renewal (12:30 PM - 1:30 PM)**
- 12:30 PM: Healthy lunch
- 1:00 PM: Recharge break (nature walk if possible)

**Afternoon Work Block (1:30 PM - 5:00 PM)**
- 1:30 PM - 3:00 PM: [Creative work or problem-solving]
- 3:00 PM - 3:15 PM: Energizing break
- 3:15 PM - 5:00 PM: [Wrap-up tasks and next-day prep]

**Evening Routine (5:00 PM - 10:00 PM)**
- 5:00 PM - 6:00 PM: Commute/Wind down
- 6:00 PM - 7:00 PM: Dinner & connection time
- 7:00 PM - 8:30 PM: [Mid-week social activity or hobby]
- 8:30 PM - 9:30 PM: Relaxation & self-care
- 9:30 PM - 10:00 PM: Evening routine & planning
- 10:00 PM: Sleep

**Wednesday's Top 3 Priorities:**
1. [Major project milestone]
2. [Social or relationship activity]
3. [Mid-week wellness check]

---

### Thursday - [Date]
**Daily Theme:** Sustained Productivity & Preparation

**Morning Routine (6:00 AM - 9:00 AM)**
- 6:00 AM: Wake up, hydration ritual
- 6:15 AM: Mindfulness practice (10 min)
- 6:30 AM: Exercise (Active recovery or sport - 40 min)
- 7:15 AM: Shower & grooming
- 7:45 AM: Energizing breakfast
- 8:30 AM: Work readiness

**Deep Work Block 1 (9:00 AM - 11:00 AM)**
- 9:00 AM - 10:30 AM: [Complex task requiring concentration]
- 10:30 AM - 11:00 AM: Break & light tasks

**Mid-Morning Block (11:00 AM - 12:30 PM)**
- 11:00 AM - 12:30 PM: [Progress on key objectives]

**Lunch & Midday Reset (12:30 PM - 1:30 PM)**
- 12:30 PM: Nutritious lunch
- 1:00 PM: Refreshing break

**Afternoon Work Block (1:30 PM - 5:00 PM)**
- 1:30 PM - 3:00 PM: [Meetings or collaborative tasks]
- 3:00 PM - 3:15 PM: Brief break
- 3:15 PM - 5:00 PM: [Week-end preparation & task completion]

**Evening Routine (5:00 PM - 10:00 PM)**
- 5:00 PM - 6:00 PM: Decompression time
- 6:00 PM - 7:00 PM: Dinner
- 7:00 PM - 8:30 PM: [Personal development or side project]
- 8:30 PM - 9:30 PM: Leisure & relaxation
- 9:30 PM - 10:00 PM: Wind-down
- 10:00 PM: Sleep

**Thursday's Top 3 Priorities:**
1. [Completion of weekly critical task]
2. [Prepare for Friday wrap-up]
3. [Evening skill practice or hobby]

---

### Friday - [Date]
**Daily Theme:** Completion & Weekend Transition

**Morning Routine (6:00 AM - 9:00 AM)**
- 6:00 AM: Wake up, morning routine
- 6:15 AM: Light morning movement
- 6:30 AM: Exercise (Fun workout - 40 min)
- 7:15 AM: Shower & refresh
- 7:45 AM: Breakfast & weekly review
- 8:30 AM: Final work day prep

**Deep Work Block 1 (9:00 AM - 11:00 AM)**
- 9:00 AM - 10:30 AM: [Finish priority tasks]
- 10:30 AM - 11:00 AM: Week review & planning

**Mid-Morning Block (11:00 AM - 12:30 PM)**
- 11:00 AM - 12:30 PM: [Wrap-up loose ends]

**Lunch & Pre-Weekend (12:30 PM - 1:30 PM)**
- 12:30 PM: Enjoyable lunch
- 1:00 PM: Celebration moment for week's wins

**Afternoon Work Block (1:30 PM - 5:00 PM)**
- 1:30 PM - 3:00 PM: [Final completions]
- 3:00 PM - 4:00 PM: Administrative wrap-up
- 4:00 PM - 5:00 PM: Next week planning

**Evening & Weekend Start (5:00 PM - 11:00 PM)**
- 5:00 PM - 6:00 PM: Transition to weekend mode
- 6:00 PM - 7:30 PM: Dinner & social time
- 7:30 PM - 10:30 PM: [Weekend activity or entertainment]
- 10:30 PM - 11:00 PM: Relaxed wind-down
- 11:00 PM: Sleep (later weekend schedule)

**Friday's Top 3 Priorities:**
1. [Complete all weekly must-dos]
2. [Weekly reflection & wins celebration]
3. [Plan next week's major objectives]

---

### Saturday - [Date]
**Daily Theme:** Rest, Recharge & Personal Time

**Flexible Morning (8:00 AM - 12:00 PM)**
- 8:00 AM: Natural wake-up (no alarm)
- 8:30 AM: Leisurely breakfast
- 9:00 AM - 10:00 AM: Exercise (Fun activity - hiking, sports, dance)
- 10:00 AM - 11:00 AM: Errands or household tasks
- 11:00 AM - 12:00 PM: Personal project or hobby

**Afternoon Freedom (12:00 PM - 6:00 PM)**
- 12:00 PM - 1:00 PM: Lunch (explore new place or cook special meal)
- 1:00 PM - 3:00 PM: [Main weekend activity - hobby, social, adventure]
- 3:00 PM - 4:00 PM: Relaxation break
- 4:00 PM - 6:00 PM: [Secondary activity or quality time]

**Evening Enjoyment (6:00 PM - 11:00 PM)**
- 6:00 PM - 7:30 PM: Dinner (social or special meal)
- 7:30 PM - 10:00 PM: [Entertainment, social time, or personal passion]
- 10:00 PM - 11:00 PM: Relaxed evening routine
- 11:00 PM: Sleep

**Saturday's Top 3 Priorities:**
1. [Physical activity or outdoor time]
2. [Social connection or relationship time]
3. [Personal passion or fun activity]

---

### Sunday - [Date]
**Daily Theme:** Recovery, Preparation & Intention Setting

**Restful Morning (8:00 AM - 12:00 PM)**
- 8:00 AM: Gentle wake-up
- 8:30 AM: Mindful breakfast
- 9:00 AM - 10:00 AM: Light yoga or stretching
- 10:00 AM - 11:00 AM: Weekly review & reflection
- 11:00 AM - 12:00 PM: Meal prep for the week

**Productive Afternoon (12:00 PM - 6:00 PM)**
- 12:00 PM - 1:00 PM: Healthy lunch
- 1:00 PM - 3:00 PM: [Light personal project or organization]
- 3:00 PM - 4:00 PM: Nature walk or outdoor time
- 4:00 PM - 5:00 PM: Week planning (review calendar, set intentions)
- 5:00 PM - 6:00 PM: Self-care time

**Evening Preparation (6:00 PM - 10:00 PM)**
- 6:00 PM - 7:00 PM: Dinner
- 7:00 PM - 8:00 PM: Prepare for Monday (layout clothes, prep bag)
- 8:00 PM - 9:00 PM: Relaxation & entertainment
- 9:00 PM - 9:30 PM: Evening routine (earlier for Monday readiness)
- 9:30 PM - 10:00 PM: Reading or meditation
- 10:00 PM: Sleep

**Sunday's Top 3 Priorities:**
1. [Weekly reflection & wins documentation]
2. [Meal prep & week preparation]
3. [Intentional rest & recovery]

---

## 🎯 WEEKLY OBJECTIVES

### Strategic Goals
1. **[Primary Goal]** - [Specific outcome expected]
2. **[Secondary Goal]** - [Specific outcome expected]
3. **[Development Goal]** - [Specific outcome expected]
4. **[Health/Wellness Goal]** - [Specific outcome expected]
5. **[Relationship/Social Goal]** - [Specific outcome expected]

### Key Milestones
- **Monday:** [Milestone to reach]
- **Wednesday:** [Mid-week checkpoint]
- **Friday:** [Week completion goal]

---

## 🌟 FOCUS AREAS & TIME ALLOCATION

**Work/Career (40%):**
- [Specific projects and deliverables]
- [Key meetings and collaborations]
- [Skill development activities]

**Health & Fitness (20%):**
- Exercise schedule: [Days and types]
- Nutrition goals: [Specific eating habits]
- Sleep target: [7-8 hours nightly]

**Personal Growth (15%):**
- Learning: [Specific skills or knowledge]
- Reading: [Books or articles]
- Reflection: [Journaling or meditation practice]

**Relationships (15%):**
- Social activities: [Specific plans]
- Family time: [Quality connection]
- Communication: [Check-ins with important people]

**Self-Care & Recovery (10%):**
- Rest days: [Specific recovery activities]
- Hobbies: [Fun and relaxation]
- Mental health: [Stress management practices]

---

## 💪 SUCCESS STRATEGIES

### Daily Habits to Maintain
- ✅ Wake up at consistent time (6:00 AM weekdays)
- ✅ Morning movement/exercise (6 days/week)
- ✅ Healthy breakfast daily
- ✅ Two 90-minute deep work blocks each workday
- ✅ Evening planning (10 minutes before bed)
- ✅ 8 hours sleep minimum

### Energy Management Tips
- Schedule hardest tasks during peak energy (9 AM - 11 AM)
- Take breaks every 90 minutes
- Use Pomodoro technique for focused work
- Stay hydrated (8+ glasses water daily)
- Limit caffeine after 2 PM

### Productivity Techniques
- **Time Blocking:** Pre-schedule all important tasks
- **2-Minute Rule:** Do quick tasks immediately
- **Batch Processing:** Group similar tasks together
- **Weekly Review:** Every Sunday evening
- **Daily Planning:** Every night for next day

### Flexibility Guidelines
- Allow 20% buffer time for unexpected events
- If a task takes longer, adjust next block (don't cascade delays)
- It's okay to move non-urgent tasks to next day
- Weekend plans can be adjusted based on energy

### Progress Tracking
- Daily: Check off completed priorities (aim for 3/3)
- Wednesday: Mid-week review of objectives
- Friday: Weekly wins celebration
- Sunday: Full week reflection and next week planning

---

## 🚀 WEEKLY MOTIVATION

**Remember:**
- Progress over perfection
- Small consistent actions compound
- Rest is productive
- Celebrate every win
- Adapt when needed, but stay committed to what matters

**This Week's Mantra:** [Inspiring one-liner for the week]

**Reward for Week Completion:** [Specific reward for achieving weekly goals]

---

Make this plan DETAILED, SPECIFIC, REALISTIC, and INSPIRING. Every time block should have clear activities. Every day should feel structured yet flexible. The user should feel excited and capable of following this plan!`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput },
    ];

    return this.chat(messages, { max_tokens: 4000 });
  }

  // Generate monthly plan
  async generateMonthlyPlan(userInput, userPreferences = {}) {
    const systemPrompt = `You are an expert AI Life Coach specialized in creating comprehensive monthly planning strategies.
Your task is to help users organize their entire month effectively with strategic goals, weekly breakdowns, and daily routine guidance.

CREATE A COMPLETE MONTH PLAN that includes:
- Monthly vision and strategic goals
- Week-by-week detailed breakdown (4-5 weeks)
- Daily routine guidelines for each week
- Key milestones and deadlines
- Balanced approach to all life areas
- Progress tracking and celebration points

IMPORTANT: Include weekly AND daily routine details within each week.

FORMAT YOUR RESPONSE EXACTLY AS:

## Monthly Vision - [Month Year]
[Overarching theme, main objectives, and what success looks like this month]

## Strategic Goals
1. [Major goal 1 with specific outcome]
2. [Major goal 2 with specific outcome]
3. [Major goal 3 with specific outcome]
4. [Major goal 4 with specific outcome]
5. [Major goal 5 with specific outcome]

## Week 1: [Week Theme/Focus]
**Weekly Objectives:**
- [Specific objective 1]
- [Specific objective 2]
- [Specific objective 3]

**Daily Routine Guidelines:**
- **Monday-Friday:**
  - Morning: [6:00-9:00 AM] - Wake up, exercise, planning
  - Work Blocks: [9:00 AM-5:00 PM] - Focused work with breaks
  - Evening: [6:00-10:00 PM] - Personal time, reflection, rest
- **Weekend:**
  - Saturday: [Activities for personal growth, social time]
  - Sunday: [Rest, meal prep, weekly review]

**Key Tasks:**
1. [Specific task with deadline]
2. [Specific task with deadline]
3. [Specific task with deadline]

## Week 2: [Week Theme/Focus]
**Weekly Objectives:**
- [Specific objective 1]
- [Specific objective 2]
- [Specific objective 3]

**Daily Routine Guidelines:**
- **Monday-Friday:**
  - Morning: [Routine with specific activities]
  - Work Blocks: [Focused activities and projects]
  - Evening: [Wind-down and personal development]
- **Weekend:**
  - Saturday: [Balanced activities]
  - Sunday: [Preparation and rest]

**Key Tasks:**
1. [Task with deadline]
2. [Task with deadline]
3. [Task with deadline]

## Week 3: [Week Theme/Focus]
**Weekly Objectives:**
- [Specific objective 1]
- [Specific objective 2]
- [Specific objective 3]

**Daily Routine Guidelines:**
- **Monday-Friday:**
  - Morning: [6:00-9:00 AM] - [Activities]
  - Work Blocks: [9:00 AM-5:00 PM] - [Focus areas]
  - Evening: [6:00-10:00 PM] - [Activities]
- **Weekend:**
  - Saturday: [Activities]
  - Sunday: [Review and planning]

**Key Tasks:**
1. [Task with deadline]
2. [Task with deadline]
3. [Task with deadline]

## Week 4: [Week Theme/Focus]
**Weekly Objectives:**
- [Specific objective 1]
- [Specific objective 2]
- [Specific objective 3]

**Daily Routine Guidelines:**
- **Monday-Friday:**
  - Morning: [Routine]
  - Work Blocks: [Activities]
  - Evening: [Wind-down]
- **Weekend:**
  - Saturday: [Final push on monthly goals]
  - Sunday: [Monthly review and next month prep]

**Key Tasks:**
1. [Task with deadline]
2. [Task with deadline]
3. [Task with deadline]

## Major Milestones & Deadlines
- Week 1: [Important deadline/milestone]
- Week 2: [Important deadline/milestone]
- Week 3: [Important deadline/milestone]
- Week 4: [Important deadline/milestone]

## Life Areas Balance
- **Career/Work:** [30%] - [Specific focus areas]
- **Health & Fitness:** [20%] - [Workout schedule, nutrition goals]
- **Relationships:** [15%] - [Social activities, family time]
- **Personal Growth:** [20%] - [Learning, skills development]
- **Rest & Recovery:** [15%] - [Self-care, relaxation]

## Daily Habits to Build
1. [Habit 1] - Morning routine
2. [Habit 2] - Midday practice
3. [Habit 3] - Evening routine

## Success Metrics
- [Metric 1: How to measure]
- [Metric 2: How to measure]
- [Metric 3: How to measure]
- [Metric 4: How to measure]

## Monthly Reflection Questions
1. What were my biggest wins this month?
2. What challenges did I overcome?
3. What habits did I successfully build?
4. What would I do differently next month?
5. How did I grow personally and professionally?

## Celebration Points
- Week 1: [Small win to celebrate]
- Week 2: [Progress milestone]
- Week 3: [Achievement to acknowledge]
- Week 4: [Month completion celebration]

Make it comprehensive, inspiring, and ACTIONABLE with specific weekly themes, daily routine guidelines, and clear milestones throughout the month.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput },
    ];

    return this.chat(messages, { max_tokens: 4000 });
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

    const systemPrompt = `You are an expert productivity coach. Generate ONE actionable task from the user's prompt.

Return ONLY valid JSON:
{
  "task": {
    "title": "Clear task title",
    "description": "What to do and why",
    "category": "PRODUCTIVITY",
    "priority": "MEDIUM",
    "dueDate": "2026-07-10",
    "dueTime": "09:00",
    "estimatedMinutes": 30,
    "energyLevelRequired": "medium",
    "difficultyLevel": 5,
    "tags": ["focus"]
  },
  "goal": {
    "suggestedGoalId": null
  }
}

Valid priorities: LOW, MEDIUM, HIGH, URGENT
Valid categories: CAREER, HEALTH, FINANCE, FITNESS, WELLNESS, PRODUCTIVITY, PERSONAL, EDUCATION
Valid energy levels: low, medium, high
If active goals are provided, set suggestedGoalId to the best matching goal id or null.
dueDate must be ISO date (YYYY-MM-DD) or null.`;

    const goalsContext = context.goals?.length
      ? `\nActive goals:\n${JSON.stringify(context.goals, null, 2)}`
      : "";

    const categoryHint = context.category
      ? `\nPreferred category: ${context.category}`
      : "";
    const goalHint = context.goalId
      ? `\nLink to goal ID: ${context.goalId}`
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

    return {
      success: true,
      task: {
        title: parsed.task?.title || parsed.title,
        description: parsed.task?.description || parsed.description || null,
        category:
          parsed.task?.category ||
          parsed.category ||
          context.category ||
          "OTHER",
        priority: parsed.task?.priority || parsed.priority || "MEDIUM",
        dueDate: parsed.task?.dueDate || parsed.dueDate || null,
        dueTime: parsed.task?.dueTime || parsed.dueTime || null,
        estimatedMinutes:
          parsed.task?.estimatedMinutes ?? parsed.estimatedMinutes ?? 30,
        energyLevelRequired:
          parsed.task?.energyLevelRequired ||
          parsed.energyLevelRequired ||
          null,
        difficultyLevel:
          parsed.task?.difficultyLevel ?? parsed.difficultyLevel ?? 5,
        tags: parsed.task?.tags || parsed.tags || [],
        aiRecommendation:
          parsed.task?.aiRecommendation || parsed.aiRecommendation || null,
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

    const systemPrompt = `You are an expert habit coach. Generate ONE sustainable habit from the user's prompt.

Return ONLY valid JSON:
{
  "habit": {
    "name": "Clear habit name",
    "description": "Why this habit matters and how to practice it",
    "category": "PERSONAL",
    "frequency": "DAILY",
    "difficulty": "MEDIUM",
    "targetDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    "targetTimesPerDay": 1,
    "reminderTime": "08:00"
  },
  "goal": {
    "suggestedGoalId": null
  }
}

Valid categories: CAREER, HEALTH, FINANCE, FITNESS, WELLNESS, PRODUCTIVITY, PERSONAL, EDUCATION
Valid frequency: DAILY, WEEKLY, MONTHLY
Valid difficulty: EASY, MEDIUM, HARD
reminderTime must be HH:mm or null.
If active goals are provided, set suggestedGoalId to the best matching goal id or null.`;

    const goalsContext = context.goals?.length
      ? `\nActive goals:\n${JSON.stringify(context.goals, null, 2)}`
      : "";
    const categoryHint = context.category
      ? `\nPreferred category: ${context.category}`
      : "";
    const goalHint = context.goalId
      ? `\nLink to goal ID: ${context.goalId}`
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
    const targetTimesPerDay =
      habit.targetTimesPerDay != null ? Number(habit.targetTimesPerDay) : 1;

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
        targetDays: Array.isArray(habit.targetDays) ? habit.targetDays : [],
        targetTimesPerDay: Number.isFinite(targetTimesPerDay)
          ? targetTimesPerDay
          : 1,
        reminderTime: habit.reminderTime || null,
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
  async improveHabit(existingHabit, instructions = "") {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const current = this.formatHabitForAi(existingHabit);

    const systemPrompt = `You improve an existing user habit. Read the current habit data and return an improved version.

Update only: name, description, category, frequency, difficulty, targetDays, targetTimesPerDay, reminderTime.
Do NOT change status, goal, streaks, completions, or create tasks.

The improved name and description MUST be different and better than the current ones.
Make the habit more specific, realistic, and sustainable when possible.
If the user gives instructions, apply them to THIS habit only.

Return ONLY valid JSON:
{
  "name": "Improved habit name",
  "description": "Improved habit description",
  "category": "HABITS",
  "frequency": "DAILY",
  "difficulty": "MEDIUM",
  "targetDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  "targetTimesPerDay": 1,
  "reminderTime": "08:00"
}

Valid categories: CAREER, HEALTH, FINANCE, FITNESS, WELLNESS, PRODUCTIVITY, PERSONAL, EDUCATION
Valid frequency: DAILY, WEEKLY, MONTHLY
Valid difficulty: EASY, MEDIUM, HARD
reminderTime must be HH:mm or null.`;

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
    const habit = this.normalizeImprovedHabit(parsed, existingHabit);

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
    const systemPrompt = `You are an expert life coach helping users define clear, achievable goals.

Generate ONLY goal metadata. Do NOT create tasks, habits, or action steps.

Return ONLY valid JSON with this exact structure:
{
  "title": "Goal title",
  "description": "2-3 sentence motivating description",
  "category": "CAREER",
  "priorityLevel": "MEDIUM",
  "targetDate": "2026-07-10"
}

Valid categories: ${[
      "CAREER",
      "HEALTH",
      "FINANCE",
      "PERSONAL",
      "EDUCATION",
    ].join(", ")}

Valid priorityLevel: LOW, MEDIUM, HIGH, URGENT

targetDate must be ISO date (YYYY-MM-DD) within the next 90 days unless the user specifies otherwise.`;

    const userMessage = context.category
      ? `User prompt: ${userPrompt}\nPreferred category: ${context.category}`
      : `User prompt: ${userPrompt}`;

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
        targetDate: parsed.targetDate,
      },
      tokensUsed: response.usage?.total_tokens,
    };
  }

  // Improve an existing goal by its current data (goalId-based)
  async improveGoal(existingGoal, instructions = "") {
    const current = this.formatGoalForAi(existingGoal);

    const systemPrompt = `You improve an existing user goal. Read the current goal data and return an improved version.

Update only: title, description, category, priorityLevel, targetDate.
Do NOT create tasks or habits.

The improved title and description must be different and better than the current ones.
Make the goal more specific, clear, and measurable when possible.

Return ONLY valid JSON:
{
  "title": "Improved title",
  "description": "Improved description",
  "category": "CAREER",
  "priorityLevel": "MEDIUM",
  "targetDate": "2026-07-10"
}

Valid categories: CAREER, HEALTH, FINANCE, PERSONAL, EDUCATION
Valid priorityLevel: LOW, MEDIUM, HIGH, URGENT`;

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
        "Propose 1-3 new sustainable habits that support this goal. Do NOT change goal fields unless clearly needed. Leave proposedTasks empty.",
    };

    const systemPrompt = `You are a Goal AI Assistant for a productivity app.

You suggest changes for ONE existing goal. The frontend will preview your suggestion and the user can Accept or Cancel.

Return ONLY valid JSON with this exact structure:
{
  "title": "Short suggestion title",
  "message": "Friendly message explaining what you suggest (2-4 sentences)",
  "proposedGoal": {
    "title": "Updated title or same",
    "description": "Updated description or same",
    "category": "CAREER",
    "priorityLevel": "MEDIUM",
    "targetDate": "2026-08-01"
  },
  "proposedTasks": [
    {
      "title": "Task title",
      "description": "What to do",
      "priority": "MEDIUM",
      "category": "CAREER",
      "estimatedMinutes": 30,
      "dueDate": "2026-08-01"
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
- Dates must be ISO YYYY-MM-DD or null
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
      .map((t) => ({
        title: t.title.trim(),
        description: t.description?.trim() || null,
        priority: validTaskPriorities.includes(t.priority)
          ? t.priority
          : "MEDIUM",
        category: validGoalCats.includes(t.category)
          ? t.category
          : proposedGoal.category,
        estimatedMinutes:
          t.estimatedMinutes != null ? Number(t.estimatedMinutes) : null,
        dueDate: t.dueDate || null,
      }));

    const proposedHabits = (
      Array.isArray(parsed.proposedHabits) ? parsed.proposedHabits : []
    )
      .filter((h) => h?.name?.trim())
      .map((h) => ({
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
        targetTimesPerDay:
          h.targetTimesPerDay != null ? Number(h.targetTimesPerDay) : 1,
        reminderTime: h.reminderTime || null,
      }));

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

  // Planner AI — scheduling only, never modifies task/habit content
  async suggestPlannerSchedule(action, userMessage = "", context = {}) {
    if (!this.client) {
      throw new Error("OpenAI service not configured");
    }

    const actionPrompts = {
      GENERATE_PLAN: "Build a suggested plan from available tasks and habits.",
      RECALIBRATE_DAY:
        "Recalibrate the day schedule to be more realistic and balanced.",
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

  // Create Plan modal — generate tasks + schedule across a date range
  async generateCreatePlan(prompt, context = {}) {
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

    const systemPrompt = `You are a Planner AI helping a user create a new plan.

CRITICAL RULES (MVP):
- You ONLY schedule EXISTING tasks and habits by their IDs.
- Do NOT create new tasks or habits.
- Do NOT edit task/habit titles, descriptions, categories, or structure.
- Task and Habit content is managed outside the Planner layer.

The user describes WHAT they want to organize (e.g. "focus on portfolio work and health habits").
Pick the most relevant items from the available lists and place them into the date range with realistic times.

Return ONLY valid JSON:
{
  "title": "Portfolio focus plan",
  "message": "Your plan is ready! I scheduled your existing tasks and habits.",
  "placements": [
    {
      "itemType": "TASK",
      "taskId": "existing-task-uuid",
      "habitId": null,
      "date": "2026-05-13",
      "startTime": "09:00",
      "endTime": "10:00",
      "orderIndex": 0,
      "viewType": "DAILY"
    },
    {
      "itemType": "HABIT",
      "taskId": null,
      "habitId": "existing-habit-uuid",
      "date": "2026-05-13",
      "startTime": "07:00",
      "endTime": "07:15",
      "orderIndex": 1,
      "viewType": "DAILY"
    }
  ]
}

Rules:
- Only use taskId / habitId from the provided available lists.
- For TASK use taskId only. For HABIT use habitId only.
- All placement dates must be within ${startIso} to ${endIso}.
- viewType: ${context.viewType || "DAILY"}
- startTime/endTime format: HH:mm (24h) or null for monthly overview items.
- Prefer items that match the user's prompt; balance workload across the range.`;

    const userPrompt = `What to plan: ${prompt}

Date range: ${context.dateRangeLabel || "CUSTOM"} (${startIso} to ${endIso})
View type: ${context.viewType || "DAILY"}

User settings:
${JSON.stringify(context.settings || {}, null, 2)}

Existing schedule:
${JSON.stringify(context.currentSchedule || [], null, 2)}

Available tasks (schedule by taskId only):
${JSON.stringify(context.availableTasks || [], null, 2)}

Available habits (schedule by habitId only):
${JSON.stringify(context.availableHabits || [], null, 2)}`;

    const response = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: "json_object" },
      },
    );

    const parsed = this.parseAiJson(response.content);

    const placements = (parsed.placements || []).map((p, index) => ({
      itemType: p.itemType,
      taskId: p.itemType === "TASK" && p.taskId ? p.taskId : null,
      habitId: p.itemType === "HABIT" && p.habitId ? p.habitId : null,
      date: p.date,
      startTime: p.startTime || null,
      endTime: p.endTime || null,
      orderIndex: p.orderIndex ?? index,
      viewType: p.viewType || context.viewType || "DAILY",
    }));

    return {
      success: true,
      title: parsed.title || "New plan",
      message: parsed.message || "Your plan has been created.",
      placements,
      tokensUsed: response.usage?.total_tokens,
    };
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
      "targetDays": ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"],
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
        "title": "Must match a goal task or standalone task title",
        "startTime": "09:00",
        "endTime": "09:45",
        "orderIndex": 0
      }
    ]
  }
}

Rules:
- Return exactly 3 goals, 3 standalone tasks, 3 standalone habits, and 1 planner day.
- Each goal must include 1-3 proposedTasks and 1-2 proposedHabits.
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
      HABIT: `Return JSON: { "habit": { "name","description","category","frequency","difficulty","targetDays","targetTimesPerDay","reminderTime" } }. reminderTime must be inside the day window.`,
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
