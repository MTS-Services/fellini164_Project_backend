# Hierarchical Planning Guide

## Overview
This guide explains how to organize your monthly plans into weekly and daily plans, creating a complete hierarchical planning structure.

## Database Changes
The Plan model now includes:
- `parentPlanId`: Links a plan to its parent (e.g., a week to a month, a day to a week)
- `parentPlan`: The parent plan object
- `childPlans`: Array of child plans

## Hierarchy Structure
```
Monthly Plan (January 2026)
├── Week 1 (Jan 1-7)
│   ├── Monday (Jan 1)
│   ├── Tuesday (Jan 2)
│   └── ...
├── Week 2 (Jan 8-14)
│   ├── Monday (Jan 8)
│   └── ...
├── Week 3 (Jan 15-21)
└── Week 4 (Jan 22-31)
```

## API Usage Examples

### Step 1: Create a Monthly Plan
```http
POST {{baseUrl}}/api/v1/monthly-plans
Authorization: Bearer <your-token>
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

**Response:**
```json
{
  "success": true,
  "message": "Monthly plan created successfully",
  "data": {
    "id": "abc123-monthly-plan-id",
    "title": "January 2026 Goals",
    "planType": "MONTHLY",
    ...
  }
}
```

Save the `id` from the response - you'll need it for organizing!

---

### Step 2: Add Weekly Plans to the Month

#### Week 1 (Jan 1-7, 2026)
```http
POST {{baseUrl}}/api/v1/monthly-plans/abc123-monthly-plan-id/weeks
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "title": "Week 1: New Year Sprint",
  "description": "Focus on setting up routines and starting projects",
  "startDate": "2026-01-01T00:00:00Z",
  "dueDate": "2026-01-07T23:59:59Z",
  "priority": "HIGH"
}
```

#### Week 2 (Jan 8-14, 2026)
```http
POST {{baseUrl}}/api/v1/monthly-plans/abc123-monthly-plan-id/weeks
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "title": "Week 2: Project Development",
  "description": "Deep work on main projects",
  "startDate": "2026-01-08T00:00:00Z",
  "dueDate": "2026-01-14T23:59:59Z",
  "priority": "HIGH"
}
```

#### Week 3 (Jan 15-21, 2026)
```http
POST {{baseUrl}}/api/v1/monthly-plans/abc123-monthly-plan-id/weeks
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "title": "Week 3: Mid-Month Review",
  "description": "Review progress and adjust goals",
  "startDate": "2026-01-15T00:00:00Z",
  "dueDate": "2026-01-21T23:59:59Z",
  "priority": "MEDIUM"
}
```

#### Week 4 (Jan 22-31, 2026)
```http
POST {{baseUrl}}/api/v1/monthly-plans/abc123-monthly-plan-id/weeks
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "title": "Week 4: Final Push",
  "description": "Complete projects and wrap up monthly goals",
  "startDate": "2026-01-22T00:00:00Z",
  "dueDate": "2026-01-31T23:59:59Z",
  "priority": "HIGH"
}
```

**Response for each week:**
```json
{
  "success": true,
  "message": "Weekly plan added to monthly plan successfully",
  "data": {
    "id": "xyz789-week-plan-id",
    "parentPlanId": "abc123-monthly-plan-id",
    "title": "Week 1: New Year Sprint",
    "planType": "WEEKLY",
    ...
  }
}
```

---

### Step 3: Add Daily Plans to Weeks

You can add daily plans to either:
- A weekly plan (recommended for organized structure)
- Directly to the monthly plan (for one-off days)

#### Add Days to Week 1

**Monday, Jan 1**
```http
POST {{baseUrl}}/api/v1/monthly-plans/xyz789-week-plan-id/days
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "title": "Monday: Gym + Project Setup",
  "description": "Morning workout, afternoon project planning",
  "startDate": "2026-01-01T00:00:00Z",
  "priority": "HIGH"
}
```

**Tuesday, Jan 2**
```http
POST {{baseUrl}}/api/v1/monthly-plans/xyz789-week-plan-id/days
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "title": "Tuesday: Development Day",
  "description": "Focus on coding main features",
  "startDate": "2026-01-02T00:00:00Z",
  "priority": "HIGH"
}
```

**Wednesday, Jan 3**
```http
POST {{baseUrl}}/api/v1/monthly-plans/xyz789-week-plan-id/days
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "title": "Wednesday: Meetings & Gym",
  "description": "Client meetings in morning, workout evening",
  "startDate": "2026-01-03T00:00:00Z",
  "priority": "MEDIUM"
}
```

Continue for all 7 days of the week...

---

### Step 4: View Complete Hierarchy

Get the entire monthly plan with all weeks and days organized:

```http
GET {{baseUrl}}/api/v1/monthly-plans/abc123-monthly-plan-id/hierarchy
Authorization: Bearer <your-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123-monthly-plan-id",
    "title": "January 2026 Goals",
    "planType": "MONTHLY",
    "startDate": "2026-01-01T00:00:00.000Z",
    "dueDate": "2026-01-31T23:59:59.000Z",
    "category": "PERSONAL",
    "priority": "HIGH",
    "status": "IN_PROGRESS",
    "weeks": [
      {
        "id": "week1-id",
        "title": "Week 1: New Year Sprint",
        "planType": "WEEKLY",
        "startDate": "2026-01-01T00:00:00.000Z",
        "dueDate": "2026-01-07T23:59:59.000Z",
        "days": [
          {
            "id": "day1-id",
            "title": "Monday: Gym + Project Setup",
            "planType": "DAILY",
            "startDate": "2026-01-01T00:00:00.000Z",
            "status": "TODO"
          },
          {
            "id": "day2-id",
            "title": "Tuesday: Development Day",
            "planType": "DAILY",
            "startDate": "2026-01-02T00:00:00.000Z",
            "status": "TODO"
          }
        ]
      },
      {
        "id": "week2-id",
        "title": "Week 2: Project Development",
        "planType": "WEEKLY",
        "days": [...]
      }
    ],
    "directDays": []
  }
}
```

---

## Alternative: Add Days Directly to Monthly Plan

For special days not part of a weekly plan:

```http
POST {{baseUrl}}/api/v1/monthly-plans/abc123-monthly-plan-id/days
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "title": "Special Event: Conference",
  "description": "Attend tech conference all day",
  "startDate": "2026-01-15T00:00:00Z",
  "priority": "HIGH"
}
```

---

## Validation Rules

1. **Weekly plans** must have `startDate` and `dueDate` within the monthly plan's date range
2. **Daily plans** must have `startDate` within their parent plan's date range
3. Daily plans automatically set `dueDate` to end of day (23:59:59)
4. If `category` or `priority` is not specified, it inherits from the parent plan

---

## Complete Workflow Example

```bash
# 1. Create monthly plan
POST /monthly-plans
→ Get monthlyPlanId

