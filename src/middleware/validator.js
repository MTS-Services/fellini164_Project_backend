const { body, param, query, validationResult } = require("express-validator");

// Validation error handler
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Auth validators
exports.registerValidator = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2 })
    .withMessage("Full name must be at least 2 characters long"),
];

exports.verifyOTPValidator = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits"),
];

exports.resendOTPValidator = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
];

exports.updateProfileValidator = [
  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Full name must be at least 2 characters long"),
  body("phone")
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
  body("address")
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage("Address must be at least 5 characters long"),
  body("avatar")
    .optional()
    .trim()
    .isURL()
    .withMessage("Avatar must be a valid URL"),
];

exports.forgotPasswordValidator = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
];

exports.verifyResetOTPValidator = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits"),
];

exports.setNewPasswordValidator = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("confirmPassword")
    .isLength({ min: 6 })
    .withMessage("Confirm password must be at least 6 characters long"),
];

exports.resetPasswordValidator = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

exports.changePasswordValidator = [
  body("currentPassword")
    .trim()
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),
  body("confirmPassword")
    .isLength({ min: 6 })
    .withMessage("Confirm password must be at least 6 characters long")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
];

exports.loginValidator = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

exports.googleLoginValidator = [
  body("idToken")
    .trim()
    .notEmpty()
    .withMessage("idToken is required")
    .isLength({ min: 20 })
    .withMessage("idToken looks invalid"),
];

// User validators
exports.updateUserValidator = [
  param("id").isUUID().withMessage("Invalid user ID"),
  body("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty"),
  body("lastName").optional().trim(),
  body("avatar").optional().isURL().withMessage("Avatar must be a valid URL"),
];

// Goal validators
const GOAL_CATEGORIES = [
  "CAREER",
  "HEALTH",
  "FINANCE",
  "PERSONAL",
  "EDUCATION",
];

exports.createGoalValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title must be less than 200 characters"),
  body("description").optional().trim(),
  body("category").isIn(GOAL_CATEGORIES).withMessage("Invalid category"),
  body("targetDate").optional().isISO8601().withMessage("Invalid date format"),
  body("priority")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Priority must be between 1 and 10"),
  body("priorityLevel")
    .optional()
    .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
    .withMessage("Invalid priority level"),
  body("source")
    .optional()
    .isIn(["AI", "MANUAL"])
    .withMessage("Invalid source"),
  body("isMainFocus")
    .optional()
    .isBoolean()
    .withMessage("isMainFocus must be boolean"),
  body("taskIds")
    .optional()
    .isArray()
    .withMessage("taskIds must be an array"),
  body("taskIds.*")
    .optional()
    .isUUID()
    .withMessage("Each task ID must be a valid UUID"),
  body("habitIds")
    .optional()
    .isArray()
    .withMessage("habitIds must be an array"),
  body("habitIds.*")
    .optional()
    .isUUID()
    .withMessage("Each habit ID must be a valid UUID"),
];

exports.updateGoalValidator = [
  param("id").isUUID().withMessage("Invalid goal ID"),
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty"),
  body("category")
    .optional()
    .isIn(GOAL_CATEGORIES)
    .withMessage("Invalid category"),
  body("status")
    .optional()
    .isIn(["ACTIVE", "COMPLETED", "PAUSED", "ARCHIVED"])
    .withMessage("Invalid status"),
  body("priorityLevel")
    .optional()
    .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
    .withMessage("Invalid priority level"),
  body("targetDate").optional().isISO8601().withMessage("Invalid date format"),
  body("source")
    .optional()
    .isIn(["AI", "MANUAL"])
    .withMessage("Invalid source"),
  body("isMainFocus")
    .optional()
    .isBoolean()
    .withMessage("isMainFocus must be boolean"),
];

exports.linkTasksValidator = [
  param("id").isUUID().withMessage("Invalid goal ID"),
  body("taskIds")
    .isArray({ min: 1 })
    .withMessage("taskIds must be a non-empty array"),
  body("taskIds.*").isUUID().withMessage("Each task ID must be a valid UUID"),
];

