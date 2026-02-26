const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

router.get('/', taskController.getAllTasks);

router.get('/:id', taskController.getTaskById);

router.post('/', taskController.createTask);

router.patch('/:id', taskController.updateTask);

router.delete('/:id', taskController.deleteTask);


router.post('/bulk/create', taskController.bulkCreateTasks);

router.patch('/bulk/update', taskController.bulkUpdateTasks);

router.delete('/bulk/delete', taskController.bulkDeleteTasks);


router.post('/:id/complete', taskController.completeTask);

router.post('/:id/skip', taskController.skipTask);



router.post('/ai/generate-from-goals', taskController.generateTasksFromGoals);

router.post('/ai/generate-daily', taskController.generateDailyTasks);

router.post('/:id/breakdown', taskController.breakdownTask);

router.post('/ai/magic-sync', taskController.magicSync);



router.get('/analytics/stats', taskController.getTaskStats);

router.get('/analytics/productivity', taskController.getProductivityAnalytics);

router.get('/analytics/patterns', taskController.detectPatterns);

router.get('/special/overdue', taskController.getOverdueTasks);

router.get('/special/today', taskController.getTodaysTasks);


module.exports = router;
