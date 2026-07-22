# Planner Board UI — Postman Testing Guide

Covers the Planner Board design gaps that were added for the Elyxa AI Planner page:

- Board cards with **goal title**, **habit 0/N**, **task steps**
- AI suggest with **energy level** (Low / Medium / High)
- **Show what’s included**
- **Adjust before accepting**
- Accept / Dismiss / Undo
- Socket event `planner:updated` after accept / undo

Full CRUD + create-plan docs remain in `PLANNER_API_POSTMAN_TESTING.md`.

---

## Prerequisites

```bash
npm run dev
```

| Variable | Value |
| -------- | ----- |
| `baseUrl` | `http://localhost:3000/api/v1` |
| `token` | JWT after login |
| `suggestionId` | set after suggest |
| `date` | e.g. `2026-05-13` |

Header on every request:

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

---

## UI → API map

| UI | API |
| -- | --- |
| Daily / Weekly / Monthly board | `GET /planner/board?viewType=&date=` |
| Create Plan | `POST /planner/create-plan` (schedules **existing** tasks/habits only) |
| Recalibrate / Reduce overload / Optimize / Balance / Free evening / Chat | `POST /planner/ai/suggest` |
| Energy question (Low / Medium / High) | `energyLevel` on suggest |
| Show what’s included | `GET /planner/ai/suggestions/:id` (or `included` on suggest response) |
| Adjust before accepting | `PATCH /planner/ai/suggestions/:id` |
| Accept plan | `POST /planner/ai/suggestions/:id/accept` |
| Dismiss | `POST /planner/ai/suggestions/:id/dismiss` |
| Undo changes | `POST /planner/ai/undo` |

---

## 1. Board cards (goal + progress)

```
GET {{baseUrl}}/planner/board?viewType=DAILY&date={{date}}
```

**Each item now includes**

```json
{
  "id": "planner-item-uuid",
  "itemType": "TASK",
  "title": "Career Development Plan",
  "priority": "HIGH",
  "status": "IN_PROGRESS",
  "isAi": true,
  "estimatedMinutes": 60,
  "goalId": "goal-uuid",
  "goalTitle": "Improve Rate",
  "goal": { "id": "goal-uuid", "title": "Improve Rate", "category": "CAREER" },
  "progress": {
    "type": "STEPS",
    "completed": 0,
    "total": 4,
    "label": "0/4 Steps"
  },
  "startTime": "11:00",
  "endTime": "12:00"
}
```

**Habit example**

```json
{
  "itemType": "HABIT",
  "title": "Drink Water",
  "progress": {
    "type": "HABIT",
    "completed": 0,
    "total": 2,
    "label": "0/2"
  }
}
```

| Field | Meaning |
| ----- | ------- |
| `goalTitle` | Linked goal name for the card tag |
| `progress.type = STEPS` | Subtasks completed / total |
| `progress.type = HABIT` | Completions today / `targetTimesPerDay` |

---

## 2. AI suggest (with energy)

```
POST {{baseUrl}}/planner/ai/suggest
```

### Recalibrate my day + energy

```json
{
  "action": "RECALIBRATE_DAY",
  "viewType": "DAILY",
  "date": "2026-05-13",
  "energyLevel": "LOW",
  "message": "Recalibrate my day"
}
```

| `energyLevel` | Effect |
| ------------- | ------ |
| `LOW` | Lighter load, more spacing |
| `MEDIUM` | Balanced |
| `HIGH` | Denser productive blocks |
| omit | No energy bias |

### Other quick actions

```json
{ "action": "REDUCE_OVERLOAD", "viewType": "DAILY", "date": "2026-05-13" }
```

```json
{ "action": "OPTIMIZE_SCHEDULE", "viewType": "DAILY", "date": "2026-05-13" }
```

```json
{ "action": "BALANCE_SCHEDULE", "viewType": "DAILY", "date": "2026-05-13" }
```

```json
{ "action": "FREE_EVENING", "viewType": "DAILY", "date": "2026-05-13" }
```

```json
{
  "action": "CHAT",
  "viewType": "DAILY",
  "date": "2026-05-13",
  "message": "Move workout earlier and free my evening"
}
```

**Valid actions:** `GENERATE_PLAN`, `RECALIBRATE_DAY`, `REDUCE_OVERLOAD`, `OPTIMIZE_SCHEDULE`, `BALANCE_SCHEDULE`, `FREE_EVENING`, `CHAT`

**Expected (200)** — preview only (not applied)

