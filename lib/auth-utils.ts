import crypto from 'crypto';
import prisma from '@/prisma/client';

export async function createVerificationToken(userId: string): Promise<string> {
  // Delete any existing unused tokens for this user
  await prisma.verificationToken.deleteMany({
    where: { userId, usedAt: null },
  });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.verificationToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
} 