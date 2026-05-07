import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

const MAX_ATTEMPTS = 100;
const MAX_ATTEMPTS_PER_UNIVERSITY = 100;

async function verifyStudent(request: Request) {
  const authHeader = request.headers.get('authorization');
  console.log('Auth header present:', !!authHeader);
  
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('No token provided or invalid format');
    throw new Error('No token provided');
  }
  
  const token = authHeader.substring(7);
  console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    console.log('Token verified, student ID:', decoded.id);
    if (decoded.role !== 'STUDENT') {
      throw new Error('Forbidden');
    }
    return { studentId: decoded.id };
  } catch (error) {
    console.error('Token verification error:', error);
    throw new Error('Invalid token');
  }
}

// Helper function to validate application dates
async function validateApplicationDates(universityId: number) {
  const university = await prisma.university.findUnique({
    where: { id: universityId },
    select: {
      name: true,
      applicationStartDate: true,
      applicationDeadline: true
    }
  });

  if (!university) {
    return { allowed: false, message: 'University not found' };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Check if application period hasn't started
  if (university.applicationStartDate) {
    const startDate = new Date(university.applicationStartDate);
    startDate.setHours(0, 0, 0, 0);
    
    if (today < startDate) {
      return {
        allowed: false,
        message: `Applications for ${university.name} open on ${startDate.toLocaleDateString()}`
      };
    }
  }

  // Check if deadline has passed
  if (university.applicationDeadline) {
    const deadline = new Date(university.applicationDeadline);
    deadline.setHours(23, 59, 59, 999);
    
    if (today > deadline) {
      return {
        allowed: false,
        message: `Application deadline for ${university.name} was ${deadline.toLocaleDateString()}`
      };
    }
  }

  return { allowed: true, message: 'You can apply', startDate: university.applicationStartDate, deadline: university.applicationDeadline };
}

// Helper function to check if application is open
function isApplicationOpen(startDate: Date | null, deadline: Date | null): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (startDate && today < new Date(startDate)) return false;
  if (deadline && today > new Date(deadline)) return false;
  return true;
}

