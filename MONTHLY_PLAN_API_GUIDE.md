# Monthly Plan API - Complete Guide

## Overview
The Monthly Plan API allows users to generate comprehensive monthly plans using AI that include weekly breakdowns and daily routine guidelines. Plans can be updated using `conversationId` to avoid duplicates.

---

## Schema Information

### MonthlyPlan Model
```prisma
model MonthlyPlan {
  id                    String       @id @default(uuid())
  userId                String
  user                  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  monthStartDate        DateTime     // First day of the month
  monthEndDate          DateTime     // Last day of the month
  title                 String
  content               String       @db.Text  // Full AI-generated plan
  aiGenerated           Boolean      @default(true)
  status                PlanStatus   @default(ACTIVE)
  
  monthlyGoals          String?      @db.Text
  milestones            String[]     @default([])
  
  completionRate        Float        @default(0)
  
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
  
  @@index([userId])
  @@index([monthStartDate])
  @@index([status])
}
```

**Note:** No schema changes needed. The existing schema is sufficient for monthly plans with weekly and daily breakdowns stored in the `content` field.

---

## API Endpoints

### 1. Generate Monthly Plan

**Endpoint:** `POST /api/v1/ai/generate/monthly`

**Description:** Generate a comprehensive monthly plan with AI including weekly breakdowns and daily routine guidelines.

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "userInput": "I want to focus on career growth this month. I'm working on a major project, need to maintain fitness 4x/week, learn new skills in the evenings, and keep work-life balance. I want structured weekly goals with daily routines.",
  "monthStartDate": "2026-02-01T00:00:00.000Z"
}
```

**Request Body (Update Existing Plan):**
```json
{
  "userInput": "Update my plan to focus more on skill development and reduce work hours",
  "monthStartDate": "2026-02-01T00:00:00.000Z",
  "conversationId": "existing-conversation-id-here"
}
```

**Parameters:**
- `userInput` (required): Describe your monthly goals, focus areas, work schedule, and what you want to achieve
- `monthStartDate` (optional): ISO 8601 date string for the month start. Defaults to current month if not provided
- `conversationId` (optional): If provided, updates the existing plan for this month instead of creating a new one

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid-here",
    "plan": "## Monthly Vision - February 2026\n[Full comprehensive plan content with weekly and daily breakdowns]...",
    "monthlyPlan": {
      "id": "plan-uuid",
      "userId": "user-uuid",
      "monthStartDate": "2026-02-01T00:00:00.000Z",
      "monthEndDate": "2026-02-29T00:00:00.000Z",
      "title": "Monthly Plan - February 2026",
      "content": "[Full plan content]",
      "aiGenerated": true,
      "status": "ACTIVE",
      "monthlyGoals": null,
      "milestones": [],
      "completionRate": 0,
      "createdAt": "2026-01-17T...",
      "updatedAt": "2026-01-17T..."
    },
    "userMessage": { /* message object */ },
    "assistantMessage": { /* message object */ },
    "model": "gpt-3.5-turbo",
    "usage": { /* token usage */ }
  }
}
```

---

### 2. Get All Monthly Plans

**Endpoint:** `GET /api/v1/ai/monthly`

**Description:** Retrieve all monthly plans for the authenticated user.

**Headers:**
```
Authorization: Bearer {{authToken}}
```

**Query Parameters:**
- `status` (optional): Filter by status (e.g., `ACTIVE`, `COMPLETED`)
- `limit` (optional): Number of plans to return (default: 10)
- `sortBy` (optional): Sort order `asc` or `desc` (default: `desc`)

**Example:**
```
GET {{baseUrl}}/api/v1/ai/monthly?status=ACTIVE&limit=5&sortBy=desc
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "plan-uuid-1",
      "userId": "user-uuid",
      "monthStartDate": "2026-02-01T00:00:00.000Z",
      "monthEndDate": "2026-02-29T00:00:00.000Z",
      "title": "Monthly Plan - February 2026",
      "content": "[Full plan content]",
      "aiGenerated": true,
      "status": "ACTIVE",
      "completionRate": 0,
      "createdAt": "2026-01-17T...",
      "updatedAt": "2026-01-17T..."
    },
    {
      "id": "plan-uuid-2",
      "userId": "user-uuid",
      "monthStartDate": "2026-01-01T00:00:00.000Z",
      "monthEndDate": "2026-01-31T00:00:00.000Z",
      "title": "Monthly Plan - January 2026",
      "content": "[Full plan content]",
      "aiGenerated": true,
      "status": "COMPLETED",
      "completionRate": 85,
      "createdAt": "2025-12-28T...",
      "updatedAt": "2026-01-15T..."
    }
  ]
}
```

---

### 3. Get Monthly Plan by ID

