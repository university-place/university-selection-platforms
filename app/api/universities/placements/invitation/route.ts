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

// GET - Retrieve all accepted and completed interview invitations
export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);

    // Fetch all invitations where type is INTERVIEW or similar, including student details
    const invitations = await prisma.interviewInvitation.findMany({
      where: {
        universityId,
        status: { in: ['ACCEPTED', 'COMPLETED'] }
      },
      include: {
        student: true,
        program: true
      },
      orderBy: { date: 'desc' }
    });

    const candidates = invitations.map(inv => {
      const student = inv.student;
      const examScore = calculateTotalScore(student.examResults);
      
      return {
        invitationId: inv.id,
        studentId: student.id,
        examID: student.examID,
        name: `${student.firstName} ${student.lastName}`,
        gender: student.gender,
        stream: student.stream,
        region: student.region,
        examScore: examScore,
        programId: inv.programId,
        programName: inv.program?.name || 'N/A',
        invitationScore: inv.invitationScore,
        result: inv.result || '',
        status: inv.status
      };
    });

    return NextResponse.json({ success: true, candidates });
  } catch (error: any) {
    console.error('GET invitation placement candidates error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Bulk update scores and/or bulk place selected candidates
export async function POST(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const body = await request.json();
    const { candidates } = body; // Array of { invitationId, score, result, place }

    if (!candidates || !Array.isArray(candidates)) {
      return NextResponse.json({ success: false, error: 'Candidates array is required' }, { status: 400 });
    }

    const academicYearValue = '2024';
    const results = [];

    for (const item of candidates) {
      const { invitationId, invitationScore, result, place } = item;

      // Find individual invitation
      const invitation = await prisma.interviewInvitation.findFirst({
        where: { id: parseInt(invitationId), universityId },
        include: { student: true }
      });

      if (!invitation) {
        results.push({ invitationId, status: 'error', error: 'Invitation not found' });
        continue;
      }

      // 1. Update Invitation with Score and Result
      const updatedResult = result || (place ? 'PASS' : invitation.result || null);
      const updatedStatus = place || updatedResult ? 'COMPLETED' : invitation.status;

      const updatedInvitation = await prisma.interviewInvitation.update({
        where: { id: parseInt(invitationId) },
        data: {
          invitationScore: invitationScore !== undefined && invitationScore !== null ? parseFloat(invitationScore) : undefined,
          result: updatedResult,
          status: updatedStatus,
          updatedAt: new Date()
        }
      });

      // 2. Handle Placement Logic if placing
      if (place || updatedResult === 'PASS') {
        let preference = await prisma.preference.findFirst({
          where: {
            studentId: invitation.studentId,
            universityId: universityId,
            programId: invitation.programId
          }
        });

        if (preference) {
          await prisma.preference.update({
            where: { id: preference.id },
            data: {
              status: 'ACCEPTED',
              decisionDate: new Date(),
              academicYear: academicYearValue,
              confirmationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              remarks: `Congratulations! You have been accepted via interview placement.`
            }
          });
        } else {
          const application = await prisma.application.findFirst({
            where: { studentId: invitation.studentId }
          });

          if (application) {
            await prisma.preference.create({
              data: {
                applicationId: application.id,
                studentId: invitation.studentId,
                universityId: universityId,
                programId: invitation.programId,
                status: 'ACCEPTED',
                academicYear: academicYearValue,
                decisionDate: new Date(),
                confirmationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                remarks: `Congratulations! You have been accepted via interview placement.`
              }
            });
          }
        }

        // Create/Update Confirmation
        await prisma.studentConfirmation.upsert({
          where: {
            studentId_universityId_academicYear: {
              studentId: invitation.studentId,
              universityId: universityId,
              academicYear: academicYearValue
            }
          },
          update: {
            confirmationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'PENDING',
            programId: invitation.programId
          },
          create: {
            studentId: invitation.studentId,
            universityId: universityId,
            programId: invitation.programId,
            academicYear: academicYearValue,
            confirmationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'PENDING'
          }
        });
      } else if (updatedResult === 'FAIL') {
        // Handle rejection
        const preference = await prisma.preference.findFirst({
          where: {
            studentId: invitation.studentId,
            universityId: universityId,
            programId: invitation.programId
          }
        });

        if (preference) {
          await prisma.preference.update({
            where: { id: preference.id },
            data: {
              status: 'REJECTED',
              decisionDate: new Date(),
              remarks: `Unfortunately, you did not pass the interview process.`
            }
          });
        }

        await prisma.preference.updateMany({
          where: {
            studentId: invitation.studentId,
            universityId: universityId,
            status: { in: ['SUBMITTED', 'PENDING'] }
          },
          data: {
            status: 'REJECTED',
            decisionDate: new Date(),
            remarks: `Unfortunately, you did not pass the interview process.`
          }
        });
      }

      results.push({ invitationId, status: 'success' });
    }

    return NextResponse.json({ success: true, message: 'Candidates processed successfully', results });
  } catch (error: any) {
    console.error('POST bulk invitation placement error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
