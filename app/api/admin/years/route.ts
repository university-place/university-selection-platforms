import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

export async function GET(request: Request) {
  try {
    // 1. Verify token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 2. Role check (allow both PLATFORM_ADMIN and MOE_ADMIN)
    if (decoded.role !== 'PLATFORM_ADMIN' && decoded.role !== 'MOE_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Fetch academic years with student counts
    const years = await prisma.academicYear.findMany({
      orderBy: { year: 'desc' }
    })

    const stats = await Promise.all(
      years.map(async (year) => ({
        ...year,
        studentCount: await prisma.student.count({ where: { academicYear: year.year } })
      }))
    )

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Years endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}