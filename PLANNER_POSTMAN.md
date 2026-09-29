# Elyxa Planner — Postman Guide

New testing file for the Planner API. Use this in Postman to check the client flow.

**Base URL:** `{{baseUrl}}` = `http://localhost:3000/api/v1`  
**Auth header on every request:** `Authorization: Bearer {{token}}`

```
Planner Setup
  → AI reads goals, routine, time + existing Tasks/Habits
  → AI creates missing items and organizes existing ones
  → User confirms
  → Tasks + Habits are saved
  → Planner shows the schedule
```

- **Task** = one-time work  
- **Habit** = repeating  
- Manual create still works: `POST /tasks` and `POST /habits`

---

## Postman setup

| Variable        | Example                        |
| --------------- | ------------------------------ |
| `baseUrl`       | `http://localhost:3000/api/v1` |
| `token`         | from login                     |
| `suggestionId`  | from generate / suggest        |
| `plannerItemId` | from board / accept            |
| `taskId`        | from accept or `POST /tasks`   |
| `habitId`       | from accept or `POST /habits`  |
| `today`         | `2026-09-29` (`YYYY-MM-DD`)    |

**Rules**

- Collection auth: Bearer Token `{{token}}`
- **GET → Body = none** (URL only in the address bar)
- **POST/PATCH → Body = raw JSON**
- Header: `Content-Type: application/json`

### Login

```http
POST {{baseUrl}}/auth/login
```

```json
{
  "email": "you@example.com",
  "password": "your-password"
}
```

**Tests tab**

```javascript
const res = pm.response.json();
if (res.data && res.data.token) {
  pm.environment.set("token", res.data.token);
}
```

---

## 1. New user — Generate → Accept (main flow)

Nothing is saved until Accept.

### 1.1 Preview plan

```http
POST {{baseUrl}}/planner/ai/suggest
```

```json
{
  "action": "GENERATE_PLAN",
  "viewType": "DAILY",
  "date": "{{today}}",
  "message": "Morning fitness, deep work after 10am, short evening review"
}
```

**Tests tab**

```javascript
const res = pm.response.json();
if (res.suggestionId) pm.environment.set("suggestionId", res.suggestionId);
```

**Expect 200**

- `suggestionId`
- `placements` with TASK and/or HABIT
- `/tasks` and `/habits` still unchanged

### 1.2 Open pending suggestion

```http
GET {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}
```

Body: none. Expect `status: "pending"`.

### 1.3 Confirm / Accept

```http
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/accept
```

No body.

**Tests tab**

```javascript
const res = pm.response.json();
const items = res.items || [];
const task = items.find((i) => i.itemType === "TASK" && i.taskId);
const habit = items.find((i) => i.itemType === "HABIT" && i.habitId);
if (task) {
  pm.environment.set("taskId", task.taskId);
  pm.environment.set("plannerItemId", task.id);
}
if (habit) pm.environment.set("habitId", habit.habitId);
```

**Expect 200** — Tasks/Habits saved and placed on the board. Look at `created` and `reused`.

### 1.4 Verify

```http
GET {{baseUrl}}/tasks
GET {{baseUrl}}/habits
GET {{baseUrl}}/planner/board?viewType=DAILY&date={{today}}
GET {{baseUrl}}/planner/available?date={{today}}
GET {{baseUrl}}/tasks/{{taskId}}
GET {{baseUrl}}/habits/{{habitId}}
GET {{baseUrl}}/planner/{{plannerItemId}}
```

**Pass if** new items are in Tasks, Habits, **and** Planner board.

---

## 2. Existing user — no duplicates

Run section 1 again on the same account.

```http
POST {{baseUrl}}/planner/ai/suggest
```

```json
{
  "action": "GENERATE_PLAN",
  "viewType": "DAILY",
  "date": "{{today}}",
  "message": "Keep my current fitness habit and organize remaining work"
}
```

```http
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/accept
```

**Pass if**

- `reused.tasks` / `reused.habits` > 0 when similar items already exist
- same title is not created twice
- only missing work is added as new Task/Habit

---

## 3. Recalibrate — reschedule only

Do this after a plan exists. Count `/tasks` and `/habits` first.

```http
GET {{baseUrl}}/tasks
GET {{baseUrl}}/habits
```

```http
POST {{baseUrl}}/planner/ai/suggest
```

```json
{
  "action": "RECALIBRATE_DAY",
  "viewType": "DAILY",
  "date": "{{today}}"
}
```

