# Planner API - Postman Testing Guide

Complete testing guide for the Planner Board (`/api/v1/planner`).

---

## Architecture

```
Planner Setup / Create Plan
  → AI reads goals, routine, available time, existing Tasks & Habits
  → AI reuses existing items (no duplicates) and generates missing Tasks/Habits
  → User confirms (AI suggest) OR Create Plan applies immediately
  → Tasks and Habits are saved as normal items
  → PlannerItem places them on Daily / Weekly / Monthly
```

**Planner AI rules:**

- `GENERATE_PLAN` and `POST /planner/create-plan` **create and organize** Tasks & Habits, then schedule them
- `RECALIBRATE_DAY` and other AI actions **only reschedule existing** items (no new Task/Habit set)
- Tasks = one-time/actionable. Habits = repeating.
- Manual Task/Habit create still works separately (`POST /tasks`, `POST /habits`)
- After save, users can edit, complete, delete, or reschedule as usual
- Accept / Dismiss / Undo flow for AI suggestions

**Views:** `DAILY` | `WEEKLY` | `MONTHLY`

---

## Prerequisites

```bash
npm run dev
```

Base URL: `http://localhost:3000/api/v1`

Login first → `Authorization: Bearer {{token}}`

---

## 1. Board Summary

```
GET {{baseUrl}}/planner/summary?date=2026-05-13
```

---

## 2. Planner Board (main UI data)

**Daily view (timeline)**

```
GET {{baseUrl}}/planner/board?viewType=DAILY&date=2026-05-13
```

**Weekly view**

```
GET {{baseUrl}}/planner/board?viewType=WEEKLY&date=2026-05-13
```

**Monthly view**

```
GET {{baseUrl}}/planner/board?viewType=MONTHLY&date=2026-05-13
```

Response includes enriched cards with `title`, `priority`, `isAi`, linked `task` / `habit`.

---

## 3. Available Items (not yet scheduled)

```
GET {{baseUrl}}/planner/available?date=2026-05-13
```

Returns unscheduled tasks and active habits for drag-to-schedule / AI input.

---

## 4. Schedule Single Item (manual)

```
POST {{baseUrl}}/planner
```

```json
{
  "itemType": "TASK",
  "taskId": "{{taskId}}",
  "date": "2026-05-13",
  "startTime": "06:00",
  "endTime": "07:00",
  "viewType": "DAILY",
  "orderIndex": 0
}
```

Habit example:

```json
{
  "itemType": "HABIT",
  "habitId": "{{habitId}}",
  "date": "2026-05-13",
  "startTime": "04:00",
  "endTime": "04:30",
  "viewType": "DAILY"
}
```

---

## 5. Create Plan ("+ Create Plan" / New Plan modal)

Matches the UI modal: prompt + date range → AI builds and applies the plan.

```
POST {{baseUrl}}/planner/create-plan
```

**Today**

```json
{
  "prompt": "Need to update my portfolio and organize project case studies",
  "dateRange": "TODAY"
}
```

**This Week**

```json
{
  "prompt": "Prepare for job interview next week",
  "dateRange": "THIS_WEEK"
}
```

**This Month**

```json
{
  "prompt": "Build a consistent fitness routine",
  "dateRange": "THIS_MONTH"
}
```

**Custom range**

```json
{
  "prompt": "Plan my product launch tasks",
  "dateRange": "CUSTOM",
  "startDate": "2026-05-13",
  "endDate": "2026-05-20"
}
```

**What happens:**

1. AI reads the prompt + user goals/routine/schedule + **existing** tasks/habits
2. Reuses matching existing items (does **not** duplicate them)
3. Generates any missing Tasks (one-time) and Habits (repeating)
4. Saves those as normal Tasks/Habits
5. Places them on the requested date range
6. Replaces current planner items in that range
7. Returns the updated board

New users can call this with **no tasks/habits yet**. Existing users keep their current items and get gaps filled.

**Response (201)**

```json
{
  "success": true,
  "message": "Your plan is ready. I reused your existing habits and added the missing tasks.",
  "dateRange": "TODAY",
  "viewType": "DAILY",
  "created": { "tasks": 2, "habits": 1, "taskIds": [], "habitIds": [] },
  "reused": { "tasks": 1, "habits": 2 },
  "items": [...],
  "board": { ... }
}
```

