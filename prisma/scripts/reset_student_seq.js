const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting Student id sequence to MAX(id) ...');
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Student"','id'), (SELECT COALESCE(MAX(id),0) FROM "Student"))`);
  console.log('Sequence reset complete.');
}

main()
  .catch((e) => {
    console.error('Error resetting sequence:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
