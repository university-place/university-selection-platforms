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

    const universities = await prisma.university.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        lastAdmissionInfoUpdate: true,
        lastCapacityDeclaration: true,
        complianceStatus: true,
        complianceNotes: true,
        _count: { select: { programs: true } },
        placements: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    const complianceData = universities.map(uni => ({
      id: uni.id,
      name: uni.name,
      code: uni.code,
      hasPrograms: uni._count.programs > 0,
      lastAdmissionInfoUpdate: uni.lastAdmissionInfoUpdate,
      lastCapacityDeclaration: uni.lastCapacityDeclaration,
      lastPlacementSubmission: uni.placements[0]?.createdAt || null,
      complianceStatus: uni.complianceStatus || 'unknown',
      notes: uni.complianceNotes
    }))

    // ✅ Ensure a response is always returned
    return NextResponse.json(complianceData)
  } catch (error: any) {
    console.error('Compliance list error:', error)
    // Determine status code based on error message
    let status = 500
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      status = 401
    } else if (error.message === 'Forbidden') {
      status = 403
    }
    // ✅ Always return a Response
    return NextResponse.json({ error: error.message }, { status })
  }
}