exports.linkHabitsValidator = [
  param("id").isUUID().withMessage("Invalid goal ID"),
  body("habitIds")
    .isArray({ min: 1 })
    .withMessage("habitIds must be a non-empty array"),
  body("habitIds.*").isUUID().withMessage("Each habit ID must be a valid UUID"),
];

exports.generateGoalValidator = [
  body("prompt")
    .trim()
    .notEmpty()
    .withMessage("prompt is required")
    .isLength({ max: 1000 })
    .withMessage("prompt must be less than 1000 characters"),
  body("category")
    .optional()
    .isIn(GOAL_CATEGORIES)
    .withMessage("Invalid category"),
];

exports.improveGoalValidator = [
  param("id").isUUID().withMessage("Invalid goal ID"),
  body("instructions")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("instructions must be less than 1000 characters"),
];

const GOAL_AI_ACTIONS = [
  "CHAT",
  "IMPROVE_DESCRIPTION",
  "ADD_TASKS",
  "ADD_HABITS",
];
const INVALID_GOAL_AI_ACTION_MSG = `Invalid action. Valid actions: ${GOAL_AI_ACTIONS.join(", ")}`;

exports.goalAiSuggestValidator = [
  param("id").isUUID().withMessage("Invalid goal ID"),
  body("action").isIn(GOAL_AI_ACTIONS).withMessage(INVALID_GOAL_AI_ACTION_MSG),
  body("message")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("message must be less than 1000 characters"),
];

exports.goalAiSuggestionIdValidator = [
  param("suggestionId").isUUID().withMessage("Invalid suggestion ID"),
];

exports.unlinkTaskValidator = [
  param("id").isUUID().withMessage("Invalid goal ID"),
  param("taskId").isUUID().withMessage("Invalid task ID"),
];

exports.unlinkHabitValidator = [
  param("id").isUUID().withMessage("Invalid goal ID"),
  param("habitId").isUUID().withMessage("Invalid habit ID"),
];

// Task validators
const TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
  "SKIPPED",
];
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TASK_SOURCES = [
  "AI_GENERATED",
  "MANUAL",
  "FROM_GOAL",
  "FROM_HABIT",
  "FROM_PLAN",
];

exports.createTaskValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title must be less than 200 characters"),
  body("description").optional().trim(),
  body("status").optional().isIn(TASK_STATUSES).withMessage("Invalid status"),
  body("priority")
    .optional()
    .isIn(TASK_PRIORITIES)
    .withMessage("Invalid priority"),
  body("category")
    .optional()
    .isIn(GOAL_CATEGORIES)
    .withMessage("Invalid category"),
  body("source").optional().isIn(TASK_SOURCES).withMessage("Invalid source"),
  body("goalId")
    .optional({ nullable: true })
    .isUUID()
    .withMessage("Invalid goal ID"),
  body("parentTaskId")
    .optional({ nullable: true })
    .isUUID()
    .withMessage("Invalid parent task ID"),
  body("dueDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Invalid due date"),
  body("scheduledDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Invalid scheduled date"),
  body("estimatedMinutes")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 1440 })
    .withMessage("estimatedMinutes must be between 1 and 1440"),
  body("tags").optional().isArray().withMessage("tags must be an array"),
];

exports.updateTaskValidator = [
  param("id").isUUID().withMessage("Invalid task ID"),
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty"),
  body("status").optional().isIn(TASK_STATUSES).withMessage("Invalid status"),
  body("priority")
    .optional()
    .isIn(TASK_PRIORITIES)
    .withMessage("Invalid priority"),
  body("category")
    .optional()
    .isIn(GOAL_CATEGORIES)
    .withMessage("Invalid category"),
  body("goalId")
    .optional({ nullable: true })
    .isUUID()
    .withMessage("Invalid goal ID"),
  body("parentTaskId")
    .optional({ nullable: true })
    .isUUID()
    .withMessage("Invalid parent task ID"),
  body("dueDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Invalid due date"),
  body("scheduledDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Invalid scheduled date"),
];

exports.updateTaskStatusValidator = [
  param("id").isUUID().withMessage("Invalid task ID"),
  body("status").isIn(TASK_STATUSES).withMessage("Invalid status"),
];