```http
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/accept
```

**Pass if**

- board times changed
- `created.tasks` and `created.habits` are `0`
- task/habit lists did not grow

Same suggest → accept pattern for:

```json
{ "action": "REDUCE_OVERLOAD", "viewType": "DAILY", "date": "{{today}}" }
```

```json
{ "action": "OPTIMIZE_SCHEDULE", "viewType": "DAILY", "date": "{{today}}" }
```

```json
{ "action": "BALANCE_SCHEDULE", "viewType": "WEEKLY", "date": "{{today}}" }
```

```json
{ "action": "FREE_EVENING", "viewType": "DAILY", "date": "{{today}}" }
```

```json
{
  "action": "CHAT",
  "viewType": "DAILY",
  "date": "{{today}}",
  "message": "Move my workout earlier and leave the evening free"
}
```

Optional (Ultimate): `"energyLevel": "LOW"` | `"MEDIUM"` | `"HIGH"`

---

## 4. Create Plan modal (saves immediately)

No Accept step. This request **is** the confirm.

```http
POST {{baseUrl}}/planner/create-plan
```

**Today**

```json
{
  "prompt": "Need to update my portfolio and organize project case studies",
  "dateRange": "TODAY"
}
```

**This week** (today → today + 6 days)

```json
{
  "prompt": "Prepare for a job interview and keep daily fitness",
  "dateRange": "THIS_WEEK"
}
```

**This month**

```json
{
  "prompt": "Build a consistent fitness routine",
  "dateRange": "THIS_MONTH"
}
```

**Custom**

```json
{
  "prompt": "Plan my product launch tasks",
  "dateRange": "CUSTOM",
  "startDate": "{{today}}",
  "endDate": "2026-10-05"
}
```

**Expect 201** with `created`, `reused`, `coverage`, `items`, `board`.

Then check:

```http
GET {{baseUrl}}/tasks
GET {{baseUrl}}/habits
GET {{baseUrl}}/planner/board?viewType=WEEKLY&date={{today}}
```

| `dateRange`  | Meaning                          |
| ------------ | -------------------------------- |
| `TODAY`      | today                            |
| `THIS_WEEK`  | today through today + 6 days     |
| `THIS_MONTH` | current month                    |
| `CUSTOM`     | needs `startDate` + `endDate`    |

---

## 5. Dismiss / Undo / Adjust

### Dismiss pending suggestion

```http
POST {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}/dismiss
```

Board stays the same. Tasks/Habits not created.

### Undo last accepted schedule

```http
POST {{baseUrl}}/planner/ai/undo
```

Restores previous **planner** times. Saved Tasks/Habits stay.

### Adjust pending suggestion

```http
PATCH {{baseUrl}}/planner/ai/suggestions/{{suggestionId}}
```

Existing item:

```json
{
  "message": "Keep morning, drop late evening",
  "placements": [
    {
      "itemType": "TASK",
      "taskId": "{{taskId}}",
      "date": "{{today}}",
      "startTime": "10:00",
      "endTime": "11:00",
      "viewType": "DAILY",
      "orderIndex": 0
    }
  ]
}
```

New item (not saved yet):

```json
{
  "placements": [
    {
      "itemType": "TASK",
      "date": "{{today}}",
      "startTime": "09:00",
      "endTime": "10:00",
      "viewType": "DAILY",
      "newTask": {
        "title": "Write case study outline",
        "description": "One-page outline",
        "priority": "HIGH",
        "category": "CAREER",
        "estimatedMinutes": 60
      }
    }
  ]
}
```

---

## 6. Manual Task / Habit / schedule

Still required. Independent from AI.

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

```http
POST {{baseUrl}}/planner
```

```json
{
  "itemType": "TASK",
  "taskId": "{{taskId}}",
  "date": "{{today}}",
  "startTime": "06:00",
  "endTime": "07:00",
  "viewType": "DAILY",
  "orderIndex": 0
}
```

