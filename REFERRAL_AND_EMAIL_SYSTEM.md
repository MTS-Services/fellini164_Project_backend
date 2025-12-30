# Referral System & Email Management API Documentation

## Overview
This document covers the newly implemented features:
1. **Waitlist Confirmation Email** - Sent after user signup
2. **Referral System** - Users can refer others and earn rewards
3. **Email Unsubscribe** - Users can opt-out of marketing emails

---

## 🎯 Features Implemented

### 1. Waitlist Confirmation Email
After a user signs up and verifies their email with OTP, they automatically receive a waitlist confirmation email.

**Email Template:**
- Subject: "You're on the Elyxa waitlist"
- Professional design matching the provided requirements
- Includes unsubscribe link in footer
- Sent automatically after OTP verification

### 2. Referral System
Each user gets a unique referral code upon registration. When someone signs up using a referral code, both users benefit.

**Features:**
- Unique referral code generated for each user
- Track who referred whom
- Automatic reward crediting (10 credits per referral)
- Email notification to referrer when someone signs up
- Referral stats dashboard

**Rewards:**
- 10 credits per successful referral
- Credits are awarded after the referred user verifies their email

### 3. Email Unsubscribe
Users can opt-out of marketing emails while still receiving critical emails (OTP, password reset).

---

## 📡 API Endpoints

### Register with Referral Code

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "referralCode": "JOHN4A7F8B" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for OTP verification.",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "subscriptionPlan": "FREE",
    "isEmailVerified": false,
    "referralCode": "JOHN4A7F8B",
    "createdAt": "2025-12-30T..."
  }
}
```

**Notes:**
- Referral code is optional
- If provided, must be valid (exists in database)
- User gets their own unique referral code upon registration
- OTP email is sent automatically

---

### Verify OTP (Triggers Waitlist Email)

```http
POST /api/auth/verify-otp
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "subscriptionPlan": "FREE",
      "isEmailVerified": true,
      "referralCode": "JOHN4A7F8B"
    },
    "token": "jwt_token_here"
  }
}
```

**Automatic Actions:**
1. Email is verified
2. Waitlist confirmation email is sent
3. If user was referred, referrer gets credited with rewards
4. Referrer receives reward notification email

---

### Get Referral Stats

```http
GET /api/auth/referral/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "referralCode": "JOHN4A7F8B",
    "totalReferrals": 5,
    "totalCredits": 50,
    "referralLink": "https://elyxa.com/signup?ref=JOHN4A7F8B",
    "referrals": [
      {
        "id": "referral_uuid",
        "userName": "Jane Smith",
        "userEmail": "jane@example.com",
        "joinedAt": "2025-12-30T...",
        "rewardCredited": true,
        "rewardAmount": 10
      }
    ]
  }
}
```

---

### Unsubscribe from Emails

```http
POST /api/auth/unsubscribe?userId=<user_id>
```

**Query Parameters:**
- `userId` - The user ID (required for public access via email link)

**Response:**
```json
{
  "success": true,
  "message": "Successfully unsubscribed from emails",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "isUnsubscribed": true
  }
}
```

**Notes:**
- Public endpoint (no authentication required)
- Used in unsubscribe links in emails
- Critical emails (OTP, password reset) still sent

---

### Resubscribe to Emails

```http
POST /api/auth/resubscribe
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully resubscribed to emails",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "isUnsubscribed": false
  }
}
```

---

## 🗃️ Database Schema Changes

### User Table - New Fields

```prisma
model User {
  // ... existing fields ...
  
  // Referral fields
  referralCode          String?   @unique
  referredBy            String?   // ID of user who referred this user
  referralCredits       Int       @default(0)
  referralCount         Int       @default(0)
  
  // Email preferences
  isUnsubscribed        Boolean   @default(false)
  unsubscribedAt        DateTime?
}
```

### Referral Table (New)

```prisma
model Referral {
  id                String   @id @default(uuid())
  
  referrerUserId    String   // User who referred
  referredUserId    String   // User who was referred
  
  referralCode      String
  rewardCredited    Boolean  @default(false)
  rewardAmount      Int      @default(0)
  
  createdAt         DateTime @default(now())
  creditedAt        DateTime?
  
  @@index([referrerUserId])
  @@index([referredUserId])
  @@index([referralCode])
}
```

---

## 📧 Email Templates

### 1. Waitlist Confirmation Email

**Subject:** "You're on the Elyxa waitlist"

**Content:**
- Personalized greeting
- Waitlist confirmation message
- Information about what's being built
- Early access details
- Footer with unsubscribe link

### 2. Referral Reward Email

**Subject:** "You've earned a referral reward! 🎉"

**Content:**
- Congratulations message
- Credits earned
- Information about referred user
- CTA to view referral dashboard
- Footer with unsubscribe link

---

## 🔄 Workflow Examples

### Example 1: User Signup with Referral

1. **Alice** shares her referral link: `https://elyxa.com/signup?ref=ALIC123ABC`
2. **Bob** clicks the link and signs up with `referralCode: "ALIC123ABC"`
3. Bob receives OTP email
4. Bob verifies OTP
5. **Automatic Actions:**
   - Bob's email is verified
   - Bob receives waitlist confirmation email
   - Alice gets +10 credits
   - Alice's `referralCount` increments by 1
   - Alice receives referral reward email
   - Referral record created in database

