import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 200 }));
}

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
    return { studentId: decoded.id }
  } catch (err: any) {
    throw new Error(`Auth failed: ${err.message}`)
  }
}

export async function POST(request: Request) {
  try {
    const { studentId } = await verifyStudent(request)
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return withCors(NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 }))
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) {
      return withCors(NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 }))
    }

    // Verify current password
    if (!student.password) {
      return withCors(NextResponse.json({ success: false, error: 'No password set. Use forgot password flow.' }, { status: 400 }))
    }

    const isValid = await bcrypt.compare(currentPassword, student.password)
    if (!isValid) {
      return withCors(NextResponse.json({ success: false, error: 'Incorrect current password' }, { status: 401 }))
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    await prisma.student.update({
      where: { id: studentId },
      data: { password: hashedPassword },
    })

    return withCors(NextResponse.json({ success: true, message: 'Password updated successfully' }))
  } catch (error: any) {
    console.error('POST change password error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return withCors(NextResponse.json({ success: false, error: error.message }, { status }))
  }
}
