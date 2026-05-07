import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

async function verifyStudent(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token provided')
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'STUDENT') throw new Error('Forbidden')
    return { studentId: decoded.id }
  } catch {
    throw new Error('Invalid token')
  }
}

export async function POST(request: Request) {
  try {
    const { studentId } = await verifyStudent(request)
    const formData = await request.formData()

    const type = formData.get('type') as string
    const description = formData.get('description') as string
    const preferenceId = formData.get('preferenceId') ? parseInt(formData.get('preferenceId') as string) : null
    const evidenceFiles = formData.getAll('evidence') as File[] // optional multiple files

    if (!type || !description) {
      return NextResponse.json({ error: 'Type and description are required' }, { status: 400 })
    }

    // If preferenceId provided, verify it belongs to this student
    if (preferenceId) {
      const preference = await prisma.preference.findFirst({
        where: { id: preferenceId, application: { studentId } }
      })
      if (!preference) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
    }

    // Handle evidence uploads (optional) – we'll save files and collect URLs
    const evidenceUrls: string[] = []
    if (evidenceFiles.length > 0) {
      // You can reuse the document upload logic from earlier
      // For simplicity, we'll assume files are already uploaded via the documents endpoint
      // and you provide the file URLs in a separate field, or we can implement file saving here.
      // Here we'll just accept an array of URLs as JSON in a field called 'evidenceUrls'
      // But since we're using formData, we could have a field 'evidenceUrls' as JSON string.
    }

    // If you want to accept pre‑uploaded document IDs, you can handle that similarly.
    // For now, we'll store any provided evidence URLs (from a form field).
    const evidenceUrlsRaw = formData.get('evidenceUrls')
    let evidence = null
    if (evidenceUrlsRaw) {
      try {
        evidence = JSON.parse(evidenceUrlsRaw as string)
      } catch {
        // ignore
      }
    }

    const appeal = await prisma.appeal.create({
      data: {
        studentId,
        preferenceId,
        type,
        description,
        evidence: evidence || {},
        status: 'pending',
      }
    })

    return NextResponse.json(appeal, { status: 201 })
  } catch (error: any) {
    console.error('Appeal submission error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}
export async function GET(request: Request) {
  try {
    const { studentId } = await verifyStudent(request)

    const appeals = await prisma.appeal.findMany({
      where: { studentId },
      include: {
        preference: {
          include: {
            program: { select: { name: true, code: true } },
            university: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(appeals)
  } catch (error: any) {
    console.error('Get appeals error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }
}