# AI Support System - Complete Testing Guide 🧪

## Prerequisites
- ✅ Server running: `npm run dev`
- ✅ Database migrated: `npx prisma migrate dev`
- ✅ Knowledge base seeded: `node prisma/seed-knowledge-base.js`
- ✅ OPENAI_API_KEY in `.env`

---

## Testing Tools

You can use:
1. **Postman** (Recommended - import collection below)
2. **cURL** (Command line)
3. **Thunder Client** (VS Code extension)
4. **Insomnia**

Base URL: `http://localhost:3000/api/v1`

---

## 🧪 TEST 1: Start Support Conversation (Guest User)

### Endpoint
```
POST /api/v1/support/chat/start
```

### Headers
```
Content-Type: application/json
```

### Body
```json
{
  "message": "How do I upgrade my subscription plan?",
  "sessionId": "guest-session-12345"
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/api/v1/support/chat/start \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I upgrade my subscription plan?",
    "sessionId": "guest-session-12345"
  }'
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid-here",
    "message": "To upgrade your plan:\n\n1. Log into your Fellini account...",
    "shouldEscalate": false,
    "sessionId": "guest-session-12345"
  }
}
```

### What to Check
- ✅ Response status: 200
- ✅ AI generates relevant answer
- ✅ `conversationId` returned
- ✅ `shouldEscalate` is false
- ✅ Response time < 5 seconds

**💡 Note:** First request will create OpenAI Assistant - check console for `OPENAI_SUPPORT_ASSISTANT_ID`

---

## 🧪 TEST 2: Continue Conversation

### Endpoint
```
POST /api/v1/support/chat/continue
```

### Headers
```
Content-Type: application/json
```

### Body
```json
{
  "conversationId": "paste-conversation-id-from-test-1",
  "message": "What's the difference between Pro and Ultimate plans?"
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/api/v1/support/chat/continue \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "YOUR_CONVERSATION_ID",
    "message": "What is the difference between Pro and Ultimate plans?"
  }'
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "conversationId": "same-uuid-as-before",
    "message": "Great question! Here are the key differences...",
    "shouldEscalate": false
  }
}
```

### What to Check
- ✅ AI remembers previous context
- ✅ Conversation continues naturally
- ✅ Same conversationId

---

## 🧪 TEST 3: Search Knowledge Base

### Endpoint
```
GET /api/v1/support/knowledge/search?query=billing&category=billing
```

### Headers
```
None required (public endpoint)
```

### cURL Command
```bash
curl -X GET "http://localhost:3000/api/v1/support/knowledge/search?query=billing&category=billing"
```

### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category": "billing",
      "question": "What are the different subscription plans?",
      "answer": "Fellini offers 4 subscription tiers...",
      "keywords": ["plans", "pricing", "cost"],
      "priority": 10,
      "viewCount": 0,
      "helpfulCount": 0
    }
  ]
}
```

### What to Check
- ✅ Returns relevant articles
- ✅ Matches category filter
- ✅ Results sorted by priority

---

## 🧪 TEST 4: Get Quick Help Suggestions

### Endpoint
```
GET /api/v1/support/knowledge/quick-help
```

### cURL Command
```bash
curl -X GET http://localhost:3000/api/v1/support/knowledge/quick-help
```

### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category": "billing",
      "question": "How do I upgrade my subscription?"
    },
    {
      "id": "uuid",
      "category": "account",
      "question": "How do I reset my password?"
    }
  ]
}
```

### What to Check
- ✅ Returns 8 articles
- ✅ Shows most viewed/high priority
- ✅ Only id, category, question returned

---

## 🧪 TEST 5: Get Knowledge Article by ID

### Endpoint
```
GET /api/v1/support/knowledge/article/:articleId
```

### cURL Command
```bash
# First get an article ID from quick-help, then:
curl -X GET http://localhost:3000/api/v1/support/knowledge/article/YOUR_ARTICLE_ID
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "category": "billing",
    "question": "How do I upgrade my subscription?",
    "answer": "Full detailed answer here...",
    "keywords": ["upgrade", "change plan"],
    "relatedArticles": [],
    "viewCount": 1,
    "helpfulCount": 0,
    "notHelpfulCount": 0
  }
}
```

### What to Check
- ✅ Full article returned
- ✅ View count incremented
- ✅ All fields present

