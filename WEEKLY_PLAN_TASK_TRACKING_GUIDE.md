# Weekly Plan with Daily Task Tracking - Complete Guide

## 📋 Overview

This feature allows users to:
- Generate AI-powered weekly plans with organized daily routines
- Automatically extract and track daily tasks from AI-generated plans
- View completion rates for each day (Monday - Sunday)
- Mark individual tasks as complete
- Add custom tasks to specific days
- Track overall weekly progress

## 🏗️ Architecture

### Database Structure

**Weekly Plan Storage:**
- `WeeklyPlan` table - Stores AI-generated weekly plans
- `Plan` table - Stores manual weekly plans (with `planType: WEEKLY`)

**Task Tracking:**
- `Task` table - Stores all tasks (both AI-generated and manual)
- Links to weekly plan via `weeklyPlanId` field
- Each task has `scheduledDate` for specific day (Monday, Tuesday, etc.)

### Key Fields in Task Model
```javascript
{
  weeklyPlanId: "uuid",           // Links to WeeklyPlan
  scheduledDate: "2026-03-10",    // Which day (Monday, Tuesday, etc.)
  status: "TODO",                 // TODO, IN_PROGRESS, COMPLETED
  aiGenerated: true,              // From AI or manual
  source: "FROM_PLAN",            // Task origin
  title: "Complete project",      // Task description
  priority: "MEDIUM",             // LOW, MEDIUM, HIGH, URGENT
  completedAt: null               // Timestamp when completed
}
```

---

## 🚀 API Endpoints

### 1. Generate AI Weekly Plan (with Auto Task Creation)
**Endpoint:** `POST /api/v1/ai/generate/weekly`

**What it does:**
- Generates a comprehensive 7-day plan using AI
- Automatically extracts daily tasks from the generated content
- Creates Task records for each day's priorities
- Links all tasks to the weekly plan

**Request:**
```http
POST {{baseUrl}}/api/v1/ai/generate/weekly
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "userInput": "Help me plan a productive week. I want to launch my side project, exercise 4 times, and maintain work-life balance.",
  "weekStartDate": "2026-03-10"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-uuid",
    "plan": "## 📋 Weekly Overview\n**Week Theme:** Launch & Balance\n\n## Monday - March 10\n**Monday's Top 3 Priorities:**\n1. Complete side project planning\n2. Morning workout session\n3. Client meeting preparation...",
    "weeklyPlan": {
      "id": "weekly-plan-uuid",
      "userId": "user-uuid",
      "weekStartDate": "2026-03-10T00:00:00.000Z",
      "weekEndDate": "2026-03-16T23:59:59.999Z",
      "title": "Weekly Plan - Week of 3/10/2026",
      "content": "## 📋 Weekly Overview...",
      "aiGenerated": true,
      "status": "ACTIVE",
      "completionRate": 0,
      "createdAt": "2026-03-05T10:30:00.000Z"
    },
    "tasks": [
      {
        "id": "task-1-uuid",
        "title": "Complete side project planning",
        "scheduledDate": "2026-03-10T00:00:00.000Z",
        "status": "TODO",
        "priority": "MEDIUM",
        "weeklyPlanId": "weekly-plan-uuid"
      },
      {
        "id": "task-2-uuid",
        "title": "Morning workout session",
        "scheduledDate": "2026-03-10T00:00:00.000Z",
        "status": "TODO",
        "priority": "MEDIUM",
        "weeklyPlanId": "weekly-plan-uuid"
      }
      // ... more tasks for each day
    ],
    "tasksCreated": 21,
    "model": "gpt-3.5-turbo",
    "usage": { "total_tokens": 1638 }
  }
}
```

---

### 2. Get All Weekly Plans (Unified View)
**Endpoint:** `GET /api/v1/weekly-plans/all`

**What it does:**
- Returns both AI-generated and manual weekly plans
- Shows which plans are AI vs manual created
- Sorted by start date

**Request:**
```http
GET {{baseUrl}}/api/v1/weekly-plans/all
Authorization: Bearer {{token}}

# Optional Query Parameters:
# ?status=ACTIVE
# ?sortBy=desc
# ?limit=50
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "aiGenerated": 3,
  "manual": 2,
  "data": [
    {
      "id": "weekly-plan-1",
      "title": "Weekly Plan - Week of 3/10/2026",
      "content": "## 📋 Weekly Overview...",
      "startDate": "2026-03-10T00:00:00.000Z",
      "endDate": "2026-03-16T23:59:59.999Z",
      "status": "ACTIVE",
      "source": "AI_GENERATED",
      "aiGenerated": true,
      "completionRate": 45,
      "createdAt": "2026-03-05T10:30:00.000Z"
    },
    {
      "id": "weekly-plan-2",
      "title": "My Custom Weekly Goals",
      "description": "Focus on health and fitness",
      "startDate": "2026-03-03T00:00:00.000Z",
      "endDate": "2026-03-09T23:59:59.999Z",
      "status": "COMPLETED",
      "source": "MANUAL",
      "isManuallyCreated": true,
      "category": "HEALTH",
      "priority": "HIGH"
    }
  ]
}
```

