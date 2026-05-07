// scripts/create-student.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.upsert({
    where: { email: 'habtamu@example.com' },
    update: {},
    create: {
      name: 'Habtamu Tadesse',
      email: 'habtamu@example.com',
      username: 'habtamu',
      password: 'password123',
      studentId: 'EXM-2024-003',
      registrationNumber: 'REG-2024-001',
    },
  });
  
  console.log('Student created/found:', student);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());