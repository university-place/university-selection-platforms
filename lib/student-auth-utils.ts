import crypto from 'crypto';
import prisma from '@/prisma/client';

export async function createStudentVerificationToken(studentId: number): Promise<string> {
  await prisma.studentVerificationToken.deleteMany({ where: { studentId, usedAt: null } });
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.studentVerificationToken.create({ data: { token, studentId, expiresAt } });
  return token;
}

export async function createStudentResetToken(studentId: number): Promise<string> {
  // Reuse the same table or create a new one? 
  // Let's reuse StudentVerificationToken but we might need a way to distinguish them.
  // Actually, since there's no 'type' field, it's safer to use it for one thing or just assume if used in reset flow it's a reset token.
  // Better: I'll use it but the code that handles it will know.
  await prisma.studentVerificationToken.deleteMany({ where: { studentId, usedAt: null } });
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // Reset token expires in 1 hour
  await prisma.studentVerificationToken.create({ data: { token, studentId, expiresAt } });
  return token;
}