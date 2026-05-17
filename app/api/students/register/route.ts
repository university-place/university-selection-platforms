import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import bcrypt from 'bcrypt';

// ============================================
// ADD CORS OPTIONS HANDLER
// ============================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function isValidPassword(password: string): boolean {
  if (password.length < 6) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { examID, firstName, lastName, email, phone, password, confirmPassword } = body;

    examID = examID?.trim();
    firstName = firstName?.trim();
    lastName = lastName?.trim();
    email = email?.trim();
    phone = phone?.trim();

    // Validation checks
    if (!examID || !firstName || !lastName || !password || !confirmPassword) {
      const errorResponse = NextResponse.json(
        { success: false, message: 'Exam ID, Name, and Password are required' },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    if (password !== confirmPassword) {
      const errorResponse = NextResponse.json(
        { success: false, message: 'Passwords do not match' },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    if (!isValidPassword(password)) {
      const errorResponse = NextResponse.json(
        {
          success: false,
          message: 'Password must be at least 6 characters with uppercase, lowercase, and number',
        },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    const activeYear = await prisma.academicYear.findFirst({ 
      where: { isActive: true } 
    });
    
    if (!activeYear) {
      const errorResponse = NextResponse.json(
        { success: false, message: 'No active admission year' },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    const student = await prisma.student.findFirst({
      where: { 
        examID, 
        academicYear: activeYear.year 
      },
    });

    if (!student) {
      const errorResponse = NextResponse.json(
        { success: false, message: 'Student not found. Please check your admission card number.' },
        { status: 404 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    if (student.firstName !== firstName || student.lastName !== lastName) {
      const errorResponse = NextResponse.json(
        { success: false, message: 'Name does not match our records' },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    // Only check email if provided
    if (email && student.email?.toLowerCase() !== email.toLowerCase()) {
      const errorResponse = NextResponse.json(
        { success: false, message: 'Email does not match our records' },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    if (student.isRegistered) {
      const errorResponse = NextResponse.json(
        { success: false, message: 'Student already registered' },
        { status: 409 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare update data
    const updateData: any = {
      password: hashedPassword,
      isRegistered: true,
    };

    if (email) {
      updateData.email = email;
      updateData.emailVerified = false; // Needs verification
    } else {
      updateData.emailVerified = true; // Auto-verified if no email
    }

    if (phone) {
      updateData.phone = phone;
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: updateData,
    });

    // Send verification email only if email was provided
    if (email) {
      try {
        const { sendVerificationEmail } = await import('@/lib/email');
        const { createStudentVerificationToken } = await import('@/lib/student-auth-utils');
        const token = await createStudentVerificationToken(updated.id);
        await sendVerificationEmail(updated.email!, token, updated.firstName, 'student');
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    // Create success response with CORS headers
    const successResponse = NextResponse.json({
      success: true,
      message: email 
        ? 'Registration successful! Please check your email to verify your account.'
        : 'Registration successful! You can now login with your Exam ID.',
      student: {
        examID: updated.examID,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email || null,
      },
    });
    
    successResponse.headers.set('Access-Control-Allow-Origin', '*');
    successResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    successResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return successResponse;
    
  } catch (error) {
    console.error('Registration error:', error);
    const errorResponse = NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}