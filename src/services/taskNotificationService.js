const prisma = require('../config/database');
const emailService = require('./emailService');

class TaskNotificationService {

  // ==================== TASK REMINDER NOTIFICATIONS ====================

  // Send reminder for upcoming task
  async sendTaskReminder(taskId) {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true
            }
          }
        }
      });

      if (!task || task.status === 'COMPLETED') {
        return { success: false, message: 'Task not found or already completed' };
      }

      // Create in-app notification
      await prisma.notification.create({
        data: {
          userId: task.userId,
          type: 'DAILY_REMINDER',
          channel: 'IN_APP',
          status: 'SENT',
          title: 'Task Reminder',
          message: `Don't forget: ${task.title}`,
          data: {
            taskId: task.id,
            priority: task.priority,
            dueDate: task.dueDate
          },
          sentAt: new Date()
        }
      });

      // Send email reminder if user has email notifications enabled
      const settings = await prisma.userSettings.findUnique({
        where: { userId: task.userId }
      });

      if (settings?.enableEmailReminders) {
        await emailService.sendEmail({
          to: task.user.email,
          subject: `Reminder: ${task.title}`,
          html: this.getTaskReminderEmailTemplate(task, task.user)
        });
      }

      return { success: true, message: 'Reminder sent' };
    } catch (error) {
      console.error('Failed to send task reminder:', error);
      return { success: false, message: error.message };
    }
  }

  // Send reminders for all tasks due today
  async sendDailyTaskReminders(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const tasks = await prisma.task.findMany({
        where: {
          userId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          OR: [
            {
              dueDate: {
                gte: today,
                lte: endOfDay
              }
            },
            {
              scheduledDate: {
                gte: today,
                lte: endOfDay
              }
            }
          ]
        },
        include: {
          user: {
            select: {
              email: true,
              fullName: true
            }
          }
        }
      });

      if (tasks.length === 0) {
        return { success: true, message: 'No tasks due today', count: 0 };
      }

      // Send consolidated email with all tasks
      const user = tasks[0].user;
      await emailService.sendEmail({
        to: user.email,
        subject: `Your ${tasks.length} tasks for today`,
        html: this.getDailyTasksEmailTemplate(tasks, user)
      });

      // Create in-app notification
      await prisma.notification.create({
        data: {
          userId,
          type: 'DAILY_REMINDER',
          channel: 'IN_APP',
          status: 'SENT',
          title: `You have ${tasks.length} tasks today`,
          message: `Ready to tackle your tasks? Let's make today productive!`,
          data: {
            taskCount: tasks.length,
            tasks: tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority }))
          },
          sentAt: new Date()
        }
      });

      return { success: true, message: 'Daily reminders sent', count: tasks.length };
    } catch (error) {
      console.error('Failed to send daily task reminders:', error);
      return { success: false, message: error.message };
    }
  }


  // ==================== DEADLINE NOTIFICATIONS ====================

  // Send notification for overdue tasks
  async sendOverdueNotifications(userId) {
    try {
      const now = new Date();

      const overdueTasks = await prisma.task.findMany({
        where: {
          userId,
          status: { notIn: ['COMPLETED', 'CANCELED'] },
          dueDate: {
            lt: now
          }
        },
        include: {
          user: {
            select: {
              email: true,
              fullName: true
            }
          }
        }
      });

      if (overdueTasks.length === 0) {
        return { success: true, message: 'No overdue tasks', count: 0 };
      }

      // Create notification
      await prisma.notification.create({
        data: {
          userId,
          type: 'DAILY_REMINDER',
          channel: 'IN_APP',
          status: 'SENT',
          title: `You have ${overdueTasks.length} overdue tasks`,
          message: 'Time to catch up! Complete or reschedule these tasks.',
          data: {
            taskCount: overdueTasks.length,
            tasks: overdueTasks.map(t => ({ id: t.id, title: t.title }))
          },
          sentAt: new Date()
        }
      });

      return { success: true, message: 'Overdue notifications sent', count: overdueTasks.length };
    } catch (error) {
      console.error('Failed to send overdue notifications:', error);
      return { success: false, message: error.message };
    }
  }

  // Send notification for tasks due soon (within 1 hour)
  async sendUpcomingTaskAlerts(userId) {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const upcomingTasks = await prisma.task.findMany({
        where: {
          userId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueDate: {
            gte: now,
            lte: oneHourLater
          }
        }
      });

      for (const task of upcomingTasks) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'DAILY_REMINDER',
            channel: 'IN_APP',
            status: 'SENT',
            title: 'Task due soon!',
            message: `"${task.title}" is due in less than 1 hour`,
            data: {
              taskId: task.id,
              dueDate: task.dueDate
            },
            sentAt: new Date()
          }
        });
      }

      return { success: true, message: 'Upcoming task alerts sent', count: upcomingTasks.length };
    } catch (error) {
      console.error('Failed to send upcoming task alerts:', error);
      return { success: false, message: error.message };
    }
  }


  // ==================== COMPLETION NOTIFICATIONS ====================

  // Send congratulations on task completion
  async sendCompletionCongratulations(taskId, userId) {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId }
      });

      if (!task) return;

      // Create notification
      await prisma.notification.create({
        data: {
          userId,
          type: 'GOAL_MILESTONE',
          channel: 'IN_APP',
          status: 'SENT',
          title: '✅ Task completed!',
          message: `Great work completing "${task.title}"`,
          data: {
            taskId: task.id,
            priority: task.priority
          },
          sentAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to send completion notification:', error);
      return { success: false };
    }
  }

  // Send streak milestone notification
  async sendStreakNotification(userId, streakCount) {
    try {
      const milestones = [3, 14, 30, 60, 90, 180, 365];

      if (milestones.includes(streakCount)) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'STREAK_NOTIFICATION',
            channel: 'IN_APP',
            status: 'SENT',
            title: `🔥 ${streakCount}-day streak!`,
            message: `Amazing! You've maintained your task completion streak for ${streakCount} days!`,
            data: {
              streakCount,
              milestone: true
            },
            sentAt: new Date()
          }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to send streak notification:', error);
      return { success: false };
    }
  }


  // ==================== BATCH OPERATIONS ====================

  // Send all reminders for a user
  async sendAllReminders(userId) {
    try {
      const results = await Promise.all([
        this.sendDailyTaskReminders(userId),
        this.sendOverdueNotifications(userId),
        this.sendUpcomingTaskAlerts(userId)
      ]);

      return {
        success: true,
        dailyReminders: results[0],
        overdueNotifications: results[1],
        upcomingAlerts: results[2]
      };
    } catch (error) {
      console.error('Failed to send all reminders:', error);
      return { success: false, message: error.message };
    }
  }

  // Send reminders for all users (cron job)
  async sendRemindersForAllUsers() {
    try {
      const users = await prisma.user.findMany({
        where: {
          userStatus: 'ACTIVE',
          settings: {
            enableEmailReminders: true
          }
        },
        select: {
          id: true
        }
      });

      const results = [];

      for (const user of users) {
        const result = await this.sendAllReminders(user.id);
        results.push({ userId: user.id, ...result });
      }

      return {
        success: true,
        usersProcessed: users.length,
        results
      };
    } catch (error) {
      console.error('Failed to send reminders for all users:', error);
      return { success: false, message: error.message };
    }
  }


  // ==================== EMAIL TEMPLATES ====================

  getTaskReminderEmailTemplate(task, user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .task-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .priority { display: inline-block; padding: 5px 10px; border-radius: 3px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .priority-high { background: #ff6b6b; color: white; }
          .priority-medium { background: #ffd93d; color: #333; }
          .priority-low { background: #95e1d3; color: #333; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Task Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${user.fullName || 'there'},</p>
            <p>This is a friendly reminder about your upcoming task:</p>
            
            <div class="task-box">
              <h2>${task.title}</h2>
              ${task.description ? `<p>${task.description}</p>` : ''}
              <p><strong>Priority:</strong> <span class="priority priority-${task.priority.toLowerCase()}">${task.priority}</span></p>
              ${task.dueDate ? `<p><strong>Due:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
              ${task.estimatedMinutes ? `<p><strong>Estimated time:</strong> ${task.estimatedMinutes} minutes</p>` : ''}
            </div>
            
            <p>Ready to get started?</p>
            <a href="${process.env.FRONTEND_URL}/tasks/${task.id}" class="button">View Task</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you have task reminders enabled.</p>
            <p>© ${new Date().getFullYear()} Trexo - AI Life Planning</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getDailyTasksEmailTemplate(tasks, user) {
    const tasksList = tasks.map(task => `
      <div class="task-item">
        <h3>${task.title}</h3>
        <span class="priority priority-${task.priority.toLowerCase()}">${task.priority}</span>
        ${task.estimatedMinutes ? `<span class="time">${task.estimatedMinutes} min</span>` : ''}
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .task-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
          .priority { display: inline-block; padding: 5px 10px; border-radius: 3px; font-size: 12px; font-weight: bold; margin-right: 10px; }
          .priority-urgent { background: #ff4757; color: white; }
          .priority-high { background: #ff6b6b; color: white; }
          .priority-medium { background: #ffd93d; color: #333; }
          .priority-low { background: #95e1d3; color: #333; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Your Tasks for Today</h1>
            <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div class="content">
            <p>Hi ${user.fullName || 'there'},</p>
            <p>You have <strong>${tasks.length} tasks</strong> scheduled for today. Let's make it productive!</p>
            
            ${tasksList}
            
            <a href="${process.env.FRONTEND_URL}/tasks" class="button">View All Tasks</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new TaskNotificationService();
