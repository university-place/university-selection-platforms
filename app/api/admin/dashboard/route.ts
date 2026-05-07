import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'PLATFORM_ADMIN' && decoded.role !== 'MOE_ADMIN') {
      throw new Error('Forbidden')
    }
    return { userId: decoded.id, role: decoded.role }
  } catch {
    throw new Error('Invalid token')
  }
}

export async function GET(request: Request) {
  try {
    await verifyAdmin(request)

    // Total counts
    const totalStudents = await prisma.student.count()
    const totalUniversities = await prisma.university.count({ where: { isActive: true } })
    const totalPrograms = await prisma.program.count({ where: { isActive: true } })
    const totalApplications = await prisma.preference.count()

    // Application status counts
    const accepted = await prisma.preference.count({ where: { status: 'accepted' } })
    const rejected = await prisma.preference.count({ where: { status: 'rejected' } })
    const pending = await prisma.preference.count({ where: { status: 'pending' } })
    const confirmed = await prisma.preference.count({ where: { status: 'confirmed' } })
    const expired = await prisma.preference.count({ where: { status: 'expired' } })
    const waitlisted = await prisma.preference.count({ where: { status: 'waitlisted' } })

    // Recent activity (last 10 applications with student and program)
    const recentActivity = await prisma.preference.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        application: {
          include: {
            student: { select: { examID: true, firstName: true, lastName: true } }
          }
        },
        program: { select: { name: true, code: true } },
        university: { select: { name: true } }
      }
    })

    // Format recent activity for response
    const activities = recentActivity.map(a => ({
      id: a.id,
      examID: a.application?.student?.examID,
      studentName: a.application?.student ? `${a.application.student.firstName} ${a.application.student.lastName}` : null,
      university: a.university?.name,
      program: a.program?.name,
      status: a.status,
      submittedAt: a.createdAt
    }))

    return NextResponse.json({
      totalStudents,
      totalUniversities,
      totalPrograms,
      totalApplications,
      applicationStatus: {
        accepted,
        rejected,
        pending,
        confirmed,
        expired,
        waitlisted
      },
      recentActivity: activities
    })
  } catch (error: any) {
    console.error('Dashboard error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}