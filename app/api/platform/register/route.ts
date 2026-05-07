import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import bcrypt from 'bcrypt'

export async function POST(request: Request) {
  try {
    const { username, password, confirmPassword, name } = await request.json()

    // Validation
    if (!username || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Username, password and confirm password required' },
        { status: 400 }
      )
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Passwords do not match' },
        { status: 400 }
      )
    }

    // Check password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUser = await prisma.platformAdmin.findUnique({
      where: { username: username }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username already taken' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create platform admin (without email)
    const admin = await prisma.platformAdmin.create({
      data: {
        username: username,
        password: hashedPassword,
        name: name || username,
        role: 'PLATFORM_ADMIN',
        // email is optional or removed, so not needed
      }
    })

    // Return admin data without password
    const { password: _, ...adminWithoutPassword } = admin

    return NextResponse.json({
      success: true,
      message: 'Registration successful! You can now login.',
      admin: adminWithoutPassword
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}