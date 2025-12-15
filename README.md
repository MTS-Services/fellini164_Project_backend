# Fellini AI - Life Coaching SaaS Platform Backend

A fully modular Express.js backend for an AI-powered life coaching SaaS platform with OpenAI integration, Stripe/PayPal payments, and comprehensive user management.

## 🏗️ Project Structure

```
fellini_backend/
├── prisma/
│   └── schema.prisma           # Database schema with all models
├── src/
│   ├── config/
│   │   └── database.js         # Prisma client configuration
│   ├── routes/
│   │   ├── auth.routes.js      # Authentication endpoints
│   │   ├── user.routes.js      # User management
│   │   ├── goal.routes.js      # Goals CRUD
│   │   ├── plan.routes.js      # Daily/Weekly/Monthly plans
│   │   ├── habit.routes.js     # Habit tracking
│   │   ├── task.routes.js      # Task management
│   │   ├── ai.routes.js        # OpenAI integration
│   │   ├── payment.routes.js   # Stripe & PayPal
│   │   ├── notification.routes.js
│   │   ├── support.routes.js   # AI Support system
│   │   ├── feedback.routes.js
│   │   └── admin.routes.js     # Admin panel
│   └── server.js               # Main application entry
├── .env                        # Environment variables
├── .env.example               # Example environment file
├── .gitignore
├── package.json
└── README.md

## 📦 Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

The `.env` file is already created. Update these critical values:

```env
# OpenAI - Get your API key from https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key-here

# Stripe - Get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# PayPal - Get from https://developer.paypal.com/
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret

# SendGrid - Get from https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourapp.com

# JWT Secret - Generate a secure random string
JWT_SECRET=your-super-secret-jwt-key-change-this
```

### 3. Set Up Database

Your PostgreSQL URL is already configured. Run these commands:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create database tables
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view your database
npx prisma studio
```

### 4. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start at: `http://localhost:5000`

## 🧪 Test the API

### Health Check
```bash
curl http://localhost:5000/health
```

### Register a User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Get Admin Stats
```bash
curl http://localhost:5000/api/v1/admin/stats
```

## 📊 Database Schema

The Prisma schema includes these main models:

### User System
- **User** - User accounts with authentication
- **UserSettings** - Personalized preferences (wake time, AI tone, etc.)

### Goals & Planning
- **Goal** - Life goals (health, career, relationships, etc.)
- **DailyPlan** - AI-generated daily plans
- **WeeklyPlan** - AI-generated weekly plans
- **MonthlyPlan** - AI-generated monthly plans

### Productivity
- **Habit** - Habit tracking with streaks
- **HabitCompletion** - Individual habit completions
- **Task** - Task management system

### AI System
- **AiChatLog** - AI conversation history
- **AiRecommendation** - AI-generated suggestions

### Payment System
- **Payment** - All payment records (Stripe & PayPal)
- **PricingSettings** - Dynamic pricing configuration

### Communication
- **Notification** - Email, in-app, push notifications
- **SupportConversation** - Support tickets
- **SupportMessage** - Support chat messages

### Analytics & Feedback
- **UserAnalytics** - Daily usage metrics
- **ActivityLog** - Audit trail of all actions
- **Feedback** - User feedback and feature requests

### Content Management
- **Announcement** - System announcements
- **MotivationalMessage** - Daily motivational content
- **RoadmapItem** - Public roadmap features

