# Waitlist System - Quick Test Guide

## Quick Start Testing

### 1. Join Waitlist (No Password)

```bash
POST http://localhost:3000/api/auth/join-waitlist
Content-Type: application/json

{
  "email": "john@example.com",
  "fullName": "John Doe"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully joined waitlist! Check your email for login credentials and referral link.",
  "data": {
    "email": "john@example.com",
    "referralCode": "JOHN4X8Y9Z",
    "referralLink": "https://elyxaai.com/join?ref=JOHN4X8Y9Z"
  }
}
```

**Check Email:** You should receive an email with:
- Email: `john@example.com`
- Password: `abc123XYZ789` (randomly generated)
- Referral Code: `JOHN4X8Y9Z`
- Referral Link: `https://elyxaai.com/join?ref=JOHN4X8Y9Z`

---

### 2. Login with Auto-Generated Password

```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "abc123XYZ789"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "email": "john@example.com",
      "fullName": "John Doe",
      "subscriptionPlan": "FREE",
      "userStatus": "WAITLIST",
      "referralCode": "JOHN4X8Y9Z"
    },
    "token": "eyJhbGc..."
  }
}
```

**Save the token** for authenticated requests!

---

### 3. Get Referral Stats

```bash
GET http://localhost:3000/api/auth/referral/stats
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "referralCode": "JOHN4X8Y9Z",
    "totalReferrals": 0,
    "totalCredits": 0,
    "referralLink": "https://elyxa.com/signup?ref=JOHN4X8Y9Z",
    "referrals": []
  }
}
```

---

### 4. Join via Referral Link (New User)

```bash
POST http://localhost:3000/api/auth/join-waitlist
Content-Type: application/json

{
  "email": "jane@example.com",
  "fullName": "Jane Smith",
  "referralCode": "JOHN4X8Y9Z"
}
```

**Expected:**
- Jane's account created
- John's referralCount increases to 1
- John's referralCredits increases by 10
- John receives reward email
- Jane receives welcome email with her own referral code

---

### 5. Verify Referral Worked

**Login as John again and check stats:**

```bash
GET http://localhost:3000/api/auth/referral/stats
Authorization: Bearer JOHNS_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "referralCode": "JOHN4X8Y9Z",
    "totalReferrals": 1,
    "totalCredits": 10,
    "referralLink": "https://elyxa.com/signup?ref=JOHN4X8Y9Z",
    "referrals": [
      {
        "id": "...",
        "userName": "Jane Smith",
        "userEmail": "jane@example.com",
        "joinedAt": "2026-01-08T...",
        "rewardCredited": true,
        "rewardAmount": 10
      }
    ]
  }
}
```

---

### 6. Send Referral Invitation

```bash
POST http://localhost:3000/api/auth/referral/invite
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "email": "friend@example.com",
  "name": "My Friend"
}
```

**Expected:**
- Friend receives invitation email
- ReferralInvitation record created
- When friend signs up, invitation marked as registered

---

## Complete Test Flow

### Step 1: First User (Alice)
```bash
# Alice joins waitlist
curl -X POST http://localhost:3000/api/auth/join-waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","fullName":"Alice Johnson"}'

# Response includes: referralCode: "ALIC3X8Y9Z"
# Check email for password: "xyz789ABC123"

# Alice logs in
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"xyz789ABC123"}'

# Save Alice's token
```

### Step 2: Second User (Bob) - Via Referral
```bash
# Bob joins via Alice's referral
curl -X POST http://localhost:3000/api/auth/join-waitlist \
  -H "Content-Type: application/json" \
  -d '{
    "email":"bob@example.com",
    "fullName":"Bob Smith",
    "referralCode":"ALIC3X8Y9Z"
  }'

# Bob gets his own referral code in response
# Alice's referralCount increases
# Alice receives reward email
```

### Step 3: Check Alice's Referrals
```bash
# Alice checks her referral stats
curl -X GET http://localhost:3000/api/auth/referral/stats \
  -H "Authorization: Bearer ALICE_TOKEN"

# Response shows:
# - totalReferrals: 1
# - totalCredits: 10
# - List includes Bob
```

