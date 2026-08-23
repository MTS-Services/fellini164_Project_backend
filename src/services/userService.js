const prisma = require('../config/database');

class UserService {
  // Get user by ID
  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        onboardingCompleted: true,
        referralCode: true,
        settings: true,
        createdAt: true
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  // Update user profile
  async updateUser(userId, updateData) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true
      }
    });
    
    return user;
  }
  
  // Get user settings
  async getUserSettings(userId) {
    let settings = await prisma.userSettings.findUnique({
      where: { userId }
    });
    
    // Create default settings if not exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId }
      });
    }
    
    return settings;
  }
  
  // Update user settings
  async updateUserSettings(userId, updateData) {
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData
      }
    });
    
    return settings;
  }
  
  // Check subscription limits (delegates to planFeatureService)
  async checkSubscriptionLimit(userId, limitType) {
    const planFeatureService = require("./planFeatureService");

    if (limitType === "aiMessages") {
      try {
        await planFeatureService.assertAiMessageAllowed(userId);
        return true;
      } catch {
        return false;
      }
    }

    if (limitType === "dailyPlans") {
      const { user, limits } = await planFeatureService.getUserContext(userId);
      if (limits.dailyPlans === -1) return true;
      return user.dailyPlansGenerated < limits.dailyPlans;
    }

    return false;
  }

  // Increment usage counter
  async incrementUsage(userId, usageType) {
    const planFeatureService = require("./planFeatureService");

    if (usageType === "aiMessages") {
      await planFeatureService.consumeAiMessage(userId);
      return;
    }

    if (usageType === "dailyPlans") {
      await planFeatureService.consumeDailyPlan(userId);
    }
  }
  
  async deleteUser(userId) {
    await prisma.user.delete({
      where: { id: userId }
    });
  }

  async sendReferralInvitation(userId, invitedEmail) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, email: true, fullName: true }
    });

    if (!user.referralCode) {
      throw new Error('User does not have a referral code');
    }

    // Check if invitation already sent to this email
    const existingInvitation = await prisma.referralInvitation.findFirst({
      where: {
        referrerUserId: userId,
        invitedEmail: invitedEmail
      }
    });

    if (existingInvitation) {
      throw new Error('Invitation already sent to this email');
    }

    // Create referral invitation record
    const invitation = await prisma.referralInvitation.create({
      data: {
        referrerUserId: userId,
        invitedEmail: invitedEmail,
        referralCode: user.referralCode
      }
    });

    return invitation;
  }

  async getReferralInvitations(userId) {
    const invitations = await prisma.referralInvitation.findMany({
      where: { referrerUserId: userId },
      orderBy: { sentAt: 'desc' },
      select: {
        id: true,
        invitedEmail: true,
        referralCode: true,
        isRegistered: true,
        registeredUserId: true,
        sentAt: true,
        registeredAt: true
      }
    });

    return invitations;
  }

  // Get users who registered using this user's referral code
  async getReferredUsers(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true }
    });

    if (!user.referralCode) {
      return [];
    }

    // Get all users who used this referral code
    const referredUsers = await prisma.user.findMany({
      where: { referredBy: user.referralCode },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatar: true,
        subscriptionPlan: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return referredUsers;
  }

  async getReferralStats(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referralCount: true,
        referralCredits: true
      }
    });

    if (!user.referralCode) {
      return {
        referralCode: null,
        totalInvitationsSent: 0,
        totalRegistrations: 0,
        pendingInvitations: 0,
        referralCredits: 0,
        referredUsers: []
      };
    }

    const [
      totalInvitations,
      registeredInvitations,
      referredUsers
    ] = await Promise.all([
      prisma.referralInvitation.count({
        where: { referrerUserId: userId }
      }),
      prisma.referralInvitation.count({
        where: {
          referrerUserId: userId,
          isRegistered: true
        }
      }),
      this.getReferredUsers(userId)
    ]);

    return {
      referralCode: user.referralCode,
      totalInvitationsSent: totalInvitations,
      totalRegistrations: user.referralCount,
      pendingInvitations: totalInvitations - registeredInvitations,
      referralCredits: user.referralCredits,
      referredUsers: referredUsers
    };
  }

  // Get detailed referral dashboard data
  async getReferralDashboard(userId) {
    const [stats, invitations, referredUsers] = await Promise.all([
      this.getReferralStats(userId),
      this.getReferralInvitations(userId),
      this.getReferredUsers(userId)
    ]);

    return {
      stats,
      invitations,
      referredUsers
    };
  }
}

module.exports = new UserService();
