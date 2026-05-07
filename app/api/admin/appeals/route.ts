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

export async function GET(request: Request) {
  try {
    await verifyAdmin(request)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        include: {
          student: { select: { id: true, examID: true, firstName: true, lastName: true, email: true } },
          preference: {
            include: {
              program: { select: { name: true, code: true } },
              university: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.appeal.count({ where })
    ])

    return NextResponse.json({
      appeals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (error: any) {
    console.error('Admin list appeals error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}