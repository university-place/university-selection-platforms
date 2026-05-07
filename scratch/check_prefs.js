const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prefs = await prisma.preference.findMany({
    where: { universityId: 1 },
    select: { id: true, studentId: true, status: true, academicYear: true }
  });
  console.log(JSON.stringify(prefs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
