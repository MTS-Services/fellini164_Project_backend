# 🚀 QUICK START - Habit System Testing

## ⚡ 3-Minute Setup

### 1. Start Server
```bash
npm run dev
```

### 2. Get Your Token
**Login:**
```
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Copy the token from response.**

---

## 📝 Quick Test Sequence (Copy & Paste)

### Test 1: Create Your First Habit
```
POST http://localhost:3000/api/v1/habits
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Morning Exercise",
  "description": "30 minutes of cardio",
  "category": "FITNESS",
  "frequency": "DAILY",
  "difficulty": "MEDIUM",
  "reminderTime": "07:00"
}
```

✅ **Expected:** Habit created with streak = 0

---

### Test 2: Complete the Habit
```
POST http://localhost:3000/api/v1/habits/{HABIT_ID}/complete
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "notes": "Felt great today!"
}
```

✅ **Expected:** currentStreak = 1, totalCompletions = 1

---

### Test 3: Get All Your Habits
```
GET http://localhost:3000/api/v1/habits
Authorization: Bearer YOUR_TOKEN_HERE
```

✅ **Expected:** List of all your habits

---

### Test 4: Get Habit Statistics
```
GET http://localhost:3000/api/v1/habits/stats/overview
Authorization: Bearer YOUR_TOKEN_HERE
```

✅ **Expected:** 
```json
{
  "totalHabits": 1,
  "totalCompletions": 1,
  "averageStreak": 1,
  "habitsCompletedToday": 1
}
```

---

## 🎯 All Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/habits` | Get all habits |
| `GET` | `/habits/:id` | Get specific habit |
| `POST` | `/habits` | Create new habit |
| `PATCH` | `/habits/:id` | Update habit |
| `DELETE` | `/habits/:id` | Delete habit |
| `POST` | `/habits/:id/complete` | Complete habit ✨ |
| `POST` | `/habits/:id/skip` | Skip habit (breaks streak) |
| `GET` | `/habits/stats/overview` | Get statistics |
| `GET` | `/habits/:id/history` | Get completion history |

---

## 📧 Email Notifications

**Cron Schedule:**
- **8:00 AM** → Morning reminders
- **8:00 PM** → Evening reminders
- **10:00 PM** → Streak risk alerts
- **12:01 AM** → Daily reset

**Required Settings:**
1. Email must be configured in `.env`
2. User must have `enableEmailReminders: true`

---

## 🔥 Streak Logic

- **Day 1:** Complete → Streak = 1
- **Day 2:** Complete → Streak = 2
- **Day 3:** Complete → Streak = 3
- **Day 4:** Skip → Streak = 0 (reset)

**Milestone Notifications:**
- 7 days 🎉
- 14 days 🎉
- 30 days 🎉
- 60 days 🎉
- 100 days 🎉

---

## 📚 Full Documentation

👉 **[HABIT_SYSTEM_POSTMAN_TESTING.md](HABIT_SYSTEM_POSTMAN_TESTING.md)** - Complete testing guide

👉 **[HABIT_SYSTEM_IMPLEMENTATION_COMPLETE.md](HABIT_SYSTEM_IMPLEMENTATION_COMPLETE.md)** - Implementation details

---

## 🐛 Quick Troubleshooting

**Problem:** "No token provided"  
**Solution:** Add `Authorization: Bearer YOUR_TOKEN` header

**Problem:** "Habit not found"  
**Solution:** Check if habit ID is correct and belongs to your user

**Problem:** Email not received  
**Solution:** Check `.env` email settings and spam folder

**Problem:** Streak not updating  
**Solution:** Completions must be on consecutive days

---

## ✅ Success Indicators

When everything works:
- ✅ Server logs show: `[HabitScheduler] All habit cron jobs started successfully`
- ✅ Creating habit returns `"success": true`
- ✅ Completing habit increases `currentStreak`
- ✅ Statistics endpoint returns data
- ✅ Emails arrive (if configured)

---

**Happy Testing! 🎉**

Base URL: `http://localhost:3000/api/v1`
