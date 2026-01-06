# 🔐 Forgot Password with OTP - Complete Guide

## ✅ ALREADY IMPLEMENTED!

Your forgot password system with OTP is fully working! Here's how to use it:

---

## 🔄 COMPLETE FLOW

```
1. User clicks "Forgot Password"
   ↓
2. User enters email
   ↓
3. POST /api/v1/auth/forgot-password
   ✅ System generates 6-digit OTP
   ✅ Stores OTP in database (expires in 15 minutes)
   ✅ Sends OTP to email
   ↓
4. User receives email with OTP
   ↓
5. User enters: email + OTP + new password
   ↓
6. POST /api/v1/auth/reset-password
   ✅ Verifies OTP
   ✅ Checks if OTP expired
   ✅ Updates password
   ✅ Clears OTP from database
   ↓
7. User can login with new password
```

---

## 📡 API ENDPOINTS

### 1️⃣ Request Password Reset (Send OTP)

```http
POST {{baseUrl}}/api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Password reset OTP sent to your email. Please check your inbox."
}
```

**Error Responses:**
```json
// User not found
{
  "success": false,
  "message": "User not found with this email"
}

// Invalid email format
{
  "success": false,
  "message": "Please provide a valid email"
}
```

**What happens:**
- ✅ Generates random 6-digit OTP (e.g., `482756`)
- ✅ Saves OTP to database with 15-minute expiry
- ✅ Sends email with OTP to user
- ✅ Returns success message

---

### 2️⃣ Verify OTP and Reset Password

```http
POST {{baseUrl}}/api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "482756",
  "password": "newPassword123"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Password reset successful. You can now login with your new password."
}
```

**Error Responses:**
```json
// Invalid OTP
{
  "success": false,
  "message": "Invalid OTP"
}

// OTP expired
{
  "success": false,
  "message": "OTP has expired. Please request a new one."
}

// No reset request found
{
  "success": false,
  "message": "No password reset request found. Please request a new OTP."
}

// Password too short
{
  "success": false,
  "message": "Password must be at least 6 characters long"
}

// User not found
{
  "success": false,
  "message": "User not found"
}
```

**What happens:**
- ✅ Verifies OTP matches
- ✅ Checks OTP hasn't expired (15 minutes)
- ✅ Hashes new password
- ✅ Updates user password
- ✅ Clears OTP from database
- ✅ User can now login with new password

---

## 📧 EMAIL TEMPLATE

Users receive this email:

```
Subject: Reset Your Password - Fellini AI

Hi [Name],

We received a request to reset your password. Please use the OTP below to reset your password:

┌─────────────────────┐
│      482756         │ (Large, colorful)
└─────────────────────┘

This OTP will expire in 15 minutes.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
Fellini AI Team
```

---

## 🧪 TESTING GUIDE

### Test Case 1: Successful Password Reset

```bash
# Step 1: Request OTP
POST http://localhost:5000/api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "test@example.com"
}

# Expected: Success message
# Check your email for OTP (e.g., 482756)

# Step 2: Reset password with OTP
POST http://localhost:5000/api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "test@example.com",
  "otp": "482756",
  "password": "newPassword123"
}

# Expected: Success message

# Step 3: Login with new password
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "newPassword123"
}

# Expected: Login successful with token
```

---

### Test Case 2: Invalid OTP

```bash
POST http://localhost:5000/api/v1/auth/reset-password

{
  "email": "test@example.com",
  "otp": "000000",  # Wrong OTP
  "password": "newPassword123"
}

# Expected Error: "Invalid OTP"
```

---

### Test Case 3: Expired OTP

```bash
# 1. Request OTP
POST /api/v1/auth/forgot-password
{ "email": "test@example.com" }

# 2. Wait 16 minutes (OTP expires after 15 minutes)

# 3. Try to use expired OTP
POST /api/v1/auth/reset-password
{
  "email": "test@example.com",
  "otp": "482756",
  "password": "newPassword123"
}

# Expected Error: "OTP has expired. Please request a new one."
```

---

### Test Case 4: Email Not Found

```bash
POST http://localhost:5000/api/v1/auth/forgot-password

{
  "email": "nonexistent@example.com"
}

# Expected Error: "User not found with this email"
```

