import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  if (decoded.role !== 'UNIVERSITY_ADMIN') {
    throw new Error('Forbidden');
  }
  const admin = await prisma.universityAdmin.findUnique({
    where: { userId: decoded.id },
    select: { universityId: true }
  });
  if (!admin) throw new Error('University admin record not found');
  return { userId: decoded.id, universityId: admin.universityId };
}

// GET - Get weighting settings for a university
export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    
    // Get or create default weighting settings
    let settings = await prisma.systemConfig.findFirst({
      where: { key: `weighting_${universityId}` }
    });
    
    if (!settings) {
      // Default weight distribution
      const defaultSettings = {
        examScoreWeight: 70,
        regionWeight: 15,
        genderWeight: 10,
        disabilityWeight: 5,
        totalWeight: 100,
        regionPreferences: [],
        genderPreferences: { male: 50, female: 50 },
        disabilityBonus: 5
      };
      
      settings = await prisma.systemConfig.create({
        data: {
          key: `weighting_${universityId}`,
          value: defaultSettings,
          description: 'University applicant weighting settings'
        }
      });
    }
    
    return NextResponse.json({ success: true, settings: settings.value });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// PUT - Update weighting settings
export async function PUT(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const body = await request.json();
    const { examScoreWeight, regionWeight, genderWeight, disabilityWeight, regionPreferences, genderPreferences, disabilityBonus } = body;
    
    // Validate total weight = 100%
    const total = (examScoreWeight || 70) + (regionWeight || 15) + (genderWeight || 10) + (disabilityWeight || 5);
    if (total !== 100) {
      return NextResponse.json({ 
        error: `Total weight must equal 100%. Current total: ${total}%` 
      }, { status: 400 });
    }
    
    const settings = await prisma.systemConfig.upsert({
      where: { key: `weighting_${universityId}` },
      update: {
        value: {
          examScoreWeight,
          regionWeight,
          genderWeight,
          disabilityWeight,
          regionPreferences: regionPreferences || [],
          genderPreferences: genderPreferences || { male: 50, female: 50 },
          disabilityBonus: disabilityBonus || 5,
          totalWeight: total
        },
        updatedAt: new Date()
      },
      create: {
        key: `weighting_${universityId}`,
        value: {
          examScoreWeight: examScoreWeight || 70,
          regionWeight: regionWeight || 15,
          genderWeight: genderWeight || 10,
          disabilityWeight: disabilityWeight || 5,
          regionPreferences: regionPreferences || [],
          genderPreferences: genderPreferences || { male: 50, female: 50 },
          disabilityBonus: disabilityBonus || 5,
          totalWeight: total
        },
        description: 'University applicant weighting settings'
      }
    });
    
    return NextResponse.json({ success: true, settings: settings.value });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}