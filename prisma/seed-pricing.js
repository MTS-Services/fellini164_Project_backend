const { PrismaClient } = require('@prisma/client');
const { PLAN_FEATURES, PLAN_LIMITS } = require('../src/utils/constants');
const prisma = new PrismaClient();

async function seedPricing() {
  console.log('🌱 Seeding pricing configurations...');

  try {
    // FREE Plan
    await prisma.pricingConfig.upsert({
      where: { plan: 'FREE' },
      update: {
        features: PLAN_FEATURES.FREE,
        limits: PLAN_LIMITS.FREE,
      },
      create: {
        plan: 'FREE',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: PLAN_FEATURES.FREE,
        limits: PLAN_LIMITS.FREE,
        isActive: true
      }
    });
    console.log('✅ FREE plan created');

    // STARTER Plan
    await prisma.pricingConfig.upsert({
      where: { plan: 'STARTER' },
      update: {
        yearlyPrice: 76.68,
        features: PLAN_FEATURES.STARTER,
        limits: PLAN_LIMITS.STARTER,
        stripePriceIdMonthly: 'price_1T3s1FPc4Do23EYooQcRMo3N',
        stripePriceIdYearly: 'price_1U7TTzPc4Do23EYowV1trkCj'
      },
      create: {
        plan: 'STARTER',
        monthlyPrice: 7.99,
        yearlyPrice: 76.68,
        features: PLAN_FEATURES.STARTER,
        limits: PLAN_LIMITS.STARTER,
        stripePriceIdMonthly: 'price_1T3s1FPc4Do23EYooQcRMo3N',
        stripePriceIdYearly: 'price_1U7TTzPc4Do23EYowV1trkCj',
        isActive: true
      }
    });
    console.log('✅ STARTER plan created');

    // PRO Plan
    await prisma.pricingConfig.upsert({
      where: { plan: 'PRO' },
      update: {
        yearlyPrice: 172.68,
        features: PLAN_FEATURES.PRO,
        limits: PLAN_LIMITS.PRO,
        stripePriceIdMonthly: 'price_1T3s4VPc4Do23EYoXvEpSjTk',
        stripePriceIdYearly: 'price_1U7TV9Pc4Do23EYoGTFeXJya'
      },
      create: {
        plan: 'PRO',
        monthlyPrice: 17.99,
        yearlyPrice: 172.68,
        features: PLAN_FEATURES.PRO,
        limits: PLAN_LIMITS.PRO,
        stripePriceIdMonthly: 'price_1T3s4VPc4Do23EYoXvEpSjTk',
        stripePriceIdYearly: 'price_1U7TV9Pc4Do23EYoGTFeXJya',
        isActive: true
      }
    });
    console.log('✅ PRO plan created');

    // ULTIMATE Plan
    await prisma.pricingConfig.upsert({
      where: { plan: 'ULTIMATE' },
      update: {
        yearlyPrice: 383.88,
        features: PLAN_FEATURES.ULTIMATE,
        limits: PLAN_LIMITS.ULTIMATE,
        stripePriceIdMonthly: 'price_1T3s5QPc4Do23EYoiYuHRtBl',
        stripePriceIdYearly: 'price_1U7TVwPc4Do23EYoHmuTtKsU'
      },
      create: {
        plan: 'ULTIMATE',
        monthlyPrice: 39.99,
        yearlyPrice: 383.88,
        features: PLAN_FEATURES.ULTIMATE,
        limits: PLAN_LIMITS.ULTIMATE,
        stripePriceIdMonthly: 'price_1T3s5QPc4Do23EYoiYuHRtBl',
        stripePriceIdYearly: 'price_1U7TVwPc4Do23EYoHmuTtKsU',
        isActive: true
      }
    });
    console.log('✅ ULTIMATE plan created');

    console.log('🎉 Pricing seeding completed successfully!');

    // Display all pricing configs
    const allPricing = await prisma.pricingConfig.findMany({
      orderBy: { monthlyPrice: 'asc' }
    });

    console.log('\n📊 Current Pricing Configurations:');
    allPricing.forEach(plan => {
      console.log(`\n${plan.plan}:`);
      console.log(`  Monthly: $${plan.monthlyPrice}`);
      console.log(`  Yearly: $${plan.yearlyPrice}`);
      if (plan.stripePriceIdMonthly) {
        console.log(`  Stripe Monthly ID: ${plan.stripePriceIdMonthly}`);
      }
      if (plan.stripePriceIdYearly) {
        console.log(`  Stripe Yearly ID: ${plan.stripePriceIdYearly}`);
      }
      console.log(`  Features: ${plan.features.length} items`);
      console.log(`  Active: ${plan.isActive}`);
    });

  } catch (error) {
    console.error('❌ Error seeding pricing:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedPricing()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
