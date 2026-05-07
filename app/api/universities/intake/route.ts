import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

// Helper to verify university admin
async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'UNIVERSITY_ADMIN') {
      return null;
    }
    const admin = await prisma.universityAdmin.findUnique({
      where: { userId: decoded.id },
      select: { universityId: true }
    });
    return admin?.universityId || null;
  } catch {
    return null;
  }
}

// GET - Fetch intake capacities for all programs
export async function GET(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json([]);
    }

    const programs = await prisma.program.findMany({
      where: { universityId, isActive: true },
      include: { _count: { select: { preferences: true } } }
    });

    const intake = programs.map(p => ({
      programId: p.id,
      programName: p.name,
      totalIntake: p.intakeCapacity || 0,
      filled: p._count.preferences,
      available: (p.intakeCapacity || 0) - p._count.preferences,
    }));

    return NextResponse.json(intake);
  } catch (error: any) {
    console.error('GET intake error:', error);
    return NextResponse.json([]);
  }
}

// PUT - Update intake capacities
export async function PUT(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json(); // [{ programId, totalIntake }]

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    for (const item of updates) {
      if (item.programId && item.totalIntake !== undefined) {
        // Verify program belongs to this university
        const program = await prisma.program.findFirst({
          where: { id: item.programId, universityId }
        });
        
        if (program) {
          await prisma.program.update({
            where: { id: item.programId },
            data: { intakeCapacity: item.totalIntake }
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT intake error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}