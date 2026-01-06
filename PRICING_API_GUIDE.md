# 💰 Pricing & Payment System - API Guide

## ✅ Complete Implementation

Your backend now has a **complete pricing system** with 4 tiers and yearly billing support.

---

## 📊 PRICING TIERS

### Free - $0/month
- 20 AI messages/day (200/month)
- 1 habit tracker, 1 routine
- Basic daily planner
- Limited history
- 1 basic AI persona

### Starter - $7.99/month or $79/year
- Unlimited AI chat (fair use)
- Unlimited task planning
- Daily automation
- 1 AI persona
- Monthly summaries

### Pro - $17.99/month or $179/year ⭐ Most Popular
- Everything in Starter
- Weekly & monthly planning
- 3 AI personas
- AI productivity analysis
- Weekly review reports
- Priority task optimization

### Ultimate - $39.99/month or $399/year
- Everything in Pro
- AI-generated Life Blueprint
- AI voice coach
- AI routine optimizer
- All AI personas
- Early feature access

---

## 🔌 API ENDPOINTS

### 1. **Get Available Plans** (PUBLIC)
```http
GET {{baseUrl}}/api/v1/payment/plans
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "FREE",
        "name": "Free",
        "tagline": "Try the core experience",
        "price": {
          "monthly": { "amount": 0, "display": "$0/month" },
          "yearly": { "amount": 0, "display": "$0/year" }
        },
        "features": [...],
        "cta": "Start Free"
      },
      {
        "id": "STARTER",
        "name": "Starter",
        "price": {
          "monthly": { "amount": 799, "display": "$7.99/month" },
          "yearly": { "amount": 7900, "display": "$79/year", "savings": "$16.88" }
        },
        "features": [...],
        "cta": "Start 7-Day Trial"
      }
      // ... PRO and ULTIMATE
    ]
  }
}
```

---

### 2. **Get Waitlist Count** (PUBLIC)
```http
GET {{baseUrl}}/api/v1/auth/waitlist-count
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 123,
    "message": "123 people waiting"
  }
}
```

Use this for social proof: "123 people waiting"

---

### 3. **Create Checkout Session** (PROTECTED)
```http
POST {{baseUrl}}/api/v1/payment/create-checkout
Authorization: Bearer <token>
```

**Body:**
```json
{
  "plan": "PRO",
  "billingPeriod": "yearly"
}
```

**Options:**
- `plan`: `"STARTER"`, `"PRO"`, or `"ULTIMATE"`
- `billingPeriod`: `"monthly"` or `"yearly"`

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_...",
    "url": "https://checkout.stripe.com/pay/..."
  }
}
```

**Usage:**
1. Call this endpoint from your frontend
2. Redirect user to the `url` returned
3. Stripe handles payment
4. User redirected to success/cancel URL
5. Webhook updates user's subscription

---

### 4. **Get Subscription Status** (PROTECTED)
```http
GET {{baseUrl}}/api/v1/payment/subscription-status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptionPlan": "PRO",
    "subscriptionStatus": "ACTIVE",
    "subscriptionStartDate": "2026-01-01",
    "subscriptionEndDate": "2027-01-01",
    "currentPeriodEnd": "2027-01-01",
    "cancelAtPeriodEnd": false
  }
}
```

---

### 5. **Cancel Subscription** (PROTECTED)
```http
POST {{baseUrl}}/api/v1/payment/cancel-subscription
Authorization: Bearer <token>
```

Cancels at period end - user keeps access until then.

---

### 6. **Get Payment History** (PROTECTED)
```http
GET {{baseUrl}}/api/v1/payment/history
Authorization: Bearer <token>
```

---

## 🔧 SETUP REQUIRED

### 1. **Stripe Configuration**

Add to your `.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://yourapp.com/payment/success
STRIPE_CANCEL_URL=https://yourapp.com/payment/cancel
```

### 2. **Stripe Webhook Setup**

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourapi.com/api/v1/payment/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to `.env`

---

## 🎯 FRONTEND INTEGRATION EXAMPLE

```javascript
// 1. Get available plans
const plansResponse = await fetch('{{baseUrl}}/api/v1/payment/plans');
const { data } = await plansResponse.json();
const plans = data.plans;

// 2. Show waitlist counter
const countResponse = await fetch('{{baseUrl}}/api/v1/auth/waitlist-count');
const { data: countData } = await countResponse.json();
console.log(countData.message); // "123 people waiting"

// 3. User selects a plan and clicks "Subscribe"
const checkoutResponse = await fetch('{{baseUrl}}/api/v1/payment/create-checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    plan: 'PRO',
    billingPeriod: 'yearly'
  })
});

const { data: checkout } = await checkoutResponse.json();

// 4. Redirect to Stripe Checkout
window.location.href = checkout.url;

// 5. After payment, user is redirected to success URL
// Webhook automatically updates their subscription
```

---

## 📋 USER FLOW

1. **User on Waitlist** → `userStatus: WAITLIST`, `subscriptionPlan: FREE`
2. **Admin grants access** → `userStatus: ACTIVE`
3. **User subscribes to PRO** → `subscriptionPlan: PRO`, `subscriptionStatus: ACTIVE`
4. **Payment fails** → `subscriptionStatus: PAST_DUE`
5. **User cancels** → `cancelAtPeriodEnd: true` (keeps access until period ends)
6. **Period ends** → `subscriptionStatus: CANCELED`, downgrade to `FREE`

---

## ✨ FEATURES IMPLEMENTED

✅ 4-tier pricing (Free, Starter, Pro, Ultimate)  
✅ Monthly and yearly billing options  
✅ Yearly discounts (2 months free)  
✅ Complete feature limits per plan  
✅ Stripe checkout integration  
✅ Webhook handling for subscription updates  
✅ Subscription management (cancel/reactivate)  
✅ Payment history  
✅ Waitlist counter for social proof  
✅ Public pricing API endpoint  

---

## 🧪 TESTING

### Test Monthly Subscription:
```json
POST {{baseUrl}}/api/v1/payment/create-checkout
{
  "plan": "PRO",
  "billingPeriod": "monthly"
}
```

### Test Yearly Subscription (Best Value):
```json
POST {{baseUrl}}/api/v1/payment/create-checkout
{
  "plan": "PRO",
  "billingPeriod": "yearly"
}
```

### Test Cards (Stripe):
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

## 🚀 Ready to Launch!

Your pricing system is **production-ready**. Just add your Stripe keys and you're good to go!
