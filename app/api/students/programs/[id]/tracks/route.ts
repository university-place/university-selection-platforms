import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }  // 👈 MUST be "id", not "programId"
) {
  try {
    const { id } = await params;  // 👈 MUST be "id"
    const programId = parseInt(id);  // 👈 Then convert to programId

    if (isNaN(programId)) {
      return NextResponse.json({ success: false, error: 'Invalid program ID' }, { status: 400 });
    }

    const tracks = await prisma.admissionTrack.findMany({
      where: { 
        programId: programId,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        description: true,
        intakeCapacity: true,
        targetAudience: true,
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, tracks });
  } catch (error: any) {
    console.error('Error fetching tracks:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}