import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

async function verifyAdmin(request: Request) {
  // same as above
}

export async function GET(request: Request) {
  try {
    await verifyAdmin(request)

    const universities = await prisma.university.findMany({
      where: { apiKey: { not: null } },
      select: {
        id: true,
        name: true,
        code: true,
        apiKey: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    })

    // Optionally mask part of the key for display
    const masked = universities.map(u => ({
      ...u,
      apiKey: u.apiKey ? `${u.apiKey.slice(0, 8)}...${u.apiKey.slice(-8)}` : null
    }))

    return NextResponse.json(masked)
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}