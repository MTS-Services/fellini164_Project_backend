const prisma = require('../config/database');
const emailService = require('./emailService');

class HabitReminderService {

    // ==================== SEND HABIT REMINDER ====================

    // Send reminder for a specific habit
    async sendHabitReminder(habitId, { force = false } = {}) {
        try {
            const habit = await prisma.habit.findUnique({
                where: { id: habitId },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            fullName: true,
                            settings: true
                        }
                    }
                }
            });

            if (!habit) {
                return { success: false, message: 'Habit not found' };
            }

            if (!force && !habit.isActive) {
                return { success: false, message: 'Habit is inactive' };
            }

            // Check user settings (skipped for forced test sends)
            if (!force && !habit.user.settings?.enableEmailReminders) {
                return { success: false, message: 'User has disabled email reminders' };
            }

            // Check if already completed today (skipped for forced test sends)
            if (!force) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const completedToday = await prisma.habitCompletion.findFirst({
                    where: {
                        habitId: habit.id,
                        date: { gte: today }
                    }
                });

                if (completedToday) {
                    return { success: false, message: 'Habit already completed today' };
                }
            }

            // Create in-app notification
            await prisma.notification.create({
                data: {
                    userId: habit.userId,
                    type: 'HABIT_REMINDER',
                    channel: 'IN_APP',
                    status: 'SENT',
                    title: 'Habit Reminder',
                    message: `Time to complete: ${habit.name}`,
                    data: {
                        habitId: habit.id,
                        currentStreak: habit.currentStreak
                    },
                    sentAt: new Date()
                }
            });

            // Send email reminder
            await emailService.sendEmail(
                habit.user.email,
                `Habit Reminder: ${habit.name}`,
                this.getHabitReminderEmailTemplate(habit, habit.user)
            );

            return { success: true, message: 'Reminder sent' };
        } catch (error) {
            console.error('Failed to send habit reminder:', error);
            return { success: false, message: error.message };
        }
    }

    // ==================== SEND DAILY HABIT REMINDERS ====================

    // Send all habit reminders for a user
    async sendDailyHabitReminders(userId, { force = false } = {}) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Get active habits not completed today
            const habits = await prisma.habit.findMany({
                where: {
                    userId,
                    isActive: true
                },
                include: {
                    completions: {
                        where: {
                            date: { gte: today }
                        }
                    },
                    user: {
                        select: {
                            email: true,
                            fullName: true,
                            settings: true
                        }
                    }
                }
            });

            // Filter habits not completed today
            const incompleteHabits = habits.filter(h => h.completions.length === 0);

            if (incompleteHabits.length === 0) {
                return { success: true, message: 'All habits completed', count: 0 };
            }

            // Check user settings (skipped for forced test sends)
            const user = habits[0]?.user;
            if (!force && !user?.settings?.enableEmailReminders) {
                return { success: false, message: 'User has disabled email reminders' };
            }

            // Send bulk notification
            await this.sendBulkHabitReminder(userId, incompleteHabits);

            return { success: true, count: incompleteHabits.length };
        } catch (error) {
            console.error('Failed to send daily habit reminders:', error);
            return { success: false, message: error.message };
        }
    }

    // ==================== SEND BULK HABIT REMINDER ====================

    async sendBulkHabitReminder(userId, habits) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    email: true,
                    fullName: true
                }
            });

            if (!user) return;

            // Create in-app notification
            await prisma.notification.create({
                data: {
                    userId,
                    type: 'HABIT_REMINDER',
                    channel: 'IN_APP',
                    status: 'SENT',
                    title: 'Daily Habit Reminders',
                    message: `You have ${habits.length} habit${habits.length > 1 ? 's' : ''} to complete today`,
                    data: {
                        habitCount: habits.length,
                        habits: habits.map(h => ({ id: h.id, name: h.name }))
                    },
                    sentAt: new Date()
                }
            });

            // Send email with all habits
            await emailService.sendEmail(
                user.email,
                `Daily Habit Reminder - ${habits.length} habit${habits.length > 1 ? 's' : ''} pending`,
                this.getDailyHabitsEmailTemplate(habits, user)
            );

            return { success: true };
        } catch (error) {
            console.error('Failed to send bulk habit reminder:', error);
            return { success: false, message: error.message };
        }
    }


    // Send streak milestone notification
    async sendStreakMilestoneNotification(habitId, userId) {
        try {
            const habit = await prisma.habit.findUnique({
                where: { id: habitId },
                include: {
                    user: {
                        select: {
                            email: true,
                            fullName: true
                        }
                    }
                }
            });

            if (!habit) return;

            const streak = habit.currentStreak;

            // Create in-app notification
            await prisma.notification.create({
                data: {
                    userId,
                    type: 'STREAK_NOTIFICATION',
                    channel: 'IN_APP',
                    status: 'SENT',
                    title: '🔥 Streak Milestone!',
                    message: `Amazing! You've completed "${habit.name}" for ${streak} days straight!`,
                    data: {
                        habitId: habit.id,
                        streak
                    },
                    sentAt: new Date()
                }
            });

            // Send congratulatory email
            await emailService.sendEmail(
                habit.user.email,
                `🎉 ${streak}-Day Streak Milestone!`,
                this.getStreakMilestoneEmailTemplate(habit, streak, habit.user)
            );

            return { success: true };
        } catch (error) {
            console.error('Failed to send streak milestone notification:', error);
            return { success: false };
        }
    }

    // Send streak at risk notification
    async sendStreakRiskNotification(habitId, userId) {
        try {
            const habit = await prisma.habit.findUnique({
                where: { id: habitId },
                include: {
                    user: {
                        select: {
                            email: true,
                            fullName: true
                        }
                    }
                }
            });

            if (!habit || habit.currentStreak === 0) return;

            // Create in-app notification
            await prisma.notification.create({
                data: {
                    userId,
                    type: 'STREAK_NOTIFICATION',
                    channel: 'IN_APP',
                    status: 'SENT',
                    title: '⚠️ Streak at Risk!',
                    message: `Your ${habit.currentStreak}-day streak for "${habit.name}" is about to break!`,
                    data: {
                        habitId: habit.id,
                        streak: habit.currentStreak
                    },
                    sentAt: new Date()
                }
            });

            // Send warning email
            await emailService.sendEmail(
                habit.user.email,
                `⚠️ Your ${habit.currentStreak}-Day Streak is at Risk`,
                this.getStreakRiskEmailTemplate(habit, habit.user)
            );

            return { success: true };
        } catch (error) {
            console.error('Failed to send streak risk notification:', error);
            return { success: false };
        }
    }

    // ==================== CHECK STREAKS AT RISK ====================

    async checkStreaksAtRisk() {
        try {
            const now = new Date();
            const currentHour = now.getHours();

            // Only run this check between 8 PM and 11 PM
            if (currentHour < 20 || currentHour > 23) {
                return { success: false, message: 'Not the right time to check streaks' };
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Get all active habits with streaks
            const habits = await prisma.habit.findMany({
                where: {
                    isActive: true,
                    currentStreak: { gt: 0 }
                },
                include: {
                    completions: {
                        where: {
                            date: { gte: today }
                        }
                    }
                }
            });

            // Filter habits not completed today
            const habitsAtRisk = habits.filter(h => h.completions.length === 0);

            // Send notifications for each habit at risk
            for (const habit of habitsAtRisk) {
                await this.sendStreakRiskNotification(habit.id, habit.userId);
            }

            return {
                success: true,
                message: `Checked ${habits.length} habits, ${habitsAtRisk.length} at risk`,
                count: habitsAtRisk.length
            };
        } catch (error) {
            console.error('Failed to check streaks at risk:', error);
            return { success: false, message: error.message };
        }
    }

    // ==================== EMAIL TEMPLATES ====================

    getHabitReminderEmailTemplate(habit, user) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">⏰ Habit Reminder</h1>
        <p>Hi ${user.fullName || 'there'},</p>
        <p>Just a friendly reminder to complete your habit:</p>
        
        <div style="background-color: #f8f9fa; border-left: 4px solid #4CAF50; padding: 20px; margin: 20px 0;">
          <h2 style="margin: 0 0 10px 0; color: #333;">${habit.name}</h2>
          ${habit.description ? `<p style="color: #666; margin: 0;">${habit.description}</p>` : ''}
        </div>
        
        ${habit.currentStreak > 0 ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              🔥 <strong>Current Streak: ${habit.currentStreak} day${habit.currentStreak > 1 ? 's' : ''}</strong><br>
              Don't break your streak! Complete it today.
            </p>
          </div>
        ` : ''}
        
        <p>Keep building those great habits! 💪</p>
        
        <p>Best regards,<br>Elyxa AI Team</p>
      </div>
    `;
    }

    getDailyHabitsEmailTemplate(habits, user) {
        const habitsList = habits.map(h => `
      <li style="margin: 10px 0;">
        <strong>${h.name}</strong>
        ${h.currentStreak > 0 ? `<span style="color: #ff6b6b;">🔥 ${h.currentStreak}-day streak</span>` : ''}
      </li>
    `).join('');

        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">📋 Your Daily Habits</h1>
        <p>Hi ${user.fullName || 'there'},</p>
        <p>You have <strong>${habits.length}</strong> habit${habits.length > 1 ? 's' : ''} to complete today:</p>
        
        <ul style="list-style: none; padding: 0;">
          ${habitsList}
        </ul>
        
        <div style="background-color: #e3f2fd; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #1976d2;">
            💡 <strong>Tip:</strong> Start with the easiest habit first to build momentum!
          </p>
        </div>
        
        <p>You've got this! 🚀</p>
        
        <p>Best regards,<br>Elyxa AI Team</p>
      </div>
    `;
    }

    getStreakMilestoneEmailTemplate(habit, streak, user) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">🎉 Congratulations!</h1>
        <p>Hi ${user.fullName || 'there'},</p>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; padding: 30px; text-align: center; margin: 20px 0;">
          <h2 style="margin: 0 0 10px 0; font-size: 36px;">🔥 ${streak} Days!</h2>
          <p style="margin: 0; font-size: 18px;">You've completed "${habit.name}" for ${streak} days straight!</p>
        </div>
        
        <p>This is a huge achievement! Consistency is the key to building lasting habits, and you're proving that every single day.</p>
        
        ${streak === 7 ? '<p><strong>One week down!</strong> You\'re building serious momentum. Keep it going! 💪</p>' : ''}
        ${streak === 30 ? '<p><strong>A full month!</strong> This habit is becoming part of who you are. Amazing work! 🌟</p>' : ''}
        ${streak === 100 ? '<p><strong>100 days!</strong> You\'re officially a habit master! This is incredible dedication! 🏆</p>' : ''}
        
        <p>Keep up the amazing work!</p>
        
        <p>Best regards,<br>Elyxa AI Team</p>
      </div>
    `;
    }

    getStreakRiskEmailTemplate(habit, user) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #e74c3c;">⚠️ Streak at Risk!</h1>
        <p>Hi ${user.fullName || 'there'},</p>
        
        <div style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-size: 18px; color: #856404;">
            <strong>Your ${habit.currentStreak}-day streak for "${habit.name}" is about to break!</strong>
          </p>
          <p style="margin: 0; color: #856404;">
            You've worked so hard to build this streak. Don't let it slip away!
          </p>
        </div>
        
        <p>Take a moment right now to complete your habit. Even if it's just for a few minutes, it's worth keeping your streak alive.</p>
        
        <div style="background-color: #e3f2fd; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #1976d2;">
            💡 <strong>Remember:</strong> Progress over perfection. Even a small effort counts!
          </p>
        </div>
        
        <p>You've got this! 💪</p>
        
        <p>Best regards,<br>Elyxa AI Team</p>
      </div>
    `;
    }
}

module.exports = new HabitReminderService();
