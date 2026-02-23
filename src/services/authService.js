const prisma = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/crypto');
const { generateToken } = require('../utils/jwt');
const emailService = require('./emailService');

class AuthService {
  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate unique referral code
  generateReferralCode(email, fullName) {
    // Create a code based on name/email with random string
    const namepart = (fullName || email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${namepart}${randomPart}`;
  }

  // Register new user with OTP verification and referral support
  async register(userData) {
    const { email, password, fullName, referralCode } = userData;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // If referral code provided, validate it
    let referrerUser = null;
    if (referralCode) {
      referrerUser = await prisma.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() }
      });

      if (!referrerUser) {
        throw new Error('Invalid referral code');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate unique referral code for new user
    let newUserReferralCode = this.generateReferralCode(email, fullName);
    let codeExists = await prisma.user.findUnique({
      where: { referralCode: newUserReferralCode }
    });

    // Ensure uniqueness
    while (codeExists) {
      newUserReferralCode = this.generateReferralCode(email, fullName);
      codeExists = await prisma.user.findUnique({
        where: { referralCode: newUserReferralCode }
      });
    }

    // If registering via referral link, skip OTP and go straight to WAITLIST
    if (referralCode && referrerUser) {
      // Create user directly verified (no OTP needed)
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          isEmailVerified: true, // Auto-verified for referral signups
          referralCode: newUserReferralCode,
          referredBy: referrerUser.id,
          userStatus: 'WAITLIST'
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          subscriptionPlan: true,
          isEmailVerified: true,
          referralCode: true,
          userStatus: true,
          referralCount: true
        }
      });

      // Create referral tracking record
      await prisma.referral.create({
        data: {
          referrerUserId: referrerUser.id,
          referredUserId: user.id,
          referralCode: referralCode.toUpperCase(),
          rewardAmount: 10
        }
      });

      // Check if this was from a ReferralInvitation and mark it as registered
      const invitation = await prisma.referralInvitation.findFirst({
        where: {
          invitedEmail: email.toLowerCase(),
          referralCode: referralCode.toUpperCase(),
          isRegistered: false
        }
      });

      if (invitation) {
        await prisma.referralInvitation.update({
          where: { id: invitation.id },
          data: {
            isRegistered: true,
            registeredUserId: user.id,
            registeredAt: new Date()
          }
        });
      }

      // Credit referrer immediately (no OTP verification delay)
      await this.creditReferralReward(referrerUser.id, user.id);

      // Create referral link for new user
      const referralLink = `${process.env.FRONTEND_URL || 'https://elyxaai.com'}/early-access?ref=${newUserReferralCode}`;

      // Send waitlist welcome email (no OTP)
      await emailService.sendWaitlistWelcomeEmail(
        email,
        fullName || 'there',
        password,
        newUserReferralCode,
        referralLink
      );


      const token = generateToken(user.id);

      return {
        user,
        token,
        referralLink,
        message: 'Registration successful! Welcome to the waitlist. Check your email for your referral link.'
      };
    }

    // Normal registration without referral - requires OTP verification
    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create user (not verified yet)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        isEmailVerified: false,
        emailVerificationOtp: otp,
        otpExpires,
        referralCode: newUserReferralCode,
        userStatus: 'WAITLIST'
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
        isEmailVerified: true,
        referralCode: true,
        userStatus: true
      }
    });

    // Send OTP email
    await emailService.sendOTPEmail(email, fullName, otp);

    return {
      user,
      message: 'Registration successful. Please check your email for OTP verification.'
    };
  }

  // Join Waitlist - Simplified registration with auto-generated password
  async joinWaitlist(userData) {
    const { email, fullName, referralCode } = userData;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('This email is already registered');
    }

    // If referral code provided, validate it and find referrer
    let referrerUser = null;
    if (referralCode) {
      referrerUser = await prisma.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() }
      });

      if (!referrerUser) {
        throw new Error('Invalid referral code');
      }
    }

    // Generate random password (12 characters: letters + numbers)
    const autoPassword = Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-4).toUpperCase();

    // Hash password
    const hashedPassword = await hashPassword(autoPassword);

    // Generate unique referral code for new user
    let newUserReferralCode = this.generateReferralCode(email, fullName);
    let codeExists = await prisma.user.findUnique({
      where: { referralCode: newUserReferralCode }
    });

    // Ensure uniqueness
    while (codeExists) {
      newUserReferralCode = this.generateReferralCode(email, fullName);
      codeExists = await prisma.user.findUnique({
        where: { referralCode: newUserReferralCode }
      });
    }

    // Create user on waitlist (no OTP needed, directly active)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: fullName || null,
        isEmailVerified: true, // Auto-verified for waitlist
        referralCode: newUserReferralCode,
        referredBy: referrerUser ? referrerUser.id : null,
        userStatus: 'WAITLIST'
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
        isEmailVerified: true,
        referralCode: true,
        userStatus: true,
        referralCount: true
      }
    });

    // Create referral link
    const referralLink = `${process.env.FRONTEND_URL || 'https://elyxaai.com'}/early-access?ref=${newUserReferralCode}`;

    // If referred by someone, create referral tracking and update referrer
    if (referrerUser) {
      // Create referral record
      await prisma.referral.create({
        data: {
          referrerUserId: referrerUser.id,
          referredUserId: user.id,
          referralCode: referralCode.toUpperCase(),
          rewardAmount: 10 // Default reward amount
        }
      });

      // Check if this was from a ReferralInvitation and mark it as registered
      const invitation = await prisma.referralInvitation.findFirst({
        where: {
          invitedEmail: email.toLowerCase(),
          referralCode: referralCode.toUpperCase(),
          isRegistered: false
        }
      });

      if (invitation) {
        await prisma.referralInvitation.update({
          where: { id: invitation.id },
          data: {
            isRegistered: true,
            registeredUserId: user.id,
            registeredAt: new Date()
          }
        });
      }

      // Credit referrer immediately since no OTP verification needed
      await this.creditReferralReward(referrerUser.id, user.id);
    }

    // Send welcome email with password and referral link
    await emailService.sendWaitlistWelcomeEmail(
      email,
      fullName || 'there',
      autoPassword,
      newUserReferralCode,
      referralLink
    );

    return {
      user,
      referralLink,
      message: 'Successfully joined waitlist! Check your email for login credentials and referral link.'
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

    // Verify user - keep WAITLIST status
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationOtp: null,
        otpExpires: null,
        userStatus: 'WAITLIST'
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
        isEmailVerified: true,
        referralCode: true,
        userStatus: true
      }
    });

    // Send waitlist confirmation email
    try {
      const firstName = updatedUser.fullName ? updatedUser.fullName.split(' ')[0] : '';
      await emailService.sendWaitlistConfirmationEmail(updatedUser.email, firstName, updatedUser.id);
    } catch (emailError) {
      console.error('Failed to send waitlist confirmation email:', emailError);
      // Don't fail verification if email fails
    }

    // If user was referred, credit the referrer
    if (user.referredBy) {
      try {
        await this.creditReferralReward(user.referredBy, user.id);
      } catch (referralError) {
        console.error('Failed to credit referral reward:', referralError);
      }
    }

    // Generate token after verification
    const token = generateToken(updatedUser.id);

    return {
      user: updatedUser,
      token
    };
  }

  // Credit referral reward to referrer
  async creditReferralReward(referrerUserId, referredUserId) {
    const rewardAmount = 10; // 10 credits per referral

    // Update referrer's credits and count
    const referrer = await prisma.user.update({
      where: { id: referrerUserId },
      data: {
        referralCredits: { increment: rewardAmount },
        referralCount: { increment: 1 }
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        referralCredits: true,
        referralCount: true
      }
    });

    // Update referral tracking record
    await prisma.referral.updateMany({
      where: {
        referrerUserId: referrerUserId,
        referredUserId: referredUserId,
        rewardCredited: false
      },
      data: {
        rewardCredited: true,
        creditedAt: new Date()
      }
    });

    // Get referred user info
    const referredUser = await prisma.user.findUnique({
      where: { id: referredUserId },
      select: { fullName: true }
    });

    // Send reward email to referrer
    try {
      const firstName = referrer.fullName ? referrer.fullName.split(' ')[0] : '';
      const referredName = referredUser?.fullName || 'Someone';
      await emailService.sendReferralRewardEmail(
        referrer.email,
        firstName,
        rewardAmount,
        referredName
      );
    } catch (emailError) {
      console.error('Failed to send referral reward email:', emailError);
    }

    return referrer;
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
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

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
      throw new Error('Email not found. Please check your email address or register first');
    }

    // Check if email is verified (skip for admin)
    if (!user.isEmailVerified && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new Error('Please verify your email before logging in');
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Incorrect password. Please try again');
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
        role: user.role,
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

  // Request password reset - Send OTP
  async forgotPassword(email) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('User not found with this email');
    }

    // Generate OTP
    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: otp,
        passwordResetExpires: otpExpires
      }
    });

    // Send OTP email
    await emailService.sendPasswordResetOTP(email, user.fullName, otp);

    return {
      message: 'Password reset OTP sent to your email. Please check your inbox.'
    };
  }

  // Verify OTP only (Step 2: Check if OTP is valid)
  async verifyResetOTP(email, otp) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if OTP exists
    if (!user.passwordResetToken) {
      throw new Error('No password reset request found. Please request a new OTP.');
    }

    // Verify OTP
    if (user.passwordResetToken !== otp) {
      throw new Error('Invalid OTP');
    }

    // Check if OTP expired
    if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
      throw new Error('OTP has expired. Please request a new one.');
    }

    return {
      message: 'OTP verified successfully. You can now set your new password.',
      data: {
        email: user.email,
        otpVerified: true
      }
    };
  }

  // Set new password (Step 3: After OTP verification)
  async setNewPassword(email, newPassword) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if OTP was verified (must still exist and not expired)
    if (!user.passwordResetToken) {
      throw new Error('Please verify your OTP first using /verify-reset-otp endpoint');
    }

    // Check if OTP expired
    if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
      throw new Error('OTP verification has expired. Please request a new OTP.');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    return {
      message: 'Password reset successful. You can now login with your new password.'
    };
  }

  // Verify OTP and reset password (all-in-one - kept for backward compatibility)
  async resetPassword(email, otp, newPassword) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if OTP exists
    if (!user.passwordResetToken) {
      throw new Error('No password reset request found. Please request a new OTP.');
    }

    // Verify OTP
    if (user.passwordResetToken !== otp) {
      throw new Error('Invalid OTP');
    }

    // Check if OTP expired
    if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
      throw new Error('OTP has expired. Please request a new one.');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    return {
      message: 'Password reset successful. You can now login with your new password.'
    };
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

  // Get referral stats
  async getReferralStats(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referralCount: true,
        referralCredits: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get list of referrals
    const referrals = await prisma.referral.findMany({
      where: { referrerUserId: userId },
      orderBy: { createdAt: 'desc' }
    });

    // Get referred users details
    const referredUsers = await prisma.user.findMany({
      where: {
        id: { in: referrals.map(r => r.referredUserId) }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true
      }
    });

    return {
      referralCode: user.referralCode,
      totalReferrals: user.referralCount,
      totalCredits: user.referralCredits,
      referralLink: `${process.env.FRONTEND_URL || 'https://elyxa.com'}/early-access?ref=${user.referralCode}`,
      referrals: referrals.map(ref => {
        const referredUser = referredUsers.find(u => u.id === ref.referredUserId);
        return {
          id: ref.id,
          userName: referredUser?.fullName || 'Unknown',
          userEmail: referredUser?.email || '',
          joinedAt: ref.createdAt,
          rewardCredited: ref.rewardCredited,
          rewardAmount: ref.rewardAmount
        };
      })
    };
  }

  // Unsubscribe from emails
  async unsubscribeEmail(userId) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isUnsubscribed: true,
        unsubscribedAt: new Date(),
        userStatus: 'UNSUBSCRIBED'
      },
      select: {
        id: true,
        email: true,
        isUnsubscribed: true,
        userStatus: true
      }
    });

    return {
      message: 'Successfully unsubscribed from emails',
      user
    };
  }

  // Resubscribe to emails
  async resubscribeEmail(userId) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isUnsubscribed: false,
        unsubscribedAt: null,
        userStatus: 'ACTIVE'
      },
      select: {
        id: true,
        email: true,
        isUnsubscribed: true,
        userStatus: true
      }
    });

    return {
      message: 'Successfully resubscribed to emails',
      user
    };
  }

  // Get waitlist count for social proof
  async getWaitlistCount() {
    const count = await prisma.user.count({
      where: {
        userStatus: 'WAITLIST',
        isEmailVerified: true
      }
    });

    return count;
  }

  // Send referral invitation email
  async sendReferralInvitation(userId, inviteeEmail, inviteeName) {
    // Get referrer user
    const referrer = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        referralCode: true
      }
    });

    if (!referrer) {
      throw new Error('User not found');
    }

    if (!referrer.referralCode) {
      throw new Error('Referral code not found for this user');
    }

    // Check if already invited
    const existingInvitation = await prisma.referralInvitation.findFirst({
      where: {
        referrerUserId: userId,
        invitedEmail: inviteeEmail.toLowerCase()
      }
    });

    if (existingInvitation) {
      if (existingInvitation.isRegistered) {
        throw new Error('This email has already registered using your referral link');
      }
      // Update existing invitation
      await prisma.referralInvitation.update({
        where: { id: existingInvitation.id },
        data: { sentAt: new Date() }
      });
    } else {
      // Create new invitation
      await prisma.referralInvitation.create({
        data: {
          referrerUserId: userId,
          invitedEmail: inviteeEmail.toLowerCase(),
          referralCode: referrer.referralCode
        }
      });
    }

    // Send invitation email
    const referralLink = `${process.env.FRONTEND_URL || 'https://elyxaai.com'}/early-access?ref=${referrer.referralCode}`;
    await emailService.sendEarlyAccessInvitationEmail(
      inviteeEmail,
      inviteeName || 'there',
      referrer.fullName || 'A friend',
      referrer.referralCode
    );

    return {
      message: 'Referral invitation sent successfully',
      invitedEmail: inviteeEmail,
      referralLink
    };
  }
}

module.exports = new AuthService();
