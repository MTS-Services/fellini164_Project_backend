const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumn() {
    try {
        // Check if column already exists
        const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Payment' 
      AND column_name = 'stripeCheckoutSessionId'
    `;

        if (result.length > 0) {
            console.log('✅ Column stripeCheckoutSessionId already exists');
        } else {
            console.log('Adding stripeCheckoutSessionId column...');

            // Add column
            await prisma.$executeRaw`
        ALTER TABLE "Payment" 
        ADD COLUMN "stripeCheckoutSessionId" TEXT
      `;

            console.log('✅ Column added');

            // Add unique constraint
            await prisma.$executeRaw`
        ALTER TABLE "Payment" 
        ADD CONSTRAINT "Payment_stripeCheckoutSessionId_key" 
        UNIQUE ("stripeCheckoutSessionId")
      `;

            console.log('✅ Unique constraint added');
        }

        console.log('\n✅ Database schema updated successfully!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

addColumn();
