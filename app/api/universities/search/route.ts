import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

// Helper to verify student token
async function verifyStudent(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'STUDENT') {
      throw new Error('Forbidden')
    }
    return { userId: decoded.id }
  } catch {
    throw new Error('Invalid token')
  }
}

export async function GET(request: Request) {
  try {
    // Verify student authentication
    await verifyStudent(request)

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const region = searchParams.get('region')
    const type = searchParams.get('type') // public, autonomous, private
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const where: any = { isActive: true }
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { code: { contains: query, mode: 'insensitive' } },
      ]
    }
    if (region) where.region = region
    if (type) where.type = type

    const [universities, total] = await Promise.all([
      prisma.university.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          region: true,
          website: true,
          description: true,
          programs: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              code: true,
              degree: true,
              duration: true,
            },
            take: 5, // limit programs shown in search results
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.university.count({ where }),
    ])

    return NextResponse.json({
      universities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Search error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}