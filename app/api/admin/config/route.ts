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

export async function GET() {
  try {
    const config = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' }
    })
    return NextResponse.json(config)
  } catch (error: any) {
    console.error('Get config error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
export async function PUT(request: Request) {
  try {
    const { userId } = await verifyAdmin(request)
    const { key, value, description } = await request.json()

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 })
    }

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: {
        value,
        description,
        updatedBy: userId,
        updatedAt: new Date()
      },
      create: {
        key,
        value,
        description,
        updatedBy: userId
      }
    })

    return NextResponse.json(config)
  } catch (error: any) {
    console.error('Update config error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}