import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import { parse } from 'csv-parse'

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) {
    return NextResponse.json({ error: 'API key required' }, { status: 401 })
  }

  const university = await prisma.university.findUnique({
    where: { apiKey },
    select: { id: true, name: true }
  })
  if (!university) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const academicYear = formData.get('academicYear') as string

  if (!file || !academicYear) {
    return NextResponse.json({ error: 'Missing file or academicYear' }, { status: 400 })
  }

  const text = await file.text()
  const parser = parse(text, { columns: true, skip_empty_lines: true })
  const records = await parser.toArray()

  let updated = 0
  const errors = []

  // ... after parsing CSV rows
for (const row of records) {
  const examID = row.examID?.trim()
  const programCode = row.programCode?.trim()
  const admissionTrackCode = row.admissionTrackCode?.trim()
  const status = row.status
  const remarks = row.remarks

  if (!examID || !programCode || !status) {
    errors.push(`Row missing required fields: ${JSON.stringify(row)}`)
    continue
  }

  // Find program
  const program = await prisma.program.findFirst({
    where: { code: programCode, universityId: university.id }
  })
  if (!program) {
    errors.push(`Program ${programCode} not found`)
    continue
  }

  // Find student by examID AND academicYear
  const student = await prisma.student.findFirst({
    where: { examID, academicYear }
  })
  if (!student) {
    errors.push(`Student ${examID} not found for year ${academicYear}`)
    continue
  }

  // Find admission track if provided
  let trackId = null
  if (admissionTrackCode) {
  const track = await prisma.admissionTrack.findFirst({
    where: { name: admissionTrackCode, programId: program.id }
  });
  if (track) trackId = track.id;
}

  // Upsert placement
  await prisma.placement.upsert({
    where: {
      studentId_universityId_programId_academicYear: {
        studentId: student.id,
        universityId: university.id,
        programId: program.id,
        academicYear
      }
    },
    create: {
      studentId: student.id,
      universityId: university.id,
      programId: program.id,
      admissionTrackId: trackId,
      academicYear,
      status,
      remarks
    },
    update: {
      status,
      remarks,
      updatedAt: new Date()
    }
  })
  updated++
}
  return NextResponse.json({
    success: true,
    message: `Processed ${updated} placements`,
    errors: errors.length > 0 ? errors : undefined
  })
}