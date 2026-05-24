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

    const { searchParams } = new URL(request.url);
    const stream = searchParams.get('stream') || 'all';
    const gender = searchParams.get('gender') || 'all';
    const status = searchParams.get('status') || 'all';

    const where: any = { universityId };

    if (stream !== 'all') {
      where.student = where.student || {};
      where.student.stream = stream === 'natural' ? 'Natural Science' : 'Social Science';
    }

    if (gender !== 'all') {
      where.student = where.student || {};
      where.student.gender = gender === 'male' ? 'Male' : 'Female';
    }

    if (status !== 'all') {
      switch (status) {
        case 'SUBMITTED':
          where.isCancelled = { not: true };
          where.status = 'SUBMITTED';
          break;
        case 'CANCELLED':
          where.isCancelled = true;
          break;
        case 'PLACED':
          where.status = 'PLACED';
          break;
        case 'NOT_PLACED':
          where.status = { not: 'PLACED' };
          break;
        case 'ACCEPTED_BY_STUDENT':
          where.student = where.student || {};
          where.student.StudentConfirmation = {
            some: {
              universityId,
              status: 'CONFIRMED'
            }
          };
          break;
        case 'REJECTED_BY_STUDENT':
          where.student = where.student || {};
          where.student.StudentConfirmation = {
            some: {
              universityId,
              status: 'DECLINED'
            }
          };
          break;
        case 'INVITATION_ACCEPTED':
          where.student = where.student || {};
          where.student.InterviewInvitation = {
            some: {
              universityId,
              studentResponse: 'ACCEPTED'
            }
          };
          break;
        case 'INVITATION_REJECTED':
          where.student = where.student || {};
          where.student.InterviewInvitation = {
            some: {
              universityId,
              studentResponse: 'DECLINED'
            }
          };
          break;
      }
    }

    const [applications, placements, invitations] = await Promise.all([
      prisma.preference.findMany({
        where,
        include: {
          student: {
            select: { id: true, examID: true, firstName: true, lastName: true, email: true, phone: true, stream: true, region: true, gender: true },
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
