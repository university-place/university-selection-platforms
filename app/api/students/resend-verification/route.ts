import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import { sendVerificationEmail } from '@/lib/email';
import { createStudentVerificationToken } from '@/lib/student-auth-utils';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Find the student
    const student = await prisma.student.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (student.emailVerified) {
      return NextResponse.json(
        { success: false, message: 'Email already verified' },
        { status: 400 }
      );
    }

    // Create new verification token (this will delete old ones automatically)
    const token = await createStudentVerificationToken(student.id);
    
    // Send new verification email
    await sendVerificationEmail(
      student.email!, 
      token, 
      student.firstName, 
      'student'
    );

    return NextResponse.json({
      success: true,
      message: 'Verification email resent. Please check your inbox.',
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}