# Stripe Payment Integration Guide

## Overview
Complete Stripe subscription payment system for Fellini AI Life Coach platform with three subscription tiers.

## Subscription Plans

| Plan | Price | Features |
|------|-------|----------|
| **FREE** | $0/month | 10 AI messages/day, 1 plan/day, 5 goals, No personas |
| **STARTER** | $7.99/month | 1 AI Persona, Unlimited AI Chat, Unlimited planning, Daily automation, Basic goal analysis |
| **PRO** | $17.99/month | Everything in Starter + 3 AI Personas, Weekly & Monthly Planning, AI productivity analysis, Weekly review reports |
| **ULTIMATE** | $39.99/month | Everything in Pro + Unlimited AI Personas, AI Life Blueprint, AI voice coach, AI routine optimizer |

## API Endpoints

### 1. Create Checkout Session
**POST** `/api/v1/payments/create-checkout`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "plan": "STARTER"
}
```

**Valid plans:** `STARTER`, `PRO`, `ULTIMATE`

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

**Usage:**
- Redirect user to the `url` to complete payment
- User will be redirected back to success/cancel URLs after payment

---

### 2. Webhook Handler
**POST** `/api/v1/payments/webhook`

**Headers:**
```
Stripe-Signature: <signature>
Content-Type: application/json
```

**Note:** This endpoint is called by Stripe. No authentication required.

**Events Handled:**
- `checkout.session.completed` - Activates subscription
- `customer.subscription.created` - Records new subscription
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Cancels subscription
- `invoice.payment_succeeded` - Records successful payment
- `invoice.payment_failed` - Marks payment as failed

---

### 3. Get Subscription Status
**GET** `/api/v1/payments/subscription-status`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription status retrieved",
  "data": {
    "plan": "PRO",
    "status": "ACTIVE",
    "currentPeriodStart": "2024-12-15T10:00:00.000Z",
    "currentPeriodEnd": "2025-01-15T10:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "stripeSubscriptionId": "sub_1234...",
    "amount": 1799,
    "currency": "usd"
  }
}
```

---

### 4. Cancel Subscription
**POST** `/api/v1/payments/cancel-subscription`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription will be cancelled at period end",
  "data": {
    "subscriptionId": "sub_1234...",
    "cancelAtPeriodEnd": true,
    "currentPeriodEnd": "2025-01-15T10:00:00.000Z"
  }
}
```

**Note:** Subscription remains active until the end of the billing period.

---

### 5. Reactivate Subscription
**POST** `/api/v1/payments/reactivate-subscription`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription reactivated successfully",
  "data": {
    "subscriptionId": "sub_1234...",
    "cancelAtPeriodEnd": false,
    "status": "active"
  }
}
```

---

### 6. Get Payment History
**GET** `/api/v1/payments/history`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "Payment history retrieved",
  "data": {
    "payments": [
      {
        "id": "pay_123",
        "amount": 1799,
        "currency": "usd",
        "status": "succeeded",
        "createdAt": "2024-12-15T10:00:00.000Z",
        "invoiceId": "in_123",
        "receiptUrl": "https://pay.stripe.com/receipts/..."
      }
    ]
  }
}
```

---

## Testing with Stripe

### Test Card Numbers

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

**Expiry Date:** Any future date (e.g., 12/25)  
**CVV:** Any 3 digits (e.g., 123)  
**ZIP:** Any 5 digits (e.g., 12345)

### Testing Webhooks Locally

#### Install Stripe CLI:
```bash
# Windows (using Scoop)
scoop install stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

#### Login to Stripe:
```bash
stripe login
```

#### Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3000/api/v1/payments/webhook
```

This will output a webhook signing secret like:
```
whsec_xxx...
```

Update your `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxx...
```

#### Trigger test events:
```bash
# Test successful checkout
stripe trigger checkout.session.completed

# Test payment success
stripe trigger payment_intent.succeeded

