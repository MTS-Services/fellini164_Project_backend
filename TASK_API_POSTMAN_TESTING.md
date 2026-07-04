# Task API - Postman Testing Guide

Complete testing guide for all Task endpoints in the Fellini backend.

---

## Prerequisites

1. **Server running**

   ```bash
   npm run dev
   ```

2. **Base URL**

   ```
   http://localhost:3000/api/v1/tasks
   ```

   > Check your `.env` for `PORT`. Use the port your server prints on startup.

3. **Authentication required** — every Task route needs a logged-in user.
   - Login via `POST /api/v1/auth/login` to get a JWT token.
   - Send header: `Authorization: Bearer YOUR_TOKEN`

---

## Postman Environment Variables

| Variable  | Example Value                  |
| --------- | ------------------------------ |
| `baseUrl` | `http://localhost:3000/api/v1` |
| `token`   | _(set after login)_            |
| `taskId`  | _(set after creating a task)_  |
| `goalId`  | _(optional — link to a goal)_  |

**Auto-save token (Tests tab on login):**

```javascript
const res = pm.response.json();
if (res.token) pm.environment.set("token", res.token);
```

**Auto-save taskId (Tests tab on create):**

```javascript
const res = pm.response.json();
if (res.task?.id) pm.environment.set("taskId", res.task.id);
```

---

## STEP 0: Login

```
POST {{baseUrl}}/auth/login
```

```json
{
  "email": "you@example.com",
  "password": "your-password"
}
```

---

## 1. Board Summary

```
GET {{baseUrl}}/tasks/summary
Authorization: Bearer {{token}}
```

**Expected (200)**

```json
{
  "success": true,
  "summary": {
    "todo": 5,
    "inProgress": 2,
    "completed": 10,
    "overdue": 1,
    "dueToday": 3,
    "total": 17
  }
}
```

---

## 2. List Tasks (with filters & pagination)

```
GET {{baseUrl}}/tasks?status=TODO&priority=HIGH&goalId={{goalId}}&page=1&limit=20
Authorization: Bearer {{token}}
```

**Query params**

| Param         | Description                                      |
| ------------- | ------------------------------------------------ |
| `status`      | TODO / IN_PROGRESS / COMPLETED / CANCELED / SKIPPED |
| `priority`    | LOW / MEDIUM / HIGH / URGENT                     |
| `category`    | Goal category enum                               |
| `goalId`      | Filter by linked goal                            |
| `search`      | Search title/description                         |
| `dueFilter`   | today / tomorrow / this_week / this_month / overdue |
| `parentOnly`  | `true` — top-level tasks only                    |
| `page`        | Page number (default 1)                          |
| `limit`       | Per page (default 50, max 100)                   |

---

## 3. Create Task (Manual)

```
POST {{baseUrl}}/tasks
Authorization: Bearer {{token}}
```

```json
{
  "title": "Prepare quarterly report",
  "description": "Compile Q2 metrics and send to manager",
  "category": "CAREER",
  "priority": "HIGH",
  "dueDate": "2026-07-15",
  "estimatedMinutes": 90,
  "goalId": "{{goalId}}"
}
```

**Expected (201)** — returns full task with `goal`, `subtasks`, `plannerItems`.

---

## 4. Get Task by ID

```
GET {{baseUrl}}/tasks/{{taskId}}
Authorization: Bearer {{token}}
```

---

## 5. Update Task

```
PATCH {{baseUrl}}/tasks/{{taskId}}
Authorization: Bearer {{token}}
```

```json
{
  "priority": "URGENT",
  "status": "IN_PROGRESS"
}
```

---

## 6. Update Status Only

```
PATCH {{baseUrl}}/tasks/{{taskId}}/status
Authorization: Bearer {{token}}
```

```json
{
  "status": "IN_PROGRESS"
}
```

---

## 7. Complete Task

```
POST {{baseUrl}}/tasks/{{taskId}}/complete
Authorization: Bearer {{token}}
```

```json
{
  "actualMinutes": 45
}
```

> Completing a task linked to a goal automatically refreshes that goal's progress.

---

## 8. Skip Task

