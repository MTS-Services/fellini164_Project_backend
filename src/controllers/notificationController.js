const prisma = require('../config/database');

class NotificationController {

    // ==================== GET NOTIFICATIONS ====================

    // Get all notifications for user
    async getAllNotifications(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const status = req.query.status; // 'READ', 'PENDING', 'SENT'
            const type = req.query.type;

            const where = { userId };
            if (status) where.status = status;
            if (type) where.type = type;

            const notifications = await prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            });

            const total = await prisma.notification.count({ where });

            res.json({
                success: true,
                count: notifications.length,
                total,
                notifications
            });
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications',
                error: error.message
            });
        }
    }

    // Get unread notifications count
    async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;

            const count = await prisma.notification.count({
                where: {
                    userId,
                    status: { in: ['PENDING', 'SENT'] },
                    readAt: null
                }
            });

            res.json({
                success: true,
                unreadCount: count
            });
        } catch (error) {
            console.error('Get unread count error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get unread count',
                error: error.message
            });
        }
    }

    // ==================== MARK AS READ ====================

    // Mark notification as read
    async markAsRead(req, res) {
        try {
            const userId = req.user.id;
            const notificationId = req.params.id;

            const notification = await prisma.notification.findFirst({
                where: { id: notificationId, userId }
            });

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            const updated = await prisma.notification.update({
                where: { id: notificationId },
                data: {
                    status: 'READ',
                    readAt: new Date()
                }
            });

            res.json({
                success: true,
                message: 'Notification marked as read',
                notification: updated
            });
        } catch (error) {
            console.error('Mark as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read',
                error: error.message
            });
        }
    }

    // Mark all notifications as read
    async markAllAsRead(req, res) {
        try {
            const userId = req.user.id;

            const result = await prisma.notification.updateMany({
                where: {
                    userId,
                    readAt: null
                },
                data: {
                    status: 'READ',
                    readAt: new Date()
                }
            });

            res.json({
                success: true,
                message: 'All notifications marked as read',
                count: result.count
            });
        } catch (error) {
            console.error('Mark all as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark all notifications as read',
                error: error.message
            });
        }
    }

    // ==================== DELETE NOTIFICATION ====================

    // Delete notification
    async deleteNotification(req, res) {
        try {
            const userId = req.user.id;
            const notificationId = req.params.id;

            const notification = await prisma.notification.findFirst({
                where: { id: notificationId, userId }
            });

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            await prisma.notification.delete({
                where: { id: notificationId }
            });

            res.json({
                success: true,
                message: 'Notification deleted'
            });
        } catch (error) {
            console.error('Delete notification error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete notification',
                error: error.message
            });
        }
    }

    // Delete all read notifications
    async deleteAllRead(req, res) {
        try {
            const userId = req.user.id;

            const result = await prisma.notification.deleteMany({
                where: {
                    userId,
                    status: 'READ',
                    readAt: { not: null }
                }
            });

            res.json({
                success: true,
                message: 'All read notifications deleted',
                count: result.count
            });
        } catch (error) {
            console.error('Delete all read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete read notifications',
                error: error.message
            });
        }
    }


    // Get notification settings
    async getSettings(req, res) {
        try {
            const userId = req.user.id;

            // Use upsert to get existing settings or create defaults if they don't exist
            const settings = await prisma.userSettings.upsert({
                where: { userId },
                update: {}, // Don't update anything if it exists
                create: {
                    userId,
                    enableEmailReminders: true,
                    enablePushReminders: false,
                    reminderFrequency: 'DAILY',
                    morningReminderTime: '08:00',
                    eveningReminderTime: '20:00'
                },
                select: {
                    id: true,
                    userId: true,
                    enableEmailReminders: true,
                    enablePushReminders: true,
                    reminderFrequency: true,
                    morningReminderTime: true,
                    eveningReminderTime: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            console.error('Get notification settings error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get notification settings',
                error: error.message
            });
        }
    }

    // Update notification settings
    async updateSettings(req, res) {
        try {
            const userId = req.user.id;
            const {
                enableEmailReminders,
                enablePushReminders,
                reminderFrequency,
                morningReminderTime,
                eveningReminderTime
            } = req.body;

            const updateData = {};
            if (enableEmailReminders !== undefined) updateData.enableEmailReminders = enableEmailReminders;
            if (enablePushReminders !== undefined) updateData.enablePushReminders = enablePushReminders;
            if (reminderFrequency) updateData.reminderFrequency = reminderFrequency;
            if (morningReminderTime) updateData.morningReminderTime = morningReminderTime;
            if (eveningReminderTime) updateData.eveningReminderTime = eveningReminderTime;

            const settings = await prisma.userSettings.upsert({
                where: { userId },
                update: updateData,
                create: {
                    userId,
                    enableEmailReminders: updateData.enableEmailReminders ?? true,
                    enablePushReminders: updateData.enablePushReminders ?? false,
                    reminderFrequency: updateData.reminderFrequency ?? 'DAILY',
                    morningReminderTime: updateData.morningReminderTime ?? '08:00',
                    eveningReminderTime: updateData.eveningReminderTime ?? '20:00'
                },
                select: {
                    id: true,
                    userId: true,
                    enableEmailReminders: true,
                    enablePushReminders: true,
                    reminderFrequency: true,
                    morningReminderTime: true,
                    eveningReminderTime: true,
                    updatedAt: true
                }
            });

            res.json({
                success: true,
                message: 'Notification settings updated successfully',
                data: settings
            });
        } catch (error) {
            console.error('Update notification settings error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update notification settings',
                error: error.message
            });
        }
    }


    // Get notification statistics
    async getStats(req, res) {
        try {
            const userId = req.user.id;

            const total = await prisma.notification.count({ where: { userId } });
            const unread = await prisma.notification.count({
                where: { userId, readAt: null }
            });
            const read = await prisma.notification.count({
                where: { userId, readAt: { not: null } }
            });

            // Get by type
            const byType = await prisma.notification.groupBy({
                by: ['type'],
                where: { userId },
                _count: true
            });

            // Get recent activity (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentCount = await prisma.notification.count({
                where: {
                    userId,
                    createdAt: { gte: sevenDaysAgo }
                }
            });

            res.json({
                success: true,
                stats: {
                    total,
                    unread,
                    read,
                    readRate: total > 0 ? Math.round((read / total) * 100) : 0,
                    recentCount,
                    byType: byType.reduce((acc, item) => {
                        acc[item.type] = item._count;
                        return acc;
                    }, {})
                }
            });
        } catch (error) {
            console.error('Get notification stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get notification statistics',
                error: error.message
            });
        }
    }
}

module.exports = new NotificationController();
