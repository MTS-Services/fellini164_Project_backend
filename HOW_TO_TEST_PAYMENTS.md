# How to Test Stripe Payments Properly

## ❌ Common Mistake

**What you're doing:**
```
1. POST /create-checkout → Get sessionId
2. POST /success?session_id=xxx → "Payment successful"
3. Check /history → Empty! No payment recorded ❌
```

**Problem:** You're calling the success endpoint **WITHOUT actually paying** on Stripe's checkout page!

---

## ✅ Correct Payment Flow

### Step 1: Create Checkout Session
```http
POST {{baseUrl}}/api/v1/payments/create-checkout
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "plan": "PRO",
  "billingPeriod": "yearly"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_a1n10UUE...",
    "url": "https://checkout.stripe.com/c/pay/cs_test_..."
  }
}
```

### Step 2: **CRITICAL** - Complete Payment on Stripe

**You MUST do this step:**

1. **Copy the `url`** from Step 1 response
2. **Open it in a web browser** (Chrome, Firefox, etc.)
3. **Enter test card details:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/26`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)
4. **Click "Pay"** button
5. **Wait for redirect** - Stripe will redirect to:
   ```
   https://backendtest.elyxaai.com/api/v1/payments/success?session_id=cs_test_...
   ```

### Step 3: Verify Payment Processed

After Stripe redirects you, check:

```http
GET {{baseUrl}}/api/v1/payments/history
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "...",
        "amount": 499,
        "currency": "USD",
        "status": "COMPLETED",
        "plan": "PRO",
        "billingPeriod": "yearly",
        "description": "PRO Plan - Annual Subscription",
        "paidAt": "2026-02-24T...",
        "createdAt": "2026-02-24T..."
      }
    ]
  }
}
```

---

## 🔍 Diagnostic Tool - Check Session Status

**To check if a session was actually paid:**

```http
GET {{baseUrl}}/api/v1/payments/check-session?session_id=cs_test_a1n10UUE...
Authorization: Bearer {{token}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_a1n10UUE...",
    "paymentStatus": "unpaid",  // ⚠️ NOT PAID!
    "isPaid": false,            // ⚠️ Payment not completed
    "paymentRecordExists": false,
    "paymentRecord": null,
    "userInfo": null,
    "nextSteps": "Visit the checkout URL to complete payment with test card: 4242 4242 4242 4242"
  }
}
```

If payment was completed, you'll see:
```json
{
  "paymentStatus": "paid",     // ✅ PAID!
  "isPaid": true,              // ✅ Payment completed
  "paymentRecordExists": true,
  "paymentRecord": {
    "id": "...",
    "plan": "PRO",
    "status": "COMPLETED"
  }
}
```

---

## 🧪 Why Postman Alone Won't Work

**Postman cannot:**
- ❌ Display Stripe's hosted checkout page
- ❌ Enter credit card information
- ❌ Complete 3D Secure verification
- ❌ Trigger Stripe's payment processing

**You need a browser to:**
- ✅ See Stripe's secure payment form
- ✅ Enter test card details
- ✅ Complete the payment
- ✅ Get redirected after success

---

## 🎯 Complete Test Workflow

### Option 1: Browser + Postman (Recommended)

1. **Postman:** Create checkout session → Get URL
2. **Browser:** Visit URL → Complete payment → Get redirected
3. **Postman:** Check history → Verify payment recorded

### Option 2: Frontend Integration (Production Way)

```javascript
// Frontend code
const response = await fetch('/api/v1/payments/create-checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    plan: 'PRO',
    billingPeriod: 'yearly'
  })
});

const { data } = await response.json();

// Redirect user to Stripe checkout
window.location.href = data.url;

// After payment, Stripe redirects back to your success page
// Your backend processes the payment automatically
```

### Option 3: Stripe CLI (Advanced Testing)

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/v1/payments/webhook

# Trigger test events
stripe trigger checkout.session.completed
```

---

## 📊 Verify Everything is Working

After completing payment in browser, check these endpoints:

### 1. Subscription Status
```http
GET {{baseUrl}}/api/v1/payments/subscription-status
Authorization: Bearer {{token}}
```

Expected: `plan: "PRO"`, `status: "ACTIVE"`

### 2. Payment History
```http
GET {{baseUrl}}/api/v1/payments/history
Authorization: Bearer {{token}}
```

Expected: Array with 1+ payment records

### 3. Activity Logs
```http
GET {{baseUrl}}/api/v1/users/activity-logs?type=PAYMENT_SUCCEEDED
Authorization: Bearer {{token}}
```

Expected: Logs showing payment success and subscription start

---

## 🚨 Common Issues & Solutions

### Issue 1: "alreadyProcessed: true" but history is empty

**Cause:** You called success endpoint without paying. Session wasn't actually paid.

**Solution:** 
```http
GET {{baseUrl}}/api/v1/payments/check-session?session_id=YOUR_SESSION_ID
```
Check `isPaid` field. If `false`, open the checkout URL in browser and pay.

### Issue 2: "Payment not completed" error

**Cause:** Correct! You didn't complete payment yet.

**Solution:** Visit the checkout URL in browser and enter test card.

### Issue 3: Session expired

**Cause:** Stripe checkout sessions expire after 24 hours.

**Solution:** Create a new checkout session.

### Issue 4: Webhook not receiving events

**Cause:** 
- Webhook URL not configured in Stripe Dashboard
- Wrong webhook secret in .env

**Solution:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://backendtest.elyxaai.com/api/v1/payments/webhook`
3. Select events: `checkout.session.completed`, `invoice.payment_succeeded`, etc.
4. Copy webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`

---

## 📝 Quick Reference: Test Cards

| Card Number | Description |
|-------------|-------------|
| 4242 4242 4242 4242 | Success (any CVC, any future date) |
| 4000 0000 0000 9995 | Declined (insufficient funds) |
| 4000 0000 0000 0002 | Declined (card declined) |
| 4000 0025 0000 3155 | Requires authentication |

More test cards: https://stripe.com/docs/testing

---

## 🎬 Summary

**The KEY point:** Calling `POST /create-checkout` only **creates a session**. It does NOT charge the card or record payment.

**To actually process payment:**
1. Create session (API)
2. **Visit checkout URL in browser** 👈 THIS IS REQUIRED
3. Enter card details
4. Complete payment
5. THEN payment is recorded

**You cannot test the full payment flow with Postman alone.** You need a browser to complete the Stripe checkout.
