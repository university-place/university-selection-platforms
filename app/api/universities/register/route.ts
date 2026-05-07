import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import bcrypt from 'bcrypt'
import { sendVerificationEmail } from '@/lib/email'
import { createVerificationToken } from '@/lib/auth-utils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, email, password, confirmPassword, name, department } = body

    // Validation
    if (!code || !email || !password || !confirmPassword || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, email, password, confirmPassword' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Find university by code
    const university = await prisma.university.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (!university) {
      return NextResponse.json(
        { error: `University with code "${code}" not found. Please contact MoE.` },
        { status: 404 }
      )
    }

    // Check if email already exists in User table
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Check if university already has an admin
    const existingAdmin = await prisma.universityAdmin.findFirst({
      where: { universityId: university.id }
    })
    if (existingAdmin) {
      return NextResponse.json(
        { error: 'This university already has an admin registered' },
        { status: 409 }
      )
    }

    // Create user (MOE model - also handles university admins)
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'UNIVERSITY_ADMIN',  // Important: role for university admin
        isActive: true,
        emailVerified: false
      }
    })

    // Create university admin record (links User to University)
    await prisma.universityAdmin.create({
      data: {
        userId: user.id,
        universityId: university.id,
        department: department || null
      }
    })

    // Mark university as registered
    if (!university.isRegistered) {
      await prisma.university.update({
        where: { id: university.id },
        data: { isRegistered: true }
      })
    }

    // Send verification email
    const token = await createVerificationToken(user.id)
    await sendVerificationEmail(user.email, token, user.name || 'University Admin', 'admin')

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })

  } catch (error: any) {
    console.error('University registration error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}