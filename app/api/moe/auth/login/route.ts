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

    console.log('MOE Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      response = NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    } else {
      // Find MOE admin user - Check both User and MOEAdmin tables
      let admin = null;
      
      // First try to find in User table with MOE_ADMIN role
      admin = await prisma.user.findFirst({
        where: {
          email: email,
          role: 'MOE_ADMIN',
        },
      });

      // If not found in User table, try MOEAdmin table
      if (!admin) {
        const moeAdmin = await prisma.mOEAdmin.findFirst({
          where: {
            email: email,
          },
        });
        
        if (moeAdmin) {
          admin = moeAdmin;
        }
      }

      // For development: Auto-create MOE admin if doesn't exist
      if (!admin && process.env.NODE_ENV === 'development') {
        console.log('Creating default MOE admin for:', email);
        
        // Check if user exists with different role
        const existingUser = await prisma.user.findFirst({
          where: { email: email },
        });

        if (existingUser) {
          // Update existing user to MOE_ADMIN role
          admin = await prisma.user.update({
            where: { id: existingUser.id },
            data: { 
              role: 'MOE_ADMIN',
              isActive: true,
            },
          });
          console.log('Updated existing user to MOE_ADMIN role');
        } else {
          // Create new MOE admin
          const hashedPassword = await bcrypt.hash(password || 'Admin@123', 10);
          admin = await prisma.user.create({
            data: {
              email: email,
              name: email.split('@')[0],
              password: hashedPassword,
              role: 'MOE_ADMIN',
              isActive: true,
              emailVerified: true,
            },
          });
          console.log('Created new MOE admin user');
        }
      }

      if (!admin) {
        console.log('No MOE admin found for email:', email);
        response = NextResponse.json(
          { success: false, error: 'Invalid email or password. No MOE admin account found.' },
          { status: 401 }
        );
      } else if (admin.isActive === false) {
        // Check if account is active
        response = NextResponse.json(
          { success: false, error: 'Account is deactivated. Please contact system administrator.' },
          { status: 403 }
        );
      } else {
        // Verify password with multiple methods
        let isValidPassword = false;
        
        if (admin.password) {
          // Check if password is bcrypt hashed (starts with $2b$)
          if (admin.password.startsWith('$2b$')) {
            isValidPassword = await bcrypt.compare(password, admin.password);
          } else {
            // Plain text or other format
            isValidPassword = password === admin.password;
          }
        }

        // For development: Auto-accept if password is 'Admin@123'
        if (!isValidPassword && process.env.NODE_ENV === 'development') {
          if (password === 'Admin@123' || password === 'admin123' || password === 'password') {
            isValidPassword = true;
            console.log('Development mode: Auto-accepted password');
          }
        }

        if (!isValidPassword) {
          console.log('Invalid password for:', email);
          response = NextResponse.json(
            { success: false, error: 'Invalid email or password. Please check your credentials.' },
            { status: 401 }
          );
        } else {
          // Update last login
          try {
            if (admin.id) {
              await prisma.user.update({
                where: { id: admin.id },
                data: { lastLogin: new Date() },
              });
            }
          } catch (updateErr) {
            console.log('Could not update last login:', updateErr);
          }

          // Generate JWT token
          const token = jwt.sign(
            {
              id: admin.id,
              email: admin.email,
              role: 'MOE_ADMIN',
              name: admin.name || admin.email?.split('@')[0] || 'MOE Admin',
            },
            process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "dXFzVnQzYUdMZkhNQVFwQjRyOHY2TzV4aTdqYjBlQ2M=",
            { expiresIn: '365d' }
          );

          console.log('MOE Login successful for:', email);

          response = NextResponse.json({
            success: true,
            message: 'Login successful',
            data: {
              token,
              user: {
                id: admin.id,
                email: admin.email,
                name: admin.name || admin.email?.split('@')[0] || 'MOE Admin',
                role: 'MOE_ADMIN',
              },
            },
          });
        }
      }
    }
  } catch (error: any) {
    console.error('MOE Login error:', error);
    response = NextResponse.json(
      { success: false, error: error.message || 'An error occurred during login' },
      { status: 500 }
    );
  }

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}