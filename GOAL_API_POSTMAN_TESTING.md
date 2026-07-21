# Goal API - Postman Testing Guide

Complete testing guide for all Goal endpoints in the Fellini backend.

---

## Prerequisites

1. **Server running**

   ```bash
   npm run dev
   ```

2. **Base URL**

   ```
   http://localhost:3000/api/v1/goals
   ```

   > Default port is `3000` (see `.env`). Change if your `PORT` differs.

3. **Authentication required** — every Goal route needs a logged-in user.
   - Login via `POST /api/v1/auth/login` to get a JWT token.
   - Send header: `Authorization: Bearer YOUR_TOKEN`

---

## Postman Environment Variables

Create a Postman environment with:

| Variable  | Example Value                    |
| --------- | -------------------------------- |
| `baseUrl` | `http://localhost:3000/api/v1`   |
| `token`   | _(set after login)_              |
| `goalId`  | _(set after creating a goal)_    |
| `taskId`  | _(an existing task id to link)_  |
| `habitId` | _(an existing habit id to link)_ |

---

## STEP 0: Login (Get Token)

**Request**

```
POST {{baseUrl}}/auth/login
```

**Body (raw JSON)**

```json
{
  "email": "you@example.com",
  "password": "your-password"
}
```

**Postman tip**: In the "Tests" tab, auto-save the token:

```javascript
const res = pm.response.json();
if (res.token) pm.environment.set("token", res.token);
```

> All requests below assume header: `Authorization: Bearer {{token}}`

---

## 1. Create Goal (Manual)

Supports create-only **or** create + link tasks/habits in **one request**.

**Request**

```
POST {{baseUrl}}/goals
```

### Option A — Create only

**Body (raw JSON)**

```json
{
  "title": "Update LinkedIn profile",
  "description": "Refresh headline, about, and featured work.",
  "category": "CAREER",
  "priorityLevel": "MEDIUM",
  "targetDate": "2026-08-01",
  "isMainFocus": false,
  "source": "MANUAL"
}
```

### Option B — Create + link tasks & habits (best for Manual Create modal)

**Body (raw JSON)**

```json
{
  "title": "Update LinkedIn profile",
  "description": "Refresh headline, about, and featured work.",
  "category": "CAREER",
  "priorityLevel": "MEDIUM",
  "targetDate": "2026-08-01",
  "isMainFocus": false,
  "source": "MANUAL",
  "taskIds": ["{{taskId}}"],
  "habitIds": ["{{habitId}}"]
}
```

> `taskIds` and `habitIds` are optional. Use existing task/habit UUIDs that belong to the same user. You can send only tasks, only habits, both, or neither.

**Field rules**

| Field           | Required | Rules                                         |
| --------------- | -------- | --------------------------------------------- |
| `title`         | Yes      | 1–200 chars                                   |
| `category`      | Yes      | See categories below                          |
| `description`   | No       | text                                          |
| `priorityLevel` | No       | LOW / MEDIUM / HIGH / URGENT (default MEDIUM) |
| `priority`      | No       | Int 1–10 (optional numeric)                   |
| `targetDate`    | No       | ISO date (YYYY-MM-DD)                         |
| `isMainFocus`   | No       | boolean                                       |
| `source`        | No       | AI / MANUAL (default MANUAL)                  |
| `taskIds`       | No       | Array of task UUIDs to link on create         |
| `habitIds`      | No       | Array of habit UUIDs to link on create        |

**Valid categories**: `CAREER`, `HEALTH`, `FINANCE`, `PERSONAL`, `EDUCATION`

**Expected Response (201)** — with links

```json
{
  "success": true,
  "message": "Goal created successfully",
  "data": {
    "id": "goal-uuid",
    "title": "Update LinkedIn profile",
    "category": "CAREER",
    "status": "ACTIVE",
    "priorityLevel": "MEDIUM",
    "progress": 0,
    "source": "MANUAL",
    "tasks": [
      {
        "id": "task-uuid",
        "title": "Rewrite LinkedIn About section",
        "status": "TODO",
        "goalId": "goal-uuid"
      }
    ],
    "habits": [
      {
        "id": "habit-uuid",
        "name": "Post on LinkedIn weekly",
        "status": "ACTIVE",
        "goalId": "goal-uuid"
      }
    ],
    "_count": { "tasks": 1, "habits": 1 },
    "progressDetails": {
      "progress": 0,
      "tasksTotal": 1,
      "tasksCompleted": 0,
      "habitsTotal": 1,
      "habitsCompletedToday": 0
    }
  }
}
```

**Common errors**

| Status | When |
| ------ | ---- |
| `400`  | Missing title/category, or invalid UUID in arrays |
| `404`  | One or more `taskIds` / `habitIds` not found for this user |

**Postman tip**: Save the goal id:

