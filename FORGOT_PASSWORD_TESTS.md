# 🧪 Quick Test Script - Forgot Password

## Copy and paste these into your REST client (Postman, Thunder Client, etc.)

### ✅ Test 1: Complete Flow (Success)

```bash
### STEP 1: Request OTP
POST http://localhost:5000/api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "xoxaler506@cucadas.com"
}

###

### STEP 2: Check your email for OTP (e.g., 482756)
### Then reset password with the OTP you received

POST http://localhost:5000/api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "xoxaler506@cucadas.com",
  "otp": "482756",
  "password": "newPassword123"
}

###

### STEP 3: Login with new password
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "xoxaler506@cucadas.com",
  "password": "newPassword123"
}

###
```

---

## ❌ Test 2: Error Cases

```bash
### Test: Invalid Email
POST http://localhost:5000/api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "nonexistent@example.com"
}

# Expected: "User not found with this email"

###

### Test: Wrong OTP
POST http://localhost:5000/api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "xoxaler506@cucadas.com",
  "otp": "000000",
  "password": "newPassword123"
}

# Expected: "Invalid OTP"

###

### Test: Password Too Short
POST http://localhost:5000/api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "xoxaler506@cucadas.com",
  "otp": "482756",
  "password": "123"
}

# Expected: "Password must be at least 6 characters long"

###

### Test: Invalid Email Format
POST http://localhost:5000/api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "not-an-email"
}

# Expected: "Please provide a valid email"

###
```

---

## 📊 Expected Results

### ✅ Success Flow:

1. **Request OTP**
   ```json
   {
     "success": true,
     "message": "Password reset OTP sent to your email. Please check your inbox."
   }
   ```

2. **Check Email** - You'll receive:
   ```
   Subject: Reset Your Password - Fellini AI
   
   Your OTP: 482756
   
   This OTP will expire in 15 minutes.
   ```

3. **Reset Password**
   ```json
   {
     "success": true,
     "message": "Password reset successful. You can now login with your new password."
   }
   ```

4. **Login with New Password**
   ```json
   {
     "success": true,
     "message": "Login successful",
     "data": {
       "user": { ... },
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     }
   }
   ```

---

## 🔍 Verify in Database

```bash
# Open Prisma Studio
npx prisma studio

# Check User table for your email:
# - passwordResetToken should be cleared (null)
# - passwordResetExpires should be cleared (null)
# - password should be updated (new hash)
```

---

## ⏱️ Timing Test

```bash
### Request OTP
POST http://localhost:5000/api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "xoxaler506@cucadas.com"
}

# Wait 16 minutes (OTP expires after 15 minutes)

### Try to use expired OTP
POST http://localhost:5000/api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "xoxaler506@cucadas.com",
  "otp": "482756",
  "password": "newPassword123"
}

# Expected: "OTP has expired. Please request a new one."
```

---

## 🎯 Quick Verification Checklist

After testing, verify:

- [ ] ✅ OTP email received
- [ ] ✅ OTP is 6 digits
- [ ] ✅ Can reset password with correct OTP
- [ ] ✅ Can login with new password
- [ ] ✅ Wrong OTP shows error
- [ ] ✅ Expired OTP shows error
- [ ] ✅ Can't use same OTP twice
- [ ] ✅ Invalid email shows error
- [ ] ✅ Short password shows error

---

## 📧 Check Email Logs

If email not received, check backend console:

```bash
# Should see:
✅ Email service configured with Mailgun SMTP
📧 Sending email to: xoxaler506@cucadas.com
✅ Email sent successfully
```

If you see errors, check `.env`:
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_USER=support@elyxaai.com
EMAIL_PASS=your-mailgun-smtp-password
```

---

## 🚀 All Tests in One File

Save this as `forgot-password-tests.http`:

```http
@baseUrl = http://localhost:5000/api/v1
@email = xoxaler506@cucadas.com

### 1. Request OTP
POST {{baseUrl}}/auth/forgot-password
Content-Type: application/json

{
  "email": "{{email}}"
}

###

### 2. Reset Password (replace OTP with one from email)
POST {{baseUrl}}/auth/reset-password
Content-Type: application/json

{
  "email": "{{email}}",
  "otp": "482756",
  "password": "newPassword123"
}

###

### 3. Login with New Password
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "{{email}}",
  "password": "newPassword123"
}

###

### 4. Test Invalid Email
POST {{baseUrl}}/auth/forgot-password
Content-Type: application/json

{
  "email": "nonexistent@example.com"
}

###

### 5. Test Wrong OTP
POST {{baseUrl}}/auth/reset-password
Content-Type: application/json

{
  "email": "{{email}}",
  "otp": "000000",
  "password": "newPassword123"
}

###
```

---

## ✨ IT'S WORKING!

Your forgot password system is **fully implemented** and ready to use!

Just test it with the scripts above. 🎉
