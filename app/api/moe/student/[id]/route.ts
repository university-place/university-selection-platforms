import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyMoeAdmin(request);
    const { id } = await params;
    const studentId = parseInt(id);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        documents: {
          select: {
            id: true,
            type: true,
            fileName: true,
            fileUrl: true,
            uploadDate: true,
            verificationStatus: true,
          },
          orderBy: { uploadDate: 'desc' },
        },
        applications: {
          include: {
            preferences: {
              include: {
                university: {
                  select: { id: true, name: true, code: true, region: true }
                },
                program: {
                  select: { id: true, name: true, code: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        placements: {
          include: {
            university: true,
            program: true,
            admissionTrack: true
          }
        },
        InterviewInvitation: {
          include: {
            university: true,
            program: true
          },
          orderBy: { date: 'desc' }
        },
        StudentConfirmation: {
          include: {
            university: true,
            program: true
          }
        },
      }
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const examResults = parseExamResults(student.examResults);
    const totalScore = calculateTotalScore(examResults);
    const age =
      student.age ??
      (student.dateOfBirth
        ? Math.max(
            0,
            new Date().getFullYear() - new Date(student.dateOfBirth).getFullYear()
          )
        : null);

    // Determine placement status
    let placementStatus = 'UNPLACED';
    let placementDetails = null;
    if (student.placements && student.placements.length > 0) {
      const acceptedPlacement = student.placements.find(p => p.status === 'ACCEPTED');
      if (acceptedPlacement) {
        placementStatus = 'PLACED';
        placementDetails = acceptedPlacement;
      } else if (student.placements.some(p => p.status === 'PENDING')) {
        placementStatus = 'PENDING';
      }
    }

    const flattenedPreferences = student.applications
      .flatMap((a) => a.preferences)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const allUniversityIds = new Set<number>();
    
    flattenedPreferences.forEach(p => allUniversityIds.add(p.universityId));
    student.StudentConfirmation.forEach(c => allUniversityIds.add(c.universityId));
    student.placements.forEach(p => allUniversityIds.add(p.universityId));
    student.InterviewInvitation.forEach(i => allUniversityIds.add(i.universityId));

    const universityStatuses = Array.from(allUniversityIds).map((universityId) => {
      const p = flattenedPreferences.find(pref => pref.universityId === universityId);
      const confirmation = student.StudentConfirmation.find((c) => c.universityId === universityId);
      const placement = student.placements.find((pl) => pl.universityId === universityId);
      const invitation = student.InterviewInvitation.find((inv) => inv.universityId === universityId);

      let status = 'PENDING';
      if (confirmation?.confirmed || confirmation?.status === 'CONFIRMED') status = 'CONFIRMED';
      else if (confirmation?.status === 'DECLINED') status = 'DECLINED';
      else if (p?.status === 'BATCH_NOT_PLACED' || p?.status === 'REJECTED') status = 'NOT_PLACED';
      else if (p?.status === 'BATCH_PLACED' || p?.status === 'PLACED') status = 'PLACED';
      else if (p?.status === 'ACCEPTED' || placement?.status === 'ACCEPTED') status = 'WAITING_RESPONSE';
      else if (invitation && ['PENDING', 'ACCEPTED'].includes(invitation.status)) status = 'WAITING_RESPONSE';

      const universityName = p?.university?.name || confirmation?.university?.name || placement?.university?.name || invitation?.university?.name || 'Unknown';
      const programName = p?.program?.name || confirmation?.program?.name || placement?.program?.name || invitation?.program?.name || 'Any Program';

      return {
        preferenceId: p?.id || `virtual-${universityId}`,
        universityId,
        universityName,
        universityCode: p?.university?.code || 'N/A',
        programName,
        preferenceStatus: p?.status || 'N/A',
        normalizedStatus: status,
        invitationStatus: invitation?.status || null,
        confirmationStatus: confirmation?.status || null,
        placementStatus: placement?.status || null,
        timestamp: p?.createdAt || confirmation?.createdAt || invitation?.createdAt || placement?.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        examID: student.examID,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        email: student.email,
        phone: student.phone,
        region: student.region,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        disability: student.disability,
        age,
        school: student.school,
        stream: student.stream,
        academicYear: student.academicYear,
        examResults,
        totalScore,
        isRegistered: student.isRegistered,
        emailVerified: student.emailVerified,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
        documents: student.documents,
        preferences: flattenedPreferences.map(p => ({
          id: p.id,
          rank: null,
          universityId: p.universityId,
          universityName: p.university?.name,
          universityCode: p.university?.code,
          programId: p.programId,
          programName: p.program?.name,
          status: p.status,
          decisionDate: p.decisionDate,
          remarks: p.remarks
        })),
        placementStatus,
        placement: placementDetails ? {
          id: placementDetails.id,
          universityId: placementDetails.universityId,
          universityName: placementDetails.university?.name,
          programId: placementDetails.programId,
          programName: placementDetails.program?.name,
          status: placementDetails.status,
          remarks: placementDetails.remarks,
          createdAt: placementDetails.createdAt
        } : null,
        invitations: student.InterviewInvitation.map(inv => ({
          id: inv.id,
          type: inv.type,
          date: inv.date,
          location: inv.location,
          status: inv.status,
          result: inv.result,
          universityId: inv.universityId,
          universityName: inv.university?.name
        })),
        confirmation: student.StudentConfirmation?.[0] ? {
          id: student.StudentConfirmation[0].id,
          status: student.StudentConfirmation[0].status,
          confirmationDeadline: student.StudentConfirmation[0].confirmationDeadline,
          confirmedAt: student.StudentConfirmation[0].confirmedAt,
          universityId: student.StudentConfirmation[0].universityId,
          universityName: student.StudentConfirmation[0].university?.name
        } : null,
        universityStatuses,
      }
    });
  } catch (error: any) {
    console.error('Get student details error:', error);
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}