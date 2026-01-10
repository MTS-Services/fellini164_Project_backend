# 🚀 Quick Start - AI Features Testing

## ✅ Setup Complete!

Your fellini_backend now has full AI-powered life coach and planning features integrated with OpenAI!

---

## 🎯 Quick Test Guide

### Step 1: Ensure Server is Running

```bash
npm run dev
```

You should see:
```
✅ OpenAI service initialized successfully
Server is running on port 3000
```

### Step 2: Get Authentication Token

First, login to get your JWT token:

```bash
# Login (replace with your actual credentials)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"your-password\"}"
```

Save the token from the response.

---

## 🧪 Test the AI Features

### Test 1: AI Life Coach Chat 💬

```bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"message\":\"I want to build better morning habits. Can you help me?\"}"
```

**Expected:** You'll get a personalized response from the AI life coach with actionable advice.

---

### Test 2: Generate Daily Plan 📅

```bash
curl -X POST http://localhost:3000/api/v1/ai/generate/daily \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"userInput\":\"I wake up at 7 AM and work from 9-5. I want to exercise, read, and be productive.\"}"
```

**Expected:** A detailed daily plan with:
- Morning routine
- Work blocks
- Exercise time
- Reading time
- Evening routine

---

### Test 3: Generate Weekly Plan 📆

```bash
curl -X POST http://localhost:3000/api/v1/ai/generate/weekly \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"userInput\":\"Help me plan a productive week focused on my side project, fitness, and learning React.\"}"
```

**Expected:** A 7-day strategic plan with daily focus areas.

---

### Test 4: Generate Monthly Plan 📊

```bash
curl -X POST http://localhost:3000/api/v1/ai/generate/monthly \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"userInput\":\"I want to complete my online course, improve my fitness, and build a portfolio project this month.\"}"
```

**Expected:** A month-long plan with weekly milestones.

---

### Test 5: Get Task Suggestions 📝

```bash
curl -X POST http://localhost:3000/api/v1/ai/suggest-tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"goals\":\"Learn TypeScript, Build a React app, Exercise 4x/week\",\"timeAvailable\":\"2 hours per day\"}"
```

**Expected:** Prioritized list of actionable tasks.

---

### Test 6: Morning Routine Suggestion ☀️

```bash
curl -X POST http://localhost:3000/api/v1/ai/morning-routine \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"wakeUpTime\":\"06:30\",\"workStartTime\":\"09:00\",\"preferences\":\"meditation and exercise\"}"
```

**Expected:** A structured morning routine with time blocks.

---

### Test 7: Get All Conversations 💭

```bash
curl -X GET "http://localhost:3000/api/v1/ai/conversations?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** List of all your AI conversations.

---

### Test 8: Get All Plans 📋

```bash
curl -X GET "http://localhost:3000/api/v1/ai/plans?type=daily&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** List of your generated daily plans.

---

## 🎨 Using Postman

### Import Collection

Create a new Postman collection with these requests:

#### 1. **Login**
- Method: POST
- URL: `http://localhost:3000/api/v1/auth/login`
- Body (JSON):
```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

#### 2. **AI Chat**
- Method: POST
- URL: `http://localhost:3000/api/v1/ai/chat`
- Headers: `Authorization: Bearer {{token}}`
- Body (JSON):
```json
{
  "message": "Help me improve my productivity"
}
```

#### 3. **Generate Daily Plan**
- Method: POST
- URL: `http://localhost:3000/api/v1/ai/generate/daily`
- Headers: `Authorization: Bearer {{token}}`
- Body (JSON):
```json
{
  "userInput": "Create a balanced daily plan for me"
}
```

---

## 📱 Example Frontend Integration

### JavaScript/React Example

```javascript
// API Service
class AIService {
  constructor(token) {
    this.baseURL = 'http://localhost:3000/api/v1/ai';
    this.token = token;
  }

  async chat(message, conversationId = null) {
    const response = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ message, conversationId })
    });
    return response.json();
  }

  async generateDailyPlan(userInput) {
    const response = await fetch(`${this.baseURL}/generate/daily`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ userInput })
    });
    return response.json();
  }

  async getConversations() {
    const response = await fetch(`${this.baseURL}/conversations`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return response.json();
  }
}

// Usage
const aiService = new AIService(userToken);

// Chat with AI
const chatResponse = await aiService.chat('Help me set better goals');
console.log(chatResponse.data.assistantMessage.content);

// Generate plan
const planResponse = await aiService.generateDailyPlan('I want a productive day');
console.log(planResponse.data.plan);
```

---

## 🎯 Key Features Delivered

✅ **AI Life Coach Chatbot**
- Real-time conversational AI
- Context awareness based on user goals
- Conversation history tracking

✅ **AI Plan Generation**
- Daily plans with time blocking
- Weekly strategic plans
- Monthly milestone planning

✅ **Smart Suggestions**
- Task prioritization based on goals
- Morning routine optimization
- Time-based recommendations

✅ **Full CRUD Operations**
- Create, read, update, delete plans
- Manage conversations
- Track conversation history

✅ **Database Integration**
- All conversations saved
- Plans stored with status tracking
- Activity logging

---

## 📊 Monitor Usage

### Check Token Usage
Every AI response includes usage information:

```json
{
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 456,
    "total_tokens": 579
  }
}
```

### Database Queries

```sql
-- Check all conversations
SELECT * FROM conversations ORDER BY created_at DESC LIMIT 10;

-- Check all messages in a conversation
SELECT * FROM messages WHERE conversation_id = 'uuid-here' ORDER BY timestamp;

-- Check generated plans
SELECT * FROM daily_plans ORDER BY date DESC LIMIT 10;
SELECT * FROM weekly_plans ORDER BY week_start_date DESC LIMIT 10;
SELECT * FROM monthly_plans ORDER BY month_start_date DESC LIMIT 10;

-- Check activity logs
SELECT * FROM activity_logs WHERE type = 'AI_CHAT' ORDER BY created_at DESC LIMIT 20;
```

---

## 🔥 Pro Tips

1. **Start with Quick Chat** - Test the basic AI functionality first
2. **Use Conversation IDs** - Continue conversations by passing `conversationId`
3. **Be Specific** - More detailed input = better AI responses
4. **Check Logs** - Activity logs track all AI interactions
5. **Monitor Costs** - Track token usage to manage OpenAI costs

---

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ Server shows "OpenAI service initialized successfully"
- ✅ Chat responses are relevant and helpful
- ✅ Plans are detailed and actionable
- ✅ Conversations are saved to database
- ✅ No errors in console

---

## 📞 Need Help?

Check these resources:
1. [AI_INTEGRATION_GUIDE.md](./AI_INTEGRATION_GUIDE.md) - Complete documentation
2. OpenAI Docs: https://platform.openai.com/docs
3. Database: `npm run prisma:studio` to view data

---

**🚀 You're all set! Start testing the AI features now!**
