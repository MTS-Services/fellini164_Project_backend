const { PrismaClient } = require('@prisma/client');

// Old database connection
const oldDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgres://postgres:PgcfcLFRXUduv74rFjKtYskBnbbQIZaSNJHdtA97P9rtBUB9KW5TsO1uuCaFaxB5@72.62.164.177:5466/postgres'
    }
  }
});

// New database connection (from .env)
const newDb = new PrismaClient();

async function migrateData() {
  try {
    console.log('🔄 Starting data migration...\n');
    console.log('⚠️  Note: Migrating in order to respect foreign key constraints\n');

    // Order matters! Migrate parent tables before child tables
    const modelsInOrder = [
      // Core user tables (no dependencies)
      { name: 'user', model: 'user' },
      { name: 'waitlist', model: 'waitlist' },
      { name: 'unsubscribe', model: 'unsubscribe' },
      
      // Referral system (depends on User)
      { name: 'referralCode', model: 'referralCode' },
      { name: 'referralInvitation', model: 'referralInvitation' },
      
      // Plans and subscriptions (depends on User)
      { name: 'plan', model: 'plan' },
      { name: 'subscription', model: 'subscription' },
      { name: 'manualPlan', model: 'manualPlan' },
      { name: 'dailyPlanReset', model: 'dailyPlanReset' },
      
      // Conversations and messages (depends on User)
      { name: 'conversation', model: 'conversation' },
      { name: 'message', model: 'message' },
      
      // Announcements (depends on User)
      { name: 'announcement', model: 'announcement' },
      
      // Support tickets (depends on User)
      { name: 'ticket', model: 'ticket' },
      { name: 'ticketMessage', model: 'ticketMessage' },
      { name: 'supportMessage', model: 'supportMessage' },
      
      // Tasks (some tasks may depend on other tasks - handle carefully)
      { name: 'task', model: 'task' },
    ];

    let totalRecords = 0;

    for (const { name, model } of modelsInOrder) {
      try {
        console.log(`\n📊 Migrating ${name}...`);
        
        // Check if model exists in Prisma client
        if (!oldDb[model]) {
          console.log(`   ⚠️  Model ${name} not found in Prisma client, skipping...`);
          continue;
        }
        
        // Fetch all records from old database
        const records = await oldDb[model].findMany();
        
        if (records.length === 0) {
          console.log(`   ⚠️  No records found in ${name}`);
          continue;
        }

        console.log(`   📦 Found ${records.length} records`);

        // Special handling for tasks with parent-child relationships
        if (model === 'task') {
          await migrateTasksWithDependencies(records);
        } else {
          // Insert records into new database
          let successCount = 0;
          let errorCount = 0;

          for (const record of records) {
            try {
              await newDb[model].create({
                data: record
              });
              successCount++;
            } catch (error) {
              errorCount++;
              console.log(`   ❌ Error: ${error.message.split('\n')[0]}`);
            }
          }

          console.log(`   ✅ Successfully migrated ${successCount} records`);
          if (errorCount > 0) {
            console.log(`   ⚠️  Failed to migrate ${errorCount} records`);
          }
          
          totalRecords += successCount;
        }

      } catch (error) {
        console.log(`   ⚠️  Error accessing ${name}: ${error.message}`);
      }
    }

    console.log(`\n✨ Migration complete! Total records migrated: ${totalRecords}\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  }
}

// Special function to handle tasks with parent-child relationships
async function migrateTasksWithDependencies(tasks) {
  let successCount = 0;
  let errorCount = 0;
  let totalRecords = 0;
  
  // First, migrate tasks without parents
  const tasksWithoutParents = tasks.filter(t => !t.parentTaskId);
  console.log(`   📝 Migrating ${tasksWithoutParents.length} top-level tasks...`);
  
  for (const task of tasksWithoutParents) {
    try {
      await newDb.task.create({ data: task });
      successCount++;
      totalRecords++;
    } catch (error) {
      errorCount++;
      console.log(`   ❌ Error: ${error.message.split('\n')[0]}`);
    }
  }
  
  // Then migrate tasks with parents
  const tasksWithParents = tasks.filter(t => t.parentTaskId);
  console.log(`   📝 Migrating ${tasksWithParents.length} child tasks...`);
  
  for (const task of tasksWithParents) {
    try {
      await newDb.task.create({ data: task });
      successCount++;
      totalRecords++;
    } catch (error) {
      errorCount++;
      console.log(`   ❌ Error: ${error.message.split('\n')[0]}`);
    }
  }
  
  console.log(`   ✅ Successfully migrated ${successCount} task records`);
  if (errorCount > 0) {
    console.log(`   ⚠️  Failed to migrate ${errorCount} task records`);
  }
}

migrateData();
