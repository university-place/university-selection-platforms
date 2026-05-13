import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyMOEAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role === 'MOE_ADMIN' || decoded.role === 'MOE-ADMIN' || decoded.role === 'PLATFORM_ADMIN') {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const admin = await verifyMOEAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const stream = searchParams.get('stream');
    const universityId = searchParams.get('universityId');
    const status = searchParams.get('status');

    const where: any = {};
    if (status) where.status = status;
    if (universityId) where.preference = { universityId: parseInt(universityId) };
    if (stream) {
      where.student = { stream: stream };
    }

    const appeals = await prisma.appeal.findMany({
      where,
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            examID: true,
            stream: true,
            region: true
          }
        },
        preference: {
          include: {
            university: { select: { name: true } },
            program: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: appeals });
  } catch (error: any) {
    console.error('Error fetching appeals:', error);
    return NextResponse.json({ error: 'Failed to fetch appeals' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await verifyMOEAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, status, resolution } = await request.json();

    const appeal = await prisma.appeal.update({
      where: { id: parseInt(id) },
      data: {
        status,
        resolution,
        resolvedBy: admin.email,
        resolvedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, data: appeal });
  } catch (error: any) {
    console.error('Error updating appeal:', error);
    return NextResponse.json({ error: 'Failed to update appeal' }, { status: 500 });
  }
}
