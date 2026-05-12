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
    const status = searchParams.get('status') || 'ALL'; // PLACED, NOT_PLACED, MULTI_PLACED, ALL
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const search = searchParams.get('search');

    const where: any = {};
    
    if (search) {
      where.OR = [
        { examID: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status === 'PLACED') {
      where.preferences = { some: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } } };
    } else if (status === 'NOT_PLACED') {
      where.AND = [
        { preferences: { some: {} } },
        { preferences: { none: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } } } }
      ];
    } else if (status === 'MULTI_PLACED') {
      // Find IDs first
      const allPlaced = await prisma.preference.findMany({
        where: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } },
        select: { studentId: true, universityId: true }
      });
      const counts: Record<number, Set<number>> = {};
      allPlaced.forEach(p => {
        if (p.studentId) {
          if (!counts[p.studentId]) counts[p.studentId] = new Set();
          counts[p.studentId].add(p.universityId);
        }
      });
      const multiIds = Object.keys(counts).filter(id => counts[parseInt(id)].size > 1).map(Number);
      where.id = { in: multiIds };
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { examID: 'asc' },
        include: {
          preferences: {
            where: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } },
            include: { university: { select: { name: true, region: true } } }
          },
          StudentConfirmation: {
            where: { status: 'CONFIRMED' },
            include: { university: { select: { name: true, region: true } } }
          }
        },
      }),
      prisma.student.count({ where }),
    ]);

    // Aggregate summary stats quickly
    const totalStudents = await prisma.student.count();
    const placedStudents = await prisma.student.count({
      where: { preferences: { some: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } } } }
    });
    
    // We can estimate multiple placed similarly
    const multiPlacedRaw = await prisma.preference.groupBy({
      by: ['studentId'],
      where: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } },
      having: { studentId: { _count: { gt: 1 } } }
    });

    const summary = {
      totalStudents,
      placed: placedStudents,
      notPlaced: totalStudents - placedStudents,
      multiPlaced: multiPlacedRaw.length
    };

    return NextResponse.json({
      success: true,
      data: students.map((s) => {
        let totalScore: number | null = null;
        const raw = s.examResults;
        if (raw) {
          try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            totalScore = typeof parsed?.total === 'number' ? parsed.total : null;
          } catch {
            totalScore = null;
          }
        }

        // Gather unique universities that placed the student
        const universities = new Map();
        s.preferences.forEach(p => {
          if (p.university) universities.set(p.university.name, p.university.region);
        });
        s.StudentConfirmation.forEach(c => {
          if (c.university) universities.set(c.university.name, c.university.region);
        });

        const universityNames = Array.from(universities.keys());
        
        let aggStatus = 'Not Placed';
        if (universityNames.length === 1) aggStatus = 'Placed';
        if (universityNames.length > 1) aggStatus = 'Multi-Placed';

        return {
          id: s.id,
          student: {
            examID: s.examID,
            firstName: s.firstName,
            lastName: s.lastName,
            stream: s.stream,
            totalScore,
          },
          universities: universityNames,
          regions: Array.from(new Set(universities.values())),
          status: aggStatus,
          createdAt: s.createdAt
        };
      }),
      total,
      page,
      limit,
      summary,
    });
  } catch (error) {
    console.error('MOE placements monitor error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

