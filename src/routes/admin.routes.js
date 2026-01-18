const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const announcementController = require('../controllers/announcementController');
const ticketController = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');

// Protect all admin routes and authorize only ADMIN and SUPER_ADMIN roles
router.use(protect);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

// User management routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id', adminController.updateUser);
router.patch('/users/:id/subscription', adminController.updateUserSubscription);


router.get('/payments', adminController.getAllPayments);
router.get('/users/:id/payments', adminController.getUserPayments);
router.get('/revenue', adminController.getRevenue);

router.get('/stats', adminController.getDashboardStats);
router.get('/waitlist', adminController.getWaitlistUsers);

// Announcements (New announcement system)
router.post('/announcements', announcementController.createAnnouncement);
router.get('/announcements', announcementController.getAdminAnnouncements);
router.delete('/announcements/:id', announcementController.deleteAnnouncement);

router.get('/pricing', adminController.getPricingSettings);

// Ticket management routes
router.get('/tickets/stats', ticketController.getTicketStats);
router.get('/tickets', ticketController.getAllTickets);
router.get('/tickets/:ticketId', ticketController.getAdminTicketById);
router.post('/tickets/:ticketId/reply', ticketController.adminReplyToTicket);
router.patch('/tickets/:ticketId/status', ticketController.updateTicketStatus);
router.patch('/tickets/:ticketId/priority', ticketController.updateTicketPriority);
router.patch('/tickets/:ticketId/assign', ticketController.assignTicket);
router.delete('/tickets/:ticketId', ticketController.deleteTicket);

module.exports = router;
