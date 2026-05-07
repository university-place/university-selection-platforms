import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token provided')
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
    if (decoded.role !== 'MOE_ADMIN' && decoded.role !== 'PLATFORM_ADMIN') {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const streamParam = searchParams.get('stream') // 'natural', 'social', or null
    const academicYear = searchParams.get('academicYear')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'examID'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Get active academic year if not specified
    let targetYear = academicYear
    if (!targetYear) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true }
      })
      if (activeYear) targetYear = activeYear.year
    }

    // Build where clause
    const where: any = {}
    if (targetYear) where.academicYear = targetYear
    
    // FIX: Use stream field directly in where clause
    if (streamParam === 'natural') {
      where.stream = 'Natural Science'
    } else if (streamParam === 'social') {
      where.stream = 'Social Science'
    }
    
    if (search) {
      where.OR = [
        { examID: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get total count for pagination
    const total = await prisma.student.count({ where })

    // Get students with pagination and sorting
    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        examID: true,
        academicYear: true,
        dateOfBirth: true,
        studentNationalID: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        region: true,
        examResults: true,
        status: true,
        isActive: true,
        isRegistered: true,
        createdAt: true,
        updatedAt: true,
        photo: true,
        gender: true,
        disability: true,
        age: true,
        stream: true,
        emailVerified: true
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip: (page - 1) * limit,
      take: limit
    })

    return NextResponse.json({
      success: true,
      students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Get students error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}