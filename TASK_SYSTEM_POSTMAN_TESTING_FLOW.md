# Task System - Postman Testing Flow

## Complete Step-by-Step Testing Guide

Follow this exact order to test all Task System features in Postman.

---

## Prerequisites Setup

### Base URL
```
http://localhost:3000/api/v1
```

### Environment Variables in Postman
Create these variables:
- `baseUrl` = `http://localhost:3000/api/v1`
- `token` = (will be set after login)
- `taskId` = (will be set after creating a task)
- `goalId` = (will be set after creating a goal)

---

## STEP 1: Authentication 🔐

### 1.1 Register User (if needed)
```
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "Password123!",
  "fullName": "Test User"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "testuser@example.com"
  }
}
```

**Action:** Copy the `token` and save it to Postman environment variable `token`

---

### 1.2 Login User (if already registered)
```
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "Password123!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "testuser@example.com"
  }
}
```

**Action:** Copy the `token` and save it to Postman environment variable `token`

---

## STEP 2: Create Goals (Prerequisites for AI) 🎯

### 2.1 Create Fitness Goal
```
POST {{baseUrl}}/goals
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "Get fit and healthy",
  "description": "Lose 10 pounds and build muscle",
  "category": "FITNESS",
  "priority": 8,
  "targetDate": "2026-04-18",
  "isMainFocus": true
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Goal created successfully",
  "goal": {
    "id": "goal-uuid-1",
    "title": "Get fit and healthy",
    "category": "FITNESS",
    "status": "ACTIVE"
  }
}
```

**Action:** Save `goal.id` to environment variable `goalId`

---

### 2.2 Create Career Goal
```
POST {{baseUrl}}/goals
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "Advance my career",
  "description": "Learn new skills and get promoted",
  "category": "CAREER",
  "priority": 9,
  "targetDate": "2026-12-31",
  "isMainFocus": true
}
```

---

### 2.3 Create Health Goal
```
POST {{baseUrl}}/goals
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "Improve mental health",
  "description": "Reduce stress and practice mindfulness",
  "category": "HEALTH",
  "priority": 7,
  "targetDate": "2026-06-30"
}
```

---

## STEP 3: AI Task Generation 🤖

### 3.1 Generate Tasks from Goals
```
POST {{baseUrl}}/tasks/ai/generate-from-goals
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Generated 12 tasks from your goals",
  "tasks": [
    {
      "title": "30-minute morning jog",
      "description": "Build cardiovascular endurance",
      "priority": "HIGH",
      "category": "FITNESS",
      "estimatedMinutes": 30,
      "aiRecommendation": "Morning exercise boosts energy for the entire day",
      "difficultyLevel": 6
    },
    {
      "title": "Meal prep healthy lunches",
      "description": "Prepare nutritious meals for the week",
      "priority": "MEDIUM",
      "category": "HEALTH",
      "estimatedMinutes": 90
    }
  ],
  "tokensUsed": 1234
}
```

**What This Does:**
- Analyzes all your active goals
- Generates 5-15 actionable tasks per goal
- Each task includes AI recommendations
- Tasks are automatically created in database

---

### 3.2 Generate Daily Tasks (Alternative Method)
```
POST {{baseUrl}}/tasks/ai/generate-daily
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Generated 8 tasks for today",
  "tasks": [
    {
      "title": "Morning workout session",
      "priority": "HIGH",
      "scheduledTime": "07:00",
      "estimatedMinutes": 45
    }
  ],
  "tokensUsed": 856
}
```

**What This Does:**
- Creates optimized task list for TODAY
- Based on goals + habits + schedule
- Considers your wake time and work hours
- All tasks scheduled for today

---

## STEP 4: View Generated Tasks 📋

### 4.1 Get All Tasks
```
GET {{baseUrl}}/tasks
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "count": 12,
  "tasks": [
    {
      "id": "task-uuid-1",
      "title": "30-minute morning jog",
      "status": "TODO",
      "priority": "HIGH",
      "category": "FITNESS",
      "aiGenerated": true,
      "source": "AI_GENERATED",
      "dueDate": "2026-01-20T00:00:00.000Z",
      "estimatedMinutes": 30,
      "subtasks": []
    }
  ]
}
```

**Action:** Copy one task's `id` and save to `taskId` variable

---

### 4.2 Get Today's Tasks
```
GET {{baseUrl}}/tasks/special/today
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "count": 5,
  "tasks": [
    // Only tasks scheduled for today
  ]
}
```

---

### 4.3 Filter Tasks by Status
```
GET {{baseUrl}}/tasks?status=TODO&priority=HIGH
Authorization: Bearer {{token}}
```