---

### 3. Get Daily Summary for Weekly Plan
**Endpoint:** `GET /api/v1/weekly-plans/:id/daily-summary`

**What it does:**
- Returns tasks grouped by day of the week
- Shows completion rate for each day
- Displays overall weekly progress

**Request:**
```http
GET {{baseUrl}}/api/v1/weekly-plans/{{weeklyPlanId}}/daily-summary
Authorization: Bearer {{token}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "weeklyPlanId": "weekly-plan-uuid",
    "weekStartDate": "2026-03-10T00:00:00.000Z",
    "weekEndDate": "2026-03-16T23:59:59.999Z",
    "overallCompletionRate": 45,
    "dailySummary": [
      {
        "day": "Monday",
        "date": "2026-03-10T00:00:00.000Z",
        "tasksTotal": 3,
        "tasksCompleted": 2,
        "completionRate": 67,
        "tasks": [
          {
            "id": "task-1-uuid",
            "title": "Complete side project planning",
            "status": "COMPLETED",
            "priority": "MEDIUM",
            "completedAt": "2026-03-10T14:30:00.000Z"
          },
          {
            "id": "task-2-uuid",
            "title": "Morning workout session",
            "status": "COMPLETED",
            "priority": "MEDIUM",
            "completedAt": "2026-03-10T07:30:00.000Z"
          },
          {
            "id": "task-3-uuid",
            "title": "Client meeting preparation",
            "status": "TODO",
            "priority": "MEDIUM",
            "completedAt": null
          }
        ]
      },
      {
        "day": "Tuesday",
        "date": "2026-03-11T00:00:00.000Z",
        "tasksTotal": 3,
        "tasksCompleted": 1,
        "completionRate": 33,
        "tasks": [
          {
            "id": "task-4-uuid",
            "title": "Side project development sprint",
            "status": "COMPLETED",
            "priority": "HIGH",
            "completedAt": "2026-03-11T16:00:00.000Z"
          },
          {
            "id": "task-5-uuid",
            "title": "HIIT workout",
            "status": "TODO",
            "priority": "MEDIUM",
            "completedAt": null
          },
          {
            "id": "task-6-uuid",
            "title": "Review weekly goals",
            "status": "TODO",
            "priority": "MEDIUM",
            "completedAt": null
          }
        ]
      },
      {
        "day": "Wednesday",
        "date": "2026-03-12T00:00:00.000Z",
        "tasksTotal": 3,
        "tasksCompleted": 0,
        "completionRate": 0,
        "tasks": []
      },
      {
        "day": "Thursday",
        "date": "2026-03-13T00:00:00.000Z",
        "tasksTotal": 0,
        "tasksCompleted": 0,
        "completionRate": 0,
        "tasks": []
      },
      {
        "day": "Friday",
        "date": "2026-03-14T00:00:00.000Z",
        "tasksTotal": 0,
        "tasksCompleted": 0,
        "completionRate": 0,
        "tasks": []
      },
      {
        "day": "Saturday",
        "date": "2026-03-15T00:00:00.000Z",
        "tasksTotal": 0,
        "tasksCompleted": 0,
        "completionRate": 0,
        "tasks": []
      },
      {
        "day": "Sunday",
        "date": "2026-03-16T00:00:00.000Z",
        "tasksTotal": 0,
        "tasksCompleted": 0,
        "completionRate": 0,
        "tasks": []
      }
    ]
  }
}
```

---

### 4. Get Tasks for a Specific Day
**Endpoint:** `GET /api/v1/weekly-plans/:id/tasks/:date`

**What it does:**
- Returns all tasks for a specific day
- Useful for displaying daily view

