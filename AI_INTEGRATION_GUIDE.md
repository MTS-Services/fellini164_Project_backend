# AI-Powered Life Coach Integration - Complete Guide

## 🎉 Overview

This guide documents the complete AI-powered planning and life coach chatbot integration for the Fellini Backend project. The system uses OpenAI's GPT models to provide personalized daily, weekly, and monthly plans, along with an interactive AI life coach chatbot.

---

## 🚀 Features Implemented

### 1. **AI Life Coach Chatbot**
- Real-time conversational AI with memory
- Context-aware responses based on user goals
- Conversation history tracking
- Multiple conversation threads
- Quick chat for one-off questions

### 2. **AI Planning Generation**
- **Daily Plans**: Personalized daily routines with time blocking
- **Weekly Plans**: Strategic week-long plans with goal alignment
- **Monthly Plans**: Long-term planning with milestones
- User preference integration (wake time, work hours, etc.)

### 3. **AI Task & Routine Suggestions**
- Task suggestions based on goals and available time
- Morning routine generation
- Smart prioritization using AI

### 4. **Data Persistence**
- All conversations saved with message history
- Plans stored in dedicated tables (DailyPlan, WeeklyPlan, MonthlyPlan)
- Activity logging for analytics
- Integration with existing user goals

---

## 📋 Prerequisites

1. **OpenAI API Key** (Required)
   - Get your API key from: https://platform.openai.com/api-keys
   - You provided: `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`

2. **Database**: PostgreSQL (already configured)

3. **Node.js**: v16 or higher

---

## 🛠️ Installation & Setup

### Step 1: Install OpenAI Package

The `openai` package is already in your package.json, but ensure it's installed:

```bash
npm install
```

### Step 2: Configure Environment Variables

Add your OpenAI API key to the `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=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
```

### Step 3: Run Database Migration

The schema has been updated with new models: `Conversation` and `Message`.

```bash
npm run prisma:migrate
```

When prompted for a migration name, use: `add_ai_chat_and_conversations`

### Step 4: Generate Prisma Client

```bash
npm run prisma:generate
```

### Step 5: Start the Server

```bash
npm run dev
```

The server should start successfully with the message:
```
✅ OpenAI service initialized successfully
Server is running on port 3000
```

---

## 📡 API Endpoints

### **AI Life Coach Chat**

#### 1. Send Chat Message
```http
POST /api/v1/ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "I want to improve my morning routine. What should I do?",
  "conversationId": "optional-existing-conversation-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "userMessage": { "id": "...", "content": "...", ... },
    "assistantMessage": { "id": "...", "content": "AI response...", ... },
    "model": "gpt-3.5-turbo",
    "usage": { "total_tokens": 234 }
  }
}
```

#### 2. Quick Chat (No Save)
```http
POST /api/v1/ai/quick-chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "What are the benefits of meditation?"
}
```

#### 3. Get All Conversations
```http
GET /api/v1/ai/conversations?type=chat&limit=20&offset=0
Authorization: Bearer <token>
```

#### 4. Get Specific Conversation
```http
GET /api/v1/ai/conversations/:conversationId
Authorization: Bearer <token>
```

#### 5. Update Conversation Title
```http
PUT /api/v1/ai/conversations/:conversationId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Morning Routine Discussion"
}
```

#### 6. Delete Conversation
```http
DELETE /api/v1/ai/conversations/:conversationId
Authorization: Bearer <token>
```

---

### **AI Planning Generation**

#### 1. Generate Daily Plan
```http
POST /api/v1/ai/generate/daily
Authorization: Bearer <token>
Content-Type: application/json

{
  "userInput": "I need a productive daily plan. I wake up at 7 AM, work from 9 AM to 6 PM, and want to exercise and read.",
  "date": "2026-01-10",
  "conversationId": "optional"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "plan": "Detailed daily plan text...",
    "dailyPlan": {
      "id": "uuid",
      "date": "2026-01-10",
      "title": "Daily Plan - 1/10/2026",
      "content": "Full plan content...",
      "status": "ACTIVE"
    },
    "model": "gpt-3.5-turbo"
  }
}
```

#### 2. Generate Weekly Plan
```http
POST /api/v1/ai/generate/weekly
Authorization: Bearer <token>
Content-Type: application/json

{
  "userInput": "Create a weekly plan focused on launching my side project, staying healthy, and maintaining work-life balance.",
  "weekStartDate": "2026-01-13"
}
```

