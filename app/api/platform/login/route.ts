import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password required' },
        { status: 400 }
      )
    }

    // Find admin by username
    const admin = await prisma.platformAdmin.findUnique({
      where: { username }
    })

    // Check if admin exists
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    )

    // Return admin data without password
    const { password: _, ...adminWithoutPassword } = admin

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      admin: adminWithoutPassword
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}