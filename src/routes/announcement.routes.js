const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { protect } = require('../middleware/auth');

// Protect all user announcement routes
router.use(protect);

router.get('/announcements', announcementController.getUserAnnouncements);

router.get('/announcements/unread/count', announcementController.getUnreadCount);

router.patch('/announcements/:id/read', announcementController.markAnnouncementAsRead);

router.patch('/announcements/read-all', announcementController.markAllAnnouncementsAsRead);

module.exports = router;
