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
    const stream = searchParams.get('stream');
    const region = searchParams.get('region');
    const search = searchParams.get('search');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const disability = searchParams.get('disability');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = { isCancelled: false };
    if (universityId) where.universityId = parseInt(universityId);
    if (stream) {
      where.student = {
        stream: stream === 'natural' ? 'Natural Science' : stream === 'social' ? 'Social Science' : stream,
      };
    }
    if (region) {
      where.student = { ...(where.student || {}), region };
    }
    if (disability) {
      where.student = { ...(where.student || {}), disability };
    }
    if (search) {
      where.OR = [
        { student: { examID: { contains: search, mode: 'insensitive' } } },
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { student: { email: { contains: search, mode: 'insensitive' } } },
        { university: { name: { contains: search, mode: 'insensitive' } } },
        { program: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const applications = await prisma.preference.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            examID: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            stream: true,
            region: true,
            disability: true,
            age: true,
            dateOfBirth: true,
            examResults: true,
            StudentConfirmation: {
              select: {
                universityId: true,
                status: true,
                confirmed: true,
                confirmedAt: true,
                confirmationDeadline: true,
              },
            },
            placements: {
              select: {
                universityId: true,
                status: true,
                createdAt: true,
              },
            },
            InterviewInvitation: {
              select: {
                universityId: true,
                status: true,
                type: true,
                date: true,
                location: true,
                responseDeadline: true,
              },
              orderBy: { date: 'desc' },
            },
          },
        },
        university: { select: { id: true, name: true, code: true, region: true } },
        program: { select: { id: true, name: true, code: true } },
      },
    });

    const getTotalScore = (examResults: any) => {
      if (!examResults) return null;
      let results = examResults;
      if (typeof examResults === 'string') {
        try {
          results = JSON.parse(examResults);
        } catch {
          return null;
        }
      }
      if (typeof results?.total === 'number') return results.total;
      return null;
    };

    const normalizeStatus = (record: any) => {
      const confirmation = (record.student?.StudentConfirmation || []).find(
        (c: any) => c.universityId === record.universityId
      );
      const placement = (record.student?.placements || []).find(
        (p: any) => p.universityId === record.universityId
      );
      const invitation = (record.student?.InterviewInvitation || []).find(
        (i: any) => i.universityId === record.universityId
      );

      if (confirmation?.confirmed === true || confirmation?.status === 'CONFIRMED') return 'CONFIRMED';
      if (confirmation?.status === 'DECLINED') return 'DECLINED';
      if (record.status === 'BATCH_NOT_PLACED' || record.status === 'REJECTED') return 'NOT_PLACED';
      if (record.status === 'BATCH_PLACED' || record.status === 'PLACED') return 'PLACED';
      if (record.status === 'ACCEPTED' || placement?.status === 'ACCEPTED') return 'WAITING_RESPONSE';
      if (invitation && ['PENDING', 'ACCEPTED'].includes(invitation.status)) return 'WAITING_RESPONSE';
      return 'PENDING';
    };

    // Keep latest record per student per university for MOE view
    const latestMap = new Map<string, any>();
    for (const app of applications) {
      const key = `${app.studentId}-${app.universityId}`;
      if (!latestMap.has(key)) latestMap.set(key, app);
    }
    let data = Array.from(latestMap.values()).map((app) => {
      const totalScore = getTotalScore(app.student?.examResults);
      const normalizedStatus = normalizeStatus(app);
      const latestInvitation = (app.student?.InterviewInvitation || []).find(
        (i: any) => i.universityId === app.universityId
      );
      const confirmation = (app.student?.StudentConfirmation || []).find(
        (c: any) => c.universityId === app.universityId
      );

      return {
        id: app.id,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        rawStatus: app.status,
        status: normalizedStatus,
        student: {
          id: app.student?.id,
          examID: app.student?.examID,
          firstName: app.student?.firstName,
          lastName: app.student?.lastName,
          fullName: `${app.student?.firstName || ''} ${app.student?.lastName || ''}`.trim(),
          email: app.student?.email,
          phone: app.student?.phone,
          stream: app.student?.stream,
          region: app.student?.region,
          disability: app.student?.disability,
          age: app.student?.age,
          totalScore,
        },
        university: app.university,
        program: app.program,
        invitation: latestInvitation || null,
        confirmation: confirmation || null,
      };
    });

    if (status) {
      data = data.filter((d) => d.status === status);
    }
    if (minScore) data = data.filter((d) => (d.student?.totalScore ?? -1) >= Number(minScore));
    if (maxScore) data = data.filter((d) => (d.student?.totalScore ?? 9999) <= Number(maxScore));

    const total = data.length;
    const paged = data.slice((page - 1) * limit, page * limit);

    const summary = {
      total,
      placed: data.filter((d) => d.status === 'PLACED').length,
      notPlaced: data.filter((d) => d.status === 'NOT_PLACED').length,
      waitingResponse: data.filter((d) => d.status === 'WAITING_RESPONSE').length,
      confirmed: data.filter((d) => d.status === 'CONFIRMED').length,
      declined: data.filter((d) => d.status === 'DECLINED').length,
      pending: data.filter((d) => d.status === 'PENDING').length,
    };

    return NextResponse.json({ success: true, data: paged, total, page, limit, summary });
  } catch (error) {
    console.error('MOE applications monitor error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
