const nodemailer = require('nodemailer');
const prisma = require('../config/database');

class EmailService {
  constructor() {
    // Create SMTP transporter for Gmail
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      this.isConfigured = true;
      console.log('Email service configured with Gmail SMTP');
    } else {
      this.isConfigured = false;
      console.warn('Email service not configured');
    }
  }
  
  // Send email
  async sendEmail(to, subject, html, text = null) {
    if (!this.isConfigured) {
      console.warn('Email not configured, skipping email send');
      return null;
    }
    
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'Fellini AI'} <${process.env.FROM_EMAIL || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    };
    
    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully to:', to);
      return result;
    } catch (error) {
      console.error('Email error:', error);
      throw error;
    }
  }
  
  // Send OTP email
  async sendOTPEmail(email, fullName, otp) {
    const subject = 'Verify Your Email - Fellini AI';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Welcome to Fellini AI!</h1>
        <p>Hi ${fullName || 'there'},</p>
        <p>Thank you for registering with Fellini AI. Please verify your email address using the OTP below:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 30px 0;">
          <h2 style="color: #4CAF50; font-size: 36px; letter-spacing: 5px; margin: 0;">${otp}</h2>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't create an account with us, please ignore this email.</p>
        <p>Best regards,<br>Fellini AI Team</p>
      </div>
    `;
    
    return this.sendEmail(email, subject, html);
  }
  
  // Welcome email
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Fellini AI!';
    const html = `
      <h1>Welcome ${user.fullName || 'there'}!</h1>
      <p>We're excited to have you on board.</p>
      <p>Start by setting your first goal and let our AI help you achieve it.</p>
      <a href="${process.env.FRONTEND_URL}/dashboard">Go to Dashboard</a>
    `;
    
    await this.sendEmail(user.email, subject, html);
    
    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'WELCOME',
        channel: 'EMAIL',
        status: 'SENT',
        title: subject,
        message: 'Welcome to Fellini AI',
        sentAt: new Date()
      }
    });
  }
  
  // Email verification
  async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    const subject = 'Verify Your Email';
    const html = `
      <h1>Verify Your Email</h1>
      <p>Hi ${user.firstName},</p>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `;
    
    await this.sendEmail(user.email, subject, html);
  }
  
  // Password reset
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    const subject = 'Reset Your Password';
    const html = `
      <h1>Reset Your Password</h1>
      <p>Hi ${user.firstName},</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
    
    await this.sendEmail(user.email, subject, html);
  }
  
  // Subscription confirmation
  async sendSubscriptionConfirmation(user, plan) {
    const subject = `Subscription Confirmed - ${plan}`;
    const html = `
      <h1>Subscription Confirmed!</h1>
      <p>Hi ${user.firstName},</p>
      <p>Your ${plan} subscription is now active.</p>
      <p>Enjoy all the premium features!</p>
      <a href="${process.env.FRONTEND_URL}/dashboard">Go to Dashboard</a>
    `;
    
    await this.sendEmail(user.email, subject, html);
  }
  
  // Payment failed
  async sendPaymentFailedEmail(user) {
    const subject = 'Payment Failed';
    const html = `
      <h1>Payment Failed</h1>
      <p>Hi ${user.firstName},</p>
      <p>Your recent payment could not be processed.</p>
      <p>Please update your payment method to continue using premium features.</p>
      <a href="${process.env.FRONTEND_URL}/billing">Update Payment Method</a>
    `;
    
    await this.sendEmail(user.email, subject, html);
  }
  
  // Daily reminder
  async sendDailyReminder(user) {
    const subject = 'Your Daily Plan is Ready';
    const html = `
      <h1>Good Morning ${user.firstName}!</h1>
      <p>Your daily plan is ready. Let's make today productive!</p>
      <a href="${process.env.FRONTEND_URL}/plans/daily">View Daily Plan</a>
    `;
    
    await this.sendEmail(user.email, subject, html);
  }
  
  // Monthly summary
  async sendMonthlySummary(user, stats) {
    const subject = 'Your Monthly Summary';
    const html = `
      <h1>Monthly Summary</h1>
      <p>Hi ${user.firstName},</p>
      <p>Here's your progress this month:</p>
      <ul>
        <li>Goals Completed: ${stats.goalsCompleted || 0}</li>
        <li>Habits Maintained: ${stats.habitsCompleted || 0}</li>
        <li>Tasks Completed: ${stats.tasksCompleted || 0}</li>
        <li>Current Streak: ${stats.currentStreak || 0} days</li>
      </ul>
      <p>Keep up the great work!</p>
      <a href="${process.env.FRONTEND_URL}/analytics">View Full Analytics</a>
    `;
    
    await this.sendEmail(user.email, subject, html);
  }
}

module.exports = new EmailService();
