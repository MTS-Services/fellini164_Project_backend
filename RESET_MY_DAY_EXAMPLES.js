// Reset My Day - API Testing Examples
// Use these examples with Postman, Thunder Client, or curl

// ============================================
// 1. GET TODAY'S PLAN
// ============================================

/*
GET http://localhost:5000/api/daily-plans/today
Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
{
  "success": true,
  "data": {
    "id": "...",
    "userId": "...",
    "date": "2026-01-13T00:00:00.000Z",
    "title": "Daily Plan - 1/13/2026",
    "content": "...",
    "resetCount": 0,
    "lastResetAt": null,
    "resets": []
  }
}
*/

// ============================================
// 2. RESET MY DAY - Low Energy
// ============================================

/*
POST http://localhost:5000/api/daily-plans/reset
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "reason": "LOW_ENERGY"
}

Expected Response:
{
  "success": true,
  "message": "Your day has been reset to match reality.",
  "data": {
    "plan": { ... },
    "reset": { ... },
    "adaptationSteps": [
      "Kept top 2 priorities: ...",
      "Deferred to tomorrow: ...",
      "Broke down into smaller steps: ...",
      "Adjusted focus blocks to match remaining time"
    ],
    "encouragement": "Life happened. We've adapted. Let's make progress."
  }
}
*/

// ============================================
// 3. RESET MY DAY - Unexpected Meetings
// ============================================

/*
POST http://localhost:5000/api/daily-plans/reset
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "reason": "UNEXPECTED_MEETINGS",
  "customReason": "Client call ran 2 hours over schedule"
}
*/

// ============================================
// 4. RESET MY DAY - Custom Reason
// ============================================

/*
POST http://localhost:5000/api/daily-plans/reset
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "reason": "OTHER",
  "customReason": "Family emergency required my attention"
}
*/

// ============================================
// 5. RESET SPECIFIC PLAN (not today)
// ============================================

/*
POST http://localhost:5000/api/daily-plans/reset
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "planId": "YOUR_PLAN_UUID_HERE",
  "reason": "LOST_FOCUS"
}
*/

// ============================================
// 6. GET RESET HISTORY
// ============================================

/*
GET http://localhost:5000/api/daily-plans/YOUR_PLAN_ID/reset-history
Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "...",
      "reason": "LOW_ENERGY",
      "previousContent": "...",
      "newContent": "...",
      "adaptationSummary": "...",
      "createdAt": "..."
    }
  ]
}
*/

// ============================================
// CURL EXAMPLES
// ============================================

// Get Today's Plan
/*
curl -X GET http://localhost:5000/api/daily-plans/today \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
*/

// Reset My Day
/*
curl -X POST http://localhost:5000/api/daily-plans/reset \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "LOW_ENERGY"}'
*/

// Get Reset History
/*
curl -X GET http://localhost:5000/api/daily-plans/PLAN_ID/reset-history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
*/

// ============================================
// NODE.JS / FETCH EXAMPLES
// ============================================

// Reset My Day Function
async function resetMyDay(token, reason, customReason = null) {
  try {
    const response = await fetch('http://localhost:5000/api/daily-plans/reset', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason,
        customReason
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Plan Reset Successfully!');
      console.log('Adaptation Steps:', data.data.adaptationSteps);
      console.log('Encouragement:', data.data.encouragement);
      return data.data.plan;
    } else {
      console.error('❌ Reset Failed:', data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get Today's Plan Function
async function getTodayPlan(token) {
  try {
    const response = await fetch('http://localhost:5000/api/daily-plans/today', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('📅 Today\'s Plan:', data.data.title);
      console.log('Reset Count:', data.data.resetCount);
      return data.data;
    } else {
      console.log('ℹ️ No plan for today');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Usage Example
/*
const token = 'your-jwt-token-here';

// Get today's plan first
const plan = await getTodayPlan(token);

// Reset if needed
if (plan) {
  await resetMyDay(token, 'LOW_ENERGY', 'Didn\'t sleep well last night');
}
*/

// ============================================
// TESTING WORKFLOW
// ============================================

/*
1. First, generate a daily plan using the planning API:
   POST /api/planning/generate-daily

2. Get today's plan to see the original:
   GET /api/daily-plans/today

3. Reset the plan with a reason:
   POST /api/daily-plans/reset
   Body: { "reason": "LOW_ENERGY" }

4. Check the adapted plan:
   GET /api/daily-plans/today
   (Notice resetCount incremented, lastResetAt updated)

5. View reset history:
   GET /api/daily-plans/:planId/reset-history
   (See all reset events with before/after snapshots)
*/

// ============================================
// ERROR SCENARIOS TO TEST
// ============================================

/*
1. No plan exists for today:
   POST /api/daily-plans/reset
   Expected: 404 "Daily plan not found"

2. Invalid reason:
   POST /api/daily-plans/reset
   Body: { "reason": "INVALID_REASON" }
   Expected: 400 "Invalid reset reason"

3. Unauthorized access:
   GET /api/daily-plans/today
   (No token or invalid token)
   Expected: 401 "Unauthorized"

4. AI service not configured:
   POST /api/daily-plans/reset
   (If OPENAI_API_KEY not set)
   Expected: 503 "AI service not configured"
*/

// ============================================
// FRONTEND INTEGRATION TIPS
// ============================================

/*
1. Dashboard Button:
   - Place "Reset My Day" button prominently
   - Show reset count badge if > 0
   - Add microcopy: "Life happened. We'll adapt."

2. Auto-Trigger Detection:
   - Check for 3+ skipped tasks
   - Monitor inactivity duration
   - Detect missed focus blocks
   - Show reset prompt automatically

3. Modal Flow:
   - Step 1: Reason selector (optional)
   - Step 2: Processing animation with checklist
   - Step 3: Reveal adapted plan with encouragement

4. Trust Building:
   - Always use empathetic language
   - Never guilt-trip users
   - Show transparency in AI actions
   - Celebrate any progress
*/

module.exports = {
  resetMyDay,
  getTodayPlan
};
