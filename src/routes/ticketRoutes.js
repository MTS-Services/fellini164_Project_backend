const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');

// ==================== USER ROUTES ====================


router.post('/', protect, ticketController.createTicket);

router.get('/', protect, ticketController.getUserTickets);


router.get('/unread-count', protect, ticketController.getUnreadCount);

router.get('/:ticketId', protect, ticketController.getTicketById);

router.post('/:ticketId/reply', protect, ticketController.replyToTicket);

router.patch('/:ticketId/close', protect, ticketController.closeTicket);

router.get('/admin/stats', protect, authorize('ADMIN', 'SUPER_ADMIN'), ticketController.getTicketStats);

router.get('/admin', protect, authorize('ADMIN', 'SUPER_ADMIN'), ticketController.getAllTickets);

router.get('/admin/:ticketId', protect, authorize('ADMIN', 'SUPER_ADMIN'), ticketController.getAdminTicketById);

router.post('/admin/:ticketId/reply', protect, authorize('ADMIN', 'SUPER_ADMIN'), ticketController.adminReplyToTicket);

router.patch('/admin/:ticketId/status', protect, authorize('ADMIN', 'SUPER_ADMIN'), ticketController.updateTicketStatus);

router.patch('/admin/:ticketId/priority', protect, authorize('ADMIN', 'SUPER_ADMIN'), ticketController.updateTicketPriority);

router.patch('/admin/:ticketId/assign', protect, authorize('ADMIN', 'SUPER_ADMIN'), ticketController.assignTicket);

router.delete('/admin/:ticketId', protect, authorize('ADMIN', 'SUPER_ADMIN'), ticketController.deleteTicket);

module.exports = router;
