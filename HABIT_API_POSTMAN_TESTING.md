# Habit API - Postman Testing Guide

Complete testing guide for all Habit endpoints in the Fellini backend.

---

## Prerequisites

1. **Server running**

   ```bash
   npm run dev
   ```

2. **Base URL**

   ```text
   http://localhost:3000/api/v1/habits
   ```

   > Check your `.env` or server startup log for the actual port.

3. **Authentication required** — every Habit route needs a logged-in user.
   - Login via `POST /api/v1/auth/login`.
   - Send header: `Authorization: Bearer YOUR_TOKEN`.

---

## Postman Environment Variables

| Variable   | Example Value                  |
| ---------- | ------------------------------ |
| `baseUrl`  | `http://localhost:3000/api/v1` |
| `token`    | _(set after login)_            |
| `habitId`  | _(set after creating a habit)_ |
| `goalId`   | _(optional linked goal id)_    |

**Auto-save token (Tests tab on login):**

```javascript
const res = pm.response.json();
if (res.token) pm.environment.set("token", res.token);
```

**Auto-save habitId (Tests tab on create):**

```javascript
const res = pm.response.json();
if (res.habit?.id) pm.environment.set("habitId", res.habit.id);
```

---

## STEP 0: Login

```text
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

```text
GET {{baseUrl}}/habits/summary
Authorization: Bearer {{token}}
```

**Expected (200)**

```json
{
  "success": true,
  "summary": {
    "active": 3,
    "paused": 1,
    "completed": 0,
    "total": 4,
    "completedToday": 2,
    "remainingToday": 1
  }
}
```

---

## 2. Stats Overview

```text
GET {{baseUrl}}/habits/stats/overview
Authorization: Bearer {{token}}
```

Returns totals, active/paused/completed counts, completions, streaks, and today completion rate.

---

## 3. List Habits

```text
GET {{baseUrl}}/habits?status=ACTIVE&category=HEALTH&page=1&limit=20
Authorization: Bearer {{token}}
```

**Query params**

| Param         | Description                         |
| ------------- | ----------------------------------- |
| `status`      | ACTIVE / PAUSED / COMPLETED         |
| `category`    | Habit category enum               |
| `frequency`   | DAILY / WEEKLY / MONTHLY            |
| `difficulty`  | EASY / MEDIUM / HARD                |
| `goalId`      | Filter by linked goal               |
| `isActive`    | true / false                        |
| `aiSuggested` | true / false                        |
| `search`      | Search name/description             |
| `page`        | Page number                         |
| `limit`       | Page size, max 100                  |

---

## 4. Create Habit

```text
POST {{baseUrl}}/habits
Authorization: Bearer {{token}}
```

```json
{
  "name": "Morning walk",
  "description": "Walk for 20 minutes after waking up.",
  "category": "HEALTH",
  "frequency": "DAILY",
  "difficulty": "EASY",
  "targetDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  "targetTimesPerDay": 1,
  "reminderTime": "07:30",
  "goalId": "{{goalId}}"
}
```

**Expected (201)** — returns the created habit with linked `goal`, recent `completions`, and `plannerItems`.

---

## 5. Get Habit by ID

```text
GET {{baseUrl}}/habits/{{habitId}}
Authorization: Bearer {{token}}
```

---

## 6. Update Habit

```text
PATCH {{baseUrl}}/habits/{{habitId}}
Authorization: Bearer {{token}}
```

```json
{
  "difficulty": "MEDIUM",
  "reminderTime": "08:00"
}
```

You can also link or unlink a goal:

```json
{
  "goalId": "{{goalId}}"
}
```

```json
{
  "goalId": null
}
```

---

## 7. Complete Habit for Today

```text
POST {{baseUrl}}/habits/{{habitId}}/complete
Authorization: Bearer {{token}}
```

```json
{
  "notes": "Done after breakfast"
}
```

Optional custom date:

```json
{
  "date": "2026-07-04",
  "notes": "Completed manually"
}
```

> Completing a linked habit automatically refreshes the parent goal progress.

---

## 8. Undo Completion

```text
DELETE {{baseUrl}}/habits/{{habitId}}/complete
Authorization: Bearer {{token}}
```

```json
{
  "date": "2026-07-04"
}
```

If no date is provided, today is used.

---

## 9. Skip Habit

```text
POST {{baseUrl}}/habits/{{habitId}}/skip
Authorization: Bearer {{token}}
```

```json
{
  "reason": "Travel day"
}
```

This resets `currentStreak` to `0`.

---

## 10. Pause / Activate Toggle

```text
PATCH {{baseUrl}}/habits/{{habitId}}/pause
Authorization: Bearer {{token}}
```

Toggles `ACTIVE` ↔ `PAUSED`.

---

## 11. Mark Habit Status Completed

This is for ending the habit itself, not daily check-in completion.

```text
PATCH {{baseUrl}}/habits/{{habitId}}/complete-status
Authorization: Bearer {{token}}
```

Sets `status = COMPLETED` and `isActive = false`.

---

## 12. Get Habit History

```text
GET {{baseUrl}}/habits/{{habitId}}/history?days=30
Authorization: Bearer {{token}}
```

---

## 13. Delete Habit

```text
DELETE {{baseUrl}}/habits/{{habitId}}
Authorization: Bearer {{token}}
```

Deletes the habit and its completion records.

---

## 14. AI — Generate Single Habit

```text
POST {{baseUrl}}/habits/ai/generate
Authorization: Bearer {{token}}
```

```json
{
  "prompt": "Help me build a consistent reading habit",
  "category": "LEARNING",
  "goalId": "{{goalId}}"
}
```

**Expected (201)** — creates and returns one new habit.

---

## 15. AI — Improve Habit

Improves the **specific habit** identified by `{{habitId}}` in the URL.

```text
POST {{baseUrl}}/habits/{{habitId}}/ai/improve
Authorization: Bearer {{token}}
```

```json
{
  "instructions": "Make it easier to follow every weekday morning"
}
```

**How it works**

1. Loads the habit by `{{habitId}}` and logged-in user.
2. Sends that habit's current name, description, frequency, difficulty, target days, and reminder time to AI.
3. Updates only that habit row.
4. Returns the updated habit with the same `id`.

---

## 16. Test Habit Email

```text
POST {{baseUrl}}/habits/test/email
Authorization: Bearer {{token}}
```

```json
{
  "emailType": "single",
  "habitId": "{{habitId}}"
}
```

Valid `emailType`: `daily`, `milestone`, `streak-risk`, `single`.

---

## Field Rules

**Valid categories:** `CAREER`, `HEALTH`, `FINANCE`, `FITNESS`, `WELLNESS`, `PRODUCTIVITY`, `PERSONAL`, `EDUCATION`

> UI label "All Category" is a filter only — do not send it as a stored category value.

**Valid frequency:** `DAILY`, `WEEKLY`, `MONTHLY`

**Valid difficulty:** `EASY`, `MEDIUM`, `HARD`

**Valid status:** `ACTIVE`, `PAUSED`, `COMPLETED`

**Reminder time:** `HH:mm`, for example `07:30`

---

## Architecture Notes (MVP)

- **Habit** = repeated routine; optional `goalId`.
- **Goal progress** auto-refreshes when linked habits are completed, updated, unlinked, skipped, or deleted.
- **Planner** (`PlannerItem`) remains the scheduling layer only.
- Daily completion is stored in `HabitCompletion`; it does not overwrite habit content.

---

## Quick Test Flow

1. Login → save `token`.
2. `POST /habits` → save `habitId`.
3. `GET /habits/summary`.
4. `POST /habits/:id/complete`.
5. `GET /habits/:id/history`.
6. `POST /habits/:id/ai/improve`.
7. `PATCH /habits/:id/pause`.
