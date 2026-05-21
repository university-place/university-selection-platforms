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
// ✅ GET - Get all placements (accepted students)
// ============================================
export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear');

    console.log('=== PLACEMENTS API ===');
    console.log('University ID:', universityId);
    console.log('Academic Year param:', academicYear);

    const statusParam = searchParams.get('status');
    
    // Build where clause
    const where: any = {
      universityId,
      status: { in: ['ACCEPTED', 'BATCH_PLACED'] }
    };
    
    if (academicYear && academicYear !== 'undefined' && academicYear !== 'null') {
      where.academicYear = academicYear;
      console.log('Filtering by academicYear:', academicYear);
    }

    // Get all preferences that are ACCEPTED
    const acceptedPreferences = await prisma.preference.findMany({
      where,
      include: {
        application: {
          include: {
            student: true
          }
        },
        program: true
      },
      orderBy: { decisionDate: 'desc' }
    });

    console.log('Found ACCEPTED preferences:', acceptedPreferences.length);

    // Debug: If no results, show all accepted preferences without year filter
    if (acceptedPreferences.length === 0) {
      const allAccepted = await prisma.preference.findMany({
        where: {
          universityId,
          status: 'ACCEPTED'
        },
        select: {
          id: true,
          academicYear: true,
          status: true
        },
        take: 10
      });
      console.log('All ACCEPTED preferences (no year filter):', JSON.stringify(allAccepted, null, 2));
    }

    const placements = [];
    let confirmed = 0;
    let pending = 0;
    let declined = 0;

    for (const pref of acceptedPreferences) {
      const student = pref.application?.student;
      if (!student) {
        console.log('No student found for preference:', pref.id);
        continue;
      }

      console.log('Processing student:', student.examID, student.firstName, student.lastName);

      // Get student confirmation
      let confirmation = null;
      try {
        confirmation = await prisma.studentConfirmation.findFirst({
          where: {
            studentId: student.id,
            universityId,
            academicYear: pref.academicYear || academicYear || '2024'
          }
        });
      } catch (err) {
        console.log('StudentConfirmation table might not exist');
      }

      let placementStatus = 'PENDING';
      if (confirmation?.confirmed === true) {
        placementStatus = 'CONFIRMED';
      } else if (confirmation?.status === 'DECLINED') {
        placementStatus = 'DECLINED';
      } else if (pref.status === 'BATCH_PLACED') {
        placementStatus = 'DRAFT';
      }
      
      // Update stats based on status
      if (placementStatus === 'CONFIRMED') confirmed++;
      else if (placementStatus === 'DECLINED') declined++;
      else if (placementStatus === 'PENDING') pending++;
      
      // If a specific status was requested, filter out non-matching ones
      if (statusParam && statusParam !== 'all' && placementStatus !== statusParam) {
        continue;
      }

      // Get interview invitation if exists
      let invitation = null;
      try {
        invitation = await prisma.interviewInvitation.findFirst({
          where: {
            studentId: student.id,
            universityId,
            result: 'PASS'
          }
        });
      } catch (err) {
        console.log('InterviewInvitation table might not exist');
      }

      placements.push({
        id: pref.id,
        examID: student.examID,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email || 'N/A',
        phone: student.phone || 'N/A',
        region: student.region || 'N/A',
        stream: student.stream || 'N/A',
        programName: pref.program?.name || 'Unknown',
        programCode: pref.program?.code || '',
        interviewType: invitation?.type || 'BATCH_PLACEMENT',
        interviewDate: invitation?.date?.toISOString() || pref.decisionDate?.toISOString() || new Date().toISOString(),
        result: 'PASS',
        resultNotes: invitation?.resultNotes || '',
        acceptanceMessage: pref.remarks || 'Congratulations! You have been accepted.',
        confirmationDeadline: pref.confirmationDeadline?.toISOString() || null,
        confirmedAt: confirmation?.confirmedAt?.toISOString() || null,
        status: placementStatus
      });
    }

    console.log('Total placements returned:', placements.length);

    return NextResponse.json({
      success: true,
      placements,
      stats: {
        totalPlaced: placements.length,
        confirmed,
        pending,
        declined,
        byProgram: [],
        byRegion: []
      }
    });

  } catch (error: any) {
    console.error('Placements error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      placements: [],
      stats: {
        totalPlaced: 0,
        confirmed: 0,
        pending: 0,
        declined: 0,
        byProgram: [],
        byRegion: []
      }
    }, { status: 500 });
  }
}

