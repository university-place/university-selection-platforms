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

// GET - Fetch all eligibility rules for the university
export async function GET(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ success: true, rules: [] });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');

    const where: any = { program: { universityId } };
    if (programId) where.programId = parseInt(programId);

    const rules = await prisma.eligibilityRule.findMany({
      where,
      include: {
        program: { select: { id: true, name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, rules });
  } catch (error: any) {
    console.error('GET rules error:', error);
    return NextResponse.json({ success: true, rules: [] });
  }
}

// POST - Create a new eligibility rule
export async function POST(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { programId, minScore, maxScore, region, disabilityStatus, stream } = body;

    if (!programId) {
      return NextResponse.json({ error: 'ProgramId is required' }, { status: 400 });
    }

    // Verify program belongs to this university
    const program = await prisma.program.findFirst({
      where: { id: programId, universityId }
    });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const rule = await prisma.eligibilityRule.create({
      data: {
        programId,
        minScore: minScore || 0,
        maxScore: maxScore || 350,
        region: region || null,
        disabilityStatus: disabilityStatus || null,
        stream: stream || null,
      }
    });

    return NextResponse.json({ success: true, rule });
  } catch (error: any) {
    console.error('POST rule error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update an eligibility rule
export async function PUT(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, minScore, maxScore, region, disabilityStatus, stream } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    // Verify rule belongs to this university
    const existingRule = await prisma.eligibilityRule.findFirst({
      where: { id, program: { universityId } }
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    const rule = await prisma.eligibilityRule.update({
      where: { id },
      data: {
        minScore: minScore !== undefined ? minScore : existingRule.minScore,
        maxScore: maxScore !== undefined ? maxScore : existingRule.maxScore,
        region: region !== undefined ? region : existingRule.region,
        disabilityStatus: disabilityStatus !== undefined ? disabilityStatus : existingRule.disabilityStatus,
        stream: stream !== undefined ? stream : existingRule.stream,
      }
    });

    return NextResponse.json({ success: true, rule });
  } catch (error: any) {
    console.error('PUT rule error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete an eligibility rule
export async function DELETE(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    // Verify rule belongs to this university
    const existingRule = await prisma.eligibilityRule.findFirst({
      where: { id, program: { universityId } }
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    await prisma.eligibilityRule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE rule error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}