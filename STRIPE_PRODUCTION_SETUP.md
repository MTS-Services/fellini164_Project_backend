# Stripe Payment - Production Setup Guide

## Live Backend URL
```
https://fellini164-server.mtscorporate.com
```

## Step-by-Step Production Setup

### 1. Update Environment Variables

Update your production server's `.env` file:

```env
# Server Configuration
NODE_ENV=production

# Stripe (Keep test keys until fully tested, then switch to live keys)
STRIPE_SECRET_KEY=sk_test_51SHgzcPc4Do23EYo2xck7p154kGEkwgTYX06L2neyMZtnMGBBS1bOWNHHSc92TcaODRvT6dZTTA7vGRescaJ1JgR00CjLK1ZZu
STRIPE_PUBLISHABLE_KEY=pk_test_51SHgzcPc4Do23EYoRK1Br9UNHmpmAmH3Mc8rHvww2xOYMf2jc4po5AOtOxtbGLO039kYskxM966AlqtBnXiT1UXp00UX7l8LoY
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret_here
STRIPE_SUCCESS_URL=https://fellini164-server.mtscorporate.com/api/v1/payments/success
STRIPE_CANCEL_URL=https://fellini164-server.mtscorporate.com/api/v1/payments/cancel

# Frontend URL (update with your actual frontend domain)
FRONTEND_URL=https://your-frontend-domain.com
```

---

### 2. Configure Stripe Webhook in Dashboard

#### A. Login to Stripe Dashboard
1. Go to: https://dashboard.stripe.com
2. Login with your Stripe account

#### B. Add Webhook Endpoint
1. Navigate to: **Developers** → **Webhooks**
2. Click **"Add endpoint"** button
3. Enter webhook URL:
   ```
   https://fellini164-server.mtscorporate.com/api/v1/payments/webhook
   ```

#### C. Select Events to Listen
Check these events:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

