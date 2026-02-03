# Phase 2: Task Notification System - Postman Testing Guide

## 📋 Overview

This guide provides step-by-step instructions for testing the **Phase 2 Task Notification System** using Postman. All endpoints, request examples, and expected responses are included.

---

## 🚀 Quick Setup

### 1. **Import Collection to Postman**

Create a new collection named **"Phase 2 - Task Notifications"** in Postman.

### 2. **Setup Environment Variables**

Create a new environment in Postman with these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `base_url` | `http://localhost:3000` | Your server URL |
| `api_version` | `v1` | API version |
| `token` | `YOUR_JWT_TOKEN` | Get from login endpoint |
| `user_id` | `1` | Your user ID |
| `notification_id` | `1` | Test notification ID |

### 3. **Get Authentication Token**

First, login to get your JWT token:

**Login Request:**
```
POST {{base_url}}/api/{{api_version}}/auth/login
```

**Body (JSON):**
```json
{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "your-email@example.com"
  }
}
```

**Action:** Copy the `token` value and paste it into your Postman environment variable `{{token}}`.

---

## 📬 NOTIFICATION API ENDPOINTS

### Base URL
```
{{base_url}}/api/{{api_version}}/notifications
```

### Authentication Header (Required for all endpoints)
```
Authorization: Bearer {{token}}
```

---

## 1️⃣ Get All Notifications

**Method:** `GET`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/notifications`

### Query Parameters (Optional)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | Number | 20 | Number of notifications per page |
| `offset` | Number | 0 | Pagination offset |
| `status` | String | - | Filter: PENDING, SENT, FAILED, READ |
| `type` | String | - | Filter: DAILY_REMINDER, GOAL_MILESTONE, etc. |

### Example Requests

#### Get all notifications (default)
```
GET {{base_url}}/api/{{api_version}}/notifications
```

#### Get first 10 notifications
```
GET {{base_url}}/api/{{api_version}}/notifications?limit=10&offset=0
```

#### Get only sent notifications
```
GET {{base_url}}/api/{{api_version}}/notifications?status=SENT
```

#### Get only daily reminders
```
GET {{base_url}}/api/{{api_version}}/notifications?type=DAILY_REMINDER
```

### Expected Response
```json
{
  "success": true,
  "count": 3,
  "data": [
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
          {"id": 1, "title": "Complete report", "priority": "HIGH"},
          {"id": 2, "title": "Team meeting", "priority": "MEDIUM"}
        ]
      },
      "isRead": false,
      "readAt": null,
      "sentAt": "2026-02-02T08:00:00.000Z",
      "createdAt": "2026-02-02T07:59:55.000Z",
      "updatedAt": "2026-02-02T08:00:00.000Z"
    }
  ]
}
```

---

## 2️⃣ Get Unread Count

**Method:** `GET`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/notifications/unread/count`

### Request
```
GET {{base_url}}/api/{{api_version}}/notifications/unread/count
```

### Expected Response
```json
{
  "success": true,
  "unreadCount": 7
}
```

**Use Case:** Display notification badge count in UI.

---

## 3️⃣ Mark Notification as Read

**Method:** `PATCH`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/notifications/:id/read`

### Request
```
PATCH {{base_url}}/api/{{api_version}}/notifications/{{notification_id}}/read
```

**Example with ID:**
```
PATCH {{base_url}}/api/{{api_version}}/notifications/1/read
```

### Expected Response
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": 1,
    "isRead": true,
    "readAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T10:30:00.000Z"
  }
}
```

---

## 4️⃣ Mark All Notifications as Read

**Method:** `PATCH`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/notifications/read/all`

### Request
```
PATCH {{base_url}}/api/{{api_version}}/notifications/read/all
```

### Expected Response
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "count": 7
}
```

**Use Case:** "Mark all as read" button in notification center.

---

## 5️⃣ Delete Notification

**Method:** `DELETE`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/notifications/:id`

### Request
```
DELETE {{base_url}}/api/{{api_version}}/notifications/{{notification_id}}
```

**Example with ID:**
```
DELETE {{base_url}}/api/{{api_version}}/notifications/1
```

### Expected Response
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## 6️⃣ Delete All Read Notifications

**Method:** `DELETE`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/notifications/read/all`

### Request
```
DELETE {{base_url}}/api/{{api_version}}/notifications/read/all
```

