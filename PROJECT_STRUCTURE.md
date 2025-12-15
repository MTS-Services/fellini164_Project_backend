# Fellini AI Backend - Project Structure

## 📁 Folder Organization

```
fellini_backend/
│
├── prisma/
│   ├── schema.prisma          # Complete database schema
│   ├── migrations/            # Database migrations (auto-generated)
│   └── seed.js               # Database seeding script (to create)
│
├── src/
│   │
│   ├── config/               # Configuration files
│   │   ├── database.js       # Prisma client setup ✅
│   │   ├── openai.js        # OpenAI configuration (to create)
│   │   ├── stripe.js        # Stripe configuration (to create)
│   │   ├── paypal.js        # PayPal configuration (to create)
│   │   └── email.js         # Email service config (to create)
│   │
│   ├── middleware/           # Express middleware
│   │   ├── auth.js          # JWT authentication (to create)
│   │   ├── authorize.js     # Role-based access (to create)
│   │   ├── validation.js    # Request validation (to create)
│   │   └── errorHandler.js  # Error handling (to create)
│   │
│   ├── routes/              # API routes
│   │   ├── auth.routes.js   # Authentication ✅
│   │   ├── user.routes.js   # User management ✅
│   │   ├── goal.routes.js   # Goals CRUD ✅
│   │   ├── plan.routes.js   # Plans management ✅
│   │   ├── habit.routes.js  # Habits tracking ✅
│   │   ├── task.routes.js   # Tasks management ✅
│   │   ├── ai.routes.js     # AI features ✅
│   │   ├── payment.routes.js # Payments ✅
│   │   ├── notification.routes.js ✅
│   │   ├── support.routes.js ✅
│   │   ├── feedback.routes.js ✅
│   │   └── admin.routes.js  # Admin panel ✅
│   │
│   ├── controllers/         # Business logic
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── goalController.js
│   │   ├── planController.js
│   │   ├── habitController.js
│   │   ├── taskController.js
│   │   ├── aiController.js
│   │   ├── paymentController.js
│   │   ├── notificationController.js
│   │   ├── supportController.js
│   │   └── adminController.js
│   │
│   ├── services/            # Reusable services
│   │   ├── authService.js   # Authentication logic
│   │   ├── aiService.js     # OpenAI integration
│   │   ├── stripeService.js # Stripe integration
│   │   ├── paypalService.js # PayPal integration
│   │   ├── emailService.js  # Email sending
│   │   ├── planGeneratorService.js # AI plan generation
│   │   ├── analyticsService.js # Usage analytics
│   │   └── notificationService.js # Notification system
│   │
│   ├── utils/               # Helper functions
│   │   ├── logger.js        # Winston logger
│   │   ├── validators.js    # Input validators
│   │   ├── helpers.js       # General helpers
│   │   ├── constants.js     # App constants
│   │   └── crypto.js        # Encryption utilities
│   │
│   ├── jobs/                # Background jobs
│   │   ├── emailQueue.js    # Email queue
│   │   ├── reminderQueue.js # Reminder queue
│   │   ├── analyticsQueue.js # Analytics processing
│   │   └── planGenerationQueue.js # AI plan queue
│   │
│   ├── cron/                # Scheduled tasks
│   │   ├── dailyReminders.js
│   │   ├── weeklyReports.js
│   │   ├── usageReset.js
│   │   └── subscriptionCheck.js
│   │
│   └── server.js            # Main application ✅
│
├── uploads/                 # File uploads (avatars, etc.)
├── logs/                    # Application logs
├── tests/                   # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env                     # Environment variables ✅
├── .env.example            # Example env file ✅
├── .gitignore              # Git ignore rules ✅
├── package.json            # Dependencies ✅
├── README.md               # Documentation ✅
└── PROJECT_STRUCTURE.md    # This file ✅
```

## 🎯 Module Responsibilities

### Config
- Database connections
- External API configurations
- Environment variable management

### Middleware
- Authentication & Authorization
- Request validation
- Error handling
- Rate limiting

### Routes
- API endpoint definitions
- Request routing
- Parameter validation

### Controllers
- Request/Response handling
- Business logic orchestration
- Data transformation

### Services
- Core business logic
- External API integration
- Reusable operations
- Database operations

### Utils
- Helper functions
- Constants
- Validators
- Logging

### Jobs
- Background task processing
- Queue management
- Async operations

### Cron
- Scheduled tasks
- Periodic operations
- Maintenance jobs

## 🔄 Request Flow

```
Client Request
    ↓
Express Server (server.js)
    ↓
Middleware (auth, validation, etc.)
    ↓
Routes (*.routes.js)
    ↓
Controllers (*Controller.js)
    ↓
Services (*Service.js)
    ↓
Database (Prisma)
    ↓
Response to Client
```

## ✅ Current Status

- ✅ Project structure created
- ✅ Prisma schema defined (18+ models)
- ✅ Package.json with all dependencies
- ✅ Environment configuration
- ✅ Basic route structure
- ✅ Sample API endpoints
- ✅ Database connection setup

## 🚧 To Be Implemented

- Controllers for business logic
- Services for AI, payments, emails
- Middleware for auth & validation
- Background job queues
- Cron jobs for automation
- Email templates
- Testing suite
- Documentation
