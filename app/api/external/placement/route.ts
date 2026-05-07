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
  // New: update flag – default to true (upsert mode)
  const updateMode = formData.get('update') !== 'false' // true if not explicitly false

  if (!file || !academicYear) {
    return NextResponse.json({ error: 'Missing file or academicYear' }, { status: 400 })
  }

  const text = await file.text()
  const parser = parse(text, { columns: true, skip_empty_lines: true })
  const records = await parser.toArray()

  let processed = 0
  const errors = []

  if (updateMode) {
    // UPSERT mode – update existing or insert new
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
        })
        if (track) trackId = track.id
        else {
          errors.push(`Admission track ${admissionTrackCode} not found for program ${programCode}`)
          continue
        }
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
          admissionTrackId: trackId,
          updatedAt: new Date()
        }
      })
      processed++
    }
  } else {
    // INSERT‑ONLY mode – use createMany with skipDuplicates
    const dataToInsert = []
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

      // Find student
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
        })
        if (track) trackId = track.id
        else {
          errors.push(`Admission track ${admissionTrackCode} not found for program ${programCode}`)
          continue
        }
      }

      dataToInsert.push({
        studentId: student.id,
        universityId: university.id,
        programId: program.id,
        admissionTrackId: trackId,
        academicYear,
        status,
        remarks
      })
    }

    if (dataToInsert.length > 0) {
      const result = await prisma.placement.createMany({
        data: dataToInsert,
        skipDuplicates: true
      })
      processed = result.count
    }
  }

  return NextResponse.json({
    success: true,
    message: `Processed ${processed} placements`,
    errors: errors.length > 0 ? errors : undefined
  })
}