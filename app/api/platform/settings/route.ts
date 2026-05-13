import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyPlatformAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'PLATFORM_ADMIN') {
      throw new Error('Forbidden');
    }
    return { userId: decoded.id };
  } catch {
    throw new Error('Invalid token');
  }
}

export async function GET(request: Request) {
  try {
    await verifyPlatformAdmin(request);
    
    const settings = await prisma.systemConfig.findMany();
    const settingsMap = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (error: any) {
    console.error('Get settings error:', error);
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await verifyPlatformAdmin(request);
    const { key, value, description } = await request.json();

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    const setting = await prisma.systemConfig.upsert({
      where: { key },
      update: { 
        value, 
        description,
        updatedBy: userId.toString()
      },
      create: { 
        key, 
        value, 
        description,
        updatedBy: userId.toString()
      }
    });

    return NextResponse.json({ success: true, setting });
  } catch (error: any) {
    console.error('Update setting error:', error);
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
