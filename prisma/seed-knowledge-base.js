const { PrismaClient } = require('@prisma/client');
const knowledgeBaseData = require('../src/data/knowledgeBase');

const prisma = new PrismaClient();

async function seedKnowledgeBase() {
  console.log('🌱 Seeding Knowledge Base...');

  try {
    // Clear existing knowledge base (optional - comment out if you want to keep existing data)
    await prisma.supportKnowledgeBase.deleteMany({});
    console.log('✅ Cleared existing knowledge base');

    // Seed knowledge base articles
    let count = 0;
    for (const article of knowledgeBaseData) {
      await prisma.supportKnowledgeBase.create({
        data: {
          ...article,
          isActive: true,
          viewCount: 0,
          helpfulCount: 0,
          notHelpfulCount: 0
        }
      });
      count++;
    }

    console.log(`✅ Seeded ${count} knowledge base articles`);
    console.log('✅ Knowledge Base seeding complete!');

  } catch (error) {
    console.error('❌ Error seeding knowledge base:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedKnowledgeBase()
    .then(() => {
      console.log('✅ Knowledge Base seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Knowledge Base seed failed:', error);
      process.exit(1);
    });
}

module.exports = seedKnowledgeBase;
