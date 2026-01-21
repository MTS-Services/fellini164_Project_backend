# Admin Pricing & Subscription Management API Testing Guide

Complete Postman testing guide for the new admin features: subscriber management, pricing configuration, plan management, and manual subscription changes.

---

## 🔐 Authentication Required

All endpoints require admin authentication. Include in headers:

```
Authorization: Bearer {{adminToken}}
```

---

## 📊 1. View All Subscribers

Get list of all subscribers (non-free users) with filtering options.

### Endpoint
```
GET {{baseUrl}}/api/v1/admin/subscribers
```

### Query Parameters (Optional)
- `status` - Filter by subscription status (ACTIVE, CANCELED, PAST_DUE, TRIALING, PAUSED, EXPIRED)
- `plan` - Filter by plan (STARTER, PRO, ULTIMATE)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

### Example Requests

**Get All Active Subscribers:**
```
GET {{baseUrl}}/api/v1/admin/subscribers?status=ACTIVE
```

**Get All PRO Plan Subscribers:**
```
GET {{baseUrl}}/api/v1/admin/subscribers?plan=PRO
```

**Get Canceled Subscribers:**
```
GET {{baseUrl}}/api/v1/admin/subscribers?status=CANCELED
```

**Get Active PRO Subscribers (Paginated):**
```
GET {{baseUrl}}/api/v1/admin/subscribers?status=ACTIVE&plan=PRO&page=1&limit=20
```

### Example Response
```json
{
  "success": true,
  "count": 15,
  "total": 45,
  "page": 1,
  "totalPages": 3,
  "stats": [
    {
      "subscriptionStatus": "ACTIVE",
      "subscriptionPlan": "PRO",
      "_count": 25
    },
    {
      "subscriptionStatus": "CANCELED",
      "subscriptionPlan": "STARTER",
      "_count": 10
    }
  ],
  "data": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "subscriptionPlan": "PRO",
      "subscriptionStatus": "ACTIVE",
      "subscriptionStartDate": "2026-01-01T00:00:00.000Z",
      "subscriptionEndDate": null,
      "currentPeriodEnd": "2026-02-01T00:00:00.000Z",
      "cancelAtPeriodEnd": false,
      "stripeCustomerId": "cus_xxxxx",
      "paypalSubscriptionId": null,
      "createdAt": "2025-12-15T00:00:00.000Z"
    }
  ]
}
```

---

## 💰 2. Get Pricing Settings

View all pricing configurations for all plans.

### Endpoint
```
GET {{baseUrl}}/api/v1/admin/pricing
```

### Example Request
```
GET {{baseUrl}}/api/v1/admin/pricing
```

### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "pricing-uuid",
      "plan": "STARTER",
      "monthlyPrice": 7.99,
      "yearlyPrice": 79,
      "features": [
        "Unlimited AI chat (fair use)",
        "Unlimited task planning",
        "Daily automation"
      ],
      "limits": {
        "aiMessages": 1000,
        "habits": 5,
        "goals": 10
      },
      "isActive": true,
      "updatedAt": "2026-01-19T00:00:00.000Z",
      "updatedBy": "admin-uuid",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## ✏️ 3. Update Pricing

Update pricing for a specific plan (creates if doesn't exist).

### Endpoint
```
PUT {{baseUrl}}/api/v1/admin/pricing/:plan
```

### URL Parameters
- `plan` - Plan name (FREE, STARTER, PRO, ULTIMATE)

### Request Body
```json
{
  "monthlyPrice": 19.99,
  "yearlyPrice": 199,
  "features": [
    "Everything in Starter, plus:",
    "Full weekly & monthly planning",
    "AI productivity analysis",
    "Weekly AI review reports"
  ],
  "limits": {
    "aiMessages": 5000,
    "habits": 20,
    "goals": 50,
    "weeklyPlans": true,
    "monthlyPlans": true
  }
}
```

### Example Request
```
PUT {{baseUrl}}/api/v1/admin/pricing/PRO

Body:
{
  "monthlyPrice": 19.99,
  "yearlyPrice": 199,
  "features": ["Feature 1", "Feature 2"],
  "limits": {
    "aiMessages": 5000,
    "habits": 20
  }
}
```

### Example Response
```json
{
  "success": true,
  "message": "Pricing updated",
  "data": {
    "id": "pricing-uuid",
    "plan": "PRO",
    "monthlyPrice": 19.99,
    "yearlyPrice": 199,
    "features": ["Feature 1", "Feature 2"],
    "limits": {
      "aiMessages": 5000,
      "habits": 20
    },
    "isActive": true,
    "updatedAt": "2026-01-19T09:55:44.000Z",
    "updatedBy": "admin-uuid",
    "createdAt": "2026-01-19T09:55:44.000Z"
  }
}
```

---

## 📋 4. Get All Plans

View all plans with subscriber statistics.

### Endpoint
```
GET {{baseUrl}}/api/v1/admin/plans
```

### Example Request
```
GET {{baseUrl}}/api/v1/admin/plans
```

### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "pricing-uuid",
      "plan": "FREE",
      "monthlyPrice": 0,
      "yearlyPrice": 0,
      "features": ["Basic features"],
      "limits": {
        "aiMessages": 200,
        "habits": 1
      },
      "isActive": true,
      "updatedAt": "2026-01-19T00:00:00.000Z",
      "updatedBy": null,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "subscriberCount": 150
    },
    {
      "id": "pricing-uuid-2",
      "plan": "STARTER",
      "monthlyPrice": 7.99,
      "yearlyPrice": 79,
      "features": ["Unlimited AI chat"],
      "limits": {
        "aiMessages": 1000,
        "habits": 5
      },
      "isActive": true,
      "updatedAt": "2026-01-19T00:00:00.000Z",
      "updatedBy": "admin-uuid",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "subscriberCount": 45
    }
  ]
}
```

---

## ➕ 5. Create New Plan

Create a new subscription plan.

### Endpoint
```
POST {{baseUrl}}/api/v1/admin/plans
```

### Request Body
```json
{
  "plan": "ENTERPRISE",
  "monthlyPrice": 99.99,
  "yearlyPrice": 999,
  "features": [
    "Everything in Ultimate",
    "Dedicated account manager",
    "Custom integrations",
    "Priority support"
  ],
  "limits": {
    "aiMessages": -1,
    "habits": -1,
    "goals": -1,
    "customIntegrations": true
  }
}
```

### Example Request
```
POST {{baseUrl}}/api/v1/admin/plans

