const prisma = require('../config/database');


exports.getAllUsers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    
    // Build where clause
    const where = {
      role: 'USER'
    };
    
    // Filter by userStatus if provided
    if (status) {
      where.userStatus = status.toUpperCase();
    }
    
    // Search by email or name if provided
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const totalCount = await prisma.user.count({ where });
    
    // Get users with filters
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        address: true,
        role: true,
        userStatus: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        isEmailVerified: true,
        isUnsubscribed: true,
        referralCode: true,
        referralCount: true,
        referralCredits: true,
        createdAt: true,
        lastLogin: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      count: users.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
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
      newUsersToday,
      usersByStatus
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
      }),
      // Get count by user status
      prisma.user.groupBy({
        by: ['userStatus'],
        _count: true
      })
    ]);
    
    // Format status counts
    const statusCounts = {
      WAITLIST: 0,
      INVITED: 0,
      ACTIVE: 0,
      UNSUBSCRIBED: 0
    };
    
    usersByStatus.forEach(item => {
      statusCounts[item.userStatus] = item._count;
    });

    // Fetch small lists of users per status for preview (limit to 10 each)
    const [waitlistUsers, invitedUsers, activeUsers, unsubscribedUsers] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'USER', userStatus: 'WAITLIST' },
        select: { id: true, email: true, fullName: true, referralCode: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1000
      }),
      prisma.user.findMany({
        where: { role: 'USER', userStatus: 'INVITED' },
        select: { id: true, email: true, fullName: true, referralCode: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1000
      }),
      prisma.user.findMany({
        where: { role: 'USER', userStatus: 'ACTIVE' },
        select: { id: true, email: true, fullName: true, referralCode: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1000
      }),
      prisma.user.findMany({
        where: { role: 'USER', userStatus: 'UNSUBSCRIBED' },
        select: { id: true, email: true, fullName: true, referralCode: true, unsubscribedAt: true, createdAt: true },
        orderBy: { unsubscribedAt: 'desc' },
        take: 1000
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeSubscribers,
        totalRevenue: totalRevenue._sum.amount || 0,
        newUsersToday,
        usersByStatus: statusCounts,
        usersByStatusLists: {
          WAITLIST: waitlistUsers,
          INVITED: invitedUsers,
          ACTIVE: activeUsers,
          UNSUBSCRIBED: unsubscribedUsers
        }
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


// Get specific user details
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        address: true,
        avatar: true,
        role: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        trialEndsAt: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true
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
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
};

// Update user information
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, address, role, subscriptionPlan, subscriptionStatus } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (role !== undefined) updateData.role = role;
    if (subscriptionPlan !== undefined) updateData.subscriptionPlan = subscriptionPlan;
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        address: true,
        role: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        updatedAt: true
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// Get all payment history
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get payments',
      error: error.message
    });
  }
};

// Get user payment history
exports.getUserPayments = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payments = await prisma.payment.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' }
    });
    
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user payments',
      error: error.message
    });
  }
};

// Get revenue statistics
exports.getRevenue = async (req, res) => {
  try {
    const { period } = req.query; // day, week, month, year, all
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'day':
        dateFilter = {
          gte: new Date(now.setHours(0, 0, 0, 0))
        };
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        dateFilter = { gte: weekStart };
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { gte: monthStart };
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        dateFilter = { gte: yearStart };
        break;
      default:
        dateFilter = {}; // all time
    }
    
    const whereClause = {
      status: 'COMPLETED',
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
    };
    
    const [totalRevenue, paymentCount, revenueByPlan] = await Promise.all([
      prisma.payment.aggregate({
        where: whereClause,
        _sum: { amount: true }
      }),
      prisma.payment.count({
        where: whereClause
      }),
      prisma.payment.groupBy({
        by: ['plan'],
        where: whereClause,
        _sum: { amount: true },
        _count: true
      })
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue._sum.amount || 0,
        paymentCount,
        revenueByPlan,
        period: period || 'all'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue',
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
