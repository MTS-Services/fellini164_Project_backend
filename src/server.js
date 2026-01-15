require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('express-async-errors');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  }
});

// Import Socket Service
const SocketService = require('./services/socketService');
const socketService = new SocketService(io);
socketService.initialize();

// Import and start Announcement Scheduler
const announcementScheduler = require('./services/announcementScheduler');
announcementScheduler.start();

// Make io and socketService available to routes
app.set('io', io);
app.set('socketService', socketService);



app.use(helmet());

// CORS
app.use(cors({
  origin: '*', 
  credentials: false, // Set to false when using '*'
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30000,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Stripe webhook route with raw body (MUST be before express.json())
app.post('/api/v1/payments/webhook', 
  express.raw({ type: 'application/json' }),
  require('./controllers/paymentController').stripeWebhook
);

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());


app.use(compression());


if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}


app.get('/', (req, res) => {
  res.json({ message: 'Felling API is running' });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/v1', require('./routes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});



const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Socket.io initialized and ready for connections`);
});

module.exports = app;
