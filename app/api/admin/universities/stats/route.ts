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

    // Get all active universities
    const universities = await prisma.university.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })

    // For each university, compute statistics
    const stats = await Promise.all(
      universities.map(async (uni) => {
        const totalApps = await prisma.preference.count({
          where: { universityId: uni.id }
        })
        const accepted = await prisma.preference.count({
          where: { universityId: uni.id, status: 'accepted' }
        })
        const rejected = await prisma.preference.count({
          where: { universityId: uni.id, status: 'rejected' }
        })
        const pending = await prisma.preference.count({
          where: { universityId: uni.id, status: 'pending' }
        })
        const confirmed = await prisma.preference.count({
          where: { universityId: uni.id, status: 'confirmed' }
        })
        const expired = await prisma.preference.count({
          where: { universityId: uni.id, status: 'expired' }
        })
        const waitlisted = await prisma.preference.count({
          where: { universityId: uni.id, status: 'waitlisted' }
        })

        return {
          id: uni.id,
          name: uni.name,
          code: uni.code,
          type: uni.type,
          region: uni.region,
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
    console.error('University stats error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}