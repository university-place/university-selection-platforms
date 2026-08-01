import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized');
  try {
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any;
    if (decoded.role !== 'MOE_ADMIN' && decoded.role !== 'MOE-ADMIN' && decoded.role !== 'PLATFORM_ADMIN') {
      throw new Error('Forbidden');
    }
    return decoded;
  } catch {
    throw new Error('Unauthorized');
  }
}

// GET /api/admin/universities/list  — list all universities
export async function GET(request: Request) {
  try {
    verifyAdmin(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [universities, total] = await Promise.all([
      prisma.university.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          region: true,
          isActive: true,
          isVerified: true,
          allowedDomains: true,
          address: true,
          contactEmail: true,
          contactPhone: true,
          website: true,
          description: true,
          createdAt: true,
          isRegistered: true,
          admins: {
            select: { id: true },
          },
        },
      }),
      prisma.university.count({ where }),
    ]);

    const normalized = universities.map((u) => {
      const { admins, ...rest } = u;
      return {
        ...rest,
        domain: rest.allowedDomains?.[0] || null,
        status: rest.isRegistered ? 'active' : 'inactive',
      };
    });

    return NextResponse.json({ success: true, data: normalized, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
}

// POST /api/admin/universities/list  — create a university
export async function POST(request: Request) {
  try {
    verifyAdmin(request);
    const body = await request.json();
    const { name, code, type, region, domain, address, contactEmail, contactPhone, website, description } = body;
    const allowedDomains =
      typeof domain === 'string' && domain.trim()
        ? [domain.trim().toLowerCase()]
        : [];

    if (!name || !code || !type) {
      return NextResponse.json({ success: false, error: 'name, code, and type are required' }, { status: 400 });
    }

    if (contactEmail && !contactEmail.toLowerCase().endsWith('.edu.et')) {
      return NextResponse.json({ success: false, error: 'University contact email must use an official .edu.et domain.' }, { status: 400 });
    }

    const university = await prisma.university.create({
      data: {
        name,
        code: code.toUpperCase(),
        type,
        region: region || '',
        allowedDomains,
        address: address || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        website: website || null,
        description: description || null,
        isActive: true,
        isVerified: false,
      },
    });

    return NextResponse.json({ success: true, data: university });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
