const express = require('express');
const router = express.Router();
const taskPlanController = require('../controllers/taskPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

/**
 * @route   POST /api/task-plans
 * @desc    Create a new task
 * @access  Private
 */
router.post('/', taskPlanController.createTask);

/**
 * @route   GET /api/task-plans
 * @desc    Get all tasks with optional filters
 * @query   category, priority, status, startDate, endDate
 * @access  Private
 */
router.get('/', taskPlanController.getAllTasks);

/**
 * @route   GET /api/task-plans/:id
 * @desc    Get a single task by ID
 * @access  Private
 */
router.get('/:id', taskPlanController.getTaskById);

/**
 * @route   PUT /api/task-plans/:id
 * @desc    Update a task
 * @access  Private
 */
router.put('/:id', taskPlanController.updateTask);

/**
 * @route   DELETE /api/task-plans/:id
 * @desc    Delete a task
 * @access  Private
 */
router.delete('/:id', taskPlanController.deleteTask);

module.exports = router;
