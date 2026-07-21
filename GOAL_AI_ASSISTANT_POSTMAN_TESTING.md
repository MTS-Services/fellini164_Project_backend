# Goal AI Assistant — Postman Testing Guide

Test the Goal detail **AI Assistant** panel flow:

1. Suggest (preview) → **Yes, apply** / **No, cancel**
2. **Undo changes**
3. Quick actions: **Add tasks**, **Improve description**, **Add habits**
4. Free chat: **Describe what you want to change…**

---

## Prerequisites

1. Server running: `npm run dev`
2. Base URL: `http://localhost:3000/api/v1` (see `.env` `PORT`)
3. Auth header on every request: `Authorization: Bearer {{token}}`
4. OpenAI configured (`OPENAI_API_KEY` in `.env`)
5. An existing goal: set `{{goalId}}` (create via `POST /goals` first)

### Postman variables

| Variable | Example |
| -------- | ------- |
| `baseUrl` | `http://localhost:3000/api/v1` |
| `token` | JWT after login |
| `goalId` | existing goal UUID |
| `suggestionId` | set after suggest |

---

## UI → API map

| UI control | API |
| ---------- | --- |
| Chat input / send | `POST /goals/{{goalId}}/ai/suggest` with `action: "CHAT"` |
| **Improve description** | `POST /goals/{{goalId}}/ai/suggest` with `action: "IMPROVE_DESCRIPTION"` |
| **Add tasks** | `POST /goals/{{goalId}}/ai/suggest` with `action: "ADD_TASKS"` |
| **Add habits** | `POST /goals/{{goalId}}/ai/suggest` with `action: "ADD_HABITS"` |
| **Yes, apply** | `POST /goals/ai/suggestions/{{suggestionId}}/accept` |
| **No, cancel** | `POST /goals/ai/suggestions/{{suggestionId}}/dismiss` |
| **Undo changes** | `POST /goals/{{goalId}}/ai/undo` |

> Suggest does **not** change the goal until you **accept**.

---

## Valid actions

| Action | Purpose | `message` |
| ------ | ------- | --------- |
| `CHAT` | Freeform change request | **Required** |
| `IMPROVE_DESCRIPTION` | Improve title + description | Optional |
| `ADD_TASKS` | Propose new tasks to create + link | Optional |
| `ADD_HABITS` | Propose new habits to create + link | Optional |

---

## STEP 0: Login + get a goal

```
POST {{baseUrl}}/auth/login
```

```json
{
  "email": "you@example.com",
  "password": "your-password"
}
```

```
GET {{baseUrl}}/goals
```

Save a goal `id` → `goalId`.

---

## 1. Suggest — Improve description

**Request**

```
POST {{baseUrl}}/goals/{{goalId}}/ai/suggest
```

**Body**

```json
{
  "action": "IMPROVE_DESCRIPTION",
  "message": "Make it more specific and motivating"
}
```

**Expected (200)** — preview only, goal not updated yet

```json
{
  "success": true,
  "message": "Suggestion ready — accept to apply or dismiss to cancel",
  "suggestionId": "suggestion-uuid",
  "goalId": "goal-uuid",
  "action": "IMPROVE_DESCRIPTION",
  "proposedGoal": {
    "title": "Improved title…",
    "description": "Improved description…",
    "category": "CAREER",
    "priorityLevel": "MEDIUM",
    "targetDate": "2026-08-01"
  },
  "proposedTasks": [],
  "proposedHabits": [],
  "goal": { "...current goal..." },
  "tokensUsed": 800
}
```

**Postman tip**

```javascript
const res = pm.response.json();
if (res.suggestionId) pm.environment.set("suggestionId", res.suggestionId);
```

---

## 2. Yes, apply (Accept)

```
POST {{baseUrl}}/goals/ai/suggestions/{{suggestionId}}/accept
```

No body.

**Expected (200)**

```json
{
  "success": true,
  "message": "Suggestion applied successfully",
  "suggestionId": "suggestion-uuid",
  "goalId": "goal-uuid",
  "createdTaskIds": [],
  "createdHabitIds": [],
  "goal": {
    "id": "goal-uuid",
    "title": "Improved title…",
    "description": "Improved description…",
    "tasks": [],
    "habits": []
  }
}
```