#### 3. Generate Monthly Plan
```http
POST /api/v1/ai/generate/monthly
Authorization: Bearer <token>
Content-Type: application/json

{
  "userInput": "I want to focus on fitness, complete my online course, and improve my coding skills this month.",
  "monthStartDate": "2026-01-01"
}
```

#### 4. Suggest Tasks
```http
POST /api/v1/ai/suggest-tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "goals": "Learn React, improve fitness, read 2 books",
  "timeAvailable": "2 hours per day"
}
```

#### 5. Suggest Morning Routine
```http
POST /api/v1/ai/morning-routine
Authorization: Bearer <token>
Content-Type: application/json

{
  "wakeUpTime": "06:00",
  "workStartTime": "09:00",
  "preferences": "I want to include meditation and exercise"
}
```

---

### **Plan Management**

#### 1. Get All Plans
```http
GET /api/v1/ai/plans?type=daily&status=ACTIVE&limit=10
Authorization: Bearer <token>
```

Query Parameters:
- `type`: `daily`, `weekly`, `monthly` (optional)
- `status`: `ACTIVE`, `COMPLETED`, `DRAFT`, `ARCHIVED` (optional)
- `limit`: number (default: 10)

#### 2. Get Specific Plan
```http
GET /api/v1/ai/plans/:planType/:planId
Authorization: Bearer <token>
```

Example: `GET /api/v1/ai/plans/daily/uuid-here`

#### 3. Update Plan
```http
PUT /api/v1/ai/plans/:planType/:planId
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "COMPLETED",
  "completionRate": 85,
  "tasksCompleted": 8,
  "tasksTotal": 10
}
```

#### 4. Delete Plan
```http
DELETE /api/v1/ai/plans/:planType/:planId
Authorization: Bearer <token>
```

---

## 🗄️ Database Schema Changes

### New Models Added:

#### **Conversation Model**
```prisma
model Conversation {
  id        String   @id @default(uuid())
  title     String   @default("New Conversation")
  userId    String
  type      String   @default("chat") // "chat", "daily-plan", "weekly-plan", "monthly-plan"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages Message[]
  
  @@index([userId])
  @@index([type])
  @@map("conversations")
}
```

#### **Message Model**
```prisma
model Message {
  id             String   @id @default(uuid())
  conversationId String
  role           String   // "user" or "assistant"
  content        String   @db.Text
  timestamp      DateTime @default(now())
  tokensUsed     Int?
  model          String?
  
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId])
  @@index([timestamp])
  @@map("messages")
}
```

---

## 🎯 Usage Examples

### Example 1: Start a Life Coach Chat

```javascript
// Request
POST /api/v1/ai/chat
{
  "message": "I feel overwhelmed with my goals. Can you help me prioritize?"
}

// Response includes personalized coaching advice with actionable steps
```

### Example 2: Generate a Daily Plan

```javascript
// Request
POST /api/v1/ai/generate/daily
{
  "userInput": "I have a big presentation tomorrow. Help me plan today to prepare well while staying balanced."
}

// Response includes:
// - Morning routine
// - Focused work blocks for presentation prep
// - Break times
// - Evening wind-down
// - Success tips
```

### Example 3: Get Weekly Plan

```javascript
// Request
POST /api/v1/ai/generate/weekly
{
  "userInput": "Balance work deadlines, gym 3x/week, and quality time with family"
}

// Response includes:
// - Day-by-day breakdown
// - Weekly goals
// - Balance strategies
// - Flexibility notes
```

---

## 🔧 Technical Implementation

### File Structure

```
fellini_backend/
├── src/
│   ├── controllers/
│   │   ├── aiChatController.js       ✅ NEW - Life coach chat
│   │   └── planningController.js     ✅ NEW - Plan generation
│   ├── services/
│   │   └── openaiService.js          ✅ NEW - OpenAI integration
│   ├── routes/
│   │   ├── ai.routes.js              ✅ UPDATED - Combined routes
│   │   ├── aiChat.routes.js          ✅ NEW (standalone)
│   │   └── planning.routes.js        ✅ NEW (standalone)
│   └── middleware/
│       └── auth.js                   ✅ Used for authentication
├── prisma/
│   └── schema.prisma                 ✅ UPDATED - Added models
└── .env                              ✅ ADD OpenAI API key
```