```javascript
const res = pm.response.json();
if (res.data && res.data.id) pm.environment.set("goalId", res.data.id);
```

**Suggested Postman test order for Option B**

1. Create a task (`POST {{baseUrl}}/tasks`) → save `taskId`
2. Create a habit (`POST {{baseUrl}}/habits`) → save `habitId`
3. `POST {{baseUrl}}/goals` with `taskIds` + `habitIds` (Option B above)

> For linking **after** a goal already exists, keep using `POST /goals/:id/link-tasks` and `POST /goals/:id/link-habits` (sections below).

---

## 2. Get All Goals (with filters)

**Request**

```
GET {{baseUrl}}/goals
```

**Query Parameters** (all optional)

| Parameter       | Description                                         | Example               |
| --------------- | --------------------------------------------------- | --------------------- |
| `status`        | ACTIVE / PAUSED / COMPLETED / ARCHIVED              | `status=ACTIVE`       |
| `category`      | Goal category                                       | `category=CAREER`     |
| `priorityLevel` | LOW / MEDIUM / HIGH / URGENT                        | `priorityLevel=HIGH`  |
| `source`        | AI / MANUAL                                         | `source=AI`           |
| `search`        | Search title/description                            | `search=rate`         |
| `minProgress`   | Min progress %                                      | `minProgress=25`      |
| `maxProgress`   | Max progress %                                      | `maxProgress=75`      |
| `dueFilter`     | today / tomorrow / this_week / this_month / overdue | `dueFilter=this_week` |
| `page`          | Page number (default 1)                             | `page=1`              |
| `limit`         | Per page (max 100, default 50)                      | `limit=20`            |

**Examples**

```
GET {{baseUrl}}/goals
GET {{baseUrl}}/goals?status=ACTIVE&priorityLevel=HIGH
GET {{baseUrl}}/goals?search=career&page=1&limit=10
GET {{baseUrl}}/goals?dueFilter=overdue
```

**Expected Response (200)**

