const authService = require("../services/authService");

exports.register = async (req, res) => {
  try {
    const { email, password, fullName, referralCode } = req.body;

    const result = await authService.register({
      email,
      password,
      fullName,
      referralCode,
    });

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.user,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register user",
      error: error.message,
    });
  }
};

exports.joinWaitlist = async (req, res) => {
  try {
    const { email, fullName, referralCode } = req.body;

    const result = await authService.joinWaitlist({
      email,
      fullName,
      referralCode,
    });

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        email: result.user.email,
        referralCode: result.user.referralCode,
        referralLink: result.referralLink,
      },
    });
  } catch (error) {
    console.error("Join waitlist error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to join waitlist",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Extract IP address and user agent
    const ipAddress =
      req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];
    const userAgent = req.headers["user-agent"];

    const result = await authService.login(
      email,
      password,
      ipAddress,
      userAgent,
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({
      success: false,
      message: error.message || "Failed to login",
    });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    const ipAddress =
      req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];
    const userAgent = req.headers["user-agent"];

    const result = await authService.loginWithGoogle(
      idToken,
      ipAddress,
      userAgent,
    );

    res.status(200).json({
      success: true,
      message: result.isNewUser
        ? "Google signup successful"
        : "Google login successful",
      data: result,
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || "Google login failed",
      ...(process.env.NODE_ENV === "development" && {
        firebaseCode: error.firebaseCode,
        firebaseMessage: error.firebaseMessage,
      }),
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const prisma = require("../config/database");
    const userId = req.user.id;
    const user = req.user;

    const ipAddress =
      req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];
    const userAgent = req.headers["user-agent"];

    // Create activity log for USER_LOGOUT
    await prisma.activityLog.create({
      data: {
        userId: userId,
        type: "USER_LOGOUT",
        description: `User ${user.email} logged out`,
        metadata: {
          email: user.email,
          role: user.role,
          logoutTime: new Date().toISOString(),
        },
        ipAddress,
        userAgent,
      },
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to logout",
      error: error.message,
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const result = await authService.verifyOTP(email, otp);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: result,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to verify OTP",
    });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await authService.resendOTP(email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to resend OTP",
    });
  }
};

exports.verifyEmail = async (req, res) => {
  res.json({ message: "Use POST /auth/verify-otp instead" });
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to process password reset request",
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
      data: result.data,
    });
  } catch (error) {
    console.error("Verify reset OTP error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to verify OTP",
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
        message: "Passwords do not match",
      });
    }

    const result = await authService.setNewPassword(email, password);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Set new password error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to set new password",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const result = await authService.resetPassword(email, otp, password);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to reset password",
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await authService.getProfile(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get profile",
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, address, avatar } = req.body;

    const result = await authService.updateProfile(userId, {
      fullName,
      phone,
      address,
      avatar,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile",
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
      data: result,
    });
  } catch (error) {
    console.error("Get referral stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get referral stats",
    });
  }
};

// Send referral invitation
exports.sendReferralInvitation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await authService.sendReferralInvitation(
      userId,
      email,
      name,
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        invitedEmail: result.invitedEmail,
        referralLink: result.referralLink,
      },
    });
  } catch (error) {
    console.error("Send referral invitation error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to send referral invitation",
    });
  }
};

// Unsubscribe from emails
exports.unsubscribeEmail = async (req, res) => {
  try {
    const { userId } = req.query; // Can be from query param for email links
    const authenticatedUserId = req.user?.id;

    const targetUserId = userId || authenticatedUserId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await authService.unsubscribeEmail(targetUserId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.user,
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to unsubscribe",
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
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }

      // Allow admins to resubscribe any user; allow users to resubscribe themselves via query
      if (
        authUser.role === "ADMIN" ||
        authUser.role === "SUPER_ADMIN" ||
        authUser.id === queryUserId
      ) {
        targetUserId = queryUserId;
      } else {
        return res.status(403).json({
          success: false,
          message: "Not authorized to resubscribe this user",
        });
      }
    } else {
      if (!authUser) {
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }
      targetUserId = authUser.id;
    }

    const result = await authService.resubscribeEmail(targetUserId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.user,
    });
  } catch (error) {
    console.error("Resubscribe error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to resubscribe",
    });
  }
};

exports.getWaitlistCount = async (req, res) => {
  try {
    const count = await authService.getWaitlistCount();

    res.status(200).json({
      success: true,
      data: {
        count,
        message: `${count} people waiting`,
      },
    });
  } catch (error) {
    console.error("Get waitlist count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get waitlist count",
    });
  }
};

// Upgrade trial plan (STARTER → PRO → ULTIMATE)
exports.upgradeTrial = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newPlan } = req.body;

    if (!newPlan) {
      return res.status(400).json({
        success: false,
        message: "newPlan is required. Choose from: STARTER, PRO, or ULTIMATE",
      });
    }

    const result = await authService.upgradeTrial(userId, newPlan);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        trialEndsAt: result.trialEndsAt,
        daysRemaining: result.daysRemaining,
      },
    });
  } catch (error) {
    console.error("Upgrade trial error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to upgrade trial",
    });
  }
};

// Change password for authenticated users
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to change password",
    });
  }
};
