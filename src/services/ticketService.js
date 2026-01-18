const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TicketService {
  
  async generateTicketId() {
    const lastTicket = await prisma.ticket.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { ticketId: true }
    });

    if (!lastTicket) {
      return 'TXT-001';
    }

    const lastNumber = parseInt(lastTicket.ticketId.split('-')[1]);
    const newNumber = (lastNumber + 1).toString().padStart(3, '0');
    return `TXT-${newNumber}`;
  }

  /**
   * Create a new ticket
   */
  async createTicket(userId, data) {
    const { subject, message, priority = 'MEDIUM' } = data;

    const ticketId = await this.generateTicketId();

    return await prisma.ticket.create({
      data: {
        ticketId,
        userId,
        subject,
        priority,
        messages: {
          create: {
            senderId: userId,
            message,
            isFromAdmin: false
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

 
  async getTickets(filters = {}, pagination = {}) {
    const { page = 1, limit = 9000 } = pagination;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = this.buildWhereClause(filters);

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatar: true
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: {
            select: { messages: true }
          }
        }
      }),
      prisma.ticket.count({ where })
    ]);

    return {
      tickets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  
  async getUserTickets(userId, filters = {}, pagination = {}) {
    return this.getTickets({ ...filters, userId }, pagination);
  }

  /**
   * Get all tickets (admin)
   */
  async getAllTickets(filters = {}, pagination = {}) {
    const result = await this.getTickets(filters, pagination);

    // Get statistics
    const stats = await prisma.ticket.groupBy({
      by: ['status'],
      _count: true
    });

    return {
      ...result,
      statistics: stats.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = stat._count;
        return acc;
      }, {})
    };
  }

 
  buildWhereClause(filters) {
    const where = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    
    if (filters.search) {
      where.OR = [
        { ticketId: { contains: filters.search, mode: 'insensitive' } },
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { user: { fullName: { contains: filters.search, mode: 'insensitive' } } }
      ];
    }

    return where;
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(ticketId, userId = null) {
    const where = { ticketId: ticketId };
    if (userId) where.userId = userId;

    return await prisma.ticket.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatar: true,
            phone: true,
            subscriptionPlan: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }


  async addMessage(ticketId, senderId, message, isFromAdmin = false) {
    const ticket = await prisma.ticket.findUnique({
      where: { ticketId: ticketId }
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.status === 'CLOSED' && !isFromAdmin) {
      throw new Error('Cannot reply to a closed ticket');
    }

    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId,
        message,
        isFromAdmin
      }
    });

   
    const updateData = {
      updatedAt: new Date()
    };

    // If admin replies and ticket not assigned, assign it
    if (isFromAdmin) {
      if (!ticket.assignedTo) {
        updateData.assignedTo = senderId;
      }
      if (ticket.status === 'OPEN') {
        updateData.status = 'IN_PROGRESS';
      }
    } else {
      // If user replies to resolved ticket, reopen it
      if (ticket.status === 'RESOLVED') {
        updateData.status = 'OPEN';
      }
    }

    const updatedTicket = await prisma.ticket.update({
      where: { ticketId: ticketId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    return { ticketMessage, ticket: updatedTicket };
  }

  
  async updateStatus(ticketId, status) {
    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (status === 'CLOSED') {
      updateData.closedAt = new Date();
    }

    return await prisma.ticket.update({
      where: { ticketId: ticketId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
  }


  async updatePriority(ticketId, priority) {
    return await prisma.ticket.update({
      where: { ticketId: ticketId },
      data: {
        priority,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
  }

 
  async assignTicket(ticketId, adminId) {
    return await prisma.ticket.update({
      where: { ticketId: ticketId },
      data: {
        assignedTo: adminId,
        status: 'IN_PROGRESS',
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
  }

 
  async closeTicket(ticketId) {
    return await this.updateStatus(ticketId, 'CLOSED');
  }

  
  async markMessagesAsRead(ticketId, isFromAdmin) {
    // Get the ticket to find its internal id
    const ticket = await prisma.ticket.findUnique({
      where: { ticketId: ticketId },
      select: { id: true }
    });
    
    if (!ticket) return;
    
    await prisma.ticketMessage.updateMany({
      where: {
        ticketId: ticket.id,
        isFromAdmin,
        isRead: false
      },
      data: { isRead: true }
    });
  }


  async getUnreadCount(userId) {
    return await prisma.ticketMessage.count({
      where: {
        ticket: { userId },
        isFromAdmin: true,
        isRead: false
      }
    });
  }

  
  async getStatistics() {
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      highPriorityTickets
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
      prisma.ticket.count({ where: { priority: 'HIGH' } })
    ]);

    return {
      total: totalTickets,
      open: openTickets,
      inProgress: inProgressTickets,
      resolved: resolvedTickets,
      closed: closedTickets,
      highPriority: highPriorityTickets,
      avgResponseTimeMinutes: 0
    };
  }

  
  async deleteTicket(ticketId) {
    await prisma.ticket.delete({
      where: { ticketId: ticketId }
    });
  }

 
  async verifyAdmin(adminId) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    });

    return admin && (admin.role === 'ADMIN' || admin.role === 'SUPER_ADMIN');
  }
}

module.exports = new TicketService();
