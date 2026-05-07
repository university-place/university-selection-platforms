import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

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
  } catch (error) {
    console.error('Auth error:', error)
    throw new Error('Invalid token')
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { universityId } = await verifyUniversityAdmin(request)
    const studentId = parseInt(params.id)

    console.log(`Fetching student ${studentId} for university ${universityId}`)

    // First, verify this student has applied to this university
    const application = await prisma.preference.findFirst({
      where: {
        studentId: studentId,
        universityId: universityId,
      },
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
                examResults: true,
                status: true,
                photo: true,
                gender: true,
                disability: true,
                age: true,
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
      },
    })

    if (!application || !application.application?.student) {
      return NextResponse.json({ 
        success: false, 
        error: 'Student not found or has not applied to this university' 
      }, { status: 404 })
    }

    const student = application.application.student
    const documents = student.documents || []

    // Calculate total score
    function calculateTotalScore(examResults: any): number {
      if (!examResults) return 0
      let results = examResults
      if (typeof results === 'string') {
        try { results = JSON.parse(results) } catch { return 0 }
      }
      
      const hasNatural = results.physics !== undefined || results.chemistry !== undefined || results.biology !== undefined
      const hasSocial = results.history !== undefined || results.geography !== undefined || results.economics !== undefined
      
      if (hasNatural) {
        return (results.mathematics || 0) + (results.english || 0) +
               (results.physics || 0) + (results.chemistry || 0) +
               (results.biology || 0)
      } else if (hasSocial) {
        return (results.mathematics || 0) + (results.english || 0) +
               (results.history || 0) + (results.geography || 0) +
               (results.economics || 0)
      }
      
      return results.total || 0
    }

    const studentData = {
      id: student.id,
      examID: student.examID,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`,
      email: student.email,
      phone: student.phone,
      region: student.region,
      dateOfBirth: student.dateOfBirth,
      age: student.age,
      gender: student.gender,
      disability: student.disability,
      academicYear: student.academicYear,
      isRegistered: student.isRegistered,
      emailVerified: student.emailVerified,
      photo: student.photo,
      examResults: student.examResults,
      totalScore: calculateTotalScore(student.examResults),
      appliedProgram: application.program?.name || 'Not specified',
      appliedTrack: application.admissionTrack?.name || 'Not specified',
      applicationStatus: application.status,
      submittedAt: application.submittedAt || application.createdAt,
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
    }

    return NextResponse.json({
      success: true,
      student: studentData
    })

  } catch (error: any) {
    console.error('Error fetching student details:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}