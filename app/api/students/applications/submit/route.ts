import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';  // ← Use your existing prisma client
import jwt from 'jsonwebtoken';

async function verifyStudent(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'STUDENT') {
      throw new Error('Forbidden');
    }
    return { studentId: decoded.id };
  } catch {
    throw new Error('Invalid token');
  }
}

export async function POST(request: Request) {
  try {
    const { studentId } = await verifyStudent(request);
    const body = await request.json();
    const { preferenceId } = body;

    console.log('Submit request - Student ID:', studentId, 'Preference ID:', preferenceId);

    if (!preferenceId) {
      return NextResponse.json(
        { error: 'Preference ID is required' },
        { status: 400 }
      );
    }

    // Find the preference
    const preference = await prisma.preference.findFirst({
      where: {
        id: Number(preferenceId),
        studentId: studentId
      },
      include: {
        university: true
      }
    });

    if (!preference) {
      return NextResponse.json(
        { error: 'Preference not found' },
        { status: 404 }
      );
    }

    // Check if already submitted
    if (preference.submittedAt) {
      return NextResponse.json(
        { error: 'This preference has already been submitted' },
        { status: 400 }
      );
    }

    // Check university deadline
    const now = new Date();
    const deadline = preference.university?.applicationDeadline;
    if (deadline && new Date(deadline) < now) {
      return NextResponse.json(
        { error: `Application deadline for ${preference.university.name} has passed` },
        { status: 403 }
      );
    }

    // Check attempts (max 3 per university)
    const MAX_ATTEMPTS = 10;
    const currentAttempts = preference.submissionCount || 0;

    if (currentAttempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: `You have exhausted all ${MAX_ATTEMPTS} submission attempts for ${preference.university.name}` },
        { status: 403 }
      );
    }

    // Update the preference
    const updatedPreference = await prisma.preference.update({
      where: { id: preference.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submissionCount: (preference.submissionCount || 0) + 1,
        updatedAt: new Date()
      }
    });

    const remainingAttempts = MAX_ATTEMPTS - (currentAttempts + 1);

    return NextResponse.json({
      success: true,
      message: `Successfully submitted to ${preference.university.name}!`,
      submittedAt: updatedPreference.submittedAt,
      remainingAttempts: remainingAttempts,
      totalAttemptsUsed: currentAttempts + 1
    });

  } catch (error: any) {
    console.error('Submit error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Submit API is working. Use POST to submit a preference.',
    status: 'active'
  });
}