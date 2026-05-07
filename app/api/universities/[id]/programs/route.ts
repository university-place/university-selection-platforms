import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const universityId = parseInt(id);

    if (isNaN(universityId)) {
      return NextResponse.json({ success: false, error: 'Invalid university ID' }, { status: 400 });
    }

    const programs = await prisma.program.findMany({
      where: { 
        universityId: universityId,
        isActive: true,
        isVerified: true
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        intakeCapacity: true,
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, programs });
  } catch (error: any) {
    console.error('Error fetching programs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}