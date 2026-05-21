import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

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

// GET - Fetch all programs for the university
export async function GET(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const programs = await prisma.program.findMany({
      where: { universityId, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        intakeCapacity: true,
        isActive: true,
      }
    });

    return NextResponse.json({ success: true, programs });
  } catch (error: any) {
    console.error('GET programs error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create a new program
export async function POST(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, description, intakeCapacity } = body;

    if (!name || !code) {
      return NextResponse.json({ success: false, error: 'Name and code are required' }, { status: 400 });
    }

    const program = await prisma.program.create({
      data: {
        name,
        code,
        description: description || null,
        intakeCapacity: intakeCapacity || 0,
        isActive: true,
        universityId,
      }
    });

    return NextResponse.json({ success: true, program });
  } catch (error: any) {
    console.error('POST program error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update a program
export async function PUT(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryId = parseInt(searchParams.get('id') || '0');

    const body = await request.json();
    const { id: bodyId, name, code, description, intakeCapacity, isActive } = body;

    const id = (bodyId ? parseInt(bodyId.toString()) : 0) || queryId;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Program ID is required' }, { status: 400 });
    }

    // Verify program belongs to this university
    const existingProgram = await prisma.program.findFirst({
      where: { id, universityId }
    });

    if (!existingProgram) {
      return NextResponse.json({ success: false, error: 'Program not found' }, { status: 404 });
    }

    const program = await prisma.program.update({
      where: { id },
      data: {
        name: name || existingProgram.name,
        code: code || existingProgram.code,
        description: description !== undefined ? description : existingProgram.description,
        intakeCapacity: intakeCapacity !== undefined ? intakeCapacity : existingProgram.intakeCapacity,
        isActive: isActive !== undefined ? isActive : existingProgram.isActive,
      }
    });

    return NextResponse.json({ success: true, program });
  } catch (error: any) {
    console.error('PUT program error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a program
export async function DELETE(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Program ID is required' }, { status: 400 });
    }

    // Verify program belongs to this university
    const existingProgram = await prisma.program.findFirst({
      where: { id, universityId }
    });

    if (!existingProgram) {
      return NextResponse.json({ success: false, error: 'Program not found' }, { status: 404 });
    }

    await prisma.program.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE program error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}