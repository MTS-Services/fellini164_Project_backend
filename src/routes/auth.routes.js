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
  validate 
} = require('../middleware/validator');

// Auth routes
router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginValidator, validate, authController.login);
router.post('/verify-otp', verifyOTPValidator, validate, authController.verifyOTP);
router.post('/resend-otp', resendOTPValidator, validate, authController.resendOTP);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Profile routes (protected)
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, updateProfileValidator, validate, authController.updateProfile);

module.exports = router;
