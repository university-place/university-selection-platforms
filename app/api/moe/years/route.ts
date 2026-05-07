import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'

async function getAllAcademicYears() {
  if (prisma && (prisma as any).academicYear && typeof (prisma as any).academicYear.findMany === 'function') {
    return await (prisma as any).academicYear.findMany({ orderBy: { year: 'desc' } })
  }
  // fallback to raw SQL
  const rows: any[] = await prisma.$queryRawUnsafe('SELECT "year", "isActive", "archived" FROM "AcademicYear" ORDER BY "year" DESC')
  return rows.map(r => ({ year: r.year, isActive: r.isActive, archived: r.archived }))
}

async function ensureAcademicYearRecord(year: string, activate = false) {
  try {
    if (prisma && (prisma as any).academicYear && typeof (prisma as any).academicYear.upsert === 'function') {
      return await (prisma as any).academicYear.upsert({ where: { year }, create: { year, isActive: activate }, update: { isActive: activate } })
    }
  } catch (e) {
    console.warn('academicYear.upsert failed, falling back to raw SQL:', e)
  }
  // SQL fallback: insert or update
  await prisma.$executeRaw`INSERT INTO "AcademicYear" ("year","isActive","archived","createdAt","updatedAt") VALUES (${year}, ${activate}, false, now(), now()) ON CONFLICT ("year") DO UPDATE SET "isActive" = ${activate}, "updatedAt" = now()`
  return { year, isActive: activate }
}

export async function GET() {
  try {
    const years = await getAllAcademicYears()

    // attach stats for each year
    const data = await Promise.all(years.map(async (y: any) => {
      const total = await prisma.student.count({ where: { academicYear: y.year } })
      const activeCount = await prisma.student.count({ where: { academicYear: y.year, isActive: true } })
      return { year: y.year, isActive: y.isActive, archived: y.archived, total, activeCount }
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const year = String(body.year || '').trim()
    const activate = Boolean(body.activate)

    if (!year) return NextResponse.json({ success: false, message: 'year required' }, { status: 400 })

    const rec = await ensureAcademicYearRecord(year, activate)

    if (activate) {
      // deactivate other years
      if (prisma && (prisma as any).academicYear && typeof (prisma as any).academicYear.updateMany === 'function') {
        await (prisma as any).academicYear.updateMany({ where: { year: { not: year } }, data: { isActive: false } })
      } else {
        await prisma.$executeRaw`UPDATE "AcademicYear" SET "isActive" = false WHERE "year" != ${year}`
      }
      await prisma.student.updateMany({ where: { academicYear: { not: year } }, data: { isActive: false } })
      await prisma.student.updateMany({ where: { academicYear: year }, data: { isActive: true } })
    }

    return NextResponse.json({ success: true, year: rec.year, isActive: rec.isActive })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
