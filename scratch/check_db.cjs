const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prefs = await prisma.preference.findMany({
    select: { id: true, studentId: true, status: true, academicYear: true, universityId: true }
  });
  console.log('All Preferences (first 10):');
  console.log(JSON.stringify(prefs.slice(0, 10), null, 2));
  
  const universityCount = await prisma.university.count();
  console.log('Total Universities:', universityCount);
  
  const studentCount = await prisma.student.count();
  console.log('Total Students:', studentCount);
  
  const appCount = await prisma.application.count();
  console.log('Total Applications:', appCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
