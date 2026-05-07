import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

// Authentication for MOE Admin
async function verifyMoeAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'MOE_ADMIN' && decoded.role !== 'MOE-ADMIN' && decoded.role !== 'PLATFORM_ADMIN') {
      throw new Error('Forbidden');
    }
    return { userId: decoded.id, role: decoded.role };
  } catch {
    throw new Error('Invalid token');
  }
}

// Helper function to parse exam results
function parseExamResults(examResults: any): any {
  if (!examResults) return {};
  if (typeof examResults === 'string') {
    try {
      return JSON.parse(examResults);
    } catch {
      return {};
    }
  }
  return examResults;
}

function calculateTotalScore(examResults: any): number {
  const results = parseExamResults(examResults);
  const naturalTotal = (results.mathematics || 0) + (results.english || 0) +
                       (results.physics || 0) + (results.chemistry || 0) +
                       (results.biology || 0);
  const socialTotal = (results.mathematics || 0) + (results.english || 0) +
                      (results.history || 0) + (results.geography || 0) +
                      (results.economics || 0);
  if (results.total) return results.total;
  return Math.max(naturalTotal, socialTotal);
}

// GET - Get all students with their status across universities
export async function GET(request: Request) {
  try {
    await verifyMoeAdmin(request);
    const { searchParams } = new URL(request.url);
    
    const academicYear = searchParams.get('academicYear');
    const region = searchParams.get('region');
    const stream = searchParams.get('stream');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    let targetYear = academicYear;
    if (!targetYear) {
      const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
      if (activeYear) targetYear = activeYear.year;
    }

    const studentWhere: any = {};
    if (targetYear) studentWhere.academicYear = targetYear;
    if (region) studentWhere.region = region;
    if (stream === 'natural') studentWhere.stream = 'Natural Science';
    if (stream === 'social') studentWhere.stream = 'Social Science';
    if (search) {
      studentWhere.OR = [
        { examID: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        applications: {
          include: {
            preferences: {
              include: {
                university: { select: { id: true, name: true, code: true } },
                program: { select: { id: true, name: true, code: true } }
              }
            }
          },
          orderBy: { submissionDate: 'desc' },
          take: 1
        },
        placements: {
          include: {
            university: { select: { id: true, name: true, code: true } },
            program: { select: { id: true, name: true, code: true } }
          }
        },
        InterviewInvitation: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } },
          include: {
            university: { select: { id: true, name: true, code: true } }
          },
          orderBy: { date: 'desc' }
        },
        StudentConfirmation: {
          include: {
            university: { select: { id: true, name: true, code: true } },
            program: { select: { id: true, name: true, code: true } }
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { examID: 'asc' }
    });

    const processedStudents = students.map(student => {
      const examResults = parseExamResults(student.examResults);
      const totalScore = calculateTotalScore(examResults);
      
      const latestApplication = student.applications?.[0];
      const preferences = latestApplication?.preferences || [];
      const sortedPreferences = [...preferences].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      let placementStatus = 'UNPLACED';
      let placedUniversity = null;
      let placedProgram = null;
      if (student.placements && student.placements.length > 0) {
        const acceptedPlacement = student.placements.find(p => p.status === 'ACCEPTED');
        if (acceptedPlacement) {
          placementStatus = 'PLACED';
          placedUniversity = acceptedPlacement.university;
          placedProgram = acceptedPlacement.program;
        } else if (student.placements.some(p => p.status === 'PENDING')) {
          placementStatus = 'PENDING';
        }
      }
      
      // 👇 NEW: Include full invitation details (location, instructions, date, etc.)
      const invitations = student.InterviewInvitation?.map(inv => ({
        id: inv.id,
        type: inv.type,
        date: inv.date,
        location: inv.location,
        instructions: inv.instructions,
        status: inv.status,
        responseDeadline: inv.responseDeadline,
        universityId: inv.university?.id,
        universityName: inv.university?.name,
        result: inv.result,
        resultNotes: inv.resultNotes
      })) || [];
      
      const pendingInvitationsCount = invitations.filter(i => i.status === 'PENDING').length;
      
      const confirmation = student.StudentConfirmation?.[0];
      
      return {
        id: student.id,
        examID: student.examID,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        email: student.email,
        phone: student.phone,
        region: student.region,
        dateOfBirth: student.dateOfBirth,
        stream: student.stream,
        totalScore,
        examResults,
        isRegistered: student.isRegistered,
        emailVerified: student.emailVerified,
        academicYear: student.academicYear,
        preferences: sortedPreferences.map(p => ({
          id: p.id,
          rank: null,
          universityId: p.university?.id,
          universityName: p.university?.name,
          universityCode: p.university?.code,
          programId: p.program?.id,
          programName: p.program?.name,
          status: p.status
        })),
        placementStatus,
        placedUniversity: placedUniversity ? {
          id: placedUniversity.id,
          name: placedUniversity.name,
          code: placedUniversity.code
        } : null,
        placedProgram: placedProgram ? {
          id: placedProgram.id,
          name: placedProgram.name,
          code: placedProgram.code
        } : null,
        invitations,               // 👈 full invitation details
        pendingInvitationsCount,
        confirmationStatus: confirmation?.status || null,
        confirmationDeadline: confirmation?.confirmationDeadline,
        confirmedAt: confirmation?.confirmedAt
      };
    });

    let filteredStudents = processedStudents;
    if (status === 'PLACED') filteredStudents = processedStudents.filter(s => s.placementStatus === 'PLACED');
    else if (status === 'UNPLACED') filteredStudents = processedStudents.filter(s => s.placementStatus === 'UNPLACED');
    else if (status === 'PENDING') filteredStudents = processedStudents.filter(s => s.placementStatus === 'PENDING');

    const stats = {
      totalStudents: processedStudents.length,
      placed: processedStudents.filter(s => s.placementStatus === 'PLACED').length,
      unplaced: processedStudents.filter(s => s.placementStatus === 'UNPLACED').length,
      pendingPlacements: processedStudents.filter(s => s.placementStatus === 'PENDING').length,
      registered: processedStudents.filter(s => s.isRegistered).length,
      verified: processedStudents.filter(s => s.emailVerified).length,
      naturalScience: processedStudents.filter(s => s.stream === 'Natural Science').length,
      socialScience: processedStudents.filter(s => s.stream === 'Social Science').length,
    };

    const total = filteredStudents.length;
    const paginatedStudents = filteredStudents.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      students: paginatedStudents,
      stats,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      filters: { academicYear: targetYear, region, stream, status }
    });
  } catch (error: any) {
    console.error('Get student status error:', error);
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}