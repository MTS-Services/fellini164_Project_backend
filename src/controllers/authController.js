const authService = require('../services/authService');


exports.register = async (req, res) => {
  try {
    const { email, password, fullName, referralCode } = req.body;
    
    const result = await authService.register({ email, password, fullName, referralCode });
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.user
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message
    });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await authService.login(email, password);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Failed to login'
    });
  }
};


exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const result = await authService.verifyOTP(email, otp);
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to verify OTP'
    });
  }
};


exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    const result = await authService.resendOTP(email);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to resend OTP'
    });
  }
};


exports.verifyEmail = async (req, res) => {
  res.json({ message: 'Use POST /auth/verify-otp instead' });
};


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const result = await authService.forgotPassword(email);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to process password reset request'
    });
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    
    const result = await authService.resetPassword(email, otp, password);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reset password'
    });
  }
};


exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await authService.getProfile(userId);
    
    res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get profile'
    });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, address, avatar } = req.body;
    
    const result = await authService.updateProfile(userId, { fullName, phone, address, avatar });
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile'
    });
  }
};

// Get referral stats
exports.getReferralStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await authService.getReferralStats(userId);
    
    res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get referral stats'
    });
  }
};

// Unsubscribe from emails
exports.unsubscribeEmail = async (req, res) => {
  try {
    const { userId } = req.query; // Can be from query param for email links
    const authenticatedUserId = req.user?.id; // Or from authenticated user
    
    const targetUserId = userId || authenticatedUserId;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const result = await authService.unsubscribeEmail(targetUserId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.user
    });
    
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to unsubscribe'
    });
  }
};

// Resubscribe to emails
exports.resubscribeEmail = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await authService.resubscribeEmail(userId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.user
    });
    
  } catch (error) {
    console.error('Resubscribe error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to resubscribe'
    });
  }
};
