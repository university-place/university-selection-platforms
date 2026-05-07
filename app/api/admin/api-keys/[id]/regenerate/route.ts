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
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const role = searchParams.get('role')
    const active = searchParams.get('active')

    const where: any = {}
    if (role) where.role = role
    if (active !== null) where.isActive = active === 'true'

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          universityAdmin: {
            select: { university: { select: { id: true, name: true } } }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])

    // Enhance response with computed fields
    const enhancedUsers = users.map(user => ({
      ...user,
      hasLoggedIn: user.lastLogin !== null,
      isRegistered: true // all admin users are registered
    }))

    return NextResponse.json({
      users: enhancedUsers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (error: any) {
    console.error('List users error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}