const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');
const planningController = require('../controllers/planningController');
const { protect } = require('../middleware/auth');

// All AI routes require authentication
router.use(protect);


router.post('/chat', aiChatController.chat);


router.post('/quick-chat', aiChatController.quickChat);


router.get('/conversations', aiChatController.getAllConversations);


router.get('/conversations/:conversationId', aiChatController.getConversation);


router.put('/conversations/:conversationId', aiChatController.updateConversationTitle);

// Pin/Unpin conversation routes
router.post('/conversations/:conversationId/pin', aiChatController.pinConversation);
router.delete('/conversations/:conversationId/pin', aiChatController.unpinConversation);
router.patch('/conversations/:conversationId/toggle-pin', aiChatController.togglePinConversation);


router.delete('/conversations/:conversationId', aiChatController.deleteConversation);


router.post('/generate/daily', planningController.generateDailyPlan);


router.post('/generate/weekly', planningController.generateWeeklyPlan);

// Get all weekly plans for user
router.get('/weekly', planningController.getAllWeeklyPlans);

// Get specific weekly plan by ID
router.get('/weekly/:id', planningController.getWeeklyPlanById);

// Delete weekly plan by ID
router.delete('/weekly/:id', planningController.deleteWeeklyPlan);


router.post('/generate/monthly', planningController.generateMonthlyPlan);

// Get all monthly plans for user
router.get('/monthly', planningController.getAllMonthlyPlans);

// Get specific monthly plan by ID
router.get('/monthly/:id', planningController.getMonthlyPlanById);

// Delete monthly plan by ID
router.delete('/monthly/:id', planningController.deleteMonthlyPlan);


router.post('/suggest-tasks', planningController.suggestTasks);


router.post('/morning-routine', planningController.suggestMorningRoutine);

/**
 * @route   GET /api/v1/ai/plans
 * @desc    Get all plans (daily, weekly, monthly)
 * @access  Private
 * @query   { type?: 'daily'|'weekly'|'monthly', status?: string, limit?: number }
 */
router.get('/plans', planningController.getAllPlans);


router.get('/plans/:planType/:planId', planningController.getPlanById);

/**
 * @route   PUT /api/v1/ai/plans/:planType/:planId
 * @desc    Update plan (status, completion rate, etc.)
 * @access  Private
 * @params  planType: 'daily'|'weekly'|'monthly', planId: string
 * @body    { status?: string, completionRate?: number, tasksCompleted?: number, tasksTotal?: number }
 */
router.put('/plans/:planType/:planId', planningController.updatePlan);


router.delete('/plans/:planType/:planId', planningController.deletePlan);



router.get('/analyze/progress', (req, res) => {
  res.json({ 
    success: false,
    message: 'AI progress analysis - Coming soon' 
  });
});

/**
 * @route   GET /api/v1/ai/recommendations
 * @desc    Get AI recommendations - TODO: Implement
 * @access  Private
 */
router.get('/recommendations', (req, res) => {
  res.json({ 
    success: false,
    message: 'Get AI recommendations - Coming soon' 
  });
});

module.exports = router;
