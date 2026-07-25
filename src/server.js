require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const path = require("path");
require("express-async-errors");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false,
  },
});

const SocketService = require("./services/socketService");
const socketService = new SocketService(io);
socketService.initialize();

// Firebase Admin (Google login) — lazy-safe init
try {
  require("./config/firebase").initializeFirebase();
} catch (e) {
  console.warn("Firebase Admin init skipped:", e.message);
}

const announcementScheduler = require("./services/announcementScheduler");
announcementScheduler.start();

const habitScheduler = require("./services/habitScheduler");
habitScheduler.start();

const taskScheduler = require("./services/taskScheduler");
taskScheduler.start();

const trialScheduler = require("./services/trialScheduler");
trialScheduler.start();

// Make io and socketService available to routes
app.set("io", io);
app.set("socketService", socketService);

app.use(
  cors({
    origin: "*",
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  require("./controllers/paymentController").stripeWebhook,
);

// Body Parser — allow empty JSON body (e.g. POST /tasks/:id/complete with no body)
app.use((req, res, next) => {
  express.json({ limit: "10mb" })(req, res, (err) => {
    if (
      err instanceof SyntaxError &&
      err.status === 400 &&
      err.type === "entity.parse.failed"
    ) {
      const raw = typeof err.body === "string" ? err.body.trim() : "";
      if (!raw || err.message?.includes("Unexpected end of JSON input")) {
        req.body = {};
        return next();
      }
    }
    return next(err);
  });
});
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use(compression());

// Static test pages (e.g. Google login test)
app.use(express.static(path.join(__dirname, "../public")));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.json({ message: "Felling test development API is running.." });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.use("/api/v1", require("./routes"));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error("Error:", err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Socket.io initialized and ready for connections`);
});

module.exports = app;
