const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');
const prisma = new PrismaClient();

async function debugProYearly() {
    const sessionId = 'cs_test_a1AXbZkJ74cLqqeGLbVNDaVkvt0t4TJIwBT3Lsk1ZgVVCvcbXfsTVgN1Rtg';
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    console.log('=== DEBUGGING PRO YEARLY SESSION ===\n');

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        console.log('Session ID:', session.id);
        console.log('Payment Status:', session.payment_status);
        console.log('Payment Intent:', session.payment_intent);
        console.log('Metadata:', session.metadata);
        console.log('Amount:', session.amount_total / 100);

        console.log('\n=== CHECKING WHAT THE CODE FINDS ===');

        // Build the exact query the code uses
        const whereConditions = [
            { stripeCheckoutSessionId: session.id }
        ];

        if (session.payment_intent) {
            whereConditions.push({ stripePaymentIntentId: session.payment_intent });
            console.log('Checking: sessionId OR payment_intent');
        } else {
            console.log('Checking: sessionId ONLY (payment_intent is null)');
        }

        const existingPayment = await prisma.payment.findFirst({
            where: {
                OR: whereConditions
            }
        });

        if (existingPayment) {
            console.log('\n❌ FOUND EXISTING PAYMENT:');
            console.log('Payment ID:', existingPayment.id);
            console.log('Plan:', existingPayment.plan);
            console.log('User ID:', existingPayment.userId);
            console.log('Checkout Session ID:', existingPayment.stripeCheckoutSessionId);
            console.log('Payment Intent ID:', existingPayment.stripePaymentIntentId);
            console.log('Created:', existingPayment.createdAt);

            console.log('\n🔍 MATCH REASON:');
            if (existingPayment.stripeCheckoutSessionId === session.id) {
                console.log('✅ Matched by checkout session ID - THIS IS CORRECT!');
                console.log('This payment was already processed for this exact session.');
            } else {
                console.log('❌ Matched by payment_intent (both null) - THIS IS THE BUG!');
            }

            // Check if this user owns this payment
            if (session.metadata.userId === existingPayment.userId) {
                console.log('\n✅ Payment belongs to correct user');
            } else {
                console.log('\n❌ Payment belongs to DIFFERENT user!');
                console.log('Session user:', session.metadata.userId);
                console.log('Payment user:', existingPayment.userId);
            }
        } else {
            console.log('\n✅ No existing payment found - will create new one');
        }

    } catch (error) {
        if (error.code === 'resource_missing') {
            console.log('❌ Session not found or expired in Stripe');
            console.log('Session ID:', sessionId);
        } else {
            console.error('Error:', error.message);
        }
    }

    await prisma.$disconnect();
}

debugProYearly().catch(console.error);
