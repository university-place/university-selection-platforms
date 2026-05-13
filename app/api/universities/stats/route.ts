import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyUniversityAdmin(request: Request) {
  // same as in your applicants endpoint
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

export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    const year = activeYear?.year || new Date().getFullYear().toString();

    const uniqueStudents = await prisma.preference.groupBy({
      by: ['studentId'],
      where: { 
        universityId, 
        isCancelled: false,
        application: { academicYear: year },
        status: { in: ['SUBMITTED', 'ACCEPTED', 'REJECTED', 'PLACED', 'WAITLISTED', 'BATCH_PLACED', 'BATCH_NOT_PLACED'] }
      }
    });
    const totalApplications = uniqueStudents.length;
    const accepted = await prisma.preference.count({ where: { universityId, status: 'ACCEPTED' } });
    const rejected = await prisma.preference.count({ where: { universityId, status: 'REJECTED' } });
    const pending = await prisma.preference.count({
      where: { universityId, status: { notIn: ['ACCEPTED', 'REJECTED'] } }
    });
    let invitationsSent = 0;
    try {
      invitationsSent = await prisma.interviewInvitation.count({ where: { universityId } });
    } catch { /* model may not exist */ }
    return NextResponse.json({
      success: true,
      stats: { totalApplications, accepted, rejected, pending, invitationsSent }
    });
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}