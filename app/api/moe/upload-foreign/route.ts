import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import prisma from '@/prisma/client';
import { parse } from 'csv-parse';

async function verifyMoeAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token');
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'MOE_ADMIN') throw new Error('Forbidden');
    return { userId: decoded.id };
  } catch {
    throw new Error('Invalid token');
  }
}

export async function POST(request: Request) {
  try {
    await verifyMoeAdmin(request);
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const academicYear = formData.get('academicYear') as string;

    if (!file || !academicYear) {
      return NextResponse.json({ error: 'File and academicYear required' }, { status: 400 });
    }

    const text = await file.text();
    const records = await new Promise<any[]>((resolve, reject) => {
      parse(text, { columns: true, skip_empty_lines: true }, (err, output) => {
        if (err) reject(err);
        else resolve(output);
      });
    });

    let inserted = 0;
    for (const row of records) {
      const examID = row.examID?.trim();
      if (!examID) continue;

      await prisma.student.upsert({
        where: { examID_academicYear: { examID, academicYear } },
        update: {
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          region: row.region,
          nationality: row.nationality || 'Foreign',
          isForeign: true,
          examResults: JSON.stringify({
            mathematics: Number(row.mathScore),
            english: Number(row.englishScore),
            // other subjects as needed
          }),
          stream: 'Social Science', // or detect based on subjects
        },
        create: {
          examID,
          academicYear,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          region: row.region,
          nationality: row.nationality || 'Foreign',
          isForeign: true,
          examResults: JSON.stringify({ ... }),
          stream: 'Social Science',
          isActive: true,
        },
      });
      inserted++;
    }

    return NextResponse.json({ success: true, inserted });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}