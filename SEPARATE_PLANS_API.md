# 4 Separate Plan APIs - Quick Reference

## Overview
You now have **4 independent APIs** for each plan type:

1. **Daily Plans API** - `/api/daily-plans`
2. **Weekly Plans API** - `/api/weekly-plans`
3. **Monthly Plans API** - `/api/monthly-plans`
4. **Task Plans API** - `/api/task-plans`

---

## 1. Daily Plans API

### Base URL: `/api/daily-plans`

### Create Daily Plan
```http
POST /api/daily-plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Morning Routine",
  "description": "Exercise, breakfast, meditation",
  "startDate": "2026-01-14T00:00:00Z",
  "dueDate": "2026-01-14T23:59:59Z",
  "category": "HEALTH",
  "priority": "MEDIUM",
  "status": "TODO"
}
```

### Get All Daily Plans
```http
GET /api/daily-plans
GET /api/daily-plans?status=TODO
GET /api/daily-plans?category=WORK&priority=HIGH
```

### Get Single Daily Plan
```http
GET /api/daily-plans/:id
```

### Update Daily Plan
```http
PUT /api/daily-plans/:id
{
  "status": "DONE"
}
```

### Delete Daily Plan
```http
DELETE /api/daily-plans/:id
```

---

## 2. Weekly Plans API

### Base URL: `/api/weekly-plans`

### Create Weekly Plan
```http
POST /api/weekly-plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Sprint Week Goals",
  "description": "Complete all user stories for Sprint 5",
  "startDate": "2026-01-13T00:00:00Z",
  "dueDate": "2026-01-19T23:59:59Z",
  "category": "WORK",
  "priority": "HIGH",
  "status": "IN_PROGRESS"
}
```

### Get All Weekly Plans
```http
GET /api/weekly-plans
GET /api/weekly-plans?status=IN_PROGRESS
GET /api/weekly-plans?category=PERSONAL
```

### Get Single Weekly Plan
```http
GET /api/weekly-plans/:id
```

### Update Weekly Plan
```http
PUT /api/weekly-plans/:id
{
  "title": "Updated Sprint Goals",
  "status": "DONE"
}
```

### Delete Weekly Plan
```http
DELETE /api/weekly-plans/:id
```

---

## 3. Monthly Plans API

### Base URL: `/api/monthly-plans`

### Create Monthly Plan
```http
POST /api/monthly-plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "January 2026 Goals",
  "description": "Fitness: Lose 5 lbs, Career: Complete 2 projects",
  "startDate": "2026-01-01T00:00:00Z",
  "dueDate": "2026-01-31T23:59:59Z",
  "category": "PERSONAL",
  "priority": "HIGH",
  "status": "IN_PROGRESS"
}
```

### Get All Monthly Plans
```http
GET /api/monthly-plans
GET /api/monthly-plans?status=TODO
GET /api/monthly-plans?priority=HIGH
```

### Get Single Monthly Plan
```http
GET /api/monthly-plans/:id
```

### Update Monthly Plan
```http
PUT /api/monthly-plans/:id
{
  "description": "Updated goals for the month",
  "status": "DONE"
}
```

### Delete Monthly Plan
```http
DELETE /api/monthly-plans/:id
```

---

## 4. Task Plans API

### Base URL: `/api/task-plans`

### Create Task
```http
POST /api/task-plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Review PR #234",
  "description": "Review authentication module pull request",
  "startDate": "2026-01-14T00:00:00Z",
  "dueDate": "2026-01-15T23:59:59Z",
  "category": "WORK",
  "priority": "MEDIUM",
  "status": "TODO"
}
```

### Get All Tasks
```http
GET /api/task-plans
GET /api/task-plans?status=TODO
GET /api/task-plans?category=WORK&priority=HIGH
```

### Get Single Task
```http
GET /api/task-plans/:id
```

### Update Task
```http
PUT /api/task-plans/:id
{
  "status": "IN_PROGRESS"
}
```

### Delete Task
```http
DELETE /api/task-plans/:id
```

---

## Common Fields for All APIs

### Required Fields
- `title` - Plan/task title
- `startDate` - Start date (ISO 8601 format)
- `category` - WORK, PERSONAL, or HEALTH
- `priority` - LOW, MEDIUM, or HIGH

### Optional Fields
- `description` - Detailed description
- `dueDate` - Due date (ISO 8601 format)
- `status` - TODO, IN_PROGRESS, or DONE (defaults to TODO)

### Auto-Generated Fields
- `id` - Unique identifier
- `userId` - User who created the plan
- `planType` - Automatically set (DAILY, WEEKLY, MONTHLY, or TASK)
- `isManuallyCreated` - Always true
- `completedAt` - Set when status becomes DONE
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

