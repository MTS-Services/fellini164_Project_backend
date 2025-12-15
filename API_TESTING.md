# API Testing Guide

## Quick Start - Test Your API

Your server is running at: `http://localhost:5000`

### 1. Health Check
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get

# Or in browser, just visit:
http://localhost:5000/health
```

Expected Response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-12-15T...",
  "environment": "development"
}
```

---

### 2. Register a New User
```bash
# PowerShell
$body = @{
    email = "test@example.com"
    password = "password123"
    firstName = "John"
    lastName = "Doe"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/register" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

Expected Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "uuid-here",
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "subscriptionPlan": "FREE",
    "createdAt": "2025-12-15T..."
  }
}
```

---

### 3. Get User Profile
```bash
# Replace {userId} with actual user ID from registration
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/users/{userId}" -Method Get
```

---

### 4. Create a Goal
```bash
$goalData = @{
    userId = "your-user-id-here"
    title = "Get Fit"
    description = "Exercise 3 times per week"
    category = "HEALTH"
    targetDate = "2025-12-31"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/goals" `
    -Method Post `
    -Body $goalData `
    -ContentType "application/json"
```

---

### 5. Get Admin Statistics
```bash
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/admin/stats" -Method Get
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "totalUsers": 1,
    "activeSubscribers": 0,
    "totalRevenue": 0,
    "newUsersToday": 1
  }
}
```

---

### 6. Get All Users (Admin)
```bash
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/admin/users" -Method Get
```

---

## Using Postman or Thunder Client

### Import this as a collection:

1. **Health Check**
   - Method: GET
   - URL: `http://localhost:5000/health`

2. **Register User**
   - Method: POST
   - URL: `http://localhost:5000/api/v1/auth/register`
   - Body (JSON):
     ```json
     {
       "email": "user@example.com",
       "password": "password123",
       "firstName": "John",
       "lastName": "Doe"
     }
     ```

3. **Login User**
   - Method: POST
   - URL: `http://localhost:5000/api/v1/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "user@example.com",
       "password": "password123"
     }
     ```

4. **Create Goal**
   - Method: POST
   - URL: `http://localhost:5000/api/v1/goals`
   - Body (JSON):
     ```json
     {
       "userId": "user-id-from-registration",
       "title": "Learn Programming",
       "description": "Complete 30 day coding challenge",
       "category": "LEARNING",
       "targetDate": "2025-12-31"
     }
     ```

5. **Get Goals**
   - Method: GET
   - URL: `http://localhost:5000/api/v1/goals?userId=your-user-id`

---

## Database Access

### View Database with Prisma Studio
```bash
npm run prisma:studio
```

This opens a visual database editor at: `http://localhost:5555`

---

## All Available Endpoints

✅ **Authentication**
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`

✅ **Users**
- GET `/api/v1/users/:id`

✅ **Goals**
- GET `/api/v1/goals`
- POST `/api/v1/goals`

🚧 **Plans** (TODO)
- GET `/api/v1/plans/daily`
- POST `/api/v1/plans/daily`
- GET `/api/v1/plans/weekly`
- POST `/api/v1/plans/weekly`
- GET `/api/v1/plans/monthly`
- POST `/api/v1/plans/monthly`

🚧 **Habits** (TODO)
- GET `/api/v1/habits`
- POST `/api/v1/habits`
- POST `/api/v1/habits/:id/complete`

🚧 **Tasks** (TODO)
- GET `/api/v1/tasks`
- POST `/api/v1/tasks`
- PATCH `/api/v1/tasks/:id`
- DELETE `/api/v1/tasks/:id`

🚧 **AI** (TODO - Requires OpenAI API Key)
- POST `/api/v1/ai/chat`
- POST `/api/v1/ai/generate/daily`
- POST `/api/v1/ai/generate/weekly`
- GET `/api/v1/ai/analyze/progress`
- GET `/api/v1/ai/recommendations`

🚧 **Payments** (TODO - Requires Stripe/PayPal)
- POST `/api/v1/payments/stripe/create-checkout-session`
- POST `/api/v1/payments/stripe/webhook`
- POST `/api/v1/payments/paypal/create-subscription`

✅ **Admin**
- GET `/api/v1/admin/users`
- GET `/api/v1/admin/stats`
- PATCH `/api/v1/admin/users/:id/subscription`

---

## Notes

⚠️ **Important**: Currently, authentication is NOT enforced. You'll need to implement JWT middleware for production.

⚠️ **Password Security**: Passwords are stored in plain text. Implement bcrypt hashing before production.

⚠️ **API Keys**: Add your OpenAI, Stripe, PayPal, and SendGrid API keys to `.env` file for full functionality.

---

## Stop the Server

Press `Ctrl + C` in the terminal where the server is running.
