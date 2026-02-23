# 🎯 Admin Pricing Management Guide

Complete guide for managing pricing plans and Stripe Price IDs via Admin API.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Get All Pricing Plans](#get-all-pricing-plans)
3. [Update Pricing Plan](#update-pricing-plan)
4. [Update Stripe Price IDs](#update-stripe-price-ids)
5. [Create New Plan](#create-new-plan)
6. [Deactivate Plan](#deactivate-plan)
7. [Pricing Plan Structure](#pricing-plan-structure)
8. [Common Use Cases](#common-use-cases)

---

## Overview

**Base URL**: `{{baseUrl}}/api/v1/admin`

**Authentication**: 
- Required: Admin JWT token
- Roles: `ADMIN` or `SUPER_ADMIN`

**Headers**:
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

---

## Get All Pricing Plans

Retrieve all pricing configurations including Stripe Price IDs.

### Request

```http
GET {{baseUrl}}/api/v1/admin/pricing
Authorization: Bearer {{admin_token}}
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "plan": "FREE",
      "monthlyPrice": 0,
      "yearlyPrice": 0,
      "stripePriceIdMonthly": null,
      "stripePriceIdYearly": null,
      "features": [
        "20 AI messages/day (or 200/month)",
        "1 habit tracker",
        "1 routine",
        "Basic daily planner"
      ],
      "limits": {
        "dailyAiMessages": 20,
        "dailyPlans": 1,
        "maxGoals": 1,
        "maxHabits": 1
      },
      "isActive": true,
      "createdAt": "2026-02-23T10:00:00.000Z",
      "updatedAt": "2026-02-23T10:00:00.000Z",
      "updatedBy": null
    },
    {
      "id": "uuid",
      "plan": "STARTER",
      "monthlyPrice": 7.99,
      "yearlyPrice": 79,
      "stripePriceIdMonthly": "price_1T3s1FPc4Do23EYooQcRMo3N",
      "stripePriceIdYearly": "price_1T3s3wPc4Do23EYoTynFhGd2",
      "features": [
        "Unlimited AI chat (fair use)",
        "Unlimited task planning",
        "Daily automation"
      ],
      "limits": {
        "dailyAiMessages": -1,
        "dailyPlans": -1,
        "maxGoals": 20,
        "maxHabits": 20
      },
      "isActive": true,
      "createdAt": "2026-02-23T10:00:00.000Z",
      "updatedAt": "2026-02-23T10:00:00.000Z",
      "updatedBy": "admin-uuid"
    }
  ]
}
```

---

## Update Pricing Plan

Update prices, features, limits, or Stripe Price IDs for any plan.

### Request

```http
PUT {{baseUrl}}/api/v1/admin/pricing/:plan
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Path Parameters:**
- `plan`: Plan name (FREE, STARTER, PRO, ULTIMATE) - case insensitive

**Body (all fields optional):**
```json
{
  "monthlyPrice": 9.99,
  "yearlyPrice": 99,
  "stripePriceIdMonthly": "price_NEW_MONTHLY_ID",
  "stripePriceIdYearly": "price_NEW_YEARLY_ID",
  "features": [
    "Unlimited AI chat",
    "Advanced planning",
    "Priority support"
  ],
  "limits": {
    "dailyAiMessages": -1,
    "dailyPlans": -1,
    "maxGoals": 50,
    "maxHabits": 50,
    "maxRoutines": 10
  }
}
```

### Response

```json
{
  "success": true,
  "message": "Pricing updated",
  "data": {
    "id": "uuid",
    "plan": "STARTER",
    "monthlyPrice": 9.99,
    "yearlyPrice": 99,
    "stripePriceIdMonthly": "price_NEW_MONTHLY_ID",
    "stripePriceIdYearly": "price_NEW_YEARLY_ID",
    "features": [...],
    "limits": {...},
    "isActive": true,
    "updatedAt": "2026-02-23T12:00:00.000Z",
    "updatedBy": "admin-uuid"
  }
}
```

### Example: Update Only Prices

```http
PUT {{baseUrl}}/api/v1/admin/pricing/starter
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "monthlyPrice": 8.99,
  "yearlyPrice": 89
}
```

### Example: Update Only Stripe Price IDs

```http
PUT {{baseUrl}}/api/v1/admin/pricing/pro
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "stripePriceIdMonthly": "price_NEW_PRO_MONTHLY",
  "stripePriceIdYearly": "price_NEW_PRO_YEARLY"
}
```

---

## Update Stripe Price IDs

When you create new prices in Stripe Dashboard, update them in the database.

### Step 1: Create New Price in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → **Products**
2. Select your product (e.g., "Pro Plan")
3. Click **Add another price**
4. Set the new price and billing period
5. Copy the **Price ID** (e.g., `price_1XYZ...`)

### Step 2: Update in Database via API

```http
PUT {{baseUrl}}/api/v1/admin/pricing/pro
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "stripePriceIdMonthly": "price_1XYZ_NEW_MONTHLY",
  "stripePriceIdYearly": "price_1ABC_NEW_YEARLY"
}
```

### Step 3: Verify Update

```http
GET {{baseUrl}}/api/v1/admin/pricing
Authorization: Bearer {{admin_token}}
```

Check that the PRO plan has the new Price IDs.

---

## Create New Plan

Create a completely new pricing plan (beyond the default 4 plans).

### Request

```http
POST {{baseUrl}}/api/v1/admin/plans
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "plan": "ENTERPRISE",
  "monthlyPrice": 99.99,
  "yearlyPrice": 999,
  "stripePriceIdMonthly": "price_1ENT_MONTHLY",
  "stripePriceIdYearly": "price_1ENT_YEARLY",
  "features": [
    "Everything in Ultimate",
    "White-label options",
    "Dedicated account manager",
    "Custom integrations"
  ],
  "limits": {
    "dailyAiMessages": -1,
    "dailyPlans": -1,
    "maxGoals": -1,
    "maxHabits": -1,
    "maxRoutines": -1,
    "maxAiPersonas": -1,
    "hasWhiteLabel": true,
    "hasDedicatedSupport": true
  },
  "isActive": true
}
```

**Note**: You must first add `ENTERPRISE` to the `SubscriptionPlan` enum in [schema.prisma](prisma/schema.prisma#L19-L24).

### Response

```json
{
  "success": true,
  "message": "Plan created",
  "data": {
    "id": "uuid",
    "plan": "ENTERPRISE",
    "monthlyPrice": 99.99,
    ...
  }
}
```

---

## Deactivate Plan

Disable a plan temporarily without deleting it.

### Request

```http
DELETE {{baseUrl}}/api/v1/admin/plans/:plan
Authorization: Bearer {{admin_token}}
```

**Path Parameters:**
- `plan`: Plan name (STARTER, PRO, ULTIMATE, etc.)

### Response

```json
{
  "success": true,
  "message": "Plan deactivated",
  "data": {
    "id": "uuid",
    "plan": "STARTER",
    "isActive": false,
    "updatedAt": "2026-02-23T12:00:00.000Z"
  }
}
```

### Reactivate Plan

```http
PUT {{baseUrl}}/api/v1/admin/plans/starter
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "isActive": true
}
```

---

## Pricing Plan Structure

### Current Plans in Database

| Plan | Monthly | Yearly | Monthly Price ID | Yearly Price ID |
|------|---------|--------|------------------|-----------------|
| FREE | $0 | $0 | `null` | `null` |
| STARTER | $7.99 | $79 | `price_1T3s1FPc4Do23EYooQcRMo3N` | `price_1T3s3wPc4Do23EYoTynFhGd2` |
| PRO | $17.99 | $179 | `price_1T3s4VPc4Do23EYoXvEpSjTk` | `price_1T3s4qPc4Do23EYoq9KQnHtW` |
| ULTIMATE | $39.99 | $399 | `price_1T3s5QPc4Do23EYoiYuHRtBl` | `price_1T3s5lPc4Do23EYoFjM1WqPa` |

### Features Array Structure

```json
{
  "features": [
    "Feature description 1",
    "Feature description 2",
    "Feature description 3"
  ]
}
```

### Limits Object Structure

```json
{
  "limits": {
    "dailyAiMessages": -1,           // -1 = unlimited
    "dailyPlans": -1,
    "weeklyPlans": -1,
    "monthlyPlans": -1,
    "maxGoals": -1,
    "maxHabits": -1,
    "maxRoutines": -1,
    "maxAiPersonas": 3,              // Specific limit
    "hasWatermark": false,           // Boolean feature flags
    "historyAccess": "unlimited",     // Enum values
    "responseSpeed": "priority",
    "hasWeeklyReports": true,
    "hasMonthlyReports": true,
    "hasProductivityAnalysis": true
  }
}
```

---

## Common Use Cases

### 1. Price Increase

**Scenario**: Increase STARTER plan from $7.99 to $9.99/month

```http
PUT {{baseUrl}}/api/v1/admin/pricing/starter
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "monthlyPrice": 9.99,
  "yearlyPrice": 99
}
```

**Note**: Create new Stripe Price IDs before changing prices!

---

### 2. Add New Feature to Existing Plan

**Scenario**: Add "AI voice coach" to PRO plan

```http
PUT {{baseUrl}}/api/v1/admin/pricing/pro
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "features": [
    "Everything in Starter, plus:",
    "Full weekly & monthly planning",
    "AI productivity analysis",
    "Weekly AI review reports",
    "3 AI personas",
    "Priority task optimization",
    "Habit difficulty adjustment",
    "Unlimited routines",
    "Faster AI responses",
    "AI voice coach"
  ]
}
```

---

### 3. Increase Plan Limits

**Scenario**: Increase PRO plan AI personas from 3 to 5

```http
PUT {{baseUrl}}/api/v1/admin/pricing/pro
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "limits": {
    "dailyAiMessages": -1,
    "dailyPlans": -1,
    "weeklyPlans": -1,
    "monthlyPlans": -1,
    "maxGoals": -1,
    "maxHabits": -1,
    "maxRoutines": -1,
    "maxAiPersonas": 5,
    "hasWatermark": false,
    "historyAccess": "unlimited",
    "responseSpeed": "priority",
    "hasWeeklyReports": true,
    "hasMonthlyReports": true,
    "hasProductivityAnalysis": true,
    "hasHabitDifficultyAdjustment": true
  }
}
```

---

### 4. Switch to New Stripe Price IDs

**Scenario**: Stripe deprecated old prices, need to update to new ones

**Step 1**: Create new prices in Stripe Dashboard  
**Step 2**: Update all plans at once

```http
# Update STARTER
PUT {{baseUrl}}/api/v1/admin/pricing/starter
Authorization: Bearer {{admin_token}}

