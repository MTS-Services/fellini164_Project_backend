const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Stripe routes
router.post('/stripe/create-checkout-session', paymentController.createStripeCheckout);
router.post('/stripe/webhook', paymentController.stripeWebhook);
router.get('/stripe/billing-portal', paymentController.getStripeBillingPortal);

// PayPal routes
router.post('/paypal/create-subscription', paymentController.createPayPalSubscription);
router.post('/paypal/webhook', paymentController.paypalWebhook);

// General payment routes
router.get('/history', paymentController.getPaymentHistory);

module.exports = router;
