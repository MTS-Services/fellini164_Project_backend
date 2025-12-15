const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Auth validators
exports.registerValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2 })
    .withMessage('Full name must be at least 2 characters long')
];

exports.verifyOTPValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
];

exports.resendOTPValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
];

exports.updateProfileValidator = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Full name must be at least 2 characters long'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('address')
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage('Address must be at least 5 characters long'),
  body('avatar')
    .optional()
    .trim()
    .isURL()
    .withMessage('Avatar must be a valid URL')
];

exports.loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// User validators
exports.updateUserValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid user ID'),
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty'),
  body('lastName')
    .optional()
    .trim(),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL')
];

// Goal validators
exports.createGoalValidator = [
  body('userId')
    .isUUID()
    .withMessage('Invalid user ID'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('description')
    .optional()
    .trim(),
  body('category')
    .isIn(['HEALTH', 'FITNESS', 'HABITS', 'MONEY', 'CAREER', 'RELATIONSHIPS', 'PRODUCTIVITY', 'ROUTINES', 'PERSONAL_GROWTH', 'LEARNING', 'OTHER'])
    .withMessage('Invalid category'),
  body('targetDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10')
];

exports.updateGoalValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid goal ID'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty'),
  body('category')
    .optional()
    .isIn(['HEALTH', 'FITNESS', 'HABITS', 'MONEY', 'CAREER', 'RELATIONSHIPS', 'PRODUCTIVITY', 'ROUTINES', 'PERSONAL_GROWTH', 'LEARNING', 'OTHER'])
    .withMessage('Invalid category'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED'])
    .withMessage('Invalid status')
];

// ID validators
exports.idValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format')
];

// Query validators
exports.userIdQueryValidator = [
  query('userId')
    .isUUID()
    .withMessage('Invalid user ID')
];
