// app/api/students/documents/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

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

// Helper to delete file from disk
async function deleteFile(fileUrl: string) {
  try {
    const filePath = path.join(process.cwd(), 'public', fileUrl)
    await unlink(filePath)
  } catch (err) {
    console.warn('File not found on disk:', fileUrl)
  }
}

// POST - Upload a new document (supports both general and university-specific)
export async function POST(request: Request) {
  try {
    const { studentId } = await verifyStudent(request)
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const docType = formData.get('type') as string
    const universityId = formData.get('universityId') as string // NEW: optional
    const scope = formData.get('scope') as string // NEW: 'general' or 'university'

    if (!file || !docType) {
      return NextResponse.json({ 
        success: false, 
        error: 'File and type are required' 
      }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type. Allowed: JPEG, PNG, PDF' 
      }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: 'File too large. Maximum size is 10MB' 
      }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // SANITIZE FILENAME
    const originalName = file.name
    const lastDot = originalName.lastIndexOf('.')
    const nameWithoutExt = originalName.substring(0, lastDot)
    const ext = originalName.substring(lastDot)
    const cleanName = nameWithoutExt.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
    
    let fileName: string
    let uploadDir: string
    let fileUrl: string
    let finalUniversityId: number | null = null
    let finalScope: string = scope || 'general'
    let finalPreferenceId: number | null = null

    // Case 1: University-specific document
    if (scope === 'university' && universityId) {
      finalUniversityId = parseInt(universityId)
      
      // Verify student has a preference for this university
      const preference = await prisma.preference.findFirst({
        where: {
          studentId: studentId,
          universityId: finalUniversityId,
          isCancelled: false
        }
      })
      
      if (!preference) {
        return NextResponse.json({ 
          success: false, 
          error: 'You do not have a preference for this university' 
        }, { status: 403 })
      }
      
      finalPreferenceId = preference.id
      fileName = `${studentId}-uni${universityId}-${Date.now()}-${cleanName}${ext}`
      uploadDir = path.join(process.cwd(), 'public', 'uploads', 'students', `university-${universityId}`)
      fileUrl = `/uploads/students/university-${universityId}/${encodeURIComponent(fileName)}`
    }
    // Case 2: General document (for all universities)
    else {
      fileName = `${studentId}-general-${Date.now()}-${cleanName}${ext}`
      uploadDir = path.join(process.cwd(), 'public', 'uploads', 'students', 'general')
      fileUrl = `/uploads/students/general/${encodeURIComponent(fileName)}`
    }
    
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const document = await prisma.document.create({
      data: {
        studentId,
        universityId: finalUniversityId,
        preferenceId: finalPreferenceId,
        scope: finalScope,
        type: docType,
        fileName: originalName,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        verificationStatus: 'PENDING',
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: scope === 'university' ? 'Document uploaded for university successfully' : 'Document uploaded successfully',
      document 
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Upload error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status })
  }
}

// GET - List all documents (can filter by scope and university)
export async function GET(request: Request) {
  try {
    const { studentId } = await verifyStudent(request)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const universityId = searchParams.get('universityId')
    const scope = searchParams.get('scope')
    
    const where: any = { studentId }
    if (type) where.type = type
    if (scope === 'general') {
      where.scope = 'general'
      where.universityId = null
    } else if (scope === 'university' && universityId) {
      where.scope = 'university'
      where.universityId = parseInt(universityId)
    } else if (universityId) {
      where.universityId = parseInt(universityId)
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        university: {
          select: { id: true, name: true }
        }
      },
      orderBy: { uploadDate: 'desc' },
    })
    
    return NextResponse.json({ 
      success: true, 
      count: documents.length,
      documents 
    })
    
  } catch (error: any) {
    console.error('List documents error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status })
  }
}