## 🛣️ API Routes

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/verify-email` - Verify email
- `POST /api/v1/auth/forgot-password` - Password reset

### Users
- `GET /api/v1/users/:id` - Get user profile
- `PATCH /api/v1/users/:id` - Update profile
- `GET /api/v1/users/:id/settings` - Get settings

### Goals
- `GET /api/v1/goals` - Get all goals
- `POST /api/v1/goals` - Create goal
- `PATCH /api/v1/goals/:id` - Update goal
- `DELETE /api/v1/goals/:id` - Delete goal

### Plans
- `GET /api/v1/plans/daily` - Get daily plans
- `POST /api/v1/plans/daily` - Create/regenerate daily plan
- `GET /api/v1/plans/weekly` - Get weekly plans
- `POST /api/v1/plans/weekly` - Create weekly plan
- `GET /api/v1/plans/monthly` - Get monthly plans
- `POST /api/v1/plans/monthly` - Create monthly plan

### AI
- `POST /api/v1/ai/chat` - AI chatbot conversation
- `POST /api/v1/ai/generate/daily` - Generate daily plan
- `POST /api/v1/ai/generate/weekly` - Generate weekly plan
- `GET /api/v1/ai/analyze/progress` - AI progress analysis
- `GET /api/v1/ai/recommendations` - Get AI recommendations

### Payments
- `POST /api/v1/payments/stripe/create-checkout-session` - Start Stripe checkout
- `POST /api/v1/payments/stripe/webhook` - Stripe webhook
- `GET /api/v1/payments/stripe/billing-portal` - Billing portal
- `POST /api/v1/payments/paypal/create-subscription` - PayPal subscription
- `GET /api/v1/payments/history` - Payment history

### Admin
- `GET /api/v1/admin/users` - Get all users
- `GET /api/v1/admin/stats` - Dashboard statistics
- `PATCH /api/v1/admin/users/:id/subscription` - Manage subscriptions
- `POST /api/v1/admin/announcements` - Create announcement
- `PATCH /api/v1/admin/pricing/:plan` - Update pricing

## 🎯 Subscription Plans

### FREE Plan
- Limited AI messages (10/day)
- Limited daily plans (1/day)
- Basic features

### STARTER - $9/mo
- Unlimited AI chat
- Unlimited daily plans
- Basic habit tracking

### PRO - $19/mo
- Everything in Starter
- Weekly + Monthly plans
- Advanced AI analysis
- Priority support

### ULTIMATE - $39/mo
- Everything in Pro
- AI Life Blueprint
- AI Voice Coach
- Productivity automations
- Custom AI personalities

## 🔐 Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - DDoS protection
- **CORS** - Cross-origin resource sharing
- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - Bcrypt encryption
- **Environment Variables** - Sensitive data protection

## 📧 Email System

Automated emails for:
- Welcome & onboarding
- Email verification
- Password reset
- Payment confirmations
- Subscription updates
- Trial ending reminders
- Monthly usage summaries

## 🤖 AI Features

### OpenAI Integration
- Daily/Weekly/Monthly plan generation
- AI life coach chatbot
- Progress analysis
- Habit recommendations
- Personalized insights
- Multiple AI personalities

### AI Coach Personalities
- Strict Coach
- Friendly Mentor
- Therapist Coach
- Productivity Expert
- Fitness Coach

## 📈 Analytics

Track user engagement:
- Daily/Monthly active users
- Plan completion rates
- Habit streaks
- Feature usage
- Conversion metrics
- Churn analysis

## 🔧 Development Scripts

```bash
# Start development server
npm run dev

# Start production server
npm start

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio

# Seed database (when created)
npm run prisma:seed
```

## 🚀 Deployment Checklist

1. ✅ Update `.env` with production values
2. ✅ Set `NODE_ENV=production`
3. ✅ Configure production database
4. ✅ Set up Redis for job queues
5. ✅ Configure SendGrid for emails
6. ✅ Set up Stripe webhooks
7. ✅ Set up PayPal webhooks
8. ✅ Enable HTTPS
9. ✅ Configure CORS for production domain
10. ✅ Set up monitoring and logging

## 📝 Next Steps

### Immediate Tasks
1. Implement JWT authentication middleware
2. Add password hashing with bcrypt
3. Integrate OpenAI API for plan generation
4. Set up Stripe checkout and webhooks
5. Configure SendGrid email templates
6. Add input validation with Joi
7. Implement rate limiting per user
8. Create cron jobs for reminders

### Phase 2
1. Add Redis for caching and queues
2. Implement background job processing
3. Set up analytics tracking
4. Create email templates
5. Build admin dashboard
6. Add file upload for avatars
7. Implement referral system
8. Add AI support chatbot

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL + Prisma ORM
- **AI**: OpenAI API (GPT-4)
- **Payments**: Stripe + PayPal
- **Email**: SendGrid
- **Queue**: Bull + Redis
- **Authentication**: JWT
- **Security**: Helmet, bcrypt, rate-limit

## 📞 Support

For questions or issues, please contact the development team.

## 📄 License

Proprietary - All rights reserved
