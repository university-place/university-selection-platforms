import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'

export async function GET(request: Request, { params }: { params: { year: string } }) {
  try {
    const year = params.year
    const total = await prisma.student.count({ where: { academicYear: year } })
    const active = await prisma.student.count({ where: { academicYear: year, isActive: true } })

    return NextResponse.json({ success: true, year, stats: { total, active,} })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
