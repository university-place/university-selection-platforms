import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }  // 👈 MUST be "id"
) {
  try {
    const { id } = await params;  // 👈 MUST be "id"
    const universityId = parseInt(id);  // 👈 Then convert

    if (isNaN(universityId)) {
      return NextResponse.json({ success: false, error: 'Invalid university ID' }, { status: 400 });
    }

    const programs = await prisma.program.findMany({
      where: { 
        universityId: universityId,
        isActive: true,
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