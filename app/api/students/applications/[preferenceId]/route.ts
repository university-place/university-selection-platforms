import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyStudent(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token provided');
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'STUDENT') throw new Error('Forbidden');
    return { studentId: decoded.id };
  } catch {
    throw new Error('Invalid token');
  }
}

// GET - Get details of a specific application
export async function GET(
  request: Request,
  { params }: { params: Promise<{ preferenceId: string }> }
) {
  try {
    const { preferenceId } = await params;
    const prefId = parseInt(preferenceId);
    if (isNaN(prefId)) {
      return NextResponse.json({ error: 'Invalid preference ID' }, { status: 400 });
    }

    const { studentId } = await verifyStudent(request);

    const preference = await prisma.preference.findFirst({
      where: { id: prefId, application: { studentId } },
      include: {
        application: { include: { student: true } },
        university: {
          select: {
            id: true,
            name: true,
            code: true,
            region: true,
            address: true,
            contactEmail: true,
            contactPhone: true,
            website: true,
            description: true
          }
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
            fieldOfStudy: true,
            degree: true,
            duration: true,
            description: true
          }
        },
        admissionTrack: {
          select: {
            id: true,
            name: true,
            intakeCapacity: true,
            applicationFee: true,
            tuitionFee: true
          }
        }
      }
    });

    if (!preference) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const invitations = await prisma.interviewInvitation.findMany({
      where: {
        studentId,
        universityId: preference.universityId,
        programId: preference.programId
      },
      orderBy: { date: 'asc' }
    });

    const confirmation = await prisma.studentConfirmation.findFirst({
      where: {
        studentId,
        universityId: preference.universityId,
        academicYear: preference.application.academicYear
      }
    });

    const documents = await prisma.document.findMany({
      where: {
        studentId,
        type: { in: ['TRANSCRIPT', 'PORTFOLIO', 'ESSAY'] }
      },
      orderBy: { uploadDate: 'desc' }
    });

    return NextResponse.json({
      success: true,
      application: {
        id: preference.id,
        status: preference.status,
        decisionDate: preference.decisionDate,
        confirmationDeadline: preference.confirmationDeadline,
        remarks: preference.remarks,
        submittedAt: preference.createdAt,
        updatedAt: preference.updatedAt,
        university: preference.university,
        program: preference.program,
        admissionTrack: preference.admissionTrack,
        student: {
          examID: preference.application.student.examID,
          firstName: preference.application.student.firstName,
          lastName: preference.application.student.lastName,
          email: preference.application.student.email,
          phone: preference.application.student.phone,
          region: preference.application.student.region
        },
        invitations: invitations.map(inv => ({
          id: inv.id,
          type: inv.type,
          date: inv.date,
          location: inv.location,
          instructions: inv.instructions,
          status: inv.status,
          result: inv.result,
          studentResponse: inv.studentResponse
        })),
        confirmation: confirmation ? {
          deadline: confirmation.confirmationDeadline,
          confirmed: confirmation.confirmed,
          confirmedAt: confirmation.confirmedAt,
          status: confirmation.status
        } : null,
        documents: documents.map(doc => ({
          id: doc.id,
          type: doc.type,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          uploadDate: doc.uploadDate,
          verificationStatus: doc.verificationStatus
        }))
      }
    });
  } catch (error: any) {
    console.error('Get application error:', error);
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: error.message }, { status });
  }
}

// POST - Student responds to application (accept/reject offer)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ preferenceId: string }> }
) {
  try {
    const { preferenceId } = await params;
    const prefId = parseInt(preferenceId);
    if (isNaN(prefId)) {
      return NextResponse.json({ error: 'Invalid preference ID' }, { status: 400 });
    }

    const { studentId } = await verifyStudent(request);
    const body = await request.json();
    const { action } = body;

    if (!action || (action !== 'ACCEPT' && action !== 'DECLINE')) {
      return NextResponse.json({ error: 'Action must be ACCEPT or DECLINE' }, { status: 400 });
    }

    const preference = await prisma.preference.findFirst({
      where: { id: prefId, application: { studentId } },
      include: { university: true, application: true }
    });

    if (!preference) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (preference.status !== 'ACCEPTED') {
      return NextResponse.json({ error: 'This application is not accepted yet' }, { status: 400 });
    }

    if (preference.confirmationDeadline && new Date() > preference.confirmationDeadline) {
      return NextResponse.json({ error: 'Confirmation deadline has passed' }, { status: 400 });
    }

    if (action === 'ACCEPT') {
      await prisma.preference.update({
        where: { id: prefId },
        data: { confirmedAt: new Date(), status: 'CONFIRMED' }
      });
      await prisma.studentConfirmation.updateMany({
        where: {
          studentId,
          universityId: preference.universityId,
          academicYear: preference.application.academicYear
        },
        data: { confirmed: true, confirmedAt: new Date(), status: 'CONFIRMED' }
      });
      await prisma.preference.updateMany({
        where: {
          application: { studentId },
          id: { not: prefId },
          status: 'ACCEPTED'
        },
        data: { status: 'DECLINED', remarks: 'Automatically declined due to acceptance of another offer' }
      });
      return NextResponse.json({
        success: true,
        message: `You have accepted the offer from ${preference.university.name}`,
        action: 'ACCEPTED'
      });
    } else if (action === 'DECLINE') {
      await prisma.preference.update({
        where: { id: prefId },
        data: { status: 'DECLINED', remarks: 'Student declined the offer' }
      });
      return NextResponse.json({
        success: true,
        message: `You have declined the offer from ${preference.university.name}`,
        action: 'DECLINED'
      });
    }
  } catch (error: any) {
    console.error('Response to application error:', error);
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: error.message }, { status });
  }
}

// PUT - Modify or withdraw an application (new)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ preferenceId: string }> }
) {
  try {
    const { preferenceId } = await params;
    const prefId = parseInt(preferenceId);
    if (isNaN(prefId)) {
      return NextResponse.json({ error: 'Invalid preference ID' }, { status: 400 });
    } 

    const { studentId } = await verifyStudent(request);
    const body = await request.json();
    const { action, programId, admissionTrackId, rank } = body;

    const preference = await prisma.preference.findFirst({
      where: { id: prefId, application: { studentId } }
    });
    if (!preference) {
      return NextResponse.json({ success: false, error: 'Preference not found' }, { status: 404 });
    }

    // Only allow modification if status is 'pending' (not accepted/rejected)
    if (preference.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Cannot modify application after it has been accepted or rejected'
      }, { status: 403 });
    }

    if (action === 'update') {
      const updated = await prisma.preference.update({
        where: { id: prefId },
        data: {
          programId: programId !== undefined ? programId : preference.programId,
          admissionTrackId: admissionTrackId !== undefined ? admissionTrackId : preference.admissionTrackId,
          rank: rank !== undefined ? rank : preference.rank,
          updatedAt: new Date()
        },
        include: {
          program: { select: { name: true, code: true } },
          admissionTrack: { select: { name: true } }
        }
      });
      return NextResponse.json({
        success: true,
        message: 'Application updated successfully',
        preference: updated
      });
    } else if (action === 'delete') {
      await prisma.preference.delete({ where: { id: prefId } });
      return NextResponse.json({
        success: true,
        message: 'Application withdrawn successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use "update" or "delete"'
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('PUT error:', error);
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}