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
      return NextResponse.json({ error: 'Invalid university ID' }, { status: 400 });
    }

    const university = await prisma.university.findUnique({
      where: { 
        id: universityId,
        isActive: true,
        isRegistered: true
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        region: true,
        address: true,
        description: true,
        history: true,
        achievements: true,
        facilities: true,
        researchAreas: true,
        studentLife: true,
        accreditation: true,
        keyFacts: true,
        website: true,
        contactEmail: true,
        contactPhone: true,
        admissionInstructions: true,
        postDecisionInstructions: true,
        applicationStartDate: true,   // ✅ ADD THIS - FIXES THE ISSUE
        applicationDeadline: true,
      }
    });

    if (!university) {
      return NextResponse.json({ error: 'University not found' }, { status: 404 });
    }

    return NextResponse.json(university);
  } catch (error: any) {
    console.error('Error fetching university:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}