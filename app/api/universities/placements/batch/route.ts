import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token provided');
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'UNIVERSITY_ADMIN') throw new Error('Forbidden');
    const admin = await prisma.universityAdmin.findUnique({
      where: { userId: decoded.id },
      select: { universityId: true }
    });
    if (!admin) throw new Error('University admin record not found');
    return { userId: decoded.id, universityId: admin.universityId };
  } catch {
    throw new Error('Invalid token');
  }
}

export async function POST(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    const body = await request.json();
    const { results, academicYear = '2024', action = 'save', confirmationDeadline } = body;

    // --- CLEAR ACTION ---
    if (action === 'clear') {
      console.log(`Clearing batch placements for University ${universityId}`);
      
      // Clear all confirmation states for this batch year so dashboard counters fully reset.
      await prisma.studentConfirmation.deleteMany({
        where: { universityId, academicYear }
      });

      // Reset all batch-related statuses back to SUBMITTED
      await prisma.preference.updateMany({
        where: { 
          universityId, 
          status: { in: ['ACCEPTED', 'REJECTED', 'BATCH_PLACED', 'BATCH_NOT_PLACED'] },
          OR: [{ academicYear }, { academicYear: null }]
        },
        data: { 
          status: 'SUBMITTED',
          decisionDate: null,
          remarks: null,
          weightedScore: null,
          weightPercent: null,
          placementReason: null
        }
      });

      return NextResponse.json({ success: true, message: 'All placement and confirmation records have been cleared for this batch.' });
    }

    // --- PUBLISH ACTION ---
    if (action === 'publish') {
      console.log(`Publishing batch placements for University ${universityId} with deadline ${confirmationDeadline}`);
      
      const deadlineDate = confirmationDeadline ? new Date(confirmationDeadline) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      // 1. Convert BATCH_PLACED to ACCEPTED (be lenient with academicYear if it was null before)
      const placedCount = await prisma.preference.updateMany({
        where: { 
          universityId, 
          status: 'BATCH_PLACED',
          OR: [{ academicYear }, { academicYear: null }]
        },
        data: { 
          status: 'ACCEPTED', 
          academicYear,
          confirmationDeadline: deadlineDate
        }
      });

      // 2. Convert BATCH_NOT_PLACED to REJECTED
      const rejectedCount = await prisma.preference.updateMany({
        where: { 
          universityId, 
          status: 'BATCH_NOT_PLACED',
          OR: [{ academicYear }, { academicYear: null }]
        },
        data: { 
          status: 'REJECTED', 
          academicYear,
          decisionDate: new Date(),
          remarks: 'Sorry, you were not placed in our university during this placement batch.'
        }
      });

      // 3. Create/Update StudentConfirmation records for all ACCEPTED students
      const publishedPrefs = await prisma.preference.findMany({
        where: { universityId, academicYear, status: 'ACCEPTED' },
        include: { program: true }
      });

      for (const pref of publishedPrefs) {
        if (!pref.studentId) continue;
        
        await prisma.studentConfirmation.upsert({
          where: {
            studentId_universityId_academicYear: { 
              studentId: pref.studentId, 
              universityId, 
              academicYear 
            }
          },
          create: {
            studentId: pref.studentId,
            universityId,
            programId: pref.programId || null,
            academicYear,
            confirmationDeadline: deadlineDate,
            status: 'PENDING'
          },
          update: {
            programId: pref.programId || null,
            status: 'PENDING',
            confirmationDeadline: deadlineDate,
            confirmed: false,
            confirmedAt: null
          }
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Successfully published results to ${placedCount.count} placed and ${rejectedCount.count} rejected students.` 
      });
    }

    // --- SAVE (DRAFT) ACTION ---
    if (!results || !Array.isArray(results)) {
      return NextResponse.json({ success: false, error: 'Invalid results data' }, { status: 400 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const res of results) {
      const student = await prisma.student.findFirst({ where: { examID: res.examID } });
      if (!student) continue;

      // Find the application for this student and year
      const application = await prisma.application.findFirst({ 
        where: { studentId: student.id, academicYear } 
      });
      if (!application) continue;

      // Find existing preference for this application at this university
      const existingPref = await prisma.preference.findFirst({
        where: { applicationId: application.id, universityId }
      });

      if (res.status === 'PLACED') {
        const commonData = {
          programId: null, // General placement
          studentId: student.id,
          status: 'BATCH_PLACED',
          academicYear,
          decisionDate: new Date(),
          remarks: 'Congratulations! You have been placed in our university.',
          weightedScore: res.weightedScore || null,
          weightPercent: res.weightPercent || null,
          placementReason: res.reason || null
        };

        if (existingPref) {
          await prisma.preference.update({
            where: { id: existingPref.id },
            data: commonData
          });
        } else {
          await prisma.preference.create({
            data: {
              ...commonData,
              applicationId: application.id,
              confirmationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            }
          });
        }

        // Always clean up unconfirmed confirmation during draft save
        await prisma.studentConfirmation.deleteMany({
          where: { studentId: student.id, universityId, academicYear, confirmed: false }
        });

        successCount++;
      } else if (res.status === 'NOT_PLACED') {
        const commonData = {
          studentId: student.id,
          status: 'BATCH_NOT_PLACED',
          academicYear,
          decisionDate: new Date(),
          remarks: 'Sorry, you were not placed in our university during this placement batch.',
          weightedScore: res.weightedScore || null,
          weightPercent: res.weightPercent || null,
          placementReason: res.reason || null
        };

        if (existingPref) {
          await prisma.preference.update({
            where: { id: existingPref.id },
            data: commonData
          });
        } else {
          // If they applied but we don't have a preference record yet, we should create one to show the rejection
          await prisma.preference.create({
            data: {
              ...commonData,
              applicationId: application.id,
              universityId
            }
          });
        }

        // Clean up unconfirmed confirmation
        await prisma.studentConfirmation.deleteMany({
          where: { studentId: student.id, universityId, academicYear, confirmed: false }
        });
        
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${successCount + failCount} draft placements (${successCount} placed, ${failCount} not placed). Use "Send Result to Student" to publish.`
    });

  } catch (error: any) {
    console.error('Batch placement error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
