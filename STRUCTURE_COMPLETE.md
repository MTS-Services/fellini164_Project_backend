# 📁 PROJECT STRUCTURE - MVC Architecture

```
fellini_backend/
│
├── prisma/
│   ├── schema.prisma           # Database schema (25+ models)
│   └── migrations/             # Database migrations
│
├── src/
│   │
│   ├── config/                 # Configuration files
│   │   └── database.js         # Prisma client setup
│   │
│   ├── controllers/            # Request handlers (Business logic)
│   │   ├── authController.js   # Auth operations (register, login)
│   │   ├── userController.js   # User CRUD operations
│   │   ├── goalController.js   # Goals management
│   │   ├── planController.js   # Plans (daily/weekly/monthly)
│   │   ├── habitController.js  # Habits tracking
│   │   ├── taskController.js   # Tasks management
│   │   ├── aiController.js     # AI features
│   │   ├── paymentController.js # Payment processing
│   │   └── adminController.js  # Admin operations
│   │
│   ├── routes/                 # Route definitions
│   │   ├── index.js           # Main routes file (NEW)
│   │   ├── auth.routes.js     # Auth endpoints
│   │   ├── user.routes.js     # User endpoints
│   │   ├── goal.routes.js     # Goal endpoints
│   │   ├── plan.routes.js     # Plan endpoints
│   │   ├── habit.routes.js    # Habit endpoints
│   │   ├── task.routes.js     # Task endpoints
│   │   ├── ai.routes.js       # AI endpoints
│   │   ├── payment.routes.js  # Payment endpoints
│   │   ├── notification.routes.js
│   │   ├── support.routes.js
│   │   ├── feedback.routes.js
│   │   └── admin.routes.js
│   │
│   ├── middleware/             # Express middleware
│   │   ├── auth.js            # JWT authentication & authorization
│   │   ├── validator.js       # Request validation rules
│   │   └── errorHandler.js    # Global error handling
│   │
│   ├── utils/                  # Helper functions
│   │   ├── jwt.js             # JWT token utilities
│   │   ├── crypto.js          # Password hashing & encryption
│   │   ├── response.js        # Response formatters
│   │   ├── logger.js          # Winston logger
│   │   ├── constants.js       # App constants
│   │   └── date.js            # Date utilities
│   │
│   └── server.js              # Main application entry
│
├── logs/                       # Application logs (auto-created)
├── .env                        # Environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## 🎯 MVC Architecture Overview

### Models (Prisma Schema)
- Database models defined in `prisma/schema.prisma`
- 25+ models including User, Goal, Plan, Habit, Task, Payment, etc.

### Views (API Responses)
- JSON responses sent from controllers
- Standardized response format using `utils/response.js`

### Controllers
- Handle business logic
- Process requests and send responses
- Located in `src/controllers/`

### Routes
- Define API endpoints
- Map URLs to controller functions
- Centralized in `src/routes/index.js`

---

## 📋 Key Changes Made

### ✅ Server Configuration
- **Port changed:** 5000 → 3000
- **Clean console output:** Removed ASCII art
- **Simple log:** "Server is running on port 3000"

### ✅ Route Structure
- **Centralized routing:** Created `src/routes/index.js`
- **All routes imported** in single index file
- **Clean server.js:** Now uses `app.use('/api/v1', require('./routes'))`

### ✅ Controllers Created
9 controller files with separated business logic:
- authController.js
- userController.js
- goalController.js
- planController.js
- habitController.js
- taskController.js
- aiController.js
- paymentController.js
- adminController.js

### ✅ Middleware Created
- **auth.js** - JWT authentication, role-based access, subscription checks
- **validator.js** - Request validation using express-validator
- **errorHandler.js** - Global error handling

### ✅ Utils Created
- **jwt.js** - Token generation and verification
- **crypto.js** - Password hashing with bcrypt
- **response.js** - Standardized API responses
- **logger.js** - Winston logger for logging
- **constants.js** - App-wide constants
- **date.js** - Date manipulation utilities

---

## 🚀 API Endpoints

### Base URL: `http://localhost:3000/api/v1`

