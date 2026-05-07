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

// GET /api/universities/programs/:programId/tracks
export async function GET(
  request: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params
    const programIdInt = parseInt(programId)
    if (isNaN(programIdInt)) {
      return NextResponse.json({ error: 'Invalid program ID' }, { status: 400 })
    }

    const { universityId } = await verifyUniversityAdmin(request)

    // Verify the program belongs to the admin's university
    const program = await prisma.program.findFirst({
      where: { id: programIdInt, universityId }
    })
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const tracks = await prisma.admissionTrack.findMany({
      where: { programId: programIdInt, isActive: true },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(tracks)
  } catch (error: any) {
    console.error('GET tracks error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}

// POST /api/universities/programs/:programId/tracks
export async function POST(
  request: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params
    const programIdInt = parseInt(programId)
    if (isNaN(programIdInt)) {
      return NextResponse.json({ error: 'Invalid program ID' }, { status: 400 })
    }

    const { universityId } = await verifyUniversityAdmin(request)

    const program = await prisma.program.findFirst({
      where: { id: programIdInt, universityId }
    })
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, intakeCapacity, eligibilityRules, applicationFee, tuitionFee, startDate, deadline } = body

    if (!name || !intakeCapacity) {
      return NextResponse.json(
        { error: 'Name and intakeCapacity are required' },
        { status: 400 }
      )
    }

    const track = await prisma.admissionTrack.create({
      data: {
        programId: programIdInt,
        name,
        intakeCapacity,
        eligibilityRules: eligibilityRules || {},
        applicationFee,
        tuitionFee,
        startDate: startDate ? new Date(startDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        isActive: true
      }
    })

    return NextResponse.json(track, { status: 201 })
  } catch (error: any) {
    console.error('POST track error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}