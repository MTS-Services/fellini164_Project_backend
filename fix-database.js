require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revertJsonToText() {
    try {
        console.log('Starting database fix...\n');

        // Step 1: Fix array defaults first
        console.log('Step 1: Removing array defaults...');
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "WeeklyPlan" ALTER COLUMN "focusAreas" DROP DEFAULT`);
            console.log('  ✓ Removed WeeklyPlan.focusAreas default');
        } catch (e) {
            console.log('  ⚠ WeeklyPlan.focusAreas:', e.message);
        }

        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "MonthlyPlan" ALTER COLUMN "milestones" DROP DEFAULT`);
            console.log('  ✓ Removed MonthlyPlan.milestones default');
        } catch (e) {
            console.log('  ⚠ MonthlyPlan.milestones:', e.message);
        }

        // Step 2: Remove regeneratedCount columns
        console.log('\nStep 2: Removing regeneratedCount columns...');
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "WeeklyPlan" DROP COLUMN IF EXISTS "regeneratedCount"`);
            console.log('  ✓ Removed from WeeklyPlan');
        } catch (e) {
            console.log('  ⚠ WeeklyPlan:', e.message);
        }

        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "MonthlyPlan" DROP COLUMN IF EXISTS "regeneratedCount"`);
            console.log('  ✓ Removed from MonthlyPlan');
        } catch (e) {
            console.log('  ⚠ MonthlyPlan:', e.message);
        }

        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "DailyPlan" DROP COLUMN IF EXISTS "regeneratedCount"`);
            console.log('  ✓ Removed from DailyPlan');
        } catch (e) {
            console.log('  ⚠ DailyPlan:', e.message);
        }

        // Step 3: Convert JSONB to TEXT
        console.log('\nStep 3: Converting JSONB columns to TEXT...');

        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "WeeklyPlan" 
                ALTER COLUMN "content" TYPE TEXT 
                USING CASE 
                    WHEN jsonb_typeof("content") = 'object' THEN "content"->>'text'
                    ELSE "content"::text
                END
            `);
            console.log('  ✓ Converted WeeklyPlan.content to TEXT');
        } catch (e) {
            console.log('  ✗ WeeklyPlan.content:', e.message);
        }

        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MonthlyPlan" 
                ALTER COLUMN "content" TYPE TEXT 
                USING CASE 
                    WHEN jsonb_typeof("content") = 'object' THEN "content"->>'text'
                    ELSE "content"::text
                END
            `);
            console.log('  ✓ Converted MonthlyPlan.content to TEXT');
        } catch (e) {
            console.log('  ✗ MonthlyPlan.content:', e.message);
        }

        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "DailyPlan" 
                ALTER COLUMN "content" TYPE TEXT 
                USING CASE 
                    WHEN jsonb_typeof("content") = 'object' THEN "content"->>'text'
                    ELSE "content"::text
                END
            `);
            console.log('  ✓ Converted DailyPlan.content to TEXT');
        } catch (e) {
            console.log('  ✗ DailyPlan.content:', e.message);
        }

        console.log('\n✅ Database fix complete!');
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

revertJsonToText();
