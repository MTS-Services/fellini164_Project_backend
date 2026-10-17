const prisma = require("../config/database");
const {
  PLAN_LIMITS,
  PLAN_FEATURES,
  PLAN_HIERARCHY,
  AI_PERSONALITIES,
} = require("../utils/constants");

const ADVANCED_PLANNER_ACTIONS = [
  "GENERATE_PLAN",
  "RECALIBRATE_DAY",
  "REDUCE_OVERLOAD",
  "OPTIMIZE_SCHEDULE",
  "BALANCE_SCHEDULE",
  "FREE_EVENING",
];

// PlanFeatureService is a service that provides features and limits for a user's plan
class PlanFeatureService {
  getLimits(plan = "FREE") {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
  }

  getFeatures(plan = "FREE") {
    return PLAN_FEATURES[plan] || PLAN_FEATURES.FREE;
  }

  planRank(plan) {
    return PLAN_HIERARCHY[plan] ?? 0;
  }

  throwForbidden(message, code = "PLAN_LIMIT") {
    const error = new Error(message);
    error.statusCode = 403;
    error.code = code;
    throw error;
  }

  async getUserContext(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        subscriptionPlan: true,
        dailyAiMessagesUsed: true,
        dailyPlansGenerated: true,
        lastUsageReset: true,
      },
    });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    await this.resetDailyUsageIfNeeded(user);

    const plan = user.subscriptionPlan || "FREE";
    const limits = this.getLimits(plan);

    const [activeGoals, activeHabits] = await Promise.all([
      prisma.goal.count({ where: { userId, status: "ACTIVE" } }),
      prisma.habit.count({
        where: { userId, status: "ACTIVE", isActive: true },
      }),
    ]);

    return {
      user,
      plan,
      limits,
      features: this.getFeatures(plan),
      usage: {
        dailyAiMessagesUsed: user.dailyAiMessagesUsed,
        dailyPlansGenerated: user.dailyPlansGenerated,
        activeGoals,
        activeHabits,
      },
    };
  }

  async resetDailyUsageIfNeeded(user) {
    const last = user.lastUsageReset ? new Date(user.lastUsageReset) : null;
    const now = new Date();
    const sameDay =
      last &&
      last.getFullYear() === now.getFullYear() &&
      last.getMonth() === now.getMonth() &&
      last.getDate() === now.getDate();

    if (sameDay) return;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        dailyAiMessagesUsed: 0,
        dailyPlansGenerated: 0,
        lastUsageReset: now,
      },
    });

    user.dailyAiMessagesUsed = 0;
    user.dailyPlansGenerated = 0;
    user.lastUsageReset = now;
  }

  async getPlanSummary(userId) {
    const ctx = await this.getUserContext(userId);
    const { plan, limits, features, usage, user } = ctx;

    return {
      plan,
      features,
      limits: {
        dailyAiMessages:
          limits.dailyAiMessages === -1 ? "unlimited" : limits.dailyAiMessages,
        weeklyPlanning: limits.weeklyPlanning,
        monthlyPlanning: limits.monthlyPlanning,
        maxGoals: limits.maxGoals === -1 ? "unlimited" : limits.maxGoals,
        maxHabits: limits.maxHabits === -1 ? "unlimited" : limits.maxHabits,
        maxAiPersonas:
          limits.maxAiPersonas === -1 ? "unlimited" : limits.maxAiPersonas,
        historyDays: limits.historyDays,
        productivityInsights: limits.productivityInsights,
        advancedAutomations: limits.advancedAutomations,
        energyPlanning: limits.energyPlanning,
        fullLifePlanning: limits.fullLifePlanning,
        voiceCoach: limits.voiceCoach,
        monthlyCoaching: limits.monthlyCoaching,
        earlyFeatureAccess: limits.earlyFeatureAccess,
      },
      usage: {
        dailyAiMessagesUsed: usage.dailyAiMessagesUsed,
        dailyAiMessagesRemaining:
          limits.dailyAiMessages === -1
            ? null
            : Math.max(0, limits.dailyAiMessages - usage.dailyAiMessagesUsed),
        dailyPlansGenerated: usage.dailyPlansGenerated,
        activeGoals: usage.activeGoals,
        activeHabits: usage.activeHabits,
      },
    };
  }

  async assertAiMessageAllowed(userId) {
    const { user, plan, limits } = await this.getUserContext(userId);
    if (limits.dailyAiMessages === -1) return { plan, limits };

    if (user.dailyAiMessagesUsed >= limits.dailyAiMessages) {
      this.throwForbidden(
        `Daily AI limit reached (${limits.dailyAiMessages} on ${plan}). Upgrade your plan for more AI assistance.`,
        "AI_LIMIT",
      );
    }

    return { plan, limits };
  }

  async consumeAiMessage(userId) {
    await this.assertAiMessageAllowed(userId);
    await prisma.user.update({
      where: { id: userId },
      data: { dailyAiMessagesUsed: { increment: 1 } },
    });
  }

  async assertCanCreateGoal(userId) {
    const { limits, usage } = await this.getUserContext(userId);
    if (limits.maxGoals === -1) return;
    if (usage.activeGoals >= limits.maxGoals) {
      this.throwForbidden(
        `Goal limit reached (${limits.maxGoals} on your plan). Upgrade to create more goals.`,
        "GOAL_LIMIT",
      );
    }
  }

  async assertCanCreateHabit(userId) {
    const { limits, usage, plan } = await this.getUserContext(userId);
    const cap = limits.maxHabits ?? limits.maxRoutines;
    if (cap === -1) return;

    if (usage.activeHabits >= cap) {
      this.throwForbidden(
        plan === "FREE"
          ? `Free plan allows ${cap} active routine. Upgrade to Starter for unlimited routines.`
          : `Habit limit reached (${cap} on your plan). Upgrade to add more.`,
        "HABIT_LIMIT",
      );
    }
  }

  assertPlannerView(userId, viewType) {
    return this.getUserContext(userId).then(({ plan, limits }) => {
      if (viewType === "WEEKLY" && !limits.weeklyPlanning) {
        this.throwForbidden(
          `Weekly planning requires Starter or higher. Your plan: ${plan}.`,
          "WEEKLY_PLANNING",
        );
      }
      if (viewType === "MONTHLY" && !limits.monthlyPlanning) {
        this.throwForbidden(
          `Monthly planning requires Pro or higher. Your plan: ${plan}.`,
          "MONTHLY_PLANNING",
        );
      }
    });
  }

  async assertCreatePlanRange(userId, dateRange) {
    const { plan, limits, user } = await this.getUserContext(userId);

    if (dateRange === "THIS_MONTH" && !limits.monthlyPlanning) {
      this.throwForbidden(
        `Monthly plans require Pro or higher. Your plan: ${plan}.`,
        "MONTHLY_PLANNING",
      );
    }

    if (
      (dateRange === "THIS_WEEK" || dateRange === "CUSTOM") &&
      !limits.weeklyPlanning
    ) {
      this.throwForbidden(
        `Weekly and custom plans require Starter or higher. Your plan: ${plan}.`,
        "WEEKLY_PLANNING",
      );
    }

    if (dateRange === "TODAY" && limits.dailyPlans !== -1) {
      if (user.dailyPlansGenerated >= limits.dailyPlans) {
        this.throwForbidden(
          `Daily plan limit reached (${limits.dailyPlans}/day on Free). Upgrade for unlimited planning.`,
          "DAILY_PLAN_LIMIT",
        );
      }
    }

    if (limits.fullLifePlanning && dateRange === "THIS_MONTH") {
      return;
    }
  }

  async consumeDailyPlan(userId) {
    const { limits } = await this.getUserContext(userId);
    if (limits.dailyPlans === -1) return;

    await prisma.user.update({
      where: { id: userId },
      data: { dailyPlansGenerated: { increment: 1 } },
    });
  }

  async assertPlannerAiAction(userId, { action, viewType, energyLevel } = {}) {
    const { plan, limits } = await this.getUserContext(userId);

    if (viewType) {
      await this.assertPlannerView(userId, viewType);
    }

    if (energyLevel && !limits.energyPlanning) {
      this.throwForbidden(
        `Energy-based planning is available on Ultimate. Your plan: ${plan}.`,
        "ENERGY_PLANNING",
      );
    }

    if (action === "CHAT") return;

    if (ADVANCED_PLANNER_ACTIONS.includes(action) && !limits.advancedAutomations) {
      this.throwForbidden(
        `Advanced planner automations require Pro or higher. Your plan: ${plan}.`,
        "ADVANCED_AUTOMATION",
      );
    }
  }

  async assertProductivityInsights(userId) {
    const { plan, limits } = await this.getUserContext(userId);
    if (!limits.productivityInsights) {
      this.throwForbidden(
        `Productivity insights require Pro or higher. Your plan: ${plan}.`,
        "PRODUCTIVITY_INSIGHTS",
      );
    }
  }

  clampHistoryDays(userId, requestedDays) {
    return this.getUserContext(userId).then(({ limits }) => {
      const maxDays = limits.historyDays ?? 365;
      if (maxDays === -1) return requestedDays;
      return Math.min(requestedDays, maxDays);
    });
  }

  assertAiPersona(plan, personaName) {
    const limits = this.getLimits(plan);
    if (limits.maxAiPersonas === -1) return;

    const index = AI_PERSONALITIES.indexOf(personaName);
    if (index === -1) return;
    if (index >= limits.maxAiPersonas) {
      this.throwForbidden(
        `Your ${plan} plan includes ${limits.maxAiPersonas} AI assistant(s). Upgrade for more personas.`,
        "AI_PERSONA_LIMIT",
      );
    }
  }
}

module.exports = new PlanFeatureService();
