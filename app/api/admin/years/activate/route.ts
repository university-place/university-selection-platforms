import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

export async function POST(request: Request) {
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
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 2. Role check – only PLATFORM_ADMIN can activate years
    if (decoded.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    }

    // 3. Parse request body
    const { academicYear } = await request.json()
    if (!academicYear) {
      return NextResponse.json({ error: 'Missing academicYear' }, { status: 400 })
    }

    // 4. Ensure the year exists (optional – create if not exists)
    await prisma.academicYear.upsert({
      where: { year: academicYear },
      update: {},
      create: { year: academicYear },
    })

    // 5. Deactivate all years, then activate the specified one
    await prisma.$transaction([
      prisma.academicYear.updateMany({ data: { isActive: false } }),
      prisma.academicYear.update({
        where: { year: academicYear },
        data: { isActive: true },
      }),
    ])

    return NextResponse.json({ success: true, activeYear: academicYear })
  } catch (error) {
    console.error('Activate year error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}