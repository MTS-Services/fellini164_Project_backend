# Stripe Payment API - Quick Reference

## Base URL
```
http://localhost:3000/api/v1/payments
```

## Endpoints

### 1. Create Checkout (Buy Subscription)
```http
POST /create-checkout
Authorization: Bearer <token>

{
  "plan": "STARTER" | "PRO" | "ULTIMATE"
}

Response: { sessionId, url }
```

### 2. Webhook (Stripe Callbacks)
```http
POST /webhook
Stripe-Signature: <sig>

(Called by Stripe automatically)
```

### 3. Get Subscription Status
```http
GET /subscription-status
Authorization: Bearer <token>

Response: { plan, status, dates, price }
```

### 4. Cancel Subscription
```http
POST /cancel-subscription
Authorization: Bearer <token>

Response: { cancelAtPeriodEnd: true }
```

### 5. Reactivate Subscription
```http
POST /reactivate-subscription
Authorization: Bearer <token>

Response: { cancelAtPeriodEnd: false }
```

### 6. Payment History
```http
GET /history
Authorization: Bearer <token>

Response: { payments: [...] }
```

## Plans & Pricing

| Plan | Price | Features |
|------|-------|----------|
| FREE | $0 | 10 AI msgs/day, 1 plan/day, 5 goals |
| STARTER | $7.99/mo | 1 persona, unlimited AI & plans |
| PRO | $17.99/mo | 3 personas, weekly/monthly planning |
| ULTIMATE | $39.99/mo | Unlimited personas, AI blueprint |

## Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

Exp: 12/25 | CVV: 123 | ZIP: 12345

## Webhook Testing
```bash
stripe listen --forward-to localhost:3000/api/v1/payments/webhook
```

## Flow
1. User → `POST /create-checkout` → Get checkout URL
2. Redirect user to Stripe checkout page
3. User completes payment
4. Stripe → `POST /webhook` → Update subscription
5. User subscribed! ✅
