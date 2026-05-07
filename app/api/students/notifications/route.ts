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
    const notifications = await prisma.notification.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}