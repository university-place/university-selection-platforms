import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token provided')
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'PLATFORM_ADMIN' && decoded.role !== 'MOE_ADMIN') {
      throw new Error('Forbidden')
    }
    return { userId: decoded.id, role: decoded.role }
  } catch {
    throw new Error('Invalid token')
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(request)
    const { id } = await params
    const universityId = parseInt(id)
    if (isNaN(universityId)) {
      return NextResponse.json({ error: 'Invalid university ID' }, { status: 400 })
    }

    const apiKey = crypto.randomBytes(32).toString('hex')
    const updated = await prisma.university.update({
      where: { id: universityId },
      data: { apiKey },
      select: { id: true, name: true, apiKey: true }
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}