import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      response = NextResponse.json(
        { success: false, message: 'Email and password required' },
        { status: 400 }
      );
    } else {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // Check if user exists and has UNIVERSITY_ADMIN role
      if (!user || !user.password || user.role !== 'UNIVERSITY_ADMIN') {
        response = NextResponse.json(
          { success: false, message: 'Invalid credentials' },
          { status: 401 }
        );
      } else if (!user.isActive) {
        response = NextResponse.json(
          { success: false, message: 'Account deactivated' },
          { status: 403 }
        );
      } else if (false && !user.emailVerified) { // Temporarily bypass for testing
        // Email verification check (keep this)
        response = NextResponse.json(
          { success: false, message: 'Please verify your email before logging in' },
          { status: 403 }
        );
      } else {
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          response = NextResponse.json(
            { success: false, message: 'Invalid credentials' },
            { status: 401 }
          );
        } else {
          const token = jwt.sign(
            {
              id: user.id,
              email: user.email,
              role: 'UNIVERSITY_ADMIN',
            },
            process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "dXFzVnQzYUdMZkhNQVFwQjRyOHY2TzV4aTdqYjBlQ2M=",
            { expiresIn: '365d' }
          );

          response = NextResponse.json({
            success: true,
            token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('Platform login error:', error);
    response = NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}
// Trigger reload