### Example 2: User Unsubscribes

1. User receives waitlist confirmation email
2. User clicks "Unsubscribe anytime" link in footer
3. User is redirected to: `GET /api/auth/unsubscribe?userId=xyz`
4. User's `isUnsubscribed` flag is set to `true`
5. User confirmation page shown (frontend handles this)
6. User will no longer receive marketing emails
7. Critical emails (OTP, password reset) still sent

---

## 🛡️ Security & Best Practices

### Email Unsubscribe Check
The email service automatically checks if a user is unsubscribed before sending marketing emails:

```javascript
// Marketing emails check unsubscribe status
await emailService.sendWaitlistConfirmationEmail(email, firstName, userId);

// Critical emails bypass unsubscribe check
await emailService.sendOTPEmail(email, fullName, otp); // Always sent
await emailService.sendPasswordResetOTP(email, fullName, otp); // Always sent
```

### Referral Code Generation
- Codes are unique and auto-generated
- Format: First 4 chars of name + 6 random alphanumeric
- Example: `JOHN4A7F8B`
- Case-insensitive matching
- Validated during registration

### Reward Crediting
- Rewards credited only after referred user verifies email
- Prevents spam/fake referrals
- One-time reward per referral
- Tracked in `Referral` table

---

## 🧪 Testing Guide

### Test Referral System

1. **Create User A:**
   ```bash
   POST /api/auth/register
   {
     "email": "usera@test.com",
     "password": "Test123!",
     "fullName": "User A"
   }
   ```

2. **Verify User A:**
   ```bash
   POST /api/auth/verify-otp
   {
     "email": "usera@test.com",
     "otp": "123456"
   }
   ```

3. **Get User A's Referral Code:**
   ```bash
   GET /api/auth/referral/stats
   Authorization: Bearer <userA_token>
   ```

4. **Create User B with Referral:**
   ```bash
   POST /api/auth/register
   {
     "email": "userb@test.com",
     "password": "Test123!",
     "fullName": "User B",
     "referralCode": "USERA4A7F8B"
   }
   ```

5. **Verify User B:**
   ```bash
   POST /api/auth/verify-otp
   {
     "email": "userb@test.com",
     "otp": "654321"
   }
   ```

6. **Check User A's Updated Stats:**
   ```bash
   GET /api/auth/referral/stats
   Authorization: Bearer <userA_token>
   ```
   Should show:
   - totalReferrals: 1
   - totalCredits: 10
   - User B in referrals list

### Test Email Unsubscribe

1. **Unsubscribe:**
   ```bash
   POST /api/auth/unsubscribe?userId=<user_id>
   ```

