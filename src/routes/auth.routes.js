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
  resetPasswordValidator,
  validate 
} = require('../middleware/validator');

// Auth routes
router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginValidator, validate, authController.login);
router.post('/verify-otp', verifyOTPValidator, validate, authController.verifyOTP);
router.post('/resend-otp', resendOTPValidator, validate, authController.resendOTP);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);

// Profile routes (protected)
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, updateProfileValidator, validate, authController.updateProfile);

// Referral routes (protected)
router.get('/referral/stats', protect, authController.getReferralStats);

// Email subscription routes
router.post('/unsubscribe', authController.unsubscribeEmail); // Public for email links
router.post('/resubscribe', protect, authController.resubscribeEmail); // Protected

module.exports = router;
