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

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch recent activities from audit log
    const activities = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        userEmail: true,
        timestamp: true,
        academicYear: true,
        recordsInserted: true,
        filename: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Activities error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}