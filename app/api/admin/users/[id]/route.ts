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
    const verifiedOnly = searchParams.get('verifiedOnly') !== 'false'

    const where: any = {}
    if (role) where.role = role
    if (active !== null) where.isActive = active === 'true'
    
    // Apply emailVerified filter for ALL users when verifiedOnly is true
    if (verifiedOnly) {
      where.emailVerified = true
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
          lastLogin: true,
          createdAt: true,
          universityAdmin: {
            select: {
              university: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])

    const enhancedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      hasLoggedIn: user.lastLogin !== null,
      isRegistered: true,
      status: user.emailVerified ? 'Verified' : 'Pending Verification',
      university: user.universityAdmin?.university || null
    }))

    return NextResponse.json({
      users: enhancedUsers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      filters: { verifiedOnly, role, active }
    })
  } catch (error: any) {
    console.error('List users error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: adminId } = await verifyAdmin(request)
    const { id } = await params
    const body = await request.json()
    const { role, isActive } = body

    if (id === adminId) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        role: role ?? undefined,
        isActive: isActive !== undefined ? isActive : undefined
      },
      select: { id: true, email: true, name: true, role: true, isActive: true }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Update user error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: adminId, role: adminRole } = await verifyAdmin(request)
    const { id } = await params

    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { role: true, emailVerified: true }
    })

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (id === adminId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Delete university admin record first if exists
    await prisma.universityAdmin.deleteMany({
      where: { userId: id }
    })
    
    // Delete the user
    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    })
  } catch (error: any) {
    console.error('Delete user error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}