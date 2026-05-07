import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

// Copy the verify function from your profile route
async function verifyUniversityAdmin(request: Request) {
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
    if (!admin) throw new Error('Admin not linked to university');
    return { universityId: admin.universityId };
  } catch {
    throw new Error('Invalid token');
  }
}

export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const university = await prisma.university.findUnique({
      where: { id: universityId },
      select: { applicationDeadline: true, admissionInstructions: true, postDecisionInstructions: true }
    });
    return NextResponse.json(university || {});
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}