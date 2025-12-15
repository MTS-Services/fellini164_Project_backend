const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// AI routes
router.post('/chat', aiController.chat);
router.post('/generate/daily', aiController.generateDailyPlan);
router.post('/generate/weekly', aiController.generateWeeklyPlan);
router.post('/generate/monthly', aiController.generateMonthlyPlan);
router.get('/analyze/progress', aiController.analyzeProgress);
router.get('/recommendations', aiController.getRecommendations);

module.exports = router;
