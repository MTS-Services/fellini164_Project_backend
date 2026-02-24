const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  registerValidator,
  loginValidator,
  verifyOTPValidator,
  resendOTPValidator,
  updateProfileValidator,
  forgotPasswordValidator,
  verifyResetOTPValidator,
  setNewPasswordValidator,
  resetPasswordValidator,
  validate
} = require('../middleware/validator');

// Auth routes
router.post('/register', registerValidator, validate, authController.register);
router.post('/join-waitlist', authController.joinWaitlist);
router.post('/login', loginValidator, validate, authController.login);
router.post('/verify-otp', verifyOTPValidator, validate, authController.verifyOTP);
router.post('/resend-otp', resendOTPValidator, validate, authController.resendOTP);
router.get('/verify-email/:token', authController.verifyEmail);

router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/verify-reset-otp', verifyResetOTPValidator, validate, authController.verifyResetOTP);
router.post('/set-new-password', setNewPasswordValidator, validate, authController.setNewPassword);

router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);


router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, updateProfileValidator, validate, authController.updateProfile);

// Referral routes (protected)
router.get('/referral/stats', protect, authController.getReferralStats);
router.post('/referral/invite', protect, authController.sendReferralInvitation);

// Email subscription routes
router.post('/unsubscribe', authController.unsubscribeEmail);
router.post('/resubscribe', protect, authController.resubscribeEmail);


router.get('/waitlist-count', authController.getWaitlistCount);

module.exports = router;