**Available Filters:**
- `status` = TODO, IN_PROGRESS, COMPLETED, CANCELED, SKIPPED
- `priority` = LOW, MEDIUM, HIGH, URGENT
- `category` = HEALTH, FITNESS, CAREER, etc.
- `today` = true
- `startDate` = 2026-01-01
- `endDate` = 2026-01-31

---

## STEP 5: Manual Task Creation ✍️

### 5.1 Create Simple Task
```
POST {{baseUrl}}/tasks
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "Buy groceries",
  "priority": "MEDIUM",
  "dueDate": "2026-01-19",
  "estimatedMinutes": 45,
  "tags": ["errands", "shopping"]
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Task created successfully",
  "task": {
    "id": "task-uuid-new",
    "title": "Buy groceries",
    "status": "TODO",
    "aiGenerated": false,
    "source": "MANUAL"
  }
}
```

---

### 5.2 Create Detailed Task
```
POST {{baseUrl}}/tasks
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "Complete project documentation",
  "description": "Write comprehensive API documentation for client",
  "priority": "HIGH",
  "category": "CAREER",
  "dueDate": "2026-01-25T17:00:00Z",
  "dueTime": "17:00",
  "estimatedMinutes": 120,
  "tags": ["work", "documentation", "deadline"],
  "energyLevelRequired": "high",
  "notes": "Need to include code examples and diagrams",
  "goalId": "{{goalId}}"
}
```

---

### 5.3 Create Task Linked to Goal
```
POST {{baseUrl}}/tasks
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "Research competitors",
  "description": "Analyze top 5 competitors in our space",
  "priority": "HIGH",
  "category": "CAREER",
  "estimatedMinutes": 60,
  "goalId": "{{goalId}}"
}
```

---

## STEP 6: Task Operations 🔄

### 6.1 Get Specific Task
```
GET {{baseUrl}}/tasks/{{taskId}}
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "task": {
    "id": "task-uuid",
    "title": "30-minute morning jog",
    "description": "Build cardiovascular endurance",
    "status": "TODO",
    "priority": "HIGH",
    "subtasks": [],
    "parentTask": null,
    "user": {
      "id": "user-uuid",
      "fullName": "Test User",
      "email": "testuser@example.com"
    }
  }
}
```

---

### 6.2 Update Task
```
PATCH {{baseUrl}}/tasks/{{taskId}}
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "notes": "Started working on this task"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "task": {
    "id": "task-uuid",
    "status": "IN_PROGRESS",
    "startedAt": "2026-01-18T10:30:00.000Z"
  }
}
```

---

### 6.3 Mark Task as Complete
```
POST {{baseUrl}}/tasks/{{taskId}}/complete
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "actualMinutes": 35
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Task marked as complete",
  "task": {
    "id": "task-uuid",
    "status": "COMPLETED",
    "completedAt": "2026-01-18T11:05:00.000Z",
    "actualMinutes": 35,
    "estimatedMinutes": 30,
    "completionCount": 1
  }
}
```

**What Happens:**
- Status changed to COMPLETED
- completedAt timestamp set
- actualMinutes recorded
- Streak updated (if recurring)
- Related plan completion rate updated
- Activity logged
- Celebration notification sent

---

### 6.4 Skip Task with Reason
```
POST {{baseUrl}}/tasks/{{taskId}}/skip
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "reason": "Not enough time today, unexpected meeting came up"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Task skipped",
  "task": {
    "id": "task-uuid",
    "status": "SKIPPED",
    "skipCount": 1,
    "skipReasons": ["Not enough time today, unexpected meeting came up"]
  }
}
```

**What This Does:**
- Tracks skip patterns for AI learning
- AI will use this to improve future recommendations
- Doesn't count against your streak

---

## STEP 7: AI-Powered Features 🧠

### 7.1 Breakdown Complex Task
```
POST {{baseUrl}}/tasks/{{taskId}}/breakdown
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Created 5 subtasks",
  "subtasks": [
    {
      "title": "Research project requirements",
      "estimatedMinutes": 20,
      "order": 1
    },
    {
      "title": "Create documentation outline",
      "estimatedMinutes": 15,
      "order": 2
    },
    {
      "title": "Write API endpoint descriptions",
      "estimatedMinutes": 45,
      "order": 3
    },
    {
      "title": "Add code examples",
      "estimatedMinutes": 30,
      "order": 4
    },
    {
      "title": "Review and polish",
      "estimatedMinutes": 10,
      "order": 5
    }
  ],
  "tokensUsed": 456
}
```

