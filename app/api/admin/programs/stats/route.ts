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

    // Get all active programs with university info
    const programs = await prisma.program.findMany({
      where: { isActive: true },
      include: {
        university: { select: { id: true, name: true, code: true } }
      },
      orderBy: [{ university: { name: 'asc' } }, { name: 'asc' }]
    })

    // For each program, compute statistics
    const stats = await Promise.all(
      programs.map(async (prog) => {
        const totalApps = await prisma.preference.count({
          where: { programId: prog.id }
        })
        const accepted = await prisma.preference.count({
          where: { programId: prog.id, status: 'accepted' }
        })
        const rejected = await prisma.preference.count({
          where: { programId: prog.id, status: 'rejected' }
        })
        const pending = await prisma.preference.count({
          where: { programId: prog.id, status: 'pending' }
        })
        const confirmed = await prisma.preference.count({
          where: { programId: prog.id, status: 'confirmed' }
        })
        const expired = await prisma.preference.count({
          where: { programId: prog.id, status: 'expired' }
        })
        const waitlisted = await prisma.preference.count({
          where: { programId: prog.id, status: 'waitlisted' }
        })

        return {
          id: prog.id,
          name: prog.name,
          code: prog.code,
          fieldOfStudy: prog.fieldOfStudy,
          degree: prog.degree,
          university: {
            id: prog.university.id,
            name: prog.university.name,
            code: prog.university.code
          },
          totalApplications: totalApps,
          statusCounts: {
            accepted,
            rejected,
            pending,
            confirmed,
            expired,
            waitlisted
          }
        }
      })
    )

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Program stats error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}