import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// ============================================
// ADD THIS CORS OPTIONS HANDLER
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

// ============================================
// MODIFIED POST HANDLER WITH CORS
// ============================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { examID, password } = body;

    if (!examID || !password) {
      const errorResponse = NextResponse.json(
        { success: false, message: 'examID and password required' },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    // Get the currently active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });
    if (!activeYear) {
      const errorResponse = NextResponse.json(
        { success: false, message: 'No active admission year' },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    // Find student by examID AND active year
    const student = await prisma.student.findFirst({
      where: { examID, academicYear: activeYear.year },
    });

    if (!student || !student.password) {
      const errorResponse = NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    // Check email verification
    if (!student.emailVerified) {
      const errorResponse = NextResponse.json(
        { success: false, message: 'Please verify your email before logging in' },
        { status: 403 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    // Check password
    const valid = await bcrypt.compare(password, student.password);
    if (!valid) {
      const errorResponse = NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: student.id,
        examID: student.examID,
        role: 'STUDENT',
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    // Create success response with CORS headers
    const successResponse = NextResponse.json({
      success: true,
      token,
      student: {
        examID: student.examID,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        photo: student.photo,
        gender: student.gender,
        disability: student.disability,
        age: student.age,
      },
    });
    
    successResponse.headers.set('Access-Control-Allow-Origin', '*');
    successResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    successResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return successResponse;
    
  } catch (error) {
    console.error('Student login error:', error);
    const errorResponse = NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}