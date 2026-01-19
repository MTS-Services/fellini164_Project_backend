# Admin Task Management - Postman Testing Guide

Complete testing guide for all admin task management endpoints.

---

## Prerequisites

1. **Admin Authentication Required**
   - Create an admin user or update existing user to ADMIN role
   - Login as admin to get JWT token
   - Add token to Authorization header: `Bearer YOUR_ADMIN_TOKEN`

2. **Base URL**: `http://localhost:5000/api/v1/admin`

3. **Required Headers**:
```
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```

---

## Testing Flow

### STEP 1: Get All Tasks System-Wide

**Purpose**: View all tasks across all users with filtering and pagination.

**Request**:
```
GET {{baseUrl}}/admin/tasks
```

**Query Parameters** (all optional):
```
?userId=USER_ID_HERE           # Filter by specific user
&status=COMPLETED              # Filter by status (TODO, IN_PROGRESS, COMPLETED, CANCELED, SKIPPED)
&priority=HIGH                 # Filter by priority (LOW, MEDIUM, HIGH, URGENT)
&source=AI_GENERATED           # Filter by source (AI_GENERATED, MANUAL, FROM_GOAL, FROM_HABIT, FROM_PLAN)
&category=Productivity         # Filter by category
&aiGenerated=true              # Filter AI tasks only (true/false)
&search=workout                # Search in title/description
&startDate=2026-01-01          # Date range start
&endDate=2026-01-31            # Date range end
&page=1                        # Page number (default: 1)
&limit=50                      # Items per page (default: 50)
```

**Example with filters**:
```
GET {{baseUrl}}/admin/tasks?status=COMPLETED&aiGenerated=true&page=1&limit=20
```