2. **Verify No Marketing Emails:**
   - Try triggering marketing emails
   - Should be skipped

3. **Verify Critical Emails Still Work:**
   - Request password reset
   - Should receive OTP email

4. **Resubscribe:**
   ```bash
   POST /api/auth/resubscribe
   Authorization: Bearer <token>
   ```

---

## 📝 Environment Variables

Make sure these are configured in your `.env`:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FROM_NAME=Elyxa
FROM_EMAIL=noreply@elyxa.com

# Frontend URL (for links in emails)
FRONTEND_URL=https://elyxa.com
```

---

## 🚀 Frontend Integration

### Signup Page with Referral

```javascript
// Check for referral code in URL
const urlParams = new URLSearchParams(window.location.search);
const referralCode = urlParams.get('ref');

// Include in signup form
const signupData = {
  email: email,
  password: password,
  fullName: fullName,
  referralCode: referralCode // Optional
};

// Submit to API
await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(signupData)
});
```

### Referral Dashboard

```javascript
// Get referral stats
const response = await fetch('/api/auth/referral/stats', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();

// Display:
// - data.referralCode
// - data.referralLink (allow user to copy)
// - data.totalReferrals
// - data.totalCredits
// - data.referrals (list of referred users)
```

### Unsubscribe Page

```javascript
// Handle unsubscribe from email link
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('userId');

await fetch(`/api/auth/unsubscribe?userId=${userId}`, {
  method: 'POST'
});

// Show success message
```

---

## 🎨 Email Design Guidelines

All emails follow these principles:
- Clean, minimal design
- Mobile-responsive
- Consistent branding (Elyxa)
- Clear CTAs
- Professional typography
- Unsubscribe link in footer (for marketing emails)

---

## 📊 Metrics to Track

### Referral Metrics
- Total referrals per user
- Conversion rate (signups → verified)
- Most successful referrers
- Credits distribution
- Referral source tracking

### Email Metrics
- Open rates
- Click-through rates
- Unsubscribe rate
- Bounce rate
- Email delivery success rate

---

## 🔮 Future Enhancements

### Potential Features
1. **Tiered Rewards** - More rewards for more referrals
2. **Referral Leaderboard** - Gamification
3. **Custom Referral Codes** - Let users choose their code
4. **Email Preferences** - Granular control (daily digest, weekly, etc.)
5. **Referral Rewards Redemption** - Convert credits to features/benefits
6. **Social Sharing** - Easy share to Twitter, Facebook, etc.
7. **Referral Analytics** - Detailed dashboard with charts

---

## ❓ FAQ

**Q: What happens if someone uses an invalid referral code?**
A: Registration fails with error: "Invalid referral code"

**Q: Do referrers get credited immediately?**
A: No, only after the referred user verifies their email

**Q: Can users change their referral code?**
A: Not currently, but can be implemented

**Q: What if a user unsubscribes then wants to resubscribe?**
A: They can use the `/api/auth/resubscribe` endpoint when logged in

**Q: Are OTP emails sent to unsubscribed users?**
A: Yes, critical emails (OTP, password reset) bypass unsubscribe status

**Q: How are referral codes generated?**
A: First 4 characters of name/email + 6 random alphanumeric characters

**Q: Is there a limit to how many people one can refer?**
A: No current limit

---

## 🐛 Troubleshooting

### Issue: Emails not being sent
- Check `EMAIL_*` environment variables
- Verify SMTP credentials
- Check email service logs
- Ensure user is not unsubscribed (for marketing emails)

### Issue: Referral not credited
- Verify referred user completed email verification
- Check `Referral` table in database
- Look for errors in console logs
- Verify referral code was valid during signup

### Issue: Duplicate referral codes
- Very unlikely but handled by uniqueness check
- System will regenerate until unique code found

---

## 📞 Support

For issues or questions:
- Check console logs: `console.log` statements in services
- Review Prisma logs for database issues
- Check email delivery logs
- Verify environment variables

---

**Last Updated:** December 30, 2025
**Version:** 1.0.0
