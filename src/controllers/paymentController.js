const prisma = require('../config/database');


exports.createStripeCheckout = async (req, res) => {
  res.json({ message: 'Create Stripe checkout - TODO' });
};


exports.stripeWebhook = async (req, res) => {
  res.json({ message: 'Stripe webhook - TODO' });
};


exports.getStripeBillingPortal = async (req, res) => {
  res.json({ message: 'Stripe billing portal - TODO' });
};


exports.createPayPalSubscription = async (req, res) => {
  res.json({ message: 'Create PayPal subscription - TODO' });
};


exports.paypalWebhook = async (req, res) => {
  res.json({ message: 'PayPal webhook - TODO' });
};


exports.getPaymentHistory = async (req, res) => {
  res.json({ message: 'Get payment history - TODO' });
};
