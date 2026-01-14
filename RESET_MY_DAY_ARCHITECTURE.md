# Reset My Day - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Dashboard                                                       │
│  ┌────────────────────────────────────────────┐                │
│  │  Today's Plan                              │                │
│  │  ┌──────────────────────────────────────┐ │                │
│  │  │  📋 Morning Routine                   │ │                │
│  │  │  ☐ Review emails                      │ │                │
│  │  │  ☐ Team standup                       │ │                │
│  │  │                                        │ │                │
│  │  │  📋 Afternoon Tasks                   │ │                │
│  │  │  ☑ Finish Q1 report (2/3 done)       │ │                │
│  │  │  ☐ Code review                        │ │                │
│  │  │  ☐ Client meeting                     │ │                │
│  │  └──────────────────────────────────────┘ │                │
│  │                                             │                │
│  │  🔄 Reset My Day    ← Main Button         │                │
│  │  "Life happened. We'll adapt."             │                │
│  └────────────────────────────────────────────┘                │
│                                                                 │
│  When Clicked:                                                  │
│  ┌─────────────────────────────────────────────────┐          │
│  │  Modal: Let's reset your day                    │          │
│  │  No guilt. Just a smarter plan.                 │          │
│  │                                                  │          │
│  │  What changed today? (optional)                 │          │
│  │  ○ Low energy                                   │          │
│  │  ○ Unexpected meetings                          │          │
│  │  ○ Lost focus / procrastinated                  │          │
│  │  ● Personal stuff                               │          │
│  │  ○ Just one of those days                       │          │
│  │                                                  │          │
│  │  [Skip]  [Continue]                             │          │
│  └─────────────────────────────────────────────────┘          │
│                      │                                          │
│                      ▼                                          │
└──────────────────────┼──────────────────────────────────────────┘
                       │
                       │ POST /api/daily-plans/reset
                       │ { reason: "PERSONAL_STUFF" }
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                      BACKEND API                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  dailyPlanController.resetMyDay()                               │
│  ┌──────────────────────────────────────────────┐              │
│  │  1. Validate request & authenticate          │              │
│  │  2. Find daily plan (today or specified)     │              │
│  │  3. Check authorization                       │              │
│  │  4. Snapshot current plan (before)            │              │
│  │  5. Get user settings/context                 │              │
│  └──────────────────┬───────────────────────────┘              │
│                     │                                            │
│                     ▼                                            │
│  openaiService.resetDailyPlan()                                 │
│  ┌──────────────────────────────────────────────┐              │
│  │  AI Adaptation Logic:                        │              │
│  │  • Analyze current progress                  │              │
│  │  • Identify top 2-3 priorities               │              │
│  │  • Defer non-urgent tasks                    │              │
│  │  • Break down complex tasks                  │              │
│  │  • Adjust time blocks                        │              │
│  │  • Add buffer time                           │              │
│  │  • Generate encouragement                    │              │
│  └──────────────────┬───────────────────────────┘              │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────┐              │
│  │  Update Database:                            │              │
│  │  • Update DailyPlan content                  │              │
│  │  • Increment resetCount                      │              │
│  │  • Set lastResetAt timestamp                 │              │
│  │  • Create DailyPlanReset record              │              │
│  └──────────────────┬───────────────────────────┘              │
│                     │                                            │
│                     │ Response with adapted plan                │
└─────────────────────┼───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Processing Animation:                                          │
│  ┌─────────────────────────────────────────────────┐          │
│  │  ✔ Keeping top 2 priorities                     │          │
│  │  ✔ Deferring non-urgent tasks                   │          │
│  │  ✔ Breaking tasks into smaller steps            │          │
│  │  ✔ Adjusting focus blocks                       │          │
│  └─────────────────────────────────────────────────┘          │
│                      │                                          │
│                      ▼                                          │
│  Adapted Plan Reveal:                                           │
│  ┌─────────────────────────────────────────────────┐          │
│  │  ✅ Your day has been reset to match reality    │          │
│  │                                                  │          │
│  │  📋 Updated Plan:                               │          │
│  │  • Finish Q1 report - Section 1 only           │          │
│  │  • Review top 3 emails (deferred rest)         │          │
│  │  • 15-min client check-in (was 1hr meeting)    │          │
│  │                                                  │          │
│  │  Deferred to Tomorrow:                          │          │
│  │  • Code review                                  │          │
│  │  • Team standup prep                            │          │
│  │                                                  │          │
│  │  "Life happened. We've adapted. Let's make     │          │
│  │   progress."                                    │          │
│  │                                                  │          │
│  │  [View Updated Plan]                            │          │
│  └─────────────────────────────────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
User Action
    │
    ▼
