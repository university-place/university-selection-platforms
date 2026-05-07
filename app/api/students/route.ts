import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import bcrypt from 'bcrypt'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { examID, dateOfBirth, password, email, phone } = body

    if (!examID || !dateOfBirth || !password) {
      return NextResponse.json(
        { success: false, message: 'examID, dateOfBirth and password are required' },
        { status: 400 }
      )
    }

    // Find the student by examID and dateOfBirth
    const student = await prisma.student.findFirst({
      where: {
        examID,
        dateOfBirth: new Date(dateOfBirth),
      },
    })

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials or student not found' },
        { status: 404 }
      )
    }

    // Check if already registered
    if (student.isRegistered) {
      return NextResponse.json(
        { success: false, message: 'Student already registered' },
        { status: 409 }
      )
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update student record
    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        password: hashedPassword,
        isRegistered: true,
        email: email || student.email,
        phone: phone || student.phone,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      student: {
        examID: updated.examID,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}