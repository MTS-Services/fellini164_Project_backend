const prisma = require("../config/database");
const { hashPassword, comparePassword } = require("../utils/crypto");
const { generateToken } = require("../utils/jwt");
const emailService = require("./emailService");

class AuthService {
  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate unique referral code
  generateReferralCode(email, fullName) {
    // Create a code based on name/email with random string
    const namepart = (fullName || email)
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 4)
      .toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${namepart}${randomPart}`;
  }

  // Register new user with OTP verification and referral support
  async register(userData) {
    const { email, password, fullName, referralCode } = userData;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    // If referral code provided, validate it
    let referrerUser = null;
    if (referralCode) {
      referrerUser = await prisma.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
      });

      if (!referrerUser) {
        throw new Error("Invalid referral code");
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate unique referral code for new user
    let newUserReferralCode = this.generateReferralCode(email, fullName);
    let codeExists = await prisma.user.findUnique({
      where: { referralCode: newUserReferralCode },
    });

    // Ensure uniqueness
    while (codeExists) {
      newUserReferralCode = this.generateReferralCode(email, fullName);
      codeExists = await prisma.user.findUnique({
        where: { referralCode: newUserReferralCode },
      });
    }

    // If registering via referral link, skip OTP and give 7-day STARTER trial
    if (referralCode && referrerUser) {
      // Calculate trial end date (7 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      // Create user directly verified (no OTP needed)
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          isEmailVerified: true, // Auto-verified for referral signups
          referralCode: newUserReferralCode,
          referredBy: referrerUser.id,
          userStatus: "ACTIVE",
          subscriptionPlan: "STARTER", // Give STARTER plan trial
          subscriptionStatus: "TRIALING", // Trial status
          subscriptionStartDate: new Date(),
          trialEndsAt: trialEndsAt,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          isEmailVerified: true,
          referralCode: true,
          userStatus: true,
          referralCount: true,
        },
      });

      // Create referral tracking record
      await prisma.referral.create({
        data: {
          referrerUserId: referrerUser.id,
          referredUserId: user.id,
          referralCode: referralCode.toUpperCase(),
          rewardAmount: 10,
        },
      });

      // Check if this was from a ReferralInvitation and mark it as registered
      const invitation = await prisma.referralInvitation.findFirst({
        where: {
          invitedEmail: email.toLowerCase(),
          referralCode: referralCode.toUpperCase(),
          isRegistered: false,
        },
      });

      if (invitation) {
        await prisma.referralInvitation.update({
          where: { id: invitation.id },
          data: {
            isRegistered: true,
            registeredUserId: user.id,
            registeredAt: new Date(),
          },
        });
      }

      // Credit referrer immediately (no OTP verification delay)
      await this.creditReferralReward(referrerUser.id, user.id);

      // Create referral link for new user
      const referralLink = `${process.env.FRONTEND_URL || "https://elyxaai.com"}/early-access?ref=${newUserReferralCode}`;

      // Send waitlist welcome email (no OTP)
      await emailService.sendWaitlistWelcomeEmail(
        email,
        fullName || "there",
        password,
        newUserReferralCode,
        referralLink,
      );

      const token = generateToken(user.id);

      // Create activity log for trial started
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          type: "SUBSCRIPTION_STARTED",
          description: `Started 7-day STARTER trial`,
          metadata: {
            plan: "STARTER",
            trialEndsAt: trialEndsAt.toISOString(),
            source: "registration",
          },
        },
      });

      return {
        user,
        token,
        referralLink,
        message:
          "Registration successful! Your 7-day STARTER trial has started. Check your email for your referral link.",
      };
    }

    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + 1 * 60 * 1000); // 1 minute
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        isEmailVerified: false,
        emailVerificationOtp: otp,
        otpExpires,
        referralCode: newUserReferralCode,
        userStatus: "WAITLIST",
        subscriptionPlan: "STARTER",
        subscriptionStatus: "TRIALING",
        trialEndsAt: trialEndsAt,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        isEmailVerified: true,
        referralCode: true,
        userStatus: true,
      },
    });

    await emailService.sendOTPEmail(email, fullName, otp);

    return {
      user,
      message:
        "Registration successful. Please check your email for OTP verification.",
    };
  }

  async joinWaitlist(userData) {
    const { email, fullName, referralCode } = userData;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("This email is already registered");
    }

    let referrerUser = null;
    if (referralCode) {
      referrerUser = await prisma.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
      });

      if (!referrerUser) {
        throw new Error("Invalid referral code");
      }
    }

    const autoPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-4).toUpperCase();

    const hashedPassword = await hashPassword(autoPassword);
 
    let newUserReferralCode = this.generateReferralCode(email, fullName);
    let codeExists = await prisma.user.findUnique({
      where: { referralCode: newUserReferralCode },
    });

    while (codeExists) {
      newUserReferralCode = this.generateReferralCode(email, fullName);
      codeExists = await prisma.user.findUnique({
        where: { referralCode: newUserReferralCode },
      });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: fullName || null,
        isEmailVerified: true,
        referralCode: newUserReferralCode,
        referredBy: referrerUser ? referrerUser.id : null,
        userStatus: "ACTIVE",
        subscriptionPlan: "STARTER",
        subscriptionStatus: "TRIALING",
        subscriptionStartDate: new Date(),
        trialEndsAt: trialEndsAt,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        isEmailVerified: true,
        referralCode: true,
        userStatus: true,
        referralCount: true,
      },
    });

    // Create referral link
    const referralLink = `${process.env.FRONTEND_URL || "https://elyxaai.com"}/early-access?ref=${newUserReferralCode}`;

    if (referrerUser) {
      await prisma.referral.create({
        data: {
          referrerUserId: referrerUser.id,
          referredUserId: user.id,
          referralCode: referralCode.toUpperCase(),
          rewardAmount: 10,
        },
      });

      const invitation = await prisma.referralInvitation.findFirst({
        where: {
          invitedEmail: email.toLowerCase(),
          referralCode: referralCode.toUpperCase(),
          isRegistered: false,
        },
      });

      if (invitation) {
        await prisma.referralInvitation.update({
          where: { id: invitation.id },
          data: {
            isRegistered: true,
            registeredUserId: user.id,
            registeredAt: new Date(),
          },
        });
      }

      await this.creditReferralReward(referrerUser.id, user.id);
    }

    await emailService.sendWaitlistWelcomeEmail(
      email,
      fullName || "there",
      autoPassword,
      newUserReferralCode,
      referralLink,
    );

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        type: "SUBSCRIPTION_STARTED",
        description: `Started 7-day STARTER trial`,
        metadata: {
          plan: "STARTER",
          trialEndsAt: trialEndsAt.toISOString(),
          source: "waitlist",
        },
      },
    });

    return {
      user,
      referralLink,
      message:
        "Registration successful! Your 7-day STARTER trial has started. Check your email for login credentials and referral link.",
    };
  }

  async verifyOTP(email, otp) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isEmailVerified) {
      throw new Error("Email already verified");
    }

    if (!user.emailVerificationOtp || user.emailVerificationOtp !== otp) {
      throw new Error("Invalid OTP");
    }

    if (user.otpExpires && new Date() > user.otpExpires) {
      throw new Error("OTP has expired");
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationOtp: null,
        otpExpires: null,
        userStatus: "ACTIVE",
        subscriptionStartDate: new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        isEmailVerified: true,
        referralCode: true,
        userStatus: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        type: "SUBSCRIPTION_STARTED",
        description: `Started 7-day STARTER trial after email verification`,
        metadata: {
          plan: "STARTER",
          trialEndsAt: user.trialEndsAt ? user.trialEndsAt.toISOString() : null,
          source: "email_verification",
        },
      },
    });

    try {
      const firstName = updatedUser.fullName
        ? updatedUser.fullName.split(" ")[0]
        : "";
      await emailService.sendWaitlistConfirmationEmail(
        updatedUser.email,
        firstName,
        updatedUser.id,
      );
    } catch (emailError) {
      console.error("Failed to send waitlist confirmation email:", emailError);
    }

    if (user.referredBy) {
      try {
        await this.creditReferralReward(user.referredBy, user.id);
      } catch (referralError) {
        console.error("Failed to credit referral reward:", referralError);
      }
    }

    const token = generateToken(updatedUser.id);

    return {
      user: updatedUser,
      token,
    };
  }

  async creditReferralReward(referrerUserId, referredUserId) {
    const rewardAmount = 10;

    const referrer = await prisma.user.update({
      where: { id: referrerUserId },
      data: {
        referralCredits: { increment: rewardAmount },
        referralCount: { increment: 1 },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        referralCredits: true,
        referralCount: true,
      },
    });

    await prisma.referral.updateMany({
      where: {
        referrerUserId: referrerUserId,
        referredUserId: referredUserId,
        rewardCredited: false,
      },
      data: {
        rewardCredited: true,
        creditedAt: new Date(),
      },
    });

    const referredUser = await prisma.user.findUnique({
      where: { id: referredUserId },
      select: { fullName: true },
    });

    try {
      const firstName = referrer.fullName
        ? referrer.fullName.split(" ")[0]
        : "";
      const referredName = referredUser?.fullName || "Someone";
      await emailService.sendReferralRewardEmail(
        referrer.email,
        firstName,
        rewardAmount,
        referredName,
      );
    } catch (emailError) {
      console.error("Failed to send referral reward email:", emailError);
    }

    return referrer;
  }

  async resendOTP(email) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isEmailVerified) {
      throw new Error("Email already verified");
    }

    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + 1 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationOtp: otp,
        otpExpires,
      },
    });

    // Resend OTP email
    await emailService.sendOTPEmail(email, user.fullName, otp);

    return {
      message: "OTP resent successfully. Please check your email.",
    };
  }

  // Login user
  async login(email, password, ipAddress = null, userAgent = null) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error(
        "Email not found. Please check your email address or register first",
      );
    }

    if (
      !user.isEmailVerified &&
      user.role !== "ADMIN" &&
      user.role !== "SUPER_ADMIN"
    ) {
      throw new Error("Please verify your email before logging in");
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Incorrect password. Please try again");
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create activity log for USER_LOGIN
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        type: "USER_LOGIN",
        description: `User ${user.email} logged in`,
        metadata: {
          email: user.email,
          role: user.role,
          loginTime: new Date().toISOString(),
        },
        ipAddress,
        userAgent,
      },
    });

    const token = generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        isEmailVerified: user.isEmailVerified,
      },
      token,
    };
  }

  // Verify email
  async verifyEmail(token) {
    throw new Error("Not implemented");
  }

  async forgotPassword(email) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found with this email");
    }

    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: otp,
        passwordResetExpires: otpExpires,
      },
    });

    await emailService.sendPasswordResetOTP(email, user.fullName, otp);

    return {
      message:
        "Password reset OTP sent to your email. Please check your inbox.",
    };
  }

  async verifyResetOTP(email, otp) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if OTP exists
    if (!user.passwordResetToken) {
      throw new Error(
        "No password reset request found. Please request a new OTP.",
      );
    }

    // Verify OTP
    if (user.passwordResetToken !== otp) {
      throw new Error("Invalid OTP");
    }

    if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
      throw new Error("OTP has expired. Please request a new one.");
    }

    return {
      message: "OTP verified successfully. You can now set your new password.",
      data: {
        email: user.email,
        otpVerified: true,
      },
    };
  }

  async setNewPassword(email, newPassword) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.passwordResetToken) {
      throw new Error(
        "Please verify your OTP first using /verify-reset-otp endpoint",
      );
    }

    if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
      throw new Error(
        "OTP verification has expired. Please request a new OTP.",
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return {
      message:
        "Password reset successful. You can now login with your new password.",
    };
  }

  async resetPassword(email, otp, newPassword) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if OTP exists
    if (!user.passwordResetToken) {
      throw new Error(
        "No password reset request found. Please request a new OTP.",
      );
    }

    // Verify OTP
    if (user.passwordResetToken !== otp) {
      throw new Error("Invalid OTP");
    }

    // Check if OTP expired
    if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
      throw new Error("OTP has expired. Please request a new one.");
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return {
      message:
        "Password reset successful. You can now login with your new password.",
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
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async updateProfile(userId, data) {
    const { fullName, phone, address, avatar } = data;

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
        updatedAt: true,
      },
    });

    return user;
  }

  async getReferralStats(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referralCount: true,
        referralCredits: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const referrals = await prisma.referral.findMany({
      where: { referrerUserId: userId },
      orderBy: { createdAt: "desc" },
    });

    const referredUsers = await prisma.user.findMany({
      where: {
        id: { in: referrals.map((r) => r.referredUserId) },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
      },
    });

    return {
      referralCode: user.referralCode,
      totalReferrals: user.referralCount,
      totalCredits: user.referralCredits,
      referralLink: `${process.env.FRONTEND_URL || "https://elyxa.com"}/early-access?ref=${user.referralCode}`,
      referrals: referrals.map((ref) => {
        const referredUser = referredUsers.find(
          (u) => u.id === ref.referredUserId,
        );
        return {
          id: ref.id,
          userName: referredUser?.fullName || "Unknown",
          userEmail: referredUser?.email || "",
          joinedAt: ref.createdAt,
          rewardCredited: ref.rewardCredited,
          rewardAmount: ref.rewardAmount,
        };
      }),
    };
  }

  // Unsubscribe from emails
  async unsubscribeEmail(userId) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isUnsubscribed: true,
        unsubscribedAt: new Date(),
        userStatus: "UNSUBSCRIBED",
      },
      select: {
        id: true,
        email: true,
        isUnsubscribed: true,
        userStatus: true,
      },
    });

    return {
      message: "Successfully unsubscribed from emails",
      user,
    };
  }

  // Resubscribe to emails
  async resubscribeEmail(userId) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isUnsubscribed: false,
        unsubscribedAt: null,
        userStatus: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        isUnsubscribed: true,
        userStatus: true,
      },
    });

    return {
      message: "Successfully resubscribed to emails",
      user,
    };
  }

  // Get waitlist count for social proof
  async getWaitlistCount() {
    const count = await prisma.user.count({
      where: {
        userStatus: "WAITLIST",
        isEmailVerified: true,
      },
    });

    return count;
  }

  // Send referral invitation email
  async sendReferralInvitation(userId, inviteeEmail, inviteeName) {
    const referrer = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        referralCode: true,
      },
    });

    if (!referrer) {
      throw new Error("User not found");
    }

    if (!referrer.referralCode) {
      throw new Error("Referral code not found for this user");
    }

    const existingInvitation = await prisma.referralInvitation.findFirst({
      where: {
        referrerUserId: userId,
        invitedEmail: inviteeEmail.toLowerCase(),
      },
    });

    if (existingInvitation) {
      if (existingInvitation.isRegistered) {
        throw new Error(
          "This email has already registered using your referral link",
        );
      }
      // Update existing invitation
      await prisma.referralInvitation.update({
        where: { id: existingInvitation.id },
        data: { sentAt: new Date() },
      });
    } else {
      await prisma.referralInvitation.create({
        data: {
          referrerUserId: userId,
          invitedEmail: inviteeEmail.toLowerCase(),
          referralCode: referrer.referralCode,
        },
      });
    }

    const referralLink = `${process.env.FRONTEND_URL || "https://elyxaai.com"}/early-access?ref=${referrer.referralCode}`;
    await emailService.sendEarlyAccessInvitationEmail(
      inviteeEmail,
      inviteeName || "there",
      referrer.fullName || "A friend",
      referrer.referralCode,
    );

    return {
      message: "Referral invitation sent successfully",
      invitedEmail: inviteeEmail,
      referralLink,
    };
  }

  async upgradeTrial(userId, newPlan) {
    const validPlans = ["STARTER", "PRO", "ULTIMATE"];
    if (!validPlans.includes(newPlan.toUpperCase())) {
      throw new Error("Invalid plan. Choose from: STARTER, PRO, or ULTIMATE");
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is on trial
    if (user.subscriptionStatus !== "TRIALING") {
      throw new Error(
        "Trial upgrade is only available during trial period. Please upgrade to a paid plan instead.",
      );
    }

    // Check if trial has expired
    if (user.trialEndsAt && new Date(user.trialEndsAt) < new Date()) {
      throw new Error("Your trial has expired. Please upgrade to a paid plan.");
    }

    if (user.subscriptionPlan === newPlan.toUpperCase()) {
      throw new Error(`You are already on the ${newPlan} plan`);
    }

    const oldPlan = user.subscriptionPlan;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: newPlan.toUpperCase(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionStartDate: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: userId,
        type: "SUBSCRIPTION_UPGRADED",
        description: `Upgraded trial from ${oldPlan} to ${newPlan}`,
        metadata: {
          oldPlan: oldPlan,
          newPlan: newPlan.toUpperCase(),
          trialEndsAt: user.trialEndsAt ? user.trialEndsAt.toISOString() : null,
          upgradeType: "trial_upgrade",
        },
      },
    });

    // Calculate days remaining
    const daysRemaining = user.trialEndsAt
      ? Math.ceil(
          (new Date(user.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24),
        )
      : 0;

    return {
      user: updatedUser,
      message: `Successfully upgraded to ${newPlan} trial! You have ${daysRemaining} days remaining to explore all features.`,
      trialEndsAt: user.trialEndsAt,
      daysRemaining: daysRemaining,
    };
  }

  // Change password for authenticated users
  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    if (currentPassword === newPassword) {
      throw new Error("New password must be different from current password");
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: userId,
        type: "PASSWORD_CHANGED",
        description: "User changed their password",
        metadata: {
          changedAt: new Date().toISOString(),
          changeType: "user_initiated",
        },
      },
    });

    return {
      message: "Password changed successfully",
    };
  }
}

module.exports = new AuthService();
