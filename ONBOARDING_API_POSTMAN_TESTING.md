# Onboarding API — Postman Testing

After register, the user completes the setup wizard (focus areas → routine → schedule → AI style), then taps **Generate My Plan**. The backend creates **pending AI suggestions** for goals, tasks, habits, and planner. The user can **Accept**, **Dismiss**, or **Regenerate** (goals/tasks/habits only; planner is accept/dismiss only).

Base URL: `{{baseUrl}}` = `http://localhost:3000/api/v1`  
Auth: `Authorization: Bearer {{token}}`

---

## Flow overview

```
Register / Login
    → GET  /onboarding
    → PUT  /onboarding/step   (steps 1–5)
    → POST /onboarding/generate
    → GET  /onboarding/suggestions
    → POST /onboarding/suggestions/:id/accept | dismiss | regenerate
```

**Steps**

| Step | Screen | What to save |
|------|--------|----------------|
| 1 | Start | `{ "step": 1, "markStart": true }` |
| 2 | Goals / Focus | `focusAreas` (min 2) + `primaryFocus` |
| 3 | Routine | `routineType` |
| 4 | Schedule | `dayStartTime`, `dayEndTime` |
| 5 | Style | `aiCommunicationStyle` |
| — | Generate | `POST /onboarding/generate` |

---

## Valid option values

**focusAreas / primaryFocus**

- Career Growth
- Physical Fitness
- Mental Clarity
- Reduce Stress
- Productivity
- Healthy Habits

**routineType**

- Corporate Professional
- Remote Freelancer
- Full-time Student
- Entrepreneur
- Creative Artist
- Stay-at-home Parent

**aiCommunicationStyle**

- Direct & Goal-Oriented
- Structured & Analytical
- Supportive & Encouraging
- Calm & Balanced

---

## 1. Get onboarding status

```
GET {{baseUrl}}/onboarding
Authorization: Bearer {{token}}
```

Returns current step, profile, pending suggestion count, and valid option lists.

---

## 2. Step 1 — Start

```
PUT {{baseUrl}}/onboarding/step
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "step": 1,
  "markStart": true
}
```

---

## 3. Step 2 — Focus areas

```
PUT {{baseUrl}}/onboarding/step
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "step": 2,
  "focusAreas": ["Career Growth", "Physical Fitness"],
  "primaryFocus": "Career Growth"
}
```

---

## 4. Step 3 — Routine

```
PUT {{baseUrl}}/onboarding/step
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "step": 3,
  "routineType": "Full-time Student"
}
```

---

## 5. Step 4 — Schedule

```
PUT {{baseUrl}}/onboarding/step
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "step": 4,
  "dayStartTime": "06:30",
  "dayEndTime": "22:30"
}
```

`06:30 AM` / `10:30 PM` style values are also accepted.

These times become the user's **day window**. On generate/accept/regenerate, the backend **clamps**:

- planner `startTime` / `endTime`
- habit `reminderTime`
- task `dueTime` (if present)

so nothing is scheduled outside that range. Goal `targetDate` is a date only (not a clock time).

---

## 6. Step 5 — Communication style

```
PUT {{baseUrl}}/onboarding/step
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "step": 5,
  "aiCommunicationStyle": "Supportive & Encouraging"
}
```

---

## 7. Generate My Plan

Requires `OPENAI_API_KEY` and at least 2 focus areas saved.

```
POST {{baseUrl}}/onboarding/generate
Authorization: Bearer {{token}}
```

**Expected:** `201`

Response includes:

- `batchId`
- `byType` counts (`goals`, `tasks`, `habits`, `planner`)
- `suggestions[]` — each has `suggestionId`, `type`, `title`, `proposedGoal` / `proposedTask` / `proposedHabit` / `planner`

Also sets `onboardingCompleted = true`.

Save a `suggestionId` from the response for the next calls.

---

## 8. List suggestions

```
GET {{baseUrl}}/onboarding/suggestions?status=pending
Authorization: Bearer {{token}}
```

**Query params**

| Param | Values | Default |
|-------|--------|---------|
| `status` | `pending` \| `applied` \| `dismissed` \| `all` | `pending` |
| `type` | `GOAL` \| `TASK` \| `HABIT` \| `PLAN_ADJUSTMENT` | all onboarding types |

Examples:

```
GET {{baseUrl}}/onboarding/suggestions?type=GOAL&status=pending
GET {{baseUrl}}/onboarding/suggestions?type=TASK&status=pending
GET {{baseUrl}}/onboarding/suggestions?type=HABIT&status=pending
GET {{baseUrl}}/onboarding/suggestions?type=PLAN_ADJUSTMENT&status=pending
```

---

## 9. Accept suggestion

Creates the real Goal / Task / Habit / Planner items.

```
POST {{baseUrl}}/onboarding/suggestions/{{suggestionId}}/accept
Authorization: Bearer {{token}}
```

- **GOAL** → creates goal + nested proposed tasks/habits  
- **TASK** → creates task  
- **HABIT** → creates habit  
- **PLAN_ADJUSTMENT** → creates tasks/habits for placements (if needed) and schedules them on the planner  

---

## 10. Dismiss suggestion

```
POST {{baseUrl}}/onboarding/suggestions/{{suggestionId}}/dismiss
Authorization: Bearer {{token}}
```

---

## 11. Regenerate suggestion

Supported for **GOAL**, **TASK**, **HABIT** only (not planner).

```
POST {{baseUrl}}/onboarding/suggestions/{{suggestionId}}/regenerate
Authorization: Bearer {{token}}
```

Dismisses the old suggestion and returns a new pending one.

Planner regenerate returns `400` — use accept or dismiss only.

---

## Quick Postman checklist

1. Register / login → copy `token`
2. `PUT /onboarding/step` for steps 1–5 (bodies above)
3. `POST /onboarding/generate` → copy several `suggestionId`s
4. `GET /onboarding/suggestions?status=pending`
5. Accept one GOAL, one TASK, one HABIT
6. Accept or dismiss the planner suggestion
7. Regenerate one TASK suggestion
8. Confirm created items via:
   - `GET {{baseUrl}}/goals`
   - `GET {{baseUrl}}/tasks`
   - `GET {{baseUrl}}/habits`
   - `GET {{baseUrl}}/planner?...` (existing planner board endpoints)

---

## Notes

- Suggestions are stored in `AiRecommendation` with `reasoning.source = "ONBOARDING"`.
- Real entities are created **only on Accept**.
- Calling `POST /onboarding/generate` again dismisses previous pending onboarding suggestions and creates a new batch.
- Requires working OpenAI key (`OPENAI_API_KEY` in `.env`).
- After schema changes, run `npx prisma generate` (stop `npm run dev` first if Windows locks the Prisma engine file).