# 2. Create 4 weeks
POST /monthly-plans/{monthlyPlanId}/weeks (Week 1)
POST /monthly-plans/{monthlyPlanId}/weeks (Week 2)
POST /monthly-plans/{monthlyPlanId}/weeks (Week 3)
POST /monthly-plans/{monthlyPlanId}/weeks (Week 4)
→ Get weekPlanId for each

# 3. Create daily plans for each week
POST /monthly-plans/{week1Id}/days (7 days)
POST /monthly-plans/{week2Id}/days (7 days)
POST /monthly-plans/{week3Id}/days (7 days)
POST /monthly-plans/{week4Id}/days (7-10 days)

# 4. View complete structure
GET /monthly-plans/{monthlyPlanId}/hierarchy
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/monthly-plans` | Create monthly plan |
| GET | `/api/v1/monthly-plans/:id` | Get single monthly plan |
| GET | `/api/v1/monthly-plans/:id/hierarchy` | Get plan with all children |
| POST | `/api/v1/monthly-plans/:id/weeks` | Add weekly plan to month |
| POST | `/api/v1/monthly-plans/:id/days` | Add daily plan to month |
| PUT | `/api/v1/monthly-plans/:id` | Update monthly plan |
| DELETE | `/api/v1/monthly-plans/:id` | Delete monthly plan (cascades) |

---

## Notes

- Deleting a monthly plan will delete all child weeks and days (cascade delete)
- Each plan can have its own status (TODO, IN_PROGRESS, DONE)
- You can update individual plans independently
- Use the hierarchy endpoint to get a complete overview
- Category and priority can be inherited or overridden at each level