### Step 4: Third User (Carol) - Via Bob's Referral
```bash
# Carol joins via Bob's referral
curl -X POST http://localhost:3000/api/auth/join-waitlist \
  -H "Content-Type: application/json" \
  -d '{
    "email":"carol@example.com",
    "fullName":"Carol Davis",
    "referralCode":"BOB4X8Y9Z"
  }'

# Bob's referralCount increases
# Bob receives reward email
# Alice's stats unchanged (only direct referrals count)
```

---

## Database Verification

### Check User Records
```sql
-- See all waitlist users
SELECT id, email, "fullName", "userStatus", "referralCode", "referralCount", "referralCredits"
FROM "User"
WHERE "userStatus" = 'WAITLIST'
ORDER BY "createdAt" DESC;
```

### Check Referral Records
```sql
-- See all referrals
SELECT 
  r.id,
  r."referralCode",
  r."rewardAmount",
  r."rewardCredited",
  referrer.email as referrer_email,
  referred.email as referred_email,
  r."createdAt"
FROM "Referral" r
JOIN "User" referrer ON r."referrerUserId" = referrer.id
JOIN "User" referred ON r."referredUserId" = referred.id
ORDER BY r."createdAt" DESC;
```

### Check Referral Invitations
```sql
-- See all invitations
SELECT 
  ri.id,
  u.email as referrer_email,
  ri."invitedEmail",
  ri."referralCode",
  ri."isRegistered",
  ri."sentAt",
  ri."registeredAt"
FROM "ReferralInvitation" ri
JOIN "User" u ON ri."referrerUserId" = u.id
ORDER BY ri."sentAt" DESC;
```

---

## Postman Collection

Import this JSON into Postman for easy testing:

```json
{
  "info": {
    "name": "Waitlist System",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Join Waitlist",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user@example.com\",\n  \"fullName\": \"Test User\"\n}"
        },
        "url": {
          "raw": "http://localhost:3000/api/auth/join-waitlist",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "auth", "join-waitlist"]
        }
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"PASSWORD_FROM_EMAIL\"\n}"
        },
        "url": {
          "raw": "http://localhost:3000/api/auth/login",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "auth", "login"]
        }
      }
    },
    {
      "name": "Get Referral Stats",
      "request": {
        "method": "GET",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"}
        ],
        "url": {
          "raw": "http://localhost:3000/api/auth/referral/stats",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "auth", "referral", "stats"]
        }
      }
    },
    {
      "name": "Send Referral Invitation",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"},
          {"key": "Authorization", "value": "Bearer {{token}}"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"friend@example.com\",\n  \"name\": \"Friend Name\"\n}"
        },
        "url": {
          "raw": "http://localhost:3000/api/auth/referral/invite",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "auth", "referral", "invite"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "token",
      "value": "YOUR_JWT_TOKEN_HERE"
    }
  ]
}
```

---

## Troubleshooting

### Issue: Email not received
**Solution:**
- Check `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` in .env
- Verify Mailgun account is active
- Check spam folder
- Review logs: `console.log` in emailService

### Issue: Invalid referral code
**Solution:**
- Referral codes are case-insensitive
- Verify code exists in database
- Check User has referralCode set

### Issue: Referral not credited
**Solution:**
- Check Referral table for record
- Verify rewardCredited is true
- Check User.referralCount and referralCredits
- Review creditReferralReward method logs

### Issue: Duplicate registration error
**Solution:**
- Each email can only register once
- Check if user already exists
- Use different email for testing

---

## Next Steps

1. **Test locally** using the curl commands above
2. **Verify emails** are sent correctly
3. **Check database** to see referral tracking
4. **Integrate frontend** with the new endpoint
5. **Deploy to production** and update FRONTEND_URL

## Questions?

Check the main documentation: [WAITLIST_SYSTEM.md](./WAITLIST_SYSTEM.md)