**Endpoint:** `GET /api/v1/ai/monthly/:id`

**Description:** Retrieve a specific monthly plan by its ID.

**Headers:**
```
Authorization: Bearer {{authToken}}
```

**Example:**
```
GET {{baseUrl}}/api/v1/ai/monthly/7cd2c880-277f-4ae7-89b4-819d8894d691
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "7cd2c880-277f-4ae7-89b4-819d8894d691",
    "userId": "user-uuid",
    "monthStartDate": "2026-02-01T00:00:00.000Z",
    "monthEndDate": "2026-02-29T00:00:00.000Z",
    "title": "Monthly Plan - February 2026",
    "content": "## Monthly Vision - February 2026\n[Full comprehensive plan...]",
    "aiGenerated": true,
    "status": "ACTIVE",
    "monthlyGoals": null,
    "milestones": [],
    "completionRate": 0,
    "createdAt": "2026-01-17T...",
    "updatedAt": "2026-01-17T..."
  }
}
```

---

### 4. Delete Monthly Plan

**Endpoint:** `DELETE /api/v1/ai/monthly/:id`

**Description:** Delete a specific monthly plan.

**Headers:**
```
Authorization: Bearer {{authToken}}
```

**Example:**
```
DELETE {{baseUrl}}/api/v1/ai/monthly/7cd2c880-277f-4ae7-89b4-819d8894d691
```

**Response:**
```json
{
  "success": true,
  "message": "Monthly plan deleted successfully"
}
```

**Error Responses:**
```json
// Not found
{
  "success": false,
  "error": "Monthly plan not found"
}

// Unauthorized
{
  "success": false,
  "error": "Unauthorized to delete this plan"
}
```

---

## Plan Structure

### What's Included in Monthly Plans

Monthly plans generated by AI include:

1. **Monthly Vision**
   - Overarching theme and main objectives
   - What success looks like for the month

2. **Strategic Goals**
   - 5 major goals with specific outcomes

3. **Week-by-Week Breakdown (4-5 weeks)**
   - Each week includes:
     - Weekly theme/focus
     - Specific weekly objectives
     - **Daily Routine Guidelines:**
       - Monday-Friday schedule (Morning, Work Blocks, Evening)
       - Weekend activities (Saturday & Sunday)
     - Key tasks with deadlines

4. **Major Milestones & Deadlines**
   - Important dates for each week

5. **Life Areas Balance**
   - Career/Work, Health & Fitness, Relationships, Personal Growth, Rest & Recovery
   - Percentage allocation and specific focus areas

6. **Daily Habits to Build**
   - Morning, midday, and evening habits

7. **Success Metrics**
   - How to measure progress throughout the month

8. **Monthly Reflection Questions**
   - End-of-month review questions

9. **Celebration Points**
   - Weekly milestones to celebrate

### Example Plan Content Structure

```markdown
## Monthly Vision - February 2026
Focus on career advancement while maintaining health and learning new skills...

## Strategic Goals
1. Complete major project milestone by Feb 15
2. Exercise 4x per week consistently
3. Learn advanced JavaScript - 1 hour daily
4. Maintain work-life balance with 8hr sleep
5. Build one new professional relationship

## Week 1: Foundation & Setup
**Weekly Objectives:**
- Project kickoff and planning
- Establish workout routine
- Set up learning materials

**Daily Routine Guidelines:**
- **Monday-Friday:**
  - Morning: [6:00-9:00 AM] - Wake at 6:00, workout 6:30-7:30, breakfast & planning
  - Work Blocks: [9:00 AM-5:00 PM] - Focus on project tasks with 2 breaks
  - Evening: [6:00-10:00 PM] - Learning (1hr), dinner, family time, sleep prep
- **Weekend:**
  - Saturday: Morning workout, project review, social activities
  - Sunday: Meal prep, weekly review, learning, relaxation

**Key Tasks:**
1. Complete project requirements document (Due: Feb 3)
2. Schedule 4 workout sessions
3. Set up learning environment and resources

## Week 2: Building Momentum
[Similar detailed structure]

## Week 3: Mid-Month Push
[Similar detailed structure]

## Week 4: Completion & Review
[Similar detailed structure]

[Additional sections...]
```

---

## Update Behavior

### With `conversationId`
- ✅ Finds existing monthly plan for the specified month
- ✅ **Updates** the existing plan (no new database row)
- ✅ Replaces content with new AI-generated plan
- ✅ Updates `updatedAt` timestamp
- ✅ Preserves the same plan ID

### Without `conversationId`
- Deletes any existing plan for that month
- Creates a completely new monthly plan
- Generates a new plan ID

---

## Usage Examples

### Postman Collection

