const express = require('express');
const router = express.Router();
const monthlyPlanController = require('../controllers/monthlyPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

/**
 * @route   POST /api/monthly-plans
 * @desc    Create a new monthly plan
 * @access  Private
 */
router.post('/', monthlyPlanController.createMonthlyPlan);

/**
 * @route   GET /api/monthly-plans
 * @desc    Get all monthly plans with optional filters
 * @query   category, priority, status, startDate, endDate
 * @access  Private
 */
router.get('/', monthlyPlanController.getAllMonthlyPlans);

/**
 * @route   GET /api/monthly-plans/:id
 * @desc    Get a single monthly plan by ID
 * @access  Private
 */
router.get('/:id', monthlyPlanController.getMonthlyPlanById);

/**
 * @route   PUT /api/monthly-plans/:id
 * @desc    Update a monthly plan
 * @access  Private
 */
router.put('/:id', monthlyPlanController.updateMonthlyPlan);

/**
 * @route   DELETE /api/monthly-plans/:id
 * @desc    Delete a monthly plan
 * @access  Private
 */
router.delete('/:id', monthlyPlanController.deleteMonthlyPlan);

module.exports = router;