**Request:**
```http
GET {{baseUrl}}/api/v1/weekly-plans/{{weeklyPlanId}}/tasks/2026-03-10
Authorization: Bearer {{token}}
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "task-1-uuid",
      "userId": "user-uuid",
      "weeklyPlanId": "weekly-plan-uuid",
      "title": "Complete side project planning",
      "description": null,
      "status": "COMPLETED",
      "priority": "MEDIUM",
      "scheduledDate": "2026-03-10T00:00:00.000Z",
      "aiGenerated": true,
      "source": "FROM_PLAN",
      "category": "PRODUCTIVITY",
      "completedAt": "2026-03-10T14:30:00.000Z",
      "createdAt": "2026-03-05T10:30:15.000Z"
    },
    {
      "id": "task-2-uuid",
      "title": "Morning workout session",
      "status": "COMPLETED",
      "priority": "MEDIUM",
      "completedAt": "2026-03-10T07:30:00.000Z"
    },
    {
      "id": "task-3-uuid",
      "title": "Client meeting preparation",
      "status": "TODO",
      "priority": "MEDIUM",
      "completedAt": null
    }
  ]
}
```

---

### 5. Mark Task as Complete
**Endpoint:** `PUT /api/v1/weekly-plans/:id/tasks/:taskId/complete`

**What it does:**
- Marks a task as completed
- Sets completion timestamp
- Automatically updates weekly plan completion rate

**Request:**
```http
PUT {{baseUrl}}/api/v1/weekly-plans/{{weeklyPlanId}}/tasks/{{taskId}}/complete
Authorization: Bearer {{token}}
```

**Response:**
```json
{
  "success": true,
  "message": "Task marked as complete",
  "data": {
    "id": "task-3-uuid",
    "title": "Client meeting preparation",
    "status": "COMPLETED",
    "completedAt": "2026-03-10T18:45:00.000Z",
    "weeklyPlanId": "weekly-plan-uuid",
    "scheduledDate": "2026-03-10T00:00:00.000Z",
    "priority": "MEDIUM"
  }
}
```

---

### 6. Add Custom Task to a Specific Day
**Endpoint:** `POST /api/v1/weekly-plans/:id/tasks`

**What it does:**
- Adds a manual task to a specific day of the weekly plan
- User can add tasks that weren't in the AI-generated plan

**Request:**
```http
POST {{baseUrl}}/api/v1/weekly-plans/{{weeklyPlanId}}/tasks
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**
```json
{
  "date": "2026-03-12",
  "title": "Doctor appointment",
  "description": "Annual checkup at 2 PM",
  "priority": "HIGH",
  "category": "HEALTH",
  "estimatedMinutes": 60
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task added successfully",
  "data": {
    "id": "new-task-uuid",
    "userId": "user-uuid",
    "weeklyPlanId": "weekly-plan-uuid",
    "title": "Doctor appointment",
    "description": "Annual checkup at 2 PM",
    "status": "TODO",
    "priority": "HIGH",
    "scheduledDate": "2026-03-12T00:00:00.000Z",
    "category": "HEALTH",
    "estimatedMinutes": 60,
    "aiGenerated": false,
    "source": "MANUAL",
    "createdAt": "2026-03-10T09:15:00.000Z"
  }
}
```

---

## 🧪 Step-by-Step Postman Testing

### Prerequisites
1. Have Postman installed
2. Have a valid authentication token
3. Set up environment variables:
   - `baseUrl`: `http://localhost:3000`
   - `token`: Your JWT token

---

### Test Flow: Complete Weekly Plan Lifecycle

#### **Step 1: Generate AI Weekly Plan**

1. Create a new POST request in Postman
2. Set URL: `{{baseUrl}}/api/v1/ai/generate/weekly`
3. Add Headers:
   - `Authorization`: `Bearer {{token}}`
   - `Content-Type`: `application/json`
4. Set Body (raw JSON):
```json
{
  "userInput": "Help me plan a productive week. I want to launch my side project, exercise 4 times, and maintain work-life balance.",
  "weekStartDate": "2026-03-10"
}
```
5. Click **Send**
6. ✅ **Expected Result:**
   - Status: `200 OK`
   - Response contains `weeklyPlan` object
   - Response contains `tasks` array
   - `tasksCreated` shows number of tasks (typically 15-25)
7. **Save the `weeklyPlan.id` from response** - you'll need it for next steps

---

#### **Step 2: View All Weekly Plans**

1. Create a new GET request
2. Set URL: `{{baseUrl}}/api/v1/weekly-plans/all`
3. Add Headers:
   - `Authorization`: `Bearer {{token}}`
4. Click **Send**
5. ✅ **Expected Result:**
   - Status: `200 OK`
   - Shows count of AI-generated and manual plans
   - Your newly created plan should appear in the list
   - Each plan shows `source: "AI_GENERATED"` or `source: "MANUAL"`

---

#### **Step 3: Get Daily Summary**

