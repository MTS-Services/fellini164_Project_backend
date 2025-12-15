# 🚀 QUICK REFERENCE GUIDE

## Server Commands

```bash
# Start server (development with hot reload)
npm run dev

# Start server (production)
npm start

# Stop server
Ctrl + C
```

---

## Database Commands

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Create migration
npx prisma migrate dev --name your_migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Open Prisma Studio (Database GUI)
npx prisma studio
# Opens at: http://localhost:5555
```

---

## Project URLs

- **Backend API:** `http://localhost:5000`
- **Health Check:** `http://localhost:5000/health`
- **Database GUI:** `http://localhost:5555` (when running `prisma studio`)

---

## API Endpoints Quick Reference

### Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
```

### Users
```
GET    /api/v1/users/:id
```

### Goals
```
GET    /api/v1/goals?userId=xxx
POST   /api/v1/goals
```

### Admin
```
GET    /api/v1/admin/users
GET    /api/v1/admin/stats
```

---

## Environment Variables

Critical variables to set in `.env`:

```env
# Database (Already configured)
DATABASE_URL="postgresql://..."

# OpenAI (Get from: https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-...

# Stripe (Get from: https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...

# PayPal (Get from: https://developer.paypal.com/)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# SendGrid (Get from: https://app.sendgrid.com/settings/api_keys)
SENDGRID_API_KEY=SG....

# JWT (Generate random string)
JWT_SECRET=your-secret-here
```

---

## Database Models (Quick Ref)

**User System:**
- User, UserSettings

**Goals & Plans:**
- Goal, DailyPlan, WeeklyPlan, MonthlyPlan

**Productivity:**
- Habit, HabitCompletion, Task

**AI:**
- AiChatLog, AiRecommendation

**Payments:**
- Payment, PricingSettings

**Communication:**
- Notification, SupportConversation, SupportMessage

**Analytics:**
- UserAnalytics, ActivityLog, Feedback

---

## Subscription Plans

| Plan | Price | Features |
|------|-------|----------|
| FREE | $0 | Limited AI (10/day), Limited plans |
| STARTER | $9/mo | Unlimited AI chat, Unlimited daily plans |
| PRO | $19/mo | Weekly/Monthly plans, AI analysis |
| ULTIMATE | $39/mo | Full features, AI Voice Coach, Automation |

---

## Common Issues & Solutions

### Issue: Prisma Client not generated
```bash
npx prisma generate
```

### Issue: Database connection failed
- Check DATABASE_URL in `.env`
- Verify database is running
- Check firewall/network access

### Issue: Server won't start
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process if needed
taskkill /PID <process_id> /F
```

### Issue: Module not found
```bash
npm install
```

---

## Testing API (PowerShell)

### Register User
```powershell
$user = @{
    email = "test@example.com"
    password = "password123"
    firstName = "John"
    lastName = "Doe"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/register" `
    -Method Post -Body $user -ContentType "application/json"
```

### Create Goal
```powershell
$goal = @{
    userId = "user-id-here"
    title = "Get Healthy"
    description = "Exercise daily"
    category = "HEALTH"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/goals" `
    -Method Post -Body $goal -ContentType "application/json"
```

---

## File Structure Quick Nav

```
src/
├── config/          # Configurations
├── routes/          # API routes
├── controllers/     # Request handlers (TO CREATE)
├── services/        # Business logic (TO CREATE)
├── middleware/      # Express middleware (TO CREATE)
├── utils/           # Helper functions (TO CREATE)
├── jobs/            # Background jobs (TO CREATE)
└── server.js        # Main app
```

---

## Next Implementation Steps

1. **Add JWT Auth** → `src/middleware/auth.js`
2. **Hash Passwords** → `src/utils/crypto.js`
3. **OpenAI Integration** → `src/services/aiService.js`
4. **Stripe Setup** → `src/services/stripeService.js`
5. **Email Service** → `src/services/emailService.js`

---

## Documentation Files

- `README.md` - Project overview
- `PROJECT_STRUCTURE.md` - Folder organization
- `API_TESTING.md` - API examples
- `IMPLEMENTATION_CHECKLIST.md` - Development tasks
- `SETUP_COMPLETE.md` - What's done
- `QUICK_REFERENCE.md` - This file

---

## Git Commands (When Ready)

```bash
# Initialize git
git init

# Add files
git add .

# Commit
git commit -m "Initial commit: Backend structure"

# Add remote
git remote add origin <your-repo-url>

# Push
git push -u origin main
```

---

## Useful NPM Scripts

```json
{
  "start": "node src/server.js",
  "dev": "nodemon src/server.js",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:studio": "prisma studio"
}
```

---

## Contact & Support

For issues or questions:
1. Check documentation files
2. Review error logs
3. Check Prisma documentation: https://www.prisma.io/docs
4. Check Express docs: https://expressjs.com

---

**Quick Start:** `npm run dev` → Open `http://localhost:5000/health`

**Database GUI:** `npm run prisma:studio` → `http://localhost:5555`

**Ready to code!** 🎉
