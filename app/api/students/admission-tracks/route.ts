import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyStudent(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token');
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'STUDENT') throw new Error('Forbidden');
    return { studentId: decoded.id };
  } catch {
    throw new Error('Invalid token');
  }
}

export async function GET(request: Request) {
  try {
    const { studentId } = await verifyStudent(request);
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { totalScore: true, nationality: true }
    });
    const totalScore = student?.totalScore || 0;
    const nationality = student?.nationality || 'Ethiopian';

    const tracks = [
      {
        id: 1,
        name: 'Regular (Non-Autonomous)',
        type: 'non-autonomous',
        description: 'Public university regular admission',
        eligibilityCriteria: 'Score ≥ 400',
        capacity: 10000,
        isEligible: totalScore >= 400
      },
      {
        id: 2,
        name: 'Autonomous University',
        type: 'autonomous',
        description: 'AASTU, Adama Science and Technology',
        eligibilityCriteria: 'Score ≥ 500',
        capacity: 5000,
        isEligible: totalScore >= 500
      },
      {
        id: 3,
        name: 'Scholarship (Foreign)',
        type: 'scholarship',
        description: 'For foreign nationals',
        eligibilityCriteria: 'Non-Ethiopian nationality',
        capacity: 500,
        isEligible: nationality !== 'Ethiopian'
      }
    ];
    return NextResponse.json({ success: true, tracks });
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}