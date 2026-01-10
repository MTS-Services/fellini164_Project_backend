# 🚀 Postman Testing Guide - AI Routes

Complete guide to test all AI routes in `ai.routes.js` using Postman.

---

## 📋 Prerequisites

### 1. **Get Authentication Token**

First, you need to login to get your JWT token.

**Request:**
```
POST http://localhost:3000/api/v1/auth/login
```

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Save the token** from the response - you'll use it in all requests below!

### 2. **Setup Environment Variable in Postman**

1. Create a new environment in Postman
2. Add variable: `token` = `YOUR_JWT_TOKEN_HERE`
3. Add variable: `baseURL` = `http://localhost:3000/api/v1`

---

## 🤖 AI LIFE COACH CHAT ROUTES

### 1️⃣ **Send Chat Message to AI Life Coach**

Start a conversation with the AI life coach or continue an existing one.

**Request:**
```
POST {{baseURL}}/ai/chat
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON) - New Conversation:**
```json
{
  "message": "I want to improve my morning routine. Can you help me create a better one?"
}
```

**Body (JSON) - Continue Conversation:**
```json
{
  "conversationId": "uuid-from-previous-response",
  "message": "What about adding meditation to my morning routine?"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid-here",
    "userMessage": {
      "id": "msg-uuid",
      "content": "your message",
      "role": "user",
      "timestamp": "2026-01-10T10:00:00.000Z"
    },
    "assistantMessage": {
      "id": "msg-uuid",
      "content": "AI coach response...",
      "role": "assistant",
      "timestamp": "2026-01-10T10:00:05.000Z",
      "tokensUsed": 234,
      "model": "gpt-3.5-turbo"
    },
    "model": "gpt-3.5-turbo",
    "usage": {
      "prompt_tokens": 100,
      "completion_tokens": 134,
      "total_tokens": 234
    }
  }
}
```

---

### 2️⃣ **Quick Chat (No Save)**

Get a quick AI response without saving to conversation history.

**Request:**
```
POST {{baseURL}}/ai/quick-chat
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "message": "What are the top 3 habits for productivity?"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "response": "Here are the top 3 habits for productivity:\n1. Time blocking...\n2. Regular breaks...\n3. Morning routine...",
    "model": "gpt-3.5-turbo",
    "usage": {
      "total_tokens": 156
    }
  }
}
```

---

### 3️⃣ **Get All Conversations**

Retrieve all your conversations with the AI.

**Request:**
```
GET {{baseURL}}/ai/conversations?type=chat&limit=20&offset=0
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Query Parameters:**
- `type` (optional): Filter by type (chat, daily-plan, weekly-plan, monthly-plan)
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv-uuid-1",
        "title": "Morning Routine Discussion",
        "type": "chat",
        "userId": "user-uuid",
        "createdAt": "2026-01-10T09:00:00.000Z",
        "updatedAt": "2026-01-10T09:15:00.000Z",
        "messages": [
          {
            "id": "msg-uuid",
            "content": "Last message content...",
            "role": "assistant",
            "timestamp": "2026-01-10T09:15:00.000Z"
          }
        ]
      }
    ],
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 4️⃣ **Get Specific Conversation**

Get a single conversation with all its messages.

**Request:**
```
GET {{baseURL}}/ai/conversations/:conversationId
```

**Example:**
```
GET {{baseURL}}/ai/conversations/550e8400-e29b-41d4-a716-446655440000
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "conv-uuid",
    "title": "Morning Routine Discussion",
    "type": "chat",
    "userId": "user-uuid",
    "createdAt": "2026-01-10T09:00:00.000Z",
    "updatedAt": "2026-01-10T09:15:00.000Z",
    "messages": [
      {
        "id": "msg-1",
        "content": "I want to improve my morning routine",
        "role": "user",
        "timestamp": "2026-01-10T09:00:00.000Z"
      },
      {
        "id": "msg-2",
        "content": "I'd be happy to help! Let's start by...",
        "role": "assistant",
        "timestamp": "2026-01-10T09:00:05.000Z",
        "tokensUsed": 200,
        "model": "gpt-3.5-turbo"
      }
    ]
  }
}
```

---

### 5️⃣ **Update Conversation Title**

Change the title of a conversation.

**Request:**
```
PUT {{baseURL}}/ai/conversations/:conversationId
```

**Example:**
```
PUT {{baseURL}}/ai/conversations/550e8400-e29b-41d4-a716-446655440000
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "title": "My Awesome Morning Routine Plan"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "conv-uuid",
    "title": "My Awesome Morning Routine Plan",
    "type": "chat",
    "userId": "user-uuid",
    "createdAt": "2026-01-10T09:00:00.000Z",
    "updatedAt": "2026-01-10T10:30:00.000Z"
  }
}
```

