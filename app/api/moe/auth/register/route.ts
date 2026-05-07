import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import bcrypt from 'bcrypt';
import { sendVerificationEmail } from '@/lib/email';
import { createVerificationToken } from '@/lib/auth-utils';
import { Prisma } from '@prisma/client';

function isValidPassword(password: string): boolean {
  if (password.length < 8 || password.length > 10) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

export async function POST(request: Request) {
  try {
    const contentType = String(request.headers.get('content-type') || '');
    let body: any = {};
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('form')) {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    } else {
      try { body = await request.json(); } catch { body = {}; }
    }

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const confirmPassword = String(body.confirmPassword || '');
    const name = body.name ? String(body.name).trim() : null;

    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Email, password and confirmPassword required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Password must be 8‑10 characters long and include at least one uppercase letter, one lowercase letter, one number, and one symbol.',
        },
        { status: 400 }
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'MOE_ADMIN',
        isActive: true,
        emailVerified: false,
      },
    });

    const token = await createVerificationToken(user.id);
    await sendVerificationEmail(user.email, token, user.name || 'MoE Admin');

    const { password: _, ...safeUser } = user;
    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        user: safeUser,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ success: false, message: 'Email already exists' }, { status: 409 });
    }
    console.error('MoE register error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}