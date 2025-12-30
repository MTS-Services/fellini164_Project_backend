# 🧪 Testing Checklist - Referral & Email System

## ✅ Pre-Testing Setup

- [ ] Database migration applied successfully
- [ ] Environment variables configured:
  - [ ] `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`
  - [ ] `FRONTEND_URL`
  - [ ] `FROM_NAME`, `FROM_EMAIL`
- [ ] Server running without errors
- [ ] Prisma Client generated

---

## 📝 Test Scenarios

### Test 1: Basic Registration (No Referral)

**Steps:**
1. Register new user without referral code
   ```json
   POST /api/auth/register
   {
     "email": "test1@example.com",
     "password": "Test123!",
     "fullName": "Test User One"
   }
   ```

**Expected Results:**
- [ ] User created successfully
- [ ] User has unique `referralCode` generated
- [ ] OTP email sent
- [ ] Response includes user data with `referralCode`

**Verify:**
- [ ] Check database: User record exists
- [ ] Check email: OTP received
- [ ] Note the referral code for next test

---

### Test 2: Email Verification & Waitlist Email

**Steps:**
1. Verify OTP from Test 1
   ```json
   POST /api/auth/verify-otp
   {
     "email": "test1@example.com",
     "otp": "123456"
   }
   ```

**Expected Results:**
- [ ] Email verified successfully
- [ ] JWT token returned
- [ ] `isEmailVerified` = true
- [ ] Waitlist confirmation email sent automatically

**Verify:**
- [ ] Check database: `isEmailVerified = true`
- [ ] Check email: Waitlist confirmation received
- [ ] Email has unsubscribe link in footer
- [ ] Email matches PDF template design

---

### Test 3: Registration with Referral Code

**Steps:**
1. Get referral code from Test 1 user
2. Register new user with referral code
   ```json
   POST /api/auth/register
   {
     "email": "test2@example.com",
     "password": "Test123!",
     "fullName": "Test User Two",
     "referralCode": "TEST4A7F8B"
   }
   ```

**Expected Results:**
- [ ] User created successfully
- [ ] User has `referredBy` field set
- [ ] User gets own unique `referralCode`
- [ ] OTP email sent
- [ ] Referral record created in database

**Verify:**
- [ ] Check database: User `referredBy` = Test1 user ID
- [ ] Check database: Referral record exists
- [ ] Check database: `rewardCredited` = false (not yet verified)

---

### Test 4: Referral Reward Crediting

**Steps:**
1. Verify OTP for Test 3 user
   ```json
   POST /api/auth/verify-otp
   {
     "email": "test2@example.com",
     "otp": "654321"
   }
   ```

**Expected Results:**
- [ ] Email verified
- [ ] Waitlist confirmation sent to Test2
- [ ] Referrer (Test1) credited with 10 credits
- [ ] Referrer's `referralCount` incremented
- [ ] Referral reward email sent to Test1
- [ ] Referral record updated: `rewardCredited` = true

**Verify:**
- [ ] Check database: Test1 user `referralCredits` = 10
- [ ] Check database: Test1 user `referralCount` = 1
- [ ] Check database: Referral `rewardCredited` = true
- [ ] Check database: Referral `creditedAt` is set
- [ ] Check Test1 email: Reward notification received

---

### Test 5: Get Referral Stats

**Steps:**
1. Login as Test1 user (the referrer)
2. Get referral stats
   ```json
   GET /api/auth/referral/stats
   Authorization: Bearer <test1_token>
   ```

**Expected Results:**
- [ ] Response includes:
  - `referralCode`: "TEST4A7F8B"
  - `totalReferrals`: 1
  - `totalCredits`: 10
  - `referralLink`: Full URL
  - `referrals`: Array with Test2 info

**Verify:**
- [ ] All data matches database
- [ ] Referral link is properly formatted
- [ ] Referred user details shown

---

### Test 6: Invalid Referral Code

**Steps:**
1. Try to register with invalid code
   ```json
   POST /api/auth/register
   {
     "email": "test3@example.com",
     "password": "Test123!",
     "fullName": "Test User Three",
     "referralCode": "INVALID123"
   }
   ```

**Expected Results:**
- [ ] Registration fails
- [ ] Error message: "Invalid referral code"
- [ ] HTTP status: 500 or 400
- [ ] User not created

**Verify:**
- [ ] Check database: No user created
- [ ] Error response clear and helpful

---

### Test 7: Email Unsubscribe

**Steps:**
1. Unsubscribe Test1 user
   ```json
   POST /api/auth/unsubscribe?userId=<test1_user_id>
   ```

**Expected Results:**
- [ ] Success response
- [ ] `isUnsubscribed` = true
- [ ] `unsubscribedAt` timestamp set

**Verify:**
- [ ] Check database: `isUnsubscribed` = true
- [ ] `unsubscribedAt` has current timestamp

---

### Test 8: Unsubscribed User - Marketing Emails

**Steps:**
1. Trigger a marketing email to Test1 (unsubscribed)
   - Example: Send waitlist email manually

**Expected Results:**
- [ ] Email NOT sent
- [ ] Console log: "User {email} is unsubscribed, skipping email"

**Verify:**
- [ ] No email received
- [ ] Server logs show skip message

