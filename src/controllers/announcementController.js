const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const notificationPreferenceService = require("../services/notificationPreferenceService");

const excludeOptedOut = async (targetUsers, preference) => {
  const allowedIds = await notificationPreferenceService.filterAllowedUserIds(
    (targetUsers || []).map((user) => user.id),
    preference,
  );
  const allowed = new Set(allowedIds);
  return (targetUsers || []).filter((user) => allowed.has(user.id));
};

// Create and send announcementaaa
exports.createAnnouncement = async (req, res) => {
  try {
    const adminId = req.user.id;
    const {
      title,
      message,
      type,
      targetType,
      targetPlans,
      scheduledAt,
      isPinned,
      expiresAt,
    } = req.body;

    // Validate admin role
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }
// scheduledAt is the time the announcement will be sent
    const scheduledTime = scheduledAt ? new Date(scheduledAt) : null;
    const now = new Date();
    const isScheduled = scheduledTime && scheduledTime > now;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        type: type || "INFO",
        targetType: targetType || "ALL_USERS",
        targetPlans: targetPlans || [],
        status: isScheduled ? "DRAFT" : "SENT",
        createdBy: adminId,
        scheduledAt: scheduledTime,
        sentAt: isScheduled ? null : new Date(),
        isPinned: isPinned || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
    });

    console.log("[createAnnouncement] Announcement created:", announcement.id);
    console.log("[createAnnouncement] Target type:", targetType || "ALL_USERS");
    console.log("[createAnnouncement] Is scheduled:", isScheduled);

    let targetUsers = [];

    switch (targetType || "ALL_USERS") {
      case "ALL_USERS":
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: "ACTIVE",
            role: "USER",
          },
          select: { id: true },
        });
        break;

      case "EVERYONE":
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: "ACTIVE",
          },
          select: { id: true },
        });
        break;

      case "ALL_INCLUDING_WAITLIST":
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: {
              in: ["ACTIVE", "WAITLIST", "INVITED"],
            },
          },
          select: { id: true },
        });
        break;

      case "FREE_USERS":
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: "ACTIVE",
            role: "USER",
            subscriptionPlan: "FREE",
          },
          select: { id: true },
        });
        break;

      case "PAID_USERS":
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: "ACTIVE",
            role: "USER",
            subscriptionPlan: {
              in: ["STARTER", "PRO", "ULTIMATE"],
            },
          },
          select: { id: true },
        });
        break;

      case "SPECIFIC_PLAN":
        if (!targetPlans || targetPlans.length === 0) {
          return res.status(400).json({
            success: false,
            message:
              "Target plans must be specified for SPECIFIC_PLAN target type",
          });
        }
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: "ACTIVE",
            role: "USER",
            subscriptionPlan: {
              in: targetPlans,
            },
          },
          select: { id: true },
        });
        break;

      default:
        targetUsers = await prisma.user.findMany({
          where: {
            userStatus: "ACTIVE",
            role: "USER",
          },
          select: { id: true },
        });
    }

    targetUsers = await excludeOptedOut(targetUsers, "productUpdates");

    console.log("[createAnnouncement] Found target users:", targetUsers.length);
    console.log(
      "[createAnnouncement] Sample user IDs:",
      targetUsers.slice(0, 3).map((u) => u.id),
    );

    let recipientsCount = 0;

    if (!isScheduled && targetUsers.length > 0) {
      console.log("[createAnnouncement] Creating notifications immediately...");

      const userNotifications = targetUsers.map((user) => ({
        userId: user.id,
        announcementId: announcement.id,
        isRead: false,
      }));

      await prisma.userNotification.createMany({
        data: userNotifications,
        skipDuplicates: true,
      });

      recipientsCount = targetUsers.length;
      console.log(
        "[createAnnouncement] Created",
        recipientsCount,
        "notifications",
      );
    } else {
      console.log(
        "[createAnnouncement] Skipping notification creation. isScheduled:",
        isScheduled,
        "targetUsers:",
        targetUsers.length,
      );
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
        isScheduled,
      },
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create announcement",
      error: error.message,
    });
  }
};

exports.getAdminAnnouncements = async (req, res) => {
  try {
    // Validate admin role
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const { page = 1, limit = 2000, status, type } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              userNotifications: true,
            },
          },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    const announcementsWithStats = await Promise.all(
      announcements.map(async (announcement) => {
        const readCount = await prisma.userNotification.count({
          where: {
            announcementId: announcement.id,
            isRead: true,
          },
        });

        return {
          ...announcement,
          recipientsCount: announcement._count.userNotifications,
          readCount,
          readPercentage:
            announcement._count.userNotifications > 0
              ? (
                  (readCount / announcement._count.userNotifications) *
                  100
                ).toFixed(2)
              : 0,
        };
      }),
    );

    res.json({
      success: true,
      data: {
        announcements: announcementsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
      error: error.message,
    });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate admin role
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Delete announcement (will cascade delete user notifications)
    await prisma.announcement.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete announcement",
      error: error.message,
    });
  }
};

const ANNOUNCEMENT_TYPES = [
  "INFO",
  "UPDATE",
  "FEATURE",
  "MAINTENANCE",
  "PROMOTION",
];