| `dateRange`  | Maps to                          |
| ------------ | -------------------------------- |
| `TODAY`      | Daily view, today                                |
| `THIS_WEEK`  | From **today** through **today + 6 days** (7 days) |
| `THIS_MONTH` | Monthly view, current month                      |
| `CUSTOM`     | Requires `startDate` + `endDate`                 |

---

## 6. Create Plan (manual bulk — advanced)

```
POST {{baseUrl}}/planner/bulk/schedule
```

```json
{
  "viewType": "DAILY",
  "placements": [
    {
      "itemType": "TASK",
      "taskId": "{{taskId}}",
      "date": "2026-05-13",
      "startTime": "06:00",
      "endTime": "07:00"
    },
    {
      "itemType": "HABIT",
      "habitId": "{{habitId}}",
      "date": "2026-05-13",
      "startTime": "04:00",
      "endTime": "04:30"
    }
  ]
}
```

---

## 6. Move / Update Time Slot

```
PATCH {{baseUrl}}/planner/{{plannerItemId}}
```

```json
{
  "startTime": "08:00",
  "endTime": "08:45",
  "orderIndex": 1
}
```

---

## 7. Mark Planner Slot Complete

Planner-level only — does NOT complete the underlying task/habit.

```
PATCH {{baseUrl}}/planner/{{plannerItemId}}/complete
```

---

## 8. Remove from Schedule

```
DELETE {{baseUrl}}/planner/{{plannerItemId}}
```

---

## 9. AI — Suggest Plan (chat panel)

**Generate plan (Accept / Dismiss flow)**

For a new user this **creates** Tasks + Habits. For an existing user it reuses current items and only adds what is missing. Nothing is saved until Accept.

```
POST {{baseUrl}}/planner/ai/suggest
```

```json
{
  "action": "GENERATE_PLAN",
  "viewType": "DAILY",
  "date": "2026-05-13",
  "message": "Focus on fitness in the morning and deep work after 10am"
}
```

Then:

```
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/accept
```

That saves generated Tasks/Habits as normal items and places them on the board.

**AI Actions button options:**

| UI Label            | `action` value      | Behavior                                      |
| ------------------- | ------------------- | --------------------------------------------- |
| Generate a plan     | `GENERATE_PLAN`     | Create + organize Tasks/Habits, then schedule |
| Recalibrate my day  | `RECALIBRATE_DAY`   | Reschedule existing items only                |
| Reduce overload     | `REDUCE_OVERLOAD`   | Reschedule existing items only                |
| Optimize schedule   | `OPTIMIZE_SCHEDULE` | Reschedule existing items only                |
| Balance my schedule | `BALANCE_SCHEDULE`  | Reschedule existing items only                |
| Free up my evening  | `FREE_EVENING`      | Reschedule existing items only                |
| Chat input          | `CHAT`              | Reschedule existing items only                |

### Postman process for AI Actions (step by step)

This is the same flow the **AI Assistant** panel uses: suggest first → user accepts or dismisses → optional undo.

#### Step 0 — Setup Postman environment

| Variable         | Example                          |
| ---------------- | -------------------------------- |
| `baseUrl`        | `http://localhost:3000/api/v1`   |
| `token`          | _(from login)_                   |
| `suggestionId`   | _(auto-saved after suggest)_     |

**Login**

