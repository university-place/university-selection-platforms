import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
        return NextResponse.json(
            { success: false, message: 'Password must be at least 6 characters' },
            { status: 400 }
        );
    }

    const resetToken = await prisma.studentVerificationToken.findFirst({
      where: { 
        token: token,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { student: true }
    });

    if (!resetToken) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.student.update({
        where: { id: resetToken.studentId },
        data: { password: hashedPassword }
      }),
      prisma.studentVerificationToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Password reset successful! You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