```json
{
  "itemType": "HABIT",
  "habitId": "{{habitId}}",
  "date": "{{today}}",
  "startTime": "07:00",
  "endTime": "07:30",
  "viewType": "DAILY"
}
```

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
      "date": "{{today}}",
      "startTime": "06:00",
      "endTime": "07:00"
    },
    {
      "itemType": "HABIT",
      "habitId": "{{habitId}}",
      "date": "{{today}}",
      "startTime": "07:00",
      "endTime": "07:30"
    }
  ]
}
```

```http
PATCH {{baseUrl}}/planner/{{plannerItemId}}
```

```json
{
  "startTime": "08:00",
  "endTime": "08:45",
  "orderIndex": 1
}
```

```http
PATCH {{baseUrl}}/planner/{{plannerItemId}}/complete
```

Planner complete does **not** complete the linked task/habit.

```http
DELETE {{baseUrl}}/planner/{{plannerItemId}}
```

Removes the slot only. Task/Habit remain:

```http
GET {{baseUrl}}/tasks/{{taskId}}
GET {{baseUrl}}/habits/{{habitId}}
```

---

## 7. Board / list / chat

Body = none.

```http
GET {{baseUrl}}/planner/summary?date={{today}}
GET {{baseUrl}}/planner/board?viewType=DAILY&date={{today}}
GET {{baseUrl}}/planner/board?viewType=WEEKLY&date={{today}}
GET {{baseUrl}}/planner/board?viewType=MONTHLY&date={{today}}
GET {{baseUrl}}/planner/available?date={{today}}
GET {{baseUrl}}/planner?viewType=DAILY&date={{today}}
GET {{baseUrl}}/planner/{{plannerItemId}}
GET {{baseUrl}}/planner/ai/suggestions?status=pending
GET {{baseUrl}}/planner/ai/suggestions?status=applied
GET {{baseUrl}}/planner/ai/suggestions?status=all
GET {{baseUrl}}/planner/ai/chat
DELETE {{baseUrl}}/planner/ai/chat
```

List filters: `itemType=TASK|HABIT`, `startDate`, `endDate`, `aiScheduled=true`.

---

## Action map

| UI                    | Request                         | Creates Task/Habit? | When saved      |
| --------------------- | ------------------------------- | ------------------- | --------------- |
| Generate a plan       | `GENERATE_PLAN`                 | Yes, reuse first    | Accept          |
| Recalibrate my day    | `RECALIBRATE_DAY`               | No                  | Accept          |
| Reduce overload       | `REDUCE_OVERLOAD`               | No                  | Accept          |
| Optimize schedule     | `OPTIMIZE_SCHEDULE`             | No                  | Accept          |
| Balance my schedule   | `BALANCE_SCHEDULE`              | No                  | Accept          |
| Free up my evening    | `FREE_EVENING`                  | No                  | Accept          |
| Chat                  | `CHAT`                          | No                  | Accept          |
| + Create Plan         | `POST /planner/create-plan`     | Yes, reuse first    | Immediately     |

---

## Valid values

| Field          | Values |
| -------------- | ------ |
| `itemType`     | `TASK`, `HABIT` |
| `viewType`     | `DAILY`, `WEEKLY`, `MONTHLY` |
| `dateRange`    | `TODAY`, `THIS_WEEK`, `THIS_MONTH`, `CUSTOM` |
| `action`       | `GENERATE_PLAN`, `RECALIBRATE_DAY`, `REDUCE_OVERLOAD`, `OPTIMIZE_SCHEDULE`, `BALANCE_SCHEDULE`, `FREE_EVENING`, `CHAT` |
| `energyLevel`  | `LOW`, `MEDIUM`, `HIGH` |
| time           | `HH:mm` e.g. `09:00` |
| Task category  | `CAREER`, `HEALTH`, `FINANCE`, `PERSONAL`, `EDUCATION` |
| Habit category | `CAREER`, `HEALTH`, `FINANCE`, `FITNESS`, `WELLNESS`, `PRODUCTIVITY`, `PERSONAL`, `EDUCATION` |

---

## If a request fails

| Error | Cause |
| ----- | ----- |
| `400 Unexpected token 'h' ... is not valid JSON` | GET Body is not **none** |
| `401` | missing/expired token |
| Generate did not add Tasks | you did not call **Accept** |
| Recalibrate added new Tasks | fail — it must only move existing items |
| `503` OpenAI | set `OPENAI_API_KEY` in `.env` |

---

## Postman folder order

1. Login  
2. `POST /planner/ai/suggest` `GENERATE_PLAN`  
3. `GET /planner/ai/suggestions/{{suggestionId}}`  
4. Accept  
5. `GET /tasks` + `GET /habits` + `GET /planner/board`  
6. Generate again (duplicate check)  
7. Recalibrate + Accept  
8. `POST /planner/create-plan` `THIS_WEEK`  
9. Manual task + schedule + complete + delete slot  
10. Undo  
