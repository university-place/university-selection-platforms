import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

function verifyMOEToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded: any = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!);
    if (decoded.role !== 'MOE_ADMIN' && decoded.role !== 'MOE-ADMIN' && decoded.role !== 'PLATFORM_ADMIN') return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const decoded = verifyMOEToken(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const universityId = searchParams.get('universityId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (universityId) where.universityId = parseInt(universityId);
    if (status) where.status = status;

    const [placements, total] = await Promise.all([
      prisma.placement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { examID: true, firstName: true, lastName: true, stream: true, examResults: true } },
          university: { select: { name: true, code: true, region: true } },
          program: { select: { name: true, code: true } },
        },
      }),
      prisma.placement.count({ where }),
    ]);

    const [totalPlaced, accepted, rejected, pending] = await Promise.all([
      prisma.placement.count(),
      prisma.placement.count({ where: { status: 'ACCEPTED' } }),
      prisma.placement.count({ where: { status: 'REJECTED' } }),
      prisma.placement.count({ where: { status: 'PENDING' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: placements.map((p) => {
        let totalScore: number | null = null;
        const raw = p.student?.examResults;
        if (raw) {
          try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            totalScore = typeof parsed?.total === 'number' ? parsed.total : null;
          } catch {
            totalScore = null;
          }
        }
        return {
          ...p,
          batch: null,
          student: {
            ...p.student,
            totalScore,
          },
        };
      }),
      total,
      page,
      limit,
      summary: { totalPlaced, accepted, rejected, pending },
    });
  } catch (error) {
    console.error('MOE placements monitor error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
