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
  "HEALTH",
  "FITNESS",
  "HABITS",
  "MONEY",
  "CAREER",
  "RELATIONSHIPS",
  "PRODUCTIVITY",
  "ROUTINES",
  "PERSONAL_GROWTH",
  "LEARNING",
  "OTHER",
];

exports.createGoalValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title must be less than 200 characters"),
  body("description").optional().trim(),
  body("category")
    .isIn(GOAL_CATEGORIES)
    .withMessage("Invalid category"),
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
  body("isMainFocus").optional().isBoolean().withMessage("isMainFocus must be boolean"),
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
  body("isMainFocus").optional().isBoolean().withMessage("isMainFocus must be boolean"),
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

exports.unlinkTaskValidator = [
  param("id").isUUID().withMessage("Invalid goal ID"),
  param("taskId").isUUID().withMessage("Invalid task ID"),
];

exports.unlinkHabitValidator = [
  param("id").isUUID().withMessage("Invalid goal ID"),
  param("habitId").isUUID().withMessage("Invalid habit ID"),
];

// ID validators
exports.idValidator = [param("id").isUUID().withMessage("Invalid ID format")];

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
