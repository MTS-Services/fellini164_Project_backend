# Planner E2E Postman Flow

Step-by-step flow to test the **Planner Board** after you already created **tasks** and **habits** for today.

> Planner only **schedules** existing tasks/habits. It does **not** create or edit their content.

---

## Setup

### 1. Server

```bash
npm run dev
```

### 2. Postman environment

| Variable | Example | Notes |
| -------- | ------- | ----- |
| `baseUrl` | `http://localhost:3000/api/v1` | |
| `token` | _(after login)_ | |
| `today` | `2026-07-22` | **Use today’s date as `YYYY-MM-DD`** (e.g. `2026-07-22`) |

> Board/create-plan now return calendar dates like `"date": "2026-07-22"` (not shifted UTC ISO).
> Default timezone: user settings → else `APP_TIMEZONE` → else `Asia/Dhaka`.
| `taskId` | _(optional)_ | one of your task IDs |
| `habitId` | _(optional)_ | one of your habit IDs |
| `suggestionId` | _(after AI suggest)_ | |
| `plannerItemId` | _(after board has items)_ | |

### 3. Headers (every request)

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

---

## FLOW OVERVIEW

```
Login
  → Check available tasks/habits
  → Empty board (optional check)
  → Create Plan (TODAY)     ← schedules your existing items
  → View Daily Board
  → AI Suggest → Show included → Accept
  → Undo
  → AI Suggest → Dismiss
  → AI Suggest + energy → Adjust → Accept
  → Complete one item
  → Weekly / Monthly board
```

Run steps **in order**.

---

## STEP 0 — Login

```
POST {{baseUrl}}/auth/login
```

```json
{
  "email": "you@example.com",
  "password": "your-password"
}
```

**Tests tab (save token):**

```javascript
const res = pm.response.json();
if (res.token) pm.environment.set("token", res.token);
```

---

## STEP 1 — Confirm your tasks & habits exist

You said you already created them for today. Verify:

```
GET {{baseUrl}}/tasks
```

```
GET {{baseUrl}}/habits
```

You should see at least a few tasks + habits.

**Optional — save IDs:**

```javascript
const res = pm.response.json();
const list = res.data || res.tasks || [];
if (list[0]?.id) pm.environment.set("taskId", list[0].id);
```

(Same idea for habits → `habitId`)

---

## STEP 2 — Check what Planner can schedule today

```
GET {{baseUrl}}/planner/available?date={{today}}
```

**Expect:** your unscheduled tasks + active habits listed.

If this is empty, create tasks/habits first — create-plan cannot invent them.

---

## STEP 3 — Board before plan (optional)

```
GET {{baseUrl}}/planner/board?viewType=DAILY&date={{today}}
```

**Expect:** empty or old items. Fine either way.

```
GET {{baseUrl}}/planner/summary?date={{today}}
```

---

## STEP 4 — Create Plan for TODAY (main schedule step)

```
POST {{baseUrl}}/planner/create-plan
```

```json
{
  "prompt": "Plan my day using my existing tasks and habits. Balance work and health.",
  "dateRange": "TODAY"
}
```

**Expect (201):**

- `items` scheduled on the board
- `board` returned
- **No** new tasks/habits created

**If 422:** no available tasks/habits — create some first.

**Then verify board:**

```
GET {{baseUrl}}/planner/board?viewType=DAILY&date={{today}}
```

**Check each card for:**

| Field | Example |
| ----- | ------- |
| `title` | Update LinkedIn profile / Drink Water |
| `itemType` | `TASK` or `HABIT` |
| `isAi` | `true` if AI-scheduled |
| `startTime` / `endTime` | e.g. `09:00` / `10:00` |
| `goalTitle` | if linked to a goal |
| `progress` | habit `0/2` or task `0/4 Steps` |

**Save a planner item id:**

```javascript
const res = pm.response.json();
const items = res.board?.items || res.items || [];
if (items[0]?.id) pm.environment.set("plannerItemId", items[0].id);
```

---

## STEP 5 — Manual move / reorder (optional)

```
PATCH {{baseUrl}}/planner/{{plannerItemId}}
```

```json
{
  "startTime": "10:00",
  "endTime": "11:00",
  "orderIndex": 0
}
```

Re-check board — time should update. Content (title/description) must stay the same.

---

## STEP 6 — AI Assistant: Suggest (preview only)

```
POST {{baseUrl}}/planner/ai/suggest
```

```json
{
  "action": "RECALIBRATE_DAY",
  "viewType": "DAILY",
  "date": "{{today}}",
  "energyLevel": "MEDIUM",
  "message": "Recalibrate my day"
}
```

**Expect (200):**

- `suggestionId`
- `placements` (preview)
- `included` (what’s included)
- Board **not** changed yet until Accept

**Save suggestionId:**

```javascript
const res = pm.response.json();
if (res.suggestionId) pm.environment.set("suggestionId", res.suggestionId);
```

### Other AI Actions (same endpoint, change `action`)

| UI chip | `action` |
| ------- | -------- |
| Recalibrate my day | `RECALIBRATE_DAY` |
| Reduce overload | `REDUCE_OVERLOAD` |
| Optimize schedule | `OPTIMIZE_SCHEDULE` |
| Balance my schedule | `BALANCE_SCHEDULE` |
| Free up my evening | `FREE_EVENING` |
| Chat input | `CHAT` + `message` |

