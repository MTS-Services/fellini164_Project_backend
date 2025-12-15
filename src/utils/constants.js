// Subscription plan limits
exports.PLAN_LIMITS = {
  FREE: {
    dailyAiMessages: 10,
    dailyPlans: 1,
    weeklyPlans: 0,
    monthlyPlans: 0,
    maxGoals: 5,
    maxHabits: 5
  },
  STARTER: {
    dailyAiMessages: -1, // unlimited
    dailyPlans: -1,
    weeklyPlans: 0,
    monthlyPlans: 0,
    maxGoals: 20,
    maxHabits: 20
  },
  PRO: {
    dailyAiMessages: -1,
    dailyPlans: -1,
    weeklyPlans: -1,
    monthlyPlans: -1,
    maxGoals: 50,
    maxHabits: 50
  },
  ULTIMATE: {
    dailyAiMessages: -1,
    dailyPlans: -1,
    weeklyPlans: -1,
    monthlyPlans: -1,
    maxGoals: -1, // unlimited
    maxHabits: -1
  }
};

// Subscription plan prices
exports.PLAN_PRICES = {
  FREE: 0,
  STARTER: 9,
  PRO: 19,
  ULTIMATE: 39
};

// Goal categories
exports.GOAL_CATEGORIES = [
  'HEALTH',
  'FITNESS',
  'HABITS',
  'MONEY',
  'CAREER',
  'RELATIONSHIPS',
  'PRODUCTIVITY',
  'ROUTINES',
  'PERSONAL_GROWTH',
  'LEARNING',
  'OTHER'
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