### Key Services

**openaiService.js** provides:
- `chat()` - Generic OpenAI chat
- `generateDailyPlan()` - Daily plan generation
- `generateWeeklyPlan()` - Weekly plan generation
- `generateMonthlyPlan()` - Monthly plan generation
- `lifeCoachChat()` - Contextual life coaching
- `suggestTasks()` - Task suggestions
- `suggestMorningRoutine()` - Routine suggestions
- `quickResponse()` - Quick AI responses

---

## 🎨 AI Prompt Engineering

The system uses carefully crafted system prompts for different use cases:

### Life Coach Prompt
- Empathetic and motivating tone
- Asks thoughtful questions
- Provides actionable advice
- Uses proven frameworks (SMART goals, habit stacking)
- Celebrates progress and encourages resilience

### Daily Plan Prompt
- Structures realistic daily routines
- Includes morning/work/evening blocks
- Considers work-life balance
- Provides time allocations
- Includes success tips

### Weekly/Monthly Plan Prompts
- Strategic long-term thinking
- Milestone-based planning
- Balance across life areas
- Flexibility for adjustments
- Progress tracking strategies

---

## 💰 Cost Considerations

**Using GPT-3.5-Turbo** (current default):
- Very cost-effective: ~$0.002 per 1K tokens
- Fast responses (~1-3 seconds)
- Good quality for most use cases

**To use GPT-4** (higher quality):
Update in `openaiService.js`:
```javascript
this.model = 'gpt-4'; // Higher quality, slower, more expensive
```

**Cost estimates:**
- Daily plan: ~500-1000 tokens (~$0.001-$0.002)
- Weekly plan: ~1000-1500 tokens (~$0.002-$0.003)
- Chat message: ~200-500 tokens (~$0.0004-$0.001)

---

## 🧪 Testing the API

### Using Postman or curl:

1. **Login to get token:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

2. **Send chat message:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "Help me create a morning routine"}'
```

3. **Generate daily plan:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/generate/daily \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"userInput": "Create a productive daily plan"}'
```

---

## 🐛 Troubleshooting

### Issue: "OpenAI service not configured"
**Solution:** Ensure `OPENAI_API_KEY` is set in `.env` file

### Issue: "Invalid OpenAI API key"
**Solution:** Verify your API key is correct and active at platform.openai.com

### Issue: "Rate limit exceeded"
**Solution:** Wait a moment or upgrade your OpenAI plan

### Issue: "Conversation not found"
**Solution:** Verify the conversationId exists and belongs to the authenticated user

### Issue: Database errors
**Solution:** Run `npm run prisma:migrate` to ensure schema is up to date

---

## 🚀 Next Steps & Enhancements

### Potential Improvements:

1. **Streaming Responses**
   - Implement Server-Sent Events (SSE) for real-time streaming
   - Better UX with incremental responses

2. **Usage Limits**
   - Implement daily/monthly AI message limits per subscription plan
   - Track token usage per user

3. **Enhanced Context**
   - Include more user data (completed habits, task history)
   - Personalize based on past interactions

4. **AI Recommendations**
   - Implement `AiRecommendation` model
   - Proactive suggestions based on patterns

5. **Progress Analysis**
   - Implement `/analyze/progress` endpoint
   - AI-powered insights on user progress

6. **Voice Integration**
   - Add Whisper API for voice-to-text
   - Text-to-speech for responses

---

## 📝 Summary

✅ **Complete AI Life Coach System**
- Interactive chatbot with conversation memory
- Daily/Weekly/Monthly plan generation
- Task and routine suggestions
- Full CRUD operations for plans and conversations

✅ **Production-Ready**
- Proper error handling
- Authentication and authorization
- Activity logging
- Database persistence

✅ **Scalable Architecture**
- Modular service layer
- Clean controller separation
- Flexible routing

✅ **Cost-Effective**
- Using GPT-3.5-Turbo by default
- Token usage tracking
- Optional upgrade to GPT-4

---

## 📞 Support

For questions or issues:
1. Check the troubleshooting section
2. Review OpenAI documentation: https://platform.openai.com/docs
3. Verify all environment variables are set correctly

---

**Implementation Complete! 🎉**

The fellini_backend project now has a fully functional AI-powered life coach and planning system integrated with OpenAI's GPT models. All endpoints are documented and ready for use.
