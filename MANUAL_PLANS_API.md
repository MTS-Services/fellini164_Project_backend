# Manual Plans API Documentation

## Overview
The Manual Plans API allows users to create, manage, and track their Daily, Weekly, Monthly, and Task plans manually. This is separate from AI-generated plans and provides full control over planning.

## Base URL
```
/api/manual-plans
```

## Authentication
All endpoints require authentication using Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Plan Types
- `DAILY` - Daily plans
- `WEEKLY` - Weekly plans
- `MONTHLY` - Monthly plans
- `TASK` - Individual tasks

## Categories
- `WORK` - Work-related plans
- `PERSONAL` - Personal plans
- `HEALTH` - Health and fitness plans

## Priority Levels
- `LOW` - Low priority
- `MEDIUM` - Medium priority
- `HIGH` - High priority

## Status
- `TODO` - Not started
- `IN_PROGRESS` - Currently working on
- `DONE` - Completed

---

## Endpoints

### 1. Create a Plan
**POST** `/api/manual-plans`

Create a new plan of any type (Daily, Weekly, Monthly, or Task).

#### Request Body
```json
{
  "title": "Complete Project Proposal",
  "description": "Finish the Q1 project proposal with all sections",
  "planType": "TASK",
  "startDate": "2026-01-15T00:00:00Z",
  "dueDate": "2026-01-20T23:59:59Z",
  "category": "WORK",
  "priority": "HIGH",
  "status": "TODO"
}
```

#### Required Fields
- `title` (string)
- `planType` (enum: DAILY, WEEKLY, MONTHLY, TASK)
- `startDate` (ISO 8601 date string)
- `category` (enum: WORK, PERSONAL, HEALTH)
- `priority` (enum: LOW, MEDIUM, HIGH)

#### Optional Fields
- `description` (string)
- `dueDate` (ISO 8601 date string)
- `status` (enum: TODO, IN_PROGRESS, DONE) - defaults to TODO

#### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Plan created successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Complete Project Proposal",
    "description": "Finish the Q1 project proposal with all sections",
    "planType": "TASK",
    "startDate": "2026-01-15T00:00:00.000Z",
    "dueDate": "2026-01-20T23:59:59.000Z",
    "category": "WORK",
    "priority": "HIGH",
    "status": "TODO",
    "isManuallyCreated": true,
    "completedAt": null,
    "createdAt": "2026-01-10T10:21:00.000Z",
    "updatedAt": "2026-01-10T10:21:00.000Z"
  }
}
```

---

### 2. Get All Plans
**GET** `/api/manual-plans`

Retrieve all plans for the authenticated user with optional filters.

#### Query Parameters (All Optional)
- `planType` - Filter by plan type (DAILY, WEEKLY, MONTHLY, TASK)
- `category` - Filter by category (WORK, PERSONAL, HEALTH)
- `priority` - Filter by priority (LOW, MEDIUM, HIGH)
- `status` - Filter by status (TODO, IN_PROGRESS, DONE)
- `startDate` - Filter plans starting from this date (ISO 8601)
- `endDate` - Filter plans ending before this date (ISO 8601)

#### Example Requests
```
GET /api/manual-plans
GET /api/manual-plans?planType=TASK
GET /api/manual-plans?status=TODO&priority=HIGH
GET /api/manual-plans?category=WORK&startDate=2026-01-01
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "title": "Complete Project Proposal",
      "description": "Finish the Q1 project proposal",
      "planType": "TASK",
      "startDate": "2026-01-15T00:00:00.000Z",
      "dueDate": "2026-01-20T23:59:59.000Z",
      "category": "WORK",
      "priority": "HIGH",
      "status": "TODO",
      "isManuallyCreated": true,
      "completedAt": null,
      "createdAt": "2026-01-10T10:21:00.000Z",
      "updatedAt": "2026-01-10T10:21:00.000Z"
    }
  ]
}
```

---

### 3. Get Plans by Type
**GET** `/api/manual-plans/type/:type`

Get all plans of a specific type.

#### Path Parameters
- `type` - Plan type (daily, weekly, monthly, task) - case insensitive

#### Example Requests
```
GET /api/manual-plans/type/daily
GET /api/manual-plans/type/task
GET /api/manual-plans/type/weekly
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "count": 3,
  "data": [
    // Array of plans of the specified type
  ]
}
```

---

### 4. Get Plan by ID
**GET** `/api/manual-plans/:id`

Retrieve a specific plan by its ID.

#### Path Parameters
- `id` - Plan ID (UUID)

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Complete Project Proposal",
    "description": "Finish the Q1 project proposal",
    "planType": "TASK",
    "startDate": "2026-01-15T00:00:00.000Z",
    "dueDate": "2026-01-20T23:59:59.000Z",
    "category": "WORK",
    "priority": "HIGH",
    "status": "TODO",
    "isManuallyCreated": true,
    "completedAt": null,
    "createdAt": "2026-01-10T10:21:00.000Z",
    "updatedAt": "2026-01-10T10:21:00.000Z"
  }
}
```

#### Error Response (404 Not Found)
```json
{
  "success": false,
  "message": "Plan not found"
}
```

---

