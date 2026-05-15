import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import { createStudentResetToken } from '@/lib/student-auth-utils';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { examID, email } = await request.json();

    if (!examID || !email) {
      return NextResponse.json(
        { success: false, message: 'Exam ID and Email are required' },
        { status: 400 }
      );
    }

    const student = await prisma.student.findFirst({
      where: { 
        examID,
        email: { equals: email, mode: 'insensitive' }
      }
    });

    if (!student) {
      // Return success even if student not found for security, 
      // but the user wants "like moe" so maybe I should be explicit if they expect feedback.
      // Usually, it's better to say "If an account exists, an email has been sent."
      return NextResponse.json({
        success: true,
        message: 'If an account matches those details, a reset link has been sent to your email.'
      });
    }

    const token = await createStudentResetToken(student.id);
    await sendPasswordResetEmail(student.email!, token, student.firstName, 'student');

    return NextResponse.json({
      success: true,
      message: 'Password reset link has been sent to your email.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
