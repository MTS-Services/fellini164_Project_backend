const cron = require('cron');
const taskNotificationService = require('./taskNotificationService');
const prisma = require('../config/database');

class TaskScheduler {
    constructor() {
        this.jobs = [];
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) {
            console.log('[TaskScheduler] Already running');
            return;
        }

        console.log('[TaskScheduler] Starting task cron jobs...');

        // Morning task summary (8:00 AM daily)
        this.morningTaskSummaryJob = new cron.CronJob(
            '0 8 * * *',
            async () => {
                console.log('[TaskScheduler] Running morning task summary...');
                await this.sendMorningTaskSummary();
            },
            null,
            false,
            'America/New_York'
        );
        this.morningTaskSummaryJob.start();
        this.jobs.push({ name: 'Morning Task Summary', job: this.morningTaskSummaryJob });

        // Evening task review (8:00 PM daily)
        this.eveningTaskReviewJob = new cron.CronJob(
            '0 20 * * *',
            async () => {
                console.log('[TaskScheduler] Running evening task review...');
                await this.sendEveningTaskReview();
            },
            null,
            false,
            'America/New_York'
        );
        this.eveningTaskReviewJob.start();
        this.jobs.push({ name: 'Evening Task Review', job: this.eveningTaskReviewJob });

        this.dueSoonCheckJob = new cron.CronJob(
            '0 * * * *',
            async () => {
                console.log('[TaskScheduler] Checking for tasks due soon...');
                await this.checkTasksDueSoon();
            },
            null,
            false,
            'America/New_York'
        );
        this.dueSoonCheckJob.start();
        this.jobs.push({ name: 'Due Soon Check', job: this.dueSoonCheckJob });

        // Weekly review (Sunday 6:00 PM)
        this.weeklyReviewJob = new cron.CronJob(
            '0 18 * * 0',
            async () => {
                console.log('[TaskScheduler] Running weekly review...');
                await this.sendWeeklyReview();
            },
            null,
            false,
            'America/New_York'
        );
        this.weeklyReviewJob.start();
        this.jobs.push({ name: 'Weekly Review', job: this.weeklyReviewJob });

        // Check overdue tasks (9:00 AM daily)
        this.overdueCheckJob = new cron.CronJob(
            '0 9 * * *',
            async () => {
                console.log('[TaskScheduler] Checking overdue tasks...');
                await this.checkOverdueTasks();
            },
            null,
            false,
            'America/New_York'
        );
        this.overdueCheckJob.start();
        this.jobs.push({ name: 'Overdue Task Check', job: this.overdueCheckJob });