---

## Query Filters

All GET endpoints support these filters:

- `category` - Filter by WORK, PERSONAL, or HEALTH
- `priority` - Filter by LOW, MEDIUM, or HIGH
- `status` - Filter by TODO, IN_PROGRESS, or DONE
- `startDate` - Filter plans starting from this date
- `endDate` - Filter plans ending before this date

### Examples:
```http
GET /api/daily-plans?status=TODO&priority=HIGH
GET /api/weekly-plans?category=WORK
GET /api/monthly-plans?startDate=2026-01-01&endDate=2026-01-31
GET /api/task-plans?status=IN_PROGRESS
```

---

## Frontend Integration Examples

### Example 1: Create Daily Plan
```javascript
async function createDailyPlan(formData) {
  const response = await fetch('/api/daily-plans', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: formData.title,
      description: formData.description,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      category: formData.category,
      priority: formData.priority,
      status: formData.status || 'TODO'
    })
  });
  return await response.json();
}
```

### Example 2: Get All Weekly Plans
```javascript
async function getWeeklyPlans() {
  const response = await fetch('/api/weekly-plans', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  return result.data; // Array of weekly plans
}
```

### Example 3: Update Task Status
```javascript
async function markTaskDone(taskId) {
  const response = await fetch(`/api/task-plans/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      status: 'DONE'
    })
  });
  return await response.json();
}
```

### Example 4: Get High Priority Work Tasks
```javascript
async function getHighPriorityTasks() {
  const response = await fetch('/api/task-plans?category=WORK&priority=HIGH&status=TODO', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  return result.data;
}
```

---

## Response Format

### Success Response (Create/Update)
```json
{
  "success": true,
  "message": "Daily plan created successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Morning Routine",
    "description": "Exercise, breakfast, meditation",
    "planType": "DAILY",
    "startDate": "2026-01-14T00:00:00.000Z",
    "dueDate": "2026-01-14T23:59:59.000Z",
    "category": "HEALTH",
    "priority": "MEDIUM",
    "status": "TODO",
    "isManuallyCreated": true,
    "completedAt": null,
    "createdAt": "2026-01-10T10:21:00.000Z",
    "updatedAt": "2026-01-10T10:21:00.000Z"
  }
}
```

### Success Response (Get All)
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "title": "Plan 1",
      // ... other fields
    },
    {
      "id": "uuid",
      "title": "Plan 2",
      // ... other fields
    }
  ]
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here"
}
```

---

## cURL Examples

### Create Daily Plan
```bash
curl -X POST http://localhost:5000/api/daily-plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Morning Routine",
    "startDate": "2026-01-14T00:00:00Z",
    "category": "HEALTH",
    "priority": "MEDIUM"
  }'
```

### Get All Weekly Plans
```bash
curl http://localhost:5000/api/weekly-plans \
  -H "Authorization: Bearer <token>"
```

### Update Monthly Plan
```bash
curl -X PUT http://localhost:5000/api/monthly-plans/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"status": "DONE"}'
```

### Delete Task
```bash
curl -X DELETE http://localhost:5000/api/task-plans/<id> \
  -H "Authorization: Bearer <token>"
```

---

## Summary

### API Endpoints Overview

| Plan Type | Base URL | Create | Get All | Get One | Update | Delete |
|-----------|----------|--------|---------|---------|--------|--------|
| Daily | `/api/daily-plans` | POST / | GET / | GET /:id | PUT /:id | DELETE /:id |
| Weekly | `/api/weekly-plans` | POST / | GET / | GET /:id | PUT /:id | DELETE /:id |
| Monthly | `/api/monthly-plans` | POST / | GET / | GET /:id | PUT /:id | DELETE /:id |
| Task | `/api/task-plans` | POST / | GET / | GET /:id | PUT /:id | DELETE /:id |

### Key Differences from Old System
- ❌ No need to specify `planType` in request body
- ✅ Each plan type has its own dedicated endpoint
- ✅ Cleaner, more RESTful API structure
- ✅ Easier to understand and use
- ✅ Better separation of concerns

### Benefits
1. **Clearer API structure** - Each plan type has its own endpoint
2. **No planType confusion** - Automatically handled by the endpoint
3. **Type-specific logic** - Easy to add plan-type-specific features later
4. **Better organization** - Separate controllers for each plan type
5. **Frontend simplicity** - Just use the appropriate endpoint

---

## Testing

Test each API separately:

1. **Daily Plans**: Use `/api/daily-plans`
2. **Weekly Plans**: Use `/api/weekly-plans`
3. **Monthly Plans**: Use `/api/monthly-plans`
4. **Task Plans**: Use `/api/task-plans`

All authentication, filtering, and CRUD operations work the same across all 4 APIs!
