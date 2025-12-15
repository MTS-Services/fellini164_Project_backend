const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin routes
router.get('/users', adminController.getAllUsers);
router.get('/stats', adminController.getDashboardStats);
router.patch('/users/:id/subscription', adminController.updateUserSubscription);

// Announcements
router.get('/announcements', adminController.getAnnouncements);
router.post('/announcements', adminController.createAnnouncement);

// Pricing management
router.get('/pricing', adminController.getPricingSettings);
router.patch('/pricing/:plan', adminController.updatePricing);

module.exports = router;
