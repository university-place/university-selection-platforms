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
    return { userId: decoded.id, role: decoded.role }
  } catch {
    throw new Error('Invalid token')
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await verifyAdmin(request)
    const { id } = await params
    const appealId = parseInt(id)
    if (isNaN(appealId)) {
      return NextResponse.json({ error: 'Invalid appeal ID' }, { status: 400 })
    }

    const body = await request.json()
    const { resolution, status } = body // status should be 'resolved' or 'rejected'

    if (!resolution || !status) {
      return NextResponse.json({ error: 'Resolution and status are required' }, { status: 400 })
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId }
    })
    if (!appeal) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 })
    }

    const updated = await prisma.appeal.update({
      where: { id: appealId },
      data: {
        resolution,
        status,
        resolvedBy: userId,
        resolvedAt: new Date()
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Resolve appeal error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}