const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All AI chat routes require authentication
router.use(authenticateToken);


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

module.exports = router;
