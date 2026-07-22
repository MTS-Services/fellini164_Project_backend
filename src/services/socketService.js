const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Lightweight socket layer for authenticated realtime events
 * (e.g. planner:updated). Live chat room messaging has been removed.
 */
class SocketService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map();
    this.adminSockets = new Map();
  }

  initialize() {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on("connection", (socket) => {
      console.log(`Socket connected: ${socket.id} - User: ${socket.userId}`);

      if (socket.isAdmin) {
        this.adminSockets.set(socket.userId, socket.id);
      } else {
        this.userSockets.set(socket.userId, socket.id);
      }

      this.emitUserStatus(socket.userId, true, socket.isAdmin);
      this.handleDisconnect(socket);
    });
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, fullName: true, role: true },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = user.id;
      socket.userEmail = user.email;
      socket.userName = user.fullName;
      socket.isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  }

  handleDisconnect(socket) {
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id} - User: ${socket.userId}`);

      if (socket.isAdmin) {
        this.adminSockets.delete(socket.userId);
      } else {
        this.userSockets.delete(socket.userId);
      }

      this.emitUserStatus(socket.userId, false, socket.isAdmin);
    });
  }

  emitUserStatus(userId, isOnline, isAdmin) {
    this.io.emit("userStatus", {
      userId,
      isOnline,
      isAdmin,
      timestamp: new Date(),
    });
  }

  notifyAllAdmins(event, data) {
    this.adminSockets.forEach((socketId) => {
      this.io.to(socketId).emit(event, data);
    });
  }

  notifyUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  notifyAdmin(adminId, event, data) {
    const socketId = this.adminSockets.get(adminId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }
}

module.exports = SocketService;