---

### Test Case 5: Password Too Short

```bash
POST http://localhost:5000/api/v1/auth/reset-password

{
  "email": "test@example.com",
  "otp": "482756",
  "password": "123"  # Too short
}

# Expected Error: "Password must be at least 6 characters long"
```

---

## 🔍 DATABASE CHANGES

### When OTP is requested:

**User table updated:**
```javascript
{
  passwordResetToken: "482756",
  passwordResetExpires: "2026-01-06T11:00:00Z" // +15 minutes
}
```

### When password is reset:

**User table updated:**
```javascript
{
  password: "hashed_new_password",
  passwordResetToken: null,     // Cleared
  passwordResetExpires: null     // Cleared
}
```

---

## 🔒 SECURITY FEATURES

✅ **OTP Expires**: 15 minutes timeout  
✅ **One-Time Use**: OTP cleared after successful reset  
✅ **Email Verification**: Must use email from database  
✅ **Password Hashing**: New password is bcrypt hashed  
✅ **No Token Storage**: OTP cleared immediately after use  
✅ **Critical Email**: Bypasses unsubscribe list (important for security)  

---

## ⚙️ CONFIGURATION

### Required Environment Variables:

```env
# Email Service (Mailgun)
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=support@elyxaai.com
EMAIL_PASS=your-mailgun-smtp-password
FROM_EMAIL=support@elyxaai.com
FROM_NAME=Fellini AI
```

---

## 🎯 FRONTEND INTEGRATION

### Step 1: Forgot Password Form

```jsx
const handleForgotPassword = async (email) => {
  const response = await fetch('/api/v1/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('OTP sent to your email! Check your inbox.');
    // Show OTP input form
  } else {
    alert(data.message);
  }
};
```

### Step 2: Reset Password Form

```jsx
const handleResetPassword = async (email, otp, password) => {
  const response = await fetch('/api/v1/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('Password reset successful! You can now login.');
    // Redirect to login page
    navigate('/login');
  } else {
    alert(data.message);
  }
};
```

---

## 📋 VALIDATION RULES

### Forgot Password Request:
- ✅ Email must be valid format
- ✅ Email must exist in database

### Reset Password:
- ✅ Email must be valid format
- ✅ OTP must be exactly 6 digits
- ✅ OTP must match database
- ✅ OTP must not be expired
- ✅ Password must be at least 6 characters

---

## 🐛 TROUBLESHOOTING

### Issue 1: Email not received

**Check:**
1. Is email service configured? (Check `.env`)
2. Check spam/junk folder
3. Check backend logs for email errors
4. Verify EMAIL_HOST and EMAIL_USER in `.env`

**Test email manually:**
```bash
node test-mailgun.js
```

---

### Issue 2: "Invalid OTP" error

**Causes:**
- Wrong OTP entered
- OTP already used (can only use once)
- OTP expired (15 minutes)
- User requested new OTP (old one invalidated)

**Solution:** Request a new OTP

---

### Issue 3: Can't reset password after 15 minutes

**This is expected behavior!** OTP expires after 15 minutes for security.

**Solution:** Request a new OTP

---

## ✅ CHECKLIST

Test your forgot password system:

- [ ] Request OTP with valid email → OTP sent
- [ ] Check email → OTP received
- [ ] Reset password with correct OTP → Success
- [ ] Login with new password → Works
- [ ] Request OTP with invalid email → Error
- [ ] Use wrong OTP → Error "Invalid OTP"
- [ ] Use expired OTP (after 15 min) → Error "OTP has expired"
- [ ] Use same OTP twice → Error (already cleared)

---

## 🎉 READY TO USE!

Your forgot password system is **fully implemented and working**!

**API Endpoints:**
- ✅ `POST /api/v1/auth/forgot-password` - Request OTP
- ✅ `POST /api/v1/auth/reset-password` - Reset password with OTP

**Features:**
- ✅ 6-digit OTP generation
- ✅ Email delivery via Mailgun
- ✅ 15-minute expiry
- ✅ One-time use
- ✅ Secure password hashing
- ✅ Validation and error handling

**Just make sure your email service is configured and you're good to go!** 📧✨
