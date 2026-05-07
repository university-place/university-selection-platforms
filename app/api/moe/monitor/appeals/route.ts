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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (status) where.status = status;

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { examID: true, firstName: true, lastName: true, stream: true } },
        },
      }),
      prisma.appeal.count({ where }),
    ]);

    const [totalAppeals, pending, resolved, rejected] = await Promise.all([
      prisma.appeal.count(),
      prisma.appeal.count({ where: { status: 'PENDING' } }),
      prisma.appeal.count({ where: { status: 'RESOLVED' } }),
      prisma.appeal.count({ where: { status: 'REJECTED' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: appeals,
      total,
      summary: { totalAppeals, pending, resolved, rejected },
    });
  } catch (error) {
    console.error('MOE appeals monitor error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const decoded = verifyMOEToken(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { appealId, status, resolution } = await request.json();
    if (!appealId || !status) {
      return NextResponse.json({ success: false, error: 'appealId and status are required' }, { status: 400 });
    }

    const appeal = await prisma.appeal.update({
      where: { id: appealId },
      data: {
        status,
        resolution: resolution || undefined,
        resolvedAt: status !== 'PENDING' ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true, data: appeal });
  } catch (error) {
    console.error('MOE appeal update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
