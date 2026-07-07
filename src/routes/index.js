const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const goalRoutes = require('./goal.routes');
const planRoutes = require('./plan.routes');
const dailyPlanRoutes = require('./dailyPlan.routes');
const weeklyPlanRoutes = require('./weeklyPlan.routes');
const monthlyPlanRoutes = require('./monthlyPlan.routes');
const taskPlanRoutes = require('./taskPlan.routes');
const habitRoutes = require('./habit.routes');
const taskRoutes = require('./task.routes');
const plannerRoutes = require('./planner.routes');
const aiRoutes = require('./ai.routes');
const paymentRoutes = require('./payment.routes');
const notificationRoutes = require('./notification.routes');
const supportRoutes = require('./support.routes');
const feedbackRoutes = require('./feedback.routes');
const contactRoutes = require('./contact.routes');
const adminRoutes = require('./admin.routes');
const chatRoutes = require('./chat.routes');
const announcementRoutes = require('./announcement.routes');
const ticketRoutes = require('./ticketRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/goals', goalRoutes);
router.use('/plans', planRoutes);
router.use('/daily-plans', dailyPlanRoutes);
router.use('/weekly-plans', weeklyPlanRoutes);
router.use('/monthly-plans', monthlyPlanRoutes);
router.use('/task-plans', taskPlanRoutes);
router.use('/habits', habitRoutes);
router.use('/tasks', taskRoutes);
router.use('/planner', plannerRoutes);
router.use('/ai', aiRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/support', supportRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/contact', contactRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);
router.use('/user', announcementRoutes);
router.use('/tickets', ticketRoutes);

module.exports = router;
