const Stripe = require('stripe');
const prisma = require('../config/database');
const emailService = require('./emailService');

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

    // Get pricing config from database (with Stripe Price IDs)
    const pricingConfig = await prisma.pricingConfig.findUnique({
      where: { plan: plan },
      select: {
        stripePriceIdMonthly: true,
        stripePriceIdYearly: true,
        monthlyPrice: true,
        yearlyPrice: true
      }
    });

    if (!pricingConfig) {
      throw new Error(`Pricing configuration not found for ${plan} plan`);
    }

    const stripePriceId = billingPeriod === 'yearly'
      ? pricingConfig.stripePriceIdYearly
      : pricingConfig.stripePriceIdMonthly;

    if (!stripePriceId) {
      throw new Error(`Stripe Price ID not configured for ${plan} plan (${billingPeriod})`);
    }

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


      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId }
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'link'], // Added 'link' for Google Pay/Apple Pay
      line_items: [
        {
          price: stripePriceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}',
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

  // Handle payment success from redirect
  async handlePaymentSuccess(sessionId) {
    if (!this.isConfigured) {
      throw new Error('Stripe not configured');
    }

    try {
      // Retrieve the checkout session from Stripe
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'line_items']
      });

      console.log('Processing payment success for session:', sessionId);

      // Verify the payment was successful
      if (session.payment_status !== 'paid') {
        throw new Error('Payment not completed');
      }

      // Get metadata
      const { userId, plan, billingPeriod, paymentType } = session.metadata;

      if (!userId || !plan) {
        throw new Error('Missing required metadata');
      }

      // Ensure userId is a string for Prisma
      const userIdString = String(userId);


      if (paymentType === 'one_time_30_days') {
        return await this._handleOneTimePaymentSuccess(session, userIdString, plan);
      }

      const whereConditions = [
        { stripeCheckoutSessionId: session.id }
      ];


      if (session.payment_intent) {
        whereConditions.push({ stripePaymentIntentId: session.payment_intent });
      }

      const existingPayment = await prisma.payment.findFirst({
        where: {
          OR: whereConditions
        },
        select: {
          id: true,
          userId: true,
          plan: true,
          status: true
        }
      });

      if (existingPayment) {
        console.log(`Payment already processed for session: ${sessionId}`);
        console.log(`Payment details: userId=${existingPayment.userId}, plan=${existingPayment.plan}, status=${existingPayment.status}`);

        // Verify user's plan is updated correctly
        const user = await prisma.user.findUnique({
          where: { id: existingPayment.userId },
          select: {
            id: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
            email: true
          }
        });

        if (!user) {
          console.error(`❌ User not found: ${existingPayment.userId}`);
          throw new Error('User not found');
        }

        console.log(`Current user state: userId=${user.id}, plan=${user.subscriptionPlan}, email=${user.email}`);
        console.log(`Expected plan from payment: ${existingPayment.plan}`);

        // If user plan doesn't match payment, update it now
        if (user.subscriptionPlan !== existingPayment.plan) {
          console.log(`⚠️ PLAN MISMATCH DETECTED!`);
          console.log(`   Current: ${user.subscriptionPlan} → Should be: ${existingPayment.plan}`);
          console.log(`   Updating now...`);

          const subscriptionStartDate = new Date();
          const subscriptionEndDate = new Date();
          if (billingPeriod === 'yearly') {
            subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
          } else {
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
          }

          try {
            await prisma.user.update({
              where: { id: existingPayment.userId },
              data: {
                subscriptionPlan: existingPayment.plan,
                subscriptionStatus: 'ACTIVE',
                subscriptionStartDate,
                subscriptionEndDate,
                currentPeriodEnd: subscriptionEndDate,
                cancelAtPeriodEnd: false,
                userStatus: 'ACTIVE',
                stripeCustomerId: session.customer
              }
            });

            console.log(`✅ SUCCESS! User ${existingPayment.userId} plan updated to ${existingPayment.plan}`);

            return {
              alreadyProcessed: true,
              plan: existingPayment.plan,
              billingPeriod,
              correctedPlan: true,
              updatedTo: existingPayment.plan,
              subscriptionEndDate
            };
          } catch (error) {
            console.error(`❌ FAILED to update user plan:`, error);
            throw new Error(`Failed to update user plan: ${error.message}`);
          }
        } else {
          console.log(`✓ User plan already correct: ${user.subscriptionPlan}`);
          return {
            alreadyProcessed: true,
            plan: existingPayment.plan,
            billingPeriod,
            correctedPlan: false,
            alreadyCorrect: true
          };
        }
      }

      const subscriptionStartDate = new Date();
      const subscriptionEndDate = new Date();

      if (billingPeriod === 'yearly') {
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
      } else {
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      }

      // Get subscription details for invoice ID and subscription ID
      let invoiceId = null;
      if (session.subscription) {
        try {
          const subscription = await this.stripe.subscriptions.retrieve(session.subscription);
          if (subscription.latest_invoice) {
            invoiceId = subscription.latest_invoice;
          }
        } catch (err) {
          console.error('Error fetching subscription details:', err);
        }
      }

      // Update user subscription and activate account
      await prisma.user.update({
        where: { id: userIdString },
        data: {
          subscriptionPlan: plan,
          subscriptionStatus: 'ACTIVE',
          subscriptionStartDate,
          subscriptionEndDate,
          currentPeriodEnd: subscriptionEndDate,
          cancelAtPeriodEnd: false,
          userStatus: 'ACTIVE',
          stripeCustomerId: session.customer
        }
      });

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          userId: userIdString,
          amount: session.amount_total / 100,
          currency: session.currency.toUpperCase(),
          status: 'COMPLETED',
          provider: 'STRIPE',
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: session.payment_intent,
          stripeInvoiceId: invoiceId,
          plan,
          billingPeriod: billingPeriod || 'monthly',
          description: `${plan} Plan - ${billingPeriod === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
          paidAt: new Date()
        }
      });

      console.log(`✅ Subscription activated for user ${userIdString}: ${plan} (${billingPeriod || 'monthly'})`);

      // Create activity logs for subscription and payment
      try {
        await prisma.activityLog.create({
          data: {
            userId: userIdString,
            type: 'SUBSCRIPTION_STARTED',
            description: `Started ${plan} subscription (${billingPeriod})`,
            metadata: {
              plan,
              billingPeriod,
              amount: session.amount_total / 100,
              currency: session.currency.toUpperCase(),
              sessionId: session.id
            }
          }
        });

        await prisma.activityLog.create({
          data: {
            userId: userIdString,
            type: 'PAYMENT_SUCCEEDED',
            description: `Payment succeeded for ${plan} plan - $${session.amount_total / 100}`,
            metadata: {
              paymentId: payment.id,
              amount: session.amount_total / 100,
              currency: session.currency.toUpperCase(),
              plan,
              billingPeriod
            }
          }
        });

        console.log('📊 Activity logs created for subscription and payment');
      } catch (logError) {
        console.error('Failed to create activity logs:', logError);
        // Don't throw - log failure shouldn't block payment success
      }

      // Send subscription confirmation email
      try {
        const user = await prisma.user.findUnique({
          where: { id: userIdString },
          select: { email: true, fullName: true }
        });

        if (user && user.email) {
          await emailService.sendSubscriptionConfirmation(
            { email: user.email, firstName: user.fullName },
            plan
          );
          console.log(`📧 Subscription confirmation email sent to ${user.email}`);
        }
      } catch (emailError) {
        console.error('Failed to send subscription confirmation email:', emailError);
        // Don't throw - email failure shouldn't block payment success
      }

      return {
        success: true,
        plan,
        billingPeriod,
        subscriptionEndDate,
        paymentId: payment.id
      };

    } catch (error) {
      console.error('Error processing payment success:', error);
      throw error;
    }
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
        trialEndsAt: true, // Add trial field
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        stripeCustomerId: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate trial info
    const isTrial = user.subscriptionStatus === 'TRIALING';
    let trialDaysRemaining = 0;
    let trialEndsAt = null;

    if (isTrial && user.trialEndsAt) {
      trialEndsAt = user.trialEndsAt;
      const now = new Date();
      const trialEnd = new Date(user.trialEndsAt);
      const diffMs = trialEnd - now;
      trialDaysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // If negative, trial has expired
      if (trialDaysRemaining < 0) {
        trialDaysRemaining = 0;
      }
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

    // Get pricing info from database
    let priceDisplay = 'Free';
    if (user.subscriptionPlan && user.subscriptionPlan !== 'FREE') {
      try {
        const pricingConfig = await prisma.pricingConfig.findUnique({
          where: { plan: user.subscriptionPlan },
          select: {
            monthlyPrice: true,
            yearlyPrice: true
          }
        });

        if (pricingConfig) {
          // Determine billing period from Stripe subscription interval
          const isYearly = stripeSubscription?.items?.data[0]?.plan?.interval === 'year';
          const price = isYearly ? pricingConfig.yearlyPrice : pricingConfig.monthlyPrice;
          const period = isYearly ? '/year' : '/month';
          priceDisplay = `$${price}${period}`;
        }
      } catch (error) {
        console.error('Error fetching pricing config:', error);
      }
    }


    let displayStatus = user.subscriptionStatus;
    if (user.cancelAtPeriodEnd && user.subscriptionStatus === 'ACTIVE') {
      displayStatus = 'ACTIVE_UNTIL_PERIOD_END';
    }

    return {
      plan: user.subscriptionPlan,
      status: displayStatus,
      rawStatus: user.subscriptionStatus,
      isTrial: isTrial,
      trialEndsAt: trialEndsAt,
      trialDaysRemaining: trialDaysRemaining,
      startDate: user.subscriptionStartDate,
      endDate: user.subscriptionEndDate,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      willRenew: !user.cancelAtPeriodEnd && !isTrial, // Don't renew during trial
      price: priceDisplay,
      stripeSubscriptionId: stripeSubscription ? stripeSubscription.id : null,
      nextBillingDate: stripeSubscription && !user.cancelAtPeriodEnd ? new Date(stripeSubscription.current_period_end * 1000) : null
    };
  }

  // Cancel subscription
  async cancelSubscription(userId) {
    if (!this.isConfigured) {
      throw new Error('Stripe not configured');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripeCustomerId: true,
        subscriptionPlan: true,
        subscriptionStatus: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.subscriptionPlan || user.subscriptionPlan === 'FREE') {
      throw new Error('You do not have an active paid subscription');
    }

    if (user.subscriptionStatus !== 'ACTIVE') {
      throw new Error(`Your subscription is already ${user.subscriptionStatus}`);
    }

    if (!user.stripeCustomerId) {
      throw new Error('No Stripe customer found. Please contact support.');
    }

    // Get active subscriptions from Stripe
    const subscriptions = await this.stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      throw new Error('No active subscription found in Stripe. Your subscription may still be processing. Please try again in a few minutes or contact support.');
    }

    const subscription = subscriptions.data[0];

    // Cancel at period end (don't cancel immediately)
    await this.stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true
    });


    await prisma.user.update({
      where: { id: userId },
      data: {
        cancelAtPeriodEnd: true
      }
    });

    return {
      message: 'Subscription will be canceled at the end of the billing period',
      cancelAt: new Date(subscription.current_period_end * 1000),
      plan: user.subscriptionPlan,
      accessUntil: new Date(subscription.current_period_end * 1000)
    };
  }

  // Reactivate canceled subscription
  async reactivateSubscription(userId) {
    if (!this.isConfigured) {
      throw new Error('Stripe not configured');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripeCustomerId: true,
        cancelAtPeriodEnd: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.stripeCustomerId) {
      throw new Error('No subscription found');
    }

    if (!user.cancelAtPeriodEnd) {
      throw new Error('Your subscription is not scheduled for cancellation');
    }

    // Get active subscriptions from Stripe
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


    await prisma.user.update({
      where: { id: userId },
      data: {
        cancelAtPeriodEnd: false
      }
    });

    return {
      message: 'Subscription reactivated successfully',
      continuesUntil: new Date(subscription.current_period_end * 1000)
    };
  }

  // Create one-time payment checkout for 30-day access
  async createOneTimeCheckout(userId, plan) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to .env');
    }

    if (!['STARTER', 'PRO', 'ULTIMATE'].includes(plan)) {
      throw new Error('Invalid plan selected');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        stripeCustomerId: true,
        subscriptionPlan: true,
        subscriptionStatus: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }


    const pricingConfig = await prisma.pricingConfig.findUnique({
      where: { plan: plan },
      select: {
        monthlyPrice: true
      }
    });

    if (!pricingConfig) {
      throw new Error(`Pricing configuration not found for ${plan} plan`);
    }

    // Calculate 30-day price (same as monthly price)
    const amount = Math.round(pricingConfig.monthlyPrice * 100); // Convert to cents


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

    // Create one-time checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'link'], // Added 'link' for Google Pay/Apple Pay
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan} Plan - 30 Day Access`,
              description: `One-time payment for 30 days of ${plan} plan access (no auto-renewal)`
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      mode: 'payment', // ONE-TIME payment, not subscription
      success_url: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/payment/cancel',
      metadata: {
        userId: user.id,
        plan: plan,
        paymentType: 'one_time_30_days'
      }
    });

    return {
      sessionId: session.id,
      url: session.url
    };
  }

  // Change subscription plan (upgrade/downgrade)
  async changeSubscription(userId, newPlan, billingPeriod = 'monthly') {
    if (!this.isConfigured) {
      throw new Error('Stripe not configured');
    }

    if (!['STARTER', 'PRO', 'ULTIMATE'].includes(newPlan)) {
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
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripeCustomerId: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has this plan
    if (user.subscriptionPlan === newPlan) {
      throw new Error(`You are already on the ${newPlan} plan`);
    }

    // Check if user has an active subscription
    if (!user.stripeCustomerId) {
      throw new Error('No existing subscription found. Please create a new subscription instead.');
    }

    if (user.subscriptionStatus !== 'ACTIVE') {
      throw new Error(`Cannot change plan while subscription is ${user.subscriptionStatus}. Please contact support.`);
    }

    // Get pricing config from database
    const pricingConfig = await prisma.pricingConfig.findUnique({
      where: { plan: newPlan },
      select: {
        stripePriceIdMonthly: true,
        stripePriceIdYearly: true,
        monthlyPrice: true,
        yearlyPrice: true
      }
    });

    if (!pricingConfig) {
      throw new Error(`Pricing configuration not found for ${newPlan} plan`);
    }

    // Get the appropriate Stripe Price ID
    const stripePriceId = billingPeriod === 'yearly'
      ? pricingConfig.stripePriceIdYearly
      : pricingConfig.stripePriceIdMonthly;

    if (!stripePriceId) {
      throw new Error(`Stripe Price ID not configured for ${newPlan} plan (${billingPeriod})`);
    }

    // Get current active subscription from Stripe
    const subscriptions = await this.stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      throw new Error('No active subscription found in Stripe');
    }

    const currentSubscription = subscriptions.data[0];
    const currentPriceId = currentSubscription.items.data[0].price.id;


    if (currentPriceId === stripePriceId) {
      throw new Error(`You are already subscribed to ${newPlan} (${billingPeriod})`);
    }

    // Determine if this is an upgrade or downgrade
    const planHierarchy = { 'STARTER': 1, 'PRO': 2, 'ULTIMATE': 3 };
    const isUpgrade = planHierarchy[newPlan] > planHierarchy[user.subscriptionPlan];

    // Update the subscription in Stripe
    const updatedSubscription = await this.stripe.subscriptions.update(
      currentSubscription.id,
      {
        items: [{
          id: currentSubscription.items.data[0].id,
          price: stripePriceId
        }],
        proration_behavior: 'always_invoice',
        metadata: {
          userId: user.id,
          plan: newPlan,
          billingPeriod: billingPeriod,
          changeType: isUpgrade ? 'upgrade' : 'downgrade'
        }
      }
    );

    // Calculate new subscription end date
    const subscriptionEndDate = new Date(updatedSubscription.current_period_end * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: newPlan,
        subscriptionStatus: 'ACTIVE',
        currentPeriodEnd: subscriptionEndDate,
        cancelAtPeriodEnd: false
      }
    });

    // Create payment record for the plan change
    const prorationAmount = updatedSubscription.latest_invoice
      ? await this.stripe.invoices.retrieve(updatedSubscription.latest_invoice)
      : null;

    if (prorationAmount && prorationAmount.amount_paid > 0) {
      await prisma.payment.create({
        data: {
          userId: userId,
          amount: prorationAmount.amount_paid / 100,
          currency: prorationAmount.currency.toUpperCase(),
          status: 'COMPLETED',
          provider: 'STRIPE',
          stripePaymentIntentId: prorationAmount.payment_intent,
          stripeInvoiceId: prorationAmount.id,
          plan: newPlan,
          billingPeriod: billingPeriod,
          description: `${isUpgrade ? 'Upgrade' : 'Downgrade'} to ${newPlan} Plan (${billingPeriod})`,
          paidAt: new Date()
        }
      });
    }

    console.log(`✅ User ${userId} ${isUpgrade ? 'upgraded' : 'downgraded'} to ${newPlan} (${billingPeriod})`);

    // Create activity log for plan change
    try {
      await prisma.activityLog.create({
        data: {
          userId: userId,
          type: isUpgrade ? 'SUBSCRIPTION_UPGRADED' : 'SUBSCRIPTION_DOWNGRADED',
          description: `${isUpgrade ? 'Upgraded' : 'Downgraded'} subscription to ${newPlan} (${billingPeriod})`,
          metadata: {
            oldPlan: user.subscriptionPlan,
            newPlan,
            billingPeriod,
            prorationAmount: prorationAmount ? prorationAmount.amount_paid / 100 : 0,
            changeType: isUpgrade ? 'upgrade' : 'downgrade'
          }
        }
      });

      // Also log payment if there was a proration charge
      if (prorationAmount && prorationAmount.amount_paid > 0) {
        await prisma.activityLog.create({
          data: {
            userId: userId,
            type: 'PAYMENT_SUCCEEDED',
            description: `Payment succeeded for plan change - $${prorationAmount.amount_paid / 100}`,
            metadata: {
              amount: prorationAmount.amount_paid / 100,
              currency: prorationAmount.currency.toUpperCase(),
              plan: newPlan,
              billingPeriod,
              isProration: true
            }
          }
        });
      }

      console.log('📊 Activity logs created for plan change');
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
      // Don't throw - log failure shouldn't block plan change
    }

    return {
      message: `Successfully ${isUpgrade ? 'upgraded' : 'downgraded'} to ${newPlan} plan`,
      plan: newPlan,
      billingPeriod: billingPeriod,
      changeType: isUpgrade ? 'upgrade' : 'downgrade',
      currentPeriodEnd: subscriptionEndDate,
      prorationAmount: prorationAmount ? prorationAmount.amount_paid / 100 : 0
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

  // Handle one-time payment success (30 days access)
  async _handleOneTimePaymentSuccess(session, userId, plan) {

    const userIdString = String(userId);

    const whereConditions = [
      { stripeCheckoutSessionId: session.id }
    ];

    if (session.payment_intent) {
      whereConditions.push({ stripePaymentIntentId: session.payment_intent });
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        OR: whereConditions
      }
    });

    if (existingPayment) {
      console.log('One-time payment already processed for session:', session.id);
      return {
        alreadyProcessed: true,
        plan,
        paymentType: 'one_time_30_days'
      };
    }

    // Calculate 30-day access period
    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

    await prisma.user.update({
      where: { id: userIdString },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: 'ACTIVE',
        subscriptionStartDate,
        subscriptionEndDate,
        currentPeriodEnd: subscriptionEndDate,
        cancelAtPeriodEnd: true,
        userStatus: 'ACTIVE',
        stripeCustomerId: session.customer
      }
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: userIdString,
        amount: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        status: 'COMPLETED',
        provider: 'STRIPE',
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        plan,
        billingPeriod: 'one_time',
        description: `${plan} Plan - One-Time 30 Day Access (No Auto-Renewal)`,
        paidAt: new Date()
      }
    });

    console.log(`✅ One-time payment: User ${userIdString} granted 30-day ${plan} access (expires: ${subscriptionEndDate})`);

    return {
      success: true,
      plan,
      paymentType: 'one_time_30_days',
      accessGranted: '30 days',
      expiresAt: subscriptionEndDate,
      autoRenew: false,
      paymentId: payment.id
    };
  }

  // Private webhook handlers
  async _handleCheckoutCompleted(session) {
    const { userId, plan, billingPeriod, paymentType } = session.metadata;

    if (!userId || !plan) {
      console.error('Missing metadata in checkout session');
      return;
    }

    // Ensure userId is a string for Prisma
    const userIdString = String(userId);

    // Handle one-time payment
    if (paymentType === 'one_time_30_days') {
      await this._handleOneTimePaymentSuccess(session, userIdString, plan);
      return;
    }

    const whereConditions = [
      { stripeCheckoutSessionId: session.id }
    ];


    if (session.payment_intent) {
      whereConditions.push({ stripePaymentIntentId: session.payment_intent });
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        OR: whereConditions
      }
    });

    if (existingPayment) {
      console.log(`Webhook: Payment already processed for session: ${session.id}`);
      return;
    }

    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date();

    if (billingPeriod === 'yearly') {
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
    } else {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    }

    await prisma.user.update({
      where: { id: userIdString },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: 'ACTIVE',
        subscriptionStartDate,
        subscriptionEndDate,
        currentPeriodEnd: subscriptionEndDate,
        cancelAtPeriodEnd: false,
        userStatus: 'ACTIVE'
      }
    });

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
        userId: userIdString,
        amount: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        status: 'COMPLETED',
        provider: 'STRIPE',
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        stripeInvoiceId: invoiceId,
        plan,
        billingPeriod: billingPeriod || 'monthly',
        description: `${plan} Plan - ${billingPeriod === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
        paidAt: new Date()
      }
    });

    console.log(`✅ Subscription activated for user ${userIdString}: ${plan} (${billingPeriod || 'monthly'})`);

    // Create activity logs for subscription and payment (webhook)
    try {
      await prisma.activityLog.create({
        data: {
          userId: userIdString,
          type: 'SUBSCRIPTION_STARTED',
          description: `Started ${plan} subscription (${billingPeriod}) via webhook`,
          metadata: {
            plan,
            billingPeriod,
            amount: session.amount_total / 100,
            currency: session.currency.toUpperCase(),
            sessionId: session.id,
            source: 'webhook'
          }
        }
      });

      await prisma.activityLog.create({
        data: {
          userId: userIdString,
          type: 'PAYMENT_SUCCEEDED',
          description: `Payment succeeded for ${plan} plan - $${session.amount_total / 100}`,
          metadata: {
            amount: session.amount_total / 100,
            currency: session.currency.toUpperCase(),
            plan,
            billingPeriod,
            source: 'webhook'
          }
        }
      });

      console.log('📊 Activity logs created for subscription (webhook)');
    } catch (logError) {
      console.error('Failed to create activity logs:', logError);
      // Don't throw - log failure shouldn't block webhook
    }

    // Send subscription confirmation email
    try {
      const user = await prisma.user.findUnique({
        where: { id: userIdString },
        select: { email: true, fullName: true }
      });

      if (user && user.email) {
        await emailService.sendSubscriptionConfirmation(
          { email: user.email, firstName: user.fullName },
          plan
        );
        console.log(`📧 Subscription confirmation email sent to ${user.email}`);
      }
    } catch (emailError) {
      console.error('Failed to send subscription confirmation email:', emailError);
      // Don't throw - email failure shouldn't block webhook processing
    }
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