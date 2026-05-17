import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    // Only allow specific public keys
    const allowedKeys = ['student_custom_attributes', 'system_maintenance', 'stream_subjects'];
    if (!allowedKeys.includes(key)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const config = await prisma.systemConfig.findUnique({
      where: { key }
    });

    return NextResponse.json({ 
      success: true, 
      value: config?.value || null 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