---

### 6️⃣ **Delete Conversation**

Delete a conversation and all its messages.

**Request:**
```
DELETE {{baseURL}}/ai/conversations/:conversationId
```

**Example:**
```
DELETE {{baseURL}}/ai/conversations/550e8400-e29b-41d4-a716-446655440000
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

---

## 📅 AI PLANNING GENERATION ROUTES

### 7️⃣ **Generate Daily Plan**

Create an AI-generated daily plan with time blocking and routines.

**Request:**
```
POST {{baseURL}}/ai/generate/daily
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON) - Basic:**
```json
{
  "userInput": "I wake up at 7 AM and work from 9 AM to 6 PM. I want to exercise, read, and be productive."
}
```

**Body (JSON) - With Date:**
```json
{
  "userInput": "Create a productive daily plan for me. I have a big presentation to prepare.",
  "date": "2026-01-11"
}
```

**Body (JSON) - Continue in Existing Conversation:**
```json
{
  "userInput": "Create a daily plan focused on deep work and creativity",
  "date": "2026-01-11",
  "conversationId": "existing-conv-uuid"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-uuid",
    "plan": "**Daily Plan - January 11, 2026**\n\n**Overview:** Focus on presentation preparation...\n\n**Morning Routine (7:00 AM - 9:00 AM)**\n- 7:00 AM: Wake up, hydrate...",
    "dailyPlan": {
      "id": "plan-uuid",
      "userId": "user-uuid",
      "date": "2026-01-11T00:00:00.000Z",
      "title": "Daily Plan - 1/11/2026",
      "content": "Full plan content...",
      "status": "ACTIVE",
      "aiGenerated": true,
      "createdAt": "2026-01-10T10:00:00.000Z"
    },
    "userMessage": { /* message object */ },
    "assistantMessage": { /* message object */ },
    "model": "gpt-3.5-turbo",
    "usage": {
      "total_tokens": 845
    }
  }
}
```

---

### 8️⃣ **Generate Weekly Plan**

Create an AI-generated weekly strategic plan.

**Request:**
```
POST {{baseURL}}/ai/generate/weekly
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "userInput": "Help me plan a productive week. I want to launch my side project, exercise 4 times, and maintain work-life balance.",
  "weekStartDate": "2026-01-13"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-uuid",
    "plan": "**Weekly Plan - Week of January 13, 2026**\n\n**Weekly Overview:**...\n\n**Monday:**...\n**Tuesday:**...",
    "weeklyPlan": {
      "id": "plan-uuid",
      "userId": "user-uuid",
      "weekStartDate": "2026-01-13T00:00:00.000Z",
      "weekEndDate": "2026-01-19T00:00:00.000Z",
      "title": "Weekly Plan - Week of 1/13/2026",
      "content": "Full plan content...",
      "status": "ACTIVE",
      "aiGenerated": true
    },
    "model": "gpt-3.5-turbo"
  }
}
```

---

### 9️⃣ **Generate Monthly Plan**

Create an AI-generated monthly strategic plan with milestones.

**Request:**
```
POST {{baseURL}}/ai/generate/monthly
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "userInput": "I want to focus on completing my online course, improving my fitness, building a portfolio project, and reading 3 books this month.",
  "monthStartDate": "2026-02-01"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-uuid",
    "plan": "**Monthly Plan - February 2026**\n\n**Monthly Vision:**...\n**Week 1:**...",
    "monthlyPlan": {
      "id": "plan-uuid",
      "userId": "user-uuid",
      "monthStartDate": "2026-02-01T00:00:00.000Z",
      "monthEndDate": "2026-02-28T00:00:00.000Z",
      "title": "Monthly Plan - February 2026",
      "content": "Full plan content...",
      "status": "ACTIVE",
      "aiGenerated": true
    },
    "model": "gpt-3.5-turbo"
  }
}
```

---

### 🔟 **Suggest Tasks Based on Goals**

Get AI-powered task suggestions prioritized by impact.

**Request:**
```
POST {{baseURL}}/ai/suggest-tasks
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "goals": "Learn React, improve fitness, read 2 books, launch side project",
  "timeAvailable": "2 hours per day, 5 days a week"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-uuid",
    "tasks": "**Prioritized Task List**\n\n**High Priority:**\n1. Complete React tutorial (30 min/day)...\n\n**Medium Priority:**\n2. Morning workout routine (30 min)...",
    "userMessage": { /* message object */ },
    "assistantMessage": { /* message object */ },
    "model": "gpt-3.5-turbo"
  }
}
```

