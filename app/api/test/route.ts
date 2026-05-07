import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'

export async function GET() {
  try {
    await prisma.$connect()
    const count = await prisma.student.count()
    return NextResponse.json({ ok: true, count })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
