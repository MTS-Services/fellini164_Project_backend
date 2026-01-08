# Waitlist System Documentation

## Overview

The updated waitlist system allows users to join with just their email. The system automatically:
- Generates a secure password
- Creates a user account with WAITLIST status
- Generates a unique referral code
- Sends welcome email with login credentials and referral link
- Tracks referrals and rewards referrers

## API Endpoints

### 1. Join Waitlist (No Password Required)

**Endpoint:** `POST /api/auth/join-waitlist`

**Description:** Simplified registration where users only provide their email. System auto-generates password and sends it via email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",  // Optional
  "referralCode": "ABC123"  // Optional - if joining via referral link
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Successfully joined waitlist! Check your email for login credentials and referral link.",
  "data": {
    "email": "user@example.com",
    "referralCode": "JOHN4X8Y9Z",
    "referralLink": "https://elyxaai.com/join?ref=JOHN4X8Y9Z"
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "message": "This email is already registered"
}
```

**What Happens:**
1. System checks if email already exists
2. Validates referral code (if provided)
3. Generates a 12-character random password
4. Creates user with WAITLIST status
5. Generates unique referral code
6. Sends welcome email with:
   - Login credentials (email + password)
   - Referral code
   - Referral link
7. If referred, credits the referrer immediately

---

### 2. Login (Standard)

**Endpoint:** `POST /api/auth/login`

**Description:** Users login with the email and auto-generated password they received.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "abc123XYZ789"  // Password from welcome email
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "subscriptionPlan": "FREE",
      "userStatus": "WAITLIST",
      "referralCode": "JOHN4X8Y9Z"
    },
    "token": "jwt_token_here"
  }
}
```

---

### 3. Get Referral Stats (Protected)

**Endpoint:** `GET /api/auth/referral/stats`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "referralCode": "JOHN4X8Y9Z",
    "totalReferrals": 5,
    "totalCredits": 50,
    "referralLink": "https://elyxaai.com/join?ref=JOHN4X8Y9Z",
    "referrals": [
      {
        "id": "uuid",
        "userName": "Jane Smith",
        "userEmail": "jane@example.com",
        "joinedAt": "2026-01-08T10:30:00Z",
        "rewardCredited": true,
        "rewardAmount": 10
      }
    ]
  }
}
```

---

### 4. Send Referral Invitation (Protected)

**Endpoint:** `POST /api/auth/referral/invite`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "email": "friend@example.com",
  "name": "Friend Name"  // Optional
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Referral invitation sent successfully",
  "data": {
    "invitedEmail": "friend@example.com",
    "referralLink": "https://elyxaai.com/join?ref=JOHN4X8Y9Z"
  }
}
```

---

## User Flow

### New User Journey

1. **User visits landing page**
   - Enters email (and optionally name)
   - Clicks "Join Waitlist"

2. **System processes request**
   - Generates random 12-character password
   - Creates account with WAITLIST status
   - Generates unique referral code
   - Sends welcome email

3. **User receives email with:**
   ```
   Email: user@example.com
   Password: abc123XYZ789
   
   Referral Code: JOHN4X8Y9Z
   Referral Link: https://elyxaai.com/join?ref=JOHN4X8Y9Z
   ```

4. **User can immediately:**
   - Login with provided credentials
   - Share referral link to move up waitlist
   - Change password in profile settings

### Referral Flow

1. **User A joins waitlist**
   - Gets referral code: `USERA123`
   - Gets referral link: `https://elyxaai.com/join?ref=USERA123`

2. **User A shares link with User B**
   - User B visits: `https://elyxaai.com/join?ref=USERA123`
   - Frontend pre-fills referral code

3. **User B joins via referral**
   - Provides email: `userb@example.com`
   - System detects referral code: `USERA123`
   - Creates User B account
   - Creates Referral record
   - Updates User A's referralCount: +1
   - Credits User A with 10 points
   - Sends reward email to User A

4. **User A benefits:**
   - `referralCount` increases by 1
   - `referralCredits` increases by 10
   - Moves up waitlist priority
   - Receives email notification

---

## Database Models

### User Model (Relevant Fields)
```prisma
model User {
  id                    String              @id @default(uuid())
  email                 String              @unique
  password              String              // Auto-generated for waitlist
  fullName              String?
  userStatus            UserStatus          @default(WAITLIST)
  isEmailVerified       Boolean             @default(true)  // Auto-verified for waitlist
  
  referralCode          String?             @unique         // Generated automatically
  referredBy            String?                             // ID of user who referred
  referralCredits       Int                 @default(0)
  referralCount         Int                 @default(0)
}
```

### Referral Model
```prisma
model Referral {
  id                    String   @id @default(uuid())
  referrerUserId        String   // User who referred
  referredUserId        String   // User who was referred
  referralCode          String
  rewardCredited        Boolean  @default(false)
  rewardAmount          Int      @default(0)
  createdAt             DateTime @default(now())
  creditedAt            DateTime?
}
```

