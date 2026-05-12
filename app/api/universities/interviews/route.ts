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

// ============================================
// ✅ GET - Get all invitations
// ============================================
export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const academicYear = searchParams.get('academicYear');

    const where: any = { universityId };
    
    if (status && status !== 'all' && status !== 'undefined') {
      where.status = status;
    }
    
    if (academicYear && academicYear !== 'undefined') {
      where.academicYear = academicYear;
    }

    const invitations = await prisma.interviewInvitation.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            examID: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            region: true,
            stream: true
          }
        },
        program: { select: { id: true, name: true, code: true } },
        admissionTrack: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ 
      success: true, 
      invitations, 
      count: invitations.length 
    });
    
  } catch (error: any) {
    console.error('GET invitations error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      invitations: [],
      count: 0
    }, { status: 500 });
  }
}

// ============================================
// ✅ POST - Send invitations
// ============================================
export async function POST(request: Request) {
  try {
    const { universityId, userId } = await verifyUniversityAdmin(request);
    const body = await request.json();
    const { invitations, academicYear, responseDeadlineDays } = body;

    if (!invitations || !Array.isArray(invitations) || invitations.length === 0) {
      return NextResponse.json({ error: 'Invitations array required' }, { status: 400 });
    }

    if (!academicYear) {
      return NextResponse.json({ error: 'academicYear required' }, { status: 400 });
    }

    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + (responseDeadlineDays || 7));

    const results = [];
    
    for (const inv of invitations) {
      if (!inv.examID) {
        results.push({ examID: inv.examID || 'unknown', status: 'failed', reason: 'Exam ID required' });
        continue;
      }
      
      if (!inv.date) {
        results.push({ examID: inv.examID, status: 'failed', reason: 'Date required' });
        continue;
      }

      const student = await prisma.student.findFirst({
        where: { examID: inv.examID, academicYear }
      });

      if (!student) {
        results.push({ examID: inv.examID, status: 'failed', reason: 'Student not found' });
        continue;
      }

      const existing = await prisma.interviewInvitation.findFirst({
        where: {
          studentId: student.id,
          universityId,
          status: { in: ['PENDING', 'ACCEPTED'] }
        }
      });

      if (existing) {
        // Overwrite the existing invitation by deleting it first
        await prisma.interviewInvitation.delete({ where: { id: existing.id } });
      }

      let programId = null;
      if (inv.programName) {
        const program = await prisma.program.findFirst({
          where: { universityId, name: inv.programName }
        });
        if (program) programId = program.id;
      }

      const invitation = await prisma.interviewInvitation.create({
        data: {
          studentId: student.id,
          universityId,
          programId,
          admissionTrackId: null,
          academicYear,
          type: inv.type || 'INTERVIEW',
          date: new Date(inv.date),
          location: inv.location || null,
          instructions: inv.instructions || null,
          responseDeadline: inv.responseDeadline ? new Date(inv.responseDeadline) : defaultDeadline,
          status: 'PENDING',
          publishedBy: userId
        },
        include: {
          student: { 
            select: { examID: true, firstName: true, lastName: true, email: true } 
          }
        }
      });

      results.push({
        examID: inv.examID,
        status: 'success',
        invitationId: invitation.id,
        type: invitation.type,
        date: inv.date,
        responseDeadline: invitation.responseDeadline,
        studentName: `${invitation.student.firstName} ${invitation.student.lastName}`
      });
    }

    const successCount = results.filter(r => r.status === 'success').length;
    
    return NextResponse.json({
      success: true,
      message: `${successCount} invitation(s) sent successfully`,
      results
    });

  } catch (error: any) {
    console.error('POST invitations error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// ✅ PUT - Update invitation
// ============================================
export async function PUT(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const body = await request.json();
    const { invitationId, date, location, instructions, type, responseDeadline } = body;

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 });
    }

    const existing = await prisma.interviewInvitation.findFirst({
      where: { id: invitationId, universityId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const updated = await prisma.interviewInvitation.update({
      where: { id: invitationId },
      data: {
        date: date ? new Date(date) : undefined,
        location: location !== undefined ? location : undefined,
        instructions: instructions !== undefined ? instructions : undefined,
        type: type || undefined,
        responseDeadline: responseDeadline ? new Date(responseDeadline) : undefined,
        status: 'PENDING',
        studentResponse: null,
        respondedAt: null,
        result: null,
        resultNotes: null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation updated successfully',
      invitation: updated
    });
  } catch (error: any) {
    console.error('PUT invitation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// ✅ PATCH - Update student result (PASS/FAIL)
// ============================================
// PATCH - Update student result after interview/exam
// ============================================
// ✅ PATCH - Update student result (PASS/FAIL)
// ============================================
export async function PATCH(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const body = await request.json();
    const { invitationId, result, resultNotes, acceptanceMessage, confirmationDeadline } = body;

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 });
    }

    // ✅ Log the received data for debugging
    console.log('PATCH Request:', { invitationId, result, resultNotes });

    // Find the invitation
    const existing = await prisma.interviewInvitation.findFirst({
      where: { id: invitationId, universityId },
      include: { 
        student: {
          include: {
            applications: {
              where: { academicYear: { not: undefined } },
              take: 1
            }
          }
        },
        program: true
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // ✅ FIXED: Update invitation with result and resultNotes
    const updated = await prisma.interviewInvitation.update({
      where: { id: invitationId },
      data: {
        result: result,
        resultNotes: resultNotes,  // ✅ Make sure resultNotes is saved
        status: result === 'PASS' ? 'COMPLETED' : result === 'FAIL' ? 'COMPLETED' : existing.status,
        updatedAt: new Date()
      }
    });

    // ✅ Verify update was saved
    console.log('Updated invitation:', { result: updated.result, resultNotes: updated.resultNotes });

    // Get academicYear
    const academicYearValue = existing.academicYear || 
                              existing.student?.applications?.[0]?.academicYear || 
                              '2024';

    if (result === 'PASS') {
      // Handle PASS logic (existing code remains the same)
      let preference = await prisma.preference.findFirst({
        where: {
          studentId: existing.studentId,
          universityId: universityId,
          programId: existing.programId
        }
      });

      if (preference) {
        await prisma.preference.update({
          where: { id: preference.id },
          data: {
            status: 'ACCEPTED',
            decisionDate: new Date(),
            academicYear: academicYearValue,
            confirmationDeadline: confirmationDeadline ? new Date(confirmationDeadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            remarks: acceptanceMessage || `Congratulations! You passed the ${existing.type}.`
          }
        });
      } else {
        const application = await prisma.application.findFirst({
          where: { studentId: existing.studentId }
        });

        if (application) {
          await prisma.preference.create({
            data: {
              applicationId: application.id,
              studentId: existing.studentId,
              universityId: universityId,
              programId: existing.programId,
              status: 'ACCEPTED',
              academicYear: academicYearValue,
              decisionDate: new Date(),
              confirmationDeadline: confirmationDeadline ? new Date(confirmationDeadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              remarks: acceptanceMessage || `Congratulations! You passed the ${existing.type}.`
            }
          });
        }
      }

      await prisma.studentConfirmation.upsert({
        where: {
          studentId_universityId_academicYear: {
            studentId: existing.studentId,
            universityId: universityId,
            academicYear: academicYearValue
          }
        },
        update: {
          confirmationDeadline: confirmationDeadline ? new Date(confirmationDeadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
          programId: existing.programId
        },
        create: {
          studentId: existing.studentId,
          universityId: universityId,
          programId: existing.programId,
          academicYear: academicYearValue,
          confirmationDeadline: confirmationDeadline ? new Date(confirmationDeadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'PENDING'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Student passed! Application updated to ACCEPTED.',
        invitation: updated
      });

    } else if (result === 'FAIL') {
      // ✅ Handle FAIL logic - update preference to REJECTED
      const preference = await prisma.preference.findFirst({
        where: {
          studentId: existing.studentId,
          universityId: universityId,
          programId: existing.programId
        }
      });

      if (preference) {
        await prisma.preference.update({
          where: { id: preference.id },
          data: {
            status: 'REJECTED',
            decisionDate: new Date(),
            remarks: resultNotes || `Unfortunately, you did not pass the ${existing.type}.`
          }
        });
      }

      // ✅ Also update the student's preference status in the application
      await prisma.preference.updateMany({
        where: {
          studentId: existing.studentId,
          universityId: universityId,
          status: { in: ['SUBMITTED', 'PENDING'] }
        },
        data: {
          status: 'REJECTED',
          decisionDate: new Date(),
          remarks: resultNotes || `Unfortunately, you did not pass the ${existing.type}.`
        }
      });

      console.log('✅ Student marked as FAIL, resultNotes saved:', resultNotes);

      return NextResponse.json({
        success: true,
        message: 'Student failed. Application updated to REJECTED.',
        invitation: updated
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation result updated.',
      invitation: updated
    });

  } catch (error: any) {
    console.error('Update result error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// ✅ DELETE - Cancel invitation
// ============================================
export async function DELETE(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'clearAll') {
      await prisma.interviewInvitation.deleteMany({
        where: { universityId }
      });
      return NextResponse.json({
        success: true,
        message: 'All invitations cleared successfully'
      });
    }

    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 });
    }

    const existing = await prisma.interviewInvitation.findFirst({
      where: { id: parseInt(invitationId), universityId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    await prisma.interviewInvitation.delete({
      where: { id: parseInt(invitationId) }
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });
  } catch (error: any) {
    console.error('DELETE invitation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// ✅ OPTIONS - Handle preflight requests
// ============================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
  });
}