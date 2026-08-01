import crypto from 'crypto';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

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

/**
 * Verifies a student JWT token from the Authorization header
 * Returns studentId if valid, null otherwise
 */
export async function verifyStudentToken(request: Request): Promise<number | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "dXFzVnQzYUdMZkhNQVFwQjRyOHY2TzV4aTdqYjBlQ2M=";
    const decoded = jwt.verify(token, secret) as any;
    
    if (decoded.role !== 'STUDENT') {
      return null;
    }
    
    return decoded.id || null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}