// ============================================
// ✅ PUT - Update placement status (accept/decline)
// ============================================
export async function PUT(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const body = await request.json();
    const { preferenceId, status, remarks } = body;
    
    if (!preferenceId || !status) {
      return NextResponse.json({ 
        success: false, 
        error: 'Preference ID and status required' 
      }, { status: 400 });
    }
    
    // Validate status
    if (!['ACCEPTED', 'REJECTED', 'PENDING', 'CONFIRMED', 'DECLINED'].includes(status)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid status. Must be ACCEPTED, REJECTED, PENDING, CONFIRMED, or DECLINED' 
      }, { status: 400 });
    }
    
    // Get the preference first to check ownership
    const existingPreference = await prisma.preference.findFirst({
      where: {
        id: preferenceId,
        universityId,
      },
      include: {
        application: {
          include: {
            student: true
          }
        }
      }
    });
    
    if (!existingPreference) {
      return NextResponse.json({ 
        success: false, 
        error: 'Preference not found or not owned by this university' 
      }, { status: 404 });
    }
    
    // Update preference status
    const updated = await prisma.preference.update({
      where: { id: preferenceId },
      data: {
        status: status === 'CONFIRMED' ? 'ACCEPTED' : status === 'DECLINED' ? 'REJECTED' : status,
        decisionDate: status === 'ACCEPTED' || status === 'REJECTED' || status === 'CONFIRMED' || status === 'DECLINED' ? new Date() : undefined,
        remarks: remarks || existingPreference.remarks,
        updatedAt: new Date(),
      },
    });
    
    // If student confirms or declines, update the confirmation record
    if (status === 'CONFIRMED') {
      await prisma.studentConfirmation.updateMany({
        where: {
          studentId: existingPreference.application?.student?.id,
          universityId,
        },
        data: {
          confirmed: true,
          confirmedAt: new Date(),
          status: 'CONFIRMED',
          updatedAt: new Date()
        }
      });
    } else if (status === 'DECLINED') {
      await prisma.studentConfirmation.updateMany({
        where: {
          studentId: existingPreference.application?.student?.id,
          universityId,
        },
        data: {
          confirmed: false,
          status: 'DECLINED',
          updatedAt: new Date()
        }
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Placement status updated to ${status}`,
      updated: updated 
    });
    
  } catch (error: any) {
    console.error('PUT placement error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================
// ✅ DELETE - Remove placement (reset to PENDING)
// ============================================
export async function DELETE(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const { searchParams } = new URL(request.url);
    const preferenceId = searchParams.get('id');

    if (!preferenceId) {
      return NextResponse.json({ error: 'Preference ID required' }, { status: 400 });
    }

    const existing = await prisma.preference.findFirst({
      where: { id: parseInt(preferenceId), universityId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Placement record not found' }, { status: 404 });
    }

    // Reset the preference to PENDING
    await prisma.preference.update({
      where: { id: parseInt(preferenceId) },
      data: {
        status: 'PENDING',
        decisionDate: null,
        remarks: null,
        updatedAt: new Date()
      }
    });

    // Also reset the student confirmation
    await prisma.studentConfirmation.updateMany({
      where: {
        studentId: existing.studentId,
        universityId,
      },
      data: {
        confirmed: false,
        confirmedAt: null,
        status: 'PENDING',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Placement record reset to PENDING'
    });
    
  } catch (error: any) {
    console.error('DELETE placement error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// ✅ POST - Create a placement directly (for manual placement)
// ============================================
export async function POST(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const body = await request.json();
    const { studentId, programId, academicYear, acceptanceMessage, confirmationDeadline } = body;

    if (!studentId || !programId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Student ID and Program ID required' 
      }, { status: 400 });
    }

    // Find the student's application
    const application = await prisma.application.findFirst({
      where: {
        studentId: studentId,
        academicYear: academicYear || '2024'
      }
    });

    if (!application) {
      return NextResponse.json({ 
        success: false, 
        error: 'Application not found for this student' 
      }, { status: 404 });
    }

    // Create or update preference
    const preference = await prisma.preference.upsert({
      where: {
        id: -1 // Temporary, will be created
      },
      update: {},
      create: {
        applicationId: application.id,
        studentId: studentId,
        universityId: universityId,
        programId: programId,
        status: 'ACCEPTED',
        academicYear: academicYear || '2024',
        decisionDate: new Date(),
        confirmationDeadline: confirmationDeadline ? new Date(confirmationDeadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        remarks: acceptanceMessage || 'Congratulations! You have been accepted.',
      }
    });

    // Create student confirmation
    await prisma.studentConfirmation.upsert({
      where: {
        studentId_universityId_academicYear: {
          studentId: studentId,
          universityId: universityId,
          academicYear: academicYear || '2024'
        }
      },
      update: {
        confirmationDeadline: confirmationDeadline ? new Date(confirmationDeadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PENDING'
      },
      create: {
        studentId: studentId,
        universityId: universityId,
        programId: programId,
        academicYear: academicYear || '2024',
        confirmationDeadline: confirmationDeadline ? new Date(confirmationDeadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PENDING'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Placement created successfully',
      placement: preference
    });

  } catch (error: any) {
    console.error('POST placement error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}