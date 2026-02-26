const express = require('express');
const router = express.Router();
const taskPlanController = require('../controllers/taskPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);


router.post('/', taskPlanController.createTask);

router.get('/', taskPlanController.getAllTasks);

router.get('/:id', taskPlanController.getTaskById);

router.put('/:id', taskPlanController.updateTask);

router.delete('/:id', taskPlanController.deleteTask);

module.exports = router;