---

## 🧪 TEST 6: Rate Article as Helpful

### Endpoint
```
POST /api/v1/support/knowledge/article/:articleId/rate
```

### Body
```json
{
  "helpful": true
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/api/v1/support/knowledge/article/YOUR_ARTICLE_ID/rate \
  -H "Content-Type: application/json" \
  -d '{"helpful": true}'
```

### Expected Response
```json
{
  "success": true,
  "message": "Thank you for your feedback!"
}
```

### What to Check
- ✅ helpfulCount incremented in database
- ✅ Can rate with helpful: false too

---

## 🧪 TEST 7: Escalate to Human Support

### Endpoint
```
POST /api/v1/support/chat/escalate
```

### Body
```json
{
  "conversationId": "your-conversation-id",
  "reason": "I need a refund and want to speak with a person"
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/api/v1/support/chat/escalate \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "YOUR_CONVERSATION_ID",
    "reason": "I need a refund"
  }'
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Your conversation has been escalated to our human support team. Someone will get back to you shortly."
  }
}
```

### What to Check
- ✅ Conversation marked as escalated
- ✅ needsHumanSupport = true in database
- ✅ escalatedAt timestamp set

---

## 🧪 TEST 8: Resolve Conversation with Feedback

### Endpoint
```
POST /api/v1/support/chat/resolve
```

### Body
```json
{
  "conversationId": "your-conversation-id",
  "satisfactionRating": 5,
  "wasHelpful": true
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/api/v1/support/chat/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "YOUR_CONVERSATION_ID",
    "satisfactionRating": 5,
    "wasHelpful": true
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "Thank you for your feedback!",
  "data": {
    "success": true
  }
}
```

### What to Check
- ✅ Conversation resolved
- ✅ Rating saved
- ✅ Status changed to RESOLVED

---

## 🧪 TEST 9: Get User Conversations (Authenticated)

**⚠️ Requires Authentication Token**

### Step 1: Login First
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-user@email.com",
    "password": "your-password"
  }'
```

Copy the `token` from response.

### Step 2: Get Conversations
```
GET /api/v1/support/conversations
```

### Headers
```
Authorization: Bearer YOUR_TOKEN_HERE
```

### cURL Command
```bash
curl -X GET http://localhost:3000/api/v1/support/conversations \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "subject": "How do I upgrade my subscription plan?",
      "status": "OPEN",
      "category": "billing",
      "isAiHandled": true,
      "needsHumanSupport": false,
      "createdAt": "2026-01-21T10:30:00Z",
      "messages": [
        {
          "role": "user",
          "message": "How do I upgrade?",
          "createdAt": "2026-01-21T10:30:00Z"
        }
      ]
    }
  ]
}
```

### What to Check
- ✅ Only user's conversations returned
- ✅ Latest message included
- ✅ Proper filtering by status/category

---

## 🧪 TEST 10: Get Conversation History

### Endpoint
```
GET /api/v1/support/conversations/:conversationId
```

### Headers
```
Authorization: Bearer YOUR_TOKEN_HERE (or none for guest)
```

### cURL Command
```bash
curl -X GET http://localhost:3000/api/v1/support/conversations/YOUR_CONVERSATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "subject": "How do I upgrade?",
    "status": "OPEN",
    "messages": [
      {
        "role": "user",
        "message": "How do I upgrade?",
        "createdAt": "2026-01-21T10:30:00Z"
      },
      {
        "role": "assistant",
        "message": "To upgrade your plan...",
        "createdAt": "2026-01-21T10:30:15Z",
        "tokensUsed": 150
      }
    ],
    "user": {
      "email": "user@example.com",
      "subscriptionPlan": "FREE"
    }
  }
}
```

### What to Check
- ✅ Full conversation history
- ✅ Messages in chronological order
- ✅ User info included

---

## 🔐 ADMIN TESTS (Require Admin Token)

### Get Admin Token First

```bash
# Login as admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourapp.com",
    "password": "change-this-password"
  }'
