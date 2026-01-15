const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/auth');


router.post('/start', protect, chatController.startChat);


router.get('/my-rooms', protect, chatController.getUserChatRooms);


router.get('/unread-count', protect, chatController.getUnreadCount);

// ==================== SHARED ROUTES (USER & ADMIN) ====================


router.get('/:roomId/messages', protect, chatController.getChatMessages);


router.post('/:roomId/message', protect, chatController.sendMessage);


router.patch('/:roomId/close', protect, chatController.closeChat);

// ==================== ADMIN ROUTES ====================


router.get('/rooms/all', protect, authorize('ADMIN', 'SUPER_ADMIN'), chatController.getAllChatRooms);


router.patch('/:roomId/assign', protect, authorize('ADMIN', 'SUPER_ADMIN'), chatController.assignChat);

module.exports = router;
