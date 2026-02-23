# Notification System - Complete Guide

## 📋 Overview

This guide explains how the **notification system** works in this project, including the architecture, notification flow, and how to test all notification APIs using Postman.

---

## 🏗️ System Architecture

### Notification Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIGGER EVENTS                            │
│  (Task created, Task due soon, Habit reminder, etc.)        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Task/Habit Scheduler  │
        │   (Cron Jobs - Auto)   │
        └────────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ Task Notification      │
        │   Service              │
        │ (Generates content)    │
        └────────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ Notification Queue     │
        │  Service (Bull)        │
        │ ┌──────────┬─────────┐ │
        │ │  Email   │ In-App  │ │
        │ │  Queue   │ Queue   │ │
        │ └──────────┴─────────┘ │
        └─────┬──────────┬───────┘
              │          │
     ┌────────┘          └────────┐
     │                            │
     ▼                            ▼
┌─────────┐              ┌───────────────┐
│  Email  │              │  PostgreSQL   │
│ Service │              │  (Database)   │
│ (SMTP)  │              │  + Socket.io  │
└────┬────┘              └───────┬───────┘
     │                           │
     ▼                           ▼
📧 User Email              📱 User Dashboard
  Inbox                      (Real-time)
```

---

## 🔧 Components Breakdown

### 1. **Notification Queue Service** (`notificationQueueService.js`)

**Purpose:** Manages background job processing using **Bull** (Redis-backed queue system)

**Key Features:**
- ✅ **Dual Queue Architecture:**
  - `emailQueue` - Processes email notifications
  - `inAppQueue` - Processes in-app notifications
- ✅ **Automatic Retry:** 3 attempts with exponential backoff
- ✅ **Job Tracking:** Success/failure monitoring
- ✅ **Real-time Integration:** Socket.io for instant notifications

**How It Works:**

```javascript
// When a notification needs to be sent:
notificationQueueService.sendMultiChannel({
  userId: 1,
  type: 'DAILY_REMINDER',
  title: 'You have 5 tasks today',
  message: 'Ready to tackle your tasks?',
  data: { taskCount: 5 },
  email: {
    to: 'user@example.com',
    subject: 'Your daily tasks',
    html: '<html>...</html>'
  }
});
```

**Queue Processing:**
1. Job added to queue → Stored in Redis
2. Worker picks up job → Starts processing
3. If success → Mark as SENT in database
4. If failure → Retry (up to 3 times)
5. After final failure → Mark as FAILED

---

### 2. **Task Notification Service** (`taskNotificationService.js`)

**Purpose:** Generates notification content and email templates

**Methods:**
- `sendEveningTaskReview(userId)` - Daily completion summary
- `sendTaskDueSoonReminder(userId)` - Urgent task alerts
- `sendWeeklyReview(userId)` - 7-day statistics
- `sendOverdueTasksReminder(userId)` - Overdue warnings
- `sendDailyTaskReminders(userId)` - Morning task list

**Email Templates:** Beautiful HTML emails with gradient headers, priority badges, and call-to-action buttons

---

### 3. **Task Scheduler** (`taskScheduler.js`)

**Purpose:** Automated cron jobs that trigger notifications

**Active Schedulers:**

| Scheduler | Time | Description |
|-----------|------|-------------|
| Morning Summary | 8:00 AM | All tasks for today |
| Evening Review | 8:00 PM | Completed vs pending |
| Due Soon Check | Every hour | Tasks due in 1 hour |
| Weekly Review | Sunday 6PM | 7-day statistics |
| Overdue Check | 9:00 AM | Overdue task alerts |

---

### 4. **Notification Controller** (`notificationController.js`)

**Purpose:** REST API endpoints for notification management

**Available Methods:**
- `getAllNotifications` - Paginated list with filters
- `getUnreadCount` - Badge count
- `markAsRead` - Mark single notification
- `markAllAsRead` - Bulk mark
- `deleteNotification` - Remove notification
- `deleteAllRead` - Cleanup
- `getSettings` - User preferences
- `updateSettings` - Update preferences
- `getStats` - Analytics

---

## 📊 Database Schema

### Notification Table

```prisma
model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  
  type      NotificationType    // DAILY_REMINDER, GOAL_MILESTONE, etc.
  channel   NotificationChannel // EMAIL, IN_APP, PUSH
  status    NotificationStatus  // PENDING, SENT, FAILED, READ
  
  title     String
  message   String
  data      Json?               // Additional metadata
  
  isRead    Boolean  @default(false)
  readAt    DateTime?
  sentAt    DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### UserSettings Table (Notification Preferences)

