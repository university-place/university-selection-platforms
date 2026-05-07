import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token provided');
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'UNIVERSITY_ADMIN') throw new Error('Forbidden');
    const admin = await prisma.universityAdmin.findUnique({
      where: { userId: decoded.id },
      select: { universityId: true }
    });
    if (!admin) throw new Error('University admin record not found');
    return { userId: decoded.id, universityId: admin.universityId };
  } catch {
    throw new Error('Invalid token');
  }
}

export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    
    let settings = await prisma.systemConfig.findFirst({
      where: { key: `university_placement_${universityId}` }
    });
    
    if (!settings) {
      return NextResponse.json({
        success: true,
        settings: {
          totalIntakeCapacity: 0,
          allowOverCapacity: false,
          notificationEmail: '',
          autoPlacementEnabled: false,
          placementMethod: 'weighted',
          weightingSettings: {
            includeDisability: true,
            disabilityBonus: 5,
            includeGender: true,
            includeRegion: true,
            genderBalance: { male: 50, female: 50 },
            regionWeights: []
          }
        }
      });
    }
    
    return NextResponse.json({ success: true, settings: settings.value });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const body = await request.json();
    
    const updated = await prisma.systemConfig.upsert({
      where: { key: `university_placement_${universityId}` },
      update: { value: body, updatedAt: new Date() },
      create: {
        key: `university_placement_${universityId}`,
        value: body,
        description: 'University placement batch settings'
      }
    });
    
    return NextResponse.json({ success: true, settings: updated.value });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}