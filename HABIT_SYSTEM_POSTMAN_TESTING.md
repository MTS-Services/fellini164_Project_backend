# 🎯 HABIT SYSTEM - POSTMAN TESTING GUIDE

## 📋 Table of Contents
1. [Setup Instructions](#setup-instructions)
2. [Authentication](#authentication)
3. [Habit CRUD Operations](#habit-crud-operations)
4. [Habit Actions](#habit-actions)
5. [Habit Statistics](#habit-statistics)
6. [Testing Scenarios](#testing-scenarios)
7. [Expected Responses](#expected-responses)

---

## 🔧 Setup Instructions

### Prerequisites
1. Server must be running: `npm run dev`
2. Database must be migrated: `npx prisma migrate dev`
3. You must have a registered user account
4. Get your JWT token from login endpoint

### Base URL
```
http://localhost:3000/api/v1
```

### Headers (Required for all requests)
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

---

## 🔐 Authentication

### 1. Register User (if not already registered)
**Endpoint:** `POST /auth/register`

**Body:**
```json
{
  "email": "testuser@example.com",
  "password": "TestPassword123",
  "fullName": "Test User"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for verification.",
  "user": {
    "id": "uuid",
    "email": "testuser@example.com",
    "fullName": "Test User"
  }
}
```

---

### 2. Login
**Endpoint:** `POST /auth/login`

**Body:**
```json
{
  "email": "testuser@example.com",
  "password": "TestPassword123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "testuser@example.com",
    "fullName": "Test User",
    "role": "USER"
  }
}
```

**⚠️ IMPORTANT:** Copy the `token` value and use it in the `Authorization` header for all subsequent requests.

---

## 📝 Habit CRUD Operations

### 3. Create Habit
**Endpoint:** `POST /habits`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body Example 1: Daily Morning Exercise**
```json
{
  "name": "Morning Exercise",
  "description": "30 minutes of exercise every morning",
  "category": "FITNESS",
  "frequency": "DAILY",
  "difficulty": "MEDIUM",
  "targetTimesPerDay": 1,
  "reminderTime": "07:00"
}
```

**Body Example 2: Drink Water**
```json
{
  "name": "Drink 8 Glasses of Water",
  "description": "Stay hydrated throughout the day",
  "category": "HEALTH",
  "frequency": "DAILY",
  "difficulty": "EASY",
  "targetTimesPerDay": 8,
  "reminderTime": "08:00"
}
```

**Body Example 3: Weekly Reading**
```json
{
  "name": "Read for 1 Hour",
  "description": "Read books for personal development",
  "category": "LEARNING",
  "frequency": "WEEKLY",
  "difficulty": "MEDIUM",
  "targetDays": ["Monday", "Wednesday", "Friday"],
  "targetTimesPerDay": 1,
  "reminderTime": "20:00"
}
```

**Available Fields:**
- `name` (required, string): Habit name
- `description` (optional, string): Habit description
- `category` (required, enum): HEALTH, FITNESS, HABITS, MONEY, CAREER, RELATIONSHIPS, PRODUCTIVITY, ROUTINES, PERSONAL_GROWTH, LEARNING, OTHER
- `frequency` (optional, default: DAILY): DAILY, WEEKLY, MONTHLY
- `difficulty` (optional, default: MEDIUM): EASY, MEDIUM, HARD
- `targetDays` (optional, array): For weekly habits, e.g., ["Monday", "Wednesday", "Friday"]
- `targetTimesPerDay` (optional, default: 1): How many times per day
- `reminderTime` (optional, string): Time for reminder in HH:MM format, e.g., "07:00"
- `aiSuggested` (optional, boolean): Whether AI suggested this habit

**Expected Response:**
```json
{
  "success": true,
  "message": "Habit created successfully",
  "habit": {
    "id": "uuid",
    "userId": "uuid",
    "name": "Morning Exercise",
    "description": "30 minutes of exercise every morning",
    "category": "FITNESS",
    "frequency": "DAILY",
    "difficulty": "MEDIUM",
    "targetTimesPerDay": 1,
    "reminderTime": "07:00",
    "currentStreak": 0,
    "longestStreak": 0,
    "totalCompletions": 0,
    "isActive": true,
    "createdAt": "2026-02-02T10:00:00.000Z",
    "updatedAt": "2026-02-02T10:00:00.000Z"
  }
}
```

---

### 4. Get All Habits
**Endpoint:** `GET /habits`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters (Optional):**
- `category`: Filter by category (e.g., `HEALTH`, `FITNESS`)
- `isActive`: Filter by active status (`true` or `false`)
- `frequency`: Filter by frequency (`DAILY`, `WEEKLY`, `MONTHLY`)

**Example with Filters:**
```
GET /habits?category=FITNESS&isActive=true
```

**Expected Response:**
```json
{
  "success": true,
  "count": 3,
  "habits": [
    {
      "id": "uuid",
      "name": "Morning Exercise",
      "category": "FITNESS",
      "currentStreak": 5,
      "longestStreak": 10,
      "totalCompletions": 25,
      "isActive": true,
      "completions": [
        {
          "id": "uuid",
          "date": "2026-02-02T00:00:00.000Z",
          "notes": null
        }
      ]
    }
  ]
}
```

---

### 5. Get Habit by ID
**Endpoint:** `GET /habits/:id`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Example:**
```
GET /habits/550e8400-e29b-41d4-a716-446655440000
```

**Expected Response:**
```json
{
  "success": true,
  "habit": {
    "id": "uuid",
    "userId": "uuid",
    "name": "Morning Exercise",
    "description": "30 minutes of exercise every morning",
    "category": "FITNESS",
    "frequency": "DAILY",
    "difficulty": "MEDIUM",
    "currentStreak": 5,
    "longestStreak": 10,
    "totalCompletions": 25,
    "isActive": true,
    "completions": [
      {
        "id": "uuid",
        "habitId": "uuid",
        "date": "2026-02-02T00:00:00.000Z",
        "completedAt": "2026-02-02T07:30:00.000Z",
        "notes": "Felt great today!"
      }
    ]
  }
}
```

---

### 6. Update Habit
**Endpoint:** `PATCH /habits/:id`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body (Update any fields):**
```json
{
  "name": "Morning Exercise - Updated",
  "description": "45 minutes of intense exercise",
  "difficulty": "HARD",
  "reminderTime": "06:30"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Habit updated successfully",
  "habit": {
    "id": "uuid",
    "name": "Morning Exercise - Updated",
    "description": "45 minutes of intense exercise",
    "difficulty": "HARD",
    "reminderTime": "06:30",
    "updatedAt": "2026-02-02T10:30:00.000Z"
  }
}
```

---

### 7. Delete Habit
**Endpoint:** `DELETE /habits/:id`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Example:**
```
DELETE /habits/550e8400-e29b-41d4-a716-446655440000
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Habit deleted successfully"
}
```

---

## ✅ Habit Actions

### 8. Complete Habit
**Endpoint:** `POST /habits/:id/complete`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body (Optional):**
```json
{
  "notes": "Completed 30 minutes of cardio - felt amazing!",
  "date": "2026-02-02T00:00:00.000Z"
}
```

**Body (Minimal):**
```json
{}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Habit completed successfully",
  "completion": {
    "id": "uuid",
    "habitId": "uuid",
    "date": "2026-02-02T00:00:00.000Z",
    "completedAt": "2026-02-02T08:15:00.000Z",
    "notes": "Completed 30 minutes of cardio - felt amazing!"
  },
  "habit": {
    "id": "uuid",
    "name": "Morning Exercise",
    "currentStreak": 6,
    "longestStreak": 10,
    "totalCompletions": 26
  }
}
```

**🔥 Streak Logic:**
- First completion: `currentStreak = 1`
- Consecutive day completion: `currentStreak += 1`
- Missing a day: `currentStreak = 0` (reset)
- `longestStreak` updates automatically if `currentStreak > longestStreak`

---

### 9. Skip Habit (Breaks Streak)
**Endpoint:** `POST /habits/:id/skip`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body (Optional):**
```json
{
  "reason": "Was sick today, couldn't exercise"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Habit skipped, streak reset to 0"
}
```

**⚠️ Note:** This will reset `currentStreak` to 0.

---

## 📊 Habit Statistics

### 10. Get Habit Statistics Overview
**Endpoint:** `GET /habits/stats/overview`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "totalHabits": 5,
    "activeHabits": 4,
    "totalCompletions": 150,
    "averageStreak": 4.5,
    "longestStreak": 30,
    "habitsCompletedToday": 3
  }
}
```

---

### 11. Get Habit History
**Endpoint:** `GET /habits/:id/history`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters (Optional):**
- `days`: Number of days to retrieve (default: 30)

**Example:**
```
GET /habits/550e8400-e29b-41d4-a716-446655440000/history?days=7
```

**Expected Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": "uuid",
      "habitId": "uuid",
      "date": "2026-02-02T00:00:00.000Z",
      "completedAt": "2026-02-02T07:30:00.000Z",
      "notes": "Great workout!"
    },
    {
      "id": "uuid",
      "habitId": "uuid",
      "date": "2026-02-01T00:00:00.000Z",
      "completedAt": "2026-02-01T07:15:00.000Z",
      "notes": null
    }
  ]
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Complete Habit Tracking Flow

**Step 1:** Create a habit
```
POST /habits
{
  "name": "Meditation",
  "category": "HEALTH",
  "frequency": "DAILY",
  "difficulty": "EASY",
  "reminderTime": "06:00"
}
```

**Step 2:** Complete the habit for the first time
```
POST /habits/{habit_id}/complete
{
  "notes": "10 minutes of meditation"
}
```
✅ Expected: `currentStreak: 1`, `totalCompletions: 1`

**Step 3:** Try to complete again today (should return existing completion)
```
POST /habits/{habit_id}/complete
{}
```
✅ Expected: Returns same completion record

**Step 4:** Check habit details
```
GET /habits/{habit_id}
```
✅ Expected: Shows completion for today

**Step 5:** Get habit history
```
GET /habits/{habit_id}/history?days=7
```
✅ Expected: Shows completion records

---

### Scenario 2: Building and Maintaining Streaks

**Day 1:** Complete habit
```
POST /habits/{habit_id}/complete
```
✅ Expected: `currentStreak: 1`

**Day 2:** Complete habit again
```
POST /habits/{habit_id}/complete
```
✅ Expected: `currentStreak: 2`

**Day 3:** Complete habit again
```
POST /habits/{habit_id}/complete
```
✅ Expected: `currentStreak: 3`

**Day 7:** Complete habit (7-day milestone)
```
POST /habits/{habit_id}/complete
```
✅ Expected: `currentStreak: 7`, Notification sent (check notifications)

---

### Scenario 3: Breaking a Streak

**Step 1:** Build a 5-day streak (complete habit 5 days in a row)

**Step 2:** Skip a day (don't complete)

**Step 3:** Check habit the next day
```
GET /habits/{habit_id}
```
✅ Expected: `currentStreak: 0` (automatically reset by cron job)

---

### Scenario 4: Multiple Habits Management

**Step 1:** Create multiple habits
```
POST /habits - "Morning Exercise" (FITNESS)
POST /habits - "Drink Water" (HEALTH)
POST /habits - "Read 30 mins" (LEARNING)
```

**Step 2:** Get all habits
```
GET /habits
```
✅ Expected: Returns all 3 habits

**Step 3:** Filter by category
```
GET /habits?category=FITNESS
```
✅ Expected: Returns only "Morning Exercise"

**Step 4:** Get overall statistics
```
GET /habits/stats/overview
```
✅ Expected: Shows aggregated stats for all habits

---

### Scenario 5: Habit Reminders (Email Testing)

**Prerequisites:**
- Email service must be configured in `.env`
- User must have `enableEmailReminders: true` in settings

**Test manually trigger reminders:**

1. Ensure you have incomplete habits
2. Wait for scheduled cron jobs:
   - **8:00 AM** - Morning reminders
   - **8:00 PM** - Evening reminders
   - **10:00 PM** - Streak risk alerts

**Check your email for:**
- Daily habit reminder emails
- Streak milestone celebrations (7, 14, 30 days)
- Streak at risk warnings

---

## 📧 Email Notifications

The system sends the following email notifications automatically:

### 1. **Morning Habit Reminder** (8:00 AM)
- Sent to users with incomplete habits
- Lists all habits for the day
- Shows current streaks

### 2. **Evening Habit Reminder** (8:00 PM)
- Reminder for incomplete habits
- Last chance to complete habits

### 3. **Streak Milestone** (When completing habit)
- Celebrates 7, 14, 30, 60, 100-day streaks
- Congratulatory message

### 4. **Streak at Risk** (10:00 PM)
- Warns when streak about to break
- Sent if habit not completed today

---

## 🔍 Expected Error Responses

### Habit Not Found
```json
{
  "success": false,
  "message": "Habit not found"
}
```

### Missing Required Fields
```json
{
  "success": false,
  "message": "Name and category are required"
}
```

### Unauthorized (No Token)
```json
{
  "success": false,
  "message": "No token provided"
}
```

### Invalid Token
```json
{
  "success": false,
  "message": "Invalid token"
}
```

---

## 🎯 Postman Collection Setup

### Create New Collection: "Habit System API"

**Variables:**
- `base_url`: `http://localhost:3000/api/v1`
- `token`: (Set after login)

**Pre-request Script (Collection Level):**
```javascript
// Automatically add token to all requests
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.collectionVariables.get('token')
});
```

---

## 📝 Quick Test Checklist

- [ ] Register/Login and get token
- [ ] Create first habit
- [ ] Get all habits
- [ ] Complete habit
- [ ] Check streak increased
- [ ] Update habit details
- [ ] Get habit history
- [ ] Get habit statistics
- [ ] Create multiple habits
- [ ] Filter habits by category
- [ ] Skip a habit
- [ ] Delete a habit
- [ ] Test email notifications (if configured)

---

## 🚀 Advanced Testing

### Test Streak Calculation
1. Create a habit today
2. Complete it (should show streak: 1)
3. Manually set completion date to yesterday in database
4. Complete again today (should show streak: 2)

### Test Cron Jobs Manually
The cron jobs run automatically, but if you want to test them:
- Morning reminders run at 8:00 AM
- Evening reminders run at 8:00 PM
- Streak checks run at 10:00 PM
- Daily reset runs at 12:01 AM

---

## 💡 Pro Tips

1. **Use Environment Variables in Postman**
   - Store `base_url` and `token` as variables
   - Easier to switch between environments

2. **Organize Requests in Folders**
   - Authentication
   - Habit CRUD
   - Habit Actions
   - Statistics

3. **Use Tests Tab in Postman**
   ```javascript
   pm.test("Status code is 200", function () {
       pm.response.to.have.status(200);
   });
   
   pm.test("Response has success field", function () {
       pm.expect(pm.response.json()).to.have.property('success');
   });
   ```

4. **Save Responses**
   - Save example responses for documentation
   - Helps with frontend development

---

## 🐛 Troubleshooting

### Issue: "Habit not found"
- Check if you're using the correct habit ID
- Verify the habit belongs to your user

### Issue: "No token provided"
- Make sure Authorization header is set
- Token format: `Bearer YOUR_JWT_TOKEN`

### Issue: Email not received
- Check `.env` file for email configuration
- Verify user has `enableEmailReminders: true`
- Check spam folder

### Issue: Streak not updating
- Completions must be on consecutive days
- Check timezone settings
- Verify cron job is running

---

## 📞 Support

If you encounter issues:
1. Check server logs: `npm run dev`
2. Check database: `npx prisma studio`
3. Verify environment variables in `.env`
4. Check cron job status in server logs

---

**🎉 Happy Testing! 🎉**

Remember: Consistency is key to building great habits! 💪