```prisma
model UserSettings {
  id                      Int      @id @default(autoincrement())
  userId                  Int      @unique
  
  enableEmailReminders    Boolean  @default(true)
  enablePushReminders     Boolean  @default(false)
  reminderFrequency       String   @default("DAILY")
  morningReminderTime     String   @default("08:00")
  eveningReminderTime     String   @default("20:00")
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

---

## 🔄 How Notifications Work: Complete Flow

### Example: Morning Task Summary

**Step 1: Cron Job Triggers (8:00 AM)**
```javascript
// taskScheduler.js
morningTaskSummaryJob = new cron.CronJob('0 8 * * *', async () => {
  await sendMorningTaskSummary();
});
```

**Step 2: Fetch Tasks & User Data**
```javascript
const tasks = await prisma.task.findMany({
  where: {
    userId,
    status: { in: ['TODO', 'IN_PROGRESS'] },
    scheduledDate: { gte: today, lte: endOfDay }
  }
});
```

**Step 3: Check User Settings**
```javascript
const settings = await prisma.userSettings.findUnique({
  where: { userId }
});

if (!settings?.enableEmailReminders) {
  return; // Skip email
}
```

**Step 4: Generate Email Template**
```javascript
const html = taskNotificationService.getDailyTasksEmailTemplate(tasks, user);
```

**Step 5: Queue Notification**
```javascript
await notificationQueueService.sendMultiChannel({
  userId,
  type: 'DAILY_REMINDER',
  title: `You have ${tasks.length} tasks today`,
  message: 'Ready to tackle your tasks?',
  data: { taskCount: tasks.length },
  email: {
    to: user.email,
    subject: `Your ${tasks.length} tasks for today`,
    html: html
  }
});
```

**Step 6: Queue Processes Jobs**

**Email Queue:**
```javascript
// Bull worker picks up job
emailQueue.process(async (job) => {
  // Send email via SMTP
  await emailService.sendEmail(to, subject, html);
  
  // Update status
  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: 'SENT', sentAt: new Date() }
  });
});
```

**In-App Queue:**
```javascript
inAppQueue.process(async (job) => {
  // Create database record
  const notification = await prisma.notification.create({
    data: {
      userId, type, channel: 'IN_APP', status: 'SENT',
      title, message, data, sentAt: new Date()
    }
  });
  
  // Emit real-time event
  io.to(`user:${userId}`).emit('notification:new', notification);
});
```

**Step 7: User Receives Notification**
- 📧 **Email:** Arrives in inbox
- 📱 **In-App:** Shows in dashboard (real-time via Socket.io)
- 🔔 **Badge:** Unread count updates

---

## 📱 How Notifications Show to Users

### 1. **Email Notifications**

**When:** After email queue processes the job

**Where:** User's email inbox

**Format:** Beautiful HTML email with:
- Gradient header
- Task list with priority badges
- Estimated time indicators
- Call-to-action buttons
- Mobile responsive

**Example:**
```
Subject: Your 5 tasks for today

┌──────────────────────────────────┐
│   📋 Your Tasks for Today       │ (Gradient header)
│   Sunday, February 23, 2026      │
├──────────────────────────────────┤
│                                  │
│ Hi John,                         │
│                                  │
│ You have 5 tasks scheduled:      │
│                                  │
│ ┌────────────────────────────┐  │
│ │ Complete project proposal  │  │
│ │ 🔴 HIGH | ⏱ 120 minutes    │  │
│ └────────────────────────────┘  │
│                                  │
│ [View All Tasks] (Button)        │
└──────────────────────────────────┘
```

---

### 2. **In-App Notifications**

**When:** Immediately after notification is created

**Where:** User dashboard notification center

**How to Fetch:**
```javascript
// Frontend makes API call
GET /api/v1/notifications?limit=10