```http
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

**All planner requests need:**

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

#### Step 1 — Prepare data

`GENERATE_PLAN` works for new users (empty tasks/habits) and existing users.

`RECALIBRATE_DAY` / optimize / balance **only reschedule existing items**. For those, create at least 1 task or 1 habit first (or accept a generated plan first).

```http
POST {{baseUrl}}/tasks
```

```json
{
  "title": "Complete work task",
  "category": "CAREER",
  "priority": "HIGH"
}
```

```http
POST {{baseUrl}}/habits
```

```json
{
  "name": "Morning workout",
  "category": "FITNESS",
  "frequency": "DAILY"
}
```

Optionally put them on the board manually:

```http
POST {{baseUrl}}/planner/bulk/schedule
```

```json
{
  "viewType": "DAILY",
  "placements": [
    {
      "itemType": "TASK",
      "taskId": "{{taskId}}",
      "date": "2026-05-13",
      "startTime": "18:00",
      "endTime": "19:00"
    }
  ]
}
```

Check current board:

```http
GET {{baseUrl}}/planner/board?viewType=DAILY&date=2026-05-13
```

#### Step 2 — Call AI suggest (pick one action)

**Endpoint (same for every AI Action button):**

```http
POST {{baseUrl}}/planner/ai/suggest
```

**Recalibrate my day**

```json
{
  "action": "RECALIBRATE_DAY",
  "viewType": "DAILY",
  "date": "2026-05-13"
}
```

**Reduce overload**

```json
{
  "action": "REDUCE_OVERLOAD",
  "viewType": "DAILY",
  "date": "2026-05-13"
}
```

**Optimize schedule**

```json
{
  "action": "OPTIMIZE_SCHEDULE",
  "viewType": "DAILY",
  "date": "2026-05-13"
}
```

**Balance my schedule**

```json
{
  "action": "BALANCE_SCHEDULE",
  "viewType": "WEEKLY",
  "date": "2026-05-13"
}
```

**Free up my evening**

```json
{
  "action": "FREE_EVENING",
  "viewType": "DAILY",
  "date": "2026-05-13"
}
```

**Chat input (custom message)**

```json
{
  "action": "CHAT",
  "viewType": "DAILY",
  "date": "2026-05-13",
  "message": "Move my workout earlier and leave evening free"
}
```

**Tests tab (save suggestionId):**

```javascript
const res = pm.response.json();
if (res.suggestionId) pm.environment.set("suggestionId", res.suggestionId);
```

**Expected response (200)** — plan is NOT applied yet:

```json
{
  "success": true,
  "suggestionId": "uuid-here",
  "message": "I've adjusted your schedule...",
  "placements": [...],
  "board": [...]
}
```

Preview the suggested layout in `board` before accepting.

#### Step 3A — Accept (UI: "Accept plan")

```http
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/accept
```

No body required.

**Expected (200):**

```json
{
  "success": true,
  "message": "Plan accepted and applied",
  "items": [...],
  "board": { ... }
}
```

Verify on the board:

```http
GET {{baseUrl}}/planner/board?viewType=DAILY&date=2026-05-13
```

#### Step 3B — Dismiss (UI: "Dismiss")

If you do not want the suggestion:

```http
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/dismiss
```

No body required. Board stays unchanged.

#### Step 4 — Undo (optional)

If you accepted but want the old schedule back:

```http
POST {{baseUrl}}/planner/ai/undo
```

No body required. Restores the snapshot from before the last accept.

---

### AI Actions vs Create Plan

| Feature | Endpoint | Applies immediately? |
| ------- | -------- | -------------------- |
| **AI Actions** (chat panel) | `POST /planner/ai/suggest` → accept/dismiss | No — needs accept |
| **+ Create Plan** (modal) | `POST /planner/create-plan` | Yes — applies on Create |

Chat example:

```json
{
  "action": "CHAT",
  "viewType": "DAILY",
  "date": "2026-05-13",
  "message": "Move my workout earlier and leave evening free"
}
```

**Response:**

```json
{
  "success": true,
  "suggestionId": "uuid",
  "message": "I've built a suggested plan...",
  "placements": [...],
  "board": [...]
}
```

Save `suggestionId` for accept/dismiss.

---

## 10. Accept AI Plan

```
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/accept
```

Applies placements to the board. `GENERATE_PLAN` replaces the full day; other actions replace AI-scheduled items only.

---

## 11. Dismiss AI Plan

```
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/dismiss
```

---

## 12. Undo Last AI Change

```
POST {{baseUrl}}/planner/ai/undo
```

Restores the previous schedule snapshot.

---

## Valid Values

| Field                   | Values                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `itemType`              | `TASK`, `HABIT`                                                                                                        |
| `viewType`              | `DAILY`, `WEEKLY`, `MONTHLY`                                                                                           |
| `action`                | `GENERATE_PLAN`, `RECALIBRATE_DAY`, `REDUCE_OVERLOAD`, `OPTIMIZE_SCHEDULE`, `BALANCE_SCHEDULE`, `FREE_EVENING`, `CHAT` |
| `startTime` / `endTime` | `HH:mm` (24h)                                                                                                          |

---

## Quick Test Flow

1. `POST /planner/ai/suggest` with `GENERATE_PLAN` (new or existing user)
2. `POST /planner/ai/suggestions/:id/accept` → Tasks/Habits saved + scheduled
3. `GET /planner/board` and `GET /tasks` / `GET /habits` to confirm
4. `POST /planner/ai/suggest` with `RECALIBRATE_DAY` → Accept to reschedule only
5. Optional: `POST /planner/create-plan` for prompt + date range (saves immediately)
6. `POST /planner/ai/undo` to revert the last schedule change
