import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

async function verifyMoEAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token provided')
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'MOE_ADMIN' && decoded.role !== 'PLATFORM_ADMIN') {
      throw new Error('Forbidden')
    }
    return { userId: decoded.id }
  } catch {
    throw new Error('Invalid token')
  }
}

export async function GET(request: Request) {
  try {
    await verifyMoEAdmin(request)
    const { searchParams } = new URL(request.url)
    const academicYear = searchParams.get('academicYear') || '2025'
    const universityId = searchParams.get('universityId')

    const where: any = { academicYear }
    if (universityId) where.universityId = parseInt(universityId)

    // Get all department placements
    const placements = await prisma.departmentPlacement.findMany({
      where,
      include: {
        student: {
          select: {
            examID: true,
            firstName: true,
            lastName: true,
            region: true,
            gender: true
          }
        },
        university: {
          select: {
            id: true,
            name: true,
            code: true,
            region: true,
            type: true
          }
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
            fieldOfStudy: true
          }
        }
      },
      orderBy: { placementDate: 'desc' }
    })

    // Statistics by university
    const byUniversity = placements.reduce((acc, p) => {
      const key = p.university.name
      if (!acc[key]) {
        acc[key] = {
          universityId: p.university.id,
          universityName: p.university.name,
          universityCode: p.university.code,
          total: 0,
          byDepartment: {},
          byProgram: {}
        }
      }
      acc[key].total++
      if (!acc[key].byDepartment[p.department]) {
        acc[key].byDepartment[p.department] = 0
      }
      acc[key].byDepartment[p.department]++
      if (!acc[key].byProgram[p.program.name]) {
        acc[key].byProgram[p.program.name] = 0
      }
      acc[key].byProgram[p.program.name]++
      return acc
    }, {} as any)

    // Statistics by department across all universities
    const byDepartment = placements.reduce((acc, p) => {
      if (!acc[p.department]) {
        acc[p.department] = 0
      }
      acc[p.department]++
      return acc
    }, {} as any)

    // Statistics by region
    const byRegion = placements.reduce((acc, p) => {
      const region = p.university.region || 'Unknown'
      if (!acc[region]) {
        acc[region] = 0
      }
      acc[region]++
      return acc
    }, {} as any)

    // Statistics by gender
    const byGender = placements.reduce((acc, p) => {
      const gender = p.student.gender || 'Not specified'
      if (!acc[gender]) {
        acc[gender] = 0
      }
      acc[gender]++
      return acc
    }, {} as any)

    return NextResponse.json({
      success: true,
      academicYear,
      summary: {
        totalPlacements: placements.length,
        totalUniversities: Object.keys(byUniversity).length,
        totalDepartments: Object.keys(byDepartment).length
      },
      statistics: {
        byUniversity: Object.values(byUniversity),
        byDepartment,
        byRegion,
        byGender
      },
      placements
    })

  } catch (error: any) {
    console.error('MoE department dashboard error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}