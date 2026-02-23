const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPricing() {
  console.log('🌱 Seeding pricing configurations...');

  try {
    // FREE Plan
    await prisma.pricingConfig.upsert({
      where: { plan: 'FREE' },
      update: {},
      create: {
        plan: 'FREE',
        monthlyPrice: 0,
        yearlyPrice: 0,
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
        limits: {
          dailyAiMessages: 20,
          dailyPlans: 1,
          weeklyPlans: 0,
          monthlyPlans: 0,
          maxGoals: 1,
          maxHabits: 1,
          maxRoutines: 1,
          maxAiPersonas: 1,
          hasWatermark: true,
          historyAccess: 'limited',
          responseSpeed: 'standard'
        },
        isActive: true
      }
    });
    console.log('✅ FREE plan created');

    // STARTER Plan
    await prisma.pricingConfig.upsert({
      where: { plan: 'STARTER' },
      update: {
        stripePriceIdMonthly: 'price_1T3s1FPc4Do23EYooQcRMo3N',
        stripePriceIdYearly: 'price_1T3s3wPc4Do23EYoTynFhGd2'
      },
      create: {
        plan: 'STARTER',
        monthlyPrice: 7.99,
        yearlyPrice: 79,
        stripePriceIdMonthly: 'price_1T3s1FPc4Do23EYooQcRMo3N',
        stripePriceIdYearly: 'price_1T3s3wPc4Do23EYoTynFhGd2',
        features: [
          'Unlimited AI chat (fair use)',
          'Unlimited task planning',
          'Daily automation',
          'Basic goal analysis',
          '1 AI persona',
          'Monthly summaries',
          'Standard response speed'
        ],
        limits: {
          dailyAiMessages: -1,
          dailyPlans: -1,
          weeklyPlans: 0,
          monthlyPlans: 0,
          maxGoals: 20,
          maxHabits: 20,
          maxRoutines: 5,
          maxAiPersonas: 1,
          hasWatermark: false,
          historyAccess: 'monthly',
          responseSpeed: 'standard',
          hasMonthlyReports: true
        },
        isActive: true
      }
    });
    console.log('✅ STARTER plan created');

    // PRO Plan
    await prisma.pricingConfig.upsert({
      where: { plan: 'PRO' },
      update: {
        stripePriceIdMonthly: 'price_1T3s4VPc4Do23EYoXvEpSjTk',
        stripePriceIdYearly: 'price_1T3s4qPc4Do23EYoq9KQnHtW'
      },
      create: {
        plan: 'PRO',
        monthlyPrice: 17.99,
        yearlyPrice: 179,
        stripePriceIdMonthly: 'price_1T3s4VPc4Do23EYoXvEpSjTk',
        stripePriceIdYearly: 'price_1T3s4qPc4Do23EYoq9KQnHtW',
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
        limits: {
          dailyAiMessages: -1,
          dailyPlans: -1,
          weeklyPlans: -1,
          monthlyPlans: -1,
          maxGoals: -1,
          maxHabits: -1,
          maxRoutines: -1,
          maxAiPersonas: 3,
          hasWatermark: false,
          historyAccess: 'unlimited',
          responseSpeed: 'priority',
          hasWeeklyReports: true,
          hasMonthlyReports: true,
          hasProductivityAnalysis: true,
          hasHabitDifficultyAdjustment: true
        },
        isActive: true
      }
    });
    console.log('✅ PRO plan created');

    // ULTIMATE Plan
    await prisma.pricingConfig.upsert({
      where: { plan: 'ULTIMATE' },
      update: {
        stripePriceIdMonthly: 'price_1T3s5QPc4Do23EYoiYuHRtBl',
        stripePriceIdYearly: 'price_1T3s5lPc4Do23EYoFjM1WqPa'
      },
      create: {
        plan: 'ULTIMATE',
        monthlyPrice: 39.99,
        yearlyPrice: 399,
        stripePriceIdMonthly: 'price_1T3s5QPc4Do23EYoiYuHRtBl',
        stripePriceIdYearly: 'price_1T3s5lPc4Do23EYoFjM1WqPa',
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
        limits: {
          dailyAiMessages: -1,
          dailyPlans: -1,
          weeklyPlans: -1,
          monthlyPlans: -1,
          maxGoals: -1,
          maxHabits: -1,
          maxRoutines: -1,
          maxAiPersonas: -1,
          hasWatermark: false,
          historyAccess: 'unlimited',
          responseSpeed: 'fastest',
          hasWeeklyReports: true,
          hasMonthlyReports: true,
          hasProductivityAnalysis: true,
          hasHabitDifficultyAdjustment: true,
          hasLifeBlueprint: true,
          hasVoiceCoach: true,
          hasRoutineOptimizer: true,
          hasEnergyPlanning: true,
          hasMonthlyCoaching: true,
          earlyFeatureAccess: true
        },
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
