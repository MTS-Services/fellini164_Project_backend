const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Admin Controllers
 */

// Create and send announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { title, message, type, targetType, targetPlans, scheduledAt, isPinned, expiresAt } = req.body;

    // Validate admin role
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Check if this is a scheduled announcement
    const scheduledTime = scheduledAt ? new Date(scheduledAt) : null;
    const now = new Date();
    const isScheduled = scheduledTime && scheduledTime > now;

    // Create announcement
    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        type: type || 'INFO',
        targetType: targetType || 'ALL_USERS',
        targetPlans: targetPlans || [],
        status: isScheduled ? 'DRAFT' : 'SENT',
        createdBy: adminId,
        scheduledAt: scheduledTime,
        sentAt: isScheduled ? null : new Date(),
        isPinned: isPinned || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true
      }
    });

    console.log('[createAnnouncement] Announcement created:', announcement.id);
    console.log('[createAnnouncement] Target type:', targetType || 'ALL_USERS');
    console.log('[createAnnouncement] Is scheduled:', isScheduled);

    // Find target users based on targetType
    let targetUsers = [];

    switch (targetType || 'ALL_USERS') {
      case 'ALL_USERS':
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: 'ACTIVE',
            role: 'USER'
          },
          select: { id: true }
        });
        break;

      case 'EVERYONE':
        // Include admins and users
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: 'ACTIVE'
          },
          select: { id: true }
        });
        break;

      case 'ALL_INCLUDING_WAITLIST':
        // For testing - include waitlist users too
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: {
              in: ['ACTIVE', 'WAITLIST', 'INVITED']
            }
          },
          select: { id: true }
        });
        break;

      case 'FREE_USERS':
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: 'ACTIVE',
            role: 'USER',
            subscriptionPlan: 'FREE'
          },
          select: { id: true }
        });
        break;

      case 'PAID_USERS':
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: 'ACTIVE',
            role: 'USER',
            subscriptionPlan: {
              in: ['STARTER', 'PRO', 'ULTIMATE']
            }
          },
          select: { id: true }
        });
        break;

      case 'SPECIFIC_PLAN':
        if (!targetPlans || targetPlans.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Target plans must be specified for SPECIFIC_PLAN target type'
          });
        }
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: 'ACTIVE',
            role: 'USER',
            subscriptionPlan: {
              in: targetPlans
            }
          },
          select: { id: true }
        });
        break;

      default:
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: 'ACTIVE',
            role: 'USER'
          },
          select: { id: true }
        });
    }

    console.log('[createAnnouncement] Found target users:', targetUsers.length);
    console.log('[createAnnouncement] Sample user IDs:', targetUsers.slice(0, 3).map(u => u.id));

    // Create user notifications only if not scheduled (send immediately)
    // For scheduled announcements, notifications will be created when the scheduler runs
    let recipientsCount = 0;

    if (!isScheduled && targetUsers.length > 0) {
      console.log('[createAnnouncement] Creating notifications immediately...');

      const userNotifications = targetUsers.map(user => ({
        userId: user.id,
        announcementId: announcement.id,
        isRead: false
      }));

      await prisma.userNotification.createMany({
        data: userNotifications,
        skipDuplicates: true
      });

      recipientsCount = targetUsers.length;
      console.log('[createAnnouncement] Created', recipientsCount, 'notifications');
    } else {
      console.log('[createAnnouncement] Skipping notification creation. isScheduled:', isScheduled, 'targetUsers:', targetUsers.length);
    }

    res.status(201).json({
      success: true,
      message: isScheduled
        ? `Announcement scheduled for ${scheduledTime.toISOString()}. Will be sent to ${targetUsers.length} users.`
        : `Announcement created and sent to ${targetUsers.length} users`,
      data: {
        announcement,
        recipientsCount: isScheduled ? 0 : recipientsCount,
        scheduledRecipients: isScheduled ? targetUsers.length : 0,
        isScheduled
      }
    });

  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
      error: error.message
    });
  }
};

// Get all announcements (Admin)
exports.getAdminAnnouncements = async (req, res) => {
  try {
    // Validate admin role
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { page = 1, limit = 2000, status, type } = req.query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              userNotifications: true
            }
          }
        }
      }),
      prisma.announcement.count({ where })
    ]);

    // Get read statistics for each announcement
    const announcementsWithStats = await Promise.all(
      announcements.map(async (announcement) => {
        const readCount = await prisma.userNotification.count({
          where: {
            announcementId: announcement.id,
            isRead: true
          }
        });

        return {
          ...announcement,
          recipientsCount: announcement._count.userNotifications,
          readCount,
          readPercentage: announcement._count.userNotifications > 0
            ? ((readCount / announcement._count.userNotifications) * 100).toFixed(2)
            : 0
        };
      })
    );

    res.json({
      success: true,
      data: {
        announcements: announcementsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
      error: error.message
    });
  }
};

// Delete announcement (Admin)
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate admin role
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Check if announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Delete announcement (will cascade delete user notifications)
    await prisma.announcement.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement',
      error: error.message
    });
  }
};

/**
 * User Controllers
 */

