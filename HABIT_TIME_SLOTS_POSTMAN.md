# Habit Time Slots — Postman Testing

Each time a habit is done on the same day gets its **own From Time and To Time**. Slots are **not** merged into one range like `7:00 AM – 8:00 PM +3`.

---

## 0. Apply the schema change

From the project root:

```bash
npx prisma generate
npx prisma db push
```

If `db push` is not allowed, run the SQL manually:

```bash
psql "$DATABASE_URL" -f prisma/sql/add_habit_time_slots.sql
npx prisma generate
```

Then restart the server:

```bash
npm run dev
```

---

## Postman environment

| Variable      | Example                            |
| ------------- | ---------------------------------- |
| `baseUrl`     | `http://localhost:3000/api/v1`     |
| `token`       | set after login                    |
| `habitId`     | set after create                   |
| `slotId1`     | first `habit.timeSlots[0].id`      |
| `slotId2`     | second slot id                     |
| `slotId3`     | third slot id                      |
| `plannerDate` | `2026-09-07`                       |

Header on every request:

```text
Authorization: Bearer {{token}}
Content-Type: application/json
```

---

## STEP 1 — Login

```text
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
const token = res.token || res.data?.token || res.accessToken;
if (token) pm.environment.set("token", token);
```

---

Manual `POST /habits` does **not** create time slots. Multi-slots are AI-only, when the prompt has keywords like `2 times`, `3 times`, `4 times`, `twice`, or `multiple times`.

## STEP 2A — Manual create (no slots)

```text
POST {{baseUrl}}/habits
```

```json
{
  "name": "Drink Water",
  "description": "Hydrate throughout the day",
  "category": "HEALTH",
  "frequency": "DAILY",
  "difficulty": "EASY"
}
```

**Expected 201** — `habit.timeSlots` is `[]`, `targetTimesPerDay` is `1`.

## STEP 2B — AI create with "3 times" (separate slots)

```text
POST {{baseUrl}}/habits/ai/generate
```

```json
{
  "prompt": "Drink water 3 times a day",
  "category": "HEALTH"
}
```

Other prompts that should create slots:

- `"Walk twice a day"` → 2 slots
- `"Meditate 4 times daily"` → 4 slots
- `"Stretch multiple times a day"` → 3 slots

Prompts that should **not** create slots:

- `"Go to the gym"`
- `"Read before bed"`

**Expected 201** for `3 times`:

- `habit.source` = `AI`
- `habit.targetTimesPerDay` = `3`
- `habit.timeSlots` has **3 items** with distinct `fromTime` / `toTime`
- Times are **not** combined into `07:00–20:00 +3`

**Tests tab**

```javascript
const res = pm.response.json();
const habit = res.habit;
pm.test("AI 3x habit has 3 slots", () => {
  pm.expect(habit.timeSlots.length).to.eql(3);
  pm.expect(habit.targetTimesPerDay).to.eql(3);
});
pm.environment.set("habitId", habit.id);
pm.environment.set("slotId1", habit.timeSlots[0].id);
pm.environment.set("slotId2", habit.timeSlots[1].id);
pm.environment.set("slotId3", habit.timeSlots[2].id);
```

---

## STEP 2C — AI create for a week (7 days from today)

```text
POST {{baseUrl}}/habits/ai/generate
```

```json
{
  "prompt": "Make a morning stretch habit for a week",
  "category": "HEALTH"
}
```

**Expected 201**

- `habit.startDate` = today
- `habit.endDate` = today + 6 days
- `habit.schedule.durationDays` = `7`
- `habit.targetDays` has the 7 weekdays in that range

Other prompts:

| Prompt | Start | Length |
| ------ | ----- | ------ |
| `Walk for a week` | today | 7 days |
| `Meditate for 7 days` | today | 7 days |
| `Gym for a week from Monday` | next Monday (or today if Monday) | 7 days |
| `Read from 2026-09-15 for a week` | 2026-09-15 | 7 days |
| `Yoga starting Thursday` | that Thursday | 1 day unless “week” is also said |

**Tests tab**

```javascript
const res = pm.response.json();
const habit = res.habit;
pm.test("week habit has a 7-day window", () => {
  pm.expect(habit.startDate).to.not.eql(null);
  pm.expect(habit.endDate).to.not.eql(null);
  pm.expect(habit.schedule.durationDays).to.eql(7);
});
pm.environment.set("habitId", habit.id);
```

---

## STEP 3 — Get habit by ID (confirm slots stay separate)

```text
GET {{baseUrl}}/habits/{{habitId}}
```

**Expected 200** — same 3 `timeSlots`.

---

## STEP 4 — Overlapping slots must fail

```text
POST {{baseUrl}}/habits
```

```json
{
  "name": "Bad Overlap",
  "category": "HEALTH",
  "timeSlots": [
    { "fromTime": "07:00", "toTime": "08:00" },
    { "fromTime": "07:30", "toTime": "08:30" }
  ]
}
```

