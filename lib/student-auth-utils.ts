import crypto from 'crypto';
import prisma from '@/prisma/client';

export async function createStudentVerificationToken(studentId: number): Promise<string> {
  await prisma.studentVerificationToken.deleteMany({ where: { studentId, usedAt: null } });
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.studentVerificationToken.create({ data: { token, studentId, expiresAt } });
  return token;
}