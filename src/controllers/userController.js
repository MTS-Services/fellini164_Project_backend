const prisma = require('../config/database');


exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
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
        settings: true,
        createdAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
};


exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, avatar } = req.body;
    
    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        avatar
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};


exports.getUserSettings = async (req, res) => {
  try {
    const { id } = req.params;
    
    let settings = await prisma.userSettings.findUnique({
      where: { userId: id }
    });
    
    // Create default settings if not exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId: id }
      });
    }
    
    res.status(200).json({
      success: true,
      data: settings
    });
    
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings',
      error: error.message
    });
  }
};


exports.updateUserSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const settings = await prisma.userSettings.upsert({
      where: { userId: id },
      update: updateData,
      create: {
        userId: id,
        ...updateData
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
    
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};


exports.deleteUser = async (req, res) => {
  res.json({ message: 'Delete user - TODO' });
};

// Send referral invitation
exports.sendReferralInvitation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, firstName } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const userService = require('../services/userService');
    const emailService = require('../services/emailService');
    
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, email: true, fullName: true }
    });
    
    // Create invitation record
    const invitation = await userService.sendReferralInvitation(userId, email);
    
    // Use provided firstName or extract from email
    const inviteeFirstName = firstName || email.split('@')[0];
    const referrerName = user.fullName || user.email.split('@')[0];
    
    // Send early access invitation email
    await emailService.sendEarlyAccessInvitationEmail(
      email, 
      inviteeFirstName, 
      referrerName,
      user.referralCode
    );

    res.status(201).json({
      success: true,
      message: 'Referral invitation sent successfully',
      data: {
        ...invitation,
        invitedName: inviteeFirstName,
        referralLink: `${process.env.FRONTEND_URL || 'https://elyxaai.com'}/early-access?ref=${user.referralCode}`
      }
    });

  } catch (error) {
    console.error('Send referral invitation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send referral invitation'
    });
  }
};

// Get referral invitations
exports.getReferralInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userService = require('../services/userService');
    
    const invitations = await userService.getReferralInvitations(userId);

    res.status(200).json({
      success: true,
      data: invitations
    });

  } catch (error) {
    console.error('Get referral invitations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral invitations',
      error: error.message
    });
  }
};

// Get users who registered using referral code
exports.getReferredUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const userService = require('../services/userService');
    
    const referredUsers = await userService.getReferredUsers(userId);

    res.status(200).json({
      success: true,
      data: referredUsers
    });

  } catch (error) {
    console.error('Get referred users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referred users',
      error: error.message
    });
  }
};

// Get referral statistics
exports.getReferralStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userService = require('../services/userService');
    
    const stats = await userService.getReferralStats(userId);

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral statistics',
      error: error.message
    });
  }
};

// Get complete referral dashboard
exports.getReferralDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const userService = require('../services/userService');
    
    const dashboard = await userService.getReferralDashboard(userId);

    res.status(200).json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    console.error('Get referral dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral dashboard',
      error: error.message
    });
  }
};

// Get user's referral link
exports.getMyReferralLink = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        referralCode: true, 
        email: true, 
        fullName: true,
        referralCount: true,
        referralCredits: true
      }
    });

    if (!user.referralCode) {
      return res.status(404).json({
        success: false,
        message: 'No referral code found for this user'
      });
    }

    const referralLink = `${process.env.FRONTEND_URL || 'https://elyxaai.com'}/early-access?ref=${user.referralCode}`;

    res.status(200).json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralLink: referralLink,
        totalReferrals: user.referralCount,
        totalCredits: user.referralCredits
      }
    });

  } catch (error) {
    console.error('Get referral link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral link',
      error: error.message
    });
  }
};

// Send referral link to user's own email
exports.emailMyReferralLink = async (req, res) => {
  try {
    const userId = req.user.id;
    const emailService = require('../services/emailService');
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        referralCode: true, 
        email: true, 
        fullName: true
      }
    });

    if (!user.referralCode) {
      return res.status(404).json({
        success: false,
        message: 'No referral code found for this user'
      });
    }

    const firstName = user.fullName ? user.fullName.split(' ')[0] : user.email.split('@')[0];
    
    // Send referral link email
    await emailService.sendReferralLinkEmail(
      user.email,
      firstName,
      user.referralCode
    );

    res.status(200).json({
      success: true,
      message: 'Referral link sent to your email'
    });

  } catch (error) {
    console.error('Email referral link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send referral link email',
      error: error.message
    });
  }
};

// Get user's own activity logs
exports.getMyActivityLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5000, offset = 0, type } = req.query;
    
    
    const where = { userId };
    if (type) {
      where.type = type;
    }
    
    
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.activityLog.count({ where })
    ]);
    
    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + logs.length < total
      }
    });
    
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    });
  }
};