Each goal includes linked `tasks` and `habits` arrays. Response also includes board `summary` counts (overall for the user, not limited by list filters).

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "goal-uuid",
      "title": "Update LinkedIn profile",
      "category": "EDUCATION",
      "status": "ACTIVE",
      "priorityLevel": "LOW",
      "progress": 0,
      "source": "MANUAL",
      "tasks": [
        {
          "id": "task-uuid",
          "title": "Rewrite LinkedIn About section",
          "status": "TODO",
          "priority": "MEDIUM",
          "goalId": "goal-uuid"
        }
      ],
      "habits": [
        {
          "id": "habit-uuid",
          "name": "Post on LinkedIn weekly",
          "status": "ACTIVE",
          "category": "CAREER",
          "goalId": "goal-uuid"
        }
      ],
      "_count": { "tasks": 1, "habits": 1 }
    }
  ],
  "summary": {
    "active": 3,
    "paused": 1,
    "completedThisMonth": 2,
    "total": 6
  },
  "pagination": { "page": 1, "limit": 50, "total": 1, "totalPages": 1 }
}
```

| `summary` field | Meaning |
| --------------- | ------- |
| `active` | Goals with status `ACTIVE` |
| `paused` | Goals with status `PAUSED` |
| `completedThisMonth` | Goals completed in the current calendar month |
| `total` | All goals for the user |

---

## 3. Get Board Summary

**Request**

```
GET {{baseUrl}}/goals/summary
```

**Expected Response (200)**

```json
{
  "success": true,
  "data": {
    "active": 12,
    "paused": 2,
    "completedThisMonth": 3,
    "total": 17
  }
}
```

---

## 4. Get Single Goal (with linked tasks/habits + progress)

**Request**

```
GET {{baseUrl}}/goals/{{goalId}}
```

**Expected Response (200)**

```json
{
  "success": true,
  "data": {
    "id": "goal-uuid",
    "title": "Improve Rate",
    "status": "ACTIVE",
    "progress": 50,
    "tasks": [
      { "id": "task-uuid", "title": "Update LinkedIn", "status": "COMPLETED" }
    ],
    "habits": [
      { "id": "habit-uuid", "name": "Practice coding", "status": "ACTIVE" }
    ],
    "_count": { "tasks": 2, "habits": 2 },
    "progressDetails": {
      "progress": 50,
      "totalItems": 4,
      "completedItems": 2,
      "completedTasks": 1,
      "completedHabits": 1,
      "taskCount": 2,
      "habitCount": 2
    }
  }
}
```

**Not Found (404)**

```json
{ "success": false, "message": "Goal not found" }
```

---

## 5. Update Goal

**Request**

```
PATCH {{baseUrl}}/goals/{{goalId}}
```

**Body (raw JSON)** — send only the fields you want to change

```json
{
  "title": "Improve My Rate & Portfolio",
  "priorityLevel": "HIGH",
  "status": "ACTIVE",
  "targetDate": "2026-08-01"
}
```

**Expected Response (200)**

```json
{
  "success": true,
  "message": "Goal updated successfully",
  "data": {
    "id": "goal-uuid",
    "title": "Improve My Rate & Portfolio",
    "priorityLevel": "HIGH"
  }
}
```

---

## 6. Pause / Activate Goal (Toggle)

Toggles between `ACTIVE` and `PAUSED`.

- Goal is **ACTIVE** → becomes **PAUSED**
- Goal is **PAUSED** → becomes **ACTIVE**

**Request**

```
PATCH {{baseUrl}}/goals/{{goalId}}/pause
```

**Expected Response — paused (200)**

```json
{
  "success": true,
  "message": "Goal paused successfully",
  "data": { "status": "PAUSED" }
}
```

**Expected Response — activated (200)**

```json
{
  "success": true,
  "message": "Goal activated successfully",
  "data": { "status": "ACTIVE" }
}
```

**Error (400)** — goal is completed or archived

```json
{
  "success": false,
  "message": "Cannot toggle pause for a completed goal"
}
```

---

## 7. Complete Goal

**Request**

```
PATCH {{baseUrl}}/goals/{{goalId}}/complete
```

**Expected Response (200)**

```json
{
  "success": true,
  "message": "Goal completed successfully",
  "data": { "status": "COMPLETED", "completedAt": "2026-07-03T..." }
}
```

---

## 8. Link Tasks to Goal

Use this when the goal **already exists**. For create + link in one call, see **Option B** in section 1.

**Request**

```
POST {{baseUrl}}/goals/{{goalId}}/link-tasks
```

**Body (raw JSON)**

```json
{
  "taskIds": ["{{taskId}}"]
}
```

**Expected Response (200)**

```json
{
  "success": true,
  "message": "Tasks linked successfully",
  "data": { "id": "goal-uuid", "progressDetails": { "taskCount": 1 } }
}
```

**Error (404)** — task not yours / not found

```json
{ "success": false, "message": "One or more tasks were not found" }
```

---

## 9. Link Habits to Goal

Use this when the goal **already exists**. For create + link in one call, see **Option B** in section 1.

**Request**

```
POST {{baseUrl}}/goals/{{goalId}}/link-habits
```

**Body (raw JSON)**

```json
{
  "habitIds": ["{{habitId}}"]
}
```

**Expected Response (200)**

```json
{
  "success": true,
  "message": "Habits linked successfully",
  "data": { "id": "goal-uuid" }
}
```

---

## 10. Get Linked Tasks

**Request**

```
GET {{baseUrl}}/goals/{{goalId}}/tasks
```

**Expected Response (200)**

```json
{
  "success": true,
  "count": 1,
  "data": [{ "id": "task-uuid", "title": "Update LinkedIn" }]
}
```

---

## 11. Get Linked Habits

**Request**

```
GET {{baseUrl}}/goals/{{goalId}}/habits
```

**Expected Response (200)**

```json
{
  "success": true,
  "count": 1,
  "data": [{ "id": "habit-uuid", "name": "Practice coding" }]
}
```

---

## 12. Get Goal Progress

**Request**

```
GET {{baseUrl}}/goals/{{goalId}}/progress
```

**Expected Response (200)**

```json
{
  "success": true,
  "data": {
    "progress": 50,
    "totalItems": 4,
    "completedItems": 2,
    "completedTasks": 1,
    "completedHabits": 1,
    "taskCount": 2,
    "habitCount": 2
  }
}
```

---

## 13. Unlink Task from Goal

**Request**

```
DELETE {{baseUrl}}/goals/{{goalId}}/unlink-tasks/{{taskId}}
```

**Expected Response (200)**

```json
{ "success": true, "message": "Task unlinked successfully" }
```

---

## 14. Unlink Habit from Goal

**Request**

```
DELETE {{baseUrl}}/goals/{{goalId}}/unlink-habits/{{habitId}}
```

**Expected Response (200)**

```json
{ "success": true, "message": "Habit unlinked successfully" }
```

---

## 15. AI - Generate Goal

Generates goal metadata only (title, description, category, priority, due date). Does **not** create tasks or habits.

**Request**

```
POST {{baseUrl}}/goals/ai/generate
```

**Body (raw JSON)**

```json
{
  "prompt": "I want to improve my career and get a better job",
  "category": "CAREER"
}
```

> `category` is optional. `prompt` is required (max 1000 chars).

**Expected Response (201)**

```json
{
  "success": true,
  "message": "Goal generated successfully",
  "data": {
    "id": "goal-uuid",
    "title": "Advance My Career",
    "description": "...",
    "category": "CAREER",
    "priorityLevel": "HIGH",
    "source": "AI"
  },
  "tokensUsed": 320
}
```

**Service not configured (503)**

```json
{
  "success": false,
  "message": "OpenAI service not configured. Please set OPENAI_API_KEY in .env file"
}
```

---

## 16. AI - Improve Goal

Improves an **existing goal by `goalId`**. The API loads that goal from the database, sends its current data to AI, updates the same goal, and returns the updated goal.

**Request**

```
POST {{baseUrl}}/goals/{{goalId}}/ai/improve
```

**Body (raw JSON)** — optional. You can send an empty body `{}` or omit instructions.

```json
{
  "instructions": "Make it more specific and measurable"
}
```

**How it works**
1. Finds the goal using `goalId` + logged-in user
2. AI improves `title`, `description`, `category`, `priorityLevel`, `targetDate`
3. Updates that same goal in the database
4. Returns the updated goal

**Expected Response (200)**

```json
{
  "success": true,
  "message": "Goal improved successfully",
  "data": {
    "id": "goal-uuid",
    "title": "Increase Freelance Rate by 30% in 3 Months",
    "description": "Achieve a 30% rate increase with measurable milestones.",
    "category": "CAREER",
    "priorityLevel": "HIGH",
    "targetDate": "2026-07-10T00:00:00.000Z",
    "status": "ACTIVE",
    "progress": 0,
    "tasks": [],
    "habits": [],
    "progressDetails": { "progress": 0, "totalItems": 0 }
  }
}
```

---

## 17. Delete Goal

**Request**

```
DELETE {{baseUrl}}/goals/{{goalId}}
```

**Expected Response (200)**

```json
{ "success": true, "message": "Goal deleted successfully" }
```

> Deleting a goal does NOT delete its linked tasks/habits — they become standalone (`goalId` set to null).

---

## All Routes Summary

| #   | Method | Endpoint                            | Purpose                               |
| --- | ------ | ----------------------------------- | ------------------------------------- |
| 1   | POST   | `/goals`                            | Create goal (optional `taskIds`/`habitIds`) |
| 2   | GET    | `/goals`                            | List goals (filters + pagination)     |
| 3   | GET    | `/goals/summary`                    | Board counts                          |
| 4   | GET    | `/goals/:id`                        | Goal detail + tasks/habits + progress |
| 5   | PATCH  | `/goals/:id`                        | Update goal                           |
| 6   | PATCH  | `/goals/:id/pause`                  | Pause / activate toggle               |
| 7   | PATCH  | `/goals/:id/complete`               | Complete                              |
| 8   | POST   | `/goals/:id/link-tasks`             | Link tasks (existing goal)            |
| 9   | POST   | `/goals/:id/link-habits`            | Link habits (existing goal)           |
| 10  | GET    | `/goals/:id/tasks`                  | Linked tasks                          |
| 11  | GET    | `/goals/:id/habits`                 | Linked habits                         |
| 12  | GET    | `/goals/:id/progress`               | Progress breakdown                    |
| 13  | DELETE | `/goals/:id/unlink-tasks/:taskId`   | Unlink task                           |
| 14  | DELETE | `/goals/:id/unlink-habits/:habitId` | Unlink habit                          |
| 15  | POST   | `/goals/ai/generate`                | AI generate goal                      |
| 16  | POST   | `/goals/:id/ai/improve`             | AI improve goal                       |
| 17  | DELETE | `/goals/:id`                        | Delete goal                           |

---

## Recommended Test Flow

1. Login → save `token`
2. Create a task + habit → save `taskId`, `habitId`
3. Create goal with `taskIds` + `habitIds` (one request) → save `goalId`
4. Get single goal → verify linked items + progress
5. Get all goals / board summary → counts update
6. Complete the linked task (via Task API) → check goal progress rises
7. Pause → call again to activate (toggle)
8. Complete the goal
9. Unlink task and habit (or link more via link routes)
10. AI generate a new goal
11. AI improve the goal
12. Delete the goal

---

## Progress Logic

```
progress = (completed tasks + completed habits) / total linked items × 100
```

- **Task counts as completed** when its `status = COMPLETED`
- **Habit counts as completed** when its `status = COMPLETED` OR it has a completion logged for today
- Progress is recalculated on link, unlink, update, and complete

---

## Common Errors

| Status | Meaning           | Fix                                       |
| ------ | ----------------- | ----------------------------------------- |
| 401    | No/invalid token  | Add `Authorization: Bearer {{token}}`     |
| 400    | Validation failed | Check required fields / valid enum values |
| 404    | Goal not found    | Wrong `goalId` or not your goal           |
| 503    | AI not configured | Set `OPENAI_API_KEY` in `.env`            |

---

## Notes

- All goals are scoped to the logged-in user; you can only see/edit your own.
- Only link tasks/habits that belong to you.
- `priorityLevel` (Low/Medium/High/Urgent) is the UI label; `priority` (1–10) is the numeric value kept in sync automatically.
