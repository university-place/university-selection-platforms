import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'
import { parse } from 'csv-parse'

export async function POST(request: Request) {
  // Authentication
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.substring(7)
  let userId: string | null = null
  let userRole: string | null = null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    userId = decoded.id
    userRole = decoded.role
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  if (userRole !== 'MOE_ADMIN' && userRole !== 'PLATFORM_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const text = await file.text()
    console.log('CSV content:', text.substring(0, 200)) // Debug: see first 200 chars

    const parser = parse(text, { columns: true, skip_empty_lines: true })
    const records = await parser.toArray()
    console.log('Parsed records:', records.length) // Debug: see record count

    const BATCH_SIZE = 1000
    let totalInserted = 0
    const results = []

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)

      for (const record of batch) {
        try {
          // Check if university exists by code
          const existing = await prisma.university.findUnique({
            where: { code: record.code }
          })

          if (existing) {
            // Update existing university
            const updated = await prisma.university.update({
              where: { code: record.code },
              data: {
                name: record.name,
                type: record.type,
                region: record.region,
                address: record.address,
                contactEmail: record.contactEmail,
                contactPhone: record.contactPhone,
                website: record.website,
                description: record.description,
                isActive: true,
              }
            })
            results.push({ code: record.code, action: 'updated' })
            console.log(`Updated ${record.code}: email -> ${record.contactEmail}`)
          } else {
            // Insert new university
            const created = await prisma.university.create({
              data: {
                name: record.name,
                code: record.code,
                type: record.type,
                region: record.region,
                address: record.address,
                contactEmail: record.contactEmail,
                contactPhone: record.contactPhone,
                website: record.website,
                description: record.description,
                isActive: true,
              }
            })
            results.push({ code: record.code, action: 'created' })
          }
          totalInserted++
        } catch (err) {
          console.error(`Error processing ${record.code}:`, err)
          results.push({ code: record.code, action: 'failed', error: String(err) })
        }
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'MOE_UPLOAD_UNIVERSITIES',
        userId,
        userEmail: (await prisma.user.findUnique({ where: { id: userId } }))?.email,
        recordsInserted: totalInserted,
        filename: file.name,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Universities uploaded/updated',
      summary: {
        totalRecords: records.length,
        processed: totalInserted,
        results
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}