import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check role (MOE_ADMIN or PLATFORM_ADMIN)
    if (decoded.role !== 'MOE_ADMIN' && decoded.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get students grouped by academic year
    const studentsByYear = await prisma.student.groupBy({
      by: ['academicYear'],
      _count: true,
      orderBy: { academicYear: 'desc' },
    });

    const result = studentsByYear.map(item => ({
      academicYear: item.academicYear,
      count: item._count,
    }));

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Students by year error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}