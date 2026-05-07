import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Base filter: only active AND registered universities
    let where: any = {
      isActive: true,
      isRegistered: true,
    };

    // Map frontend type strings to actual database values
    if (type === 'non-autonomous') {
      where.type = 'public';
    } else if (type === 'autonomous') {
      where.type = 'autonomous';
    } else if (type === 'scholarship') {
      // For scholarship, we show all active+registered universities
    }

    const universities = await prisma.university.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        region: true,
        applicationStartDate: true,   // ✅ ADD THIS
        applicationDeadline: true,    // ✅ ADD THIS
        description: true,            // ✅ OPTIONAL - might be useful
        website: true,                // ✅ OPTIONAL - might be useful
        contactEmail: true,           // ✅ OPTIONAL - might be useful
        contactPhone: true,           // ✅ OPTIONAL - might be useful
      },
    });

    return NextResponse.json({ success: true, universities });
  } catch (error: any) {
    console.error('GET /api/universities error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}