**Expected Response**:
```json
{
  "success": true,
  "count": 20,
  "total": 156,
  "page": 1,
  "totalPages": 8,
  "tasks": [
    {
      "id": "task_id",
      "title": "Complete project proposal",
      "description": "Write and submit the Q1 project proposal",
      "status": "COMPLETED",
      "priority": "HIGH",
      "category": "Work",
      "source": "AI_GENERATED",
      "aiGenerated": true,
      "dueDate": "2026-01-20T00:00:00.000Z",
      "dueTime": "14:00:00",
      "completedAt": "2026-01-19T13:45:00.000Z",
      "estimatedDuration": 120,
      "actualDuration": 105,
      "user": {
        "id": "user_id",
        "email": "user@example.com",
        "fullName": "John Doe",
        "subscriptionPlan": "PRO"
      },
      "goalId": "goal_id_here",
      "parentTask": null,
      "subtasks": [
        {
          "id": "subtask_id",
          "title": "Research competitors",
          "status": "COMPLETED"
        }
      ],
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### STEP 2: Get Specific User's Tasks

**Purpose**: View all tasks for a specific user (useful for support).

**Request**:
```
GET {{baseUrl}}/admin/users/:userId/tasks
```

**Query Parameters**:
```
?status=COMPLETED              # Optional: filter by status
&priority=HIGH                 # Optional: filter by priority
&limit=100                     # Optional: limit results (default: 100)
```

**Example**:
```
GET {{baseUrl}}/admin/users/clx8k5m0n0000l08jb2345678/tasks?limit=50
```

**Expected Response**:
```json
{
  "success": true,
  "user": {
    "id": "clx8k5m0n0000l08jb2345678",
    "email": "user@example.com",
    "fullName": "John Doe",
    "subscriptionPlan": "PRO",
    "userStatus": "ACTIVE"
  },
  "count": 45,
  "tasks": [
    {
      "id": "task_id",
      "title": "Morning workout",
      "status": "COMPLETED",
      "priority": "MEDIUM",
      "aiGenerated": true,
      "goalId": "goal_id_here",
      "subtasks": [],
      "createdAt": "2026-01-19T06:00:00.000Z"
    }
  ]
}
```

---

### STEP 3: Get Task Analytics Dashboard

**Purpose**: Comprehensive analytics for decision-making.

**Request**:
```
GET {{baseUrl}}/admin/tasks/analytics
```

**Query Parameters**:
```
?startDate=2026-01-01          # Optional: analytics start date
&endDate=2026-01-31            # Optional: analytics end date
```

**Example**:
```
GET {{baseUrl}}/admin/tasks/analytics?startDate=2026-01-01&endDate=2026-01-31
```

**Expected Response**:
```json
{
  "success": true,
  "analytics": {
    "summary": {
      "totalTasks": 3450,
      "completedTasks": 2145,
      "pendingTasks": 890,
      "tasksCreatedToday": 127,
      "overallCompletionRate": 62.17
    },
    "aiVsManual": {
      "aiGenerated": {
        "count": 2760,
        "percentage": 80.00,
        "completionRate": 68.50
      },
      "manual": {
        "count": 690,
        "percentage": 20.00,
        "completionRate": 45.20
      }
    },
    "breakdown": {
      "byStatus": {
        "TODO": 567,
        "IN_PROGRESS": 323,
        "COMPLETED": 2145,
        "SKIPPED": 285,
        "CANCELED": 130
      },
      "byPriority": {
        "LOW": 890,
        "MEDIUM": 1450,
        "HIGH": 890,
        "URGENT": 220
      },
      "bySource": {
        "AI_GENERATED": 2100,
        "MANUAL": 690,
        "FROM_GOAL": 450,
        "FROM_HABIT": 180,
        "FROM_PLAN": 30
      },
      "byCategory": {
        "Productivity": 780,
        "Health": 650,
        "Work": 890,
        "Learning": 450,
        "Finance": 230,
        "Relationships": 180
      }
    }
  }
}
```

**Use Cases**:
- Monitor system health
- Track AI performance vs manual tasks
- Identify popular categories
- Measure user engagement
- Make product decisions

---

### STEP 4: Get AI Performance Metrics

**Purpose**: Detailed AI task generation performance analysis.

**Request**:
```
GET {{baseUrl}}/admin/tasks/ai-performance
```

**Query Parameters**:
```
?days=30                       # Analysis period in days (default: 30)
```

**Example**:
```
GET {{baseUrl}}/admin/tasks/ai-performance?days=7
```

**Expected Response**:
```json
{
  "success": true,
  "period": "Last 7 days",
  "aiPerformance": {
    "totalAITasks": 1250,
    "completed": 856,
    "skipped": 234,
    "canceled": 67,
    "completionRate": 68.48,
    "skipRate": 18.72,
    "cancelRate": 5.36,
    "topCategories": [
      {
        "category": "Productivity",
        "count": 345
      },
      {
        "category": "Health",
        "count": 289
      },
      {
        "category": "Work",
        "count": 267
      }
    ],
    "dailyGeneration": [
      {
        "date": "2026-01-19",
        "count": 187
      },
      {
        "date": "2026-01-18",
        "count": 192
      },
      {
        "date": "2026-01-17",
        "count": 178
      }
    ]
  }
}
```

**Key Metrics**:
- **Completion Rate**: How many AI tasks are actually completed
- **Skip Rate**: How often users skip AI tasks (might indicate poor quality)
- **Cancel Rate**: Tasks users immediately delete (indicates bad suggestions)
- **Accuracy Score**: User feedback on AI task quality (1-10 scale)
- **Top Categories**: What AI generates most
- **Daily Generation**: AI usage trends

---

### STEP 5: Get System Health Metrics

**Purpose**: Overall system health for task management feature.

**Request**:
```
GET {{baseUrl}}/admin/tasks/system-health
```

**Expected Response**:
```json
{
  "success": true,
  "systemHealth": {
    "users": {
      "total": 1250,
      "withTasks": 987,
      "engagementRate": 78.96
    },
    "tasks": {
      "averagePerUser": 12.45,
      "createdLast24h": 234,
      "completedLast24h": 189
    },
    "ai": {
      "generationSuccessRate": 92.50
    }
  }
}
```

**Interpretation**:
- **Engagement Rate**: % of users actively using task system
- **Average Per User**: Task adoption metric
- **Created vs Completed**: User productivity metric
- **AI Success Rate**: % of AI tasks that aren't immediately canceled

**Health Status Guidelines**:
- ✅ **Healthy**: Engagement > 70%, AI Success > 85%
- ⚠️ **Warning**: Engagement 50-70%, AI Success 70-85%
- 🚨 **Critical**: Engagement < 50%, AI Success < 70%

---

### STEP 6: Manually Edit a User's Task

**Purpose**: Support cases where admin needs to fix or update a task.

**Request**:
```
PATCH {{baseUrl}}/admin/tasks/:taskId
```

**Body** (send only fields you want to update):
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "status": "COMPLETED",
  "priority": "HIGH",
  "dueDate": "2026-01-25",
  "dueTime": "14:00:00",
  "notes": "Admin updated this task per user request"
}
```