```json
{
  "success": true,
  "suggestionId": "suggestion-uuid",
  "action": "RECALIBRATE_DAY",
  "energyLevel": "LOW",
  "message": "I've rebuilt a lighter day based on your energy...",
  "placements": [ ... ],
  "included": {
    "totalItems": 5,
    "taskCount": 3,
    "habitCount": 2,
    "tasks": [ { "taskId": "...", "date": "...", "startTime": "06:00" } ],
    "habits": [ { "habitId": "...", "date": "...", "startTime": "07:00" } ]
  },
  "board": [ ... ],
  "tokensUsed": 1200
}
```

**Postman tip**

```javascript
const res = pm.response.json();
if (res.suggestionId) pm.environment.set("suggestionId", res.suggestionId);
```

> Planner AI still does **not** edit task/habit titles, descriptions, categories, or structure.

---

## 3. Show what’s included

```
GET {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}
```

**Expected (200)**

```json
{
  "success": true,
  "suggestionId": "suggestion-uuid",
  "action": "RECALIBRATE_DAY",
  "energyLevel": "LOW",
  "title": "Suggested plan",
  "message": "...",
  "placements": [ ... ],
  "included": {
    "totalItems": 5,
    "taskCount": 3,
    "habitCount": 2,
    "tasks": [ ... ],
    "habits": [ ... ]
  },
  "board": [ ... ]
}
```

Use this for the **Show what’s included** UI panel.

---

## 4. Adjust before accepting

Edit the pending suggestion’s placements (times / order / which items) without applying yet.

```
PATCH {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}
```

```json
{
  "message": "Moved workout later",
  "placements": [
    {
      "itemType": "TASK",
      "taskId": "existing-task-uuid",
      "habitId": null,
      "date": "2026-05-13",
      "startTime": "08:00",
      "endTime": "09:00",
      "orderIndex": 0,
      "viewType": "DAILY"
    },
    {
      "itemType": "HABIT",
      "taskId": null,
      "habitId": "existing-habit-uuid",
      "date": "2026-05-13",
      "startTime": "09:00",
      "endTime": "09:15",
      "orderIndex": 1,
      "viewType": "DAILY"
    }
  ]
}
```

**Expected (200)** — still pending; returns updated `included` + `board` preview.

---

## 5. Accept plan

```
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/accept
```

No body.

Applies placements to the real board. Emits socket:

```json
{
  "event": "planner:updated",
  "data": {
    "reason": "ai_accepted",
    "suggestionId": "...",
    "board": { ... }
  }
}
```

Verify:

```
GET {{baseUrl}}/planner/board?viewType=DAILY&date={{date}}
```

---

## 6. Dismiss

```
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/dismiss
```

Board unchanged.

---

## 7. Undo changes

After accept:

```
POST {{baseUrl}}/planner/ai/undo
```

Restores previous schedule snapshot. Emits `planner:updated` with `reason: "ai_undone"`.

---

## Create Plan (schedule only)

```
POST {{baseUrl}}/planner/create-plan
```

```json
{
  "prompt": "Focus on career tasks and health habits today",
  "dateRange": "TODAY"
}
```

**MVP rule:** does **not** create tasks or habits. Create those first via `/tasks` and `/habits`, then create-plan only schedules them.

---

## Recommended Postman flow

1. Login → save `token`
2. Ensure you have tasks/habits (and optionally link a goal + subtasks + habit `targetTimesPerDay`)
3. Schedule some items OR use create-plan / suggest
4. `GET /planner/board` → check `goalTitle` + `progress`
5. `POST /planner/ai/suggest` with `RECALIBRATE_DAY` + `energyLevel: "LOW"` → save `suggestionId`
6. `GET /planner/ai/suggestions/{{suggestionId}}` → Show what’s included
7. Optional: `PATCH` adjust placements
8. `POST .../accept` → board updates
9. `POST /planner/ai/undo` → rollback
10. Repeat with Dismiss path (suggest → dismiss, board unchanged)

---

## Quick reference

| # | Method | Endpoint | Purpose |
| - | ------ | -------- | ------- |
| 1 | GET | `/planner/board` | Board + card enrichment |
| 2 | POST | `/planner/ai/suggest` | AI preview (+ `energyLevel`) |
| 3 | GET | `/planner/ai/suggestions/:id` | Show what’s included |
| 4 | PATCH | `/planner/ai/suggestions/:id` | Adjust before accept |
| 5 | POST | `/planner/ai/suggestions/:id/accept` | Accept plan |
| 6 | POST | `/planner/ai/suggestions/:id/dismiss` | Dismiss |
| 7 | POST | `/planner/ai/undo` | Undo last AI apply |

---

## Errors

| Status | When |
| ------ | ---- |
| `400` | Invalid action / energyLevel / placements |
| `404` | Suggestion not found or already accepted/dismissed |
| `503` | OpenAI not configured |
