import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function getMaxAcceptances(): Promise<number> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'maxPlacementAcceptances' }
    });
    if (config && typeof config.value === 'number') return config.value;
    return 1; // default: only 1 university
  } catch {
    return 1;
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.substring(7);
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const body = await request.json();
    const { preferenceId, action } = body; // action: 'confirm' or 'decline'
    
    if (!preferenceId || !action) {
      return NextResponse.json({ error: 'Preference ID and action required' }, { status: 400 });
    }
    
    // Get the preference
    const preference = await prisma.preference.findFirst({
      where: {
        id: preferenceId,
        studentId: decoded.id
      },
      include: {
        university: true,
        program: true
      }
    });
    
    if (!preference) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }
    
    // Check if deadline has passed
    if (preference.confirmationDeadline && new Date(preference.confirmationDeadline) < new Date()) {
      return NextResponse.json({ error: 'Response deadline has passed' }, { status: 400 });
    }

    // ✅ Enforce MOE placement acceptance limit (only when confirming)
    if (action === 'confirm') {
      const maxAcceptances = await getMaxAcceptances();
      const confirmedCount = await prisma.studentConfirmation.count({
        where: {
          studentId: decoded.id,
          status: 'CONFIRMED'
        }
      });
      if (confirmedCount >= maxAcceptances) {
        return NextResponse.json({
          error: `You cannot accept more than ${maxAcceptances} university placement${maxAcceptances > 1 ? 's' : ''}. The Ministry of Education has set this limit for the current academic year.`
        }, { status: 403 });
      }
    }
    
    const status = action === 'confirm' ? 'CONFIRMED' : 'DECLINED';
    const isConfirmed = action === 'confirm';
    
    // Update preference confirmedAt
    await prisma.preference.update({
      where: { id: preferenceId },
      data: {
        confirmedAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Update or create student confirmation
    await prisma.studentConfirmation.upsert({
      where: {
        studentId_universityId_academicYear: {
          studentId: decoded.id,
          universityId: preference.universityId,
          academicYear: preference.academicYear || '2024'
        }
      },
      update: {
        confirmed: isConfirmed,
        confirmedAt: new Date(),
        status: status,
        updatedAt: new Date()
      },
      create: {
        studentId: decoded.id,
        universityId: preference.universityId,
        programId: preference.programId,
        academicYear: preference.academicYear || '2024',
        confirmationDeadline: preference.confirmationDeadline,
        confirmed: isConfirmed,
        confirmedAt: new Date(),
        status: status
      }
    });
    
    console.log(`Student ${decoded.id} ${action}ed offer from ${preference.university?.name}`);
    
    return NextResponse.json({
      success: true,
      message: `You have ${action === 'confirm' ? 'accepted' : 'declined'} the offer`,
      status: status
    });
    
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}