### Expected Response
```json
{
  "success": true,
  "message": "Deleted 5 read notifications",
  "count": 5
}
```

**Use Case:** "Clear all read" button to clean up notification history.

---

## 7️⃣ Get Notification Settings

**Method:** `GET`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/notifications/settings/preferences`

### Request
```
GET {{base_url}}/api/{{api_version}}/notifications/settings/preferences
```

### Expected Response
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
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-02-02T10:00:00.000Z"
  }
}
```

---

## 8️⃣ Update Notification Settings

**Method:** `PUT`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/notifications/settings/preferences`

### Request
```
PUT {{base_url}}/api/{{api_version}}/notifications/settings/preferences
```

### Body (JSON) - All fields optional
```json
{
  "enableEmailReminders": true,
  "enablePushNotifications": false,
  "morningReminderTime": "07:30",
  "eveningReminderTime": "21:00",
  "weeklyReviewDay": "SATURDAY"
}
```

### Example: Only enable email reminders
```json
{
  "enableEmailReminders": true
}
```

### Example: Change morning reminder time
```json
{
  "morningReminderTime": "06:00"
}
```

### Expected Response
```json
{
  "success": true,
  "message": "Notification settings updated successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "enableEmailReminders": true,
    "enablePushNotifications": false,
    "morningReminderTime": "07:30",
    "eveningReminderTime": "21:00",
    "weeklyReviewDay": "SATURDAY",
    "updatedAt": "2026-02-02T11:00:00.000Z"
  }
}
```

---

## 9️⃣ Get Notification Statistics

**Method:** `GET`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/notifications/stats`

### Request
```
GET {{base_url}}/api/{{api_version}}/notifications/stats
```

### Expected Response
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

**Use Case:** Display notification analytics in user dashboard.

---

## 📅 TASK SCHEDULER TRIGGER ENDPOINTS

These endpoints manually trigger automated schedulers for testing purposes.

**Base URL:** `{{base_url}}/api/{{api_version}}/tasks/scheduler/trigger`

---

## 🔟 Trigger Morning Task Summary

**Method:** `POST`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/morning`

### Request
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/morning
```

**What it does:**
- Fetches all tasks scheduled for today
- Sends email with task list (if email reminders enabled)
- Creates in-app notification
- Respects user's `morningReminderTime` setting

### Expected Response
```json
{
  "success": true,
  "message": "Morning task summary sent to 1 users",
  "results": [
    {
      "userId": 1,
      "success": true,
      "tasksCount": 5
    }
  ]
}
```

### Email Preview
**Subject:** Your 5 tasks for today  
**Content:** 
- Morning greeting
- List of all tasks for today
- Priority badges
- Estimated time for each task
- "View All Tasks" button

---

## 1️⃣1️⃣ Trigger Evening Task Review

**Method:** `POST`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/evening`

### Request
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/evening
```

**What it does:**
- Reviews tasks completed today
- Lists tasks still pending
- Calculates completion statistics
- Sends email + in-app notification

### Expected Response
```json
{
  "success": true,
  "message": "Evening task review sent to 1 users",
  "results": [
    {
      "userId": 1,
      "success": true,
      "completedCount": 3,
      "pendingCount": 2
    }
  ]
}
```

### Email Preview
**Subject:** Your day in review - 3 tasks completed  
**Content:**
- Completion stats (completed vs pending)
- List of completed tasks with checkmarks
- List of pending tasks
- Motivational message

---

## 1️⃣2️⃣ Trigger Due Soon Check

**Method:** `POST`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/due-soon`

### Request
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/due-soon
```

**What it does:**
- Finds tasks due within next 60 minutes
- Sends urgent notification for each task
- Creates countdown timer ("Due in 45 minutes")

### Expected Response
```json
{
  "success": true,
  "message": "Due soon check completed for all users",
  "results": [
    {
      "userId": 1,
      "success": true,
      "count": 2
    }
  ]
}
```

### Email Preview
**Subject:** ⚠️ 2 tasks due within 1 hour  
**Content:**
- Red urgent theme
- List of tasks with countdown
- Priority badges
- "View Tasks Now" button

**Testing Tip:** Create a task with `dueDate` set to 30 minutes from now, then trigger this endpoint.

---

## 1️⃣3️⃣ Trigger Weekly Review

**Method:** `POST`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/weekly`

### Request
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/weekly
```

