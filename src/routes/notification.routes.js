const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

// ==================== GET NOTIFICATIONS ====================
// Get all notifications
router.get('/', notificationController.getAllNotifications);

// Get unread count
router.get('/unread/count', notificationController.getUnreadCount);

// Get notification statistics
router.get('/stats', notificationController.getStats);

// ==================== MARK AS READ ====================
// Mark notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Mark all as read
router.patch('/read/all', notificationController.markAllAsRead);

// ==================== DELETE NOTIFICATIONS ====================
// Delete notification
router.delete('/:id', notificationController.deleteNotification);

// Delete all read notifications
router.delete('/read/all', notificationController.deleteAllRead);

// ==================== NOTIFICATION SETTINGS ====================
// Get notification settings
router.get('/settings/preferences', notificationController.getSettings);

// Update notification settings
router.put('/settings/preferences', notificationController.updateSettings);

module.exports = router;