// Get user announcements
exports.getUserAnnouncements = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 2000, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;

    console.log('[getUserAnnouncements] User ID:', userId);

    // Check user's status
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true, userStatus: true }
    });
    console.log('[getUserAnnouncements] User info:', userInfo);

    // Build where clause
    const where = {
      userId,
    };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    console.log('[getUserAnnouncements] Where clause:', where);

    // Get user notifications with announcement details
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.userNotification.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          announcement: {
            select: {
              id: true,
              title: true,
              message: true,
              type: true,
              isPinned: true,
              createdAt: true,
              sentAt: true,
              expiresAt: true
            }
          }
        }
      }),
      prisma.userNotification.count({ where }),
      prisma.userNotification.count({
        where: {
          userId,
          isRead: false
        }
      })
    ]);

    console.log('[getUserAnnouncements] Found notifications:', notifications.length);
    console.log('[getUserAnnouncements] Total count:', total);
    console.log('[getUserAnnouncements] Unread count:', unreadCount);

    // Filter out expired announcements
    const now = new Date();
    const validNotifications = notifications.filter(notification => {
      if (notification.announcement.expiresAt) {
        return new Date(notification.announcement.expiresAt) > now;
      }
      return true;
    });

    // Sort by pinned first, then by date
    const sortedNotifications = validNotifications.sort((a, b) => {
      if (a.announcement.isPinned && !b.announcement.isPinned) return -1;
      if (!a.announcement.isPinned && b.announcement.isPinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      data: {
        notifications: sortedNotifications,
        unreadCount,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
      error: error.message
    });
  }
};

// Mark announcement as read
exports.markAnnouncementAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Find the notification
    const notification = await prisma.userNotification.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Update notification as read
    const updatedNotification = await prisma.userNotification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      },
      include: {
        announcement: true
      }
    });

    res.json({
      success: true,
      message: 'Announcement marked as read',
      data: updatedNotification
    });

  } catch (error) {
    console.error('Error marking announcement as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark announcement as read',
      error: error.message
    });
  }
};

// Mark all announcements as read
exports.markAllAnnouncementsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await prisma.userNotification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `Marked ${result.count} announcements as read`,
      data: {
        count: result.count
      }
    });

  } catch (error) {
    console.error('Error marking all announcements as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark announcements as read',
      error: error.message
    });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.userNotification.count({
      where: {
        userId,
        isRead: false
      }
    });

    res.json({
      success: true,
      data: {
        unreadCount: count
      }
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
};

/**
 * Scheduler Function - Process scheduled announcements
 * This should be called by a cron job every minute
 */
exports.processScheduledAnnouncements = async () => {
  try {
    const now = new Date();

    // Find all scheduled announcements that are ready to be sent
    const scheduledAnnouncements = await prisma.announcement.findMany({
      where: {
        status: 'DRAFT',
        scheduledAt: {
          lte: now // scheduled time is less than or equal to now
        },
        isActive: true
      }
    });

    //console.log(`[Scheduler] Found ${scheduledAnnouncements.length} announcements to send`);

    for (const announcement of scheduledAnnouncements) {
      try {
        // Find target users based on targetType
        let targetUsers = [];

        switch (announcement.targetType) {
          case 'ALL_USERS':
            targetUsers = await prisma.user.findMany({
              where: { userStatus: 'ACTIVE', role: 'USER' },
              select: { id: true }
            });
            break;

          case 'EVERYONE':
            targetUsers = await prisma.user.findMany({
              where: { userStatus: 'ACTIVE' },
              select: { id: true }
            });
            break;

          case 'ALL_INCLUDING_WAITLIST':
            targetUsers = await prisma.user.findMany({
              where: {
                userStatus: { in: ['ACTIVE', 'WAITLIST', 'INVITED'] }
              },
              select: { id: true }
            });
            break;

          case 'FREE_USERS':
            targetUsers = await prisma.user.findMany({
              where: {
                userStatus: 'ACTIVE',
                role: 'USER',
                subscriptionPlan: 'FREE'
              },
              select: { id: true }
            });
            break;

          case 'PAID_USERS':
            targetUsers = await prisma.user.findMany({
              where: {
                userStatus: 'ACTIVE',
                role: 'USER',
                subscriptionPlan: { in: ['STARTER', 'PRO', 'ULTIMATE'] }
              },
              select: { id: true }
            });
            break;

          case 'SPECIFIC_PLAN':
            targetUsers = await prisma.user.findMany({
              where: {
                userStatus: 'ACTIVE',
                role: 'USER',
                subscriptionPlan: { in: announcement.targetPlans }
              },
              select: { id: true }
            });
            break;

          default:
            targetUsers = await prisma.user.findMany({
              where: { userStatus: 'ACTIVE', role: 'USER' },
              select: { id: true }
            });
        }

        // Create user notifications
        if (targetUsers.length > 0) {
          const userNotifications = targetUsers.map(user => ({
            userId: user.id,
            announcementId: announcement.id,
            isRead: false
          }));

          await prisma.userNotification.createMany({
            data: userNotifications,
            skipDuplicates: true
          });
        }

        // Update announcement status to SENT
        await prisma.announcement.update({
          where: { id: announcement.id },
          data: {
            status: 'SENT',
            sentAt: new Date()
          }
        });

        console.log(`[Scheduler] Sent announcement "${announcement.title}" to ${targetUsers.length} users`);

      } catch (error) {
        console.error(`[Scheduler] Error processing announcement ${announcement.id}:`, error);
      }
    }

    return {
      success: true,
      processedCount: scheduledAnnouncements.length
    };

  } catch (error) {
    console.error('[Scheduler] Error processing scheduled announcements:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

