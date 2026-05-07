import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { examID, password } = body;

    if (!examID || !password) {
      return NextResponse.json(
        { success: false, message: 'examID and password required' },
        { status: 400 }
      );
    }

    // Get the currently active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });
    if (!activeYear) {
      return NextResponse.json(
        { success: false, message: 'No active admission year' },
        { status: 400 }
      );
    }

    // Find student by examID AND active year
    const student = await prisma.student.findFirst({
      where: { examID, academicYear: activeYear.year },
    });

    if (!student || !student.password) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // ** Check email verification **
    if (!student.emailVerified) {
      return NextResponse.json(
        { success: false, message: 'Please verify your email before logging in' },
        { status: 403 }
      );
    }

    // Check password
    const valid = await bcrypt.compare(password, student.password);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
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

    return NextResponse.json({
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
  } catch (error) {
    console.error('Student login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}