exports.generateTaskValidator = [
  body("prompt")
    .trim()
    .notEmpty()
    .withMessage("prompt is required")
    .isLength({ max: 1000 })
    .withMessage("prompt must be less than 1000 characters"),
  body("goalId").optional().isUUID().withMessage("Invalid goal ID"),
  body("category")
    .optional()
    .isIn(GOAL_CATEGORIES)
    .withMessage("Invalid category"),
];

const TASK_AI_ACTIONS = ["CHAT", "IMPROVE_DESCRIPTION", "BREAKDOWN"];
const INVALID_TASK_AI_ACTION_MSG = `Invalid action. Valid actions: ${TASK_AI_ACTIONS.join(", ")}`;

exports.taskAiSuggestValidator = [
  param("id").isUUID().withMessage("Invalid task ID"),
  body("action").isIn(TASK_AI_ACTIONS).withMessage(INVALID_TASK_AI_ACTION_MSG),
  body("message")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("message must be less than 1000 characters"),
  body("regenerate")
    .optional()
    .isBoolean()
    .withMessage("regenerate must be boolean"),
];

exports.taskAiSuggestionIdValidator = [
  param("suggestionId").isUUID().withMessage("Invalid suggestion ID"),
];

exports.bulkCreateTasksValidator = [
  body("tasks")
    .isArray({ min: 1 })
    .withMessage("tasks must be a non-empty array"),
  body("tasks.*.title")
    .trim()
    .notEmpty()
    .withMessage("Each task must have a title"),
];

exports.bulkUpdateTasksValidator = [
  body("taskIds")
    .isArray({ min: 1 })
    .withMessage("taskIds must be a non-empty array"),
  body("taskIds.*").isUUID().withMessage("Each task ID must be a valid UUID"),
];

exports.bulkDeleteTasksValidator = [
  body("taskIds")
    .isArray({ min: 1 })
    .withMessage("taskIds must be a non-empty array"),
  body("taskIds.*").isUUID().withMessage("Each task ID must be a valid UUID"),
];

// Habit validators
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
const INVALID_HABIT_CATEGORY_MSG = `Invalid category. Valid categories: ${HABIT_CATEGORIES.join(", ")}`;
const HABIT_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY"];
const HABIT_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const HABIT_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED"];
const ITEM_SOURCES = ["AI", "MANUAL"];

exports.createHabitValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 200 })
    .withMessage("Name must be less than 200 characters"),
  body("description").optional().trim(),
  body("category")
    .isIn(HABIT_CATEGORIES)
    .withMessage(INVALID_HABIT_CATEGORY_MSG),
  body("frequency")
    .optional()
    .isIn(HABIT_FREQUENCIES)
    .withMessage("Invalid frequency"),
  body("difficulty")
    .optional()
    .isIn(HABIT_DIFFICULTIES)
    .withMessage("Invalid difficulty"),
  body("targetDays")
    .optional()
    .isArray()
    .withMessage("targetDays must be an array"),
  body("targetTimesPerDay")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("targetTimesPerDay must be between 1 and 20"),
  body("reminderTime")
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage("reminderTime must be HH:mm"),
  body("status").optional().isIn(HABIT_STATUSES).withMessage("Invalid status"),
  body("source").optional().isIn(ITEM_SOURCES).withMessage("Invalid source"),
  body("goalId")
    .optional({ nullable: true })
    .isUUID()
    .withMessage("Invalid goal ID"),
  body("aiSuggested")
    .optional()
    .isBoolean()
    .withMessage("aiSuggested must be boolean"),
];

