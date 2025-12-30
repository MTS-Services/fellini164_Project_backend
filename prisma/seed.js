const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@gmail.com' }
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');
    return;
  }

  // Hash the admin password
  const hashedPassword = await bcrypt.hash('admin12345', 10);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      password: hashedPassword,
      fullName: 'System Administrator',
      role: 'ADMIN',
      isEmailVerified: true, // Admin is pre-verified
      subscriptionPlan: 'ULTIMATE',
      subscriptionStatus: 'ACTIVE'
    }
  });

  console.log('✅ Admin user created successfully');
  console.log('📧 Email: admin@gmail.com');
  console.log('🔑 Password: admin12345');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