**What This Does:**
- AI analyzes the task
- Breaks it into 3-7 sequential subtasks
- Each subtask is a separate task with parentTaskId
- All subtasks are automatically created

---

### 7.2 Magic Sync (Rebalance All Tasks) 🪄
```
POST {{baseUrl}}/tasks/ai/magic-sync
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "userInput": "I'm feeling low energy today, need to reschedule"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tasks successfully synced and rebalanced",
  "tasksUpdated": 15,
  "prioritization": {
    "urgent": 2,
    "high": 5,
    "medium": 6,
    "low": 2
  }
}
```

**What This Does:**
- Fetches all pending tasks (TODO, IN_PROGRESS)
- Categorizes by urgency and priority
- Considers your current context/energy level
- Reschedules everything intelligently
- Updates scheduledDate for all tasks
- Marks as AI-adjusted

**When to Use:**
- Feeling overwhelmed
- Schedule changed
- Need to reorganize
- Low energy day
- Unexpected events

---

## STEP 8: Bulk Operations 📦

### 8.1 Bulk Create Tasks
```
POST {{baseUrl}}/tasks/bulk/create
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "tasks": [
    {
      "title": "Morning meditation",
      "priority": "HIGH",
      "estimatedMinutes": 15,
      "dueTime": "07:00"
    },
    {
      "title": "Check emails",
      "priority": "MEDIUM",
      "estimatedMinutes": 20,
      "dueTime": "09:00"
    },
    {
      "title": "Team standup",
      "priority": "HIGH",
      "estimatedMinutes": 15,
      "dueTime": "10:00"
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "3 tasks created successfully",
  "count": 3
}
```

---

### 8.2 Bulk Update Tasks
```
PATCH {{baseUrl}}/tasks/bulk/update
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "taskIds": ["task-id-1", "task-id-2", "task-id-3"],
  "updates": {
    "status": "COMPLETED"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "3 tasks updated successfully",
  "count": 3
}
```

---

### 8.3 Bulk Delete Tasks
```
DELETE {{baseUrl}}/tasks/bulk/delete
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "taskIds": ["task-id-1", "task-id-2"]
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "2 tasks deleted successfully"
}
```

---

## STEP 9: Analytics & Statistics 📊

### 9.1 Get Task Statistics
```
GET {{baseUrl}}/tasks/analytics/stats
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "total": 150,
    "completed": 120,
    "pending": 25,
    "overdue": 3,
    "inProgress": 2,
    "completionRate": 80.0,
    "aiGenerated": 90,
    "manual": 60
  }
}
```

---

### 9.2 Get Statistics with Date Range
```
GET {{baseUrl}}/tasks/analytics/stats?startDate=2026-01-01&endDate=2026-01-18
Authorization: Bearer {{token}}
```

---

### 9.3 Get Productivity Analytics
```
GET {{baseUrl}}/tasks/analytics/productivity?days=30
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "analytics": {
    "totalCompleted": 85,
    "dailyCompletion": {
      "2026-01-01": 3,
      "2026-01-02": 5,
      "2026-01-03": 4,
      "2026-01-18": 7
    },
    "avgCompletionTime": 42,
    "mostProductiveHour": "10:00",
    "currentStreak": 12
  }
}
```

**What This Shows:**
- Daily completion count
- Average time per task
- Your most productive hour
- Current completion streak

---

### 9.4 Detect Patterns (AI Analysis)
```
GET {{baseUrl}}/tasks/analytics/patterns
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "patterns": [
    {
      "type": "SKIP_PATTERN",
      "description": "You frequently skip FITNESS tasks",
      "suggestion": "Consider breaking down FITNESS tasks into smaller steps"
    },
    {
      "type": "PRODUCTIVITY_PEAK",
      "description": "Your peak productivity is around 10:00",
      "suggestion": "Schedule high-priority tasks during this time"
    },
    {
      "type": "ESTIMATION_ERROR",
      "description": "You tend to underestimate task duration by 25%",
      "suggestion": "Add buffer time to your estimates"
    }
  ],
  "totalAnalyzed": 85
}
```

**What AI Detects:**
- Which categories you skip most
- Your best productivity hours
- Time estimation accuracy
- Energy level patterns
- Category preferences

---

### 9.5 Get Overdue Tasks
```
GET {{baseUrl}}/tasks/special/overdue
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "count": 3,
  "tasks": [
    {
      "id": "task-uuid",
      "title": "Submit report",
      "dueDate": "2026-01-15T17:00:00.000Z",
      "priority": "HIGH",
      "status": "TODO"
    }
  ]
}
```

---

## STEP 10: Advanced Filtering 🔍

