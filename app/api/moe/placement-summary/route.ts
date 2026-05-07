import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyMoeAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'MOE_ADMIN' && decoded.role !== 'PLATFORM_ADMIN') {
      throw new Error('Forbidden');
    }
    return { userId: decoded.id, role: decoded.role };
  } catch {
    throw new Error('Invalid token');
  }
}

// GET - Get placement summary by university
export async function GET(request: Request) {
  try {
    await verifyMoeAdmin(request);
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear');

    let targetYear = academicYear;
    if (!targetYear) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true }
      });
      if (activeYear) targetYear = activeYear.year;
    }

    // Get all universities
    const universities = await prisma.university.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        region: true,
        type: true,
        programs: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Get placement counts per university
    const placements = await prisma.placement.groupBy({
      by: ['universityId', 'status'],
      where: {
        academicYear: targetYear
      },
      _count: true
    });

    // Get student counts per university (applications)
    const applications = await prisma.preference.groupBy({
      by: ['universityId'],
      where: {
        application: {
          academicYear: targetYear
        }
      },
      _count: true
    });

    // Build summary
    const summary = universities.map(uni => {
      const uniPlacements = placements.filter(p => p.universityId === uni.id);
      const accepted = uniPlacements.find(p => p.status === 'ACCEPTED')?._count || 0;
      const rejected = uniPlacements.find(p => p.status === 'REJECTED')?._count || 0;
      const pending = uniPlacements.find(p => p.status === 'PENDING')?._count || 0;
      const totalApplications = applications.find(a => a.universityId === uni.id)?._count || 0;
      
      // Calculate fill rate
      const totalCapacity = uni.programs.reduce((sum, p) => sum + (p.capacity || 0), 0);
      const fillRate = totalCapacity > 0 ? (accepted / totalCapacity) * 100 : 0;

      return {
        id: uni.id,
        name: uni.name,
        code: uni.code,
        region: uni.region,
        type: uni.type,
        programs: uni.programs.map(p => ({
          id: p.id,
          name: p.name,
          code: p.code
        })),
        stats: {
          applications: totalApplications,
          accepted,
          rejected,
          pending,
          totalCapacity,
          fillRate: Math.round(fillRate)
        }
      };
    });

    // Overall statistics
    const overallStats = {
      totalUniversities: universities.length,
      totalApplications: summary.reduce((sum, u) => sum + u.stats.applications, 0),
      totalAccepted: summary.reduce((sum, u) => sum + u.stats.accepted, 0),
      totalRejected: summary.reduce((sum, u) => sum + u.stats.rejected, 0),
      totalPending: summary.reduce((sum, u) => sum + u.stats.pending, 0),
      academicYear: targetYear
    };

    return NextResponse.json({
      success: true,
      summary,
      overallStats,
      academicYear: targetYear
    });
  } catch (error: any) {
    console.error('Get placement summary error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}