// Response:
{
  "success": true,
  "count": 3,
  "notifications": [
    {
      "id": 1,
      "type": "DAILY_REMINDER",
      "title": "You have 5 tasks today",
      "message": "Ready to tackle your tasks?",
      "isRead": false,
      "sentAt": "2026-02-23T08:00:00Z"
    }
  ]
}
```

**UI Display:**
```
┌─────────────────────────────────┐
│ 🔔 Notifications (3 unread)     │
├─────────────────────────────────┤
│ • You have 5 tasks today        │ ← Unread (bold)
│   Ready to tackle your tasks?   │
│   8:00 AM                       │
├─────────────────────────────────┤
│ ✓ Task completed!               │ ← Read (gray)
│   Great work on "Report"        │
│   Yesterday                     │
└─────────────────────────────────┘
```

---

### 3. **Real-Time Notifications (Socket.io)**

**When:** Instantly when notification is created

**How It Works:**

**Server-Side:**
```javascript
// When notification is created
const io = global.io;
io.to(`user:${userId}`).emit('notification:new', notification);
```

**Client-Side (Frontend):**
```javascript
// Connect to Socket.io
const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

// Join user room
socket.emit('join', { userId: 1 });

// Listen for new notifications
socket.on('notification:new', (notification) => {
  // Show toast/popup
  showToast(notification.title, notification.message);
  
  // Update badge count
  updateNotificationBadge();
  
  // Add to notification list
  addToNotificationList(notification);
});
```

**Live Features:**
- ✅ Instant notification popup/toast
- ✅ Badge count updates without refresh
- ✅ Sound notification (optional)
- ✅ Desktop notification (optional)

---

## 🧪 Testing Notifications with Postman

### Setup

**1. Import Environment Variables:**

| Variable | Value |
|----------|-------|
| `base_url` | `http://localhost:3000` |
| `api_version` | `v1` |
| `token` | Your JWT token after login |

**2. Login to Get Token:**
```
POST {{base_url}}/api/{{api_version}}/auth/login

Body:
{
  "email": "your-email@example.com",
  "password": "your-password"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "email": "..." }
}
```

**3. Set Authorization Header:**
```
Authorization: Bearer {{token}}
```

---

## 📬 API Testing Examples

### 1. Get All Notifications

**Endpoint:** `GET /api/v1/notifications`

**Request:**
```
GET {{base_url}}/api/{{api_version}}/notifications
```

**Query Parameters:**
- `limit` (default: 50) - Pagination
- `offset` (default: 0) - Skip records
- `status` - Filter: `PENDING`, `SENT`, `FAILED`, `READ`
- `type` - Filter: `DAILY_REMINDER`, `GOAL_MILESTONE`, etc.

**Example with Filters:**
```
GET {{base_url}}/api/{{api_version}}/notifications?limit=10&status=SENT
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "total": 15,
  "notifications": [
    {
      "id": 1,
      "userId": 1,
      "type": "DAILY_REMINDER",
      "channel": "IN_APP",
      "status": "SENT",
      "title": "You have 5 tasks today",
      "message": "Ready to tackle your tasks? Let's make today productive!",
      "data": {
        "taskCount": 5,
        "tasks": [
          {"id": 1, "title": "Complete report", "priority": "HIGH"}
        ]
      },
      "isRead": false,
      "readAt": null,
      "sentAt": "2026-02-23T08:00:00.000Z",
      "createdAt": "2026-02-23T07:59:55.000Z",
      "updatedAt": "2026-02-23T08:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Unread Count

**Endpoint:** `GET /api/v1/notifications/unread/count`

**Request:**
```
GET {{base_url}}/api/{{api_version}}/notifications/unread/count
```

**Response:**
```json
{
  "success": true,
  "count": 7
}
```

**Use Case:** Display badge count on notification bell icon

---

### 3. Mark Notification as Read

**Endpoint:** `PATCH /api/v1/notifications/:id/read`

**Request:**
```
PATCH {{base_url}}/api/{{api_version}}/notifications/1/read
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "notification": {
    "id": 1,
    "isRead": true,
    "readAt": "2026-02-23T10:30:00.000Z"
  }
}
```

---

### 4. Mark All as Read

**Endpoint:** `PATCH /api/v1/notifications/read/all`

**Request:**
```
PATCH {{base_url}}/api/{{api_version}}/notifications/read/all
```

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "count": 7
}
```

