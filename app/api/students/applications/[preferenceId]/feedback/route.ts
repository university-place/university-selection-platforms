import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

async function verifyStudent(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token provided')
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'STUDENT') throw new Error('Forbidden')
    return { studentId: decoded.id }
  } catch {
    throw new Error('Invalid token')
  }
}

// GET - Student views feedback for their application
export async function GET(
  request: Request,
  { params }: { params: Promise<{ preferenceId: string }> }
) {
  try {
    const { preferenceId } = await params
    const prefId = parseInt(preferenceId)
    if (isNaN(prefId)) {
      return NextResponse.json({ error: 'Invalid preference ID' }, { status: 400 })
    }

    const { studentId } = await verifyStudent(request)

    const preference = await prisma.preference.findFirst({
      where: { 
        id: prefId,
        application: { studentId }
      },
      include: {
        application: true,
        university: true,
        program: true,
        admissionTrack: true
      }
    })

    if (!preference) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get interview invitations
    const invitations = await prisma.interviewInvitation.findMany({
      where: {
        studentId,
        universityId: preference.universityId,
        programId: preference.programId
      },
      orderBy: { date: 'asc' }
    })

    // Get confirmation if accepted
    const confirmation = await prisma.studentConfirmation.findFirst({
      where: {
        studentId,
        universityId: preference.universityId,
        academicYear: preference.application.academicYear
      }
    })

    return NextResponse.json({
      success: true,
      application: {
        id: preference.id,
        status: preference.status,
        decisionDate: preference.decisionDate,
        confirmationDeadline: preference.confirmationDeadline,
        remarks: preference.remarks,
        university: preference.university,
        program: preference.program,
        admissionTrack: preference.admissionTrack,
        invitations,
        confirmation: confirmation ? {
          deadline: confirmation.confirmationDeadline,
          confirmed: confirmation.confirmed,
          confirmedAt: confirmation.confirmedAt,
          status: confirmation.status
        } : null
      }
    })

  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}