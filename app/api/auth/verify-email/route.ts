import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const type = searchParams.get('type') || 'admin';

  if (!token) {
    return new NextResponse('Missing token', { status: 400 });
  }

  try {
    if (type === 'student') {
      // Handle student verification
      const vt = await prisma.studentVerificationToken.findFirst({
        where: { 
          token: token,
          usedAt: null,
          expiresAt: { gt: new Date() }
        },
        include: { student: true },
      });
      
      if (!vt) {
        return new NextResponse('Invalid or expired token', { status: 400 });
      }

      await prisma.$transaction([
        prisma.studentVerificationToken.update({
          where: { id: vt.id },
          data: { usedAt: new Date() }
        }),
        prisma.student.update({
          where: { id: vt.studentId },
          data: { emailVerified: true }
        }),
      ]);

      return new NextResponse(
        '<h1>Email verified successfully!</h1><p>You can now log in.</p>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    } else {
      // Handle admin verification
      const vt = await prisma.verificationToken.findFirst({
        where: { 
          token: token,
          usedAt: null,
          expiresAt: { gt: new Date() }
        },
        include: { user: true },
      });
      
      if (!vt) {
        return new NextResponse('Invalid or expired token', { status: 400 });
      }

      await prisma.$transaction([
        prisma.verificationToken.update({
          where: { id: vt.id },
          data: { usedAt: new Date() }
        }),
        prisma.user.update({
          where: { id: vt.userId },
          data: { emailVerified: true }
        }),
      ]);

      return new NextResponse(
        '<h1>Email verified successfully!</h1><p>You can now log in.</p>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  } catch (error) {
    console.error('Verification error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}