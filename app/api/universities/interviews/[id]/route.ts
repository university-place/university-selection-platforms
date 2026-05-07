import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
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

// ✅ GET single invitation by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const invitationId = parseInt(params.id);

    const invitation = await prisma.interviewInvitation.findFirst({
      where: { id: invitationId, universityId },
      include: {
        student: {
          select: {
            id: true,
            examID: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            region: true,
            examResults: true
          }
        },
        program: true,
        admissionTrack: true
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, invitation });
  } catch (error: any) {
    console.error('GET invitation by ID error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}