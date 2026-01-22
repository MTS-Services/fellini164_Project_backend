# AI Support Quick Reference 🚀

## Setup Checklist
- [ ] Add `OPENAI_API_KEY` to `.env`
- [ ] Run `npx prisma migrate dev --name add_ai_support_system`
- [ ] Run `node prisma/seed-knowledge-base.js`
- [ ] Test: `POST /api/v1/support/chat/start`
- [ ] Copy Assistant ID from console to `.env`
- [ ] Restart server

## Key Endpoints

### Start Chat
```bash
POST /api/v1/support/chat/start
Body: { "message": "How do I upgrade?" }
```

### Continue Chat
```bash
POST /api/v1/support/chat/continue
Body: { "conversationId": "uuid", "message": "Tell me more" }
```

### Escalate
```bash
POST /api/v1/support/chat/escalate
Body: { "conversationId": "uuid", "reason": "Need refund" }
```

### Search KB
```bash
GET /api/v1/support/knowledge/search?query=billing
```

### Admin Analytics
```bash
GET /api/v1/admin/support/analytics
Headers: Authorization: Bearer {admin_token}
```

## Quick Test
```bash
# Test support chat
curl -X POST http://localhost:5000/api/v1/support/chat/start \
  -H "Content-Type: application/json" \
  -d '{"message":"How do I upgrade my plan?"}'
```

## Frontend Widget (Copy-Paste Ready)
Place this in your app:
```jsx
<SupportWidget 
  apiUrl="/api/v1/support"
  theme="light"
/>
```

## Common Issues

**Q: AI not responding?**  
A: Check OPENAI_API_KEY in .env

**Q: Knowledge base empty?**  
A: Run `node prisma/seed-knowledge-base.js`

**Q: Assistant not found?**  
A: Set OPENAI_SUPPORT_ASSISTANT_ID in .env

## Analytics Dashboard URL
```
http://localhost:5000/api/v1/admin/support/analytics
```

## Cost Per 1000 Users
- AI handles 80% = 800 conversations
- Average cost: $0.05/conversation
- Monthly cost: ~$40

**ROI: Saves ~60 hours of support time!**

---

**Full Documentation:** `AI_SUPPORT_SYSTEM_COMPLETE.md`
