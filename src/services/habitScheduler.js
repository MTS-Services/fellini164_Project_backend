const cron = require('cron');
const habitReminderService = require('./habitReminderService');
const prisma = require('../config/database');

class HabitScheduler {
    constructor() {
        this.jobs = [];
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) {
            console.log('[HabitScheduler] Already running');
            return;
        }

        console.log('[HabitScheduler] Starting habit cron jobs...');

        // Morning reminders (8:00 AM daily)
        this.morningReminderJob = new cron.CronJob(
            '0 8 * * *',
            async () => {
                console.log('[HabitScheduler] Running morning habit reminders...');
                await this.sendMorningReminders();
            },
            null,
            false,
            'America/New_York'
        );
        this.morningReminderJob.start();
        this.jobs.push({ name: 'Morning Reminders', job: this.morningReminderJob });

        // Evening reminders (8:00 PM daily)
        this.eveningReminderJob = new cron.CronJob(
            '0 20 * * *',
            async () => {
                console.log('[HabitScheduler] Running evening habit reminders...');
                await this.sendEveningReminders();
            },
            null,
            false,
            'America/New_York'
        );
        this.eveningReminderJob.start();
        this.jobs.push({ name: 'Evening Reminders', job: this.eveningReminderJob });

        // Check streaks at risk (10:00 PM daily)
        this.streakCheckJob = new cron.CronJob(
            '0 22 * * *',
            async () => {
                console.log('[HabitScheduler] Checking habits with streaks at risk...');
                await habitReminderService.checkStreaksAtRisk();
            },
            null,
            false,
            'America/New_York'
        );
        this.streakCheckJob.start();
        this.jobs.push({ name: 'Streak Risk Check', job: this.streakCheckJob });

        // Reset daily counters (12:01 AM daily)
        this.dailyResetJob = new cron.CronJob(
            '1 0 * * *',
            async () => {
                console.log('[HabitScheduler] Resetting daily habit counters...');
                await this.resetDailyCounters();
            },
            null,
            false,
            'America/New_York'
        );
        this.dailyResetJob.start();
        this.jobs.push({ name: 'Daily Reset', job: this.dailyResetJob });

        this.isRunning = true;
        console.log('[HabitScheduler] All habit cron jobs started successfully');
        this.logSchedule();
    }

    /**
     * Stop all cron jobs
     */
    stop() {
        console.log('[HabitScheduler] Stopping all habit cron jobs...');

        this.jobs.forEach(({ name, job }) => {
            if (job) {
                job.stop();
                console.log(`[HabitScheduler] Stopped: ${name}`);
            }
        });

        this.jobs = [];
        this.isRunning = false;
        console.log('[HabitScheduler] All habit cron jobs stopped');
    }


    getStatus() {
        return {
            isRunning: this.isRunning,
            activeJobs: this.jobs.length,
            jobs: this.jobs.map(({ name, job }) => ({
                name,
                running: job.running
            }))
        };
    }

    /**
     * Log the schedule
     */
    logSchedule() {
        console.log('\n[HabitScheduler] Cron Job Schedule:');
        console.log('  - Morning Reminders: 8:00 AM daily');
        console.log('  - Evening Reminders: 8:00 PM daily');
        console.log('  - Streak Risk Check: 10:00 PM daily');
        console.log('  - Daily Reset: 12:01 AM daily');
        console.log('');
    }

    /**
     * Send morning habit reminders
     */
    async sendMorningReminders() {
        try {
            // Get all users with active habits
            const users = await prisma.user.findMany({
                where: {
                    habits: {
                        some: {
                            isActive: true
                        }
                    }
                },
                include: {
                    settings: true,
                    habits: {
                        where: {
                            isActive: true
                        }
                    }
                }
            });

            let sentCount = 0;
            let skippedCount = 0;

            for (const user of users) {
                // Check user's wake time setting
                const wakeTime = user.settings?.wakeTime || '07:00';
                const [wakeHour] = wakeTime.split(':').map(Number);
                const currentHour = new Date().getHours();

                // Skip if it's too early for this user
                if (currentHour < wakeHour) {
                    skippedCount++;
                    continue;
                }

                // Check if user has email reminders enabled
                if (!user.settings?.enableEmailReminders) {
                    skippedCount++;
                    continue;
                }

                const result = await habitReminderService.sendDailyHabitReminders(user.id);
                if (result.success) {
                    sentCount++;
                }
            }

            console.log(`[HabitScheduler] Morning reminders: ${sentCount} sent, ${skippedCount} skipped`);
            return { success: true, sentCount, skippedCount };
        } catch (error) {
            console.error('[HabitScheduler] Error sending morning reminders:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send evening habit reminders
     */
    async sendEveningReminders() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Get all users with incomplete habits today
            const users = await prisma.user.findMany({
                where: {
                    habits: {
                        some: {
                            isActive: true,
                            completions: {
                                none: {
                                    date: {
                                        gte: today
                                    }
                                }
                            }
                        }
                    }
                },
                include: {
                    settings: true
                }
            });

            let sentCount = 0;
            let skippedCount = 0;

            for (const user of users) {
                // Check if user has email reminders enabled
                if (!user.settings?.enableEmailReminders) {
                    skippedCount++;
                    continue;
                }

                const result = await habitReminderService.sendDailyHabitReminders(user.id);
                if (result.success && result.count > 0) {
                    sentCount++;
                } else {
                    skippedCount++;
                }
            }

            console.log(`[HabitScheduler] Evening reminders: ${sentCount} sent, ${skippedCount} skipped`);
            return { success: true, sentCount, skippedCount };
        } catch (error) {
            console.error('[HabitScheduler] Error sending evening reminders:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Reset daily counters and check for broken streaks
     */
    async resetDailyCounters() {
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Get all active habits
            const habits = await prisma.habit.findMany({
                where: {
                    isActive: true,
                    currentStreak: {
                        gt: 0
                    }
                },
                include: {
                    completions: {
                        where: {
                            date: {
                                gte: yesterday,
                                lt: today
                            }
                        }
                    }
                }
            });

            let brokStreaksCount = 0;

            // Check each habit - if not completed yesterday, break the streak
            for (const habit of habits) {
                if (habit.completions.length === 0) {
                    // Habit not completed yesterday, break the streak
                    await prisma.habit.update({
                        where: { id: habit.id },
                        data: {
                            currentStreak: 0
                        }
                    });
                    brokStreaksCount++;
                }
            }

            console.log(`[HabitScheduler] Daily reset: ${brokStreaksCount} streaks broken`);
            return { success: true, brokStreaksCount };
        } catch (error) {
            console.error('[HabitScheduler] Error resetting daily counters:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Manually trigger morning reminders (for testing)
     */
    async triggerMorningReminders() {
        console.log('[HabitScheduler] Manually triggering morning reminders...');
        return await this.sendMorningReminders();
    }

    /**
     * Manually trigger evening reminders (for testing)
     */
    async triggerEveningReminders() {
        console.log('[HabitScheduler] Manually triggering evening reminders...');
        return await this.sendEveningReminders();
    }

    /**
     * Manually trigger streak check (for testing)
     */
    async triggerStreakCheck() {
        console.log('[HabitScheduler] Manually triggering streak check...');
        return await habitReminderService.checkStreaksAtRisk();
    }

    /**
     * Manually trigger daily reset (for testing)
     */
    async triggerDailyReset() {
        console.log('[HabitScheduler] Manually triggering daily reset...');
        return await this.resetDailyCounters();
    }
}

module.exports = new HabitScheduler();
