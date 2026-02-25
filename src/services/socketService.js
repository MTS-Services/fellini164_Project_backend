const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

class SocketService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map();
    this.adminSockets = new Map(); // Map adminId to socket.id
  }


  initialize() {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id} - User: ${socket.userId}`);


      if (socket.isAdmin) {
        this.adminSockets.set(socket.userId, socket.id);
      } else {
        this.userSockets.set(socket.userId, socket.id);
      }

      // Emit user online status
      this.emitUserStatus(socket.userId, true, socket.isAdmin);


      this.handleJoinRoom(socket);
      this.handleLeaveRoom(socket);
      this.handleSendMessage(socket);
      this.handleTyping(socket);
      this.handleStopTyping(socket);
      this.handleMarkAsRead(socket);
      this.handleDisconnect(socket);
    });
  }


  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, fullName: true, role: true }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.userEmail = user.email;
      socket.userName = user.fullName;
      socket.isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Handle user joining a chat room
   */
  handleJoinRoom(socket) {
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        // Verify user has access to this room
        const chatRoom = await prisma.chatRoom.findUnique({
          where: { id: roomId }
        });

        if (!chatRoom) {
          return socket.emit('error', { message: 'Chat room not found' });
        }

        // Check authorization
        if (!socket.isAdmin && chatRoom.userId !== socket.userId) {
          return socket.emit('error', { message: 'Access denied' });
        }

        socket.join(roomId);
        console.log(`User ${socket.userId} joined room ${roomId}`);

        // Notify others in the room
        socket.to(roomId).emit('userJoined', {
          userId: socket.userId,
          userName: socket.userName,
          isAdmin: socket.isAdmin
        });

        socket.emit('joinedRoom', { roomId });
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });
  }

  /**
   * Handle user leaving a chat room
   */
  handleLeaveRoom(socket) {
    socket.on('leaveRoom', ({ roomId }) => {
      socket.leave(roomId);
      console.log(`User ${socket.userId} left room ${roomId}`);

      // Notify others in the room
      socket.to(roomId).emit('userLeft', {
        userId: socket.userId,
        userName: socket.userName
      });
    });
  }

  /**
   * Handle sending messages (real-time)
   */
  handleSendMessage(socket) {
    socket.on('sendMessage', async ({ roomId, message }) => {
      try {
        if (!message || !message.trim()) {
          return socket.emit('error', { message: 'Message cannot be empty' });
        }

        // Verify chat room access
        const chatRoom = await prisma.chatRoom.findUnique({
          where: { id: roomId }
        });

        if (!chatRoom) {
          return socket.emit('error', { message: 'Chat room not found' });
        }

        if (!socket.isAdmin && chatRoom.userId !== socket.userId) {
          return socket.emit('error', { message: 'Access denied' });
        }

        // Create message in database
        const chatMessage = await prisma.chatMessage.create({
          data: {
            chatRoomId: roomId,
            senderId: socket.userId,
            message: message.trim(),
            isFromAdmin: socket.isAdmin
          }
        });

        // Update chat room timestamp
        await prisma.chatRoom.update({
          where: { id: roomId },
          data: { updatedAt: new Date() }
        });

        // Emit message to all users in the room
        this.io.to(roomId).emit('newMessage', {
          ...chatMessage,
          senderName: socket.userName
        });

        // Notify the other party if they're online but not in the room
        if (socket.isAdmin) {
          // Admin sent message, notify user
          const userSocketId = this.userSockets.get(chatRoom.userId);
          if (userSocketId) {
            this.io.to(userSocketId).emit('newMessageNotification', {
              roomId,
              message: chatMessage,
              from: 'admin'
            });
          }
        } else {
          // User sent message, notify admin if assigned
          if (chatRoom.adminId) {
            const adminSocketId = this.adminSockets.get(chatRoom.adminId);
            if (adminSocketId) {
              this.io.to(adminSocketId).emit('newMessageNotification', {
                roomId,
                message: chatMessage,
                from: 'user',
                userId: socket.userId,
                userName: socket.userName
              });
            }
          } else {
            // Notify all online admins about new unassigned message
            this.notifyAllAdmins('unassignedMessage', {
              roomId,
              userId: socket.userId,
              userName: socket.userName,
              message: chatMessage
            });
          }
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
  }

  /**
   * Handle typing indicator
   */
  handleTyping(socket) {
    socket.on('typing', ({ roomId }) => {
      socket.to(roomId).emit('userTyping', {
        userId: socket.userId,
        userName: socket.userName,
        isAdmin: socket.isAdmin
      });
    });
  }

  /**
   * Handle stop typing indicator
   */
  handleStopTyping(socket) {
    socket.on('stopTyping', ({ roomId }) => {
      socket.to(roomId).emit('userStoppedTyping', {
        userId: socket.userId
      });
    });
  }

  /**
   * Handle marking messages as read
   */
  handleMarkAsRead(socket) {
    socket.on('markAsRead', async ({ roomId }) => {
      try {
        if (socket.isAdmin) {
          // Admin is reading user messages
          await prisma.chatMessage.updateMany({
            where: {
              chatRoomId: roomId,
              isFromAdmin: false,
              isRead: false
            },
            data: { isRead: true }
          });
        } else {
          // User is reading admin messages
          await prisma.chatMessage.updateMany({
            where: {
              chatRoomId: roomId,
              isFromAdmin: true,
              isRead: false
            },
            data: { isRead: true }
          });
        }

        // Notify others in the room
        socket.to(roomId).emit('messagesRead', {
          roomId,
          readBy: socket.userId
        });
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    });
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnect(socket) {
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} - User: ${socket.userId}`);

      // Remove from socket mappings
      if (socket.isAdmin) {
        this.adminSockets.delete(socket.userId);
      } else {
        this.userSockets.delete(socket.userId);
      }

      // Emit user offline status
      this.emitUserStatus(socket.userId, false, socket.isAdmin);
    });
  }

  /**
   * Emit user online/offline status
   */
  emitUserStatus(userId, isOnline, isAdmin) {
    this.io.emit('userStatus', {
      userId,
      isOnline,
      isAdmin,
      timestamp: new Date()
    });
  }

  /**
   * Notify all online admins
   */
  notifyAllAdmins(event, data) {
    this.adminSockets.forEach((socketId) => {
      this.io.to(socketId).emit(event, data);
    });
  }

  /**
   * Notify specific user
   */
  notifyUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Notify specific admin
   */
  notifyAdmin(adminId, event, data) {
    const socketId = this.adminSockets.get(adminId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Broadcast to a specific room
   */
  broadcastToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }
}

module.exports = SocketService;