**Example**:
```
PATCH {{baseUrl}}/admin/tasks/clx8k5m0n0000l08jb2345678

Body:
{
  "status": "COMPLETED",
  "notes": "Marked complete by admin support"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Task updated successfully by admin",
  "task": {
    "id": "clx8k5m0n0000l08jb2345678",
    "title": "Updated task title",
    "status": "COMPLETED",
    "priority": "HIGH",
    "notes": "Admin updated this task per user request",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "fullName": "John Doe"
    },
    "updatedAt": "2026-01-19T10:30:00.000Z"
  }
}
```

**Use Cases**:
- Fix corrupted task data
- Complete stuck tasks
- Update task details for support
- Reset task status
- Add admin notes

---

### STEP 7: Delete a User's Task

**Purpose**: Remove problematic or test tasks.

**Request**:
```
DELETE {{baseUrl}}/admin/tasks/:taskId
```

**Example**:
```
DELETE {{baseUrl}}/admin/tasks/clx8k5m0n0000l08jb2345678
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Task and all subtasks deleted successfully by admin"
}
```

**Important Notes**:
- ⚠️ This deletes the task AND all its subtasks
- ⚠️ This action cannot be undone
- Use only for: test data cleanup, spam tasks, corrupted data
- Consider updating status to CANCELED instead of deleting (preserves history)

---

### STEP 8: Export Tasks to CSV

**Purpose**: Download task data for analysis in Excel/Sheets.

**Request**:
```
GET {{baseUrl}}/admin/tasks/export
```

**Query Parameters**:
```
?userId=USER_ID                # Optional: export specific user's tasks
&status=COMPLETED              # Optional: filter by status
&startDate=2026-01-01          # Optional: date range start
&endDate=2026-01-31            # Optional: date range end
```

**Example**:
```
GET {{baseUrl}}/admin/tasks/export?startDate=2026-01-01&endDate=2026-01-31
```

**Expected Response**:
- CSV file download with headers:
```csv
ID,User Email,User Name,Title,Description,Status,Priority,Category,Source,AI Generated,Due Date,Completed At,Created At
clx8k5...,user@example.com,John Doe,"Morning workout","30 min cardio",COMPLETED,MEDIUM,Health,AI_GENERATED,true,2026-01-19,2026-01-19T07:30:00Z,2026-01-19T06:00:00Z
```

**Use Cases**:
- Monthly reports
- Data analysis in Excel
- Backup task data
- User productivity reports
- Feature usage analysis

---

## Common Admin Workflows

### Workflow 1: Investigate User Complaint

**Scenario**: User says "AI tasks are not relevant"

**Steps**:
1. Get user's tasks:
```
GET {{baseUrl}}/admin/users/:userId/tasks?aiGenerated=true&limit=50
```

2. Check AI performance for this user's tasks:
```
GET {{baseUrl}}/admin/tasks/ai-performance?days=30
```

3. Review user's goals (might be in goalController):
```
GET {{baseUrl}}/admin/users/:userId
```

4. If needed, manually fix problematic tasks:
```
PATCH {{baseUrl}}/admin/tasks/:taskId
```

---

### Workflow 2: Monitor System Health

**Daily Check**:
```
1. GET {{baseUrl}}/admin/tasks/system-health
   → Check engagement rate and AI success rate

2. GET {{baseUrl}}/admin/tasks/analytics
   → Review completion rates and task distribution

3. GET {{baseUrl}}/admin/tasks/ai-performance?days=1
   → Check yesterday's AI performance
```

**Weekly Report**:
```
1. GET {{baseUrl}}/admin/tasks/analytics?startDate=WEEK_START&endDate=WEEK_END
2. GET {{baseUrl}}/admin/tasks/ai-performance?days=7
3. GET {{baseUrl}}/admin/tasks/export?startDate=WEEK_START&endDate=WEEK_END
   → Export for detailed analysis
```

---

### Workflow 3: Feature Usage Analysis

**Goal**: Understand which task features users love