{
  "stripePriceIdMonthly": "price_NEW_STARTER_MONTHLY_2026",
  "stripePriceIdYearly": "price_NEW_STARTER_YEARLY_2026"
}

# Update PRO
PUT {{baseUrl}}/api/v1/admin/pricing/pro
Authorization: Bearer {{admin_token}}

{
  "stripePriceIdMonthly": "price_NEW_PRO_MONTHLY_2026",
  "stripePriceIdYearly": "price_NEW_PRO_YEARLY_2026"
}

# Update ULTIMATE
PUT {{baseUrl}}/api/v1/admin/pricing/ultimate
Authorization: Bearer {{admin_token}}

{
  "stripePriceIdMonthly": "price_NEW_ULTIMATE_MONTHLY_2026",
  "stripePriceIdYearly": "price_NEW_ULTIMATE_YEARLY_2026"
}
```

---

### 5. Temporarily Disable a Plan

**Scenario**: Temporarily remove STARTER plan from new subscriptions

```http
DELETE {{baseUrl}}/api/v1/admin/plans/starter
Authorization: Bearer {{admin_token}}
```

Existing STARTER subscribers keep their plan, but new users can't subscribe to it.

**To re-enable:**
```http
PUT {{baseUrl}}/api/v1/admin/plans/starter
Authorization: Bearer {{admin_token}}

