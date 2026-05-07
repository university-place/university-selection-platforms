import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyStudent(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token');
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'STUDENT') throw new Error('Forbidden');
    return { studentId: decoded.id };
  } catch {
    throw new Error('Invalid token');
  }
}

export async function GET(request: Request) {
  try {
    const { studentId } = await verifyStudent(request);
    const placement = await prisma.placement.findFirst({
      where: { studentId },
      include: {
        university: { select: { id: true, name: true } },
        program: { select: { id: true, name: true } }
      }
    });
    if (!placement) {
      return NextResponse.json({ success: true, placement: null });
    }
    return NextResponse.json({
      success: true,
      placement: {
        id: placement.id,
        universityId: placement.universityId,
        universityName: placement.university.name,
        programId: placement.programId,
        programName: placement.program.name,
        status: placement.status,
        decisionDate: placement.decisionDate,
        confirmationDeadline: placement.confirmationDeadline,
        confirmedAt: placement.confirmedAt
      }
    });
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}