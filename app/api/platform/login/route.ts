import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  let response: NextResponse;
  try {
    const { username, password } = await request.json()

    // Validation
    if (!username || !password) {
      response = NextResponse.json(
        { success: false, message: 'Username and password required' },
        { status: 400 }
      )
    } else {
      // Find admin by username
      const admin = await prisma.platformAdmin.findUnique({
        where: { username }
      })

      // Check if admin exists
      if (!admin) {
        response = NextResponse.json(
          { success: false, message: 'Invalid username or password' },
          { status: 401 }
        )
      } else {
        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password)
        if (!isValidPassword) {
          response = NextResponse.json(
            { success: false, message: 'Invalid username or password' },
            { status: 401 }
          )
        } else {
          // Generate JWT token
          const token = jwt.sign(
            {
              id: admin.id,
              username: admin.username,
              name: admin.name,
              role: admin.role
            },
            process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "dXFzVnQzYUdMZkhNQVFwQjRyOHY2TzV4aTdqYjBlQ2M=",
            { expiresIn: '365d' }
          )

          // Return admin data without password
          const { password: _, ...adminWithoutPassword } = admin

          response = NextResponse.json({
            success: true,
            message: 'Login successful',
            token,
            admin: adminWithoutPassword
          })
        }
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    response = NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}