### 5. Update a Plan
**PUT** `/api/manual-plans/:id`

Update an existing plan. All fields are optional.

#### Path Parameters
- `id` - Plan ID (UUID)

#### Request Body (All Optional)
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "planType": "TASK",
  "startDate": "2026-01-16T00:00:00Z",
  "dueDate": "2026-01-22T23:59:59Z",
  "category": "PERSONAL",
  "priority": "MEDIUM",
  "status": "IN_PROGRESS"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Plan updated successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Updated Title",
    "status": "IN_PROGRESS",
    // ... other fields
  }
}
```

#### Notes
- When status is updated to `DONE`, `completedAt` is automatically set to the current timestamp
- When status is changed from `DONE` to anything else, `completedAt` is cleared

---

### 6. Delete a Plan
**DELETE** `/api/manual-plans/:id`

Permanently delete a plan.

#### Path Parameters
- `id` - Plan ID (UUID)

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Plan deleted successfully"
}
```

#### Error Response (404 Not Found)
```json
{
  "success": false,
  "message": "Plan not found"
}
```

---

### 7. Get Plan Statistics
**GET** `/api/manual-plans/stats`

Get statistics about all plans for the authenticated user.

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "total": 15,
    "byType": {
      "DAILY": 4,
      "WEEKLY": 3,
      "MONTHLY": 2,
      "TASK": 6
    },
    "byStatus": {
      "TODO": 8,
      "IN_PROGRESS": 4,
      "DONE": 3
    },
    "byPriority": {
      "LOW": 3,
      "MEDIUM": 7,
      "HIGH": 5
    }
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Title, planType, startDate, category, and priority are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Plan not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create plan",
  "error": "Error details"
}
```

---

## Usage Examples

### Example 1: Create a Daily Plan
```javascript
const response = await fetch('/api/manual-plans', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    title: 'Morning Deep Work',
    description: 'Focus on high-priority tasks',
    planType: 'DAILY',
    startDate: '2026-01-14T00:00:00Z',
    dueDate: '2026-01-14T23:59:59Z',
    category: 'WORK',
    priority: 'HIGH',
    status: 'TODO'
  })
});
```

### Example 2: Get All High Priority Work Tasks
```javascript
const response = await fetch('/api/manual-plans?category=WORK&priority=HIGH&status=TODO', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
});
```

### Example 3: Update Plan Status to Done
```javascript
const response = await fetch('/api/manual-plans/uuid', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    status: 'DONE'
  })
});
```

### Example 4: Get Weekly Plans Only
```javascript
const response = await fetch('/api/manual-plans/type/weekly', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
});
```

---

## Best Practices

1. **Use Appropriate Plan Types**
   - Use `DAILY` for day-specific plans
   - Use `WEEKLY` for week-long plans
   - Use `MONTHLY` for month-long plans
   - Use `TASK` for individual tasks without specific time frames

2. **Set Realistic Due Dates**
   - For DAILY plans: Set dueDate to end of day
   - For WEEKLY plans: Set dueDate to end of week
   - For MONTHLY plans: Set dueDate to end of month
   - For TASK plans: Set based on task requirements

3. **Update Status Regularly**
   - Move plans from TODO to IN_PROGRESS when starting
   - Mark as DONE when completed
   - Use filters to track progress

4. **Use Categories Consistently**
   - WORK: Professional and career-related plans
   - PERSONAL: Personal development and life plans
   - HEALTH: Fitness, wellness, and health plans

5. **Prioritize Effectively**
   - HIGH: Urgent and important
   - MEDIUM: Important but not urgent
   - LOW: Nice to have

---

## Integration with Frontend

The form you showed matches perfectly with this API:

```javascript
// Form submission handler
async function savePlan(formData) {
  const response = await fetch('/api/manual-plans', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      title: formData.title,
      description: formData.description,
      planType: formData.planType.toUpperCase(), // DAILY, WEEKLY, MONTHLY, TASK
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      category: formData.category.toUpperCase(), // WORK, PERSONAL, HEALTH
      priority: formData.priority.toUpperCase(), // LOW, MEDIUM, HIGH
      status: formData.status.replace(' ', '_').toUpperCase() // TODO, IN_PROGRESS, DONE
    })
  });
  
  return await response.json();
}
```

---

## Database Schema

The Plan model includes:
- **id**: Unique identifier (UUID)
- **userId**: User who created the plan
- **title**: Plan title (required)
- **description**: Detailed description (optional)
- **planType**: Type of plan (DAILY, WEEKLY, MONTHLY, TASK)
- **startDate**: Start date (required)
- **dueDate**: Due date (optional)
- **category**: Category (WORK, PERSONAL, HEALTH)
- **priority**: Priority level (LOW, MEDIUM, HIGH)
- **status**: Current status (TODO, IN_PROGRESS, DONE)
- **isManuallyCreated**: Always true for manual plans
- **completedAt**: Timestamp when marked as DONE
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

---

## Notes

- All dates should be in ISO 8601 format
- Plans are automatically associated with the authenticated user
- Plans can only be accessed and modified by their owner
- The `completedAt` field is automatically managed based on status
- Plans are ordered by priority (descending) and start date (ascending) by default