Body:
{
  "plan": "ENTERPRISE",
  "monthlyPrice": 99.99,
  "yearlyPrice": 999,
  "features": ["Feature 1", "Feature 2"],
  "limits": {
    "aiMessages": -1
  }
}
```

### Example Response
```json
{
  "success": true,
  "message": "Plan created",
  "data": {
    "id": "new-pricing-uuid",
    "plan": "ENTERPRISE",
    "monthlyPrice": 99.99,
    "yearlyPrice": 999,
    "features": ["Feature 1", "Feature 2"],
    "limits": {
      "aiMessages": -1
    },
    "isActive": true,
    "updatedAt": "2026-01-19T09:55:44.000Z",
    "updatedBy": "admin-uuid",
    "createdAt": "2026-01-19T09:55:44.000Z"
  }
}
```

---

## 🔄 6. Update Existing Plan

Update an existing plan's details.

### Endpoint
```
PUT {{baseUrl}}/api/v1/admin/plans/:plan
```

### URL Parameters
- `plan` - Plan name (STARTER, PRO, ULTIMATE, etc.)

### Request Body (All fields optional)
```json
{
  "monthlyPrice": 17.99,
  "yearlyPrice": 179,
  "features": [
    "Updated feature list"
  ],
  "limits": {
    "aiMessages": 3000
  },
  "isActive": true
}
```

### Example Request
```
PUT {{baseUrl}}/api/v1/admin/plans/PRO

