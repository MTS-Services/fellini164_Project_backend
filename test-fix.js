const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuery() {
    console.log('=== TESTING THE BUG ===\n');

    // Simulate what happens when payment_intent is null
    const sessionPaymentIntent = null;
    const sessionId = 'cs_test_NEW_SESSION_12345';

    console.log('Session payment_intent:', sessionPaymentIntent);
    console.log('Session id:', sessionId);

    console.log('\n--- OLD CODE (BROKEN) ---');
    console.log('Query: OR [ {sessionId: "cs_test_NEW..."}, {paymentIntent: null} ]');

    const brokenQuery = await prisma.payment.findFirst({
        where: {
            OR: [
                { stripeCheckoutSessionId: sessionId },
                { stripePaymentIntentId: sessionPaymentIntent }  // This is NULL!
            ]
        }
    });

    if (brokenQuery) {
        console.log('❌ FOUND MATCH (WRONG!):', {
            plan: brokenQuery.plan,
            userId: brokenQuery.userId.substring(0, 8) + '...',
            paymentIntent: brokenQuery.stripePaymentIntentId,
            createdAt: brokenQuery.createdAt
        });
        console.log('This is from a DIFFERENT user\'s old payment!');
    } else {
        console.log('✅ No match');
    }

    console.log('\n--- NEW CODE (FIXED) ---');
    console.log('Query: Only checks sessionId when payment_intent is null');

    const whereConditions = [
        { stripeCheckoutSessionId: sessionId }
    ];

    if (sessionPaymentIntent) {
        whereConditions.push({ stripePaymentIntentId: sessionPaymentIntent });
    }

    const fixedQuery = await prisma.payment.findFirst({
        where: {
            OR: whereConditions
        }
    });

    if (fixedQuery) {
        console.log('❌ FOUND MATCH:', fixedQuery.id);
    } else {
        console.log('✅ No match - will create NEW payment record');
    }

    await prisma.$disconnect();
}

testQuery().catch(console.error);
