const prisma = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/crypto');
const { generateToken } = require('../utils/jwt');
const emailService = require('./emailService');

class AuthService {
  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Register new user with OTP verification
  async register(userData) {
    const { email, password, fullName } = userData;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      throw new Error('User already exists with this email');
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Generate OTP
    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Create user (not verified yet)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        isEmailVerified: false,
        emailVerificationOtp: otp,
        otpExpires
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
        isEmailVerified: true,
        createdAt: true
      }
    });
    
    // Send OTP email
    await emailService.sendOTPEmail(email, fullName, otp);
    
    return {
      user,
      message: 'Registration successful. Please check your email for OTP verification.'
    };
  }
  
  // Verify OTP
  async verifyOTP(email, otp) {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.isEmailVerified) {
      throw new Error('Email already verified');
    }
    
    if (!user.emailVerificationOtp || user.emailVerificationOtp !== otp) {
      throw new Error('Invalid OTP');
    }
    
    if (user.otpExpires && new Date() > user.otpExpires) {
      throw new Error('OTP has expired');
    }
    
    // Verify user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationOtp: null,
        otpExpires: null
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
        isEmailVerified: true
      }
    });
    
    // Generate token after verification
    const token = generateToken(updatedUser.id);
    
    return {
      user: updatedUser,
      token
    };
  }
  
  // Resend OTP
  async resendOTP(email) {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.isEmailVerified) {
      throw new Error('Email already verified');
    }
    
    // Generate new OTP
    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationOtp: otp,
        otpExpires
      }
    });
    
    // Resend OTP email
    await emailService.sendOTPEmail(email, user.fullName, otp);
    
    return {
      message: 'OTP resent successfully. Please check your email.'
    };
  }
  
  // Login user
  async login(email, password) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new Error('Please verify your email before logging in');
    }
    
    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });
    
    // Generate token
    const token = generateToken(user.id);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        subscriptionPlan: user.subscriptionPlan,
        isEmailVerified: user.isEmailVerified
      },
      token
    };
  }
  
  // Verify email
  async verifyEmail(token) {
    // TODO: Implement email verification logic
    throw new Error('Not implemented');
  }
  
  // Request password reset
  async forgotPassword(email) {
    // TODO: Implement forgot password logic
    throw new Error('Not implemented');
  }
  
  // Reset password
  async resetPassword(token, newPassword) {
    // TODO: Implement reset password logic
    throw new Error('Not implemented');
  }
  
  // Get user profile
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        address: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  // Update user profile
  async updateProfile(userId, data) {
    const { fullName, phone, address, avatar } = data;
    
    // Build update data object
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (avatar !== undefined) updateData.avatar = avatar;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        address: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        subscriptionPlan: true,
        updatedAt: true
      }
    });
    
    return user;
  }
}

module.exports = new AuthService();
