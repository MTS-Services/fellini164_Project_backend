const express = require('express');
const router = express.Router();
const planningController = require('../controllers/planningController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All planning routes require authentication
router.use(authenticateToken);


router.post('/daily', planningController.generateDailyPlan);


router.post('/weekly', planningController.generateWeeklyPlan);


router.post('/monthly', planningController.generateMonthlyPlan);


router.post('/suggest-tasks', planningController.suggestTasks);


router.post('/morning-routine', planningController.suggestMorningRoutine);


router.get('/plans', planningController.getAllPlans);

router.get('/plans/:planType/:planId', planningController.getPlanById);


router.put('/plans/:planType/:planId', planningController.updatePlan);


router.delete('/plans/:planType/:planId', planningController.deletePlan);

module.exports = router;
