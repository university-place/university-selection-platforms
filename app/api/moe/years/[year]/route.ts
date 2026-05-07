import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'

export async function DELETE(request: Request, { params }: { params: { year: string } }) {
  try {
    const year = params.year

    // Soft-archive: mark academicYear.archived and deactivate students
    await prisma.academicYear.update({ where: { year }, data: { archived: true, isActive: false } })
    await prisma.student.updateMany({ where: { academicYear: year }, data: { isActive: false } })

    return NextResponse.json({ success: true, message: `Archived ${year}` })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
