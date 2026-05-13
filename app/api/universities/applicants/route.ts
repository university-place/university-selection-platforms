// app/api/universities/applicants/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

// Helper function to verify university admin
async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'UNIVERSITY_ADMIN') {
      throw new Error('Forbidden')
    }
    const admin = await prisma.universityAdmin.findUnique({
      where: { userId: decoded.id },
      select: { universityId: true }
    })
    if (!admin) {
      throw new Error('University admin record not found')
    }
    return { userId: decoded.id, universityId: admin.universityId }
  } catch {
    throw new Error('Invalid token')
  }
}

// ✅ Helper function to calculate age from date of birth
function calculateAge(dateOfBirth: string | Date | null): number {
  if (!dateOfBirth) return 0
  const birth = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// Helper function to calculate total score from exam results (sum of all subjects)
// Helper function to calculate total score from exam results
function calculateTotalScore(examResults: any): number {
  if (!examResults) return 0
  
  // Try to get stored total first (most reliable)
  if (examResults.total !== undefined && examResults.total !== null) {
    if (typeof examResults.total === 'number') {
      return examResults.total
    }
    const parsedTotal = Number(examResults.total)
    if (!isNaN(parsedTotal)) {
      return parsedTotal
    }
  }
  
  // If no total field, calculate sum of all numeric values
  let total = 0
  for (const [key, value] of Object.entries(examResults)) {
    // Skip non-subject fields
    if (key === '__prisma_meta') continue
    if (key === 'total') continue
    if (key.startsWith('__')) continue
    
    const numericScore = Number(value)
    if (!isNaN(numericScore) && numericScore > 0) {
      total += numericScore
    }
  }
  
  return total
}

export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request)
    console.log(`Fetching applicants for university ID: ${universityId}`)

    const { searchParams } = new URL(request.url)
    const programId = searchParams.get('programId')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 1000)
    const stream = searchParams.get('stream')
    const skip = (page - 1) * limit

    // ✅ ONLY SHOW SUBMITTED APPLICATIONS (not cancelled, not draft)
    const includePlaced = searchParams.get('includePlaced') === 'true'
    const includeInvited = searchParams.get('includeInvited') === 'true'

    // ✅ ONLY SHOW SUBMITTED APPLICATIONS (unless includePlaced is true)
    const where: any = { 
      universityId: universityId,
      isCancelled: false
    }

    if (!includePlaced) {
      // Show submitted applications, including those that are in batch draft states
      where.status = { in: ['SUBMITTED', 'BATCH_PLACED', 'BATCH_NOT_PLACED'] }
    } else {
      // Show all applications regardless of placement status
      where.status = { in: ['SUBMITTED', 'ACCEPTED', 'REJECTED', 'PLACED', 'WAITLISTED', 'BATCH_PLACED', 'BATCH_NOT_PLACED'] }
    }
    
    if (programId) {
      where.programId = parseInt(programId)
    }

    if (stream && stream !== 'all') {
      where.application = {
        student: {
          stream: stream
        }
      }
    }

    const total = await prisma.preference.count({ where })

    if (total === 0) {
      return NextResponse.json({
        applicants: [],
        pagination: { page, limit, total: 0, pages: 0 }
      })
    }

    const applications = await prisma.preference.findMany({
      where,
      include: {
        application: {
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
                stream: true,
                examResults: true,
                status: true,
                photo: true,
                gender: true,
                disability: true,
                dateOfBirth: true,
                academicYear: true,
                isRegistered: true,
                emailVerified: true,
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
                StudentConfirmation: {
                  where: { universityId },
                  select: {
                    confirmed: true,
                    status: true,
                    confirmedAt: true
                  }
                }
              },
            },
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
            fieldOfStudy: true,
            degree: true,
          },
        },
        admissionTrack: {
          select: {
            id: true,
            name: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      skip,
      take: limit,
    })

    // Get unique applicants (latest submission per student)
    const uniqueApplicantsMap = new Map()
    
    for (const app of applications) {
      const studentId = app.application?.student?.id
      if (studentId && !uniqueApplicantsMap.has(studentId)) {
        uniqueApplicantsMap.set(studentId, app)
      }
    }
    
    const uniqueApplicants = Array.from(uniqueApplicantsMap.values())

    // Transform data with full student details including documents
    const applicants = uniqueApplicants.map((app) => {
      const student = app.application?.student
      const documents = student?.documents || []
      
      // Calculate total score from all exam results
      const totalScore = calculateTotalScore(student?.examResults)
      // ✅ Calculate age from dateOfBirth
      const calculatedAge = calculateAge(student?.dateOfBirth || null)
      
      // Determine final status based on preference and student confirmation
      // ✅ PRIORITIZE UNIVERSITY REJECTION: If the university rejected the student, show REJECTED
      // even if there is a stale 'DECLINED' record from the student.
      let finalStatus = app.status;
      const confirmation = student?.StudentConfirmation?.[0];
      
      if (app.status === 'REJECTED' || app.status === 'BATCH_NOT_PLACED') {
        finalStatus = 'REJECTED';
      } else {
        if (confirmation) {
          if (confirmation.confirmed === true) {
            finalStatus = 'CONFIRMED';
          } else if (confirmation.status === 'DECLINED') {
            finalStatus = 'DECLINED';
          }
        }
      }
      
      return {
        id: app.id,
        status: app.status,
        finalStatus: finalStatus,
        decisionDate: app.decisionDate,
        confirmationDeadline: app.confirmationDeadline,
        confirmedAt: app.confirmedAt || confirmation?.confirmedAt,
        remarks: app.remarks,
        submittedAt: app.submittedAt || app.createdAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        student: student ? {
          id: student.id,
          examID: student.examID,
          firstName: student.firstName,
          lastName: student.lastName,
          fullName: `${student.firstName} ${student.lastName}`,
          email: student.email,
          phone: student.phone,
          region: student.region,
          stream: student.stream,
          dateOfBirth: student.dateOfBirth,
          age: calculatedAge,  // ✅ Use calculated age instead of stored age
          gender: student.gender,
          disability: student.disability,
          academicYear: student.academicYear,
          isRegistered: student.isRegistered,
          emailVerified: student.emailVerified,
          photo: student.photo,
          examResults: student.examResults,
          totalScore: totalScore,
          documents: documents,
          documentCount: documents.length,
          documentsByType: {
            transcript: documents.filter(d => d.type === 'TRANSCRIPT'),
            portfolio: documents.filter(d => d.type === 'PORTFOLIO'),
            essay: documents.filter(d => d.type === 'ESSAY'),
            other: documents.filter(d => !['TRANSCRIPT', 'PORTFOLIO', 'ESSAY'].includes(d.type))
          },
          hasPortfolio: documents.some(d => d.type === 'PORTFOLIO'),
          hasEssay: documents.some(d => d.type === 'ESSAY'),
          hasTranscript: documents.some(d => d.type === 'TRANSCRIPT'),
        } : null,
        program: app.program,
        admissionTrack: app.admissionTrack,
        university: app.university,
      }
    })

    return NextResponse.json({
      applicants,
      pagination: {
        page,
        limit,
        total: uniqueApplicants.length,
        pages: Math.ceil(uniqueApplicants.length / limit),
      },
    })
  } catch (error: any) {
    console.error('Error in /api/universities/applicants:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}