1. Create a new GET request
2. Set URL: `{{baseUrl}}/api/v1/weekly-plans/{{weeklyPlanId}}/daily-summary`
   - Replace `{{weeklyPlanId}}` with the ID from Step 1
3. Add Headers:
   - `Authorization`: `Bearer {{token}}`
4. Click **Send**
5. ✅ **Expected Result:**
   - Status: `200 OK`
   - Shows breakdown for all 7 days (Monday - Sunday)
   - Each day shows:
     - `tasksTotal`: Number of tasks for that day
     - `tasksCompleted`: Number completed
     - `completionRate`: Percentage (0-100)
     - `tasks`: Array of task objects

**Example Analysis:**
```json
{
  "day": "Monday",
  "tasksTotal": 3,
  "tasksCompleted": 0,
  "completionRate": 0,
  "tasks": [
    { "title": "Complete side project planning", "status": "TODO" },
    { "title": "Morning workout", "status": "TODO" },
    { "title": "Client meeting prep", "status": "TODO" }
  ]
}
```

---

#### **Step 4: Get Tasks for Monday Only**

1. Create a new GET request
2. Set URL: `{{baseUrl}}/api/v1/weekly-plans/{{weeklyPlanId}}/tasks/2026-03-10`
   - The date should be Monday's date
3. Add Headers:
   - `Authorization`: `Bearer {{token}}`
4. Click **Send**
5. ✅ **Expected Result:**
   - Status: `200 OK`
   - Returns only Monday's tasks
   - Each task has `scheduledDate: "2026-03-10..."`

---

#### **Step 5: Mark First Task as Complete**

1. From Step 4 response, copy the first task's `id`
2. Create a new PUT request
3. Set URL: `{{baseUrl}}/api/v1/weekly-plans/{{weeklyPlanId}}/tasks/{{taskId}}/complete`
   - Replace `{{taskId}}` with the copied task ID
4. Add Headers:
   - `Authorization`: `Bearer {{token}}`
5. Click **Send**
6. ✅ **Expected Result:**
   - Status: `200 OK`
   - Task status changed to `"COMPLETED"`
   - `completedAt` timestamp is set
   - Message: "Task marked as complete"

---

#### **Step 6: Verify Completion in Daily Summary**

1. Repeat Step 3 (Get Daily Summary)
2. ✅ **Expected Result:**
   - Monday's `tasksCompleted` increased by 1
   - Monday's `completionRate` updated (e.g., from 0 to 33%)
   - `overallCompletionRate` updated
   - The completed task now shows `"status": "COMPLETED"`

**Before:**
```json
{
  "day": "Monday",
  "tasksCompleted": 0,
  "completionRate": 0
}
```

**After:**
```json
{
  "day": "Monday",
  "tasksCompleted": 1,
  "tasksCompleted": 3,
  "completionRate": 33
}
```

---

#### **Step 7: Add Custom Task to Wednesday**

1. Create a new POST request
2. Set URL: `{{baseUrl}}/api/v1/weekly-plans/{{weeklyPlanId}}/tasks`
3. Add Headers:
   - `Authorization`: `Bearer {{token}}`
   - `Content-Type`: `application/json`
4. Set Body (raw JSON):
```json
{
  "date": "2026-03-12",
  "title": "Doctor appointment",
  "description": "Annual checkup at 2 PM",
  "priority": "HIGH",
  "category": "HEALTH",
  "estimatedMinutes": 60
}
```
5. Click **Send**
6. ✅ **Expected Result:**
   - Status: `201 Created`
   - New task created with `aiGenerated: false`
   - `source: "MANUAL"`
   - `scheduledDate: "2026-03-12..."`

---

#### **Step 8: View Wednesday's Tasks**

1. Create a new GET request
2. Set URL: `{{baseUrl}}/api/v1/weekly-plans/{{weeklyPlanId}}/tasks/2026-03-12`
3. Add Headers:
   - `Authorization`: `Bearer {{token}}`
4. Click **Send**
5. ✅ **Expected Result:**
   - Status: `200 OK`
   - Shows all Wednesday tasks including the newly added one
   - Your "Doctor appointment" task appears in the list

---

#### **Step 9: Complete Multiple Tasks**

Repeat Step 5 for several more tasks from different days:
- Complete 2 more Monday tasks
- Complete 1 Tuesday task
- Complete the Wednesday custom task

---

#### **Step 10: Final Daily Summary Check**

1. Repeat Step 3 (Get Daily Summary)
2. ✅ **Expected Results:**
   - Monday: `completionRate: 100` (if all 3 tasks done)
   - Tuesday: `completionRate: 33` (if 1 of 3 done)
   - Wednesday: Shows updated count including custom task
   - `overallCompletionRate` reflects total progress

