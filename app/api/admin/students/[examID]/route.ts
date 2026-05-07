import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import { getToken } from 'next-auth/jwt'

export async function GET(
  request: Request,
  { params }: { params: { examID: string } }
) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || (token.role !== 'PLATFORM_ADMIN' && token.role !== 'MOE_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const examID = params.examID
  const student = await prisma.student.findFirst({
    where: { examID }
  })

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  return NextResponse.json(student)
}