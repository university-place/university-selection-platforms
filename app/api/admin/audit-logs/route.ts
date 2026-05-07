import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import { getToken } from 'next-auth/jwt'

export async function GET(request: Request) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || (token.role !== 'PLATFORM_ADMIN' && token.role !== 'MOE_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  const logs = await prisma.auditLog.findMany({
    where: year ? { academicYear: year } : {},
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: { user: { select: { email: true, name: true } } }
  })

  return NextResponse.json(logs)
}