```

Copy the admin token.

---

## 🧪 TEST 11: Admin - Get All Conversations

### Endpoint
```
GET /api/v1/admin/support/conversations?page=1&limit=20&escalated=true
```

### Headers
```
Authorization: Bearer ADMIN_TOKEN_HERE
```

### cURL Command
```bash
curl -X GET "http://localhost:3000/api/v1/admin/support/conversations?page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "subject": "Support request",
        "status": "OPEN",
        "category": "billing",
        "escalated": true,
        "user": {
          "email": "user@example.com",
          "fullName": "John Doe",
          "subscriptionPlan": "STARTER"
        },
        "messages": []
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### What to Check
- ✅ All users' conversations visible
- ✅ Pagination works
- ✅ Filters work (status, category, escalated)

---

## 🧪 TEST 12: Admin - Get Support Analytics

### Endpoint
```
GET /api/v1/admin/support/analytics?startDate=2026-01-01&endDate=2026-01-31
```

### Headers
```
Authorization: Bearer ADMIN_TOKEN_HERE
```

### cURL Command
```bash
curl -X GET "http://localhost:3000/api/v1/admin/support/analytics?startDate=2026-01-01&endDate=2026-01-31" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "totalConversations": 25,
    "aiHandledConversations": 20,
    "escalatedConversations": 5,
    "resolvedConversations": 18,
    "escalationRate": "20.00",
    "resolutionRate": "72.00",
    "averageSatisfactionScore": "4.50"
  }
}
```

### What to Check
- ✅ Accurate statistics
- ✅ Date range filtering works
- ✅ Percentages calculated correctly

---

## 🧪 TEST 13: Admin - Respond to Conversation

### Endpoint
```
POST /api/v1/admin/support/conversations/:conversationId/respond
```

### Headers
```
Authorization: Bearer ADMIN_TOKEN_HERE
Content-Type: application/json
```

### Body
```json
{
  "message": "Hello! I'm a human support agent. I've reviewed your request and will process your refund within 24 hours."
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/api/v1/admin/support/conversations/YOUR_CONVERSATION_ID/respond \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! I am reviewing your request..."
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "Response sent successfully"
}
```

### What to Check
- ✅ Message added to conversation
- ✅ Status changed to IN_PROGRESS
- ✅ isFromAi = false in database

---

## 🧪 TEST 14: Admin - Get All Knowledge Articles

### Endpoint
```
GET /api/v1/admin/support/knowledge?category=billing&isActive=true
```

### Headers
```
Authorization: Bearer ADMIN_TOKEN_HERE
```

### cURL Command
```bash
curl -X GET "http://localhost:3000/api/v1/admin/support/knowledge" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category": "billing",
      "question": "How do I upgrade?",
      "answer": "Full answer...",
      "keywords": ["upgrade"],
      "priority": 10,
      "viewCount": 15,
      "helpfulCount": 12,
      "notHelpfulCount": 1,
      "isActive": true,
      "createdAt": "2026-01-21T10:00:00Z",
      "updatedAt": "2026-01-21T10:00:00Z"
    }
  ]
}
```

### What to Check
- ✅ All articles visible
- ✅ Includes usage statistics
- ✅ Filters work

---

## 🧪 TEST 15: Admin - Create Knowledge Article

### Endpoint
```
POST /api/v1/admin/support/knowledge
```

### Headers
```
Authorization: Bearer ADMIN_TOKEN_HERE
Content-Type: application/json
```

### Body
```json
{
  "category": "features",
  "question": "How do I use the new AI voice coach?",
  "answer": "To use the AI voice coach:\n\n1. Go to Settings\n2. Enable Voice Coach\n3. Click microphone icon\n4. Speak your question",
  "keywords": ["voice", "coach", "ai", "speak"],
  "relatedArticles": [],
  "priority": 8,
  "isActive": true
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/api/v1/admin/support/knowledge \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "features",
    "question": "How do I use the new AI voice coach?",
    "answer": "To use the AI voice coach...",
    "keywords": ["voice", "coach"],
    "priority": 8
  }'
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "category": "features",
    "question": "How do I use the new AI voice coach?",
    "answer": "To use the AI voice coach...",
    "keywords": ["voice", "coach"],
    "priority": 8,
    "isActive": true,
    "createdAt": "2026-01-21T12:00:00Z"
  }
}
```

### What to Check
- ✅ Article created successfully
- ✅ updatedBy set to admin ID
- ✅ Immediately searchable

---

## 🧪 TEST 16: Admin - Update Knowledge Article