---

### Test 9: Unsubscribed User - Critical Emails

**Steps:**
1. Request password reset for Test1 (unsubscribed)
   ```json
   POST /api/auth/forgot-password
   {
     "email": "test1@example.com"
   }
   ```

**Expected Results:**
- [ ] Password reset OTP email STILL sent
- [ ] Unsubscribe status bypassed for critical email

**Verify:**
- [ ] Check email: OTP received
- [ ] System logs show email sent

---

### Test 10: Resubscribe to Emails

**Steps:**
1. Login as Test1 user
2. Resubscribe
   ```json
   POST /api/auth/resubscribe
   Authorization: Bearer <test1_token>
   ```

**Expected Results:**
- [ ] Success response
- [ ] `isUnsubscribed` = false
- [ ] `unsubscribedAt` = null

**Verify:**
- [ ] Check database: `isUnsubscribed` = false
- [ ] Marketing emails will be sent again

---

### Test 11: Multiple Referrals

**Steps:**
1. Register and verify 2-3 more users with Test1's referral code

**Expected Results:**
- [ ] Each verified referral adds 10 credits
- [ ] `referralCount` increments each time
- [ ] Reward email sent for each referral
- [ ] All referrals shown in stats endpoint

**Verify:**
- [ ] Check Test1 credits = 10 × number of verified referrals
- [ ] Check Test1 `referralCount` matches
- [ ] Check `/referral/stats` shows all referrals

---

## 🔍 Database Verification Queries

```sql
-- Check user with referral info
SELECT 
  id, email, fullName, 
  referralCode, referredBy, 
  referralCredits, referralCount,
  isUnsubscribed, isEmailVerified
FROM "User" 
WHERE email = 'test1@example.com';

-- Check referral records
SELECT * FROM "Referral" 
WHERE referrerUserId = '<test1_id>';

-- Check all referral codes
SELECT email, referralCode, referralCount, referralCredits 
FROM "User" 
WHERE referralCode IS NOT NULL;
```

---

## 📧 Email Checklist

For each email received, verify:

### Waitlist Confirmation Email:
- [ ] Subject: "You're on the Elyxa waitlist"
- [ ] Personalized greeting with first name
- [ ] Content matches PDF requirements
- [ ] Unsubscribe link in footer
- [ ] Professional design
- [ ] Mobile responsive

### Referral Reward Email:
- [ ] Subject: "You've earned a referral reward! 🎉"
- [ ] Shows correct credit amount (10)
- [ ] Shows referred user's name
- [ ] CTA button to referral dashboard
- [ ] Unsubscribe link in footer

### OTP Email:
- [ ] 6-digit code displayed clearly
- [ ] Expiration time mentioned
- [ ] Professional design

---

## 🐛 Common Issues & Solutions

### Issue: Emails not sending
**Check:**
- [ ] Email service configured in `.env`
- [ ] SMTP credentials valid
- [ ] Console logs for errors
- [ ] Internet connection

**Solution:**
- Verify email credentials
- Check Gmail "Less secure apps" settings if using Gmail
- Use app-specific password for Gmail

### Issue: Referral not credited
**Check:**
- [ ] Referred user verified their email
- [ ] Referral code was valid during signup
- [ ] Check `Referral` table in database
- [ ] Console logs for errors

**Solution:**
- Ensure OTP verification completed
- Check database for referral record
- Review `creditReferralReward` function logs

### Issue: Duplicate referral codes
**Check:**
- [ ] Extremely rare, but system should auto-regenerate
- [ ] Check database for uniqueness constraint

**Solution:**
- System handles automatically
- If persistent, check `generateReferralCode` function

---

## ✅ Final Verification

After all tests:
- [ ] All endpoints respond correctly
- [ ] Emails sent/skipped as expected
- [ ] Database records accurate
- [ ] No console errors
- [ ] Error handling works
- [ ] Authentication works
- [ ] Unsubscribe functionality works
- [ ] Referral system works end-to-end

---

## 📊 Expected Database State After All Tests

```
Users:
- test1@example.com
  - referralCode: Unique code
  - referralCount: 3-4 (depending on Test 11)
  - referralCredits: 30-40
  - isUnsubscribed: false (after resubscribe)
  
- test2@example.com
  - referralCode: Unique code
  - referredBy: test1's ID
  - referralCount: 0
  - referralCredits: 0

- test3@example.com (if created in Test 11)
  - Similar to test2

Referrals Table:
- 3-4 records
- All with rewardCredited: true
- All with creditedAt: timestamp
```

---

## 🎯 Success Criteria

All tests pass if:
✅ Users can register with/without referral codes  
✅ Unique referral codes generated  
✅ Rewards credited automatically  
✅ Emails sent correctly  
✅ Unsubscribe works  
✅ Critical emails bypass unsubscribe  
✅ Referral stats accurate  
✅ No server errors  
✅ Database consistent  

---

## 📝 Testing Notes

**Date Tested:** __________  
**Tested By:** __________  
**Server Version:** __________  
**Database:** __________  

**Issues Found:**
- [ ] None
- [ ] List any issues below:

---

**Overall Result:** ⬜ PASS | ⬜ FAIL | ⬜ NEEDS REVIEW
