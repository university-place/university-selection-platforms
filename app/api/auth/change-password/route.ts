import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new passwords are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const role = decoded.role?.toUpperCase();
    let user;
    let table: any;

    // Identify user type and fetch from DB
    if (role === 'PLATFORM_ADMIN') {
      user = await prisma.platformAdmin.findUnique({ where: { id: decoded.id } });
      table = prisma.platformAdmin;
    } else if (role === 'STUDENT') {
      user = await prisma.student.findUnique({ where: { id: decoded.id } });
      table = prisma.student;
    } else {
      // MOE_ADMIN or UNIVERSITY_ADMIN (both in User table)
      user = await prisma.user.findUnique({ where: { id: decoded.id } });
      table = prisma.user;
    }

    if (!user || !user.password) {
      return NextResponse.json({ error: 'User not found or password not set' }, { status: 404 });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await table.update({
      where: { id: decoded.id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