#### D. Get Webhook Signing Secret
1. After creating the endpoint, click on it
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret (starts with `whsec_`)
4. Update in your production `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

---

### 3. Test Stripe Webhook Connection

#### Test from Stripe Dashboard:
1. Go to your webhook endpoint page
2. Click **"Send test webhook"** button
3. Select event: `checkout.session.completed`
4. Click **"Send test webhook"**
5. Check response - should show `200 OK`

#### Check Server Logs:
```bash
# Your server should log:
Processing webhook event: checkout.session.completed
```

---

### 4. Update CORS for Production

Make sure your production server allows your frontend domain:

**File:** `src/server.js`

If you want to restrict to specific domains (recommended):
```javascript
app.use(cors({
  origin: [
    'https://your-frontend-domain.com',
    'https://fellini164-server.mtscorporate.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

Or keep allowing all (less secure):
```javascript
app.use(cors({
  origin: '*',
  credentials: false
}));
```

---

### 5. API Endpoints (Production)

#### Base URL:
```
https://fellini164-server.mtscorporate.com/api/v1
```

#### Create Checkout Session:
```http
POST https://fellini164-server.mtscorporate.com/api/v1/payments/create-checkout
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "plan": "PRO"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Checkout session created successfully",
  "data": {
    "sessionId": "cs_test_...",
    "url": "https://checkout.stripe.com/c/pay/cs_test_..."
  }
}
```

#### Get Subscription Status:
```http
GET https://fellini164-server.mtscorporate.com/api/v1/payments/subscription-status
Authorization: Bearer <JWT_TOKEN>
```

#### Cancel Subscription:
```http
POST https://fellini164-server.mtscorporate.com/api/v1/payments/cancel-subscription
Authorization: Bearer <JWT_TOKEN>
```

#### Payment History:
```http
GET https://fellini164-server.mtscorporate.com/api/v1/payments/history
Authorization: Bearer <JWT_TOKEN>
```

---

### 6. Frontend Integration

#### Step 1: Create Checkout Session
```javascript
const createCheckout = async (plan) => {
  const response = await fetch(
    'https://fellini164-server.mtscorporate.com/api/v1/payments/create-checkout',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ plan })
    }
  );
  
  const data = await response.json();
  
  if (data.success) {
    // Redirect user to Stripe checkout
    window.location.href = data.data.url;
  }
};

// Usage
createCheckout('PRO'); // or 'STARTER' or 'ULTIMATE'
```

#### Step 2: Handle Success/Cancel Pages

After payment, Stripe redirects to:
- **Success:** `https://fellini164-server.mtscorporate.com/api/v1/payments/success?session_id=cs_test_...`
- **Cancel:** `https://fellini164-server.mtscorporate.com/api/v1/payments/cancel`

**Option A:** Redirect to frontend from success/cancel endpoints:

Update `src/routes/payment.routes.js`:
```javascript
// Success redirect
router.get('/success', (req, res) => {
  const sessionId = req.query.session_id;
  res.redirect(`${process.env.FRONTEND_URL}/payment/success?session_id=${sessionId}`);
});

// Cancel redirect
router.get('/cancel', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);
});
```

**Option B:** Use frontend URLs directly in Stripe checkout:

Update `.env`:
```env
STRIPE_SUCCESS_URL=https://your-frontend-domain.com/payment/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://your-frontend-domain.com/payment/cancel
```

---

### 7. Test Complete Payment Flow

#### Test with Stripe Test Cards:

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Declined |
| `4000 0025 0000 3155` | 🔐 3D Secure |

**Test Flow:**
1. Login to your app → Get JWT token
2. Call `POST /api/v1/payments/create-checkout` with plan
3. Open returned checkout URL
4. Enter test card: `4242 4242 4242 4242`
5. Expiry: `12/26`, CVV: `123`, ZIP: `12345`
6. Complete payment
7. Should redirect to success URL
8. Check webhook was received (check server logs)
9. Verify user subscription updated in database
10. Call `GET /api/v1/payments/subscription-status` to confirm

---

### 8. Switch to Live Mode (When Ready)

#### A. Activate Your Stripe Account
1. Go to: https://dashboard.stripe.com
2. Complete account activation
3. Add business details
4. Add bank account for payouts

#### B. Get Live API Keys
1. Navigate to: **Developers** → **API keys**
2. Toggle **"Viewing test data"** to **OFF** (live mode)
3. Copy **Live** keys:
   - Secret key (starts with `sk_live_`)
   - Publishable key (starts with `pk_live_`)

#### C. Create Live Webhook
1. In **live mode**, go to **Developers** → **Webhooks**
2. Add endpoint: `https://fellini164-server.mtscorporate.com/api/v1/payments/webhook`
3. Select same events as test mode
4. Get new **live** webhook secret (`whsec_live_...`)

#### D. Update Production .env
```env
NODE_ENV=production

# LIVE Stripe Keys
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

#### E. Restart Server
```bash
pm2 restart fellini-backend
# or however you manage your production server
```

---

### 9. Monitoring & Logs

#### Check Webhook Delivery:
- Go to: https://dashboard.stripe.com/webhooks
- Click on your webhook endpoint
- View **"Recent events"** tab
- Check for failed deliveries

#### Check Server Logs:
```bash
# View logs
tail -f logs/combined.log

# Search for payment logs
grep "checkout" logs/combined.log
grep "webhook" logs/combined.log
```

#### Monitor Payments:
- Stripe Dashboard: https://dashboard.stripe.com/payments
- View all transactions, refunds, disputes

---

### 10. Security Checklist

Production security requirements:

- ✅ HTTPS enabled on your domain
- ✅ Webhook signature verification enabled
- ✅ Environment variables secured (not in git)
- ✅ JWT_SECRET changed from default
- ✅ Rate limiting enabled
- ✅ CORS configured for your frontend domain only
- ✅ Database credentials secured
- ✅ Stripe live keys stored securely
- ✅ Error monitoring setup (e.g., Sentry)
- ✅ Server logs monitored regularly

---

### 11. Troubleshooting

#### Webhook Not Receiving Events:
```bash
# Check if endpoint is accessible
curl -X POST https://fellini164-server.mtscorporate.com/api/v1/payments/webhook

# Should return: "Webhook Error: No signature provided"
# This means endpoint is reachable
```

#### Signature Verification Failed:
- Check `STRIPE_WEBHOOK_SECRET` matches Dashboard
- Ensure webhook endpoint uses raw body parser
- Verify server is receiving POST requests

#### Subscription Not Updating:
- Check webhook events in Stripe Dashboard
- Check server logs for errors
- Verify database connection
- Ensure user ID in metadata matches DB

#### CORS Error:
- Add your frontend domain to CORS whitelist
- Check browser console for specific error
- Ensure preflight OPTIONS requests are handled

---

### 12. Support & Resources

**Stripe Documentation:**
- Testing: https://stripe.com/docs/testing
- Webhooks: https://stripe.com/docs/webhooks
- Checkout: https://stripe.com/docs/payments/checkout

**Stripe Dashboard:**
- Test Mode: https://dashboard.stripe.com/test
- Live Mode: https://dashboard.stripe.com

**Your Endpoints:**
- Webhook: https://fellini164-server.mtscorporate.com/api/v1/payments/webhook
- Create Checkout: https://fellini164-server.mtscorporate.com/api/v1/payments/create-checkout
- Success: https://fellini164-server.mtscorporate.com/api/v1/payments/success
- Cancel: https://fellini164-server.mtscorporate.com/api/v1/payments/cancel

---

## Quick Start Commands

### Deploy to Production:
```bash
# Upload code to server
git push production main

# SSH into server
ssh user@fellini164-server.mtscorporate.com

# Install dependencies
npm install --production

# Run database migrations
npx prisma migrate deploy

# Restart server
pm2 restart fellini-backend

# Check logs
pm2 logs fellini-backend
```

### Test Webhook:
```bash
# From Stripe Dashboard or using curl
curl -X POST https://fellini164-server.mtscorporate.com/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{"type":"test"}'
```

---

## Summary

1. ✅ Updated `.env` with production URLs
2. ⏳ Configure webhook in Stripe Dashboard
3. ⏳ Update webhook secret in `.env`
4. ⏳ Test webhook connection
5. ⏳ Test complete payment flow
6. ⏳ Switch to live keys when ready

**Current Status:** Ready for production testing with test keys. Switch to live keys after testing is complete.
