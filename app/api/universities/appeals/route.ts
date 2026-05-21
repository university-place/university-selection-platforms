import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'UNIVERSITY_ADMIN') return null;
    
    const admin = await prisma.universityAdmin.findUnique({
      where: { userId: decoded.id },
      select: { universityId: true }
    });
    
    return admin ? admin.universityId : null;
  } catch {
    return null;
  }
}

// GET - Retrieve appeals for university (both incoming student appeals and outgoing MoE appeals)
export async function GET(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    if (!universityId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const appeals = await prisma.appeal.findMany({
      where: {
        OR: [
          { universityId: universityId },
          { preference: { universityId: universityId } }
        ]
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            examID: true,
            stream: true
          }
        },
        preference: {
          include: {
            program: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Separate student appeals and outgoing university-to-MoE appeals
    const studentAppeals = appeals.filter(a => a.senderRole === 'STUDENT');
    const universityAppeals = appeals.filter(a => a.senderRole === 'UNIVERSITY');

    return NextResponse.json({ 
      success: true, 
      data: appeals,
      studentAppeals,
      universityAppeals
    });
  } catch (error: any) {
    console.error('Error fetching university appeals:', error);
    return NextResponse.json({ error: 'Failed to fetch appeals' }, { status: 500 });
  }
}

// POST - Submit university-to-MoE appeal
export async function POST(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    if (!universityId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, description } = await request.json();

    if (!type || !description) {
      return NextResponse.json({ error: 'Type and description are required' }, { status: 400 });
    }

    const appeal = await prisma.appeal.create({
      data: {
        universityId,
        type,
        description,
        senderRole: 'UNIVERSITY',
        target: 'MOE',
        status: 'pending'
      }
    });

    return NextResponse.json({ success: true, data: appeal });
  } catch (error: any) {
    console.error('Error creating university appeal:', error);
    return NextResponse.json({ error: 'Failed to submit appeal' }, { status: 500 });
  }
}

// PATCH - Respond to a student appeal
export async function PATCH(request: Request) {
  try {
    const universityId = await verifyUniversityAdmin(request);
    if (!universityId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { appealId, status, resolution } = await request.json();

    if (!appealId || !status) {
      return NextResponse.json({ error: 'Appeal ID and status are required' }, { status: 400 });
    }

    // Verify appeal belongs to or is targeted to this university
    const existing = await prisma.appeal.findFirst({
      where: {
        id: parseInt(appealId),
        OR: [
          { universityId },
          { preference: { universityId } }
        ]
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Appeal not found or not authorized' }, { status: 404 });
    }

    const updated = await prisma.appeal.update({
      where: { id: parseInt(appealId) },
      data: {
        status,
        resolution,
        resolvedBy: 'UNIVERSITY',
        resolvedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating appeal:', error);
    return NextResponse.json({ error: 'Failed to update appeal' }, { status: 500 });
  }
}