Body:
{
  "monthlyPrice": 17.99,
  "features": ["New feature 1", "New feature 2"]
}
```

### Example Response
```json
{
  "success": true,
  "message": "Plan updated",
  "data": {
    "id": "pricing-uuid",
    "plan": "PRO",
    "monthlyPrice": 17.99,
    "yearlyPrice": 179,
    "features": ["New feature 1", "New feature 2"],
    "limits": {
      "aiMessages": 5000
    },
    "isActive": true,
    "updatedAt": "2026-01-19T09:55:44.000Z",
    "updatedBy": "admin-uuid",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## 🚫 7. Deactivate Plan

Deactivate a plan (soft delete - sets isActive to false).

### Endpoint
```
DELETE {{baseUrl}}/api/v1/admin/plans/:plan
```

### URL Parameters
- `plan` - Plan name to deactivate

### Example Request
```
DELETE {{baseUrl}}/api/v1/admin/plans/ENTERPRISE
```

### Example Response
```json
{
  "success": true,
  "message": "Plan deactivated",
  "data": {
    "id": "pricing-uuid",
    "plan": "ENTERPRISE",
    "monthlyPrice": 99.99,
    "yearlyPrice": 999,
    "features": ["Feature 1"],
    "limits": {
      "aiMessages": -1
    },
    "isActive": false,
    "updatedAt": "2026-01-19T09:55:44.000Z",
    "updatedBy": "admin-uuid",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## 👤 8. Manually Update User Subscription

Manually upgrade, downgrade, or change a user's subscription status.

### Endpoint
```
PATCH {{baseUrl}}/api/v1/admin/users/:userId/subscription
```

### URL Parameters
- `userId` - User ID to update

### Request Body
```json
{
  "subscriptionPlan": "PRO",
  "subscriptionStatus": "ACTIVE",
  "subscriptionEndDate": "2027-01-19T00:00:00.000Z",
  "reason": "Customer support upgrade request"
}
```

### Example Requests

**Upgrade User to PRO:**
```
PATCH {{baseUrl}}/api/v1/admin/users/{{userId}}/subscription

Body:
{
  "subscriptionPlan": "PRO",
  "subscriptionStatus": "ACTIVE",
  "reason": "Customer support - free upgrade for issue"
}
```

**Downgrade User to FREE:**
```
PATCH {{baseUrl}}/api/v1/admin/users/{{userId}}/subscription

Body:
{
  "subscriptionPlan": "FREE",
  "reason": "Payment failed multiple times"
}
```

**Cancel User Subscription:**
```
PATCH {{baseUrl}}/api/v1/admin/users/{{userId}}/subscription

Body:
{
  "subscriptionStatus": "CANCELED",
  "subscriptionEndDate": "2026-01-31T00:00:00.000Z",
  "reason": "User requested cancellation"
}
```

**Reactivate Canceled Subscription:**
```
PATCH {{baseUrl}}/api/v1/admin/users/{{userId}}/subscription

Body:
{
  "subscriptionStatus": "ACTIVE",
  "reason": "User reactivated after cancellation"
}
```

### Example Response
```json
{
  "success": true,
  "message": "Subscription updated successfully",
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "subscriptionPlan": "PRO",
    "subscriptionStatus": "ACTIVE",
    "subscriptionStartDate": "2026-01-19T09:55:44.000Z",
    "subscriptionEndDate": null,
    "stripeCustomerId": "cus_xxxxx",
    "updatedAt": "2026-01-19T09:55:44.000Z"
  }
}
```

---

## 🧪 Testing Workflow

### 1. Setup Admin User
First, ensure you have an admin token. Login as admin:
```
POST {{baseUrl}}/api/v1/auth/login
Body:
{
  "email": "admin@example.com",
  "password": "adminPassword"
}
```

### 2. Test Subscriber Views
```
GET {{baseUrl}}/api/v1/admin/subscribers?status=ACTIVE
GET {{baseUrl}}/api/v1/admin/subscribers?plan=PRO
GET {{baseUrl}}/api/v1/admin/subscribers?status=CANCELED
```

### 3. Test Pricing Management
```
# View current pricing
GET {{baseUrl}}/api/v1/admin/pricing

# Update PRO pricing
PUT {{baseUrl}}/api/v1/admin/pricing/PRO
Body: { "monthlyPrice": 19.99, "yearlyPrice": 199, ... }

# Verify update
GET {{baseUrl}}/api/v1/admin/pricing
```

### 4. Test Plan Management
```
# View all plans
GET {{baseUrl}}/api/v1/admin/plans

# Create new plan
POST {{baseUrl}}/api/v1/admin/plans
Body: { "plan": "ENTERPRISE", ... }

# Update plan
PUT {{baseUrl}}/api/v1/admin/plans/ENTERPRISE
Body: { "monthlyPrice": 89.99 }

# Deactivate plan
DELETE {{baseUrl}}/api/v1/admin/plans/ENTERPRISE
```

### 5. Test Manual Subscription Changes
```
# Get a user ID first
GET {{baseUrl}}/api/v1/admin/users

# Upgrade user
PATCH {{baseUrl}}/api/v1/admin/users/{{userId}}/subscription
Body: { "subscriptionPlan": "PRO", "reason": "Testing" }

# Check user details
GET {{baseUrl}}/api/v1/admin/users/{{userId}}
```

---

## 📝 Audit Trail

All admin actions are logged in the `admin_actions` table with:
- Admin ID who performed the action
- Action type (SUBSCRIPTION_CHANGED, PRICING_UPDATED, PLAN_CREATED, etc.)
- Target user ID (if applicable)
- Details (JSON with before/after values)
- Timestamp

You can query this for compliance and debugging purposes.

---

## 🔒 Security Notes

1. All endpoints require `ADMIN` or `SUPER_ADMIN` role
2. Authentication is checked via `protect` middleware
3. Authorization is verified via `authorize('ADMIN', 'SUPER_ADMIN')` middleware
4. All sensitive actions are logged for audit
5. User passwords are never returned in responses

---

## 🎯 Common Use Cases

### Scenario 1: Customer Support Upgrade
User had billing issue, give them free PRO for 30 days:
```
PATCH /api/v1/admin/users/{{userId}}/subscription
Body:
{
  "subscriptionPlan": "PRO",
  "subscriptionStatus": "ACTIVE",
  "subscriptionEndDate": "2026-02-19T00:00:00.000Z",
  "reason": "Billing issue - 30 days free PRO"
}
```

### Scenario 2: Promotional Pricing
Update pricing for a limited time sale:
```
PUT /api/v1/admin/pricing/PRO
Body:
{
  "monthlyPrice": 14.99,
  "yearlyPrice": 149
}
```

### Scenario 3: View Churn
See all canceled subscriptions:
```
GET /api/v1/admin/subscribers?status=CANCELED
```

### Scenario 4: New Plan Launch
Create and activate a new tier:
```
POST /api/v1/admin/plans
Body: { "plan": "TEAMS", "monthlyPrice": 49.99, ... }
```

---

## ✅ Expected Status Codes

- `200` - Success (GET, PUT, PATCH)
- `201` - Created (POST)
- `400` - Bad Request (invalid data)
- `401` - Unauthorized (no token or invalid token)
- `403` - Forbidden (not admin)
- `404` - Not Found (user/plan doesn't exist)
- `500` - Server Error

---

**Happy Testing! 🚀**
