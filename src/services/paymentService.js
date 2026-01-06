const Stripe = require('stripe');
const prisma = require('../config/database');
const { PLAN_PRICES } = require('../utils/constants');

class PaymentService {
  constructor() {
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      this.isConfigured = true;
      console.log('Stripe payment service configured');
    } else {
      this.isConfigured = false;
      console.warn('Stripe not configured');
    }
  }
  
  // Create checkout session for subscription
  async createCheckoutSession(userId, plan, billingPeriod = 'monthly') {
    if (!this.isConfigured) {
      throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to .env');
    }
    
    if (!['STARTER', 'PRO', 'ULTIMATE'].includes(plan)) {
      throw new Error('Invalid subscription plan');
    }

    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      throw new Error('Invalid billing period. Must be "monthly" or "yearly"');
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        stripeCustomerId: true
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: {
          userId: user.id
        }
      });
      customerId = customer.id;
      
      // Save customer ID
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId }
      });
    }
    
    const planPrice = PLAN_PRICES[plan][billingPeriod];
    
    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: planPrice.currency,
            product_data: {
              name: `${plan} Plan - ${billingPeriod === 'yearly' ? 'Annual' : 'Monthly'}`,
              description: this._getPlanDescription(plan)
            },
            unit_amount: planPrice.amount,
            recurring: {
              interval: billingPeriod === 'yearly' ? 'year' : 'month'
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/payment/success',
      cancel_url: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/payment/cancel',
      metadata: {
        userId: user.id,
        plan: plan,
        billingPeriod: billingPeriod
      }
    });
    
    return {
      sessionId: session.id,
      url: session.url
    };
  }
  
  // Get plan description
  _getPlanDescription(plan) {
    const descriptions = {
      STARTER: '1 AI Persona, Unlimited AI Chat, Unlimited task planning, Daily Automation, Basic goal analysis',
      PRO: 'Everything in Starter + 3 AI Personas, Weekly & Monthly Planning, AI productivity analysis, Weekly review reports',
      ULTIMATE: 'Everything in Pro + AI Life Blueprint, AI voice coach, AI routine optimizer'
    };
    return descriptions[plan] || '';
  }
  
  // Create billing portal session
  async createBillingPortalSession(userId) {
    if (!this.isConfigured) {
      throw new Error('Stripe not configured');
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user.stripeCustomerId) {
      throw new Error('No Stripe customer ID found');
    }
    
    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`
    });
    
    return session;
  }
  
  // Handle Stripe webhook events with signature verification
  async handleWebhook(rawBody, signature) {
    if (!this.isConfigured) {
      throw new Error('Stripe not configured');
    }
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }
    
    // Verify webhook signature
    let event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }
    
    console.log(`Processing webhook event: ${event.type}`);
    
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this._handleCheckoutCompleted(event.data.object);
          break;
          
        case 'customer.subscription.created':
          await this._handleSubscriptionCreated(event.data.object);
          break;
          
        case 'customer.subscription.updated':
          await this._handleSubscriptionUpdated(event.data.object);
          break;
          
        case 'customer.subscription.deleted':
          await this._handleSubscriptionDeleted(event.data.object);
          break;
          
        case 'invoice.payment_succeeded':
          await this._handlePaymentSucceeded(event.data.object);
          break;
          
        case 'invoice.payment_failed':
          await this._handlePaymentFailed(event.data.object);
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      return { received: true };
    } catch (error) {
      console.error('Webhook handler error:', error);
      throw error;
    }
  }
  
  // Get subscription status
  async getSubscriptionStatus(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        stripeCustomerId: true
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    let stripeSubscription = null;
    
    // Get active subscription from Stripe
    if (user.stripeCustomerId && this.isConfigured) {
      try {
        const subscriptions = await this.stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 1
        });
        
        if (subscriptions.data.length > 0) {
          stripeSubscription = subscriptions.data[0];
        }
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error);
      }
    }
    
    const planInfo = PLAN_PRICES[user.subscriptionPlan] || null;
    
    return {
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      startDate: user.subscriptionStartDate,
      endDate: user.subscriptionEndDate,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      price: planInfo ? planInfo.display : 'Free',
      stripeSubscriptionId: stripeSubscription ? stripeSubscription.id : null,
      nextBillingDate: stripeSubscription ? new Date(stripeSubscription.current_period_end * 1000) : null
    };
  }
  
  // Cancel subscription
  async cancelSubscription(userId) {
    if (!this.isConfigured) {
      throw new Error('Stripe not configured');
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true }
    });
    
    if (!user || !user.stripeCustomerId) {
      throw new Error('No active subscription found');
    }
    
    // Get active subscriptions
    const subscriptions = await this.stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1
    });
    
    if (subscriptions.data.length === 0) {
      throw new Error('No active subscription found');
    }
    
    const subscription = subscriptions.data[0];
    
    // Cancel at period end (don't cancel immediately)
    await this.stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true
    });
    
    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        cancelAtPeriodEnd: true
      }
    });
    
    return {
      message: 'Subscription will be canceled at the end of the billing period',
      cancelAt: new Date(subscription.current_period_end * 1000)
    };
  }
  
  // Reactivate canceled subscription
  async reactivateSubscription(userId) {
    if (!this.isConfigured) {
      throw new Error('Stripe not configured');
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true }
    });
    
    if (!user || !user.stripeCustomerId) {
      throw new Error('No subscription found');
    }
    
    // Get active subscriptions
    const subscriptions = await this.stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1
    });
    
    if (subscriptions.data.length === 0) {
      throw new Error('No active subscription found');
    }
    
    const subscription = subscriptions.data[0];
    
    // Remove cancellation
    await this.stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false
    });
    
    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        cancelAtPeriodEnd: false
      }
    });
    
    return {
      message: 'Subscription reactivated successfully'
    };
  }
  
  // Get payment history
  async getPaymentHistory(userId) {
    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    return payments;
  }
  
  // Private webhook handlers
  async _handleCheckoutCompleted(session) {
    const { userId, plan, billingPeriod } = session.metadata;
    
    if (!userId || !plan) {
      console.error('Missing metadata in checkout session');
      return;
    }
    
    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date();
    
    // Calculate end date based on billing period
    if (billingPeriod === 'yearly') {
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
    } else {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    }
    
    // Update user subscription and activate account
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: 'ACTIVE',
        subscriptionStartDate,
        subscriptionEndDate,
        currentPeriodEnd: subscriptionEndDate,
        cancelAtPeriodEnd: false,
        userStatus: 'ACTIVE' // Activate from WAITLIST
      }
    });
    
    // Fetch the invoice to get invoice ID
    let invoiceId = null;
    if (session.subscription) {
      try {
        const subscription = await this.stripe.subscriptions.retrieve(session.subscription);
        if (subscription.latest_invoice) {
          invoiceId = subscription.latest_invoice;
        }
      } catch (err) {
        console.error('Error fetching invoice:', err);
      }
    }
    
    // Create payment record
    await prisma.payment.create({
      data: {
        userId,
        amount: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        status: 'COMPLETED',
        provider: 'STRIPE',
        stripePaymentIntentId: session.payment_intent,
        stripeInvoiceId: invoiceId,
        plan,
        billingPeriod: billingPeriod || 'monthly',
        description: `${plan} Plan - ${billingPeriod === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
        paidAt: new Date()
      }
    });
    
    console.log(`✅ Subscription activated for user ${userId}: ${plan} (${billingPeriod || 'monthly'})`);
  }
  
  async _handleSubscriptionCreated(subscription) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer }
    });
    
    if (user) {
      console.log(`Subscription created for user ${user.id}`);
    }
  }
  
  async _handleSubscriptionUpdated(subscription) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer }
    });
    
    if (user) {
      const statusMap = {
        'active': 'ACTIVE',
        'past_due': 'PAST_DUE',
        'canceled': 'CANCELED',
        'unpaid': 'PAST_DUE',
        'incomplete': 'ACTIVE',
        'incomplete_expired': 'CANCELED',
        'trialing': 'TRIALING',
        'paused': 'PAUSED'
      };
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: statusMap[subscription.status] || 'ACTIVE',
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        }
      });
      
      console.log(`Subscription updated for user ${user.id}: ${subscription.status}`);
    }
  }
  
  async _handleSubscriptionDeleted(subscription) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer }
    });
    
    if (user) {
      // Downgrade to FREE plan
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionPlan: 'FREE',
          subscriptionStatus: 'CANCELED',
          subscriptionEndDate: new Date(),
          cancelAtPeriodEnd: false
        }
      });
      
      console.log(`Subscription canceled for user ${user.id}, downgraded to FREE`);
    }
  }
  
  async _handlePaymentSucceeded(invoice) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: invoice.customer }
    });
    
    if (user && invoice.subscription) {
      // Get subscription to determine billing period
      let billingPeriod = 'monthly';
      try {
        const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
        const interval = subscription.items.data[0]?.price?.recurring?.interval;
        billingPeriod = interval === 'year' ? 'yearly' : 'monthly';
      } catch (err) {
        console.error('Error fetching subscription for billing period:', err);
      }
      
      // Record successful payment with invoice ID
      await prisma.payment.create({
        data: {
          userId: user.id,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          status: 'COMPLETED',
          provider: 'STRIPE',
          stripePaymentIntentId: invoice.payment_intent,
          stripeInvoiceId: invoice.id,
          plan: user.subscriptionPlan,
          billingPeriod: billingPeriod,
          description: `${user.subscriptionPlan} Plan - Recurring Payment`,
          paidAt: new Date()
        }
      });
      
      console.log(`✅ Payment succeeded for user ${user.id}: $${invoice.amount_paid / 100}, Invoice: ${invoice.id}`);
    }
  }
  
  async _handlePaymentFailed(invoice) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: invoice.customer }
    });
    
    if (user) {
      // Record failed payment with invoice ID
      await prisma.payment.create({
        data: {
          userId: user.id,
          amount: invoice.amount_due / 100,
          currency: invoice.currency.toUpperCase(),
          status: 'FAILED',
          provider: 'STRIPE',
          stripeInvoiceId: invoice.id,
          plan: user.subscriptionPlan,
          description: `${user.subscriptionPlan} Plan - Payment Failed`
        }
      });
      
      // Update subscription status
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: 'PAST_DUE'
        }
      });
      
      console.log(`❌ Payment failed for user ${user.id}, Invoice: ${invoice.id}`);
      // Send payment failed email
      // await emailService.sendPaymentFailedEmail(user);
    }
  }
}

module.exports = new PaymentService();