```
POST {{baseUrl}}/tasks/{{taskId}}/skip
Authorization: Bearer {{token}}
```

```json
{
  "reason": "Blocked waiting on input"
}
```

---

## 9. Delete Task

```
DELETE {{baseUrl}}/tasks/{{taskId}}
Authorization: Bearer {{token}}
```

---

## 10. Get Subtasks

```
GET {{baseUrl}}/tasks/{{taskId}}/subtasks
Authorization: Bearer {{token}}
```

---

## 11. AI — Generate Single Task

```
POST {{baseUrl}}/tasks/ai/generate
Authorization: Bearer {{token}}
```

```json
{
  "prompt": "I need to organize my home office this weekend",
  "category": "PRODUCTIVITY",
  "goalId": "{{goalId}}"
}
```

**Expected (201)** — creates and returns the new task.

---

## 12. AI — Improve Task

Improves the **specific task** identified by `{{taskId}}` in the URL. The body only carries optional instructions — do not send a task id in the body.

```
POST {{baseUrl}}/tasks/{{taskId}}/ai/improve
Authorization: Bearer {{token}}
```

```json
{
  "instructions": "Make it more specific with a clear deadline"
}
```

**How it works**

1. Loads the task from `GET /tasks/{{taskId}}` (must belong to the logged-in user).
2. Sends that task's current title, description, priority, due date, etc. to AI.
3. Updates **only** that task row in the database.
4. Returns the updated task with the same `id` as `{{taskId}}`.

**Expected (200)** — same `task.id` as in the URL, with improved fields.

---

## 13. AI — Breakdown into Subtasks

```
POST {{baseUrl}}/tasks/{{taskId}}/breakdown
Authorization: Bearer {{token}}
```

```json
{}
```

**Regenerate (replaces existing subtasks):**

```json
{
  "regenerate": true
}
```

---

## 14. AI — Generate from Goals

```
POST {{baseUrl}}/tasks/ai/generate-from-goals
Authorization: Bearer {{token}}
```

Requires at least one ACTIVE goal.

---

## 15. AI — Generate Daily Tasks

```
POST {{baseUrl}}/tasks/ai/generate-daily
Authorization: Bearer {{token}}
```

---

## 16. Bulk Operations

**Create**

```
POST {{baseUrl}}/tasks/bulk/create
```

```json
{
  "tasks": [
    { "title": "Task A", "priority": "MEDIUM" },
    { "title": "Task B", "priority": "LOW" }
  ]
}
```

**Update**

```
PATCH {{baseUrl}}/tasks/bulk/update
```

```json
{
  "taskIds": ["uuid-1", "uuid-2"],
  "updates": { "status": "COMPLETED" }
}
```

**Delete**

```
DELETE {{baseUrl}}/tasks/bulk/delete
```

```json
{
  "taskIds": ["uuid-1", "uuid-2"]
}
```

---

## 17. Analytics & Special Lists

| Endpoint                              | Description              |
| ------------------------------------- | ------------------------ |
| `GET /tasks/analytics/stats`          | Task statistics          |
| `GET /tasks/analytics/productivity`   | Productivity analytics   |
| `GET /tasks/analytics/patterns`       | Pattern detection        |
| `GET /tasks/special/overdue`          | Overdue tasks            |
| `GET /tasks/special/today`            | Today's tasks            |

---

## Architecture Notes (MVP)

- **Task** = one-time work item; optional `goalId` links to a parent goal.
- **Goal progress** auto-updates when linked tasks are completed, updated, or deleted.
- **Planner** (`PlannerItem`) is a separate scheduling layer — task content is not edited by the planner.
- Tasks can have **subtasks** via `parentTaskId` or AI breakdown.

---

## Quick Test Flow

1. Login → save `token`
2. `POST /tasks` → save `taskId`
3. `GET /tasks/summary` → verify counts
4. `PATCH /tasks/:id/status` → set `IN_PROGRESS`
5. `POST /tasks/:id/complete` → verify goal progress if linked
6. `POST /tasks/ai/generate` → test AI creation
7. `POST /tasks/:id/breakdown` → test subtask generation