### 10.1 Filter by Multiple Criteria
```
GET {{baseUrl}}/tasks?status=TODO&priority=HIGH&category=FITNESS&tags=morning,exercise
Authorization: Bearer {{token}}
```

### 10.2 Filter by Date Range
```
GET {{baseUrl}}/tasks?startDate=2026-01-18&endDate=2026-01-25
Authorization: Bearer {{token}}
```

### 10.3 Filter by Source
```
GET {{baseUrl}}/tasks?source=AI_GENERATED
Authorization: Bearer {{token}}
```

### 10.4 Filter by Goal
```
GET {{baseUrl}}/tasks?goalId={{goalId}}
Authorization: Bearer {{token}}
```

---

## STEP 11: Delete Operations 🗑️

### 11.1 Delete Single Task
```
DELETE {{baseUrl}}/tasks/{{taskId}}
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

## Complete Testing Workflow Summary

### Recommended Order:

1. ✅ **Authenticate** - Login/Register
2. ✅ **Create Goals** - 3-5 goals in different categories
3. ✅ **Generate AI Tasks** - Use `generate-from-goals`
4. ✅ **View Tasks** - Get all tasks, today's tasks
5. ✅ **Complete Tasks** - Mark 2-3 as complete
6. ✅ **Skip Tasks** - Skip 1 task with reason
7. ✅ **Create Manual Task** - Add 1-2 manual tasks
8. ✅ **Breakdown Task** - Break down a complex task
9. ✅ **Magic Sync** - Test the rebalancing feature
10. ✅ **View Analytics** - Check stats and patterns
11. ✅ **Bulk Operations** - Test bulk create/update

---

## Expected Results After Full Test

After completing all steps, you should have:

- ✅ 15-20 tasks in database
- ✅ Mix of AI-generated and manual tasks
- ✅ Some completed, some pending
- ✅ Skip patterns tracked
- ✅ Analytics showing completion rates
- ✅ Pattern detection working
- ✅ Subtasks created from breakdown

---

## Common Issues & Solutions

### Issue 1: 401 Unauthorized
**Solution:** Make sure Bearer token is included in Authorization header

### Issue 2: No tasks generated from goals
**Solution:** Ensure you have active goals created first

### Issue 3: Magic Sync returns 0 tasks
**Solution:** You need pending (TODO or IN_PROGRESS) tasks

### Issue 4: AI features not working
**Solution:** Check OPENAI_API_KEY in .env file

### Issue 5: Empty analytics
**Solution:** Need to complete some tasks first

---

## Postman Collection Setup

### Create Collection with:

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Pre-request Script (for all requests):**
```javascript
// Auto-refresh token if expired
if (pm.environment.get("token") === null) {
    console.log("No token found, please login first");
}
```

**Tests (for successful responses):**
```javascript
// Auto-save taskId from responses
if (pm.response.code === 200 || pm.response.code === 201) {
    const jsonData = pm.response.json();
    
    // Save task ID
    if (jsonData.task && jsonData.task.id) {
        pm.environment.set("taskId", jsonData.task.id);
    }
    
    // Save goal ID
    if (jsonData.goal && jsonData.goal.id) {
        pm.environment.set("goalId", jsonData.goal.id);
    }
    
    // Save token
    if (jsonData.token) {
        pm.environment.set("token", jsonData.token);
    }
}
```

---

## Quick Test Script (Run in Order)

```
1. Login
2. Create 3 Goals
3. Generate Tasks from Goals
4. Get All Tasks
5. Complete 2 Tasks
6. Skip 1 Task
7. Create Manual Task
8. Magic Sync
9. Get Analytics
10. Detect Patterns
```

**Total Time:** ~10 minutes

---

## Success Criteria ✅

Your Task System is working correctly if:

- ✅ AI generates 5-15 tasks from goals
- ✅ Tasks can be created, updated, deleted
- ✅ Completion tracking works
- ✅ Skip tracking records reasons
- ✅ Magic Sync rebalances tasks
- ✅ Analytics show accurate data
- ✅ Pattern detection identifies issues
- ✅ Bulk operations work
- ✅ Filtering returns correct results

---

## Next Steps After Testing

1. ✅ Verify all features work
2. ✅ Check database records in Prisma Studio
3. ✅ Review analytics data
4. ✅ Test notification system (check database)
5. ✅ Build frontend UI
6. ✅ Set up cron jobs for notifications

---

**Happy Testing! 🚀**

If any endpoint fails, check:
1. Server is running (`npm run dev`)
2. Database is connected
3. OpenAI API key is valid
4. Token is not expired
5. Request body matches schema

For detailed documentation, see: `TASK_SYSTEM_COMPLETE_GUIDE.md`
