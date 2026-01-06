const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/plans', paymentController.getAvailablePlans); // Get all available plans

// Webhook (NO AUTH - called by Stripe)
router.post('/webhook', paymentController.stripeWebhook);

// Success/Cancel redirect handlers (NO AUTH - called by Stripe redirect)
router.get('/success', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Payment successful! Your subscription is being activated.',
    sessionId: req.query.session_id 
  });
});

router.get('/cancel', (req, res) => {
  res.json({ 
    success: false, 
    message: 'Payment cancelled. You can try again anytime.' 
  });
});

// Protected routes (require authentication)
router.post('/create-checkout', protect, paymentController.createStripeCheckout);
router.get('/subscription-status', protect, paymentController.getSubscriptionStatus);
router.post('/cancel-subscription', protect, paymentController.cancelSubscription);
router.post('/reactivate-subscription', protect, paymentController.reactivateSubscription);
router.get('/history', protect, paymentController.getPaymentHistory);

module.exports = router;
