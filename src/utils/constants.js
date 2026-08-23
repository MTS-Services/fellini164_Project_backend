exports.PLAN_HIERARCHY = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
  ULTIMATE: 3,
};

exports.PLAN_FEATURES = {
  FREE: [
    "Basic daily planning",
    "AI assistance (limited)",
    "Single active routine",
    "Basic task breakdown",
    "7-day history",
  ],
  STARTER: [
    "Everything in Free",
    "Plan your tasks (daily & weekly)",
    "AI assistance for daily tasks",
    "Smart reminders",
    "Unlimited routines",
    "Goal tracking & progress insights",
    "1 AI assistant",
    "Monthly summary",
  ],
  PRO: [
    "Everything in Starter",
    "Unlimited AI assistance",
    "Advanced automations",
    "Productivity insights",
    "Faster response speed",
    "3 AI assistants (different roles)",
  ],
  ULTIMATE: [
    "Everything in Pro",
    "Full life planning",
    "Voice coaching sessions",
    "Adaptive routine optimization",
    "Energy-based planning",
    "Monthly AI coaching session",
    "Early access to new features",
    "Unlimited AI assistants",
  ],
};

// Subscription plan limits (enforced by planFeatureService)
exports.PLAN_LIMITS = {
  FREE: {
    dailyAiMessages: 20,
    dailyPlans: 1,
    weeklyPlanning: false,
    monthlyPlanning: false,
    maxGoals: 1,
    maxHabits: 1,
    maxRoutines: 1,
    maxAiPersonas: 1,
    historyDays: 7,
    productivityInsights: false,
    advancedAutomations: false,
    energyPlanning: false,
    fullLifePlanning: false,
    voiceCoach: false,
    monthlyCoaching: false,
    earlyFeatureAccess: false,
    responseSpeed: "standard",
  },
  STARTER: {
    dailyAiMessages: 150,
    dailyPlans: -1,
    weeklyPlanning: true,
    monthlyPlanning: false,
    maxGoals: -1,
    maxHabits: -1,
    maxRoutines: -1,
    maxAiPersonas: 1,
    historyDays: 30,
    productivityInsights: false,
    advancedAutomations: false,
    energyPlanning: false,
    fullLifePlanning: false,
    voiceCoach: false,
    monthlyCoaching: false,
    earlyFeatureAccess: false,
    responseSpeed: "standard",
    hasMonthlySummary: true,
  },
  PRO: {
    dailyAiMessages: -1,
    dailyPlans: -1,
    weeklyPlanning: true,
    monthlyPlanning: true,
    maxGoals: -1,
    maxHabits: -1,
    maxRoutines: -1,
    maxAiPersonas: 3,
    historyDays: -1,
    productivityInsights: true,
    advancedAutomations: true,
    energyPlanning: false,
    fullLifePlanning: false,
    voiceCoach: false,
    monthlyCoaching: false,
    earlyFeatureAccess: false,
    responseSpeed: "priority",
  },
  ULTIMATE: {
    dailyAiMessages: -1,
    dailyPlans: -1,
    weeklyPlanning: true,
    monthlyPlanning: true,
    maxGoals: -1,
    maxHabits: -1,
    maxRoutines: -1,
    maxAiPersonas: -1,
    historyDays: -1,
    productivityInsights: true,
    advancedAutomations: true,
    energyPlanning: true,
    fullLifePlanning: true,
    voiceCoach: true,
    monthlyCoaching: true,
    earlyFeatureAccess: true,
    responseSpeed: "fastest",
  },
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
      amount: 7668, // $76.68/year
      currency: 'usd',
      display: '$76.68/year',
      savings: '$19.20'
    }
  },
  PRO: {
    monthly: {
      amount: 1799, // $17.99
      currency: 'usd',
      display: '$17.99/month'
    },
    yearly: {
      amount: 17268, // $172.68/year
      currency: 'usd',
      display: '$172.68/year',
      savings: '$43.20'
    }
  },
  ULTIMATE: {
    monthly: {
      amount: 3999, // $39.99
      currency: 'usd',
      display: '$39.99/month'
    },
    yearly: {
      amount: 38388, // $383.88/year
      currency: 'usd',
      display: '$383.88/year',
      savings: '$96.00'
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
