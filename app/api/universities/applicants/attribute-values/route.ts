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
    return decoded.id;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const userId = await verifyUniversityAdmin(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key query parameter is required' }, { status: 400 });
    }

    // 1. Fetch relevant fields from all active students to discover unique values
    const students = await prisma.student.findMany({
      where: { isActive: true },
      select: {
        region: true,
        gender: true,
        disability: true,
        school: true,
        customAttributes: true
      }
    });

    const valuesSet = new Set<string>();

    for (const student of students) {
      let value: any = null;

      // Check standard fields first
      if (key === 'region') value = student.region;
      else if (key === 'gender') value = student.gender;
      else if (key === 'disability') value = student.disability;
      else if (key === 'school') value = student.school;
      else if (key === 'SchoolNmae') value = student.school; // Handle case variance / typos from screenshot
      else {
        // Fallback to customAttributes JSON
        const customObj = student.customAttributes as Record<string, any> | null;
        if (customObj && typeof customObj === 'object') {
          // Case-insensitive match on custom key
          const matchKey = Object.keys(customObj).find(k => k.toLowerCase() === key.toLowerCase());
          if (matchKey) {
            value = customObj[matchKey];
          }
        }
      }

      if (value !== undefined && value !== null) {
        const strVal = String(value).trim();
        if (strVal && strVal !== 'null' && strVal !== 'undefined') {
          // Capitalize first letter of each word for polished display
          const formattedVal = strVal.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          valuesSet.add(formattedVal);
        }
      }
    }

    const uniqueValues = Array.from(valuesSet).sort();

    return NextResponse.json({
      success: true,
      values: uniqueValues
    });
  } catch (error: any) {
    console.error('Error fetching attribute values:', error);
    return NextResponse.json({ error: 'Failed to fetch unique attribute values' }, { status: 500 });
  }
}
