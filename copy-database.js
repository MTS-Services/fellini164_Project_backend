const { PrismaClient } = require('@prisma/client');

// New database connection (from .env)
const newDb = new PrismaClient();

async function copyDatabaseData() {
  try {
    console.log('🔄 Starting comprehensive data copy from old to new database...\n');

    const oldDbUrl = 'postgres://postgres:PgcfcLFRXUduv74rFjKtYskBnbbQIZaSNJHdtA97P9rtBUB9KW5TsO1uuCaFaxB5@72.62.164.177:5466/postgres';

    console.log('📋 Setting up foreign data wrapper...\n');

    // First, install dblink extension if not exists
    await newDb.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS dblink;`);

    // Get list of all tables
    const tables = [
      'User',
      'ReferralCode',
      'ReferralInvitation',
      'Unsubscribe',
      'Waitlist',
      'Plan',
      'Subscription',
      'ManualPlan',
      'DailyPlanReset',
      'Conversation',
      'Message',
      'Announcement',
      'Ticket',
      'TicketMessage',
      'Task',
      'SupportMessage',
    ];

    console.log('🗑️  Clearing existing data from new database...\n');

    // Clear data in reverse order to respect foreign keys
    const reverseTables = [...tables].reverse();
    for (const table of reverseTables) {
      try {
        await newDb.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`   ✅ Cleared ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Could not clear ${table}: ${error.message}`);
      }
    }

    console.log('\n📊 Copying data from old database...\n');

    let totalRecords = 0;

    for (const table of tables) {
      try {
        console.log(`\n📦 Copying ${table}...`);

        // Use dblink to copy data from old database
        const query = `
          INSERT INTO "${table}"
          SELECT * FROM dblink(
            '${oldDbUrl}',
            'SELECT * FROM "${table}"'
          ) AS t(
            id text,
            email text,
            password text,
            "fullName" text,
            phone text,
            address text,
            avatar text,
            role text,
            "userStatus" text,
            "isEmailVerified" boolean,
            "emailVerificationToken" text,
            "emailVerificationOtp" text,
            "otpExpires" timestamptz,
            "passwordResetToken" text,
            "passwordResetExpires" timestamptz,
            "lastLogin" timestamptz,
            "subscriptionPlan" text,
            "subscriptionStatus" text,
            "subscriptionStartDate" timestamptz,
            "subscriptionEndDate" timestamptz,
            "trialEndsAt" timestamptz,
            "stripeCustomerId" text,
            "paypalSubscriptionId" text,
            "currentPeriodEnd" timestamptz,
            "cancelAtPeriodEnd" boolean,
            "dailyAiMessagesUsed" integer,
            "dailyPlansGenerated" integer,
            "lastUsageReset" timestamptz,
            "onboardingCompleted" boolean,
            "onboardingStep" integer,
            "referralCode" text,
            "referredBy" text,
            "referralCredits" integer,
            "referralCount" integer,
            "createdAt" timestamptz,
            "updatedAt" timestamptz
          )
          ON CONFLICT (id) DO NOTHING;
        `;

        // This is a simplified approach - for now let's use our Prisma-based solution
        console.log(`   ⚠️  Using Prisma-based migration for ${table}`);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log(`\n✨ Data copy complete! Total records: ${totalRecords}\n`);

  } catch (error) {
    console.error('❌ Copy failed:', error);
  } finally {
    await newDb.$disconnect();
  }
}

// Run simpler re-migration
async function reMigrateData() {
  const oldDb = new PrismaClient({
    datasources: {
      db: {
        url: 'postgres://postgres:PgcfcLFRXUduv74rFjKtYskBnbbQIZaSNJHdtA97P9rtBUB9KW5TsO1uuCaFaxB5@72.62.164.177:5466/postgres'
      }
    }
  });

  try {
    console.log('🔄 Re-running data migration with improved error handling...\n');

    // Clear all tables first
    console.log('🗑️  Clearing new database tables...\n');

    const tablesToClear = [
      'SupportMessage',
      'Task',
      'TicketMessage',
      'Ticket',
      'Announcement',
      'Message',
      'Conversation',
      'DailyPlanReset',
      'ManualPlan',
      'Subscription',
      'Plan',
      'ReferralInvitation',
      'ReferralCode',
      'Waitlist',
      'Unsubscribe',
      'User'
    ];

    for (const table of tablesToClear) {
      try {
        await newDb.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
        console.log(`   ✅ Cleared ${table}`);
      } catch (error) {
        console.log(`   ⚠️  ${table}: ${error.message.split('\n')[0]}`);
      }
    }

    console.log('\n📊 Starting fresh migration...\n');

    // Migration order respecting dependencies
    const migrations = [
      { name: 'User', model: 'user' },
      { name: 'Waitlist', model: 'waitlist' },
      { name: 'Unsubscribe', model: 'unsubscribe' },
      { name: 'ReferralCode', model: 'referralCode' },
      { name: 'ReferralInvitation', model: 'referralInvitation' },
      { name: 'Plan', model: 'plan' },
      { name: 'Subscription', model: 'subscription' },
      { name: 'ManualPlan', model: 'manualPlan' },
      { name: 'DailyPlanReset', model: 'dailyPlanReset' },
      { name: 'Conversation', model: 'conversation' },
      { name: 'Message', model: 'message' },
      { name: 'Announcement', model: 'announcement' },
      { name: 'Ticket', model: 'ticket' },
      { name: 'TicketMessage', model: 'ticketMessage' },
      { name: 'Task', model: 'task' },
      { name: 'SupportMessage', model: 'supportMessage' },
    ];

    let totalMigrated = 0;

    for (const { name, model } of migrations) {
      console.log(`\n📦 ${name}...`);

      try {
        if (!oldDb[model] || !newDb[model]) {
          console.log(`   ⚠️  Model not available, skipping`);
          continue;
        }

        const records = await oldDb[model].findMany();

        if (records.length === 0) {
          console.log(`   ℹ️  No records found`);
          continue;
        }

        console.log(`   Found ${records.length} records`);

        // Handle tasks specially
        if (model === 'task') {
          const noParent = records.filter(r => !r.parentTaskId);
          const withParent = records.filter(r => r.parentTaskId);

          let success = 0;
          for (const record of noParent) {
            try {
              await newDb[model].create({ data: record });
              success++;
            } catch (e) { }
          }

          for (const record of withParent) {
            try {
              await newDb[model].create({ data: record });
              success++;
            } catch (e) { }
          }

          console.log(`   ✅ Migrated ${success}/${records.length}`);
          totalMigrated += success;
        } else {
          let success = 0;
          for (const record of records) {
            try {
              await newDb[model].create({ data: record });
              success++;
            } catch (error) {
              // Silent fail for duplicates
            }
          }
          console.log(`   ✅ Migrated ${success}/${records.length}`);
          totalMigrated += success;
        }
      } catch (error) {
        console.log(`   ❌ ${error.message.split('\n')[0]}`);
      }
    }

    console.log(`\n✨ Migration complete! Total: ${totalMigrated} records\n`);

  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  }
}

reMigrateData();
