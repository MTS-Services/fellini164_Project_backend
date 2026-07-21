// Subscription plan limits
exports.PLAN_LIMITS = {
  FREE: {
    dailyAiMessages: 20, // 20 per day (or 200/month)
    dailyPlans: 1,
    weeklyPlans: 0,
    monthlyPlans: 0,
    maxGoals: 1,
    maxHabits: 1,
    maxRoutines: 1,
    maxAiPersonas: 1,
    hasWatermark: true,
    historyAccess: 'limited',
    responseSpeed: 'standard'
  },
  STARTER: {
    dailyAiMessages: -1, // unlimited (fair use)
    dailyPlans: -1,
    weeklyPlans: 0,
    monthlyPlans: 0,
    maxGoals: 20,
    maxHabits: 20,
    maxRoutines: 5,
    maxAiPersonas: 1,
    hasWatermark: false,
    historyAccess: 'monthly',
    responseSpeed: 'standard',
    hasMonthlyReports: true
  },
  PRO: {
    dailyAiMessages: -1,
    dailyPlans: -1,
    weeklyPlans: -1,
    monthlyPlans: -1,
    maxGoals: -1,
    maxHabits: -1,
    maxRoutines: -1,
    maxAiPersonas: 3,
    hasWatermark: false,
    historyAccess: 'unlimited',
    responseSpeed: 'priority',
    hasWeeklyReports: true,
    hasMonthlyReports: true,
    hasProductivityAnalysis: true,
    hasHabitDifficultyAdjustment: true
  },
  ULTIMATE: {
    dailyAiMessages: -1,
    dailyPlans: -1,
    weeklyPlans: -1,
    monthlyPlans: -1,
    maxGoals: -1,
    maxHabits: -1,
    maxRoutines: -1,
    maxAiPersonas: -1, // all personas
    hasWatermark: false,
    historyAccess: 'unlimited',
    responseSpeed: 'fastest',
    hasWeeklyReports: true,
    hasMonthlyReports: true,
    hasProductivityAnalysis: true,
    hasHabitDifficultyAdjustment: true,
    hasLifeBlueprint: true,
    hasVoiceCoach: true,
    hasRoutineOptimizer: true,
    hasEnergyPlanning: true,
    hasMonthlyCoaching: true,
    earlyFeatureAccess: true
  }
};

// Subscription plan prices (amount in cents)
exports.PLAN_PRICES = {
  STARTER: {
    monthly: {
      amount: 799, // $7.99
      currency: 'usd',
      display: '$7.99/month'
    },
    yearly: {
      amount: 7900, // $79/year (2 months free)
      currency: 'usd',
      display: '$79/year',
      savings: '$16.88'
    }
  },
  PRO: {
    monthly: {
      amount: 1799, // $17.99
      currency: 'usd',
      display: '$17.99/month'
    },
    yearly: {
      amount: 17900, // $179/year (best value)
      currency: 'usd',
      display: '$179/year',
      savings: '$36.88'
    }
  },
  ULTIMATE: {
    monthly: {
      amount: 3999, // $39.99
      currency: 'usd',
      display: '$39.99/month'
    },
    yearly: {
      amount: 39900, // $399/year
      currency: 'usd',
      display: '$399/year',
      savings: '$79.88'
    }
  }
};

// Goal categories
exports.GOAL_CATEGORIES = [
  'CAREER',
  'HEALTH',
  'FINANCE',
  'PERSONAL',
  'EDUCATION'
];

// AI personalities
exports.AI_PERSONALITIES = [
  'Strict Coach',
  'Friendly Mentor',
  'Therapist Coach',
  'Productivity Expert',
  'Fitness Coach'
];

// Notification types
exports.NOTIFICATION_TYPES = {
  WELCOME: 'WELCOME',
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  SUBSCRIPTION_CONFIRMATION: 'SUBSCRIPTION_CONFIRMATION',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  TRIAL_ENDING: 'TRIAL_ENDING',
  CANCELLATION_CONFIRMATION: 'CANCELLATION_CONFIRMATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PLAN_UPDATED: 'PLAN_UPDATED',
  MONTHLY_SUMMARY: 'MONTHLY_SUMMARY',
  DAILY_REMINDER: 'DAILY_REMINDER',
  HABIT_REMINDER: 'HABIT_REMINDER',
  STREAK_NOTIFICATION: 'STREAK_NOTIFICATION'
};

// HTTP Status codes
exports.HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};
