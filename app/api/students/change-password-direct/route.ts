import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import bcrypt from 'bcrypt';

function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 200 }));
}

export async function POST(request: Request) {
  try {
    const { examId, currentPassword, newPassword } = await request.json();

    if (!examId || !currentPassword || !newPassword) {
      return withCors(NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 }));
    }

    const student = await prisma.student.findFirst({ where: { examID: examId } });
    if (!student) {
      return withCors(NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 }));
    }

    if (!student.password) {
      return withCors(NextResponse.json({ success: false, error: 'No password set. Use forgot password flow.' }, { status: 400 }));
    }

    const isValid = await bcrypt.compare(currentPassword, student.password);
    if (!isValid) {
      return withCors(NextResponse.json({ success: false, error: 'Incorrect current password' }, { status: 401 }));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.student.update({
      where: { id: student.id },
      data: { password: hashedPassword },
    });

    return withCors(NextResponse.json({ success: true, message: 'Password changed successfully. You can now login.' }));
  } catch (error: any) {
    console.error('POST change password direct error:', error);
    return withCors(NextResponse.json({ success: false, error: error.message }, { status: 500 }));
  }
}