exports.updateHabitValidator = [
  param("id").isUUID().withMessage("Invalid habit ID"),
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("description").optional({ nullable: true }).trim(),
  body("category")
    .optional()
    .isIn(HABIT_CATEGORIES)
    .withMessage(INVALID_HABIT_CATEGORY_MSG),
  body("frequency")
    .optional()
    .isIn(HABIT_FREQUENCIES)
    .withMessage("Invalid frequency"),
  body("difficulty")
    .optional()
    .isIn(HABIT_DIFFICULTIES)
    .withMessage("Invalid difficulty"),
  body("targetDays")
    .optional()
    .isArray()
    .withMessage("targetDays must be an array"),
  body("targetTimesPerDay")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("targetTimesPerDay must be between 1 and 20"),
  body("reminderTime")
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage("reminderTime must be HH:mm"),
  body("status").optional().isIn(HABIT_STATUSES).withMessage("Invalid status"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean"),
  body("goalId")
    .optional({ nullable: true })
    .isUUID()
    .withMessage("Invalid goal ID"),
];

exports.completeHabitValidator = [
  param("id").isUUID().withMessage("Invalid habit ID"),
  body("date").optional().isISO8601().withMessage("Invalid date format"),
  body("notes").optional().trim(),
];

exports.generateHabitValidator = [
  body("prompt")
    .trim()
    .notEmpty()
    .withMessage("prompt is required")
    .isLength({ max: 1000 })
    .withMessage("prompt must be less than 1000 characters"),
  body("goalId").optional().isUUID().withMessage("Invalid goal ID"),
  body("category")
    .optional()
    .isIn(HABIT_CATEGORIES)
    .withMessage(INVALID_HABIT_CATEGORY_MSG),
];

exports.improveHabitValidator = [
  param("id").isUUID().withMessage("Invalid habit ID"),
  body("instructions")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("instructions must be less than 1000 characters"),
];

exports.HABIT_CATEGORIES = HABIT_CATEGORIES;

// Planner validators
const PLANNER_ITEM_TYPES = ['TASK', 'HABIT'];
const PLANNER_VIEW_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY'];
const PLANNER_AI_ACTIONS = [
  'GENERATE_PLAN',
  'RECALIBRATE_DAY',
  'REDUCE_OVERLOAD',
  'OPTIMIZE_SCHEDULE',
  'BALANCE_SCHEDULE',
  'FREE_EVENING',
  'CHAT',
];
const INVALID_PLANNER_VIEW_MSG = `Invalid viewType. Valid values: ${PLANNER_VIEW_TYPES.join(', ')}`;
const INVALID_PLANNER_ACTION_MSG = `Invalid action. Valid actions: ${PLANNER_AI_ACTIONS.join(', ')}`;

exports.createPlannerItemValidator = [
  body('itemType')
    .isIn(PLANNER_ITEM_TYPES)
    .withMessage(`Invalid itemType. Valid values: ${PLANNER_ITEM_TYPES.join(', ')}`),
  body('date').isISO8601().withMessage('Invalid date format'),
  body('taskId').optional({ nullable: true }).isUUID().withMessage('Invalid task ID'),
  body('habitId').optional({ nullable: true }).isUUID().withMessage('Invalid habit ID'),
  body('startTime')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('startTime must be HH:mm'),
  body('endTime')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('endTime must be HH:mm'),
  body('viewType')
    .optional()
    .isIn(PLANNER_VIEW_TYPES)
    .withMessage(INVALID_PLANNER_VIEW_MSG),
  body('orderIndex').optional().isInt({ min: 0 }).withMessage('orderIndex must be >= 0'),
];

exports.updatePlannerItemValidator = [
  param('id').isUUID().withMessage('Invalid planner item ID'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('startTime')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('startTime must be HH:mm'),
  body('endTime')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('endTime must be HH:mm'),
  body('orderIndex').optional().isInt({ min: 0 }).withMessage('orderIndex must be >= 0'),
  body('isCompleted').optional().isBoolean().withMessage('isCompleted must be boolean'),
];

exports.bulkScheduleValidator = [
  body('placements')
    .isArray({ min: 1 })
    .withMessage('placements must be a non-empty array'),
  body('placements.*.itemType')
    .isIn(PLANNER_ITEM_TYPES)
    .withMessage(`Each placement must have itemType: ${PLANNER_ITEM_TYPES.join(', ')}`),
  body('placements.*.date')
    .isISO8601()
    .withMessage('Each placement must have a valid date'),
  body('viewType')
    .optional()
    .isIn(PLANNER_VIEW_TYPES)
    .withMessage(INVALID_PLANNER_VIEW_MSG),
];

exports.plannerAiSuggestValidator = [
  body('action')
    .isIn(PLANNER_AI_ACTIONS)
    .withMessage(INVALID_PLANNER_ACTION_MSG),
  body('viewType')
    .optional()
    .isIn(PLANNER_VIEW_TYPES)
    .withMessage(INVALID_PLANNER_VIEW_MSG),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('message must be less than 1000 characters'),
  body('energyLevel')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH'])
    .withMessage('energyLevel must be LOW, MEDIUM, or HIGH'),
];

exports.plannerAiAdjustValidator = [
  param('id').isUUID().withMessage('Invalid suggestion ID'),
  body('placements')
    .isArray({ min: 1 })
    .withMessage('placements must be a non-empty array'),
  body('placements.*.itemType')
    .isIn(PLANNER_ITEM_TYPES)
    .withMessage(`Each placement must have itemType: ${PLANNER_ITEM_TYPES.join(', ')}`),
  body('placements.*.date')
    .isISO8601()
    .withMessage('Each placement must have a valid date'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('message must be less than 1000 characters'),
];

const PLANNER_DATE_RANGES = ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'CUSTOM'];
const INVALID_PLANNER_DATE_RANGE_MSG = `Invalid dateRange. Valid values: ${PLANNER_DATE_RANGES.join(', ')}`;

exports.createPlanValidator = [
  body('prompt')
    .trim()
    .notEmpty()
    .withMessage('prompt is required — describe what you want to plan')
    .isLength({ max: 1000 })
    .withMessage('prompt must be less than 1000 characters'),
  body('dateRange')
    .isIn(PLANNER_DATE_RANGES)
    .withMessage(INVALID_PLANNER_DATE_RANGE_MSG),
  body('startDate')
    .if(body('dateRange').equals('CUSTOM'))
    .isISO8601()
    .withMessage('startDate is required for CUSTOM date range'),
  body('endDate')
    .if(body('dateRange').equals('CUSTOM'))
    .isISO8601()
    .withMessage('endDate is required for CUSTOM date range'),
];

// ID validators
exports.idValidator = [param("id").isUUID().withMessage("Invalid ID format")];

exports.onboardingStepValidator = [
  body("step")
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage("step must be an integer between 0 and 5"),
  body("markStart")
    .optional()
    .isBoolean()
    .withMessage("markStart must be a boolean"),
  body("focusAreas")
    .optional()
    .isArray({ min: 2, max: 6 })
    .withMessage("focusAreas must be an array of 2-6 items"),
  body("primaryFocus")
    .optional({ nullable: true })
    .isString()
    .withMessage("primaryFocus must be a string"),
  body("routineType")
    .optional({ nullable: true })
    .isString()
    .withMessage("routineType must be a string"),
  body("dayStartTime")
    .optional()
    .isString()
    .withMessage("dayStartTime must be a string"),
  body("dayEndTime")
    .optional()
    .isString()
    .withMessage("dayEndTime must be a string"),
  body("aiCommunicationStyle")
    .optional({ nullable: true })
    .isString()
    .withMessage("aiCommunicationStyle must be a string"),
];

exports.onboardingSuggestionIdValidator = [
  param("suggestionId").isUUID().withMessage("Invalid suggestion ID"),
];

exports.onboardingListValidator = [
  query("status")
    .optional()
    .isIn(["pending", "applied", "dismissed", "all"])
    .withMessage("status must be pending, applied, dismissed, or all"),
  query("type")
    .optional()
    .isIn(["GOAL", "TASK", "HABIT", "PLAN_ADJUSTMENT"])
    .withMessage("type must be GOAL, TASK, HABIT, or PLAN_ADJUSTMENT"),
];

exports.submitContactValidator = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Subject must be between 1 and 200 characters"),
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 1, max: 5000 })
    .withMessage("Message must be between 1 and 5000 characters"),
];

// Query validators
exports.userIdQueryValidator = [
  query("userId").isUUID().withMessage("Invalid user ID"),
];
