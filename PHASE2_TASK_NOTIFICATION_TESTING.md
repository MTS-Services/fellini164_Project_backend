# Phase 2: Task Reminder & Notification System - Testing Guide

## Overview
Phase 2 implements an advanced task reminder system with:
- **Automated Task Schedulers** (5 cron jobs)
- **Queue-Based Notification System** (Bull + Redis)
- **In-App Notification API** (10 endpoints)
- **Multi-Channel Notifications** (Email + In-App)
- **Enhanced Task Notification Service** (4 new email templates)

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Notification API Testing](#notification-api-testing)
3. [Task Scheduler Testing](#task-scheduler-testing)
4. [Queue System Testing](#queue-system-testing)
5. [Email Template Testing](#email-template-testing)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. Redis Setup
Task notification queue requires Redis to be running:

```bash
# Install Redis (Windows)
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use Docker:
docker run -d -p 6379:6379 redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 2. Environment Variables
Ensure `.env` has Redis configuration:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 3. Start Server
```bash
npm run dev
```

Server should output:
```
✅ Task Scheduler started - 5 cron jobs active
✅ Notification Queue Service initialized
📧 Email queue ready
📱 In-app queue ready
```

---

## Notification API Testing

### Base URL
```
http://localhost:3000/api/v1/notifications
```

### Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

### 1. Get All Notifications
**Endpoint:** `GET /api/v1/notifications`

**Query Parameters:**
- `limit` (default: 20) - Number of notifications per page
- `offset` (default: 0) - Pagination offset
- `status` - Filter by status: `PENDING`, `SENT`, `FAILED`, `READ`
- `type` - Filter by type: `DAILY_REMINDER`, `GOAL_MILESTONE`, `STREAK_NOTIFICATION`, etc.

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/notifications?limit=10&status=SENT" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "type": "DAILY_REMINDER",
      "channel": "IN_APP",
      "status": "SENT",
      "title": "You have 5 tasks today",
      "message": "Ready to tackle your tasks? Let's make today productive!",
      "data": {
        "taskCount": 5,
        "tasks": [...]
      },
      "isRead": false,
      "sentAt": "2024-01-15T08:00:00Z",
      "createdAt": "2024-01-15T07:59:55Z"
    }
  ]
}
```

---

### 2. Get Unread Count
**Endpoint:** `GET /api/v1/notifications/unread/count`

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/notifications/unread/count" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "unreadCount": 7
}
```

---

### 3. Mark Notification as Read
**Endpoint:** `PATCH /api/v1/notifications/:id/read`

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/notifications/1/read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": 1,
    "isRead": true,
    "readAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 4. Mark All as Read
**Endpoint:** `PATCH /api/v1/notifications/read/all`

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/notifications/read/all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "count": 7
}
```

---

### 5. Delete Notification
**Endpoint:** `DELETE /api/v1/notifications/:id`

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/notifications/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

### 6. Delete All Read Notifications
**Endpoint:** `DELETE /api/v1/notifications/read/all`

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/notifications/read/all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Deleted 5 read notifications",
  "count": 5
}
```

---

### 7. Get Notification Settings
**Endpoint:** `GET /api/v1/notifications/settings/preferences`

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/notifications/settings/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "enableEmailReminders": true,
    "enablePushNotifications": false,
    "morningReminderTime": "08:00",
    "eveningReminderTime": "20:00",
    "weeklyReviewDay": "SUNDAY",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 8. Update Notification Settings
**Endpoint:** `PUT /api/v1/notifications/settings/preferences`

**Request Body:**
```json
{
  "enableEmailReminders": true,
  "enablePushNotifications": false,
  "morningReminderTime": "07:30",
  "eveningReminderTime": "21:00",
  "weeklyReviewDay": "SATURDAY"
}
```

**Example Request:**
```bash
curl -X PUT "http://localhost:3000/api/v1/notifications/settings/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enableEmailReminders": true,
    "morningReminderTime": "07:30"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Notification settings updated successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "enableEmailReminders": true,
    "morningReminderTime": "07:30",
    "eveningReminderTime": "21:00"
  }
}
```

---

### 9. Get Notification Statistics
**Endpoint:** `GET /api/v1/notifications/stats`

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/notifications/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "unread": 7,
    "read": 38,
    "byType": {
      "DAILY_REMINDER": 30,
      "GOAL_MILESTONE": 8,
      "STREAK_NOTIFICATION": 5,
      "AI_SUGGESTION": 2
    },
    "recentActivity": {
      "last24Hours": 5,
      "last7Days": 28,
      "last30Days": 45
    }
  }
}
```

