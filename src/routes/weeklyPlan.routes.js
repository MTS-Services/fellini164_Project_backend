const express = require('express');
const router = express.Router();
const weeklyPlanController = require('../controllers/weeklyPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

/**
 * @route   POST /api/weekly-plans
 * @desc    Create a new weekly plan
 * @access  Private
 */
router.post('/', weeklyPlanController.createWeeklyPlan);

/**
 * @route   GET /api/weekly-plans
 * @desc    Get all weekly plans with optional filters
 * @query   category, priority, status, startDate, endDate
 * @access  Private
 */
router.get('/', weeklyPlanController.getAllWeeklyPlans);

/**
 * @route   GET /api/weekly-plans/:id
 * @desc    Get a single weekly plan by ID
 * @access  Private
 */
router.get('/:id', weeklyPlanController.getWeeklyPlanById);

/**
 * @route   PUT /api/weekly-plans/:id
 * @desc    Update a weekly plan
 * @access  Private
 */
router.put('/:id', weeklyPlanController.updateWeeklyPlan);

/**
 * @route   DELETE /api/weekly-plans/:id
 * @desc    Delete a weekly plan
 * @access  Private
 */
router.delete('/:id', weeklyPlanController.deleteWeeklyPlan);

module.exports = router;
