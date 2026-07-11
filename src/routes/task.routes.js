const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const {
  createTaskValidator,
  updateTaskValidator,
  updateTaskStatusValidator,
  generateTaskValidator,
  improveTaskValidator,
  breakdownTaskValidator,
  bulkCreateTasksValidator,
  bulkUpdateTasksValidator,
  bulkDeleteTasksValidator,
  idValidator,
  validate,
} = require('../middleware/validator');

router.use(protect);

// Board summary (before /:id)
router.get('/summary', taskController.getBoardSummary);

router.get('/analytics/stats', taskController.getTaskStats);
router.get('/analytics/productivity', taskController.getProductivityAnalytics);
router.get('/analytics/patterns', taskController.detectPatterns);
router.get('/special/overdue', taskController.getOverdueTasks);
router.get('/special/today', taskController.getTodaysTasks);

router.post('/bulk/create', bulkCreateTasksValidator, validate, taskController.bulkCreateTasks);
router.patch('/bulk/update', bulkUpdateTasksValidator, validate, taskController.bulkUpdateTasks);
router.delete('/bulk/delete', bulkDeleteTasksValidator, validate, taskController.bulkDeleteTasks);

router.post('/ai/generate', generateTaskValidator, validate, taskController.generateTaskWithAI);
router.post('/ai/generate-from-goals', taskController.generateTasksFromGoals);
router.post('/ai/generate-daily', taskController.generateDailyTasks);
router.post('/ai/magic-sync', taskController.magicSync);

router.get('/', taskController.getAllTasks);
router.post('/', createTaskValidator, validate, taskController.createTask);

router.get('/:id/subtasks', idValidator, validate, taskController.getSubtasks);
router.patch('/:id/status', updateTaskStatusValidator, validate, taskController.updateTaskStatus);
router.post('/:id/complete', idValidator, validate, taskController.completeTask);
router.post('/:id/skip', idValidator, validate, taskController.skipTask);
router.post('/:id/breakdown', breakdownTaskValidator, validate, taskController.breakdownTask);
router.post('/:id/ai/improve', improveTaskValidator, validate, taskController.improveTaskWithAI);

router.get('/:id', idValidator, validate, taskController.getTaskById);
router.patch('/:id', updateTaskValidator, validate, taskController.updateTask);
router.delete('/:id', idValidator, validate, taskController.deleteTask);

module.exports = router;