**Energy values:** `LOW` | `MEDIUM` | `HIGH`

**Chat example:**

```json
{
  "action": "CHAT",
  "viewType": "DAILY",
  "date": "{{today}}",
  "message": "Move workout earlier and free my evening"
}
```

---

## STEP 7 — Show what’s included

```
GET {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}
```

**Expect:** `included.taskCount`, `included.habitCount`, `placements`, preview `board`.

---

## STEP 8 — Adjust before accepting (optional)

```
PATCH {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}
```

Use real IDs from Step 1 / available list:

```json
{
  "message": "Moved one task later",
  "placements": [
    {
      "itemType": "TASK",
      "taskId": "{{taskId}}",
      "habitId": null,
      "date": "{{today}}",
      "startTime": "14:00",
      "endTime": "15:00",
      "orderIndex": 0,
      "viewType": "DAILY"
    },
    {
      "itemType": "HABIT",
      "taskId": null,
      "habitId": "{{habitId}}",
      "date": "{{today}}",
      "startTime": "07:00",
      "endTime": "07:15",
      "orderIndex": 1,
      "viewType": "DAILY"
    }
  ]
}
```

Still **not applied** until Accept.

---

## STEP 9 — Accept plan (Yes, apply)

```
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/accept
```

No body.

**Expect:** board updated with AI placements.

**Verify:**

```
GET {{baseUrl}}/planner/board?viewType=DAILY&date={{today}}
```

Socket (if connected): event `planner:updated` with `reason: "ai_accepted"`.

---

## STEP 10 — Undo changes

```
POST {{baseUrl}}/planner/ai/undo
```

**Expect:** previous schedule restored.

**Verify board again.**

---

## STEP 11 — Dismiss path (No, cancel)

1. Suggest again:

```
POST {{baseUrl}}/planner/ai/suggest
```

```json
{
  "action": "OPTIMIZE_SCHEDULE",
  "viewType": "DAILY",
  "date": "{{today}}",
  "energyLevel": "HIGH"
}
```

Save new `suggestionId`.

2. Dismiss:

```
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/dismiss
```

3. Board must be **unchanged**.

---

## STEP 12 — Complete one planner slot

```
PATCH {{baseUrl}}/planner/{{plannerItemId}}/complete
```

**Expect:** `isCompleted: true` on that slot.

---

## STEP 13 — Weekly & Monthly views

```
GET {{baseUrl}}/planner/board?viewType=WEEKLY&date={{today}}
```

```
GET {{baseUrl}}/planner/board?viewType=MONTHLY&date={{today}}
```

**Expect:** items grouped by day (`days` object).

---

## STEP 14 — Create Plan for THIS_WEEK (optional)

Starts from **today**, ends **today + 6 days** (not Monday–Sunday).

```
POST {{baseUrl}}/planner/create-plan
```

```json
{
  "prompt": "Spread my tasks and habits across the next 7 days without overload",
  "dateRange": "THIS_WEEK"
}
```

**Example (if today is 2026-07-22):**

```json
{
  "startDate": "2026-07-22",
  "endDate": "2026-07-28"
}
```

Then:

```
GET {{baseUrl}}/planner/board?viewType=WEEKLY&date={{today}}
```

---

## Pass / Fail checklist

| # | Step | Pass if |
| - | ---- | ------- |
| 1 | Available | Tasks/habits listed |
| 2 | Create Plan TODAY | Board fills; no new task/habit rows created |
| 3 | Board cards | Titles, times, `isAi`, optional `progress` / `goalTitle` |
| 4 | Suggest | Returns `suggestionId` + preview; board unchanged |
| 5 | Show included | Counts + placements |
| 6 | Adjust | Preview updates; board still unchanged |
| 7 | Accept | Board matches suggestion |
| 8 | Undo | Board rolls back |
| 9 | Dismiss | Board unchanged |
| 10 | Complete | Slot marked complete |
| 11 | Weekly/Monthly | Views return data |

---

## Quick reference

| Order | Method | Endpoint |
| ----- | ------ | -------- |
| 0 | POST | `/auth/login` |
| 1 | GET | `/tasks` , `/habits` |
| 2 | GET | `/planner/available?date={{today}}` |
| 3 | GET | `/planner/board?viewType=DAILY&date={{today}}` |
| 4 | POST | `/planner/create-plan` |
| 5 | PATCH | `/planner/:id` |
| 6 | POST | `/planner/ai/suggest` |
| 7 | GET | `/planner/ai/suggestions/:id` |
| 8 | PATCH | `/planner/ai/suggestions/:id` |
| 9 | POST | `/planner/ai/suggestions/:id/accept` |
| 10 | POST | `/planner/ai/undo` |
| 11 | POST | `/planner/ai/suggestions/:id/dismiss` |
| 12 | PATCH | `/planner/:id/complete` |
| 13 | GET | `/planner/board?viewType=WEEKLY\|MONTHLY` |

---

## MVP rule reminder

Planner AI **CAN:** reorder, move times, rebalance, optimize, reduce overload.  
Planner AI **CANNOT:** edit task/habit titles, descriptions, subtasks, categories, or habit structure.

Create content with `/tasks` and `/habits`. Use Planner only to put them on the board.