---

### 1️⃣1️⃣ **Suggest Morning Routine**

Get AI-generated personalized morning routine.

**Request:**
```
POST {{baseURL}}/ai/morning-routine
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "wakeUpTime": "06:30",
  "workStartTime": "09:00",
  "preferences": "I want to include meditation, exercise, and healthy breakfast"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-uuid",
    "routine": "**Personalized Morning Routine**\n\n**6:30 AM - Wake & Hydrate**\n- Drink 16oz water...\n\n**6:45 AM - Meditation**\n- 10-minute guided meditation...",
    "userMessage": { /* message object */ },
    "assistantMessage": { /* message object */ },
    "model": "gpt-3.5-turbo"
  }
}
```

---

## 📊 PLAN MANAGEMENT ROUTES

### 1️⃣2️⃣ **Get All Plans**

Retrieve all your generated plans (daily, weekly, monthly).

**Request:**
```
GET {{baseURL}}/ai/plans?type=daily&status=ACTIVE&limit=10
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Query Parameters:**
- `type` (optional): `daily`, `weekly`, or `monthly`
- `status` (optional): `ACTIVE`, `COMPLETED`, `DRAFT`, `ARCHIVED`
- `limit` (optional): Number of results (default: 10)

**Examples:**
```
GET {{baseURL}}/ai/plans                          # Get all plan types
GET {{baseURL}}/ai/plans?type=daily               # Only daily plans
GET {{baseURL}}/ai/plans?type=weekly&limit=5      # Last 5 weekly plans
GET {{baseURL}}/ai/plans?status=COMPLETED         # All completed plans
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "dailyPlans": [
      {
        "id": "plan-uuid",
        "date": "2026-01-11T00:00:00.000Z",
        "title": "Daily Plan - 1/11/2026",
        "content": "Plan content...",
        "status": "ACTIVE",
        "completionRate": 0,
        "tasksCompleted": 0,
        "tasksTotal": 0,
        "aiGenerated": true,
        "createdAt": "2026-01-10T10:00:00.000Z"
      }
    ],
    "weeklyPlans": [ /* ... */ ],
    "monthlyPlans": [ /* ... */ ]
  }
}
```

---

### 1️⃣3️⃣ **Get Specific Plan**

Retrieve a single plan by ID.

**Request:**
```
GET {{baseURL}}/ai/plans/:planType/:planId
```

**Examples:**
```
GET {{baseURL}}/ai/plans/daily/550e8400-e29b-41d4-a716-446655440000
GET {{baseURL}}/ai/plans/weekly/550e8400-e29b-41d4-a716-446655440001
GET {{baseURL}}/ai/plans/monthly/550e8400-e29b-41d4-a716-446655440002
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Path Parameters:**
- `planType`: `daily`, `weekly`, or `monthly`
- `planId`: UUID of the plan

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "plan-uuid",
    "userId": "user-uuid",
    "date": "2026-01-11T00:00:00.000Z",
    "title": "Daily Plan - 1/11/2026",
    "content": "Full plan content with markdown formatting...",
    "status": "ACTIVE",
    "completionRate": 75,
    "tasksCompleted": 6,
    "tasksTotal": 8,
    "aiGenerated": true,
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-01-11T18:00:00.000Z"
  }
}
```

---

### 1️⃣4️⃣ **Update Plan**

Update plan status, completion rate, or progress.

**Request:**
```
PUT {{baseURL}}/ai/plans/:planType/:planId
```

**Example:**
```
PUT {{baseURL}}/ai/plans/daily/550e8400-e29b-41d4-a716-446655440000
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON) - Mark as Completed:**
```json
{
  "status": "COMPLETED",
  "completionRate": 100,
  "tasksCompleted": 8,
  "tasksTotal": 8
}
```

**Body (JSON) - Update Progress:**
```json
{
  "completionRate": 75,
  "tasksCompleted": 6,
  "tasksTotal": 8
}
```

**Body (JSON) - Change Status:**
```json
{
  "status": "ARCHIVED"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "plan-uuid",
    "status": "COMPLETED",
    "completionRate": 100,
    "tasksCompleted": 8,
    "tasksTotal": 8,
    "updatedAt": "2026-01-11T20:00:00.000Z"
  }
}
```

---

### 1️⃣5️⃣ **Delete Plan**

Delete a plan permanently.

**Request:**
```
DELETE {{baseURL}}/ai/plans/:planType/:planId
```

