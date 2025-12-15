const Stripe = require('stripe');
const prisma = require('../config/database');

class PaymentService {
  constructor() {
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'your-stripe-secret-key') {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
    }
  }
  
  // Create checkout session
  async createCheckoutSession(userId, plan) {
    if (!this.isConfigured) {
      throw new Error('Stripe not configured');
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    const priceIds = {
      STARTER: process.env.STRIPE_STARTER_PRICE_ID,
      PRO: process.env.STRIPE_PRO_PRICE_ID,
      ULTIMATE: process.env.STRIPE_ULTIMATE_PRICE_ID
    };
    
    const session = await this.stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceIds[plan],
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: {
        userId,
        plan
      }
    });
    
    return session;
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
  
  // Handle webhook
  async handleWebhook(event) {
    if (!this.isConfigured) {
      throw new Error('Stripe not configured');
    }
    
    switch (event.type) {
      case 'checkout.session.completed':
        await this._handleCheckoutCompleted(event.data.object);
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
  }
  
  // Private methods
  async _handleCheckoutCompleted(session) {
    const { userId, plan } = session.metadata;
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: 'ACTIVE',
        stripeCustomerId: session.customer,
        subscriptionStartDate: new Date()
      }
    });
    
    await prisma.payment.create({
      data: {
        userId,
        amount: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        status: 'COMPLETED',
        provider: 'STRIPE',
        stripePaymentIntentId: session.payment_intent,
        plan,
        paidAt: new Date()
      }
    });
  }
  
  async _handleSubscriptionUpdated(subscription) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer }
    });
    
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: subscription.status.toUpperCase(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        }
      });
    }
  }
  
  async _handleSubscriptionDeleted(subscription) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer }
    });
    
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionPlan: 'FREE',
          subscriptionStatus: 'CANCELED',
          subscriptionEndDate: new Date()
        }
      });
    }
  }
  
  async _handlePaymentSucceeded(invoice) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: invoice.customer }
    });
    
    if (user) {
      await prisma.payment.create({
        data: {
          userId: user.id,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          status: 'COMPLETED',
          provider: 'STRIPE',
          stripeInvoiceId: invoice.id,
          plan: user.subscriptionPlan,
          paidAt: new Date()
        }
      });
    }
  }
  
  async _handlePaymentFailed(invoice) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: invoice.customer }
    });
    
    if (user) {
      await prisma.payment.create({
        data: {
          userId: user.id,
          amount: invoice.amount_due / 100,
          currency: invoice.currency.toUpperCase(),
          status: 'FAILED',
          provider: 'STRIPE',
          stripeInvoiceId: invoice.id,
          plan: user.subscriptionPlan
        }
      });
      
      // Send payment failed email
      // await emailService.sendPaymentFailedEmail(user);
    }
  }
}

module.exports = new PaymentService();