// GET - Fetch student's applications
// GET - Fetch student's applications
export async function GET(request: Request) {
  try {
    const { studentId } = await verifyStudent(request);
    console.log('GET - Student ID:', studentId);
    
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    const academicYear = activeYear?.year || new Date().getFullYear().toString();
    
    const application = await prisma.application.findFirst({
      where: { studentId, academicYear },
      include: {
        preferences: {
          where: { isCancelled: false },
          include: {
            university: { 
              select: { 
                id: true, 
                name: true, 
                code: true, 
                applicationDeadline: true,
                applicationStartDate: true  // ✅ ADD THIS
              } 
            },
            program: { select: { id: true, name: true, code: true } },
            admissionTrack: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!application) {
      return NextResponse.json({ 
        success: true, 
        applications: [],
        submissionInfo: {
          attemptsUsed: 0,
          maxAttempts: MAX_ATTEMPTS,
          attemptsLeft: MAX_ATTEMPTS,
          lastSubmittedAt: null
        }
      });
    }
    
    const formattedApplications = application.preferences.map((pref, index) => {
      const submissionCount = pref.submissionCount || 0;
      const remainingAttempts = MAX_ATTEMPTS_PER_UNIVERSITY - submissionCount;
      const isSubmitted = !!pref.submittedAt;
      
      // Helper function to check if application is open
      const isApplicationOpen = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (pref.university?.applicationStartDate) {
          const startDate = new Date(pref.university.applicationStartDate);
          startDate.setHours(0, 0, 0, 0);
          if (today < startDate) return false;
        }
        
        if (pref.university?.applicationDeadline) {
          const deadline = new Date(pref.university.applicationDeadline);
          deadline.setHours(23, 59, 59, 999);
          if (today > deadline) return false;
        }
        
        return true;
      };
      
      return {
        id: pref.id,
        order: index + 1,
        universityId: pref.universityId,
        universityName: pref.university?.name || 'Unknown University',
        programId: pref.programId,
        programName: pref.program?.name || 'Program not found',
        admissionTrackId: pref.admissionTrackId,
        admissionTrackName: pref.admissionTrack?.name || 'Track not found',
        status: pref.status || 'DRAFT',
        submittedAt: pref.submittedAt || null,
        submissionCount: submissionCount,
        remainingAttempts: remainingAttempts,
        canSubmit: remainingAttempts > 0,
        universityDeadline: pref.university?.applicationDeadline,
       applicationStartDate: pref.university?.applicationStartDate,  // ✅ THIS MUST BE HERE
        isApplicationOpen: isApplicationOpen(),  // ✅ ADD THIS
        isDeadlinePassed: pref.university?.applicationDeadline ? new Date(pref.university.applicationDeadline) < new Date() : false,
        createdAt: pref.createdAt,
        updatedAt: pref.updatedAt
      };
    });
    
    return NextResponse.json({
      success: true,
      applications: formattedApplications,
      submissionInfo: {
        attemptsUsed: application.submissionCount || 0,
        maxAttempts: MAX_ATTEMPTS,
        attemptsLeft: MAX_ATTEMPTS - (application.submissionCount || 0),
        lastSubmittedAt: application.lastSubmittedAt
      }
    });
  } catch (error: any) {
    console.error('GET applications error:', error);
    const status = error.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

// POST - Add or update application (draft) - UPDATED to allow re-adding cancelled universities
export async function POST(request: Request) {
  try {
    const { studentId } = await verifyStudent(request);
    const body = await request.json();
    const { applications, action, preferenceId, universityId, programId, admissionTrackId } = body;

    // ✅ FIRST: Handle applications array (your frontend is sending this)
    if (applications && applications.length > 0) {
      console.log('POST - Student ID:', studentId);
      console.log('POST - Applications:', JSON.stringify(applications, null, 2));

      // ✅ Validate dates for each university
      for (const app of applications) {
        const dateValidation = await validateApplicationDates(app.universityId);
        if (!dateValidation.allowed) {
          return NextResponse.json({ 
            error: dateValidation.message,
            success: false 
          }, { status: 400 });
        }
      }

      const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
      const academicYear = activeYear?.year || new Date().getFullYear().toString();

      let application = await prisma.application.findFirst({
        where: { studentId, academicYear }
      });

      if (!application) {
        application = await prisma.application.create({
          data: { studentId, academicYear, status: 'DRAFT' }
        });
        console.log('Created new application:', application.id);
      }

      for (const app of applications) {
        const { universityId, programId, admissionTrackId } = app;

        const existingActivePreference = await prisma.preference.findFirst({
          where: { 
            applicationId: application.id, 
            universityId: universityId,
            isCancelled: false
          }
        });

        if (existingActivePreference) {
          await prisma.preference.update({
            where: { id: existingActivePreference.id },
            data: {
              programId: programId !== undefined ? programId : existingActivePreference.programId,
              admissionTrackId: admissionTrackId !== undefined ? admissionTrackId : existingActivePreference.admissionTrackId,
              updatedAt: new Date()
            }
          });
          console.log('Updated existing active preference:', existingActivePreference.id);
        } else {
          await prisma.preference.create({
            data: {
              applicationId: application.id,
              studentId: studentId,
              universityId,
              programId: programId || null,
              admissionTrackId: admissionTrackId || null,
              status: 'DRAFT',
              isCancelled: false,
              createdAt: new Date()
            }
          });
          console.log('Created NEW preference for university:', universityId);
        }
      }

      return NextResponse.json({ success: true, message: 'Applications saved successfully' });
    }

    // SECOND: Handle restore action
    if (action === 'restore' && preferenceId) {
      console.log('Restoring preference:', preferenceId);
      
      const preference = await prisma.preference.findFirst({
        where: { 
          id: parseInt(preferenceId.toString()), 
          studentId: studentId,
          isCancelled: true 
        }
      });
      
      if (!preference) {
        return NextResponse.json({ error: 'Cancelled preference not found' }, { status: 404 });
      }
      
      const restoredPreference = await prisma.preference.update({
        where: { id: preference.id },
        data: {
          isCancelled: false,
          cancelledAt: null,
          cancelledReason: null,
          status: 'DRAFT',
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Preference restored successfully',
        preference: restoredPreference
      });
    }

    // THIRD: Handle single preference add
    if (universityId) {
      console.log('Adding single preference for university:', universityId);
      
      // ✅ Validate dates
      const dateValidation = await validateApplicationDates(universityId);
      if (!dateValidation.allowed) {
        return NextResponse.json({ 
          error: dateValidation.message,
          success: false 
        }, { status: 400 });
      }
      
      const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
      const academicYear = activeYear?.year || new Date().getFullYear().toString();

      let application = await prisma.application.findFirst({
        where: { studentId, academicYear }
      });

      if (!application) {
        application = await prisma.application.create({
          data: { studentId, academicYear, status: 'DRAFT' }
        });
      }
      
      const existingActivePreference = await prisma.preference.findFirst({
        where: { 
          applicationId: application.id, 
          universityId: universityId,
          isCancelled: false
        }
      });
      
      if (existingActivePreference) {
        return NextResponse.json({ 
          error: 'You already have an active preference for this university' 
        }, { status: 400 });
      }
      
      const newPreference = await prisma.preference.create({
        data: {
          applicationId: application.id,
          studentId: studentId,
          universityId: universityId,
          programId: programId || null,
          admissionTrackId: admissionTrackId || null,
          status: 'DRAFT',
          isCancelled: false,
          createdAt: new Date()
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Preference added successfully',
        preference: newPreference
      });
    }

    // FOURTH: Handle submission action
    if (action === 'submit' && preferenceId) {
      const preference = await prisma.preference.findFirst({
        where: { id: parseInt(preferenceId.toString()), studentId: studentId }
      });
      
      if (!preference) {
        return NextResponse.json({ error: 'Preference not found' }, { status: 404 });
      }
      
      const currentAttempts = preference.submissionCount || 0;
      
      if (currentAttempts >= MAX_ATTEMPTS_PER_UNIVERSITY) {
        return NextResponse.json({ error: 'No attempts left' }, { status: 403 });
      }
      
      const updatedPreference = await prisma.preference.update({
        where: { id: preference.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          submissionCount: { increment: 1 },
          updatedAt: new Date()
        }
      });
      
      const remainingAttempts = MAX_ATTEMPTS_PER_UNIVERSITY - (updatedPreference.submissionCount || 0);
      
      return NextResponse.json({
        success: true,
        message: `Submitted successfully! ${remainingAttempts} attempts left.`,
        submissionCount: updatedPreference.submissionCount,
        remainingAttempts: remainingAttempts,
        submittedAt: updatedPreference.submittedAt
      });
    }

    // If no valid action
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    
  } catch (error: any) {
    console.error('POST application error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update preference
// PUT - Update preference
export async function PUT(request: Request) {
  try {
    console.log('=== PUT REQUEST STARTED ===');
    
    const { studentId } = await verifyStudent(request);
    console.log('PUT - Student ID verified:', studentId);
    
    const body = await request.json();
    console.log('PUT - Request body:', JSON.stringify(body, null, 2));
    
    const { preferenceId, programId, admissionTrackId } = body;

    if (!preferenceId) {
      console.error('No preferenceId provided');
      return NextResponse.json({ error: 'Preference ID required' }, { status: 400 });
    }

    // Find the preference
    const preference = await prisma.preference.findFirst({
      where: { 
        id: parseInt(preferenceId.toString()), 
        studentId: studentId 
      }
    });

    if (!preference) {
      console.error('Preference not found for ID:', preferenceId);
      return NextResponse.json({ error: 'Preference not found' }, { status: 404 });
    }

    console.log('Found preference:', { id: preference.id, programId: preference.programId, trackId: preference.admissionTrackId });

    const updateData: any = { 
      updatedAt: new Date(),
      status: 'DRAFT',  // Reset status to DRAFT when editing (requires resubmission)
    };
    
    // ✅ FIX: Handle programId - allow null, 0, or undefined
    if (programId !== undefined) {
      // Convert 0 or "0" to null, otherwise keep the number
      updateData.programId = (programId === 0 || programId === null || programId === '0') ? null : Number(programId);
      console.log('Updating programId to:', updateData.programId);
    }
    
    // ✅ FIX: Handle admissionTrackId - allow null, 0, or undefined
    if (admissionTrackId !== undefined) {
      // Convert 0 or "0" to null, otherwise keep the number
      updateData.admissionTrackId = (admissionTrackId === 0 || admissionTrackId === null || admissionTrackId === '0') ? null : Number(admissionTrackId);
      console.log('Updating admissionTrackId to:', updateData.admissionTrackId);
    }

    // If no fields to update
    if (Object.keys(updateData).length === 1 && updateData.status === 'DRAFT') {
      console.log('No fields to update');
      return NextResponse.json({ 
        success: true, 
        message: 'No changes to update',
        preference: preference 
      });
    }

    // Perform update
    const updated = await prisma.preference.update({
      where: { id: parseInt(preferenceId.toString()) },
      data: updateData
    });

    console.log('Update successful:', updated.id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Preference updated successfully. Please resubmit to send to university.',
      preference: updated 
    });
    
  } catch (error: any) {
    console.error('=== PUT PREFERENCE ERROR ===');
    console.error('Error message:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Soft delete (keep record for MOE)
export async function DELETE(request: Request) {
  try {
    const { studentId } = await verifyStudent(request);
    const { searchParams } = new URL(request.url);
    const preferenceId = searchParams.get('preferenceId');
    const reason = searchParams.get('reason') || 'User cancelled';
    
    if (!preferenceId) {
      return NextResponse.json({ error: 'Preference ID required' }, { status: 400 });
    }
    
    const prefId = parseInt(preferenceId);
    
    const preference = await prisma.preference.findFirst({
      where: { id: prefId, application: { studentId } }
    });
    
    if (!preference) {
      return NextResponse.json({ error: 'Preference not found' }, { status: 404 });
    }
    
    // ✅ SOFT DELETE - Update instead of permanent delete (keep record for MOE)
    try {
      const cancelledPreference = await prisma.preference.update({
        where: { id: prefId },
        data: {
          isCancelled: true,
          cancelledAt: new Date(),
          cancelledReason: reason,
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Preference cancelled successfully. Record kept for MOE.',
        preference: cancelledPreference
      });
    } catch (columnError) {
      // If isCancelled column doesn't exist, do hard delete
      console.log('Soft delete columns not found, performing hard delete');
      await prisma.preference.delete({ where: { id: prefId } });
      return NextResponse.json({ 
        success: true, 
        message: 'Preference removed successfully' 
      });
    }
    
  } catch (error: any) {
    console.error('DELETE preference error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Final submission (Submit a single preference)
export async function PATCH(request: Request) {
  try {
    const { studentId } = await verifyStudent(request);
    const body = await request.json();
    const { preferenceId } = body;

    console.log('=== PATCH SUBMISSION STARTED ===');
    console.log('Student ID:', studentId);
    console.log('Preference ID:', preferenceId);

    if (!preferenceId) {
      return NextResponse.json({ error: 'Preference ID required' }, { status: 400 });
    }

    // First, list all preferences for this student to debug
    const allPreferences = await prisma.preference.findMany({
      where: { studentId: studentId },
      select: { id: true, universityId: true, status: true }
    });
    console.log('All preferences for student:', allPreferences);

    // Find the specific preference
    const preference = await prisma.preference.findFirst({
      where: {
        id: parseInt(preferenceId.toString()),
        studentId: studentId
      }
    });

    if (!preference) {
      console.error(`Preference ${preferenceId} not found for student ${studentId}`);
      console.log('Available preference IDs:', allPreferences.map(p => p.id));
      return NextResponse.json({ 
        error: `Preference not found. Available IDs: ${allPreferences.map(p => p.id).join(', ')}`,
        availableIds: allPreferences.map(p => p.id)
      }, { status: 404 });
    }

    const MAX_ATTEMPTS_PER_PREFERENCE = 100;
    const currentAttempts = preference.submissionCount || 0;

    console.log(`Current attempts for preference ${preferenceId}: ${currentAttempts}/${MAX_ATTEMPTS_PER_PREFERENCE}`);

    if (currentAttempts >= MAX_ATTEMPTS_PER_PREFERENCE) {
      return NextResponse.json({
        error: `You have exhausted your ${MAX_ATTEMPTS_PER_PREFERENCE} submission attempts for this university.`
      }, { status: 403 });
    }

    // Update the specific preference
    const updatedPreference = await prisma.preference.update({
      where: { id: preference.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submissionCount: { increment: 1 },
        updatedAt: new Date()
      }
    });

    // Also update the main application's lastSubmittedAt
    if (preference.applicationId) {
      await prisma.application.update({
        where: { id: preference.applicationId },
        data: {
          lastSubmittedAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    const remainingAttempts = MAX_ATTEMPTS_PER_PREFERENCE - (updatedPreference.submissionCount || 0);
    const attemptsUsed = updatedPreference.submissionCount || 0;

    console.log(`Submission successful! Used: ${attemptsUsed}, Remaining: ${remainingAttempts}`);

    return NextResponse.json({
      success: true,
      message: `✅ Application submitted successfully! You have ${remainingAttempts} attempt(s) remaining for this university.`,
      submissionCount: updatedPreference.submissionCount,
      remainingAttempts: remainingAttempts,
      maxAttempts: MAX_ATTEMPTS_PER_PREFERENCE,
      submittedAt: updatedPreference.submittedAt,
      preference: {
        id: updatedPreference.id,
        status: updatedPreference.status,
        submittedAt: updatedPreference.submittedAt,
        submissionCount: updatedPreference.submissionCount
      }
    });

  } catch (error: any) {
    console.error('PATCH submission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}