{
  "isActive": true
}
```

---

## 🔐 Security & Best Practices

### ✅ Do's

1. **Always update Stripe first**: Create new Price IDs in Stripe Dashboard before updating the database
2. **Audit trail**: Every change creates an `AdminAction` log with details
3. **Verify changes**: Use `GET /admin/pricing` after updates to confirm
4. **Test in staging**: Test price/feature changes in development environment first
5. **Gradual rollout**: For major changes, update limits/features before price increases
6. **Keep both Price IDs**: Keep old and new Stripe Price IDs during migration period

### ❌ Don'ts

1. **Don't delete Price IDs**: Deactivate in Stripe instead, or existing subscriptions will break
2. **Don't change FREE plan**: Changing FREE Stripe IDs will cause errors (FREE doesn't use Stripe)
3. **Don't update without testing**: Always test Stripe checkout with new Price IDs first
4. **Don't remove features**: Existing users expect purchased features - add deprecation warnings instead

---

## 🧪 Testing Workflow

### 1. Get Current Pricing
```http
GET {{baseUrl}}/api/v1/admin/pricing
```

### 2. Update Specific Plan
```http
PUT {{baseUrl}}/api/v1/admin/pricing/starter
{
  "monthlyPrice": 9.99
}
```

### 3. Verify Update
```http
GET {{baseUrl}}/api/v1/admin/pricing
```

### 4. Test Stripe Checkout
```http
POST {{baseUrl}}/api/v1/payments/create-checkout-session
{
  "plan": "STARTER",
  "billingPeriod": "MONTHLY"
}
```

Click the checkout URL and verify it shows the correct price.

---

## 📊 Admin Action Logs

Every pricing update creates an audit log:

```http
GET {{baseUrl}}/api/v1/admin/actions?action=PRICING_UPDATED
Authorization: Bearer {{admin_token}}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "adminId": "admin-uuid",
      "action": "PRICING_UPDATED",
      "targetUserId": null,
      "details": {
        "plan": "STARTER",
        "changes": {
          "monthlyPrice": 9.99,
          "yearlyPrice": 99
        }
      },
      "createdAt": "2026-02-23T12:00:00.000Z"
    }
  ]
}
```

---

## 🎯 Quick Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| List all plans | GET | `/admin/pricing` |
| Update plan | PUT | `/admin/pricing/:plan` |
| Create plan | POST | `/admin/plans` |
| Deactivate plan | DELETE | `/admin/plans/:plan` |
| Get audit logs | GET | `/admin/actions` |

---

## 🚨 Troubleshooting

### Error: "Plan not found"
- Check plan name is correct: FREE, STARTER, PRO, ULTIMATE (case insensitive)
- Verify plan exists: `GET /admin/pricing`

### Error: "Stripe Price ID invalid"
- Verify Price ID exists in [Stripe Dashboard](https://dashboard.stripe.com/prices)
- Check Price ID format: starts with `price_`
- Ensure Price ID is for the correct product

### Existing subscriptions not updating
- Price changes only affect NEW subscriptions
- Existing subscriptions keep their original Price ID
- Use Stripe APIs to update existing subscription prices

---

## 📚 Related Documentation

- [STRIPE_PAYMENT_GUIDE.md](STRIPE_PAYMENT_GUIDE.md) - Complete Stripe integration guide
- [ADMIN_PRICING_SUBSCRIPTION_API.md](ADMIN_PRICING_SUBSCRIPTION_API.md) - Admin subscription management
- [PRICING_API_GUIDE.md](PRICING_API_GUIDE.md) - Public pricing API

---

**Last Updated**: February 23, 2026  
**API Version**: v1  
**Maintainer**: Backend Team