**Authentication:**
- `POST /auth/register` - Register user
- `POST /auth/login` - Login user
- `GET /auth/verify-email/:token` - Verify email
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password/:token` - Reset password

**Users:**
- `GET /users/:id` - Get user profile
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `GET /users/:id/settings` - Get settings
- `PATCH /users/:id/settings` - Update settings

**Goals:**
- `GET /goals` - Get all goals
- `GET /goals/:id` - Get goal by ID
- `POST /goals` - Create goal
- `PATCH /goals/:id` - Update goal
- `DELETE /goals/:id` - Delete goal

**Plans:**
- `GET /plans/daily` - Get daily plans
- `POST /plans/daily` - Create daily plan
- `GET /plans/weekly` - Get weekly plans
- `POST /plans/weekly` - Create weekly plan
- `GET /plans/monthly` - Get monthly plans
- `POST /plans/monthly` - Create monthly plan

**Habits:**
- `GET /habits` - Get all habits
- `POST /habits` - Create habit
- `POST /habits/:id/complete` - Complete habit
- `PATCH /habits/:id` - Update habit
- `DELETE /habits/:id` - Delete habit

**Tasks:**
- `GET /tasks` - Get all tasks
- `GET /tasks/:id` - Get task
- `POST /tasks` - Create task
- `PATCH /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task

**AI:**
- `POST /ai/chat` - AI chatbot
- `POST /ai/generate/daily` - Generate daily plan
- `POST /ai/generate/weekly` - Generate weekly plan
- `POST /ai/generate/monthly` - Generate monthly plan
- `GET /ai/analyze/progress` - Analyze progress
- `GET /ai/recommendations` - Get recommendations

**Payments:**
- `POST /payments/stripe/create-checkout-session`
- `POST /payments/stripe/webhook`
- `GET /payments/stripe/billing-portal`
- `POST /payments/paypal/create-subscription`
- `POST /payments/paypal/webhook`
- `GET /payments/history`

**Admin:**
- `GET /admin/users` - Get all users
- `GET /admin/stats` - Dashboard stats
- `PATCH /admin/users/:id/subscription` - Update subscription
- `GET /admin/announcements` - Get announcements
- `POST /admin/announcements` - Create announcement
- `GET /admin/pricing` - Get pricing
- `PATCH /admin/pricing/:plan` - Update pricing

---

## 🔧 How to Use

### Start Server
```bash
npm run dev
```

### Test Health Endpoint
```
http://localhost:3000/health
```

### Register User
```bash
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Get Admin Stats
```bash
GET http://localhost:3000/api/v1/admin/stats
```

---

## 🔐 Using Middleware

### Example: Protected Route with Auth
```javascript
const { protect, authorize } = require('../middleware/auth');
const { validate, createGoalValidator } = require('../middleware/validator');

// Protected route - requires authentication
router.post('/', 
  protect,  // Check JWT token
  createGoalValidator,  // Validate request
  validate,  // Check validation results
  goalController.createGoal  // Controller function
);

// Admin only route
router.get('/admin/users', 
  protect, 
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getAllUsers
);
```

### Example: Subscription Check
```javascript
const { checkSubscription } = require('../middleware/auth');

// Only PRO and ULTIMATE users can access
router.post('/ai/generate/weekly',
  protect,
  checkSubscription('PRO', 'ULTIMATE'),
  aiController.generateWeeklyPlan
);
```

---

## 📝 Next Steps

1. **Implement JWT in authController**
   - Use `utils/jwt.js` to generate tokens
   - Use `utils/crypto.js` to hash passwords

2. **Add validation to routes**
   - Import validators from `middleware/validator.js`
   - Apply to routes that need validation

3. **Implement OpenAI integration**
   - Create `src/config/openai.js`
   - Update `aiController.js` with actual AI calls

4. **Add Stripe & PayPal**
   - Create payment service files
   - Implement webhook handlers

5. **Create email service**
   - Setup SendGrid
   - Create email templates

---

## ✅ Status

- ✅ MVC structure created
- ✅ Controllers separated from routes
- ✅ Middleware created (auth, validator, error handler)
- ✅ Utils created (jwt, crypto, response, logger, etc.)
- ✅ Routes centralized in index.js
- ✅ Server running on port 3000
- ✅ Clean console output

---

**Your backend is now properly structured and ready for implementation!** 🎉