┌─────────────────────┐
│  Click "Reset My    │
│  Day" Button        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Show Reason Modal  │
│  (Optional)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  POST /api/daily-plans/reset            │
│  {                                       │
│    "reason": "PERSONAL_STUFF",          │
│    "customReason": "Family emergency",  │
│    "triggerType": "manual"              │
│  }                                       │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Backend Validation                     │
│  • Check auth                           │
│  • Verify plan exists                   │
│  • Validate reason                      │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Snapshot Current State                 │
│  previousContent = currentPlan.content  │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  AI Adaptation (OpenAI)                 │
│  • Context: reason, time, progress      │
│  • Analysis: priorities, urgency        │
│  • Output: adapted plan + summary       │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Update Database                        │
│  1. Update DailyPlan:                   │
│     - content = adapted                 │
│     - resetCount++                      │
│     - lastResetAt = now                 │
│  2. Create DailyPlanReset:              │
│     - previousContent                   │
│     - newContent                        │
│     - reason, summary                   │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Return Response                        │
│  {                                       │
│    "success": true,                     │
│    "data": {                            │
│      "plan": { adapted plan },          │
│      "reset": { reset record },         │
│      "adaptationSteps": [...],          │
│      "encouragement": "..."             │
│    }                                     │
│  }                                       │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Frontend Receives  │
│  Adapted Plan       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Show Processing    │
│  Animation          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Reveal New Plan    │
│  with Encouragement │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Update Dashboard   │
│  Display            │
└─────────────────────┘
```

---

## Database Relationships

```
┌─────────────────────────────────────────┐
│              User                       │
├─────────────────────────────────────────┤
│ id                                      │
│ email                                   │
│ fullName                                │
│ ...                                     │
└──────────────┬──────────────────────────┘
               │ 1
               │
               │ Many
               ▼
┌─────────────────────────────────────────┐
│           DailyPlan                     │
├─────────────────────────────────────────┤
│ id                                      │
│ userId         (FK → User.id)           │
│ date                                    │
│ title                                   │
│ content                                 │
│ morningRoutine                          │
│ afternoonTasks                          │
│ eveningRoutine                          │
│ completionRate                          │
│ tasksCompleted                          │
│ tasksTotal                              │
│ resetCount      ← New                   │
│ lastResetAt     ← New                   │
│ createdAt                               │
│ updatedAt                               │
└──────────────┬──────────────────────────┘
               │ 1
               │
               │ Many
               ▼
┌─────────────────────────────────────────┐
│        DailyPlanReset                   │  ← New Table
├─────────────────────────────────────────┤
│ id                                      │
│ dailyPlanId    (FK → DailyPlan.id)     │
│ reason         (enum)                   │
│ customReason                            │
│ previousContent                         │
│ newContent                              │
│ triggerType                             │
│ adaptationSummary                       │
│ createdAt                               │
└─────────────────────────────────────────┘

Indexes:
- DailyPlan: userId, date, status
- DailyPlanReset: dailyPlanId, createdAt
```

---

## Auto-Trigger Logic

```
┌─────────────────────────────────────────┐
│         Dashboard Monitoring            │
└──────────────┬──────────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │   Check Conditions    │
    └──────────┬────────────┘
               │
         ┌─────┴─────┬─────────┬───────────┐
         ▼           ▼         ▼           ▼
    ┌────────┐  ┌───────┐  ┌──────┐  ┌────────┐
    │Skipped │  │Missed │  │Inact-│  │Time of │
    │Tasks ≥3│  │Focus  │  │ive ≥2│  │Day = PM│
    │        │  │Blocks │  │hours │  │& No Prog│
    └────┬───┘  └───┬───┘  └──┬───┘  └───┬────┘
         │          │         │          │
         └──────────┴─────────┴──────────┘
                    │
                    ▼
            ┌──────────────┐
            │ ANY = true?  │
            └──────┬───────┘
                   │
           Yes     │     No
         ┌─────────┴─────────┐
         ▼                   ▼
    ┌─────────┐         ┌─────────┐
    │  Show   │         │Continue │
    │ Reset   │         │Monitor  │
    │ Prompt  │         │         │
    └─────────┘         └─────────┘
