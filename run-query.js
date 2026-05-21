import prisma from './prisma/client.js';

async function main() {
  const invitations = await prisma.interviewInvitation.findMany({
    where: {
      universityId: 4,
      status: { in: ['ACCEPTED', 'COMPLETED', 'PENDING'] }
    },
    include: {
      student: true,
      program: true
    }
  });
  console.log("PRISMA INVITATIONS:", invitations);
}

main().catch(console.error);
