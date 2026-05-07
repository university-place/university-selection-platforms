import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token');
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'UNIVERSITY_ADMIN') throw new Error('Forbidden');
    const admin = await prisma.universityAdmin.findUnique({
      where: { userId: decoded.id },
      select: { universityId: true }
    });
    if (!admin) throw new Error('University admin record not found');
    return { userId: decoded.id, universityId: admin.universityId };
  } catch {
    throw new Error('Invalid token');
  }
}

function calculateTotalScore(examResults: any): number {
  if (!examResults) return 0;
  let results = examResults;
  if (typeof results === 'string') {
    try { results = JSON.parse(results); } catch { return 0; }
  }
  const naturalTotal = (results.mathematics || 0) + (results.english || 0) +
                       (results.physics || 0) + (results.chemistry || 0) +
                       (results.biology || 0);
  const socialTotal = (results.mathematics || 0) + (results.english || 0) +
                      (results.history || 0) + (results.geography || 0) +
                      (results.economics || 0);
  if (results.total) return results.total;
  return Math.max(naturalTotal, socialTotal);
}

export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const preferences = await prisma.preference.findMany({
      where: { universityId },
      include: {
        application: {
          include: {
            student: {
              select: {
                examID: true,
                firstName: true,
                lastName: true,
                examResults: true,
              }
            }
          }
        },
        program: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const applications = preferences.map(pref => {
      const student = pref.application.student;
      const totalScore = calculateTotalScore(student.examResults);
      return {
        id: pref.id,
        examID: student.examID,
        studentName: `${student.firstName} ${student.lastName}`,
        programName: pref.program?.name || 'N/A',
        score: totalScore,
        status: pref.status || 'PENDING',
        appliedAt: pref.createdAt,
      };
    });

    return NextResponse.json({ success: true, applications });
  } catch (error: any) {
    console.error('Applications error:', error);
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}