# Test subscription update
stripe trigger customer.subscription.updated
```

---

## Payment Flow

### Purchase Flow:
1. User clicks "Upgrade to PRO" in frontend
2. Frontend calls `POST /api/v1/payments/create-checkout` with plan
3. Backend creates Stripe checkout session
4. Frontend redirects user to Stripe checkout page
5. User enters payment details and completes purchase
6. Stripe redirects to success URL
7. Stripe sends webhook `checkout.session.completed`
8. Backend updates user subscription to ACTIVE
9. User can now access PRO features

### Subscription Management:
1. User views subscription status: `GET /api/v1/payments/subscription-status`
2. User cancels: `POST /api/v1/payments/cancel-subscription`
   - Subscription remains active until period end
   - `cancelAtPeriodEnd` = true
3. User reactivates: `POST /api/v1/payments/reactivate-subscription`
   - Removes cancellation
   - Subscription continues normally

### Monthly Billing:
1. Stripe automatically charges card on renewal date
2. Webhook `invoice.payment_succeeded` sent to backend
3. Backend records payment in database
4. User subscription continues

### Failed Payment:
1. Stripe attempts to charge card
2. Payment fails
3. Webhook `invoice.payment_failed` sent
4. Backend marks subscription as PAST_DUE
5. User receives email notification
6. Stripe retries payment according to retry settings

---

## Environment Variables Required

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51SHgzcPc4Do23EYo2xck7p154kGEkwgTYX06L2neyMZtnMGBBS1bOWNHHSc92TcaODRvT6dZTTA7vGRescaJ1JgR00CjLK1ZZu
STRIPE_PUBLISHABLE_KEY=pk_test_51SHgzcPc4Do23EYogABjqO7scz8yyI2cywNAKh1Zy2GVXPE9RXRK0s3JfFRzJE3yyYEb0WE5JcWsZZJJ70tWvkHQ00KRVdGMbJ
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# URLs for Stripe redirects
STRIPE_SUCCESS_URL=http://localhost:5173/payment/success
STRIPE_CANCEL_URL=http://localhost:5173/payment/cancel
FRONTEND_URL=http://localhost:5173
```

---

## Postman Collection

### Create Checkout Session:
```
POST http://localhost:3000/api/v1/payments/create-checkout
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "plan": "PRO"
}
```

### Get Subscription Status:
```
GET http://localhost:3000/api/v1/payments/subscription-status
Authorization: Bearer <your_jwt_token>
```

### Cancel Subscription:
```
POST http://localhost:3000/api/v1/payments/cancel-subscription
Authorization: Bearer <your_jwt_token>
```

### Reactivate Subscription:
```
POST http://localhost:3000/api/v1/payments/reactivate-subscription
Authorization: Bearer <your_jwt_token>
```

### Payment History:
```
GET http://localhost:3000/api/v1/payments/history
Authorization: Bearer <your_jwt_token>
```

---

## Database Schema

### User Model (Subscription Fields):
```prisma
model User {
  // ... other fields
  subscriptionPlan      SubscriptionPlan @default(FREE)
  subscriptionStatus    SubscriptionStatus @default(INACTIVE)
  stripeCustomerId      String?
  stripeSubscriptionId  String?
  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  cancelAtPeriodEnd     Boolean @default(false)
}
```

### Payment Model:
```prisma
model Payment {
  id                String   @id @default(uuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  stripePaymentId   String   @unique
  amount            Int
  currency          String
  status            String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## Troubleshooting

### Webhook not receiving events:
- Check webhook secret matches in `.env`
- Verify Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/v1/payments/webhook`
- Check server logs for webhook errors
- Verify endpoint is accessible: `POST http://localhost:3000/api/v1/payments/webhook`

### Payment not updating subscription:
- Check webhook `checkout.session.completed` is being received
- Verify user ID in metadata matches database
- Check server logs for error messages
- Verify Stripe customer ID is stored correctly

### Subscription status not syncing:
- Check webhook events are being processed
- Verify database updates are successful
- Check for network/firewall issues blocking webhooks
- Use Stripe Dashboard to manually check subscription status

---

## Security Notes

1. **Never expose secret keys** in frontend code
2. **Always verify webhook signatures** before processing
3. **Use HTTPS in production** for webhook endpoint
4. **Validate plan names** before creating checkout session
5. **Check user permissions** before allowing subscription changes
6. **Store sensitive data encrypted** in production database
7. **Use environment variables** for all API keys and secrets
8. **Enable Stripe webhook signing** in production
9. **Set up proper error monitoring** for payment failures
10. **Implement rate limiting** on payment endpoints

---

## Production Checklist

- [ ] Replace test API keys with live keys
- [ ] Update webhook endpoint to production URL
- [ ] Configure webhook signing secret from Stripe Dashboard
- [ ] Set up HTTPS for all payment endpoints
- [ ] Configure proper CORS for frontend domain
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure email notifications for failed payments
- [ ] Set up backup payment method collection
- [ ] Implement subscription retry logic
- [ ] Add analytics tracking for payment events
- [ ] Test all payment flows in production mode
- [ ] Document customer support procedures

---

## Support

For Stripe-related issues:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Stripe Dashboard: https://dashboard.stripe.com

For backend issues:
- Check server logs at `logs/` directory
- Review error stack traces
- Verify database connection and migrations
- Test API endpoints with Postman
