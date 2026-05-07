import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

/**
 * Verifies that the request comes from a valid university admin
 * and returns the associated universityId.
 */
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
  } catch {
    throw new Error('Invalid token')
  }
}

/**
 * GET /api/universities/programs/:programId
 * Returns a single program if it belongs to the admin's university.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  console.log('GET /programs/:programId – params promise:', params)
  try {
    const { programId } = await params
    console.log('Resolved programId:', programId)

    const programIdInt = parseInt(programId)
    if (isNaN(programIdInt)) {
      return NextResponse.json({ error: 'Invalid program ID' }, { status: 400 })
    }

    const { universityId } = await verifyUniversityAdmin(request)
    console.log('Admin universityId:', universityId)

    const program = await prisma.program.findFirst({
      where: { id: programIdInt, universityId, isActive: true },
      include: {
        admissionTracks: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      }
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    return NextResponse.json(program)
  } catch (error: any) {
    console.error('GET program error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}

/**
 * PUT /api/universities/programs/:programId
 * Updates a program (only allowed fields).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  console.log('PUT /programs/:programId – params promise:', params)
  try {
    const { programId } = await params
    const programIdInt = parseInt(programId)
    if (isNaN(programIdInt)) {
      return NextResponse.json({ error: 'Invalid program ID' }, { status: 400 })
    }

    const { universityId } = await verifyUniversityAdmin(request)

    // Check ownership
    const existing = await prisma.program.findFirst({
      where: { id: programIdInt, universityId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, code, fieldOfStudy, degree, duration, description, eligibilityRules } = body

    // If code is being changed, ensure it's unique within the university
    if (code && code !== existing.code) {
      const conflict = await prisma.program.findFirst({
        where: { code, universityId, id: { not: programIdInt } }
      })
      if (conflict) {
        return NextResponse.json({ error: 'Program code already exists' }, { status: 409 })
      }
    }

    const updated = await prisma.program.update({
      where: { id: programIdInt },
      data: {
        name,
        code,
        fieldOfStudy,
        degree,
        duration,
        description,
        eligibilityRules: eligibilityRules ?? existing.eligibilityRules
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('PUT program error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}

/**
 * DELETE /api/universities/programs/:programId
 * Soft‑deletes a program (sets isActive = false).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  console.log('DELETE /programs/:programId – params promise:', params)
  try {
    const { programId } = await params
    const programIdInt = parseInt(programId)
    if (isNaN(programIdInt)) {
      return NextResponse.json({ error: 'Invalid program ID' }, { status: 400 })
    }

    const { universityId } = await verifyUniversityAdmin(request)

    // Verify ownership
    const existing = await prisma.program.findFirst({
      where: { id: programIdInt, universityId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Soft delete: set isActive = false
    await prisma.program.update({
      where: { id: programIdInt },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE program error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}