// PUT - Update document (metadata OR replace file)
export async function PUT(request: Request) {
  try {
    const { studentId } = await verifyStudent(request)
    
    // Check if it's a file upload (multipart) or JSON update
    const contentType = request.headers.get('content-type') || ''
    
    // Case 1: File upload (multipart/form-data) - Replace the actual file
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const documentId = formData.get('documentId') as string
      const type = formData.get('type') as string
      const verificationStatus = formData.get('verificationStatus') as string

      if (!documentId) {
        return NextResponse.json({ 
          success: false, 
          error: 'Document ID is required' 
        }, { status: 400 })
      }

      if (!file) {
        return NextResponse.json({ 
          success: false, 
          error: 'File is required to update document' 
        }, { status: 400 })
      }

      const docId = parseInt(documentId)
      if (isNaN(docId)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid document ID' 
        }, { status: 400 })
      }

      // Check if document exists and belongs to student
      const existingDoc = await prisma.document.findFirst({
        where: { id: docId, studentId }
      })

      if (!existingDoc) {
        return NextResponse.json({ 
          success: false, 
          error: 'Document not found' 
        }, { status: 404 })
      }

      // Validate new file
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid file type. Allowed: JPEG, PNG, PDF' 
        }, { status: 400 })
      }

      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        return NextResponse.json({ 
          success: false, 
          error: 'File too large. Maximum size is 10MB' 
        }, { status: 400 })
      }

      // Delete old file from disk
      try {
        const oldFilePath = path.join(process.cwd(), 'public', existingDoc.fileUrl)
        await unlink(oldFilePath)
      } catch (err) {
        console.warn('Old file not found, continuing...')
      }

      // Save new file
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const originalName = file.name
      const lastDot = originalName.lastIndexOf('.')
      const nameWithoutExt = originalName.substring(0, lastDot)
      const ext = originalName.substring(lastDot)
      const cleanName = nameWithoutExt.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
      
      // Determine file path based on document scope
      let fileName: string
      let uploadDir: string
      let fileUrl: string
      
      if (existingDoc.scope === 'university' && existingDoc.universityId) {
        fileName = `${studentId}-uni${existingDoc.universityId}-${Date.now()}-${cleanName}${ext}`
        uploadDir = path.join(process.cwd(), 'public', 'uploads', 'students', `university-${existingDoc.universityId}`)
        fileUrl = `/uploads/students/university-${existingDoc.universityId}/${encodeURIComponent(fileName)}`
      } else {
        fileName = `${studentId}-general-${Date.now()}-${cleanName}${ext}`
        uploadDir = path.join(process.cwd(), 'public', 'uploads', 'students', 'general')
        fileUrl = `/uploads/students/general/${encodeURIComponent(fileName)}`
      }
      
      await mkdir(uploadDir, { recursive: true })
      const filePath = path.join(uploadDir, fileName)
      await writeFile(filePath, buffer)

      // Update database
      const updated = await prisma.document.update({
        where: { id: docId },
        data: {
          fileUrl,
          fileName: originalName,
          fileSize: file.size,
          mimeType: file.type,
          type: type || existingDoc.type,
          verificationStatus: verificationStatus || 'PENDING'
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Document file replaced successfully',
        document: updated 
      })
    }
    
    // Case 2: JSON update - Update metadata only
    else {
      const body = await request.json()
      const { documentId, type, verificationStatus } = body

      if (!documentId) {
        return NextResponse.json({ 
          success: false, 
          error: 'Document ID is required' 
        }, { status: 400 })
      }

      const docId = parseInt(documentId)
      if (isNaN(docId)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid document ID' 
        }, { status: 400 })
      }

      // Check if document exists and belongs to student
      const existingDoc = await prisma.document.findFirst({
        where: { id: docId, studentId }
      })

      if (!existingDoc) {
        return NextResponse.json({ 
          success: false, 
          error: 'Document not found' 
        }, { status: 404 })
      }

      const updated = await prisma.document.update({
        where: { id: docId },
        data: {
          type: type !== undefined ? type : existingDoc.type,
          verificationStatus: verificationStatus !== undefined ? verificationStatus : existingDoc.verificationStatus
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Document metadata updated successfully',
        document: updated 
      })
    }
    
  } catch (error: any) {
    console.error('Update document error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status })
  }
}

// DELETE - Remove a document
export async function DELETE(request: Request) {
  try {
    const { studentId } = await verifyStudent(request)
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Document ID is required' 
      }, { status: 400 })
    }

    const docId = parseInt(documentId)
    if (isNaN(docId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid document ID' 
      }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: { id: docId, studentId }
    })

    if (!document) {
      return NextResponse.json({ 
        success: false, 
        error: 'Document not found' 
      }, { status: 404 })
    }

    // Delete physical file
    await deleteFile(document.fileUrl)

    // Delete from database
    await prisma.document.delete({
      where: { id: docId }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Document deleted successfully' 
    })
    
  } catch (error: any) {
    console.error('Delete document error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status })
  }
}