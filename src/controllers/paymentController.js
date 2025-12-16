const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Create Stripe checkout session for subscription
 */
exports.createStripeCheckout = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    // Validate plan
    const validPlans = ['STARTER', 'PRO', 'ULTIMATE'];
    if (!plan || !validPlans.includes(plan)) {
      return sendError(res, 400, 'Invalid plan selected');
    }

    // Create checkout session
    const session = await paymentService.createCheckoutSession(userId, plan);

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
 * Handle Stripe webhook events
 * This endpoint must be called with raw body for signature verification
 */
exports.stripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).send('No signature provided');
    }

    // Process webhook event
    await paymentService.handleWebhook(req.body, sig);

    // Return 200 to acknowledge receipt
    res.json({ received: true });

  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

/**
 * Get user's subscription status
 */
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

/**
 * Cancel user's subscription (at period end)
 */
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

/**
 * Reactivate cancelled subscription
 */
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

/**
 * Get payment history for user
 */
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
