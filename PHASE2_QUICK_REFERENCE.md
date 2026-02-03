# Phase 2: Task Notification System - Quick Reference

## 🚀 Quick Start

### Prerequisites
```bash
# 1. Install Redis
docker run -d -p 6379:6379 redis
# OR download: https://github.com/microsoftarchive/redis/releases

# 2. Verify Redis
redis-cli ping  # Should return: PONG

# 3. Start Server
npm run dev
```

### Expected Output
```
✅ Task Scheduler started - 5 cron jobs active
📧 Email queue ready
📱 In-app queue ready
Server running on port 3000
```

---

## 📋 5 Automated Schedulers

| Scheduler | Time | Endpoint | Description |
|-----------|------|----------|-------------|
| **Morning Summary** | 8:00 AM | `POST /tasks/scheduler/trigger/morning` | All tasks for today |
| **Evening Review** | 8:00 PM | `POST /tasks/scheduler/trigger/evening` | Completed vs pending |
| **Due Soon** | Hourly | `POST /tasks/scheduler/trigger/due-soon` | Tasks due in 1 hour |
| **Weekly Review** | Sun 6PM | `POST /tasks/scheduler/trigger/weekly` | 7-day statistics |
| **Overdue Check** | 9:00 AM | `POST /tasks/scheduler/trigger/overdue` | Overdue reminders |

---

## 🔔 Notification API Endpoints

**Base:** `http://localhost:3000/api/v1/notifications`

### Quick Commands

```bash
# Get all notifications
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/notifications

# Get unread count
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/notifications/unread/count

# Mark as read
curl -X PATCH -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/notifications/1/read

# Mark all as read
curl -X PATCH -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/notifications/read/all

# Delete notification
curl -X DELETE -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/notifications/1

# Get statistics
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/notifications/stats

# Get settings
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/notifications/settings/preferences

# Update settings
curl -X PUT -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enableEmailReminders":true,"morningReminderTime":"07:30"}' \
  http://localhost:3000/api/v1/notifications/settings/preferences
```

---

## 📧 4 New Email Templates

1. **Evening Review** - Daily completion summary with stats
2. **Due Soon** - Urgent alerts for tasks due in 1 hour
3. **Weekly Review** - 7-day stats with progress bar
4. **Overdue Tasks** - Warning email for overdue items

**Test Email Templates:**
```bash
# Create test task
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task",
    "dueDate": "2024-01-15T15:30:00Z",
    "priority": "URGENT"
  }' \
  http://localhost:3000/api/v1/tasks

# Trigger notification
curl -X POST -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/v1/tasks/scheduler/trigger/due-soon
```

---

## ⚙️ Queue System (Bull + Redis)

### Architecture
```
Task Scheduler → Task Notification Service → Queue Service → Email/In-App
                                                    ↓
                                              Redis (Jobs)
                                                    ↓
                                          3 Retry Attempts
```

### Queue Features
- ✅ **Email Queue**: SMTP delivery with 3 retries (2s backoff)
- ✅ **In-App Queue**: Database + Socket.io with 3 retries (1s backoff)
- ✅ **Auto Retry**: Exponential backoff on failure
- ✅ **Job Status**: PENDING → SENT/FAILED in database

---

## 🎯 Common Use Cases

### 1. Test Morning Summary
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/tasks/scheduler/trigger/morning
```

**Expected:**
- Email with all tasks for today
- In-app notification created
- Task count displayed

---

### 2. Test Due Soon Alert
```bash
# Step 1: Create urgent task
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Urgent meeting",
    "dueDate": "2024-01-15T15:30:00Z",
    "priority": "URGENT"
  }' \
  http://localhost:3000/api/v1/tasks

# Step 2: Trigger due soon check
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/tasks/scheduler/trigger/due-soon
```

**Expected:**
- Red-themed urgent email
- "Due in X minutes" countdown
- In-app notification with task details

---

### 3. Test Evening Review
```bash
# Step 1: Complete some tasks
curl -X PATCH -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/tasks/1/complete

# Step 2: Trigger evening review
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/tasks/scheduler/trigger/evening
```

**Expected:**
- Email showing completed vs pending
- Statistics boxes
- Motivational message

---

### 4. Check Notifications
```bash
# Get all (paginated)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/v1/notifications?limit=10&offset=0"

# Filter by status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/v1/notifications?status=SENT"

# Filter by type
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/v1/notifications?type=DAILY_REMINDER"
```

---

### 5. Update Notification Settings
```bash
curl -X PUT -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enableEmailReminders": true,
    "enablePushNotifications": false,
    "morningReminderTime": "07:30",
    "eveningReminderTime": "21:00",
    "weeklyReviewDay": "SATURDAY"
  }' \
  http://localhost:3000/api/v1/notifications/settings/preferences
```

---

## 🐛 Quick Troubleshooting

### Redis Not Running
```bash
# Check
redis-cli ping

# Start (Docker)
docker run -d -p 6379:6379 redis

# Start (Windows)
redis-server.exe

# Start (Mac)
brew services start redis
```

---

### Emails Not Sending
```bash
# Check user settings
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/notifications/settings/preferences

# Enable email reminders
curl -X PUT -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enableEmailReminders":true}' \
  http://localhost:3000/api/v1/notifications/settings/preferences
```

---

### Check Server Logs
```bash
npm run dev

# Look for:
# ✅ Task Scheduler started
# ✅ Email queue ready
# ✅ In-app queue ready
# 📧 Processing email job: ...
# ✅ Email sent successfully
```

---

## 📊 API Response Examples

### Get All Notifications
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "type": "DAILY_REMINDER",
      "title": "You have 5 tasks today",
      "message": "Ready to tackle your tasks?",
      "isRead": false,
      "sentAt": "2024-01-15T08:00:00Z"
    }
  ]
}
```

### Get Unread Count
```json
{
  "success": true,
  "unreadCount": 7
}
```

### Get Statistics
```json
{
  "success": true,
  "data": {
    "total": 45,
    "unread": 7,
    "read": 38,
    "byType": {
      "DAILY_REMINDER": 30,
      "GOAL_MILESTONE": 8
    },
    "recentActivity": {
      "last24Hours": 5,
      "last7Days": 28
    }
  }
}
```

---

## 🔧 Environment Variables

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=support@elyxaai.com
EMAIL_PASS=your-password
FROM_EMAIL=support@elyxaai.com

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 📚 Full Documentation

- **Implementation:** `PHASE2_IMPLEMENTATION_SUMMARY.md`
- **Testing Guide:** `PHASE2_TASK_NOTIFICATION_TESTING.md`
- **Phase 1:** `HABIT_SYSTEM_IMPLEMENTATION_COMPLETE.md`

---

## ✅ Phase 2 Complete!

**What's Working:**
- ✅ 5 task schedulers (auto-start)
- ✅ Queue system (Bull + Redis)
- ✅ 10 notification API endpoints
- ✅ 4 email templates
- ✅ Real-time notifications (Socket.io)
- ✅ Retry logic + error handling

**Ready for:**
- Frontend integration
- Phase 3 features (Magic Sync, Analytics)
- Production deployment

---

*Last Updated: January 2024*
