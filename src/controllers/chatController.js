const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


exports.startChat = async (req, res) => {
  try {
    const { subject } = req.body;
    const userId = req.user.id;

    // Check if user already has an active chat room
    const existingRoom = await prisma.chatRoom.findFirst({
      where: {
        userId,
        status: 'ACTIVE'
      }
    });

    if (existingRoom) {
      return res.status(200).json({
        success: true,
        message: 'Active chat room already exists',
        data: existingRoom
      });
    }

    // Create new chat room
    const chatRoom = await prisma.chatRoom.create({
      data: {
        userId,
        subject: subject || 'Support Request',
        status: 'ACTIVE'
      }
    });

    // Create initial system message
    await prisma.chatMessage.create({
      data: {
        chatRoomId: chatRoom.id,
        senderId: 'system',
        message: 'Chat session started. An admin will respond to you shortly.',
        isFromAdmin: true,
        isRead: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Chat session started successfully',
      data: chatRoom
    });
  } catch (error) {
    console.error('Start chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start chat session',
      error: error.message
    });
  }
};


exports.getUserChatRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const chatRooms = await prisma.chatRoom.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Calculate unread count for each room
    const roomsWithUnread = await Promise.all(
      chatRooms.map(async (room) => {
        const unreadCount = await prisma.chatMessage.count({
          where: {
            chatRoomId: room.id,
            isFromAdmin: true,
            isRead: false
          }
        });

        return {
          ...room,
          unreadCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: roomsWithUnread
    });
  } catch (error) {
    console.error('Get user chat rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat rooms',
      error: error.message
    });
  }
};


exports.getAllChatRooms = async (req, res) => {
  try {
    const { page = 1, limit = 2000, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) {
      where.status = status;
    }

    const [chatRooms, totalCount] = await Promise.all([
      prisma.chatRoom.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.chatRoom.count({ where })
    ]);

    // Get unread count and user info for each room
    const roomsWithDetails = await Promise.all(
      chatRooms.map(async (room) => {
        const [unreadCount, user] = await Promise.all([
          prisma.chatMessage.count({
            where: {
              chatRoomId: room.id,
              isFromAdmin: false,
              isRead: false
            }
          }),
          prisma.user.findUnique({
            where: { id: room.userId },
            select: {
              id: true,
              fullName: true,
              email: true,
              avatar: true
            }
          })
        ]);

        return {
          ...room,
          unreadCount,
          user
        };
      })
    );

    res.status(200).json({
      success: true,
      data: roomsWithDetails,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all chat rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat rooms',
      error: error.message
    });
  }
};


exports.getChatMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 5000 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

    // Verify access to chat room
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    if (!isAdmin && chatRoom.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const [messages, totalCount] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { chatRoomId: roomId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.chatMessage.count({ where: { chatRoomId: roomId } })
    ]);

    // Mark messages as read for the current user
    if (!isAdmin) {

      await prisma.chatMessage.updateMany({
        where: {
          chatRoomId: roomId,
          isFromAdmin: true,
          isRead: false
        },
        data: { isRead: true }
      });
    } else {

      await prisma.chatMessage.updateMany({
        where: {
          chatRoomId: roomId,
          isFromAdmin: false,
          isRead: false
        },
        data: { isRead: true }
      });
    }

    res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};


exports.sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    // Verify chat room exists
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }


    if (!isAdmin && chatRoom.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }


    const chatMessage = await prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId: userId,
        message: message.trim(),
        isFromAdmin: isAdmin
      }
    });


    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: chatMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};


exports.closeChat = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    if (!isAdmin && chatRoom.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }


    const updatedRoom = await prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        status: 'CLOSED',
        closedAt: new Date()
      }
    });


    await prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId: userId,
        message: `Chat session closed by ${isAdmin ? 'admin' : 'user'}.`,
        isFromAdmin: isAdmin,
        isRead: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'Chat session closed successfully',
      data: updatedRoom
    });
  } catch (error) {
    console.error('Close chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close chat session',
      error: error.message
    });
  }
};


exports.assignChat = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { adminId } = req.body;

    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin ID'
      });
    }


    const updatedRoom = await prisma.chatRoom.update({
      where: { id: roomId },
      data: { adminId }
    });

    res.status(200).json({
      success: true,
      message: 'Chat assigned successfully',
      data: updatedRoom
    });
  } catch (error) {
    console.error('Assign chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign chat',
      error: error.message
    });
  }
};


exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all user's active chat rooms
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        userId,
        status: 'ACTIVE'
      },
      select: { id: true }
    });

    const roomIds = chatRooms.map(room => room.id);


    const unreadCount = await prisma.chatMessage.count({
      where: {
        chatRoomId: { in: roomIds },
        isFromAdmin: true,
        isRead: false
      }
    });

    res.status(200).json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
};
