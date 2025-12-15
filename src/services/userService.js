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
  
  // Check subscription limits
  async checkSubscriptionLimit(userId, limitType) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        dailyAiMessagesUsed: true,
        dailyPlansGenerated: true
      }
    });
    
    const limits = {
      FREE: { dailyAiMessages: 10, dailyPlans: 1 },
      STARTER: { dailyAiMessages: -1, dailyPlans: -1 },
      PRO: { dailyAiMessages: -1, dailyPlans: -1 },
      ULTIMATE: { dailyAiMessages: -1, dailyPlans: -1 }
    };
    
    const planLimits = limits[user.subscriptionPlan];
    
    if (limitType === 'aiMessages') {
      if (planLimits.dailyAiMessages === -1) return true;
      return user.dailyAiMessagesUsed < planLimits.dailyAiMessages;
    }
    
    if (limitType === 'dailyPlans') {
      if (planLimits.dailyPlans === -1) return true;
      return user.dailyPlansGenerated < planLimits.dailyPlans;
    }
    
    return false;
  }
  
  // Increment usage counter
  async incrementUsage(userId, usageType) {
    const updateData = {};
    
    if (usageType === 'aiMessages') {
      updateData.dailyAiMessagesUsed = { increment: 1 };
    } else if (usageType === 'dailyPlans') {
      updateData.dailyPlansGenerated = { increment: 1 };
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  }
  
  // Delete user
  async deleteUser(userId) {
    await prisma.user.delete({
      where: { id: userId }
    });
  }
}

module.exports = new UserService();
