import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token provided')
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'UNIVERSITY_ADMIN') throw new Error('Forbidden')
    const admin = await prisma.universityAdmin.findUnique({
      where: { userId: decoded.id },
      select: { universityId: true }
    })
    if (!admin) throw new Error('University admin record not found')
    return { userId: decoded.id, universityId: admin.universityId }
  } catch {
    throw new Error('Invalid token')
  }
}

// POST - Upload department placements (after freshman year)
export async function POST(request: Request) {
  try {
    const { universityId, userId } = await verifyUniversityAdmin(request)
    const body = await request.json()
    const { placements, academicYear } = body

    if (!placements || !Array.isArray(placements) || placements.length === 0) {
      return NextResponse.json({ error: 'Placements required' }, { status: 400 })
    }

    const results = []
    for (const placement of placements) {
      // Find student by examID
      const student = await prisma.student.findFirst({
        where: { 
          examID: placement.examID, 
          academicYear: placement.originalAcademicYear || '2024' 
        }
      })

      if (!student) {
        results.push({ examID: placement.examID, status: 'failed', reason: 'Student not found' })
        continue
      }

      // Find or create program
      let program = await prisma.program.findFirst({
        where: {
          universityId,
          name: placement.programName
        }
      })

      if (!program) {
        // Create program if it doesn't exist
        program = await prisma.program.create({
          data: {
            universityId,
            name: placement.programName,
            code: placement.programCode || placement.programName.substring(0, 10).toUpperCase(),
            fieldOfStudy: placement.fieldOfStudy || 'General',
            isActive: true
          }
        })
      }

      // Create department placement record
      const departmentPlacement = await prisma.departmentPlacement.upsert({
        where: {
          studentId_universityId_programId_academicYear: {
            studentId: student.id,
            universityId,
            programId: program.id,
            academicYear: placement.academicYear || academicYear || '2025'
          }
        },
        update: {
          department: placement.department,
          status: placement.status || 'PLACED',
          remarks: placement.remarks,
          submittedBy: userId
        },
        create: {
          studentId: student.id,
          universityId,
          programId: program.id,
          department: placement.department,
          academicYear: placement.academicYear || academicYear || '2025',
          status: placement.status || 'PLACED',
          remarks: placement.remarks,
          submittedBy: userId
        }
      })

      results.push({ 
        examID: placement.examID, 
        status: 'success', 
        placementId: departmentPlacement.id,
        department: placement.department
      })
    }

    return NextResponse.json({
      success: true,
      message: `${results.filter(r => r.status === 'success').length} department placements uploaded`,
      results
    })

  } catch (error: any) {
    console.error('Department placement upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - Get department placements for university
export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request)
    const { searchParams } = new URL(request.url)
    const academicYear = searchParams.get('academicYear')

    const where: any = { universityId }
    if (academicYear) where.academicYear = academicYear

    const placements = await prisma.departmentPlacement.findMany({
      where,
      include: {
        student: {
          select: {
            examID: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        program: true
      },
      orderBy: { placementDate: 'desc' }
    })

    return NextResponse.json({ 
      success: true, 
      placements,
      count: placements.length
    })
  } catch (error: any) {
    console.error('Get department placements error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}