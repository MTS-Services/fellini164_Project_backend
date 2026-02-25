const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', notificationController.getAllNotifications);

// Get unread count
router.get('/unread/count', notificationController.getUnreadCount);


router.get('/stats', notificationController.getStats);


router.patch('/:id/read', notificationController.markAsRead);


router.patch('/read/all', notificationController.markAllAsRead);


router.delete('/:id', notificationController.deleteNotification);

router.delete('/read/all', notificationController.deleteAllRead);


router.get('/settings/preferences', notificationController.getSettings);

// Update notification settings
router.put('/settings/preferences', notificationController.updateSettings);

module.exports = router;
