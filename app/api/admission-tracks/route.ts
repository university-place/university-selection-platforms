import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const programId = searchParams.get('programId');
  const forScholarship = searchParams.get('forScholarship') === 'true';
  if (!programId) return NextResponse.json({ error: 'programId required' }, { status: 400 });

  let where: any = { programId: parseInt(programId), isActive: true };
  if (forScholarship) {
    // Show only scholarship tracks (name = 'Scholarship') or those with targetAudience 'FOREIGN' or 'BOTH'
    where.OR = [
      { name: 'Scholarship' },
      { targetAudience: { in: ['FOREIGN', 'BOTH'] } }
    ];
  } else {
    // Exclude scholarship tracks
    where.name = { not: 'Scholarship' };
  }

  const tracks = await prisma.admissionTrack.findMany({
    where,
    select: { id: true, name: true, targetAudience: true },
    orderBy: { name: 'asc' }
  });
  return NextResponse.json({ success: true, tracks });
}