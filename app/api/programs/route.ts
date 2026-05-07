import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const universityId = searchParams.get('universityId');
  if (!universityId) return NextResponse.json({ error: 'universityId required' }, { status: 400 });

  const programs = await prisma.program.findMany({
    where: { universityId: parseInt(universityId), isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' }
  });
  return NextResponse.json({ success: true, programs });
}