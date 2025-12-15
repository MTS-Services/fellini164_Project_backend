# OTP Registration & Verification API

## Overview
The registration process now uses email OTP verification. Users must verify their email with a 6-digit OTP before they can log in.

## Authentication Flow

### 1. Register User
**POST** `/api/v1/auth/register`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for OTP verification.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "subscriptionPlan": "FREE",
      "isEmailVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Note:** An OTP is sent to the user's email. The OTP expires in 10 minutes.

---

### 2. Verify OTP
**POST** `/api/v1/auth/verify-otp`

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
      "isEmailVerified": true
    },
    "token": "jwt_token_here"
  }
}
```

**Note:** Token expires in 30 days.

**Errors:**
- `Invalid OTP` - OTP doesn't match
- `OTP has expired` - OTP expired after 10 minutes
- `Email already verified` - User already verified
- `User not found` - Email doesn't exist

---

### 3. Resend OTP
**POST** `/api/v1/auth/resend-otp`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP resent successfully. Please check your email."
}
```

**Errors:**
- `Email already verified` - Cannot resend if already verified
- `User not found` - Email doesn't exist

---

### 4. Login
**POST** `/api/v1/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
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
      "isEmailVerified": true
    },
    "token": "jwt_token_here"
  }
}
```

**Note:** Token expires in 30 days.

**Errors:**
- `Invalid credentials` - Wrong email or password
- `Please verify your email before logging in` - Email not verified

---

## Email Configuration

The system uses Gmail SMTP for sending OTP emails. Configuration in `.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=hahm56825@gmail.com
EMAIL_PASS=bivf agof aaqs aczd
FROM_EMAIL=hahm56825@gmail.com
FROM_NAME=Fellini AI
```

## OTP Details

- **Format:** 6-digit numeric code
- **Expiration:** 10 minutes
- **Purpose:** Email verification during registration
- **Delivery:** Sent via email with styled HTML template

## Testing the Flow

### Using cURL:

1. **Register:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "test@example.com",
    "password": "password123"
  }'
```

2. **Check email for OTP, then verify:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

3. **Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Using Postman:

1. Import the API endpoints
2. Create requests for register, verify-otp, and login
3. Test the complete flow

## Database Schema Changes

The User model now includes:
- `fullName` (String) - Replaces firstName/lastName
- `emailVerificationOtp` (String) - Stores the 6-digit OTP
- `otpExpires` (DateTime) - Stores OTP expiration time

## Migration

Migration applied: `20251215043852_update_user_fullname_add_otp`

Changes:
- Removed `firstName` and `lastName` columns
- Added `fullName`, `emailVerificationOtp`, and `otpExpires` columns
