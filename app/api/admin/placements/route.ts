import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token provided')
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'PLATFORM_ADMIN' && decoded.role !== 'MOE_ADMIN') {
      throw new Error('Forbidden')
    }
    return { userId: decoded.id }
  } catch {
    throw new Error('Invalid token')
  }
}

export async function GET(request: Request) {
  try {
    await verifyAdmin(request)
    const placements = await prisma.placement.findMany({
      include: {
        student: { select: { examID: true, firstName: true, lastName: true } },
        program: { select: { name: true, code: true } },
        university: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(placements)
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}