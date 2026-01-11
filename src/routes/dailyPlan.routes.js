const express = require('express');
const router = express.Router();
const dailyPlanController = require('../controllers/dailyPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

/**
 * @route   POST /api/daily-plans
 * @desc    Create a new daily plan
 * @access  Private
 */
router.post('/', dailyPlanController.createDailyPlan);

/**
 * @route   GET /api/daily-plans
 * @desc    Get all daily plans with optional filters
 * @query   category, priority, status, startDate, endDate
 * @access  Private
 */
router.get('/', dailyPlanController.getAllDailyPlans);

/**
 * @route   GET /api/daily-plans/:id
 * @desc    Get a single daily plan by ID
 * @access  Private
 */
router.get('/:id', dailyPlanController.getDailyPlanById);

/**
 * @route   PUT /api/daily-plans/:id
 * @desc    Update a daily plan
 * @access  Private
 */
router.put('/:id', dailyPlanController.updateDailyPlan);

/**
 * @route   DELETE /api/daily-plans/:id
 * @desc    Delete a daily plan
 * @access  Private
 */
router.delete('/:id', dailyPlanController.deleteDailyPlan);

module.exports = router;
