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
  } catch (err) {
    console.error('Token verification error:', err);
    return null;
  }
}

// GET - Fetch all tracks for the university
export async function GET(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ success: true, tracks: [] });
    }

    console.log('Fetching tracks for universityId:', universityId);

    const tracks = await prisma.admissionTrack.findMany({
      where: {
        program: {
          universityId: universityId
        },
        isActive: true
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log('Found tracks:', tracks.length);

    const formattedTracks = tracks.map(track => ({
      id: track.id,
      name: track.name,
      description: track.description || '',
      intakeCapacity: track.intakeCapacity,
      targetAudience: track.targetAudience || 'BOTH',
      programId: track.programId,
      programName: track.program?.name || '',
      isActive: track.isActive
    }));

    return NextResponse.json({ success: true, tracks: formattedTracks });
  } catch (error: any) {
    console.error('GET tracks error:', error);
    return NextResponse.json({ success: true, tracks: [] });
  }
}

// POST - Create a new track
export async function POST(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, intakeCapacity, targetAudience, programId } = body;

    if (!name || !programId) {
      return NextResponse.json({ error: 'Name and programId are required' }, { status: 400 });
    }

    // Verify program belongs to this university
    const program = await prisma.program.findFirst({
      where: { id: programId, universityId }
    });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const track = await prisma.admissionTrack.create({
      data: {
        name,
        description: description || '',
        intakeCapacity: intakeCapacity || 0,
        targetAudience: targetAudience || 'BOTH',
        programId,
        isActive: true
      },
      include: {
        program: {
          select: { name: true }
        }
      }
    });

    console.log('Track created:', track);

    return NextResponse.json({ 
      success: true, 
      track: {
        id: track.id,
        name: track.name,
        description: track.description,
        intakeCapacity: track.intakeCapacity,
        targetAudience: track.targetAudience,
        programId: track.programId,
        programName: track.program?.name || ''
      }
    });
  } catch (error: any) {
    console.error('POST track error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update a track
export async function PUT(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');
    const body = await request.json();
    const { name, description, intakeCapacity, targetAudience } = body;

    if (!id) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    // Verify track belongs to this university
    const existingTrack = await prisma.admissionTrack.findFirst({
      where: { id, program: { universityId } }
    });

    if (!existingTrack) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    const track = await prisma.admissionTrack.update({
      where: { id },
      data: {
        name: name || existingTrack.name,
        description: description !== undefined ? description : existingTrack.description,
        intakeCapacity: intakeCapacity !== undefined ? intakeCapacity : existingTrack.intakeCapacity,
        targetAudience: targetAudience || existingTrack.targetAudience,
      },
      include: {
        program: { select: { name: true } }
      }
    });

    return NextResponse.json({ 
      success: true, 
      track: {
        id: track.id,
        name: track.name,
        description: track.description,
        intakeCapacity: track.intakeCapacity,
        targetAudience: track.targetAudience,
        programId: track.programId,
        programName: track.program?.name || ''
      }
    });
  } catch (error: any) {
    console.error('PUT track error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a track
export async function DELETE(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    
    if (!universityId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');

    if (!id) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    // Verify track belongs to this university
    const existingTrack = await prisma.admissionTrack.findFirst({
      where: { id, program: { universityId } }
    });

    if (!existingTrack) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    await prisma.admissionTrack.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE track error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}