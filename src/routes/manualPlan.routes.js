const express = require('express');
const router = express.Router();
const manualPlanController = require('../controllers/manualPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

/**
 * @route   POST /api/plans
 * @desc    Create a new plan (Daily, Weekly, Monthly, or Task)
 * @access  Private
 */
router.post('/', manualPlanController.createPlan);

/**
 * @route   GET /api/plans
 * @desc    Get all plans with optional filters
 * @query   planType, category, priority, status, startDate, endDate
 * @access  Private
 */
router.get('/', manualPlanController.getAllPlans);

/**
 * @route   GET /api/plans/stats
 * @desc    Get plan statistics
 * @access  Private
 */
router.get('/stats', manualPlanController.getPlanStats);

/**
 * @route   GET /api/plans/type/:type
 * @desc    Get plans by type (daily, weekly, monthly, task)
 * @access  Private
 */
router.get('/type/:type', manualPlanController.getPlansByType);

/**
 * @route   GET /api/plans/:id
 * @desc    Get a single plan by ID
 * @access  Private
 */
router.get('/:id', manualPlanController.getPlanById);

/**
 * @route   PUT /api/plans/:id
 * @desc    Update a plan
 * @access  Private
 */
router.put('/:id', manualPlanController.updatePlan);

/**
 * @route   DELETE /api/plans/:id
 * @desc    Delete a plan
 * @access  Private
 */
router.delete('/:id', manualPlanController.deletePlan);

module.exports = router;