Verify with:

```
GET {{baseUrl}}/goals/{{goalId}}
```

---

## 3. No, cancel (Dismiss)

Suggest again, then dismiss **instead of** accept:

```
POST {{baseUrl}}/goals/{{goalId}}/ai/suggest
```

```json
{
  "action": "IMPROVE_DESCRIPTION"
}
```

```
POST {{baseUrl}}/goals/ai/suggestions/{{suggestionId}}/dismiss
```

**Expected (200)**

```json
{
  "success": true,
  "message": "Suggestion dismissed",
  "suggestionId": "suggestion-uuid"
}
```

Goal stays unchanged.

---

## 4. Suggest — Add tasks

```
POST {{baseUrl}}/goals/{{goalId}}/ai/suggest
```

```json
{
  "action": "ADD_TASKS",
  "message": "Add practical next steps for this week"
}
```

**Expected** — `proposedTasks` has 2–4 items, `proposedHabits` is `[]`.

Then accept:

```
POST {{baseUrl}}/goals/ai/suggestions/{{suggestionId}}/accept
```

Tasks are **created and linked** to the goal. Response includes `createdTaskIds`.

---

## 5. Suggest — Add habits

```
POST {{baseUrl}}/goals/{{goalId}}/ai/suggest
```

```json
{
  "action": "ADD_HABITS",
  "message": "Suggest daily habits that support this goal"
}
```

Then accept. Habits are created + linked. Response includes `createdHabitIds`.

---

## 6. Suggest — Chat (freeform)

```
POST {{baseUrl}}/goals/{{goalId}}/ai/suggest
```

```json
{
  "action": "CHAT",
  "message": "Make the due date later and add 2 tasks for LinkedIn updates"
}
```

> `message` is **required** for `CHAT`.

Then accept or dismiss.

---

## 7. Undo changes

After a successful **accept**:

```
POST {{baseUrl}}/goals/{{goalId}}/ai/undo
```

No body.

**Expected (200)**

```json
{
  "success": true,
  "message": "Last Goal AI change undone",
  "suggestionId": "suggestion-uuid",
  "goalId": "goal-uuid",
  "goal": { "...restored goal..." }
}
```

**What undo does**

- Restores goal fields from the pre-accept snapshot
- Deletes tasks/habits that were **created** by that accepted suggestion
- Refreshes goal progress

---

## Recommended test flow

1. Login → save `token`
2. Create or pick a goal → save `goalId`
3. `IMPROVE_DESCRIPTION` suggest → save `suggestionId` → **accept** → verify goal updated
4. `IMPROVE_DESCRIPTION` suggest → **dismiss** → verify goal unchanged
5. `ADD_TASKS` suggest → accept → verify linked tasks
6. `ADD_HABITS` suggest → accept → verify linked habits
7. `CHAT` suggest with a custom message → accept
8. **Undo** → verify last accept rolled back
9. `GET /goals/{{goalId}}` to confirm final state

---

## Error cases

| Status | When |
| ------ | ---- |
| `400` | Invalid `action`, or `CHAT` without `message` |
| `401` | Missing/invalid token |
| `404` | Goal not found, or suggestion already accepted/dismissed |
| `503` | `OPENAI_API_KEY` not configured |

---

## Quick reference

| # | Method | Endpoint | Purpose |
| - | ------ | -------- | ------- |
| 1 | POST | `/goals/:id/ai/suggest` | Preview suggestion |
| 2 | POST | `/goals/ai/suggestions/:suggestionId/accept` | Yes, apply |
| 3 | POST | `/goals/ai/suggestions/:suggestionId/dismiss` | No, cancel |
| 4 | POST | `/goals/:id/ai/undo` | Undo last applied change |

### Related (not part of suggest/accept flow)

| Method | Endpoint | Notes |
| ------ | -------- | ----- |
| POST | `/goals/:id/ai/improve` | Immediate improve (no preview) |
| POST | `/goals/ai/generate` | Create a new goal with AI |
| GET | `/goals/:id` | Goal detail + linked tasks/habits |
