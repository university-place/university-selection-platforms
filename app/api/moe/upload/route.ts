import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'
import prisma from '@/prisma/client'
import { Readable } from 'stream'
import { parse } from 'csv-parse'

/**
 * Ensures the AcademicYear record exists in the database.
 */
async function ensureAcademicYearRecord(year: string, activate = false) {
  try {
    if (prisma && (prisma as any).academicYear && typeof (prisma as any).academicYear.upsert === 'function') {
      return await (prisma as any).academicYear.upsert({
        where: { year },
        update: {},
        create: { year, isActive: activate }
      })
    }
  } catch (e) {
    console.warn('academicYear.upsert failed, falling back to raw SQL:', e)
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO "AcademicYear" ("year", "isActive", "archived", "createdAt", "updatedAt")
      VALUES (${year}, ${activate}, false, now(), now())
      ON CONFLICT ("year") DO NOTHING
    `
    return { year, isActive: activate }
  } catch (e) {
    console.warn('Raw SQL fallback for AcademicYear failed:', e)
    throw e
  }
}

// ========== NEW: Helper function to determine stream ==========
function determineStream(examResults: any): string | null {
  // Check for Natural Science subjects
  const hasNatural = examResults.physics !== undefined || 
                     examResults.chemistry !== undefined || 
                     examResults.biology !== undefined
  
  // Check for Social Science subjects
  const hasSocial = examResults.history !== undefined || 
                    examResults.geography !== undefined || 
                    examResults.economics !== undefined
  
  if (hasNatural) return 'Natural Science'
  if (hasSocial) return 'Social Science'
  return null
}

export async function POST(request: Request) {
  // ========== AUTHENTICATION ==========
  let userId: string | null = null
  let userRole: string | null = null

  try {
    const session = await getServerSession(authOptions)
    if (session?.user) {
      userId = session.user.id as string
      userRole = session.user.role as string
    }
  } catch (e) { /* ignore */ }

  if (!userId) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
        userId = decoded.id
        userRole = decoded.role
      } catch (err) {
        return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  if (userRole !== 'MOE_ADMIN') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  // ========== PROCESS UPLOAD ==========
  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 })
    }

    const academicYear = String(form.get('academicYear') || '').trim()
    const activateNow = String(form.get('activateNow') || 'false') === 'true'
    const replace = String(form.get('replace') || 'false') === 'true'
    const update = String(form.get('update') || 'false') === 'true'
    const updateMode = replace ? 'replace' : (update ? 'upsert' : 'skip')

    if (!academicYear) {
      return NextResponse.json({ success: false, message: 'Missing academicYear' }, { status: 400 })
    }

    await ensureAcademicYearRecord(academicYear, false)

    if (updateMode === 'replace') {
      await prisma.student.deleteMany({ where: { academicYear } })
    }

    const text = await file.text()
    const parser = parse(text, { columns: true, skip_empty_lines: true, trim: true })
    const records = await parser.toArray()

    // Get custom attributes definition
    const customAttrConfig = await prisma.systemConfig.findUnique({
      where: { key: 'student_custom_attributes' }
    })
    const customAttrDefs = (customAttrConfig?.value as any[]) || []
    const customAttrKeys = customAttrDefs.map(d => d.name)

    const BATCH_SIZE = 1000
    let totalInserted = 0
    let naturalCount = 0
    let socialCount = 0

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)

      if (updateMode === 'upsert') {
        const values = batch.map(r => {
          const examID = String(r.examID).trim()
          const dob = r.dateOfBirth ? new Date(r.dateOfBirth) : null
          
          // ========== BUILD EXAM RESULTS DYNAMICALLY ==========
          const examResults: any = {}
          
          // Add any column ending in "Score" to examResults
          Object.keys(r).forEach(key => {
            if (key.toLowerCase().endsWith('score')) {
              const subjectName = key.toLowerCase().replace('score', '');
              examResults[subjectName] = Number(r[key]);
            }
          })
          
          // Total score
          if (r.total) examResults.total = Number(r.total)
          
          // Legacy support (if CSV still uses scienceScore)
          if (r.scienceScore && !r.physicsScore) {
            examResults.science = Number(r.scienceScore)
          }

          // ========== NEW: Dynamic Custom Attributes ==========
          const customAttributes: any = {}
          customAttrKeys.forEach(key => {
            if (r[key] !== undefined) {
              const def = customAttrDefs.find(d => d.name === key)
              if (def?.type === 'number') {
                customAttributes[key] = Number(r[key])
              } else if (def?.type === 'boolean') {
                customAttributes[key] = String(r[key]).toLowerCase() === 'true' || String(r[key]).toLowerCase() === 'yes'
              } else {
                customAttributes[key] = r[key]
              }
            }
          })

          // ========== NEW: Determine stream based on exam results ==========
          const stream = determineStream(examResults)
          if (stream === 'Natural Science') naturalCount++
          else if (stream === 'Social Science') socialCount++

          return `(
            '${examID.replace(/'/g, "''")}',
            '${academicYear}',
            ${dob ? `'${dob.toISOString()}'` : 'NULL'},
            ${r.studentNationalID ? `'${String(r.studentNationalID).replace(/'/g, "''")}'` : 'NULL'},
            ${r.firstName ? `'${String(r.firstName).replace(/'/g, "''")}'` : 'NULL'},
            ${r.lastName ? `'${String(r.lastName).replace(/'/g, "''")}'` : 'NULL'},
            ${r.email ? `'${String(r.email).replace(/'/g, "''")}'` : 'NULL'},
            ${r.phone ? `'${String(r.phone).replace(/'/g, "''")}'` : 'NULL'},
            ${r.region ? `'${String(r.region).replace(/'/g, "''")}'` : 'NULL'},
            '${JSON.stringify(examResults).replace(/'/g, "''")}'::jsonb,
            ${r.status ? `'${String(r.status).replace(/'/g, "''")}'` : 'NULL'},
            true,
            NOW(),
            NOW(),
            ${r.gender ? `'${String(r.gender).replace(/'/g, "''")}'` : 'NULL'},
            ${r.disability ? `'${String(r.disability).replace(/'/g, "''")}'` : 'NULL'},
            ${r.school ? `'${String(r.school).replace(/'/g, "''")}'` : 'NULL'},
            ${r.photo ? `'${String(r.photo).replace(/'/g, "''")}'` : 'NULL'},
            ${stream ? `'${stream.replace(/'/g, "''")}'` : 'NULL'},
            '${JSON.stringify(customAttributes).replace(/'/g, "''")}'::jsonb
          )`
        }).join(',')

        const sql = `
          INSERT INTO "Student" (
            "examID", "academicYear", "dateOfBirth", "studentNationalID",
            "firstName", "lastName", "email", "phone", "region", "examResults",
            "status", "isActive", "createdAt", "updatedAt",
            "gender", "disability", "school", "photo", "stream", "customAttributes"
          ) VALUES ${values}
          ON CONFLICT ("examID", "academicYear") DO UPDATE SET
            "dateOfBirth" = EXCLUDED."dateOfBirth",
            "studentNationalID" = EXCLUDED."studentNationalID",
            "firstName" = EXCLUDED."firstName",
            "lastName" = EXCLUDED."lastName",
            "email" = EXCLUDED."email",
            "phone" = EXCLUDED."phone",
            "region" = EXCLUDED."region",
            "examResults" = EXCLUDED."examResults",
            "status" = EXCLUDED."status",
            "isActive" = EXCLUDED."isActive",
            "updatedAt" = NOW(),
            "gender" = EXCLUDED."gender",
            "disability" = EXCLUDED."disability",
            "school" = EXCLUDED."school",
            "photo" = EXCLUDED."photo",
            "stream" = EXCLUDED."stream",
            "customAttributes" = EXCLUDED."customAttributes"
        `

        try {
          await prisma.$executeRawUnsafe(sql)
          totalInserted += batch.length
        } catch (e) {
          console.error('Batch upsert failed:', e)
        }
      } else {
        // Skip or replace mode
        const data = batch.map(r => {
          const examResults: any = {}
          
          // Add any column ending in "Score" to examResults
          Object.keys(r).forEach(key => {
            if (key.toLowerCase().endsWith('score')) {
              const subjectName = key.toLowerCase().replace('score', '');
              examResults[subjectName] = Number(r[key]);
            }
          })
          
          if (r.total) examResults.total = Number(r.total)
          
          // Determine stream
          const stream = determineStream(examResults)
          if (stream === 'Natural Science') naturalCount++
          else if (stream === 'Social Science') socialCount++
          
          return {
            examID: String(r.examID).trim(),
            academicYear,
            dateOfBirth: r.dateOfBirth ? new Date(r.dateOfBirth) : null,
            studentNationalID: r.studentNationalID || null,
            firstName: r.firstName || null,
            lastName: r.lastName || null,
            email: r.email || null,
            phone: r.phone || null,
            region: r.region || null,
            examResults: examResults,
            status: r.status || null,
            isActive: true,
            lastSyncedAt: new Date(),
            gender: r.gender || null,
            disability: r.disability || null,
            school: r.school || null,
            photo: r.photo || null,
            stream: stream,
            customAttributes: customAttributes
          }
        })

        const res = await prisma.student.createMany({
          data,
          skipDuplicates: true
        })
        totalInserted += res.count
      }
    }

    if (activateNow) {
      await prisma.academicYear.update({
        where: { year: academicYear },
        data: { isActive: true }
      })
      await prisma.student.updateMany({
        where: { academicYear: { not: academicYear } },
        data: { isActive: false }
      })
      await prisma.student.updateMany({
        where: { academicYear },
        data: { isActive: true }
      })
    }

    await prisma.auditLog.create({
      data: {
        action: 'MOE_UPLOAD',
        userId,
        userEmail: (await prisma.user.findUnique({ where: { id: userId } }))?.email,
        academicYear,
        recordsInserted: totalInserted,
        recordsSkipped: records.length - totalInserted,
        filename: file.name,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Upload processed',
      summary: {
        totalRecords: records.length,
        insertedOrUpdated: totalInserted,
        mode: updateMode,
        naturalCount: naturalCount,
        socialCount: socialCount,
        academicYear: academicYear
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}