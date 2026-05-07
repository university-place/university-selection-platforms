import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'UNIVERSITY_ADMIN') {
      throw new Error('Forbidden')
    }
    const admin = await prisma.universityAdmin.findUnique({
      where: { userId: decoded.id },
      select: { universityId: true }
    })
    if (!admin) {
      throw new Error('University admin record not found')
    }
    return { userId: decoded.id, universityId: admin.universityId }
  } catch (err) {
    throw new Error('Invalid token')
  }
}

// GET /api/universities/programs/:programId/tracks/:trackId
export async function GET(
  request: Request,
  { params }: { params: { programId: string; trackId: string } }
) {
  try {
    const { universityId } = await verifyUniversityAdmin(request)
    const programId = parseInt(params.programId)
    const trackId = parseInt(params.trackId)
    if (isNaN(programId) || isNaN(trackId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    // Verify program belongs to this university
    const program = await prisma.program.findFirst({
      where: { id: programId, universityId }
    })
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const track = await prisma.admissionTrack.findFirst({
      where: { id: trackId, programId, isActive: true }
    })

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    return NextResponse.json(track)
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}

// PUT /api/universities/programs/:programId/tracks/:trackId
export async function PUT(
  request: Request,
  { params }: { params: { programId: string; trackId: string } }
) {
  try {
    const { universityId } = await verifyUniversityAdmin(request)
    const programId = parseInt(params.programId)
    const trackId = parseInt(params.trackId)
    if (isNaN(programId) || isNaN(trackId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    // Verify program belongs to this university
    const program = await prisma.program.findFirst({
      where: { id: programId, universityId }
    })
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Verify track exists and belongs to the program
    const existing = await prisma.admissionTrack.findFirst({
      where: { id: trackId, programId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      intakeCapacity,
      eligibilityRules,
      applicationFee,
      tuitionFee,
      startDate,
      deadline
    } = body

    const updated = await prisma.admissionTrack.update({
      where: { id: trackId },
      data: {
        name,
        intakeCapacity,
        eligibilityRules,
        applicationFee,
        tuitionFee,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        deadline: deadline ? new Date(deadline) : existing.deadline
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}

// DELETE /api/universities/programs/:programId/tracks/:trackId (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: { programId: string; trackId: string } }
) {
  try {
    const { universityId } = await verifyUniversityAdmin(request)
    const programId = parseInt(params.programId)
    const trackId = parseInt(params.trackId)
    if (isNaN(programId) || isNaN(trackId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    // Verify program belongs to this university
    const program = await prisma.program.findFirst({
      where: { id: programId, universityId }
    })
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Verify track exists
    const existing = await prisma.admissionTrack.findFirst({
      where: { id: trackId, programId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    // Soft delete
    await prisma.admissionTrack.update({
      where: { id: trackId },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}