import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

function verifyMoeAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any;
  if (decoded.role !== 'MOE_ADMIN' && decoded.role !== 'MOE-ADMIN' && decoded.role !== 'PLATFORM_ADMIN') {
    throw new Error('Forbidden');
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyMoeAdmin(request);
    const { id } = await params;
    const universityId = parseInt(id, 10);

    const university = await prisma.university.findUnique({
      where: { id: universityId },
      include: {
        programs: {
          select: { id: true, name: true, code: true, intakeCapacity: true, isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!university) {
      return NextResponse.json({ success: false, error: 'University not found' }, { status: 404 });
    }

    const [applications, placements, invitations] = await Promise.all([
      prisma.preference.findMany({
        where: { universityId },
        include: {
          student: {
            select: { id: true, examID: true, firstName: true, lastName: true, email: true, phone: true, stream: true, region: true },
          },
          program: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
      prisma.placement.findMany({
        where: { universityId },
        include: {
          student: { select: { id: true, examID: true, firstName: true, lastName: true } },
          program: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
      prisma.interviewInvitation.findMany({
        where: { universityId },
        include: {
          student: { select: { id: true, examID: true, firstName: true, lastName: true } },
          program: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
    ]);

    const statusSummary = {
      applied: applications.length,
      accepted: applications.filter((a) => a.status === 'ACCEPTED').length,
      rejected: applications.filter((a) => a.status === 'REJECTED').length,
      invitation: invitations.length,
      placed: placements.filter((p) => p.status === 'ACCEPTED').length,
      nonPlaced: placements.filter((p) => p.status !== 'ACCEPTED').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        university,
        statusSummary,
        applications,
        placements,
        invitations,
      },
    });
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: error.message || 'Failed to load university details' }, { status });
  }
}
