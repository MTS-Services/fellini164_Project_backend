const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const {
  createTaskValidator,
  updateTaskValidator,
  updateTaskStatusValidator,
  generateTaskValidator,
  taskAiSuggestValidator,
  taskAiSuggestionIdValidator,
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

// Task AI Assistant — accept / dismiss / get by id (before /:id)
router.post(
  '/ai/suggestions/:suggestionId/accept',
  taskAiSuggestionIdValidator,
  validate,
  taskController.acceptSuggestion,
);
router.post(
  '/ai/suggestions/:suggestionId/dismiss',
  taskAiSuggestionIdValidator,
  validate,
  taskController.dismissSuggestion,
);
router.get(
  '/ai/suggestions/:suggestionId',
  taskAiSuggestionIdValidator,
  validate,
  taskController.getSuggestion,
);

router.get('/', taskController.getAllTasks);
router.post('/', createTaskValidator, validate, taskController.createTask);

router.get('/:id/subtasks', idValidator, validate, taskController.getSubtasks);
router.patch('/:id/status', updateTaskStatusValidator, validate, taskController.updateTaskStatus);
router.post('/:id/complete', idValidator, validate, taskController.completeTask);
router.post('/:id/skip', idValidator, validate, taskController.skipTask);

// Task AI Assistant — suggest / list / undo
router.post(
  '/:id/ai/suggest',
  taskAiSuggestValidator,
  validate,
  taskController.suggestWithAI,
);
router.get(
  '/:id/ai/suggestions',
  idValidator,
  validate,
  taskController.getSuggestions,
);
router.post(
  '/:id/ai/undo',
  idValidator,
  validate,
  taskController.undoAiChange,
);

router.get('/:id', idValidator, validate, taskController.getTaskById);
router.patch('/:id', updateTaskValidator, validate, taskController.updateTask);
router.delete('/:id', idValidator, validate, taskController.deleteTask);

module.exports = router;
