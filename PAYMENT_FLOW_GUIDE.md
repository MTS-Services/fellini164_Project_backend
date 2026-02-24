# Stripe Payment Flow - Complete Guide

## ❌ Common Issue: Plan Not Updating After create-checkout

If you're calling `POST /api/v1/payments/create-checkout` and the user's subscriptionPlan is NOT updating and no Payment record is created, it means **you haven't completed the full payment flow**.

---

## ✅ Proper Payment Flow

### Step 1: Create Checkout Session
```http
POST {{baseUrl}}/api/v1/payments/create-checkout
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "plan": "PRO",
  "billingPeriod": "monthly"
}
```

**Valid Plans:** `STARTER`, `PRO`, `ULTIMATE`  
**Valid Billing Periods:** `monthly`, `yearly`

**Response:**
```json
{
  "success": true,
  "message": "Checkout session created successfully",
  "data": {
    "sessionId": "cs_test_a1b2c3...",
    "url": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3..."
  }
}
```

### Step 2: Complete Payment on Stripe Hosted Page

**YOU MUST visit the `url` returned from Step 1 in a browser:**

1. Copy the `url` from the response
2. Open it in a browser
3. Enter Stripe test card: `4242 4242 4242 4242`
4. Any future expiry date (e.g., 12/26)
5. Any CVC (e.g., 123)
6. Any ZIP code (e.g., 12345)
7. Click "Pay"

### Step 3: Automatic Processing

After successful payment on Stripe, **TWO things happen automatically:**

#### A) User Redirect (Frontend Flow)
Stripe redirects to:
```
{{baseUrl}}/api/v1/payments/success?session_id=cs_test_a1b2c3...
```

This endpoint:
- ✅ Updates user's `subscriptionPlan` to `PRO`
- ✅ Sets `subscriptionStatus` to `ACTIVE`
- ✅ Creates Payment record in database
- ✅ Creates SUBSCRIPTION_STARTED ActivityLog
- ✅ Creates PAYMENT_SUCCEEDED ActivityLog

#### B) Stripe Webhook (Backend Flow) 
Stripe sends webhook event to:
```
{{baseUrl}}/api/v1/payments/webhook
```

This webhook:
- Receives `checkout.session.completed` event
- Does the same updates as redirect (with duplicate prevention)
- More reliable than redirect in production

---

## 🔍 Why Your Test Didn't Work

**What you did:**
```
POST /api/v1/payments/create-checkout → Got sessionId → Stopped here ❌
```

**What you should do:**
```
POST /api/v1/payments/create-checkout 
  → Got sessionId and URL 
  → Visit URL in browser 
  → Complete payment with test card
  → Stripe redirects to /success
  → Plan updates automatically ✅
```

---

## 🧪 How to Test in Postman

### Option 1: Full Browser Flow (Recommended)

1. **Create checkout session** in Postman
2. **Copy the `url`** from response
3. **Open URL in browser**
4. **Complete payment** with test card (4242 4242 4242 4242)
5. **After redirect**, check:
   ```http
   GET {{baseUrl}}/api/v1/payments/subscription-status
   Authorization: Bearer {{token}}
   ```

### Option 2: Simulate Success Callback (Development Only)

After creating checkout session, manually call:
```http
GET {{baseUrl}}/api/v1/payments/success?session_id={{sessionId}}
```

**Note:** This only works if the session was actually paid in Stripe, otherwise you'll get an error.

### Option 3: Test with Stripe CLI (Advanced)

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/v1/payments/webhook

# Trigger test checkout completion
stripe trigger checkout.session.completed
```

---

## 📊 Verify Payment Success

After completing payment, verify with these endpoints:

### 1. Check Subscription Status
```http
GET {{baseUrl}}/api/v1/payments/subscription-status
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "plan": "PRO",
    "status": "ACTIVE",
    "startDate": "2026-02-24T...",
    "currentPeriodEnd": "2026-03-24T...",
    "cancelAtPeriodEnd": false,
    "willRenew": true,
    "price": "$39/month"
  }
}
```

### 2. Check Payment History
```http
GET {{baseUrl}}/api/v1/payments/history
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "amount": 39,
      "currency": "USD",
      "status": "COMPLETED",
      "provider": "STRIPE",
      "plan": "PRO",
      "billingPeriod": "monthly",
      "description": "PRO Plan - Monthly Subscription",
      "paidAt": "2026-02-24T...",
      "createdAt": "2026-02-24T..."
    }
  ]
}
```

### 3. Check Activity Logs
```http
GET {{baseUrl}}/api/v1/users/activity-logs?type=SUBSCRIPTION_STARTED
Authorization: Bearer {{token}}
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Payment not completed"
**Cause:** You didn't actually complete payment on Stripe checkout page  
**Solution:** Visit the checkout URL and enter test card details

### Issue 2: "Missing session ID"
**Cause:** Calling /success endpoint without session_id parameter  
**Solution:** Stripe automatically adds session_id when redirecting after payment

### Issue 3: "Stripe not configured"
**Cause:** Missing environment variables  
**Solution:** Ensure .env has:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://backendtest.elyxaai.com/api/v1/payments/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://backendtest.elyxaai.com/api/v1/payments/cancel
```

### Issue 4: Duplicate payment records
**Cause:** Both webhook and redirect handler creating records  
**Solution:** ✅ Already fixed! Duplicate prevention added to both handlers

---

## 🎯 Production Deployment Checklist

1. ✅ Configure Stripe webhook endpoint in Stripe Dashboard:
   - URL: `https://your-domain.com/api/v1/payments/webhook`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`

2. ✅ Set STRIPE_WEBHOOK_SECRET from Stripe Dashboard

3. ✅ Update success/cancel URLs in .env

4. ✅ Test with live mode API keys (starts with `sk_live_...`)

---

## 📝 Summary

**The subscription plan ONLY updates after:**
1. ✅ Creating checkout session
2. ✅ Visiting Stripe checkout page  
3. ✅ Completing payment with card
4. ✅ Stripe redirects to success endpoint OR sends webhook

Simply calling `POST /create-checkout` is **NOT enough**. You must complete the full payment flow.

**Remember:** Postman cannot complete the Stripe checkout flow. You must use a browser or simulate the success callback.