**Use Case:** "Mark all as read" button

---

### 5. Delete Notification

**Endpoint:** `DELETE /api/v1/notifications/:id`

**Request:**
```
DELETE {{base_url}}/api/{{api_version}}/notifications/1
```

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

### 6. Delete All Read Notifications

**Endpoint:** `DELETE /api/v1/notifications/read/all`

**Request:**
```
DELETE {{base_url}}/api/{{api_version}}/notifications/read/all
```

**Response:**
```json
{
  "success": true,
  "message": "Deleted 5 read notifications",
  "count": 5
}
```

**Use Case:** "Clear all" button to clean up notification history

---

### 7. Get Notification Settings

**Endpoint:** `GET /api/v1/notifications/settings/preferences`

**Request:**
```
GET {{base_url}}/api/{{api_version}}/notifications/settings/preferences
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "enableEmailReminders": true,
    "enablePushReminders": false,
    "reminderFrequency": "DAILY",
    "morningReminderTime": "08:00",
    "eveningReminderTime": "20:00",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-02-23T10:00:00.000Z"
  }
}
```

**Note:** If settings don't exist, they are automatically created with defaults.

---

### 8. Update Notification Settings

**Endpoint:** `PUT /api/v1/notifications/settings/preferences`

**Request:**
```
PUT {{base_url}}/api/{{api_version}}/notifications/settings/preferences

Body (JSON):
{
  "enableEmailReminders": true,
  "enablePushReminders": false,
  "morningReminderTime": "07:30",
  "eveningReminderTime": "21:00"
}
```

**Supported Fields (All Optional):**
- `enableEmailReminders` (boolean)
- `enablePushReminders` (boolean)
- `reminderFrequency` (string: "DAILY", "WEEKLY", etc.)
- `morningReminderTime` (string: "HH:MM")
- `eveningReminderTime` (string: "HH:MM")

**Response:**
```json
{
  "success": true,
  "message": "Notification settings updated successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "enableEmailReminders": true,
    "morningReminderTime": "07:30",
    "eveningReminderTime": "21:00",
    "updatedAt": "2026-02-23T11:00:00.000Z"
  }
}
```

---

### 9. Get Notification Statistics

**Endpoint:** `GET /api/v1/notifications/stats`

**Request:**
```
GET {{base_url}}/api/{{api_version}}/notifications/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 45,
    "unread": 7,
    "read": 38,
    "byType": {
      "DAILY_REMINDER": 30,
      "GOAL_MILESTONE": 8,
      "STREAK_NOTIFICATION": 5,
      "AI_SUGGESTION": 2
    },
    "byStatus": {
      "SENT": 42,
      "FAILED": 2,
      "PENDING": 1
    },
    "recentActivity": {
      "last24Hours": 5,
      "last7Days": 28,
      "last30Days": 45
    }
  }
}
```

**Use Case:** Dashboard analytics

---

## 🔔 Testing Notification Triggers

### Trigger Scheduler Endpoints

These endpoints manually trigger automatic schedulers for testing:

**Base URL:** `{{base_url}}/api/{{api_version}}/tasks/scheduler/trigger`

---

### 1. Trigger Morning Summary

**Endpoint:** `POST /tasks/scheduler/trigger/morning`

**Request:**
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/morning
```

**What It Does:**
- Fetches all tasks for today
- Sends email with task list (if email enabled)
- Creates in-app notification
- Respects user's `morningReminderTime` setting

**Response:**
```json
{
  "success": true,
  "message": "Morning task summary triggered successfully"
}
```

**After Triggering:**
1. Check your email inbox
2. Call `GET /notifications` to see in-app notification
3. Check `GET /notifications/unread/count`

---

### 2. Trigger Evening Review

**Endpoint:** `POST /tasks/scheduler/trigger/evening`

**Request:**
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/evening
```

**What It Does:**
- Reviews tasks completed today
- Lists tasks still pending
- Sends completion statistics email
- Creates motivational in-app notification

**Response:**
```json
{
  "success": true,
  "message": "Evening task review triggered successfully"
}
```

---

### 3. Trigger Due Soon Check

**Endpoint:** `POST /tasks/scheduler/trigger/due-soon`

