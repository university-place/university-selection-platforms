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

// GET - Get student's interview invitations
export async function GET(request: Request) {
  try {
    const { studentId } = await verifyStudent(request)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'

    const where: any = { studentId }
    if (status) where.status = status
    if (upcoming) {
      where.date = { gte: new Date() }
      where.status = { in: ['PENDING', 'ACCEPTED'] }
    }

    const invitations = await prisma.interviewInvitation.findMany({
      where,
      include: {
        university: {
          select: {
            id: true,
            name: true,
            code: true,
            region: true,
            address: true
          }
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        admissionTrack: true
      },
      orderBy: { date: 'asc' }
    })

    return NextResponse.json({ success: true, invitations })
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}

// POST - Student responds to invitation (accept/decline)
export async function POST(request: Request) {
  try {
    const { studentId } = await verifyStudent(request)
    const body = await request.json()
    const { invitationId, response } = body // response: "ACCEPTED" or "DECLINED"

    if (!invitationId || !response) {
      return NextResponse.json({ error: 'Invitation ID and response required' }, { status: 400 })
    }

    const invitation = await prisma.interviewInvitation.findFirst({
      where: { id: invitationId, studentId },
      include: {
        university: true
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if the deadline has passed
    if (invitation.responseDeadline && new Date(invitation.responseDeadline) < new Date()) {
      return NextResponse.json({ error: 'Response deadline has passed' }, { status: 400 })
    }

    if (response !== 'ACCEPTED' && response !== 'DECLINED') {
      return NextResponse.json({ error: 'Invalid response' }, { status: 400 })
    }

    const updated = await prisma.interviewInvitation.update({
      where: { id: invitationId },
      data: {
        status: response === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED',
        studentResponse: response,
        respondedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: response === 'ACCEPTED' ? 'You have accepted the invitation' : 'You have declined the invitation',
      invitation: updated
    })

  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}

// PATCH - Student marks attendance (after attending)
export async function PATCH(request: Request) {
  try {
    const { studentId } = await verifyStudent(request)
    const body = await request.json()
    const { invitationId, attended } = body

    const invitation = await prisma.interviewInvitation.findFirst({
      where: { id: invitationId, studentId }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.status !== 'ACCEPTED') {
      return NextResponse.json({ error: 'Invitation not accepted' }, { status: 400 })
    }

    const updated = await prisma.interviewInvitation.update({
      where: { id: invitationId },
      data: {
        status: attended ? 'COMPLETED' : 'MISSED',
        result: attended ? 'PENDING' : 'FAILED'
      }
    })

    return NextResponse.json({
      success: true,
      message: attended ? 'Attendance recorded' : 'Marked as missed',
      invitation: updated
    })

  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}