import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import { verifyStudentToken } from '@/lib/auth-utils'; // Ensure correct export is picked up

export async function POST(request: Request) {
  try {
    const studentId = await verifyStudentToken(request);
    if (!studentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, description, preferenceId } = await request.json();

    if (!type || !description) {
      return NextResponse.json({ error: 'Type and description are required' }, { status: 400 });
    }

    const appeal = await prisma.appeal.create({
      data: {
        studentId,
        preferenceId: preferenceId ? parseInt(preferenceId) : null,
        type,
        description,
        status: 'pending'
      }
    });

    return NextResponse.json({ success: true, data: appeal });
  } catch (error: any) {
    console.error('Error submitting appeal:', error);
    return NextResponse.json({ error: 'Failed to submit appeal' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const studentId = await verifyStudentToken(request);
    if (!studentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appeals = await prisma.appeal.findMany({
      where: { studentId },
      include: {
        preference: {
          include: {
            university: { select: { name: true } },
            program: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: appeals });
  } catch (error: any) {
    console.error('Error fetching appeals:', error);
    return NextResponse.json({ error: 'Failed to fetch appeals' }, { status: 500 });
  }
}