---

## Task Scheduler Testing

### Scheduler Overview
5 automated cron jobs run in background:

| Job | Schedule | Time | Description |
|-----|----------|------|-------------|
| **Morning Summary** | Daily | 8:00 AM | Sends all tasks for today |
| **Evening Review** | Daily | 8:00 PM | Reviews completed/pending tasks |
| **Due Soon Check** | Hourly | Every hour | Tasks due within 1 hour |
| **Weekly Review** | Weekly | Sunday 6:00 PM | Weekly task statistics |
| **Overdue Check** | Daily | 9:00 AM | Overdue task reminders |

### Manual Trigger Endpoints

For testing without waiting for cron schedule, you can manually trigger each job:

#### 1. Trigger Morning Summary
```bash
curl -X POST "http://localhost:3000/api/v1/tasks/scheduler/trigger/morning" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Morning task summary sent",
  "tasksCount": 5
}
```

#### 2. Trigger Evening Review
```bash
curl -X POST "http://localhost:3000/api/v1/tasks/scheduler/trigger/evening" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Evening review sent",
  "completedCount": 3,
  "pendingCount": 2
}
```

#### 3. Trigger Due Soon Check
```bash
curl -X POST "http://localhost:3000/api/v1/tasks/scheduler/trigger/due-soon" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Due soon alerts sent",
  "count": 2
}
```

#### 4. Trigger Weekly Review
```bash
curl -X POST "http://localhost:3000/api/v1/tasks/scheduler/trigger/weekly" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Weekly review sent",
  "completedCount": 15,
  "totalCount": 20,
  "completionRate": 75
}
```

#### 5. Trigger Overdue Check
```bash
curl -X POST "http://localhost:3000/api/v1/tasks/scheduler/trigger/overdue" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Overdue tasks reminder sent",
  "count": 3
}
```

---

## Queue System Testing

### Queue Architecture
Phase 2 uses **Bull** (backed by Redis) for reliable notification delivery:

- **Email Queue**: Handles email notifications with retry logic
- **In-App Queue**: Handles in-app notifications + Socket.io events

### Queue Features
- ✅ **Automatic Retry**: 3 attempts with exponential backoff
- ✅ **Job Prioritization**: High-priority notifications sent first
- ✅ **Failed Job Tracking**: All failed jobs logged in database
- ✅ **Queue Statistics**: Monitor queue health

### Test Queue System

#### 1. Check Queue Status
```bash
# View logs when server starts
npm run dev

# Look for these messages:
# ✅ Email queue ready - 0 waiting jobs
# ✅ In-app queue ready - 0 waiting jobs
```

#### 2. Send Test Notification (Queue-based)
Create a test task with due date within 1 hour, then trigger due soon check:

```bash
# Create task
curl -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test urgent task",
    "dueDate": "2024-01-15T15:30:00Z",
    "priority": "URGENT"
  }'

# Trigger due soon check (adds job to queue)
curl -X POST "http://localhost:3000/api/v1/tasks/scheduler/trigger/due-soon" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check server logs for queue processing:
# 📧 Processing email job: task-due-soon-1
# ✅ Email sent successfully
# 📱 Processing in-app job: task-due-soon-1
# ✅ In-app notification sent
```

#### 3. Test Retry Logic
To test automatic retry on failure:

1. Stop email service (temporarily break SMTP config)
2. Trigger notification
3. Watch queue retry 3 times
4. Check failed job status in database

---

## Email Template Testing

### 4 New Email Templates Added

#### 1. Evening Review Email
**Triggered by:** Evening scheduler (8:00 PM)

**Template includes:**
- Tasks completed today (with checkmarks)
- Tasks still pending
- Completion statistics

**Test:**
```bash
curl -X POST "http://localhost:3000/api/v1/tasks/scheduler/trigger/evening" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### 2. Task Due Soon Email
**Triggered by:** Due soon scheduler (hourly)

**Template includes:**
- List of tasks due within 1 hour
- Minutes until due
- Priority badges
- Urgent styling (red theme)

**Test:**
```bash
# Create task due in 30 minutes
curl -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Urgent meeting",
    "dueDate": "2024-01-15T15:30:00Z",
    "priority": "URGENT"
  }'

# Trigger due soon check
curl -X POST "http://localhost:3000/api/v1/tasks/scheduler/trigger/due-soon" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### 3. Weekly Review Email
**Triggered by:** Weekly scheduler (Sunday 6:00 PM)

