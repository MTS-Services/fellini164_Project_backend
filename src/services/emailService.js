const nodemailer = require('nodemailer');
const prisma = require('../config/database');

class EmailService {
  constructor() {
    // Create SMTP transporter for Mailgun
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
      console.log('Email service configured with Mailgun SMTP');
    } else {
      this.isConfigured = false;
      console.warn('Email service not configured');
    }
  }
  
  // Send email
  async sendEmail(to, subject, html, text = null, skipUnsubscribeCheck = false) {
    if (!this.isConfigured) {
      console.warn('Email not configured, skipping email send');
      return null;
    }

    // Check if user is unsubscribed (skip for critical emails)
    if (!skipUnsubscribeCheck) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: to },
          select: { isUnsubscribed: true }
        });
        
        if (user && user.isUnsubscribed) {
          console.log(`User ${to} is unsubscribed, skipping email`);
          return null;
        }
      } catch (error) {
        console.error('Error checking unsubscribe status:', error);
        // Continue with email send if check fails
      }
    }
    
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'Elyxa AI'} <${process.env.FROM_EMAIL || process.env.EMAIL_USER}>`,
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
    const subject = 'Verify Your Email - Elyxa AI';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Welcome to Elyxa AI!</h1>
        <p>Hi ${fullName || 'there'},</p>
        <p>Thank you for registering with Elyxa AI. Please verify your email address using the OTP below:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 30px 0;">
          <h2 style="color: #4CAF50; font-size: 36px; letter-spacing: 5px; margin: 0;">${otp}</h2>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't create an account with us, please ignore this email.</p>
        <p>Best regards,<br>Elyxa AI Team</p>
      </div>
    `;
    
    // Skip unsubscribe check for OTP emails (critical)
    return this.sendEmail(email, subject, html, null, true);
  }

  // Send Waitlist Confirmation Email
  async sendWaitlistConfirmationEmail(email, firstName, userId) {
    const unsubscribeUrl = `${process.env.FRONTEND_URL || 'https://elyxa.com'}/unsubscribe?userId=${userId}`;
    const subject = "You're on the Elyxa waitlist";
    
    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333;">
        <div style="margin-bottom: 40px;">
          <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 20px 0; color: #111;">Hi ${firstName || 'there'},</h1>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">You're officially on the <strong>Elyxa waitlist</strong>.</p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            We're building an AI system that adapts your daily plans, habits, and routines based on how you actually live — not rigid schedules.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Early access will roll out in small batches.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            When it's your turn, you'll receive an invite by email.
          </p>
          
          <div style="margin: 30px 0;">
            <p style="font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">In the meantime:</p>
            <ul style="font-size: 16px; line-height: 1.8; padding-left: 20px;">
              <li>We're refining the AI</li>
              <li>Improving onboarding</li>
              <li>Preparing something worth your time</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
            Thanks for joining early.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 10px 0 0 0;">
            We'll be in touch soon.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0; color: #666;">
            — Elyxa Team
          </p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 30px; margin-top: 40px;">
          <p style="font-size: 13px; line-height: 1.6; color: #999; margin: 0 0 10px 0;">
            You're receiving this email because you joined the Elyxa waitlist.
          </p>
          <p style="font-size: 13px; line-height: 1.6; color: #999; margin: 0;">
            <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe anytime</a>
          </p>
        </div>
      </div>
    `;
    
    return this.sendEmail(email, subject, html);
  }

  // Send Referral Reward Email
  async sendReferralRewardEmail(email, firstName, rewardAmount, referredUserName) {
    const subject = "You've earned a referral reward! 🎉";
    const unsubscribeUrl = `${process.env.FRONTEND_URL || 'https://elyxa.com'}/unsubscribe`;
    
    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333;">
        <div style="margin-bottom: 40px;">
          <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 20px 0; color: #111;">Great news, ${firstName || 'there'}!</h1>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            ${referredUserName || 'Someone'} just joined Elyxa using your referral link!
          </p>
          
          <div style="background-color: #f4f9f4; padding: 30px; text-align: center; margin: 30px 0; border-radius: 8px;">
            <p style="font-size: 14px; color: #666; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">You've earned</p>
            <h2 style="color: #4CAF50; font-size: 42px; margin: 0;">${rewardAmount} credits</h2>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
            Keep sharing your referral link to earn more rewards and move up the waitlist faster!
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://elyxa.com'}/referral" 
               style="display: inline-block; background-color: #4CAF50; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              View Your Referral Dashboard
            </a>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0; color: #666;">
            — Elyxa Team
          </p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 30px; margin-top: 40px;">
          <p style="font-size: 13px; line-height: 1.6; color: #999; margin: 0 0 10px 0;">
            You're receiving this email because you're an Elyxa user.
          </p>
          <p style="font-size: 13px; line-height: 1.6; color: #999; margin: 0;">
            <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe anytime</a>
          </p>
        </div>
      </div>
    `;
    
    return this.sendEmail(email, subject, html);
  }

  // Send Early Access Invitation Email (When invited by referral)
  async sendEarlyAccessInvitationEmail(email, firstName, referrerName, referralCode) {
    const earlyAccessLink = `${process.env.FRONTEND_URL || 'https://elyxaai.com'}/signup?ref=${referralCode}`;
    const subject = "You're Invited — Early Access to Elyxa";
    
    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333;">
        <div style="margin-bottom: 40px;">
          <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 30px 0; color: #111;">You're Invited</h1>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hi ${firstName || 'there'},
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-weight: 600;">
            You're in.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            You've been selected for early access to <strong>Elyxa</strong> — our adaptive AI designed to help you plan your days, habits, and goals around how you actually live.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 20px 0 10px 0; font-weight: 600;">
            This early version includes:
          </p>
          <ul style="font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 30px 0;">
            <li>Adaptive daily planning</li>
            <li>Weekly & monthly structure</li>
            <li>Personalized AI insights</li>
            <li>Priority access to upcoming features</li>
          </ul>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 20px 0 10px 0; font-weight: 600;">
            Your invite link:
          </p>
          
          <div style="background-color: #f8f8f8; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <a href="${earlyAccessLink}" 
               style="display: inline-block; background-color: #111; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              👉 Activate your access
            </a>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; margin: 20px 0; color: #666;">
            Early access is limited, so we recommend joining soon.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0; font-weight: 600;">
            Welcome to Elyxa.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 10px 0 0 0;">
            We're excited to have you early.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0; color: #666;">
            — Elyxa Team
          </p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 30px; margin-top: 40px;">
          <p style="font-size: 13px; line-height: 1.6; color: #999; margin: 0;">
            You're receiving this email because ${referrerName || 'someone'} invited you to join Elyxa.
          </p>
        </div>
      </div>
    `;
    
    return this.sendEmail(email, subject, html, null, true);
  }

  // Send Referral Link Email (Encourage user to share)
  async sendReferralLinkEmail(email, firstName, referralCode) {
    const referralLink = `${process.env.FRONTEND_URL || 'https://elyxaai.com'}/signup?ref=${referralCode}`;
    const subject = "Your Personal Invite Link — Move Up the Waitlist";
    
    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333;">
        <div style="margin-bottom: 40px;">
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hi ${firstName || 'there'},
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            We're inviting users to <strong>Elyxa</strong> in small groups to keep the experience high quality.
          </p>
          
          <p style="font-size: 18px; line-height: 1.6; margin: 30px 0 20px 0; font-weight: 600;">
            Want access sooner?
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            You can move up the waitlist by inviting friends using your personal link below.
          </p>
          
          <div style="background-color: #f8f8f8; padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px dashed #ddd;">
            <p style="font-size: 14px; color: #666; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
              Your Invite Link
            </p>
            <a href="${referralLink}" 
               style="display: inline-block; background-color: #111; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-bottom: 15px;">
              👉 ${referralLink}
            </a>
            <p style="font-size: 13px; color: #999; margin: 15px 0 0 0;">
              Your referral code: <strong>${referralCode}</strong>
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
            Each friend who joins brings you closer to early access — and unlocks bonus rewards along the way.
          </p>
          
          <div style="background-color: #f4f9f4; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <p style="font-size: 15px; line-height: 1.6; margin: 0; color: #333;">
              💡 <strong>Tip:</strong> Share this link with friends who value productivity, planning, and AI-powered personal growth.
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
            Thanks for helping us grow Elyxa the right way.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 30px 0 0 0; color: #666;">
            — Elyxa Team
          </p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 30px; margin-top: 40px;">
          <p style="font-size: 13px; line-height: 1.6; color: #999; margin: 0 0 10px 0;">
            You're receiving this email because you're on the Elyxa waitlist.
          </p>
        </div>
      </div>
    `;
    
    return this.sendEmail(email, subject, html);
  }
  
  // Send Password Reset OTP email
  async sendPasswordResetOTP(email, fullName, otp) {
    const subject = 'Reset Your Password - Fellini AI';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p>Hi ${fullName || 'there'},</p>
        <p>We received a request to reset your password. Please use the OTP below to reset your password:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 30px 0;">
          <h2 style="color: #FF5722; font-size: 36px; letter-spacing: 5px; margin: 0;">${otp}</h2>
        </div>
        <p>This OTP will expire in 15 minutes.</p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>Fellini AI Team</p>
      </div>
    `;
    
    // Skip unsubscribe check for password reset (critical)
    return this.sendEmail(email, subject, html, null, true);
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
