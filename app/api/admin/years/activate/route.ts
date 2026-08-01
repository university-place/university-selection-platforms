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
    const fallbackSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "dXFzVnQzYUdMZkhNQVFwQjRyOHY2TzV4aTdqYjBlQ2M=";
    let decoded: any
    try {
      decoded = jwt.verify(token, fallbackSecret)
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 2. Role check – only PLATFORM_ADMIN can activate years
    if (decoded.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    }

    // 3. Parse request body
    const { academicYear, active } = await request.json()
    if (!academicYear) {
      return NextResponse.json({ error: 'Missing academicYear' }, { status: 400 })
    }

    // 4. Ensure the year exists (optional – create if not exists)
    await prisma.academicYear.upsert({
      where: { year: academicYear },
      update: {},
      create: { year: academicYear },
    })

    const shouldActivate = active !== false;

    if (shouldActivate) {
      // 5. Deactivate all years, then activate the specified one
      await prisma.$transaction([
        prisma.academicYear.updateMany({ data: { isActive: false } }),
        prisma.academicYear.update({
          where: { year: academicYear },
          data: { isActive: true },
        }),
      ])
    } else {
      // 5. Just deactivate this specific year
      await prisma.academicYear.update({
        where: { year: academicYear },
        data: { isActive: false },
      })
    }

    return NextResponse.json({ success: true, activeYear: shouldActivate ? academicYear : null })
  } catch (error) {
    console.error('Activate/Deactivate year error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}