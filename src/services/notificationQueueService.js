const Queue = require('bull');
const prisma = require('../config/database');
const emailService = require('./emailService');

class NotificationQueueService {
    constructor() {
        // Initialize queues
        this.emailQueue = new Queue('email-notifications', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD || undefined
            }
        });

        this.inAppQueue = new Queue('in-app-notifications', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD || undefined
            }
        });

        // Set up queue processors
        this.setupProcessors();

        console.log('[NotificationQueue] Initialized with Bull queues');
    }


    setupProcessors() {
        // Email queue processor
        this.emailQueue.process(async (job) => {
            const { userId, to, subject, html, type } = job.data;

            try {
                console.log(`[EmailQueue] Processing email: ${subject} to ${to}`);

                // Send email
                await emailService.sendEmail(to, subject, html);

                // Update notification status in database
                if (job.data.notificationId) {
                    await prisma.notification.update({
                        where: { id: job.data.notificationId },
                        data: {
                            status: 'SENT',
                            sentAt: new Date()
                        }
                    });
                }

                console.log(`[EmailQueue] Email sent successfully: ${subject}`);
                return { success: true, message: 'Email sent' };
            } catch (error) {
                console.error(`[EmailQueue] Error sending email:`, error);

                // Update notification status to failed
                if (job.data.notificationId) {
                    await prisma.notification.update({
                        where: { id: job.data.notificationId },
                        data: {
                            status: 'FAILED'
                        }
                    });
                }

                throw error; // Retry
            }
        });

        // In-app notification processor
        this.inAppQueue.process(async (job) => {
            const { userId, type, title, message, data } = job.data;

            try {
                console.log(`[InAppQueue] Processing notification: ${title} for user ${userId}`);

                // Create in-app notification
                const notification = await prisma.notification.create({
                    data: {
                        userId,
                        type,
                        channel: 'IN_APP',
                        status: 'SENT',
                        title,
                        message,
                        data,
                        sentAt: new Date()
                    }
                });

                // Emit real-time notification via Socket.io
                const io = global.io;
                if (io) {
                    io.to(`user:${userId}`).emit('notification:new', notification);
                }

                console.log(`[InAppQueue] In-app notification created: ${notification.id}`);
                return { success: true, notificationId: notification.id };
            } catch (error) {
                console.error(`[InAppQueue] Error creating notification:`, error);
                throw error;
            }
        });

        this.emailQueue.on('failed', (job, err) => {
            console.error(`[EmailQueue] Job ${job.id} failed:`, err.message);
        });

        this.inAppQueue.on('failed', (job, err) => {
            console.error(`[InAppQueue] Job ${job.id} failed:`, err.message);
        });

        this.emailQueue.on('completed', (job) => {
            console.log(`[EmailQueue] Job ${job.id} completed`);
        });

        this.inAppQueue.on('completed', (job) => {
            console.log(`[InAppQueue] Job ${job.id} completed`);
        });
    }


    async queueEmail(data) {
        try {
            const job = await this.emailQueue.add(data, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                },
                removeOnComplete: true,
                removeOnFail: false
            });

            console.log(`[NotificationQueue] Email queued: Job ${job.id}`);
            return { success: true, jobId: job.id };
        } catch (error) {
            console.error('[NotificationQueue] Error queuing email:', error);
            return { success: false, error: error.message };
        }
    }

    async queueInApp(data) {
        try {
            const job = await this.inAppQueue.add(data, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                },
                removeOnComplete: true,
                removeOnFail: false
            });

            console.log(`[NotificationQueue] In-app notification queued: Job ${job.id}`);
            return { success: true, jobId: job.id };
        } catch (error) {
            console.error('[NotificationQueue] Error queuing in-app notification:', error);
            return { success: false, error: error.message };
        }
    }


    async sendNotification({ userId, type, channel, title, message, data, email }) {
        try {
            if (channel === 'EMAIL' && email) {
                return await this.queueEmail({
                    userId,
                    to: email.to,
                    subject: email.subject,
                    html: email.html,
                    type
                });
            } else if (channel === 'IN_APP') {
                return await this.queueInApp({
                    userId,
                    type,
                    title,
                    message,
                    data
                });
            } else {
                return { success: false, error: 'Invalid channel or missing email data' };
            }
        } catch (error) {
            console.error('[NotificationQueue] Error sending notification:', error);
            return { success: false, error: error.message };
        }
    }

    async sendMultiChannel({ userId, type, title, message, data, email }) {
        const results = {
            email: null,
            inApp: null
        };

        // Queue in-app notification
        results.inApp = await this.queueInApp({
            userId,
            type,
            title,
            message,
            data
        });

        if (email) {
            results.email = await this.queueEmail({
                userId,
                to: email.to,
                subject: email.subject,
                html: email.html,
                type
            });
        }

        return {
            success: true,
            results
        };
    }

    /**
     * Get queue statistics
     */
    async getStats() {
        const emailCounts = await this.emailQueue.getJobCounts();
        const inAppCounts = await this.inAppQueue.getJobCounts();

        return {
            email: emailCounts,
            inApp: inAppCounts
        };
    }

    /**
     * Clean old jobs
     */
    async cleanQueues() {
        await this.emailQueue.clean(24 * 3600 * 1000, 'completed');
        await this.emailQueue.clean(7 * 24 * 3600 * 1000, 'failed');
        await this.inAppQueue.clean(24 * 3600 * 1000, 'completed');
        await this.inAppQueue.clean(7 * 24 * 3600 * 1000, 'failed');

        console.log('[NotificationQueue] Queues cleaned');
    }

    /**
     * Close queues
     */
    async close() {
        await this.emailQueue.close();
        await this.inAppQueue.close();
        console.log('[NotificationQueue] Queues closed');
    }
}

module.exports = new NotificationQueueService();
