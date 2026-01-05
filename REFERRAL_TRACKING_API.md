# Referral Tracking API Documentation

## Overview
This API allows users to track their referral invitations and see who has registered using their referral code. When you send a referral invitation, the recipient receives a professional early access invitation email.

## Endpoints

### 1. Get My Referral Link
Get your personal referral link and stats.

**Endpoint:** `GET /api/v1/users/referrals/my-link`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "referralCode": "ABC123",
    "referralLink": "https://elyxaai.com/signup?ref=ABC123",
    "totalReferrals": 5,
    "totalCredits": 250
  }
}
```

---

### 2. Email My Referral Link
Send your referral link to your own email (encourages sharing).

**Endpoint:** `POST /api/v1/users/referrals/email-link`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Referral link sent to your email"
}
```

**Email Content:**
The user receives an email titled "Your Personal Invite Link — Move Up the Waitlist" containing:
- Their personal referral link
- Their referral code
- Benefits of sharing (moving up waitlist, earning rewards)
- Tips on who to share with

---

### 3. Send Referral Invitation
Send an early access invitation to a friend's email.

**Endpoint:** `POST /api/v1/users/referrals/invite`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "friend@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Referral invitation sent successfully",
  "data": {
    "id": "uuid",
    "referrerUserId": "user-id",
    "invitedEmail": "friend@example.com",
    "referralCode": "ABC123",
    "isRegistered": false,
    "sentAt": "2026-01-05T10:00:00.000Z",
    "referralLink": "https://elyxaai.com/signup?ref=ABC123"
  }
}
```

**Email Sent to Invitee:**
The recipient receives an email titled "You're Invited — Early Access to Elyxa" containing:
- Personal invitation message
- Features included in early access
- Activation link with referral code: `https://elyxaai.com/signup?ref=ABC123`
- Limited availability notice

---

### 4. Get All Referral Invitations
See all emails you've sent referral invitations to.

**Endpoint:** `GET /api/v1/users/referrals/invitations`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "friend@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Referral invitation sent successfully",
  "data": {
    "id": "uuid",
    "referrerUserId": "user-id",
    "invitedEmail": "friend@example.com",
    "referralCode": "ABC123",
    "isRegistered": false,
    "sentAt": "2026-01-05T10:00:00.000Z"
  }
}
```

---

### 2. Get All Referral Invitations
See all emails you've sent referral invitations to.

**Endpoint:** `GET /api/v1/users/referrals/invitations`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "invitedEmail": "friend1@example.com",
      "referralCode": "ABC123",
      "isRegistered": true,
      "registeredUserId": "user-id-2",
      "sentAt": "2026-01-05T10:00:00.000Z",
      "registeredAt": "2026-01-06T15:30:00.000Z"
    },
    {
      "id": "uuid",
      "invitedEmail": "friend2@example.com",
      "referralCode": "ABC123",
      "isRegistered": false,
      "registeredUserId": null,
      "sentAt": "2026-01-04T08:00:00.000Z",
      "registeredAt": null
    }
  ]
}
```

---

### 3. Get Referred Users
See all users who have registered using your referral code.

**Endpoint:** `GET /api/v1/users/referrals/users`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-id-2",
      "email": "friend1@example.com",
      "fullName": "John Doe",
      "avatar": "https://example.com/avatar.jpg",
      "subscriptionPlan": "PRO",
      "createdAt": "2026-01-06T15:30:00.000Z"
    },
    {
      "id": "user-id-3",
      "email": "friend3@example.com",
      "fullName": "Jane Smith",
      "avatar": null,
      "subscriptionPlan": "FREE",
      "createdAt": "2026-01-03T12:00:00.000Z"
    }
  ]
}
```

---

### 4. Get Referral Statistics
Get summary statistics about your referrals.

**Endpoint:** `GET /api/v1/users/referrals/stats`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "referralCode": "ABC123",
    "totalInvitationsSent": 5,
    "totalRegistrations": 2,
    "pendingInvitations": 3,
    "referralCredits": 100,
    "referredUsers": [
      {
        "id": "user-id-2",
        "email": "friend1@example.com",
        "fullName": "John Doe",
        "avatar": "https://example.com/avatar.jpg",
        "subscriptionPlan": "PRO",
        "createdAt": "2026-01-06T15:30:00.000Z"
      }
    ]
  }
}
```

---

### 5. Get Complete Referral Dashboard
Get all referral information in one request (combines invitations, users, and stats).

**Endpoint:** `GET /api/v1/users/referrals/dashboard`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "referralCode": "ABC123",
      "totalInvitationsSent": 5,
      "totalRegistrations": 2,
      "pendingInvitations": 3,
      "referralCredits": 100,
      "referredUsers": [...]
    },
    "invitations": [
      {
        "id": "uuid",
        "invitedEmail": "friend1@example.com",
        "referralCode": "ABC123",
        "isRegistered": true,
        "registeredUserId": "user-id-2",
        "sentAt": "2026-01-05T10:00:00.000Z",
        "registeredAt": "2026-01-06T15:30:00.000Z"
      }
    ],
    "referredUsers": [
      {
        "id": "user-id-2",
        "email": "friend1@example.com",
        "fullName": "John Doe",
        "avatar": "https://example.com/avatar.jpg",
        "subscriptionPlan": "PRO",
        "createdAt": "2026-01-06T15:30:00.000Z"
      }
    ]
  }
}
```

## Data Model

### ReferralInvitation
Tracks email invitations sent by users.

```prisma
model ReferralInvitation {
  id               String   @id @default(uuid())
  referrerUserId   String   // User who sent the invitation
  invitedEmail     String   // Email address invited
  referralCode     String   // Referral code used
  isRegistered     Boolean  @default(false)
  registeredUserId String?  // ID of user who registered (if any)
  sentAt           DateTime @default(now())
  registeredAt     DateTime?
}
```

### Referral
Tracks successful referrals and rewards.

```prisma
model Referral {
  id             String   @id @default(uuid())
  referrerUserId String   // User who referred
  referredUserId String   // User who was referred
  referralCode   String
  rewardCredited Boolean  @default(false)
  rewardAmount   Int      @default(0)
  createdAt      DateTime @default(now())
  creditedAt     DateTime?
}
```

## Usage Flow

1. **User sends invitation:**
   ```
   POST /api/v1/users/referrals/invite
   { "email": "friend@example.com" }
   ```

2. **Friend receives email with referral code**
   (Email service integration needed)

3. **Friend registers using the referral code**
   The registration process should:
   - Set `referredBy` field on new user to the referral code
   - Update the `ReferralInvitation` record:
     - Set `isRegistered` to true
     - Set `registeredUserId` to new user's ID
     - Set `registeredAt` to current timestamp
   - Create a `Referral` record
   - Increment `referralCount` on referrer

4. **User checks their referral dashboard:**
   ```
   GET /api/v1/users/referrals/dashboard
   ```

## Notes

- All referral endpoints require authentication
- The `/dashboard` endpoint is optimized for single-page dashboard displays
- Individual endpoints can be used for specific UI components
- Email sending integration should be added to `emailService.js`
- Registration process should be updated to link ReferralInvitation records when a user registers with a referral code