**Expected 400** — `"Time slots cannot overlap..."`

---

## STEP 5 — Update slots (replace all)

```text
PATCH {{baseUrl}}/habits/{{habitId}}
```

```json
{
  "timeSlots": [
    { "fromTime": "08:00", "toTime": "08:20" },
    { "fromTime": "13:00", "toTime": "13:20" },
    { "fromTime": "19:00", "toTime": "19:20" }
  ]
}
```

**Expected 200** — new From/To values, still 3 separate slots.

Re-save `slotId1` / `slotId2` / `slotId3` from this response (IDs change on replace).

---

## STEP 6 — Complete one slot (not the whole day)

```text
POST {{baseUrl}}/habits/{{habitId}}/complete
```

```json
{
  "timeSlotId": "{{slotId1}}",
  "notes": "Morning glass"
}
```

**Expected 200** — `alreadyCompleted: false`

Call again with the **same** `timeSlotId`:

**Expected 200** — `alreadyCompleted: true`

Complete the other two slots:

```json
{ "timeSlotId": "{{slotId2}}" }
```

```json
{ "timeSlotId": "{{slotId3}}" }
```

After all 3, a fourth complete without `timeSlotId` should return `alreadyCompleted: true` (all slots done for today).

---

## STEP 7 — Undo one slot

```text
DELETE {{baseUrl}}/habits/{{habitId}}/complete
```

```json
{
  "timeSlotId": "{{slotId2}}"
}
```

**Expected 200** — only that slot’s check-in is removed.

---

## STEP 8 — History includes `timeSlotId`

```text
GET {{baseUrl}}/habits/{{habitId}}/history?days=7
```

Each row can include `timeSlotId` so the UI can mark that window done.

---

## STEP 9 — Schedule each slot on the planner (not one combined card)

```text
POST {{baseUrl}}/planner
```

**Slot 1**

```json
{
  "itemType": "HABIT",
  "habitId": "{{habitId}}",
  "habitTimeSlotId": "{{slotId1}}",
  "date": "{{plannerDate}}",
  "viewType": "DAILY"
}
```

**Slot 2**

```json
{
  "itemType": "HABIT",
  "habitId": "{{habitId}}",
  "habitTimeSlotId": "{{slotId2}}",
  "date": "{{plannerDate}}",
  "viewType": "DAILY"
}
```

**Slot 3**

```json
{
  "itemType": "HABIT",
  "habitId": "{{habitId}}",
  "habitTimeSlotId": "{{slotId3}}",
  "date": "{{plannerDate}}",
  "viewType": "DAILY"
}
```

If `startTime` / `endTime` are omitted, they are copied from the slot’s `fromTime` / `toTime`.

---

## STEP 10 — Board shows 3 distinct ranges

```text
GET {{baseUrl}}/planner/board?viewType=DAILY&date={{plannerDate}}
```

**Expected**

- 3 `HABIT` cards for the same habit
- Different `startTime` / `endTime` (or `fromTime` / `toTime`)
- `habitTimeSlotId` unique per card
- Progress per card is `0/1` or `1/1`, **not** `1/3` on a single merged block

---

## STEP 11 — List habits (Habits Board payload)

```text
GET {{baseUrl}}/habits?status=ACTIVE
```

Use `habit.timeSlots[]` in the UI:

| Slot | Show as              |
| ---- | -------------------- |
| 1    | `8:00 AM - 8:20 AM`  |
| 2    | `1:00 PM - 1:20 PM`  |
| 3    | `7:00 PM - 7:20 PM`  |

Do **not** render `8:00 AM - 7:20 PM +3`.

---

## Field reference

### Create / update body

| Field        | Type                         | Notes                                      |
| ------------ | ---------------------------- | ------------------------------------------ |
| `timeSlots`  | `{ fromTime, toTime }[]`     | 1–20 items, HH:mm, no overlaps             |
| `fromTime`   | `HH:mm`                      | start of that occurrence                   |
| `toTime`     | `HH:mm`                      | must be after `fromTime`                   |

If `timeSlots` is omitted, the API generates windows from `reminderTime` + `targetTimesPerDay` (still **separate** slots, not one combined range).

`targetTimesPerDay` is set to `timeSlots.length`.

### Complete body

| Field        | Type   | Notes                                      |
| ------------ | ------ | ------------------------------------------ |
| `timeSlotId` | UUID   | which From/To window was done              |
| `date`       | ISO    | optional; defaults to today                |
| `notes`      | string | optional                                   |

Without `timeSlotId`, the next incomplete slot for that day is completed.

### Planner body extra

| Field             | Type | Notes                                      |
| ----------------- | ---- | ------------------------------------------ |
| `habitTimeSlotId` | UUID | pins this calendar card to one slot        |
