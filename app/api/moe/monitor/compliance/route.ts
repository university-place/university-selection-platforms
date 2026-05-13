import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

function verifyMOEToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded: any = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!);
    if (decoded.role !== 'MOE_ADMIN' && decoded.role !== 'PLATFORM_ADMIN') return null;
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

    const universities = await prisma.university.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        region: true,
        isActive: true,
        _count: {
          select: {
            applications: true,
            placements: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const complianceData = await Promise.all(
      universities.map(async (uni) => {
        const [invitationsSent, acceptedApps, pendingApps, appealCount] = await Promise.all([
          prisma.interviewInvitation.count({ where: { universityId: uni.id } }).catch(() => 0),
          prisma.application.count({ where: { universityId: uni.id, status: 'ACCEPTED' } }),
          prisma.application.count({ where: { universityId: uni.id, status: 'PENDING' } }),
          prisma.appeal.count({ where: { preference: { universityId: uni.id } } }),
        ]);

        const totalApps = uni._count.applications;
        const responseRate = totalApps > 0
          ? Math.round(((totalApps - pendingApps) / totalApps) * 100)
          : 0;

        return {
          id: uni.id,
          name: uni.name,
          code: uni.code,
          region: uni.region,
          isActive: uni.isActive,
          totalApplications: totalApps,
          invitationsSent,
          acceptedApplications: acceptedApps,
          pendingApplications: pendingApps,
          totalPlacements: uni._count.placements,
          appealCount,
          responseRate,
          complianceStatus: (responseRate >= 80 && appealCount < 5) ? 'COMPLIANT' : (responseRate >= 50 || appealCount < 10) ? 'PARTIAL' : 'NON_COMPLIANT',
        };
      })
    );

    return NextResponse.json({ success: true, data: complianceData });
  } catch (error) {
    console.error('MOE compliance monitor error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