**Request:**
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/due-soon
```

**What It Does:**
- Finds tasks due within next 60 minutes
- Sends urgent notification for each task
- Red-themed warning email

**Testing Tip:**
```
1. Create task with dueDate = 30 minutes from now
2. Trigger this endpoint
3. Check email and notifications
```

**Response:**
```json
{
  "success": true,
  "message": "Due soon check triggered successfully"
}
```

---

### 4. Trigger Weekly Review

**Endpoint:** `POST /tasks/scheduler/trigger/weekly`

**Request:**
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/weekly
```

**What It Does:**
- Analyzes past 7 days of task activity
- Calculates completion rate
- Shows top completed tasks
- Sends statistics email with progress bar

**Response:**
```json
{
  "success": true,
  "message": "Weekly review triggered successfully"
}
```

---

### 5. Trigger Overdue Check

**Endpoint:** `POST /tasks/scheduler/trigger/overdue`

**Request:**
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/overdue
```

**What It Does:**
- Finds all tasks with past due dates
- Status is TODO or IN_PROGRESS
- Sends warning email with days overdue

**Testing Tip:**
```
1. Create task with dueDate = yesterday
2. Trigger this endpoint
3. Check email and notifications
```

**Response:**
```json
{
  "success": true,
  "message": "Overdue check triggered successfully"
}
```

---

## 🧪 Complete Testing Workflow

### Scenario: Test Complete Notification Flow

**Step 1: Enable Email Notifications**
```
PUT {{base_url}}/api/v1/notifications/settings/preferences

Body:
{
  "enableEmailReminders": true
}
```

**Step 2: Create Test Tasks**
```
POST {{base_url}}/api/v1/tasks

Body:
{
  "title": "Complete project proposal",
  "description": "Finalize Q1 proposal document",
  "priority": "HIGH",
  "status": "TODO",
  "dueDate": "2026-02-23T17:00:00.000Z",
  "scheduledDate": "2026-02-23T09:00:00.000Z",
  "estimatedMinutes": 120
}
```

**Step 3: Trigger Morning Summary**
```
POST {{base_url}}/api/v1/tasks/scheduler/trigger/morning
```

**Step 4: Verify Notifications Created**
```
GET {{base_url}}/api/v1/notifications?limit=5
```

Expected: New notification with type `DAILY_REMINDER`

**Step 5: Check Unread Count**
```
GET {{base_url}}/api/v1/notifications/unread/count
```

Expected: Count increased by 1

**Step 6: Mark as Read**
```
PATCH {{base_url}}/api/v1/notifications/1/read
```

**Step 7: Verify Count Decreased**
```
GET {{base_url}}/api/v1/notifications/unread/count
```

Expected: Count decreased by 1

**Step 8: Check Email**
- Open your email inbox
- Look for email with subject: "Your X tasks for today"
- Verify beautiful HTML formatting

**Step 9: Get Statistics**
```
GET {{base_url}}/api/v1/notifications/stats
```

Expected: Shows total notifications, breakdown by type

---

## 🐛 Troubleshooting

### Issue: No notifications appearing

**Checklist:**
1. ✅ Redis is running: `redis-cli ping` should return `PONG`
2. ✅ Server started successfully (check logs for queue initialization)
3. ✅ User settings have `enableEmailReminders: true`
4. ✅ Tasks exist with proper dates
5. ✅ JWT token is valid (not expired)

**Debug Commands:**
```
# Check Redis
redis-cli ping

# Check server logs
npm run dev
# Look for: [NotificationQueue] Initialized with Bull queues

# Check user settings
GET {{base_url}}/api/v1/notifications/settings/preferences

# Enable if disabled
PUT {{base_url}}/api/v1/notifications/settings/preferences
Body: {"enableEmailReminders": true}
```

---

### Issue: Email not received

**Possible Causes:**
1. Email reminders disabled in user settings
2. SMTP configuration incorrect in `.env`
3. Email in spam folder
4. Queue failed to process job

**Solutions:**
```
# 1. Check user settings
GET {{base_url}}/api/v1/notifications/settings/preferences

# 2. Check .env configuration
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
FROM_EMAIL=noreply@yourdomain.com

# 3. Check spam folder