        this.isRunning = true;
        console.log('[TaskScheduler] All task cron jobs started successfully');
        this.logSchedule();
    }

    stop() {
        console.log('[TaskScheduler] Stopping all task cron jobs...');

        this.jobs.forEach(({ name, job }) => {
            if (job) {
                job.stop();
                console.log(`[TaskScheduler] Stopped: ${name}`);
            }
        });

        this.jobs = [];
        this.isRunning = false;
        console.log('[TaskScheduler] All task cron jobs stopped');
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

    logSchedule() {
        console.log('\n[TaskScheduler] Cron Job Schedule:');
        console.log('  - Morning Task Summary: 8:00 AM daily');
        console.log('  - Evening Task Review: 8:00 PM daily');
        console.log('  - Due Soon Check: Every hour');
        console.log('  - Weekly Review: Sunday 6:00 PM');
        console.log('  - Overdue Task Check: 9:00 AM daily');
        console.log('');
    }

    async sendMorningTaskSummary() {
        try {
            const users = await prisma.user.findMany({
                where: {
                    tasks: {
                        some: {
                            status: { in: ['TODO', 'IN_PROGRESS'] }
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
                if (!user.settings?.enableEmailReminders) {
                    skippedCount++;
                    continue;
                }

                const result = await taskNotificationService.sendDailyTaskReminders(user.id);
                if (result.success) {
                    sentCount++;
                } else {
                    skippedCount++;
                }
            }

            console.log(`[TaskScheduler] Morning summary: ${sentCount} sent, ${skippedCount} skipped`);
            return { success: true, sentCount, skippedCount };
        } catch (error) {
            console.error('[TaskScheduler] Error sending morning summary:', error);
            return { success: false, error: error.message };
        }
    }

    async sendEveningTaskReview() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);

            const users = await prisma.user.findMany({
                where: {
                    tasks: {
                        some: {
                            status: { in: ['TODO', 'IN_PROGRESS'] },
                            OR: [
                                { dueDate: { gte: today, lte: endOfDay } },
                                { scheduledDate: { gte: today, lte: endOfDay } }
                            ]
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
                if (!user.settings?.enableEmailReminders) {
                    skippedCount++;
                    continue;
                }

                const result = await taskNotificationService.sendEveningTaskReview(user.id);
                if (result.success) {
                    sentCount++;
                } else {
                    skippedCount++;
                }
            }

            console.log(`[TaskScheduler] Evening review: ${sentCount} sent, ${skippedCount} skipped`);
            return { success: true, sentCount, skippedCount };
        } catch (error) {
            console.error('[TaskScheduler] Error sending evening review:', error);
            return { success: false, error: error.message };
        }
    }

    async checkTasksDueSoon() {
        try {
            const now = new Date();
            const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

            const tasks = await prisma.task.findMany({
                where: {
                    status: { in: ['TODO', 'IN_PROGRESS'] },
                    dueDate: {
                        gte: now,
                        lte: oneHourLater
                    }
                },
                include: {
                    user: {
                        include: {
                            settings: true
                        }
                    }
                }
            });

            let sentCount = 0;

            for (const task of tasks) {
                if (task.user.settings?.enableEmailReminders) {
                    await taskNotificationService.sendTaskDueSoonReminder(task.id);
                    sentCount++;
                }
            }

            //console.log(`[TaskScheduler] Due soon check: ${sentCount} reminders sent`);
            return { success: true, sentCount };
        } catch (error) {
            console.error('[TaskScheduler] Error checking due soon tasks:', error);
            return { success: false, error: error.message };
        }
    }

    async sendWeeklyReview() {
        try {
            const users = await prisma.user.findMany({
                where: {
                    tasks: {
                        some: {}
                    }
                },
                include: {
                    settings: true
                }
            });

            let sentCount = 0;
            let skippedCount = 0;

            for (const user of users) {
                if (!user.settings?.enableEmailReminders) {
                    skippedCount++;
                    continue;
                }

                const result = await taskNotificationService.sendWeeklyReview(user.id);
                if (result.success) {
                    sentCount++;
                } else {
                    skippedCount++;
                }
            }

            console.log(`[TaskScheduler] Weekly review: ${sentCount} sent, ${skippedCount} skipped`);
            return { success: true, sentCount, skippedCount };
        } catch (error) {
            console.error('[TaskScheduler] Error sending weekly review:', error);
            return { success: false, error: error.message };
        }
    }

    async checkOverdueTasks() {
        try {
            const now = new Date();

            const users = await prisma.user.findMany({
                where: {
                    tasks: {
                        some: {
                            status: { in: ['TODO', 'IN_PROGRESS'] },
                            dueDate: {
                                lt: now
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
                if (!user.settings?.enableEmailReminders) {
                    skippedCount++;
                    continue;
                }

                const result = await taskNotificationService.sendOverdueTasksReminder(user.id);
                if (result.success) {
                    sentCount++;
                } else {
                    skippedCount++;
                }
            }

            console.log(`[TaskScheduler] Overdue check: ${sentCount} sent, ${skippedCount} skipped`);
            return { success: true, sentCount, skippedCount };
        } catch (error) {
            console.error('[TaskScheduler] Error checking overdue tasks:', error);
            return { success: false, error: error.message };
        }
    }

    async triggerMorningSummary() {
        console.log('[TaskScheduler] Manually triggering morning summary...');
        return await this.sendMorningTaskSummary();
    }

    async triggerEveningReview() {
        console.log('[TaskScheduler] Manually triggering evening review...');
        return await this.sendEveningTaskReview();
    }

    async triggerDueSoonCheck() {
        console.log('[TaskScheduler] Manually triggering due soon check...');
        return await this.checkTasksDueSoon();
    }

    async triggerWeeklyReview() {
        console.log('[TaskScheduler] Manually triggering weekly review...');
        return await this.sendWeeklyReview();
    }

    async triggerOverdueCheck() {
        console.log('[TaskScheduler] Manually triggering overdue check...');
        return await this.checkOverdueTasks();
    }
}

module.exports = new TaskScheduler();
