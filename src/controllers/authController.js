const authService = require('../services/authService');


exports.register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    
    const result = await authService.register({ email, password, fullName });
    
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
  res.json({ message: 'Forgot password - TODO' });
};


exports.resetPassword = async (req, res) => {
  res.json({ message: 'Reset password - TODO' });
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
