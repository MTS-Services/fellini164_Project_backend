const prisma = require('../config/database');


exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        createdAt: true,
        lastLogin: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
};


exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeSubscribers,
      totalRevenue,
      newUsersToday
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          subscriptionPlan: { not: 'FREE' },
          subscriptionStatus: 'ACTIVE'
        }
      }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeSubscribers,
        totalRevenue: totalRevenue._sum.amount || 0,
        newUsersToday
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message
    });
  }
};


exports.updateUserSubscription = async (req, res) => {
  res.json({ message: 'Update user subscription - TODO' });
};


exports.getAnnouncements = async (req, res) => {
  res.json({ message: 'Get announcements - TODO' });
};


exports.createAnnouncement = async (req, res) => {
  res.json({ message: 'Create announcement - TODO' });
};


exports.getPricingSettings = async (req, res) => {
  res.json({ message: 'Get pricing - TODO' });
};


exports.updatePricing = async (req, res) => {
  res.json({ message: 'Update pricing - TODO' });
};
