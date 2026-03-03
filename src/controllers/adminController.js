const prisma = require('../config/database');


exports.getAllUsers = async (req, res) => {
  try {
    const { status, search, page, limit } = req.query;

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

    // Get total count
    const totalCount = await prisma.user.count({ where });

    // Build query options
    const queryOptions = {
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
      orderBy: { createdAt: 'desc' }
    };

    // Apply pagination only if limit is provided
    if (limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit);
      queryOptions.skip = (pageNum - 1) * limitNum;
      queryOptions.take = limitNum;
    }

    // Get users with filters
    const users = await prisma.user.findMany(queryOptions);

    const response = {
      success: true,
      count: users.length,
      total: totalCount,
      data: users
    };

    if (limit) {
      response.page = parseInt(page) || 1;
      response.totalPages = Math.ceil(totalCount / parseInt(limit));
    }

    res.status(200).json(response);
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
    const { status, plan, provider, startDate, endDate, page = 1, limit = 100 } = req.query;

    const where = {};
    if (status) {
      where.status = status.toUpperCase();
    }
    if (plan) {
      where.plan = plan.toUpperCase();
    }
    if (provider) {
      where.provider = provider.toUpperCase();
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;

    const totalCount = await prisma.payment.count({ where });

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            subscriptionPlan: true,
            subscriptionStatus: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parsedLimit
    });

    // Calculate summary statistics
    const summary = await prisma.payment.groupBy({
      by: ['status'],
      where: Object.keys(where).length > 0 ? where : undefined,
      _count: true,
      _sum: { amount: true }
    });

    res.status(200).json({
      success: true,
      count: payments.length,
      total: totalCount,
      page: parsedPage,
      totalPages: Math.ceil(totalCount / parsedLimit),
      summary: summary.map(s => ({
        status: s.status,
        count: s._count,
        totalAmount: s._sum.amount || 0
      })),
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
    const { period } = req.query;

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
        dateFilter = {};
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
  try {
    const { id } = req.params;
    const {
      subscriptionPlan,
      subscriptionStatus,
      subscriptionEndDate,
      reason // audit trail
    } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updateData = {};

    if (subscriptionPlan) {
      updateData.subscriptionPlan = subscriptionPlan.toUpperCase();

      // If upgrading from FREE, set start date
      if (user.subscriptionPlan === 'FREE' && subscriptionPlan !== 'FREE') {
        updateData.subscriptionStartDate = new Date();
        updateData.subscriptionStatus = 'ACTIVE';
      }

      // If downgrading to FREE, clear subscription data
      if (subscriptionPlan === 'FREE') {
        updateData.subscriptionStatus = 'CANCELED';
        updateData.subscriptionEndDate = new Date();
      }
    }

    if (subscriptionStatus) {
      updateData.subscriptionStatus = subscriptionStatus.toUpperCase();
    }

    if (subscriptionEndDate) {
      updateData.subscriptionEndDate = new Date(subscriptionEndDate);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });

    await prisma.adminAction.create({
      data: {
        adminId: req.user.id,
        action: 'SUBSCRIPTION_CHANGED',
        targetUserId: id,
        details: {
          from: {
            plan: user.subscriptionPlan,
            status: user.subscriptionStatus
          },
          to: {
            plan: updatedUser.subscriptionPlan,
            status: updatedUser.subscriptionStatus
          },
          reason
        }
      }
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: updatedUser
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.getAnnouncements = async (req, res) => {
  res.json({ message: 'Get announcements - TODO' });
};


exports.createAnnouncement = async (req, res) => {
  res.json({ message: 'Create announcement - TODO' });
};


exports.getPricingSettings = async (req, res) => {
  try {
    const pricing = await prisma.pricingConfig.findMany({
      orderBy: { plan: 'asc' }
    });

    res.json({ success: true, data: pricing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.updatePricing = async (req, res) => {
  try {
    const { plan } = req.params;
    const {
      monthlyPrice,
      yearlyPrice,
      stripePriceIdMonthly,
      stripePriceIdYearly,
      features,
      limits
    } = req.body;

    const updateData = {
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    if (monthlyPrice !== undefined) updateData.monthlyPrice = monthlyPrice;
    if (yearlyPrice !== undefined) updateData.yearlyPrice = yearlyPrice;
    if (stripePriceIdMonthly !== undefined) updateData.stripePriceIdMonthly = stripePriceIdMonthly;
    if (stripePriceIdYearly !== undefined) updateData.stripePriceIdYearly = stripePriceIdYearly;
    if (features !== undefined) updateData.features = features;
    if (limits !== undefined) updateData.limits = limits;

    const updated = await prisma.pricingConfig.update({
      where: { plan: plan.toUpperCase() },
      data: updateData
    });

    // Create audit log
    await prisma.adminAction.create({
      data: {
        adminId: req.user.id,
        action: 'PRICING_UPDATED',
        details: {
          plan: plan.toUpperCase(),
          changes: { monthlyPrice, yearlyPrice, stripePriceIdMonthly, stripePriceIdYearly, features, limits }
        }
      }
    });

    res.json({ success: true, message: 'Pricing updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.getWaitlistUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 5000 } = req.query;

    // Build where clause for WAITLIST users
    const where = {
      role: 'USER',
      userStatus: 'WAITLIST'
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const totalCount = await prisma.user.count({ where });

    // Get waitlist users with filters
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        userStatus: true,
        isEmailVerified: true,
        referralCode: true,
        referralCount: true,
        referredBy: true,
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
      message: 'Failed to get waitlist users',
      error: error.message
    });
  }
};

// Get subscribers with filtering
exports.getSubscribers = async (req, res) => {
  try {
    const { status, plan, provider, page = 1, limit = 50 } = req.query;

    const where = {
      role: 'USER',
      subscriptionPlan: { not: 'FREE' }
    };

    if (status) {
      where.subscriptionStatus = status.toUpperCase();
    }

    if (plan) {
      where.subscriptionPlan = plan.toUpperCase(); // STARTER, PRO, ULTIMATE
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await prisma.user.count({ where });

    const subscribers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        stripeCustomerId: true,
        paypalSubscriptionId: true,
        createdAt: true
      },
      orderBy: { subscriptionStartDate: 'desc' },
      skip,
      take: parseInt(limit)
    });

    // Get statistics
    const stats = await prisma.user.groupBy({
      by: ['subscriptionStatus', 'subscriptionPlan'],
      where: {
        role: 'USER',
        subscriptionPlan: { not: 'FREE' }
      },
      _count: true
    });

    res.json({
      success: true,
      count: subscribers.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      stats,
      data: subscribers
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all plans with statistics
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await prisma.pricingConfig.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' }
    });

    // Get user counts per plan
    const userCounts = await prisma.user.groupBy({
      by: ['subscriptionPlan'],
      _count: true
    });

    const plansWithStats = plans.map(plan => ({
      ...plan,
      subscriberCount: userCounts.find(u => u.subscriptionPlan === plan.plan)?._count || 0
    }));

    res.json({ success: true, data: plansWithStats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new plan
exports.createPlan = async (req, res) => {
  try {
    const { plan, monthlyPrice, yearlyPrice, features, limits } = req.body;

    const newPlan = await prisma.pricingConfig.create({
      data: {
        plan: plan.toUpperCase(),
        monthlyPrice,
        yearlyPrice,
        features,
        limits,
        updatedBy: req.user.id
      }
    });

    // Create audit log
    await prisma.adminAction.create({
      data: {
        adminId: req.user.id,
        action: 'PLAN_CREATED',
        details: {
          plan: plan.toUpperCase(),
          monthlyPrice,
          yearlyPrice
        }
      }
    });

    res.status(201).json({ success: true, message: 'Plan created', data: newPlan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update existing plan
exports.updatePlan = async (req, res) => {
  try {
    const { plan } = req.params;
    const { monthlyPrice, yearlyPrice, features, limits, isActive } = req.body;

    const updateData = {
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    if (monthlyPrice !== undefined) updateData.monthlyPrice = monthlyPrice;
    if (yearlyPrice !== undefined) updateData.yearlyPrice = yearlyPrice;
    if (features !== undefined) updateData.features = features;
    if (limits !== undefined) updateData.limits = limits;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.pricingConfig.update({
      where: { plan: plan.toUpperCase() },
      data: updateData
    });

    // Create audit log
    await prisma.adminAction.create({
      data: {
        adminId: req.user.id,
        action: 'PLAN_UPDATED',
        details: {
          plan: plan.toUpperCase(),
          changes: updateData
        }
      }
    });

    res.json({ success: true, message: 'Plan updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Deactivate plan
exports.deactivatePlan = async (req, res) => {
  try {
    const { plan } = req.params;

    const updated = await prisma.pricingConfig.update({
      where: { plan: plan.toUpperCase() },
      data: {
        isActive: false,
        updatedBy: req.user.id,
        updatedAt: new Date()
      }
    });

    // Create audit log
    await prisma.adminAction.create({
      data: {
        adminId: req.user.id,
        action: 'PLAN_DEACTIVATED',
        details: {
          plan: plan.toUpperCase()
        }
      }
    });

    res.json({ success: true, message: 'Plan deactivated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all activity logs (admin)
exports.getAllActivityLogs = async (req, res) => {
  try {
    const { limit = 8000, page = 1, type, userId, startDate, endDate } = req.query;

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;

    // Valid activity types
    const validTypes = [
      'USER_LOGIN', 'USER_LOGOUT', 'PLAN_CREATED', 'PLAN_UPDATED', 'PLAN_COMPLETED',
      'HABIT_CREATED', 'HABIT_COMPLETED', 'TASK_CREATED', 'TASK_COMPLETED',
      'GOAL_CREATED', 'GOAL_COMPLETED', 'SUBSCRIPTION_STARTED', 'SUBSCRIPTION_CANCELED',
      'SUBSCRIPTION_UPGRADED', 'SUBSCRIPTION_DOWNGRADED', 'PAYMENT_SUCCEEDED',
      'PAYMENT_FAILED', 'AI_CHAT', 'AI_RECOMMENDATION', 'SETTINGS_UPDATED',
      'PASSWORD_CHANGED', 'EMAIL_VERIFIED'
    ];

    // Build where clause
    const where = {};

    if (type) {
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid activity type. Valid types are: ${validTypes.join(', ')}`
        });
      }
      where.type = type;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Fetch activity logs with pagination
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parsedLimit,
        skip: skip
      }),
      prisma.activityLog.count({ where })
    ]);

    // Group activity logs by user
    const groupedByUser = {};
    logs.forEach(log => {
      const userId = log.userId;

      if (!groupedByUser[userId]) {
        groupedByUser[userId] = {
          user: {
            id: log.user.id,
            email: log.user.email,
            fullName: log.user.fullName,
            role: log.user.role
          },
          activityLogs: []
        };
      }

      // Add log without the user object (to avoid duplication)
      groupedByUser[userId].activityLogs.push({
        id: log.id,
        type: log.type,
        description: log.description,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt
      });
    });

    // Convert to array
    const groupedData = Object.values(groupedByUser);

    const totalPages = Math.ceil(total / parsedLimit);

    res.status(200).json({
      success: true,
      data: groupedData,
      pagination: {
        total,
        limit: parsedLimit,
        page: parsedPage,
        totalPages,
        hasMore: parsedPage < totalPages
      }
    });

  } catch (error) {
    console.error('Get all activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    });
  }
};

// Get activity logs for a specific user (admin)
exports.getUserActivityLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5000, page = 1, type, startDate, endDate } = req.query;

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;

    // Valid activity types
    const validTypes = [
      'USER_LOGIN', 'USER_LOGOUT', 'PLAN_CREATED', 'PLAN_UPDATED', 'PLAN_COMPLETED',
      'HABIT_CREATED', 'HABIT_COMPLETED', 'TASK_CREATED', 'TASK_COMPLETED',
      'GOAL_CREATED', 'GOAL_COMPLETED', 'SUBSCRIPTION_STARTED', 'SUBSCRIPTION_CANCELED',
      'SUBSCRIPTION_UPGRADED', 'SUBSCRIPTION_DOWNGRADED', 'PAYMENT_SUCCEEDED',
      'PAYMENT_FAILED', 'AI_CHAT', 'AI_RECOMMENDATION', 'SETTINGS_UPDATED',
      'PASSWORD_CHANGED', 'EMAIL_VERIFIED'
    ];

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const where = { userId };

    if (type) {
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid activity type. Valid types are: ${validTypes.join(', ')}`
        });
      }
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }


    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parsedLimit,
        skip: skip
      }),
      prisma.activityLog.count({ where })
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName
      },
      data: logs,
      pagination: {
        total,
        limit: parsedLimit,
        page: parsedPage,
        totalPages,
        hasMore: parsedPage < totalPages
      }
    });

  } catch (error) {
    console.error('Get user activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity logs',
      error: error.message
    });
  }
};