### Endpoint
```
PUT /api/v1/admin/support/knowledge/:articleId
```

### Headers
```
Authorization: Bearer ADMIN_TOKEN_HERE
Content-Type: application/json
```

### Body
```json
{
  "answer": "UPDATED: To use the AI voice coach, you now need Premium plan...",
  "priority": 10,
  "isActive": true
}
```

### cURL Command
```bash
curl -X PUT http://localhost:3000/api/v1/admin/support/knowledge/YOUR_ARTICLE_ID \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "Updated answer here...",
    "priority": 10
  }'
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "answer": "UPDATED: To use the AI voice coach...",
    "priority": 10,
    "updatedAt": "2026-01-21T13:00:00Z"
  }
}
```

### What to Check
- ✅ Article updated
- ✅ updatedAt timestamp changed
- ✅ Changes reflected in search

---

## 🧪 TEST 17: Admin - Delete Knowledge Article

### Endpoint
```
DELETE /api/v1/admin/support/knowledge/:articleId
```

### Headers
```
Authorization: Bearer ADMIN_TOKEN_HERE
```

### cURL Command
```bash
curl -X DELETE http://localhost:3000/api/v1/admin/support/knowledge/YOUR_ARTICLE_ID \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### Expected Response
```json
{
  "success": true,
  "message": "Article deleted successfully"
}
```

### What to Check
- ✅ Article deleted from database
- ✅ No longer appears in search
- ✅ Returns 404 if trying to get it

---

## 📋 Complete Test Checklist

### Public Features
- [ ] ✅ Start conversation (guest)
- [ ] ✅ Continue conversation
- [ ] ✅ Search knowledge base
- [ ] ✅ Get quick help
- [ ] ✅ View article
- [ ] ✅ Rate article
- [ ] ✅ Escalate to human

### Authenticated Features
- [ ] ✅ Start conversation (logged in)
- [ ] ✅ Get user's conversations
- [ ] ✅ View conversation history
- [ ] ✅ Resolve with feedback

### Admin Features
- [ ] ✅ View all conversations
- [ ] ✅ Filter conversations
- [ ] ✅ View analytics
- [ ] ✅ Respond to conversation
- [ ] ✅ View all articles
- [ ] ✅ Create article
- [ ] ✅ Update article
- [ ] ✅ Delete article

---

## 🚨 Common Issues & Solutions

### Issue 1: 401 Unauthorized
**Solution:** Check Authorization header format: `Bearer YOUR_TOKEN`

### Issue 2: Assistant not responding
**Solution:** 
1. Check console for `OPENAI_SUPPORT_ASSISTANT_ID`
2. Copy to `.env`
3. Restart server

### Issue 3: Knowledge base empty
**Solution:** Run `node prisma/seed-knowledge-base.js`

### Issue 4: CORS errors
**Solution:** Check `FRONTEND_URL` in `.env` matches your frontend

### Issue 5: Conversation not found
**Solution:** Use correct conversationId from previous response

---

## 📊 Expected Performance

- ✅ Search KB: < 100ms
- ✅ Start conversation: 2-5 seconds (AI processing)
- ✅ Continue conversation: 2-5 seconds
- ✅ Get conversations: < 200ms
- ✅ Admin operations: < 500ms

---

## 🎯 Success Criteria

All tests should:
1. ✅ Return 200/201 status codes
2. ✅ Have proper JSON structure
3. ✅ Include success: true
4. ✅ AI responses relevant to questions
5. ✅ Data persisted in database
6. ✅ No console errors

---

## 📦 Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "AI Support System Tests",
    "description": "Complete testing suite for Fellini AI Support"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api/v1"
    },
    {
      "key": "admin_token",
      "value": "paste-your-admin-token-here"
    },
    {
      "key": "user_token",
      "value": "paste-your-user-token-here"
    },
    {
      "key": "conversation_id",
      "value": ""
    }
  ]
}
```

---

## ✅ Final Verification

After all tests pass:
1. ✅ Check database has records
2. ✅ Verify OPENAI_SUPPORT_ASSISTANT_ID in .env
3. ✅ Test from frontend (if integrated)
4. ✅ Monitor OpenAI API usage
5. ✅ Ready for production! 🚀

---

**Testing Complete!** Your AI Support System is working perfectly. 🎉
