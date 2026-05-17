import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token');
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'UNIVERSITY_ADMIN') throw new Error('Forbidden');
    const admin = await prisma.universityAdmin.findUnique({
      where: { userId: decoded.id },
      select: { universityId: true }
    });
    if (!admin) throw new Error('Admin not found');
    return { universityId: admin.universityId };
  } catch {
    throw new Error('Invalid token');
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const { id } = await params;
    const studentId = parseInt(id);

    if (isNaN(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    // Fetch student basic info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        examID: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        region: true,
        dateOfBirth: true,
        examResults: true,
        academicYear: true,
        photo: true,
        gender: true,
        disability: true,
        age: true,
        stream: true,
        customAttributes: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // ✅ Get ONLY the LATEST preference for this student to this university
    const latestPreference = await prisma.preference.findFirst({
      where: {
        application: { studentId: student.id },
        universityId: universityId,
      },
      include: {
        program: { select: { id: true, name: true, code: true } },
        admissionTrack: { select: { id: true, name: true } },
        application: { select: { createdAt: true } }
      },
      orderBy: { createdAt: 'desc' }  // Get the most recent one
    });

    // Parse exam results
    let examResults = student.examResults;
    if (typeof examResults === 'string') {
      try { examResults = JSON.parse(examResults); } catch { examResults = {}; }
    }

    // Calculate total score dynamically (sum of all numeric values in examResults)
    const calculateTotal = (results: any) => {
      if (!results) return { total: 0, max: 0 };
      let total = 0;
      let count = 0;
      for (const [key, value] of Object.entries(results)) {
        if (key.toLowerCase() === 'total' || key.toLowerCase() === 'totalscore') continue;
        if (key.startsWith('__')) continue;
        const numeric = Number(value);
        if (!isNaN(numeric)) {
          total += numeric;
          count++;
        }
      }
      return { total, max: count * 100 };
    };

    const { total: totalScore, max: maxScore } = calculateTotal(examResults);

    // Auto-detect stream if missing or 'Unknown'
    let stream = student.stream;
    if (!stream || stream === 'Unknown' || stream === 'Not specified') {
      const keys = Object.keys(examResults || {}).map(k => k.toLowerCase());
      const hasPhysics = keys.some(k => k.includes('physics'));
      const hasHistory = keys.some(k => k.includes('history'));
      
      if (hasPhysics) stream = 'Natural Science';
      else if (hasHistory) stream = 'Social Science';
      else if (keys.length > 0) {
        // Fallback: search for other identifiers
        if (keys.some(k => k.includes('bio') || k.includes('chem'))) stream = 'Natural Science';
        else if (keys.some(k => k.includes('geo') || k.includes('econ'))) stream = 'Social Science';
      }
    }

    let age = student.age;
    if (!age && student.dateOfBirth && student.academicYear) {
      const birthYear = new Date(student.dateOfBirth).getFullYear();
      const acYear = parseInt(student.academicYear.split('/')[0]);
      age = acYear - birthYear;
      const academicStart = new Date(acYear, 8, 1);
      if (new Date(student.dateOfBirth) > academicStart) age--;
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        examID: student.examID,
        fullName: `${student.firstName} ${student.lastName}`,
        email: student.email,
        phone: student.phone,
        region: student.region,
        dateOfBirth: student.dateOfBirth,
        age: age,
        gender: student.gender,
        disability: student.disability,
        photo: student.photo,
        academicYear: student.academicYear,
        examResults: examResults,
        totalScore: totalScore,
        maxScore: maxScore,
        stream: stream || student.stream || 'Not specified',
        customAttributes: student.customAttributes,
        // ✅ Return ONLY the latest application (not history)
        application: latestPreference ? {
          id: latestPreference.id,
          programName: latestPreference.program?.name || 'Not specified',
          trackName: latestPreference.admissionTrack?.name || 'Not specified',
          status: latestPreference.status || 'PENDING',
          submittedAt: latestPreference.application?.createdAt,
          decisionDate: latestPreference.decisionDate,
          remarks: latestPreference.remarks,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Get applicant details error:', error);
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: error.message }, { status });
  }
}