**Template includes:**
- Tasks completed this week
- Total tasks created
- Completion rate (progress bar)
- Top 5 completed tasks
- Motivational message based on performance

**Test:**
```bash
curl -X POST "http://localhost:3000/api/v1/tasks/scheduler/trigger/weekly" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### 4. Overdue Tasks Email
**Triggered by:** Overdue scheduler (9:00 AM)

**Template includes:**
- All overdue tasks
- Days overdue for each task
- Priority levels
- Warning styling (red theme)

**Test:**
```bash
# Create overdue task
curl -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Old task",
    "dueDate": "2024-01-10T10:00:00Z",
    "status": "TODO"
  }'

# Trigger overdue check
curl -X POST "http://localhost:3000/api/v1/tasks/scheduler/trigger/overdue" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### Issue: Redis Connection Failed
**Error:** `Error: Redis connection to localhost:6379 failed`

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# If not running, start Redis:
# Windows: Run redis-server.exe
# Mac: brew services start redis
# Linux: sudo service redis-server start
# Docker: docker run -d -p 6379:6379 redis
```

---

### Issue: Notifications Not Sending
**Check:**
1. User has `enableEmailReminders: true` in UserSettings
2. User email is valid and not in unsubscribe list
3. Email service configured correctly in `.env`
4. Redis is running
5. Check server logs for errors

**Debug:**
```bash
# Check user settings
curl -X GET "http://localhost:3000/api/v1/notifications/settings/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Enable email reminders if disabled
curl -X PUT "http://localhost:3000/api/v1/notifications/settings/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enableEmailReminders": true}'
```

---

### Issue: Cron Jobs Not Running
**Error:** No scheduler messages in logs

**Solution:**
1. Check timezone configuration in scheduler files
2. Verify server is running continuously (not restarting)
3. Check server logs for scheduler start messages:
   - `✅ Task Scheduler started - 5 cron jobs active`

**Debug:**
```bash
# Check scheduler status (add this endpoint in task controller)
curl -X GET "http://localhost:3000/api/v1/tasks/scheduler/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Issue: Duplicate Notifications
**Check:**
1. Server not running multiple instances
2. Cron jobs not manually triggered while scheduler is running
3. No duplicate queue jobs

**Solution:**
Stop all node processes and restart:
```bash
# Windows
taskkill /f /im node.exe

# Mac/Linux
killall node

# Restart
npm run dev
```

---

## Testing Checklist

### ✅ Notification API
- [ ] Get all notifications with pagination
- [ ] Filter notifications by status
- [ ] Filter notifications by type
- [ ] Get unread count
- [ ] Mark single notification as read
- [ ] Mark all notifications as read
- [ ] Delete single notification
- [ ] Delete all read notifications
- [ ] Get notification settings
- [ ] Update notification settings
- [ ] Get notification statistics

### ✅ Task Schedulers
- [ ] Morning task summary (8:00 AM)
- [ ] Evening task review (8:00 PM)
- [ ] Due soon alerts (hourly)
- [ ] Weekly review (Sunday 6:00 PM)
- [ ] Overdue reminders (9:00 AM)
- [ ] Manual triggers work for all schedulers

### ✅ Queue System
- [ ] Redis connection successful
- [ ] Email queue processing jobs
- [ ] In-app queue processing jobs
- [ ] Retry logic working (3 attempts)
- [ ] Failed jobs logged in database
- [ ] Queue statistics visible in logs

### ✅ Email Templates
- [ ] Evening review email formatted correctly
- [ ] Due soon email with urgent styling
- [ ] Weekly review email with progress bar
- [ ] Overdue email with warning styling
- [ ] All emails responsive on mobile

### ✅ Integration
- [ ] Socket.io real-time notifications working
- [ ] In-app notifications appear in database
- [ ] Email notifications sent successfully
- [ ] User settings respected (enableEmailReminders)
- [ ] Timezone handling correct

---

## Next Steps: Phase 3

After Phase 2 is complete and tested, next phases include:

1. **Magic Sync Button** - Auto-regenerate daily plan
2. **Behavior Analytics** - Track productivity patterns
3. **Waitlist System** - Pre-launch user collection
4. **Email Marketing** - Automated campaigns
5. **Admin Dashboard** - User management + analytics

---

## Support

For issues or questions:
- Check server logs: `npm run dev`
- Review Prisma schema: `prisma/schema.prisma`
- Test with Postman collection: Import endpoints above

**Phase 2 Implementation Complete! 🎉**
