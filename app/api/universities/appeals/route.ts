import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'UNIVERSITY_ADMIN') return null;
    
    const admin = await prisma.universityAdmin.findUnique({
      where: { userId: decoded.id },
      select: { universityId: true }
    });
    
    return admin ? admin.universityId : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    if (!universityId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const appeals = await prisma.appeal.findMany({
      where: {
        OR: [
          { preference: { universityId: universityId } },
          // If a student is appealing something else but it involves the university
        ]
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            examID: true,
            stream: true
          }
        },
        preference: {
          include: {
            program: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: appeals });
  } catch (error: any) {
    console.error('Error fetching university appeals:', error);
    return NextResponse.json({ error: 'Failed to fetch appeals' }, { status: 500 });
  }
}