**Example:**
```
DELETE {{baseURL}}/ai/plans/daily/550e8400-e29b-41d4-a716-446655440000
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Path Parameters:**
- `planType`: `daily`, `weekly`, or `monthly`
- `planId`: UUID of the plan

**Expected Response:**
```json
{
  "success": true,
  "message": "Plan deleted successfully"
}
```

---

## 🔜 COMING SOON ROUTES

### 1️⃣6️⃣ **Analyze Progress (TODO)**

**Request:**
```
GET {{baseURL}}/ai/analyze/progress
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Current Response:**
```json
{
  "success": false,
  "message": "AI progress analysis - Coming soon"
}
```

---

### 1️⃣7️⃣ **Get AI Recommendations (TODO)**

**Request:**
```
GET {{baseURL}}/ai/recommendations
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Current Response:**
```json
{
  "success": false,
  "message": "Get AI recommendations - Coming soon"
}
```

---

## 🎯 Testing Workflow Examples

### Scenario 1: Complete Life Coach Chat Session

1. **Start conversation** - POST `/ai/chat` with initial message
2. **Continue conversation** - POST `/ai/chat` with `conversationId` from step 1
3. **View conversation** - GET `/ai/conversations/:conversationId`
4. **Update title** - PUT `/ai/conversations/:conversationId`
5. **List all conversations** - GET `/ai/conversations`

### Scenario 2: Generate & Manage Daily Plan

1. **Generate plan** - POST `/ai/generate/daily` with your preferences
2. **View plan** - GET `/ai/plans/daily/:planId`
3. **Update progress** - PUT `/ai/plans/daily/:planId` as you complete tasks
4. **Mark complete** - PUT `/ai/plans/daily/:planId` with status "COMPLETED"
5. **View all plans** - GET `/ai/plans?type=daily`

### Scenario 3: Week Planning Workflow

1. **Get task suggestions** - POST `/ai/suggest-tasks` with your goals
2. **Generate weekly plan** - POST `/ai/generate/weekly` based on suggestions
3. **Generate daily plans** - POST `/ai/generate/daily` for each day
4. **Track progress** - PUT `/ai/plans` endpoints to update completion
5. **Review** - GET `/ai/plans?status=COMPLETED` at week end

---

## 🛠️ Postman Collection Setup

### Create Collection Structure:

```
📁 Fellini AI Backend
  📁 0. Authentication
    └─ Login (Get Token)
  
  📁 1. AI Life Coach Chat
    ├─ 1.1 Send Chat Message
    ├─ 1.2 Quick Chat (No Save)
    ├─ 1.3 Get All Conversations
    ├─ 1.4 Get Specific Conversation
    ├─ 1.5 Update Conversation Title
    └─ 1.6 Delete Conversation
  
  📁 2. AI Plan Generation
    ├─ 2.1 Generate Daily Plan
    ├─ 2.2 Generate Weekly Plan
    ├─ 2.3 Generate Monthly Plan
    ├─ 2.4 Suggest Tasks
    └─ 2.5 Suggest Morning Routine
  
  📁 3. Plan Management
    ├─ 3.1 Get All Plans
    ├─ 3.2 Get Specific Plan
    ├─ 3.3 Update Plan
    └─ 3.4 Delete Plan
  
  📁 4. Coming Soon
    ├─ 4.1 Analyze Progress
    └─ 4.2 Get Recommendations
```

---

## 🚨 Common Errors & Solutions

### Error: 401 Unauthorized
**Solution:** Check your JWT token is valid and not expired

### Error: 503 AI service not configured
**Solution:** Ensure OPENAI_API_KEY is set in .env file

### Error: 404 Conversation/Plan not found
**Solution:** Verify the ID exists and belongs to your user

### Error: 400 Bad Request
**Solution:** Check required fields in request body

---

## 💡 Pro Tips

1. **Save conversation IDs** - Use them to continue multi-turn conversations
2. **Use descriptive input** - More context = better AI responses
3. **Track token usage** - Monitor costs in response.usage
4. **Set realistic dates** - Use actual dates for better plan generation
5. **Update plans regularly** - Keep completion rates accurate

---

## 📊 Testing Checklist

- [ ] Login and get JWT token
- [ ] Start new AI chat conversation
- [ ] Continue existing conversation
- [ ] Generate daily plan
- [ ] Generate weekly plan
- [ ] Generate monthly plan
- [ ] Get task suggestions
- [ ] Get morning routine suggestion
- [ ] View all plans
- [ ] Update plan progress
- [ ] Delete old plan
- [ ] View all conversations
- [ ] Update conversation title
- [ ] Delete conversation

---

**✅ All 17 AI routes documented and ready for testing!**

**Base URL:** `http://localhost:3000/api/v1`  
**Authentication:** Required on all routes (Bearer Token)  
**AI Model:** GPT-3.5-Turbo (OpenAI)