### ReferralInvitation Model
```prisma
model ReferralInvitation {
  id                    String   @id @default(uuid())
  referrerUserId        String   
  invitedEmail          String   
  referralCode          String   
  isRegistered          Boolean  @default(false)
  registeredUserId      String?  
  sentAt                DateTime @default(now())
  registeredAt          DateTime?
}
```

---

## Email Templates

### 1. Waitlist Welcome Email

**Subject:** Welcome to Elyxa — You're on the waitlist!

**Content:**
- Greeting with user's name
- Login credentials (email + password)
- Referral code and link prominently displayed
- Instructions on what happens next
- Call-to-action to login
- Encouragement to share referral link

### 2. Referral Reward Email

**Subject:** You've earned a referral reward! 🎉

**Content:**
- Congratulations message
- Reward amount displayed prominently
- Name of person who joined
- Updated referral stats
- Encouragement to share more

### 3. Referral Invitation Email

**Subject:** You're Invited — Early Access to Elyxa

**Content:**
- Personal invitation from friend
- What Elyxa is about
- Special referral link
- Benefits of joining early

---

## Frontend Integration

### Landing Page Form
```javascript
// Example form submission
const joinWaitlist = async (email, name, referralCode) => {
  const response = await fetch('/api/auth/join-waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email, 
      fullName: name,
      referralCode 
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Show success message
    // Display: "Check your email for login credentials!"
    // Optionally show referral link immediately
  }
};
```

### Referral Link Sharing
```javascript
// Get user's referral stats
const getReferralStats = async (token) => {
  const response = await fetch('/api/auth/referral/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  // Display:
  // - data.referralLink (for sharing)
  // - data.totalReferrals
  // - data.totalCredits
  // - List of referred users
};
```

### Invite Friends
```javascript
// Send invitation to friend
const inviteFriend = async (token, email, name) => {
  const response = await fetch('/api/auth/referral/invite', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ email, name })
  });
  
  const data = await response.json();
  // Show success message
};
```

---

## Security Features

1. **Auto-Generated Passwords**
   - 12 characters long
   - Mix of lowercase, uppercase, and numbers
   - Example: `abc123XYZ789`
   - Users encouraged to change after first login

2. **Unique Referral Codes**
   - Generated from name/email + random string
   - Verified for uniqueness before creation
   - Case-insensitive matching

3. **Email Verification**
   - Auto-verified for waitlist users
   - Email address becomes username
   - Welcome email serves as verification

4. **Referral Tracking**
   - Prevents duplicate referrals
   - Tracks invitation status
   - Credits only when user successfully joins

---

## Testing

### Test Scenario 1: Join Waitlist
```bash
curl -X POST http://localhost:3000/api/auth/join-waitlist \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Test User"
  }'
```

### Test Scenario 2: Join with Referral
```bash
curl -X POST http://localhost:3000/api/auth/join-waitlist \
  -H "Content-Type: application/json" \
  -d '{
    "email": "friend@example.com",
    "fullName": "Friend Name",
    "referralCode": "TEST4X8Y9Z"
  }'
```

### Test Scenario 3: Login with Auto Password
```bash
# First join waitlist, then check email for password, then:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "abc123XYZ789"
  }'
```

### Test Scenario 4: Get Referral Stats
```bash
curl -X GET http://localhost:3000/api/auth/referral/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Benefits of This System

1. **Simplified Onboarding**
   - One-click join (just email)
   - No password to remember initially
   - Immediate account creation

2. **Viral Growth**
   - Every user gets referral link
   - Incentivized sharing
   - Easy tracking

3. **User Engagement**
   - Users can login immediately
   - Explore dashboard on waitlist
   - Share with friends

4. **Data Collection**
   - Valid email addresses
   - Referral source tracking
   - Engagement metrics

---

## Configuration

### Environment Variables Required

```env
# Frontend URL for referral links
FRONTEND_URL=https://elyxaai.com

# Email configuration (Mailgun SMTP)
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=your-mailgun-smtp-user
EMAIL_PASS=your-mailgun-smtp-password
FROM_NAME=Elyxa AI
FROM_EMAIL=noreply@elyxaai.com

# JWT for authentication
JWT_SECRET=your-secure-jwt-secret

# Database
DATABASE_URL=postgresql://...
```

---

## Future Enhancements

1. **Priority Ranking**
   - Users with more referrals get earlier access
   - Display position in waitlist

2. **Referral Rewards**
   - Convert credits to premium features
   - Discount codes for referrers

3. **Social Sharing**
   - One-click share to Twitter/LinkedIn
   - Pre-formatted messages

4. **Analytics Dashboard**
   - Referral funnel metrics
   - Conversion rates
   - Top referrers leaderboard

---

## Support

For issues or questions:
- Check email configuration
- Verify DATABASE_URL is correct
- Ensure FRONTEND_URL matches your domain
- Check Prisma migrations are up to date
