const express = require('express');
const router = express.Router();
const taskPlanController = require('../controllers/taskPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);


router.post('/', taskPlanController.createTask);


router.get('/', taskPlanController.getAllTasks);

/**
 * @route   GET /api/task-plans/:id
 * @desc    Get a single task by ID
 * @access  Private
 */
router.get('/:id', taskPlanController.getTaskById);

router.put('/:id', taskPlanController.updateTask);


router.delete('/:id', taskPlanController.deleteTask);

module.exports = router;
