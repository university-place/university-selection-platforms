import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(request)
    const { id } = await params
    const universityId = parseInt(id)
    const body = await request.json()
    const { complianceStatus, complianceNotes } = body

    const updated = await prisma.university.update({
      where: { id: universityId },
      data: { complianceStatus, complianceNotes }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    // error handling
  }
}