const prisma = require("../config/database");

const PREFERENCE_FIELDS = ["habitReminders", "alerts", "productUpdates"];

const TYPE_TO_PREFERENCE = {
  HABIT_REMINDER: "habitReminders",
  STREAK_NOTIFICATION: "habitReminders",
  ANNOUNCEMENT: "productUpdates",
  FEATURE_RELEASE: "productUpdates",
  DAILY_REMINDER: "alerts",
  WEEKLY_REVIEW: "alerts",
  GOAL_MILESTONE: "alerts",
  PAYMENT_FAILED: "alerts",
  TRIAL_ENDING: "alerts",
  PLAN_UPDATED: "alerts",
  CANCELLATION_CONFIRMATION: "alerts",
  MONTHLY_SUMMARY: "alerts",
  REFERRAL_REWARD: "alerts",
};

class NotificationPreferenceService {
  pick(settings) {
    return {
      habitReminders: settings?.habitReminders !== false,
      alerts: settings?.alerts !== false,
      productUpdates: settings?.productUpdates !== false,
    };
  }

  async getOrCreate(userId) {
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: {
        habitReminders: true,
        alerts: true,
        productUpdates: true,
      },
    });

    return this.pick(settings);
  }

  async update(userId, payload = {}) {
    const data = {};
    for (const field of PREFERENCE_FIELDS) {
      if (typeof payload[field] === "boolean") {
        data[field] = payload[field];
      }
    }

    if (Object.keys(data).length === 0) {
      const error = new Error(
        "Provide at least one of habitReminders, alerts, productUpdates",
      );
      error.statusCode = 400;
      throw error;
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
      select: {
        habitReminders: true,
        alerts: true,
        productUpdates: true,
      },
    });

    return this.pick(settings);
  }

  async canSend(userId, preference) {
    if (!PREFERENCE_FIELDS.includes(preference)) return true;

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        habitReminders: true,
        alerts: true,
        productUpdates: true,
      },
    });

    if (!settings) return true;
    return settings[preference] !== false;
  }

  async canSendByType(userId, notificationType) {
    const preference = TYPE_TO_PREFERENCE[notificationType];
    if (!preference) return true;
    return this.canSend(userId, preference);
  }

  async filterAllowedUserIds(userIds = [], preference) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (!uniqueIds.length || !PREFERENCE_FIELDS.includes(preference)) {
      return uniqueIds;
    }

    const optedOut = await prisma.userSettings.findMany({
      where: {
        userId: { in: uniqueIds },
        [preference]: false,
      },
      select: { userId: true },
    });

    const blocked = new Set(optedOut.map((row) => row.userId));
    return uniqueIds.filter((id) => !blocked.has(id));
  }

  isEnabledOnSettings(settings, preference) {
    if (!settings) return true;
    return settings[preference] !== false;
  }
}

module.exports = new NotificationPreferenceService();