**Steps**:
```
1. GET {{baseUrl}}/admin/tasks/analytics
   → Check breakdown.bySource to see feature adoption

2. GET {{baseUrl}}/admin/tasks/ai-performance?days=30
   → Check AI completion vs skip rates

3. Compare metrics:
   - High completion rate = users love it
   - High skip rate = needs improvement
   - High cancel rate = poor quality
```

---

### Workflow 4: User Support Case

**Scenario**: User needs help with tasks

**Steps**:
```
1. View user's task history:
   GET {{baseUrl}}/admin/users/:userId/tasks

2. Check for patterns:
   - Too many overdue tasks?
   - High skip rate?
   - Not using AI features?

3. Take action:
   - Update problematic tasks: PATCH {{baseUrl}}/admin/tasks/:taskId
   - Or provide guidance based on analytics
```

---

## Error Handling

### Common Errors:

**1. 401 Unauthorized**
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```
**Solution**: Ensure you're logged in as ADMIN or SUPER_ADMIN

**2. 404 Not Found**
```json
{
  "success": false,
  "message": "Task not found"
}
```
**Solution**: Verify the task ID exists

**3. 500 Server Error**
```json
{
  "success": false,
  "message": "Failed to fetch tasks",
  "error": "Detailed error message"
}
```
**Solution**: Check server logs for detailed error

---

## Security Notes

🔒 **All admin task routes require**:
- Valid JWT token
- Role: ADMIN or SUPER_ADMIN
- Routes are protected by `protect` and `authorize` middleware

🔒 **Rate Limiting**:
- Consider adding rate limiting for export endpoint (prevent abuse)
- Monitor for suspicious activity (mass deletions, etc.)

🔒 **Audit Logging**:
- Log all admin task modifications
- Track who edited/deleted what
- Keep audit trail for compliance

---

## Testing Checklist

Use this checklist to verify all endpoints work:

- [ ] **GET** `/admin/tasks` - View all tasks with filters
- [ ] **GET** `/admin/tasks` - Test pagination (page 1, 2, 3)
- [ ] **GET** `/admin/tasks?aiGenerated=true` - Filter AI tasks only
- [ ] **GET** `/admin/tasks?status=COMPLETED` - Filter by status
- [ ] **GET** `/admin/tasks?search=workout` - Search functionality
- [ ] **GET** `/admin/users/:userId/tasks` - Specific user's tasks
- [ ] **GET** `/admin/tasks/analytics` - Analytics dashboard
- [ ] **GET** `/admin/tasks/analytics?startDate=X&endDate=Y` - Date range analytics
- [ ] **GET** `/admin/tasks/ai-performance` - AI metrics (30 days)
- [ ] **GET** `/admin/tasks/ai-performance?days=7` - AI metrics (7 days)
- [ ] **GET** `/admin/tasks/system-health` - System health check
- [ ] **PATCH** `/admin/tasks/:taskId` - Update task
- [ ] **DELETE** `/admin/tasks/:taskId` - Delete task
- [ ] **GET** `/admin/tasks/export` - Export all tasks
- [ ] **GET** `/admin/tasks/export?userId=X` - Export user's tasks
- [ ] **GET** `/admin/tasks/export?startDate=X&endDate=Y` - Export date range

---

## Quick Reference

### All Admin Task Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/tasks` | Get all tasks (paginated, filtered) |
| GET | `/admin/users/:userId/tasks` | Get specific user's tasks |
| GET | `/admin/tasks/analytics` | Task analytics dashboard |
| GET | `/admin/tasks/ai-performance` | AI performance metrics |
| GET | `/admin/tasks/system-health` | System health metrics |
| GET | `/admin/tasks/export` | Export tasks to CSV |
| PATCH | `/admin/tasks/:taskId` | Update a task |
| DELETE | `/admin/tasks/:taskId` | Delete a task |

---

## Next Steps

After implementing admin task management:

1. **Build Admin Dashboard UI** - Create React components to display these analytics
2. **Add Real-time Monitoring** - Use WebSockets to show live task metrics
3. **Create Alert System** - Notify admins when metrics go below thresholds
4. **Implement Audit Logs** - Track all admin actions on tasks
5. **Add Bulk Operations** - Allow admins to bulk update/delete tasks
6. **Create Reports** - Automated weekly/monthly reports via email

---

**Need Help?** 
- Check server logs at `logs/` directory
- Verify middleware in `src/middleware/auth.js`
- Test with Postman collection (import this guide)
- Ensure admin user role is set correctly in database