**What it does:**
- Analyzes past 7 days of task activity
- Calculates completion rate
- Shows top completed tasks
- Sends weekly statistics email

### Expected Response
```json
{
  "success": true,
  "message": "Weekly review sent to 1 users",
  "results": [
    {
      "userId": 1,
      "success": true,
      "completedCount": 15,
      "totalCount": 20,
      "completionRate": 75
    }
  ]
}
```

### Email Preview
**Subject:** 📊 Your weekly review - 15 tasks completed  
**Content:**
- Completion statistics
- Progress bar with completion rate (75%)
- Top 5 completed tasks
- Total tasks created
- Performance-based motivational message

---

## 1️⃣4️⃣ Trigger Overdue Check

**Method:** `POST`  
**Endpoint:** `{{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/overdue`

### Request
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/overdue
```

**What it does:**
- Finds all tasks with `dueDate` in the past
- Status is TODO or IN_PROGRESS
- Calculates days overdue
- Sends warning notification

### Expected Response
```json
{
  "success": true,
  "message": "Overdue check completed for all users",
  "results": [
    {
      "userId": 1,
      "success": true,
      "count": 3
    }
  ]
}
```

### Email Preview
**Subject:** ⚠️ You have 3 overdue tasks  
**Content:**
- Red warning theme
- List of overdue tasks
- Days overdue for each
- Priority levels
- "Manage Tasks" button

**Testing Tip:** Create a task with `dueDate` set to yesterday, then trigger this endpoint.

---

## 🧪 STEP-BY-STEP TESTING WORKFLOW

### Test Scenario 1: Complete Notification Flow

**Step 1:** Enable email reminders
```
PUT {{base_url}}/api/{{api_version}}/notifications/settings/preferences

Body:
{
  "enableEmailReminders": true
}
```

**Step 2:** Create a test task for today
```
POST {{base_url}}/api/{{api_version}}/tasks

Body:
{
  "title": "Complete project proposal",
  "description": "Finalize Q1 proposal document",
  "priority": "HIGH",
  "status": "TODO",
  "dueDate": "2026-02-02T17:00:00.000Z",
  "scheduledDate": "2026-02-02T09:00:00.000Z",
  "estimatedMinutes": 120
}
```

**Step 3:** Trigger morning summary
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/morning
```

**Step 4:** Check notifications were created
```
GET {{base_url}}/api/{{api_version}}/notifications?limit=5
```

**Step 5:** Check unread count
```
GET {{base_url}}/api/{{api_version}}/notifications/unread/count
```

**Step 6:** Mark notification as read
```
PATCH {{base_url}}/api/{{api_version}}/notifications/1/read
```

**Step 7:** Verify unread count decreased
```
GET {{base_url}}/api/{{api_version}}/notifications/unread/count
```

---

### Test Scenario 2: Due Soon Alert

**Step 1:** Create urgent task (due in 30 minutes)
```
POST {{base_url}}/api/{{api_version}}/tasks

Body:
{
  "title": "Urgent client call",
  "priority": "URGENT",
  "status": "TODO",
  "dueDate": "2026-02-02T11:30:00.000Z"
}
```
*Note: Adjust `dueDate` to be 30 minutes from current time*

**Step 2:** Trigger due soon check
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/due-soon
```

**Step 3:** Verify notification created
```
GET {{base_url}}/api/{{api_version}}/notifications?type=DAILY_REMINDER&limit=1
```

**Step 4:** Check email (should receive urgent red-themed email)

---

### Test Scenario 3: Evening Review

**Step 1:** Complete some tasks
```
PATCH {{base_url}}/api/{{api_version}}/tasks/1/complete
PATCH {{base_url}}/api/{{api_version}}/tasks/2/complete
```

**Step 2:** Trigger evening review
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/evening
```

**Step 3:** Check notification
```
GET {{base_url}}/api/{{api_version}}/notifications?limit=1
```

Expected: Shows "You completed 2 tasks today" message

---

### Test Scenario 4: Weekly Statistics

**Step 1:** Create and complete several tasks throughout the week
```
POST {{base_url}}/api/{{api_version}}/tasks
(Create 5+ tasks)

PATCH {{base_url}}/api/{{api_version}}/tasks/:id/complete
(Complete 3+ tasks)
```

