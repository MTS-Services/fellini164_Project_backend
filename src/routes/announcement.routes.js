const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { protect } = require('../middleware/auth');

// Protect all user announcement routes
router.use(protect);

// Get user announcements
router.get('/announcements', announcementController.getUserAnnouncements);

// Get unread count
router.get('/announcements/unread/count', announcementController.getUnreadCount);

// Mark specific announcement as read
router.patch('/announcements/:id/read', announcementController.markAnnouncementAsRead);

// Mark all announcements as read
router.patch('/announcements/read-all', announcementController.markAllAnnouncementsAsRead);

module.exports = router;