```

---

## State Management

### Before Reset
```javascript
{
  plan: {
    id: "abc-123",
    content: "Complex 10-task plan...",
    tasksTotal: 10,
    tasksCompleted: 2,
    completionRate: 20,
    resetCount: 0,
    lastResetAt: null
  }
}
```

### During Reset
```javascript
{
  processing: true,
  previousPlan: { ... },
  adaptationSteps: [
    { step: "Analyzing priorities", status: "in-progress" },
    { step: "Deferring tasks", status: "pending" },
    { step: "Breaking down tasks", status: "pending" },
    { step: "Adjusting blocks", status: "pending" }
  ]
}
```

### After Reset
```javascript
{
  plan: {
    id: "abc-123",
    content: "Simplified 4-task plan...",
    tasksTotal: 4,
    tasksCompleted: 2,
    completionRate: 50,  // Improved!
    resetCount: 1,       // Incremented
    lastResetAt: "2026-01-13T15:00:00Z"
  },
  lastReset: {
    reason: "LOW_ENERGY",
    adaptationSummary: "Kept priorities, deferred 6 tasks",
    previousContent: "...",
    newContent: "..."
  }
}
```

---

## Error Handling Flow

```
User Request
    │
    ▼
┌─────────────────────┐
│  Validate Request   │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │ Valid?      │
    └──────┬──────┘
      No   │   Yes
    ┌──────┴──────┐
    ▼             ▼
┌─────────┐  ┌─────────────┐
│ Return  │  │ Find Plan   │
│ 400 Bad │  │             │
│ Request │  └──────┬──────┘
└─────────┘         │
              ┌─────┴─────┐
              │ Found?    │
              └─────┬─────┘
           No       │   Yes
              ┌─────┴─────┐
              ▼           ▼
         ┌─────────┐  ┌─────────────┐
         │ Return  │  │ Check Auth  │
         │ 404 Not │  │             │
         │ Found   │  └──────┬──────┘
         └─────────┘         │
                       ┌─────┴─────┐
                       │Authorized?│
                       └─────┬─────┘
                    No       │   Yes
                       ┌─────┴─────┐
                       ▼           ▼
                  ┌─────────┐  ┌─────────┐
                  │ Return  │  │ Process │
                  │ 403     │  │ Reset   │
                  │Forbidden│  │         │
                  └─────────┘  └────┬────┘
                                    │
                              ┌─────┴─────┐
                              │AI Success?│
                              └─────┬─────┘
                           No       │   Yes
                              ┌─────┴─────┐
                              ▼           ▼
                         ┌─────────┐  ┌─────────┐
                         │ Return  │  │ Return  │
                         │ 503     │  │ 200 OK  │
                         │Service  │  │         │
                         │Error    │  └─────────┘
                         └─────────┘
```

---

## Performance Considerations

### Caching Strategy
```
┌─────────────────────────────────────────┐
│  Cache today's plan in memory           │
│  - TTL: 5 minutes                       │
│  - Invalidate on reset                  │
│  - Reduces DB queries                   │
└─────────────────────────────────────────┘
```

### Rate Limiting
```
┌─────────────────────────────────────────┐
│  Reset API Rate Limit                   │
│  - 5 resets per hour per user           │
│  - Prevents abuse                       │
│  - Suggests break after limit           │
└─────────────────────────────────────────┘
```

### AI Optimization
```
┌─────────────────────────────────────────┐
│  OpenAI Token Management                │
│  - Max 2000 tokens per request          │
│  - Fallback to template if AI fails     │
│  - Track usage for billing              │
└─────────────────────────────────────────┘
```

---

This architecture ensures:
- ✅ Fast response times
- ✅ Reliable error handling
- ✅ Complete audit trail
- ✅ Scalable design
- ✅ User trust building
