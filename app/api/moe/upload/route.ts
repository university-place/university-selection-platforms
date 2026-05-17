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
function determineStream(examResults: any, streamSubjectsConfig: any): string | null {
  const keys = Object.keys(examResults).map(k => k.toLowerCase());
  
  // 1. Check for "Signature" subjects that are unique to each stream
  const isNatural = keys.some(k => k.includes('physics') || k.includes('bio') || k.includes('chem'));
  const isSocial = keys.some(k => k.includes('history') || k.includes('geo') || k.includes('econ'));

  if (isNatural && !isSocial) return 'Natural Science';
  if (isSocial && !isNatural) return 'Social Science';
  
  // 2. Fallback: Count matches against configured subjects
  let naturalScoreCount = 0;
  let socialScoreCount = 0;

  streamSubjectsConfig.Natural?.forEach((s: any) => {
    if (keys.some(k => k === s.key.toLowerCase() || k.replace('score', '') === s.key.toLowerCase().replace('score', ''))) {
      naturalScoreCount++;
    }
  });

  streamSubjectsConfig.Social?.forEach((s: any) => {
    if (keys.some(k => k === s.key.toLowerCase() || k.replace('score', '') === s.key.toLowerCase().replace('score', ''))) {
      socialScoreCount++;
    }
  });

  if (naturalScoreCount > socialScoreCount) return 'Natural Science';
  if (socialScoreCount > naturalScoreCount) return 'Social Science';
  
  return isNatural ? 'Natural Science' : (isSocial ? 'Social Science' : null);
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

    const subjectsConfig = await prisma.systemConfig.findUnique({
      where: { key: 'stream_subjects' }
    })
    const streamSubjects = (subjectsConfig?.value as any) || {
      Natural: [{ key: 'physics' }, { key: 'chemistry' }, { key: 'biology' }],
      Social: [{ key: 'history' }, { key: 'geography' }, { key: 'economics' }]
    }

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
          let recordTotalScore = 0
          
          // 1. Get stream-specific subjects for this record
          const studentStream = r.stream || (Object.keys(r).some(k => k.toLowerCase().includes('physics')) ? 'Natural Science' : 'Social Science');
          const streamKey = studentStream === 'Natural Science' ? 'Natural' : 'Social';
          const relevantSubjects = streamSubjects[streamKey] || [];
          
          const recordCustomAttributes: any = {}

          // 2. Map subjects with fuzzy matching
          relevantSubjects.forEach((subj: any) => {
            const key = subj.key;
            // Try exact match, then clean match
            const csvKey = Object.keys(r).find(k => {
              const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '').replace('score', '');
              const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '').replace('score', '').replace('id', '');
              return cleanK === cleanKey || cleanK === key.toLowerCase();
            });

            if (csvKey && r[csvKey] !== undefined) {
              const score = Number(r[csvKey]) || 0;
              examResults[key] = score;
              recordTotalScore += score;
            }
          });
          
          // ========== NEW: Dynamic Custom Attributes ==========
          const studentCustomAttrs: any = {}
          customAttrKeys.forEach(key => {
            // 1. Try EXACT match first (case insensitive, ignoring symbols)
            let csvKey = Object.keys(r).find(k => {
               const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
               const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
               return cleanK === cleanKey;
            });

            // 2. Fallback to fuzzy match ONLY if it's not a subject column
            if (!csvKey) {
              csvKey = Object.keys(r).find(k => {
                 if (k.toLowerCase().endsWith('score')) return false; // Skip subjects
                 const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                 const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                 if (cleanK.length > 4 && cleanKey.length > 4 && (cleanK.startsWith(cleanKey.substring(0, 5)) || cleanKey.startsWith(cleanK.substring(0, 5)))) return true;
                 return false;
              });
            }

            if (csvKey && r[csvKey] !== undefined) {
              const def = customAttrDefs.find(d => d.name === key)
              if (def?.type === 'number') {
                studentCustomAttrs[key] = Number(r[csvKey])
              } else if (def?.type === 'boolean') {
                studentCustomAttrs[key] = String(r[csvKey]).toLowerCase() === 'true' || String(r[csvKey]).toLowerCase() === 'yes'
              } else {
                studentCustomAttrs[key] = r[csvKey]
              }
            }
          })

          // 3. Fallback: Add any numeric column that isn't already handled as a subject or custom attribute
          const knownMetadataKeys = ['examid', 'dateofbirth', 'studentnationalid', 'firstname', 'lastname', 'email', 'phone', 'region', 'total', 'gender', 'disability', 'photo', 'age', 'schoolname', 'school', 'stream', 'dataversion', 'lastsyncedat'];
          
          Object.keys(r).forEach(key => {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (knownMetadataKeys.includes(cleanKey)) return;
            if (examResults[key] !== undefined) return;
            if (studentCustomAttrs[key] !== undefined) return;

            const score = Number(r[key]);
            if (!isNaN(score) && typeof r[key] !== 'boolean') {
              // It's a number and not a metadata field, treat as subject
              examResults[key] = score;
              recordTotalScore += score;
            }
          })
          
          // Legacy support (if CSV still uses scienceScore)
          if (r.scienceScore && !r.physicsScore) {
            examResults.science = Number(r.scienceScore)
          }

          // ========== NEW: Determine stream based on exam results ==========
          const stream = determineStream(examResults, streamSubjects) || studentStream
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
            ${(r.school || r.schoolName) ? `'${String(r.school || r.schoolName).replace(/'/g, "''")}'` : 'NULL'},
            ${r.photo ? `'${String(r.photo).replace(/'/g, "''")}'` : 'NULL'},
            ${stream ? `'${stream.replace(/'/g, "''")}'` : 'NULL'},
            '${JSON.stringify(studentCustomAttrs).replace(/'/g, "''")}'::jsonb
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
          // ========== BUILD EXAM RESULTS DYNAMICALLY ==========
          const examResults: any = {}
          let recordTotalScore = 0
          
          // 1. Get stream-specific subjects
          const studentStream = r.stream || (Object.keys(r).some(k => k.toLowerCase().includes('physics')) ? 'Natural Science' : 'Social Science');
          const streamKey = studentStream === 'Natural Science' ? 'Natural' : 'Social';
          const relevantSubjects = streamSubjects[streamKey] || [];
          
          const studentCustomAttrs: any = {}

          // 2. Map subjects with fuzzy matching
          relevantSubjects.forEach((subj: any) => {
            const key = subj.key;
            const csvKey = Object.keys(r).find(k => {
              const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '').replace('score', '');
              const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '').replace('score', '').replace('id', '');
              return cleanK === cleanKey || cleanK === key.toLowerCase();
            });

            if (csvKey && r[csvKey] !== undefined) {
              const score = Number(r[csvKey]) || 0;
              examResults[key] = score;
              recordTotalScore += score;
            }
          });
          
          // ========== NEW: Dynamic Custom Attributes ==========
          customAttrKeys.forEach(key => {
            // 1. Try EXACT match first (case insensitive, ignoring symbols)
            let csvKey = Object.keys(r).find(k => {
               const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
               const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
               return cleanK === cleanKey;
            });

            // 2. Fallback to fuzzy match ONLY if it's not a subject column
            if (!csvKey) {
              csvKey = Object.keys(r).find(k => {
                 if (k.toLowerCase().endsWith('score')) return false; // Skip subjects
                 const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                 const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                 if (cleanK.length > 4 && cleanKey.length > 4 && (cleanK.startsWith(cleanKey.substring(0, 5)) || cleanKey.startsWith(cleanK.substring(0, 5)))) return true;
                 return false;
              });
            }

            if (csvKey && r[csvKey] !== undefined) {
              const def = customAttrDefs.find(d => d.name === key)
              if (def?.type === 'number') {
                studentCustomAttrs[key] = Number(r[csvKey])
              } else if (def?.type === 'boolean') {
                studentCustomAttrs[key] = String(r[csvKey]).toLowerCase() === 'true' || String(r[csvKey]).toLowerCase() === 'yes'
              } else {
                studentCustomAttrs[key] = r[csvKey]
              }
            }
          })

          // 3. Fallback: Add any numeric column that isn't already handled as a subject or custom attribute
          const knownMetadataKeys = ['examid', 'dateofbirth', 'studentnationalid', 'firstname', 'lastname', 'email', 'phone', 'region', 'total', 'gender', 'disability', 'photo', 'age', 'schoolname', 'school', 'stream', 'dataversion', 'lastsyncedat'];
          
          Object.keys(r).forEach(key => {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (knownMetadataKeys.includes(cleanKey)) return;
            if (examResults[key] !== undefined) return;
            if (studentCustomAttrs[key] !== undefined) return;

            const score = Number(r[key]);
            if (!isNaN(score) && typeof r[key] !== 'boolean') {
              // It's a number and not a metadata field, treat as subject
              examResults[key] = score;
              recordTotalScore += score;
            }
          })
          
          // Determine stream
          const stream = determineStream(examResults, streamSubjects)
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
            school: r.school || r.schoolName || null,
            photo: r.photo || null,
            stream: stream || studentStream,
            customAttributes: studentCustomAttrs
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