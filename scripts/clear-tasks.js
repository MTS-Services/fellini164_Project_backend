const prisma = require("../src/config/database");

async function clearAllTasks() {
  const before = await prisma.task.count();
  console.log("Task count before:", before);

  const result = await prisma.task.deleteMany();
  console.log("Deleted:", result.count);

  const after = await prisma.task.count();
  console.log("Task count after:", after);
}

clearAllTasks()
  .catch((error) => {
    console.error("Failed to clear tasks:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
