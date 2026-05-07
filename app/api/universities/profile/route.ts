import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

// Helper to verify university admin and return universityId
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
      select: { universityId: true,
        
       }
    })
    if (!admin) {
      throw new Error('University admin record not found')
    }
    return { userId: decoded.id, universityId: admin.universityId }
  } catch {
    throw new Error('Invalid token')
  }
}

// GET /api/universities/profile – retrieve the university's own profile
// GET /api/universities/profile – retrieve the university's own profile
export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request)

    const university = await prisma.university.findUnique({
      where: { id: universityId },
      select: {  // ✅ Use select to explicitly include date fields
        id: true,
        name: true,
        code: true,
        type: true,
        region: true,
        address: true,
        contactEmail: true,
        contactPhone: true,
        website: true,
        description: true,
        history: true,
        achievements: true,
        facilities: true,
        researchAreas: true,
        studentLife: true,
        accreditation: true,
        admissionInstructions: true,
        postDecisionInstructions: true,
        applicationStartDate: true,   // ✅ ADD THIS
        applicationDeadline: true,    // ✅ ADD THIS
        keyFacts: true,
        programs: {
          where: { isActive: true },
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
        },
        admins: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    })

    if (!university) {
      return NextResponse.json({ error: 'University not found' }, { status: 404 })
    }

    return NextResponse.json(university)
  } catch (error: any) {
    console.error('GET university profile error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}

// PUT /api/universities/profile – update the university's own profile (allowed fields)
export async function PUT(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request)
    const body = await request.json()

    // Allowed updatable fields (admin cannot change `id`, `isVerified`, etc.)
    const {
  name,
  code,
  type,
  region,
  address,
  contactEmail,
  contactPhone,
  website,
  description,
  history,
  achievements,
  facilities,
  researchAreas,
  studentLife,
  accreditation,
  admissionInstructions,
  postDecisionInstructions,
  applicationStartDate,     // ✅ ADD THIS LINE
  applicationDeadline,
  keyFacts,
} = body;


    // Check if code/name already taken by another university (if changed)
    if (name) {
      const existing = await prisma.university.findFirst({
        where: { name, id: { not: universityId } },
      })
      if (existing) {
        return NextResponse.json({ error: 'University name already in use' }, { status: 409 })
      }
    }
    if (code) {
      const existing = await prisma.university.findFirst({
        where: { code, id: { not: universityId } },
      })
      if (existing) {
        return NextResponse.json({ error: 'University code already in use' }, { status: 409 })
      }
    }

   const updated = await prisma.university.update({
  where: { id: universityId },
  data: {
    name,
    code,
    type,
    region,
    address,
    contactEmail,
    contactPhone,
    website,
    description,
    history,
    achievements,
    facilities,
    researchAreas,
    studentLife,
    accreditation,
    admissionInstructions,
    postDecisionInstructions,
   applicationStartDate: applicationStartDate ? new Date(applicationStartDate) : null,  // ✅ ADD THIS LINE
    applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
    keyFacts: keyFacts || undefined,
  },
});


    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('PUT university profile error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}