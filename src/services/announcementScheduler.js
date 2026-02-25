const cron = require('cron');
const announcementController = require('../controllers/announcementController');

class AnnouncementScheduler {
  constructor() {
    this.isRunning = false;
  }


  start() {
    if (this.isRunning) {
      console.log('[AnnouncementScheduler] Already running');
      return;
    }

    // Run every minute: '* * * * *'
    this.cronJob = new cron.CronJob('* * * * *', async () => {
      try {
        const result = await announcementController.processScheduledAnnouncements();

        if (result.processedCount > 0) {
          console.log(`[AnnouncementScheduler] Processed ${result.processedCount} scheduled announcements`);
        }
      } catch (error) {
        console.error('[AnnouncementScheduler] Error:', error);
      }
    });

    this.cronJob.start();
    this.isRunning = true;
    console.log('[AnnouncementScheduler] Started - checking every minute for scheduled announcements');
  }


  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('[AnnouncementScheduler] Stopped');
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning
    };
  }
}

module.exports = new AnnouncementScheduler();
