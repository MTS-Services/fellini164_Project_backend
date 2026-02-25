const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');


exports.createStripeCheckout = async (req, res) => {
  try {
    const { plan, billingPeriod = 'monthly' } = req.body;
    const userId = req.user.id;

    // Validate plan
    const validPlans = ['STARTER', 'PRO', 'ULTIMATE'];
    if (!plan || !validPlans.includes(plan)) {
      return sendError(res, 400, 'Invalid plan selected');
    }

    // Validate billing period
    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return sendError(res, 400, 'Invalid billing period. Must be "monthly" or "yearly"');
    }

    // Create checkout session
    const session = await paymentService.createCheckoutSession(userId, plan, billingPeriod);

    return sendSuccess(res, 200, 'Checkout session created successfully', {
      sessionId: session.sessionId,
      url: session.url
    });

  } catch (error) {
    logger.error('Create checkout error:', error);
    return sendError(res, 500, error.message || 'Failed to create checkout session');
  }
};

/**
 * Handle payment success redirect
 * Verifies session and updates user subscription
 */
exports.handlePaymentSuccess = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return sendError(res, 400, 'Missing session ID');
    }


    const result = await paymentService.handlePaymentSuccess(session_id);

    return sendSuccess(res, 200, 'Payment successful! Your subscription has been activated.', result);

  } catch (error) {
    logger.error('Handle payment success error:', error);
    return sendError(res, 500, error.message || 'Failed to process payment');
  }
};


exports.stripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).send('No signature provided');
    }


    await paymentService.handleWebhook(req.body, sig);


    res.json({ received: true });

  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

exports.getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const status = await paymentService.getSubscriptionStatus(userId);

    return sendSuccess(res, 200, 'Subscription status retrieved', status);

  } catch (error) {
    logger.error('Get subscription status error:', error);
    return sendError(res, 500, error.message || 'Failed to get subscription status');
  }
};


exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await paymentService.cancelSubscription(userId);

    return sendSuccess(res, 200, 'Subscription will be cancelled at period end', result);

  } catch (error) {
    logger.error('Cancel subscription error:', error);
    return sendError(res, 500, error.message || 'Failed to cancel subscription');
  }
};


exports.reactivateSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await paymentService.reactivateSubscription(userId);

    return sendSuccess(res, 200, 'Subscription reactivated successfully', result);

  } catch (error) {
    logger.error('Reactivate subscription error:', error);
    return sendError(res, 500, error.message || 'Failed to reactivate subscription');
  }
};


exports.changeSubscription = async (req, res) => {
  try {
    const { newPlan, billingPeriod = 'monthly' } = req.body;
    const userId = req.user.id;

    // Validate plan
    const validPlans = ['STARTER', 'PRO', 'ULTIMATE'];
    if (!newPlan || !validPlans.includes(newPlan)) {
      return sendError(res, 400, 'Invalid plan selected. Must be STARTER, PRO, or ULTIMATE');
    }

    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return sendError(res, 400, 'Invalid billing period. Must be "monthly" or "yearly"');
    }

    const result = await paymentService.changeSubscription(userId, newPlan, billingPeriod);

    return sendSuccess(res, 200, result.message, result);

  } catch (error) {
    logger.error('Change subscription error:', error);
    return sendError(res, 500, error.message || 'Failed to change subscription');
  }
};


exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await paymentService.getPaymentHistory(userId);

    return sendSuccess(res, 200, 'Payment history retrieved', { payments: history });

  } catch (error) {
    logger.error('Get payment history error:', error);
    return sendError(res, 500, error.message || 'Failed to get payment history');
  }
};


exports.createBillingPortal = async (req, res) => {
  try {
    const userId = req.user.id;

    const session = await paymentService.createBillingPortalSession(userId);

    return sendSuccess(res, 200, 'Billing portal session created', {
      url: session.url
    });

  } catch (error) {
    logger.error('Billing portal error:', error);
    return sendError(res, 500, error.message || 'Failed to create billing portal session');
  }
};


exports.getAvailablePlans = async (req, res) => {
  try {
    const { PLAN_PRICES, PLAN_LIMITS } = require('../utils/constants');

    const plans = [
      {
        id: 'FREE',
        name: 'Free',
        tagline: 'Try the core experience',
        price: {
          monthly: { amount: 0, display: '$0/month' },
          yearly: { amount: 0, display: '$0/year' }
        },
        features: [
          '20 AI messages/day (or 200/month)',
          '1 habit tracker',
          '1 routine',
          'Basic daily planner',
          'Basic task breakdown',
          'Limited history',
          '1 basic AI persona',
          'Watermark on AI reports',
          'Email login only'
        ],
        limits: PLAN_LIMITS.FREE,
        cta: 'Start Free'
      },
      {
        id: 'STARTER',
        name: 'Starter',
        tagline: 'For individuals getting organized with AI',
        price: PLAN_PRICES.STARTER,
        features: [
          'Unlimited AI chat (fair use)',
          'Unlimited task planning',
          'Daily automation',
          'Basic goal analysis',
          '1 AI persona',
          'Monthly summaries',
          'Standard response speed'
        ],
        limits: PLAN_LIMITS.STARTER,
        cta: 'Start 7-Day Trial'
      },
      {
        id: 'PRO',
        name: 'Pro',
        tagline: 'For power users who plan weekly & monthly',
        badge: 'Most Popular',
        price: PLAN_PRICES.PRO,
        features: [
          'Everything in Starter, plus:',
          'Full weekly & monthly planning',
          'AI productivity analysis',
          'Weekly AI review reports',
          '3 AI personas',
          'Priority task optimization',
          'Habit difficulty adjustment',
          'Unlimited routines',
          'Faster AI responses'
        ],
        limits: PLAN_LIMITS.PRO,
        cta: 'Start 7-Day Trial'
      },
      {
        id: 'ULTIMATE',
        name: 'Ultimate',
        tagline: 'For creators, founders & high performers',
        price: PLAN_PRICES.ULTIMATE,
        features: [
          'Everything in Pro, plus:',
          'AI-generated Life Blueprint',
          'AI voice coach',
          'AI routine optimizer',
          'Energy-level planning',
          'Monthly AI coaching session',
          'All AI personas',
          'Early feature access'
        ],
        limits: PLAN_LIMITS.ULTIMATE,
        cta: 'Start 7-Day Trial'
      }
    ];

    return sendSuccess(res, 200, 'Available plans retrieved', { plans });

  } catch (error) {
    logger.error('Get available plans error:', error);
    return sendError(res, 500, 'Failed to get available plans');
  }
};


exports.createOneTimeCheckout = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    const validPlans = ['STARTER', 'PRO', 'ULTIMATE'];
    if (!plan || !validPlans.includes(plan)) {
      return sendError(res, 400, 'Invalid plan selected. Must be STARTER, PRO, or ULTIMATE');
    }


    const session = await paymentService.createOneTimeCheckout(userId, plan);

    return sendSuccess(res, 200, 'One-time checkout session created successfully', {
      sessionId: session.sessionId,
      url: session.url,
      paymentType: 'one_time_30_days',
      accessDuration: '30 days',
      autoRenew: false
    });

  } catch (error) {
    logger.error('Create one-time checkout error:', error);
    return sendError(res, 500, error.message || 'Failed to create one-time checkout session');
  }
};