import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'UNIVERSITY_ADMIN') {
      throw new Error('Forbidden');
    }
    const admin = await prisma.universityAdmin.findUnique({
      where: { userId: decoded.id },
      select: { universityId: true }
    });
    if (!admin) {
      throw new Error('University admin record not found');
    }
    return { userId: decoded.id, universityId: admin.universityId };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

function calculateTotalScore(examResults: any): number {
  if (!examResults) return 0;
  if (examResults.total) return Number(examResults.total) || 0;
  
  let total = 0;
  for (const [key, value] of Object.entries(examResults)) {
    if (key !== 'total' && !key.startsWith('__')) {
      const numericScore = Number(value);
      if (!isNaN(numericScore)) total += numericScore;
    }
  }
  return total;
}

// GET - Fetch students who applied to this university and have uploaded a general or specific document.
export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const { searchParams } = new URL(request.url);
    const stream = searchParams.get('stream') || 'all';
    const gender = searchParams.get('gender') || 'all';

    const where: any = {
      universityId,
      isCancelled: false,
      student: {
        documents: {
          some: {
            OR: [
              { scope: 'general' },
              { universityId: universityId }
            ]
          }
        }
      }
    };

    if (stream !== 'all') {
      where.student.stream = stream === 'natural' ? 'Natural Science' : 'Social Science';
    }

    if (gender !== 'all') {
      where.student.gender = gender === 'male' ? 'Male' : 'Female';
    }

    const preferences = await prisma.preference.findMany({
      where,
      include: {
        student: {
          include: {
            documents: {
              where: {
                OR: [
                  { scope: 'general' },
                  { universityId: universityId }
                ]
              },
              orderBy: { uploadDate: 'desc' }
            }
          }
        },
        program: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const candidates = preferences.map(pref => {
      const student = pref.student;
      if (!student) return null;
      
      const examScore = calculateTotalScore(student.examResults);
      return {
        preferenceId: pref.id,
        studentId: student.id,
        examID: student.examID,
        name: `${student.firstName} ${student.lastName}`,
        gender: student.gender,
        stream: student.stream,
        region: student.region,
        examScore: examScore,
        programName: pref.program?.name || 'University only preference',
        documentScore: pref.documentScore,
        documents: student.documents.map(doc => ({
          id: doc.id,
          type: doc.type,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          uploadDate: doc.uploadDate,
          verificationStatus: doc.verificationStatus,
          scope: doc.scope
        }))
      };
    }).filter(Boolean);

    return NextResponse.json({ success: true, candidates });
  } catch (error: any) {
    console.error('GET documents evaluation candidates error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Bulk update document evaluation scores
export async function POST(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const body = await request.json();
    const { evaluations } = body; // Array of { preferenceId, documentScore }

    if (!evaluations || !Array.isArray(evaluations)) {
      return NextResponse.json({ success: false, error: 'Evaluations array is required' }, { status: 400 });
    }

    const results = [];

    for (const evalItem of evaluations) {
      const { preferenceId, documentScore } = evalItem;
      const parsedPrefId = parseInt(preferenceId, 10);

      // Verify preference belongs to university
      const preference = await prisma.preference.findFirst({
        where: { id: parsedPrefId, universityId }
      });

      if (!preference) {
        results.push({ preferenceId, status: 'error', error: 'Preference not found or access denied' });
        continue;
      }

      await prisma.preference.update({
        where: { id: parsedPrefId },
        data: {
          documentScore: documentScore !== undefined && documentScore !== null ? parseFloat(documentScore) : null
        }
      });

      results.push({ preferenceId, status: 'success' });
    }

    return NextResponse.json({ success: true, message: 'Documents evaluated successfully', results });
  } catch (error: any) {
    console.error('POST document evaluation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
