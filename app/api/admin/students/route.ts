import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token provided')
  const token = authHeader.substring(7)
  try {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "dXFzVnQzYUdMZkhNQVFwQjRyOHY2TzV4aTdqYjBlQ2M=";
    const decoded = jwt.verify(token, secret) as any
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
    const placementStatus = searchParams.get('placementStatus')
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

    if (placementStatus) {
      if (placementStatus === 'NOT_REGISTERED') {
        where.isRegistered = false
      } else if (placementStatus === 'REGISTERED') {
        where.isRegistered = true
      } else if (placementStatus === 'PLACED') {
        where.preferences = { some: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } } }
      } else if (placementStatus === 'NOT_PLACED') {
        const notPlacedAnd = [
          { preferences: { some: {} } },
          { preferences: { none: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } } } }
        ];
        if (where.AND) {
          where.AND.push(...notPlacedAnd);
        } else {
          where.AND = notPlacedAnd;
        }
      } else if (placementStatus === 'NOT_PLACED_SOME') {
        where.AND = [
          { preferences: { some: {} } },
          { preferences: { none: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } } } }
        ];
      } else if (placementStatus === 'NOT_PLACED_NONE') {
        where.preferences = { none: {} };
      } else if (placementStatus === 'ACCEPTED') {
        where.StudentConfirmation = { some: { status: 'CONFIRMED' } }
      } else if (placementStatus === 'REJECTED') {
        where.StudentConfirmation = { some: { status: 'DECLINED' } }
      } else if (placementStatus === 'PENDING') {
        const pendingOr = [
          { preferences: { some: { status: 'PENDING' } } },
          { InterviewInvitation: { some: { status: 'PENDING' } } },
          { StudentConfirmation: { some: { status: 'PENDING' } } }
        ]
        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: pendingOr }]
          delete where.OR
        } else {
          where.OR = pendingOr
        }
      } else if (placementStatus === 'MULTI_PLACED') {
        const allPlaced = await prisma.preference.findMany({
          where: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } },
          select: { studentId: true, universityId: true }
        })
        const counts: Record<number, Set<number>> = {}
        allPlaced.forEach(p => {
          if (p.studentId) {
            if (!counts[p.studentId]) counts[p.studentId] = new Set()
            counts[p.studentId].add(p.universityId)
          }
        })
        const multiIds = Object.keys(counts).filter(id => counts[parseInt(id)].size > 1).map(Number)
        where.id = { in: multiIds }
      } else if (placementStatus === 'ACCEPTED_MULTIPLE') {
        const allAccepted = await prisma.studentConfirmation.findMany({
          where: { status: 'CONFIRMED' },
          select: { studentId: true, universityId: true }
        })
        const counts: Record<number, Set<number>> = {}
        allAccepted.forEach(p => {
          if (!counts[p.studentId]) counts[p.studentId] = new Set()
          counts[p.studentId].add(p.universityId)
        })
        const multiIds = Object.keys(counts).filter(id => counts[parseInt(id)].size > 1).map(Number)
        where.id = { in: multiIds }
      }
    }

    // Get total count for pagination
    const total = await prisma.student.count({ where })

    // Placement status summary counts (based on preferences)
    const [
      placedIds,
      multiPlacedIds,
      notPlacedWithPrefsCount,
      notPlacedNoPrefsCount,
      acceptedIds,
    ] = await Promise.all([
      // PLACED: has at least one accepted pref
      prisma.preference.findMany({
        where: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } },
        select: { studentId: true },
        distinct: ['studentId']
      }),
      // MULTI_PLACED: placed in more than one university
      prisma.preference.groupBy({
        by: ['studentId'],
        where: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } },
        having: { studentId: { _count: { gt: 1 } } },
        _count: true
      }),
      // NOT_PLACED with some preferences
      prisma.student.count({
        where: {
          preferences: { some: {} },
          NOT: { preferences: { some: { status: { in: ['ACCEPTED', 'PLACED', 'BATCH_PLACED'] } } } }
        }
      }),
      // NOT_PLACED with zero preferences
      prisma.student.count({ where: { preferences: { none: {} } } }),
      // ACCEPTED by student (confirmed)
      prisma.studentConfirmation.findMany({
        where: { status: 'CONFIRMED' },
        select: { studentId: true },
        distinct: ['studentId']
      }),
    ]);

    const summary = {
      total,
      placed: placedIds.length,
      multiPlaced: multiPlacedIds.length,
      notPlacedSome: notPlacedWithPrefsCount,
      notPlacedNone: notPlacedNoPrefsCount,
      acceptedByStudent: acceptedIds.length,
    };

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
      summary,
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