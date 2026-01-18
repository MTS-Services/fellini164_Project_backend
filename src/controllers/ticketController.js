const ticketService = require('../services/ticketService');

// ==================== USER ENDPOINTS ====================


exports.createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, message, priority } = req.body;

    // Validate input
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    const ticket = await ticketService.createTicket(userId, { subject, message, priority });

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket',
      error: error.message
    });
  }
};


exports.getUserTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority, page, limit } = req.query;

    const result = await ticketService.getUserTickets(
      userId,
      { status, priority },
      { page, limit }
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
};


exports.getTicketById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;

    const ticket = await ticketService.getTicketById(ticketId, userId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Mark unread admin messages as read
    await ticketService.markMessagesAsRead(ticketId, true);

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket',
      error: error.message
    });
  }
};

exports.replyToTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const ticket = await ticketService.getTicketById(ticketId, userId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const result = await ticketService.addMessage(ticketId, userId, message, false);

    res.json({
      success: true,
      message: 'Reply sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Error replying to ticket:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send reply',
      error: error.message
    });
  }
};


exports.closeTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;

    // Verify ticket belongs to user
    const ticket = await ticketService.getTicketById(ticketId, userId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.status === 'CLOSED') {
      return res.status(400).json({
        success: false,
        message: 'Ticket is already closed'
      });
    }

    const updatedTicket = await ticketService.closeTicket(ticketId);

    res.json({
      success: true,
      message: 'Ticket closed successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close ticket',
      error: error.message
    });
  }
};


exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await ticketService.getUnreadCount(userId);

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
};

// ==================== ADMIN ENDPOINTS ====================


exports.getAllTickets = async (req, res) => {
  try {
    const { status, priority, search, page, limit, sortBy, order } = req.query;

    const result = await ticketService.getAllTickets(
      { status, priority, search },
      { page, limit, sortBy, order }
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
};

exports.getAdminTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await ticketService.getTicketById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await ticketService.markMessagesAsRead(ticketId, false);

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket',
      error: error.message
    });
  }
};

exports.adminReplyToTicket = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Verify ticket exists
    const ticket = await ticketService.getTicketById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const result = await ticketService.addMessage(ticketId, adminId, message, true);

    res.json({
      success: true,
      message: 'Reply sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Error replying to ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: error.message
    });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!status || !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (OPEN, IN_PROGRESS, RESOLVED, CLOSED)'
      });
    }

    const ticket = await ticketService.updateStatus(ticketId, status);

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      ticket
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket status',
      error: error.message
    });
  }
};

exports.updateTicketPriority = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { priority } = req.body;

    if (!priority || !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Valid priority is required (LOW, MEDIUM, HIGH, URGENT)'
      });
    }

    const ticket = await ticketService.updatePriority(ticketId, priority);

    res.json({
      success: true,
      message: 'Ticket priority updated successfully',
      ticket
    });
  } catch (error) {
    console.error('Error updating ticket priority:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket priority',
      error: error.message
    });
  }
};

exports.assignTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { adminId } = req.body;
    const assignToId = adminId || req.user.id;

    // Verify admin user
    const isAdmin = await ticketService.verifyAdmin(assignToId);
    if (!isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin user'
      });
    }

    const ticket = await ticketService.assignTicket(ticketId, assignToId);

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      ticket
    });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign ticket',
      error: error.message
    });
  }
};

exports.getTicketStats = async (req, res) => {
  try {
    const statistics = await ticketService.getStatistics();

    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    await ticketService.deleteTicket(ticketId);

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete ticket',
      error: error.message
    });
  }
};
