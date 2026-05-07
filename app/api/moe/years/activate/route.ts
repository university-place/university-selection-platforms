import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const year = String(body.year || '').trim()
    if (!year) return NextResponse.json({ success: false, message: 'year required' }, { status: 400 })

    // verify year exists
    const y = await prisma.academicYear.findUnique({ where: { year } })
    if (!y) return NextResponse.json({ success: false, message: 'year not found' }, { status: 404 })

    // set active
    await prisma.academicYear.updateMany({ where: {}, data: { isActive: false } })
    await prisma.academicYear.update({ where: { year }, data: { isActive: true } })

    // mark students
    await prisma.student.updateMany({ where: { academicYear: { not: year } }, data: { isActive: false } })
    await prisma.student.updateMany({ where: { academicYear: year }, data: { isActive: true } })

    return NextResponse.json({ success: true, message: `Activated ${year}` })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
