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
    const action = searchParams.get('action');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');

    const where: any = {};
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { email: true, name: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: logs, total, page, limit });
  } catch (error) {
    console.error('MOE audit log error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