---

## 📊 Understanding the Responses

### Completion Rate Calculation

**Daily Completion Rate:**
```
completionRate = (tasksCompleted / tasksTotal) × 100
```

Example:
- Monday has 3 tasks
- 2 tasks completed
- Completion rate = (2 / 3) × 100 = 67%

**Weekly Completion Rate:**
```
overallCompletionRate = (total completed / total tasks) × 100
```

Example:
- Total tasks for week: 21
- Total completed: 9
- Overall rate = (9 / 21) × 100 = 43%

---

## 🎯 Use Cases

### Use Case 1: Track Daily Progress
```
1. Generate weekly plan Monday morning
2. Throughout the week, mark tasks complete as you finish them
3. Check daily summary each evening to see progress
4. Adjust next day's tasks if needed
```

### Use Case 2: Add Last-Minute Tasks
```
1. Weekly plan generated on Sunday
2. Tuesday morning, doctor calls to schedule urgent appointment
3. Add custom task for Thursday via POST /tasks endpoint
4. Task appears in Thursday's task list
5. Mark complete after appointment
```

### Use Case 3: Weekly Review
```
1. Sunday evening, check daily summary
2. See which days had high completion (green)
3. See which days had low completion (red)
4. Identify patterns (e.g., Wednesdays always low)
5. Plan next week accordingly
```

### Use Case 4: Team/Family Shared Plans
```
1. Generate weekly plan for family activities
2. Each family member marks their tasks complete
3. Parents check daily summary to monitor progress
4. Add tasks for unexpected events (school meeting, repairs)
```

---

## 🐛 Troubleshooting

### Issue: No tasks created after generating weekly plan

**Check:**
1. Look at `tasksCreated` in response - should be > 0
2. Check if AI-generated content includes priority sections
3. Look for patterns like "**Monday's Top 3 Priorities:**"

**Solution:**
- The AI prompt ensures proper formatting
- If still no tasks, the parsing may have failed
- Check console logs for task extraction errors

---

### Issue: Task completion not updating weekly plan rate

**Check:**
1. Verify task has correct `weeklyPlanId`
2. Check network request succeeded (200 OK)

**Solution:**
- The service automatically calculates and updates
- If not updating, check weeklyPlanTaskService.updateWeeklyPlanCompletion()

---

### Issue: Tasks appearing on wrong day

**Check:**
1. Verify `scheduledDate` matches the intended day
2. Check timezone issues (dates stored in UTC)

**Solution:**
- When adding custom tasks, use YYYY-MM-DD format
- Ensure date matches actual day of week

---

## 💡 Best Practices

1. **Generate plans on Sunday evening** for upcoming week
2. **Check daily summary every morning** to see today's priorities
3. **Mark tasks complete immediately** after finishing
4. **Add custom tasks** as they arise throughout the week
5. **Review weekly completion** on Sunday to improve next week
6. **Aim for 70%+ weekly completion** for sustainable productivity

---

## 🔗 Related Endpoints

- `POST /api/v1/ai/generate/daily` - Generate daily plan
- `POST /api/v1/ai/generate/monthly` - Generate monthly plan
- `GET /api/v1/tasks` - Get all user tasks
- `PUT /api/v1/tasks/:id` - Update task details
- `DELETE /api/v1/tasks/:id` - Delete a task

---

## 📝 Notes

- **Task Extraction:** AI-generated plans are parsed automatically to extract daily priorities
- **Automatic Calculation:** Completion rates update automatically when tasks are marked complete
- **No Manual Calculation:** You don't need to manually calculate completion rates
- **Flexible Structure:** Works with both AI-generated and manual weekly plans
- **Existing Infrastructure:** Uses your existing Task model - no schema changes needed

---

## 🎉 Success Criteria

After completing all test steps, you should have:

✅ A weekly plan with 15-25 tasks spread across 7 days  
✅ Completion rates calculated for each day  
✅ Overall weekly completion rate  
✅ Ability to mark tasks complete  
✅ Ability to add custom tasks  
✅ Daily and weekly progress visibility  

---

## 📞 Support

If tasks aren't being created or completion isn't tracking:
1. Check console logs for errors
2. Verify authentication token is valid
3. Ensure weeklyPlanId exists in database
4. Check that Task table has weeklyPlanId field

**Pro Tip:** Use Postman's Test Scripts to automate verification:
```javascript
// Add to Tests tab in Postman
pm.test("Tasks were created", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.tasksCreated).to.be.above(0);
});

pm.test("Completion rate calculated", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.overallCompletionRate).to.be.a('number');
});
```