exports.getUserAnnouncements = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 2000, unreadOnly = false, type } = req.query;
    const skip = (page - 1) * limit;

    if (type && !ANNOUNCEMENT_TYPES.includes(String(type).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Valid values: ${ANNOUNCEMENT_TYPES.join(", ")}`,
      });
    }

    console.log("[getUserAnnouncements] User ID:", userId);

    // Check user's status
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true, userStatus: true },
    });
    console.log("[getUserAnnouncements] User info:", userInfo);

    const where = {
      userId,
    };

    if (unreadOnly === "true") {
      where.isRead = false;
    }

    if (type) {
      where.announcement = {
        type: String(type).toUpperCase(),
      };
    }

    console.log("[getUserAnnouncements] Where clause:", where);

    // Get user notifications with announcement details
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.userNotification.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
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
              expiresAt: true,
            },
          },
        },
      }),
      prisma.userNotification.count({ where }),
      prisma.userNotification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

    console.log(
      "[getUserAnnouncements] Found notifications:",
      notifications.length,
    );
    console.log("[getUserAnnouncements] Total count:", total);
    console.log("[getUserAnnouncements] Unread count:", unreadCount);

    const now = new Date();
    const validNotifications = notifications.filter((notification) => {
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
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user announcements:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
      error: error.message,
    });
  }
};

exports.markAnnouncementAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await prisma.userNotification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const updatedNotification = await prisma.userNotification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        announcement: true,
      },
    });

    res.json({
      success: true,
      message: "Announcement marked as read",
      data: updatedNotification,
    });
  } catch (error) {
    console.error("Error marking announcement as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark announcement as read",
      error: error.message,
    });
  }
};

/**
 * Delete the current user's own announcement notification.
 * Removes UserNotification only — does not delete the admin Announcement.
 * :id accepts announcementId (preferred) or notification id.
 */
exports.deleteUserAnnouncement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await prisma.userNotification.findFirst({
      where: {
        userId,
        OR: [{ announcementId: id }, { id }],
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Announcement notification not found",
      });
    }

    await prisma.userNotification.delete({
      where: { id: notification.id },
    });

    res.json({
      success: true,
      message: "Announcement notification deleted successfully",
      data: {
        id: notification.id,
        announcementId: notification.announcementId,
      },
    });
  } catch (error) {
    console.error("Error deleting user announcement notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete announcement notification",
      error: error.message,
    });
  }
};

exports.markAllAnnouncementsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await prisma.userNotification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Marked ${result.count} announcements as read`,
      data: {
        count: result.count,
      },
    });
  } catch (error) {
    console.error("Error marking all announcements as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark announcements as read",
      error: error.message,
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.userNotification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count",
      error: error.message,
    });
  }
};

exports.processScheduledAnnouncements = async () => {
  try {
    const now = new Date();

    const scheduledAnnouncements = await prisma.announcement.findMany({
      where: {
        status: "DRAFT",
        scheduledAt: {
          lte: now,
        },
        isActive: true,
      },
    });

    //console.log(`[Scheduler] Found ${scheduledAnnouncements.length} announcements to send`);

    for (const announcement of scheduledAnnouncements) {
      try {
        let targetUsers = [];

        switch (announcement.targetType) {
          case "ALL_USERS":
            targetUsers = await prisma.user.findMany({
              where: { userStatus: "ACTIVE", role: "USER" },
              select: { id: true },
            });
            break;

          case "EVERYONE":
            targetUsers = await prisma.user.findMany({
              where: { userStatus: "ACTIVE" },
              select: { id: true },
            });
            break;

          case "ALL_INCLUDING_WAITLIST":
            targetUsers = await prisma.user.findMany({
              where: {
                userStatus: { in: ["ACTIVE", "WAITLIST", "INVITED"] },
              },
              select: { id: true },
            });
            break;

          case "FREE_USERS":
            targetUsers = await prisma.user.findMany({
              where: {
                userStatus: "ACTIVE",
                role: "USER",
                subscriptionPlan: "FREE",
              },
              select: { id: true },
            });
            break;

          case "PAID_USERS":
            targetUsers = await prisma.user.findMany({
              where: {
                userStatus: "ACTIVE",
                role: "USER",
                subscriptionPlan: { in: ["STARTER", "PRO", "ULTIMATE"] },
              },
              select: { id: true },
            });
            break;

          case "SPECIFIC_PLAN":
            targetUsers = await prisma.user.findMany({
              where: {
                userStatus: "ACTIVE",
                role: "USER",
                subscriptionPlan: { in: announcement.targetPlans },
              },
              select: { id: true },
            });
            break;

          default:
            targetUsers = await prisma.user.findMany({
              where: { userStatus: "ACTIVE", role: "USER" },
              select: { id: true },
            });
        }

        targetUsers = await excludeOptedOut(targetUsers, "productUpdates");

        if (targetUsers.length > 0) {
          const userNotifications = targetUsers.map((user) => ({
            userId: user.id,
            announcementId: announcement.id,
            isRead: false,
          }));

          await prisma.userNotification.createMany({
            data: userNotifications,
            skipDuplicates: true,
          });
        }

        await prisma.announcement.update({
          where: { id: announcement.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });

        console.log(
          `[Scheduler] Sent announcement "${announcement.title}" to ${targetUsers.length} users`,
        );
      } catch (error) {
        console.error(
          `[Scheduler] Error processing announcement ${announcement.id}:`,
          error,
        );
      }
    }

    return {
      success: true,
      processedCount: scheduledAnnouncements.length,
    };
  } catch (error) {
    console.error(
      "[Scheduler] Error processing scheduled announcements:",
      error,
    );
    return {
      success: false,
      error: error.message,
    };
  }
};
