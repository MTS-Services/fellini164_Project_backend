const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');


router.get('/plans', paymentController.getAvailablePlans);

// Webhook (NO AUTH - called by Stripe)
router.post('/webhook', paymentController.stripeWebhook);

router.get('/success', paymentController.handlePaymentSuccess);

router.get('/cancel', (req, res) => {
  res.json({
    success: false,
    message: 'Payment cancelled. You can try again anytime.'
  });
});

router.post('/create-checkout', protect, paymentController.createStripeCheckout);
router.post('/one-time-checkout', protect, paymentController.createOneTimeCheckout);
router.get('/subscription-status', protect, paymentController.getSubscriptionStatus);
router.post('/cancel-subscription', protect, paymentController.cancelSubscription);
router.post('/reactivate-subscription', protect, paymentController.reactivateSubscription);
router.post('/change-subscription', protect, paymentController.changeSubscription);
router.get('/history', protect, paymentController.getPaymentHistory);

module.exports = router;