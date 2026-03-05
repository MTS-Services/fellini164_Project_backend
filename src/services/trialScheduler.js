const cron = require('cron');
const prisma = require('../config/database');
const emailService = require('./emailService');

class TrialScheduler {
    constructor() {
        this.jobs = [];
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) {
            console.log('[TrialScheduler] Already running');
            return;
        }

        console.log('[TrialScheduler] Starting trial cron jobs...');

        // Check for expired trials - Run every day at 1:00 AM
        this.expiredTrialsJob = new cron.CronJob(
            '0 1 * * *',
            async () => {
                console.log('[TrialScheduler] Running trial expiration check...');
                await this.checkExpiredTrials();
            },
            null,
            false,
            'UTC'
        );

        // Send trial ending reminders - Run every day at 9:00 AM
        this.trialRemindersJob = new cron.CronJob(
            '0 9 * * *',
            async () => {
                console.log('[TrialScheduler] Checking for trials ending soon...');
                await this.sendTrialEndingReminders();
            },
            null,
            false,
            'UTC'
        );

        // Start the jobs
        this.expiredTrialsJob.start();
        this.trialRemindersJob.start();

        this.jobs.push(this.expiredTrialsJob, this.trialRemindersJob);
        this.isRunning = true;

        console.log('[TrialScheduler] Trial cron jobs started successfully');

        // Run once on startup to catch any missed expirations
        this.checkExpiredTrials();
    }

    async checkExpiredTrials() {
        try {
            // Find all users with expired trials
            const expiredTrials = await prisma.user.findMany({
                where: {
                    subscriptionStatus: 'TRIALING',
                    trialEndsAt: {
                        lte: new Date() // Trial end date is in the past or today
                    }
                }
            });

            console.log(`Found ${expiredTrials.length} expired trials`);

            for (const user of expiredTrials) {
                try {
                    // Downgrade to FREE plan
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            subscriptionPlan: 'FREE',
                            subscriptionStatus: 'EXPIRED',
                            subscriptionEndDate: new Date(),
                            trialEndsAt: null
                        }
                    });

                    // Create activity log
                    await prisma.activityLog.create({
                        data: {
                            userId: user.id,
                            type: 'SUBSCRIPTION_CANCELED',
                            description: 'Trial expired - downgraded to FREE plan',
                            metadata: {
                                previousPlan: user.subscriptionPlan,
                                trialEndedAt: new Date().toISOString(),
                                reason: 'trial_expired'
                            }
                        }
                    });

                    // Send trial expired email
                    try {
                        const firstName = user.fullName ? user.fullName.split(' ')[0] : '';
                        await emailService.sendTrialExpiredEmail(user.email, firstName);
                    } catch (emailError) {
                        console.error(`Failed to send trial expired email to ${user.email}:`, emailError.message);
                    }

                    console.log(`Trial expired for user ${user.email} - downgraded to FREE`);
                } catch (error) {
                    console.error(`Failed to process expired trial for user ${user.id}:`, error.message);
                }
            }

            return expiredTrials.length;
        } catch (error) {
            console.error('Error checking expired trials:', error);
            return 0;
        }
    }

    async sendTrialEndingReminders() {
        try {
            // Find trials ending in 2 days
            const twoDaysFromNow = new Date();
            twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
            twoDaysFromNow.setHours(23, 59, 59, 999);

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 2);
            tomorrow.setHours(0, 0, 0, 0);

            const trialsEndingSoon = await prisma.user.findMany({
                where: {
                    subscriptionStatus: 'TRIALING',
                    trialEndsAt: {
                        gte: tomorrow,
                        lte: twoDaysFromNow
                    }
                }
            });

            console.log(`Found ${trialsEndingSoon.length} trials ending in 2 days`);

            for (const user of trialsEndingSoon) {
                try {
                    const daysRemaining = Math.ceil(
                        (new Date(user.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)
                    );

                    // Send reminder email
                    const firstName = user.fullName ? user.fullName.split(' ')[0] : '';
                    await emailService.sendTrialEndingReminder(
                        user.email,
                        firstName,
                        daysRemaining,
                        user.subscriptionPlan
                    );

                    console.log(`Sent trial ending reminder to ${user.email} (${daysRemaining} days remaining)`);
                } catch (emailError) {
                    console.error(`Failed to send trial reminder to ${user.email}:`, emailError.message);
                }
            }

            return trialsEndingSoon.length;
        } catch (error) {
            console.error('Error sending trial reminders:', error);
            return 0;
        }
    }

    stop() {
        if (!this.isRunning) {
            console.log('[TrialScheduler] Not running');
            return;
        }

        console.log('[TrialScheduler] Stopping trial cron jobs...');

        this.jobs.forEach(job => {
            if (job) {
                job.stop();
            }
        });

        this.jobs = [];
        this.isRunning = false;

        console.log('[TrialScheduler] Trial cron jobs stopped');
    }
}

module.exports = new TrialScheduler();