**Step 2:** Trigger weekly review
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/weekly
```

**Step 3:** Check notification statistics
```
GET {{base_url}}/api/{{api_version}}/notifications/stats
```

Expected: Shows weekly activity breakdown

---

### Test Scenario 5: Overdue Tasks

**Step 1:** Create overdue task (past due date)
```
POST {{base_url}}/api/{{api_version}}/tasks

Body:
{
  "title": "Old task not completed",
  "priority": "HIGH",
  "status": "TODO",
  "dueDate": "2026-01-30T10:00:00.000Z"
}
```

**Step 2:** Trigger overdue check
```
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/overdue
```

**Step 3:** Verify warning notification
```
GET {{base_url}}/api/{{api_version}}/notifications?limit=1
```

Expected: Shows overdue task count with warning

---

## 📥 IMPORT POSTMAN COLLECTION

### Pre-Built Collection JSON

Save this as `Phase2-Notifications.postman_collection.json`:

```json
{
  "info": {
    "name": "Phase 2 - Task Notifications",
    "description": "Complete API collection for Phase 2 Task Notification System",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Notifications",
      "item": [
        {
          "name": "Get All Notifications",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/{{api_version}}/notifications?limit=20&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "{{api_version}}", "notifications"],
              "query": [
                {"key": "limit", "value": "20"},
                {"key": "offset", "value": "0"},
                {"key": "status", "value": "SENT", "disabled": true},
                {"key": "type", "value": "DAILY_REMINDER", "disabled": true}
              ]
            }
          }
        },
        {
          "name": "Get Unread Count",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": "{{base_url}}/api/{{api_version}}/notifications/unread/count"
          }
        },
        {
          "name": "Mark as Read",
          "request": {
            "method": "PATCH",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": "{{base_url}}/api/{{api_version}}/notifications/{{notification_id}}/read"
          }
        },
        {
          "name": "Mark All as Read",
          "request": {
            "method": "PATCH",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": "{{base_url}}/api/{{api_version}}/notifications/read/all"
          }
        },
        {
          "name": "Delete Notification",
          "request": {
            "method": "DELETE",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": "{{base_url}}/api/{{api_version}}/notifications/{{notification_id}}"
          }
        },
        {
          "name": "Delete All Read",
          "request": {
            "method": "DELETE",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": "{{base_url}}/api/{{api_version}}/notifications/read/all"
          }
        },
        {
          "name": "Get Settings",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": "{{base_url}}/api/{{api_version}}/notifications/settings/preferences"
          }
        },
        {
          "name": "Update Settings",
          "request": {
            "method": "PUT",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              },
              {
                "key": "Content-Type",
                "value": "application/json",
                "type": "text"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"enableEmailReminders\": true,\n  \"enablePushNotifications\": false,\n  \"morningReminderTime\": \"07:30\",\n  \"eveningReminderTime\": \"21:00\",\n  \"weeklyReviewDay\": \"SATURDAY\"\n}"
            },
            "url": "{{base_url}}/api/{{api_version}}/notifications/settings/preferences"
          }
        },
        {
          "name": "Get Statistics",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": "{{base_url}}/api/{{api_version}}/notifications/stats"
          }
        }
      ]
    },
    {
      "name": "Task Schedulers",
      "item": [
        {
          "name": "Trigger Morning Summary",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": "{{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/morning"
          }
        },
        {
          "name": "Trigger Evening Review",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": "{{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/evening"
          }
        },
        {
          "name": "Trigger Due Soon Check",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": "{{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/due-soon"
          }
        },
        {
          "name": "Trigger Weekly Review",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": "{{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/weekly"
          }
        },
        {
          "name": "Trigger Overdue Check",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": "{{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/overdue"
          }
        }
      ]
    }
  ]
}
```

### Import Steps:
1. Open Postman
2. Click "Import" button (top left)
3. Drag the JSON file or paste the JSON content
4. Collection appears in left sidebar
5. Create environment with variables (base_url, api_version, token)
6. Start testing!

---

## ✅ Testing Checklist

### Notification API
- [ ] Get all notifications (default pagination)
- [ ] Get notifications with custom limit/offset
- [ ] Filter by status (SENT, PENDING, FAILED, READ)
- [ ] Filter by type (DAILY_REMINDER, GOAL_MILESTONE)
- [ ] Get unread count
- [ ] Mark single notification as read
- [ ] Mark all notifications as read
- [ ] Delete single notification
- [ ] Delete all read notifications
- [ ] Get notification settings
- [ ] Update notification settings (email preferences)
- [ ] Update notification settings (reminder times)
- [ ] Get notification statistics

### Task Schedulers
- [ ] Trigger morning summary (with tasks)
- [ ] Trigger morning summary (no tasks)
- [ ] Trigger evening review (with completed tasks)
- [ ] Trigger evening review (no completed tasks)
- [ ] Trigger due soon (with tasks due in 1 hour)
- [ ] Trigger due soon (no tasks due soon)
- [ ] Trigger weekly review
- [ ] Trigger overdue check (with overdue tasks)
- [ ] Trigger overdue check (no overdue tasks)

### Email Verification
- [ ] Receive morning summary email
- [ ] Receive evening review email
- [ ] Receive due soon alert email (red theme)
- [ ] Receive weekly review email (progress bar)
- [ ] Receive overdue tasks email (warning theme)

### Integration Tests
- [ ] Queue system processes jobs (check logs)
- [ ] In-app notifications appear in database
- [ ] Email reminders respect user settings
- [ ] Notifications marked as read correctly
- [ ] Bulk operations work (mark all, delete all)
- [ ] Statistics calculate correctly

---

## 🐛 Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution:** Token expired or invalid. Login again and update `{{token}}` variable.

### Issue: No email received
**Solutions:**
1. Check user settings: `enableEmailReminders` must be `true`
2. Verify email service configuration in `.env`
3. Check spam folder
4. Review server logs for email errors

### Issue: Notifications not created
**Solutions:**
1. Ensure tasks exist with proper dates
2. Check Redis is running: `redis-cli ping`
3. Review server logs for errors
4. Verify scheduler started (check server startup logs)

### Issue: Wrong notification count
**Solution:** Check pagination. Use `limit=100` to see more results.

### Issue: Queue not processing
**Solutions:**
1. Verify Redis connection
2. Restart server
3. Check server logs for queue errors

---

## 📊 Expected Results Summary

| Test | Expected Notifications | Expected Emails |
|------|------------------------|-----------------|
| Morning Summary | 1 in-app | 1 email with task list |
| Evening Review | 1 in-app | 1 email with stats |
| Due Soon (2 tasks) | 2 in-app | 1 email with both tasks |
| Weekly Review | 1 in-app | 1 email with progress |
| Overdue (3 tasks) | 1 in-app | 1 email with all 3 |

---

## 🎯 Quick Testing Commands

Copy-paste these into Postman (after setting up environment):

```bash
# Complete morning flow
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/morning
GET {{base_url}}/api/{{api_version}}/notifications/unread/count
GET {{base_url}}/api/{{api_version}}/notifications?limit=5
PATCH {{base_url}}/api/{{api_version}}/notifications/1/read

# Check evening review
POST {{base_url}}/api/{{api_version}}/tasks/scheduler/trigger/evening
GET {{base_url}}/api/{{api_version}}/notifications/stats

# Test settings
GET {{base_url}}/api/{{api_version}}/notifications/settings/preferences
PUT {{base_url}}/api/{{api_version}}/notifications/settings/preferences
# Body: {"morningReminderTime": "06:00"}

# Cleanup
PATCH {{base_url}}/api/{{api_version}}/notifications/read/all
DELETE {{base_url}}/api/{{api_version}}/notifications/read/all
```

---

## 📚 Additional Resources

- **Implementation Summary:** `PHASE2_IMPLEMENTATION_SUMMARY.md`
- **Quick Reference:** `PHASE2_QUICK_REFERENCE.md`
- **Full Testing Guide:** `PHASE2_TASK_NOTIFICATION_TESTING.md`
- **Habit System Testing:** `HABIT_SYSTEM_POSTMAN_TESTING.md`

---

## 🎉 Success Criteria

Phase 2 is working correctly if:

✅ All 9 notification API endpoints return successful responses  
✅ All 5 scheduler triggers send notifications  
✅ Emails are delivered with correct formatting  
✅ In-app notifications appear in database  
✅ Unread count updates when marking as read  
✅ Settings changes are persisted  
✅ Statistics show accurate counts  
✅ Queue processes jobs (check server logs)  
✅ Redis connection stable  
✅ No errors in server console  

---

**Happy Testing! 🚀**

*Last Updated: February 2, 2026*