# 4. Check server logs for errors
npm run dev
# Look for: [EmailQueue] Error sending email
```

---

### Issue: Notifications showing wrong count

**Solution:** Check pagination

```
# Get ALL notifications (increase limit)
GET {{base_url}}/api/v1/notifications?limit=100

# Use offset for pagination
GET {{base_url}}/api/v1/notifications?limit=20&offset=20
```

---

### Issue: Queue not processing jobs

**Solutions:**
1. Restart Redis
2. Restart server
3. Check Redis connection in `.env`

```bash
# Restart Redis (Docker)
docker restart redis

# Restart Redis (Windows)
redis-server.exe

# Check Redis connection
redis-cli
> PING
PONG
> KEYS *
# Should show queue keys like: bull:email-notifications:*
```

---

## 📊 Monitoring Queue Health

### Check Queue Status

**Server Logs:**
```
npm run dev

# Look for:
[NotificationQueue] Initialized with Bull queues
[EmailQueue] Email queued: Job 1
[EmailQueue] Processing email: ...
[EmailQueue] Email sent successfully
[InAppQueue] In-app notification created: 1
```

### Check Redis Queue Data

```bash
redis-cli

# List all keys
KEYS bull:*

# Check waiting jobs
LLEN bull:email-notifications:wait

# Check active jobs
LLEN bull:email-notifications:active

# Check failed jobs
LLEN bull:email-notifications:failed
```

---

## ✅ Testing Checklist

### Notification API
- [ ] Get all notifications
- [ ] Get notifications with pagination
- [ ] Filter by status (SENT, READ)
- [ ] Filter by type (DAILY_REMINDER)
- [ ] Get unread count
- [ ] Mark single notification as read
- [ ] Mark all as read
- [ ] Delete single notification
- [ ] Delete all read notifications
- [ ] Get settings (auto-creates if not exists)
- [ ] Update settings
- [ ] Get statistics

### Scheduler Triggers
- [ ] Morning summary (with tasks)
- [ ] Morning summary (no tasks)
- [ ] Evening review
- [ ] Due soon (with tasks due in 1 hour)
- [ ] Weekly review
- [ ] Overdue (with overdue tasks)

### Email Verification
- [ ] Morning summary email received
- [ ] Evening review email with stats
- [ ] Due soon urgent email (red theme)
- [ ] Weekly review with progress bar
- [ ] Overdue warning email

### Real-Time (Socket.io)
- [ ] Connect to Socket.io server
- [ ] Join user room
- [ ] Receive `notification:new` event
- [ ] Badge count updates instantly
- [ ] Notification appears without refresh

---

## 📚 Related Documentation

- **Phase 2 Implementation:** `PHASE2_IMPLEMENTATION_SUMMARY.md`
- **Phase 2 Testing:** `PHASE2_TASK_NOTIFICATION_TESTING.md`
- **Postman Guide:** `PHASE2_POSTMAN_TESTING_GUIDE.md`
- **Quick Reference:** `PHASE2_QUICK_REFERENCE.md`

---

## 🎯 Summary

### How Notifications Work:

1. **Trigger Event** → Task created, scheduler runs, etc.
2. **Generate Content** → Task notification service creates message
3. **Queue Job** → Bull adds job to Redis queue
4. **Process Job** → Worker picks up and processes
5. **Send Email** → SMTP service sends email
6. **Create In-App** → Database record + Socket.io emit
7. **User Receives** → Email inbox + dashboard + real-time popup

### How to Test:

1. **Setup:** Login, get token, set environment variables
2. **Trigger:** Use scheduler trigger endpoints
3. **Verify:** Check notifications API, email inbox, unread count
4. **Interact:** Mark as read, delete, update settings
5. **Monitor:** Check server logs, queue status, statistics

### Key Features:

✅ **Multi-Channel:** Email + In-App + Real-time  
✅ **Reliable:** Queue system with retry logic  
✅ **Customizable:** User preferences for timing and channels  
✅ **Analytics:** Statistics and activity tracking  
✅ **Real-time:** Socket.io instant notifications  
✅ **Beautiful:** HTML email templates  

---

**Ready to test? Start with the morning summary trigger and watch notifications flow! 🚀**

*Last Updated: February 23, 2026*
