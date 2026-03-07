require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
    try {
        const result = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'WeeklyPlan'
      ORDER BY ordinal_position;
    `;

        console.log('WeeklyPlan table structure:');
        console.table(result);
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
