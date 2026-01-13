const express = require('express');
const router = express.Router();
const monthlyPlanController = require('../controllers/monthlyPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);


router.post('/', monthlyPlanController.createMonthlyPlan);


router.get('/', monthlyPlanController.getAllMonthlyPlans);


router.get('/:id', monthlyPlanController.getMonthlyPlanById);


router.put('/:id', monthlyPlanController.updateMonthlyPlan);


router.delete('/:id', monthlyPlanController.deleteMonthlyPlan);

/**
 * @route   GET /api/monthly-plans/:id/hierarchy
 * @desc    Get monthly plan with all child plans (weeks and days)
 * @access  Private
 */
router.get('/:id/hierarchy', monthlyPlanController.getMonthlyPlanHierarchy);

/**
 * @route   POST /api/monthly-plans/:id/weeks
 * @desc    Add a weekly plan to a monthly plan
 * @access  Private
 */
router.post('/:id/weeks', monthlyPlanController.addWeeklyPlan);

/**
 * @route   POST /api/monthly-plans/:id/days
 * @desc    Add a daily plan to a monthly plan
 * @access  Private
 */
router.post('/:id/days', monthlyPlanController.addDailyPlan);

module.exports = router;
