import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized');
  try {
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'MOE_ADMIN' && decoded.role !== 'MOE-ADMIN' && decoded.role !== 'PLATFORM_ADMIN') throw new Error('Forbidden');
    return decoded;
  } catch {
    throw new Error('Unauthorized');
  }
}

// PATCH /api/admin/universities/[id]  — update a university
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    verifyAdmin(request);
    const id = parseInt(params.id);
    const body = await request.json();
    const allowedDomains =
        body.domain !== undefined
          ? (typeof body.domain === 'string' && body.domain.trim() ? [body.domain.trim().toLowerCase()] : [])
          : undefined;

    if (body.contactEmail && typeof body.contactEmail === 'string') {
      if (!body.contactEmail.toLowerCase().endsWith('.edu.et')) {
        return NextResponse.json({ success: false, error: 'University contact email must use an official .edu.et domain.' }, { status: 400 });
      }
    }

    const university = await prisma.university.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.code && { code: body.code.toUpperCase() }),
        ...(body.type && { type: body.type }),
        ...(body.region !== undefined && { region: body.region }),
        ...(allowedDomains !== undefined && { allowedDomains }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.contactEmail !== undefined && { contactEmail: body.contactEmail }),
        ...(body.contactPhone !== undefined && { contactPhone: body.contactPhone }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.isVerified !== undefined && { isVerified: body.isVerified }),
      },
    });

    return NextResponse.json({ success: true, data: university });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/universities/[id]  — delete a university
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    verifyAdmin(request);
    const id = parseInt(params.id);

    await prisma.university.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
