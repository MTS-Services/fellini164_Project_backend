const express = require('express');
const router = express.Router();
const dailyPlanController = require('../controllers/dailyPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

/**
 * @route   GET /api/daily-plans/today
 * @desc    Get today's plan for dashboard
 * @access  Private
 */
router.get('/today', dailyPlanController.getTodayPlan);

/**
 * @route   POST /api/daily-plans/reset
 * @desc    Reset My Day - Adapt the current day's plan when life happens
 * @access  Private
 */
router.post('/reset', dailyPlanController.resetMyDay);

/**
 * @route   GET /api/daily-plans/:planId/reset-history
 * @desc    Get reset history for a specific plan
 * @access  Private
 */
router.get('/:planId/reset-history', dailyPlanController.getResetHistory);

/**
 * @route   POST /api/daily-plans
 * @desc    Create a new daily plan
 * @access  Private
 */
router.post('/', dailyPlanController.createDailyPlan);

/**
 * @route   GET /api/daily-plans
 * @desc    Get all daily plans for the user
 * @access  Private
 */
router.get('/', dailyPlanController.getAllDailyPlans);

/**
 * @route   GET /api/daily-plans/:id
 * @desc    Get a specific daily plan
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
