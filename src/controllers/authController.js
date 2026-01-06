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


exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const result = await authService.verifyResetOTP(email, otp);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
    
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to verify OTP'
    });
  }
};

exports.setNewPassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    
    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }
    
    const result = await authService.setNewPassword(email, password);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('Set new password error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to set new password'
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
    const queryUserId = req.query?.userId;
    const authUser = req.user;

    let targetUserId;

    if (queryUserId) {
      if (!authUser) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      // Allow admins to resubscribe any user; allow users to resubscribe themselves via query
      if (authUser.role === 'ADMIN' || authUser.role === 'SUPER_ADMIN' || authUser.id === queryUserId) {
        targetUserId = queryUserId;
      } else {
        return res.status(403).json({ success: false, message: 'Not authorized to resubscribe this user' });
      }
    } else {
      if (!authUser) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }
      targetUserId = authUser.id;
    }

    const result = await authService.resubscribeEmail(targetUserId);

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

/**
 * Get waitlist count - PUBLIC endpoint (no auth required)
 * Shows total number of users on waitlist for social proof
 */
exports.getWaitlistCount = async (req, res) => {
  try {
    const count = await authService.getWaitlistCount();
    
    res.status(200).json({
      success: true,
      data: {
        count,
        message: `${count} people waiting`
      }
    });
    
  } catch (error) {
    console.error('Get waitlist count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get waitlist count'
    });
  }
};