#### 1. Create New Monthly Plan
```
POST {{baseUrl}}/api/v1/ai/generate/monthly
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "userInput": "Create a monthly plan focused on career growth, fitness 4x/week, and learning new programming skills. I work 9-5 and want balanced days with clear routines.",
  "monthStartDate": "2026-02-01T00:00:00.000Z"
}
```

#### 2. Update Existing Plan
```
POST {{baseUrl}}/api/v1/ai/generate/monthly
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "userInput": "Update my plan to reduce work focus and increase family time and personal projects",
  "monthStartDate": "2026-02-01T00:00:00.000Z",
  "conversationId": "12093b84-46d5-4d73-8c9d-3cce06f2af8d"
}
```

#### 3. Get All Plans
```
GET {{baseUrl}}/api/v1/ai/monthly?status=ACTIVE&limit=10
Authorization: Bearer {{authToken}}
```

#### 4. Get Specific Plan
```
GET {{baseUrl}}/api/v1/ai/monthly/7cd2c880-277f-4ae7-89b4-819d8894d691
Authorization: Bearer {{authToken}}
```

#### 5. Delete Plan
```
DELETE {{baseUrl}}/api/v1/ai/monthly/7cd2c880-277f-4ae7-89b4-819d8894d691
Authorization: Bearer {{authToken}}
```

---

## Complete API Routes Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/ai/generate/monthly` | Generate/Update monthly plan |
| `GET` | `/api/v1/ai/monthly` | Get all monthly plans |
| `GET` | `/api/v1/ai/monthly/:id` | Get specific monthly plan by ID |
| `DELETE` | `/api/v1/ai/monthly/:id` | Delete monthly plan |
| `PUT` | `/api/v1/ai/plans/monthly/:id` | Update plan status/completion (legacy route) |
| `DELETE` | `/api/v1/ai/plans/monthly/:id` | Delete monthly plan (legacy route) |

---

## Key Features

### ✅ Comprehensive Planning
- Monthly vision and strategic goals
- 4-5 weeks detailed breakdown
- Daily routine guidelines for each week
- Specific time blocks and activities

### ✅ No Duplicate Plans
- Using `conversationId` updates existing plans
- Replaces content instead of creating new rows
- Clean database with one plan per month

### ✅ Structured Content
- Professional markdown formatting
- Easy to parse and display
- Includes weekly AND daily details
- Clear milestones and metrics

### ✅ Flexible Updates
- Update plans as goals change
- Maintain conversation history
- Track plan revisions via `updatedAt`

---

## Best Practices

1. **Always use `conversationId` for updates**
   - Save the conversationId from the first generation
   - Pass it when regenerating to avoid duplicates

2. **Be specific in `userInput`**
   - Include work schedule, fitness goals, learning objectives
   - Mention time constraints and preferences
   - Specify daily routine preferences

3. **Review and adjust**
   - Monthly plans are comprehensive but adaptable
   - Use updates to refine as month progresses
   - Celebrate weekly milestones

4. **Combine with weekly/daily plans**
   - Monthly plan provides strategic overview
   - Weekly plans dive deeper into each week
   - Daily plans provide day-to-day execution

---

## Error Handling

### Common Errors

```json
// Missing userInput
{
  "success": false,
  "error": "userInput is required. Describe your monthly goals and objectives."
}

// Invalid conversationId
{
  "success": false,
  "error": "Conversation not found or unauthorized"
}

// AI service not configured
{
  "success": false,
  "error": "AI service not configured"
}

// Unauthorized access
{
  "success": false,
  "error": "Unauthorized to access this plan"
}
```

---

## Integration Notes

### Frontend Integration

```javascript
// Generate new monthly plan
async function generateMonthlyPlan(userInput, monthStartDate) {
  const response = await fetch(`${baseUrl}/api/v1/ai/generate/monthly`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userInput,
      monthStartDate
    })
  });
  
  const data = await response.json();
  
  // Save conversationId for future updates
  localStorage.setItem('monthlyPlanConversationId', data.data.conversationId);
  
  return data;
}

// Update existing plan
async function updateMonthlyPlan(userInput, monthStartDate) {
  const conversationId = localStorage.getItem('monthlyPlanConversationId');
  
  const response = await fetch(`${baseUrl}/api/v1/ai/generate/monthly`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userInput,
      monthStartDate,
      conversationId // Include to update existing plan
    })
  });
  
  return await response.json();
}
```

---

## Conclusion

The Monthly Plan API provides comprehensive planning capabilities with:
- ✅ Weekly breakdowns with specific objectives
- ✅ Daily routine guidelines for each week
- ✅ Strategic goals and milestones
- ✅ Update capability to avoid duplicates
- ✅ Complete CRUD operations
- ✅ No schema changes required

All existing schema fields are sufficient. The comprehensive plan content (including weekly and daily details) is stored in the `content` TEXT field.
