const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const goalRoutes = require('./goal.routes');
const planRoutes = require('./plan.routes');
const habitRoutes = require('./habit.routes');
const taskRoutes = require('./task.routes');
const aiRoutes = require('./ai.routes');
const paymentRoutes = require('./payment.routes');
const notificationRoutes = require('./notification.routes');
const supportRoutes = require('./support.routes');
const feedbackRoutes = require('./feedback.routes');
const adminRoutes = require('./admin.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/goals', goalRoutes);
router.use('/plans', planRoutes);
router.use('/habits', habitRoutes);
router.use('/tasks', taskRoutes);
router.use('/ai', aiRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/support', supportRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
