import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import jwt from 'jsonwebtoken'

// ============================================
// CORS UTILITY
// ============================================

function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 200 }));
}

// ============================================
// AUTHENTICATION UTILITY
// ============================================

async function verifyStudent(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('VerifyStudent: Missing or malformed auth header');
    throw new Error('No token provided')
  }
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'STUDENT') {
      console.error('VerifyStudent: Incorrect role:', decoded.role);
      throw new Error('Forbidden')
    }
    return { studentId: decoded.id }
  } catch (err: any) {
    console.error('VerifyStudent: JWT error:', err.message, 'Token used:', token.substring(0, 10) + '...');
    throw new Error(`Auth failed: ${err.message}`)
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// Subject definitions with their corresponding keys in examResults
const subjectDefinitions = {
  Natural: [
    { name: 'Mathematics', key: 'mathematics' },
    { name: 'Physics', key: 'physics' },
    { name: 'Chemistry', key: 'chemistry' },
    { name: 'Biology', key: 'biology' },
    { name: 'English', key: 'english' },
    { name: 'Civics', key: 'civics' }
  ],
  Social: [
    { name: 'Mathematics (Social)', key: 'mathematics' },
    { name: 'English', key: 'english' },
    { name: 'History', key: 'history' },
    { name: 'Geography', key: 'geography' },
    { name: 'Economics', key: 'economics' },
    { name: 'Civics', key: 'civics' }
  ]
}

// ============================================
// GET - Fetch Student Profile
// ============================================

export async function GET(request: Request) {
  try {
    const { studentId } = await verifyStudent(request)

    // Fetch student basic info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        examID: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        region: true,
        dateOfBirth: true,
        examResults: true,
        status: true,
        academicYear: true,
        photo: true,
        gender: true,
        disability: true,
        age: true,
        isRegistered: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        customAttributes: true,
        stream: true,
      },
    })

    if (!student) {
      return withCors(NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 }))
    }

    // Parse examResults
    let examResults = student.examResults ?? {}
    if (typeof examResults === 'string') {
      try {
        examResults = JSON.parse(examResults)
      } catch (e) {
        examResults = {}
      }
    }
    if (!examResults || typeof examResults !== 'object' || Array.isArray(examResults)) {
      examResults = {}
    }

    const examResultsObj = examResults as Record<string, unknown>

    // Fetch dynamic subjects if available
    const config = await prisma.systemConfig.findUnique({ where: { key: 'stream_subjects' } });
    const dynamicSubjects = config?.value as { Natural: { name: string; key: string }[]; Social: { name: string; key: string }[] } | null;
    const activeSubjects = dynamicSubjects || subjectDefinitions;

    // Determine stream from student record or examResults
    let stream = student.stream || 'Unknown'
    let subjects: { name: string; score: unknown; }[] = []
    let totalScore = 0
    let maxScore = 0

    const hasPhysics = Object.prototype.hasOwnProperty.call(examResultsObj, 'physics') && examResultsObj.physics != null
    const hasHistory = Object.prototype.hasOwnProperty.call(examResultsObj, 'history') && examResultsObj.history != null
    
    if (stream === 'Unknown') {
       if (hasPhysics) stream = 'Natural Science';
       else if (hasHistory) stream = 'Social Science';
    }
    
    // Filter out internal keys and custom attributes from examResults
    const subjectKeys = Object.keys(examResultsObj).filter(key => {
      if (key.toLowerCase() === 'total' || key.toLowerCase() === 'totalscore') return false;
      if (key.startsWith('__')) return false;
      // Skip if it's already in customAttributes
      if (student.customAttributes && (student.customAttributes as any)[key] !== undefined) return false;
      return typeof examResultsObj[key] === 'number';
    });

    // Create a set of all subject keys to map
    const allSubjectsToMap = new Set<string>();
    const activeStreamSubjects = stream === 'Natural Science' ? (activeSubjects.Natural || []) : (activeSubjects.Social || []);
    
    // 1. Add subjects from definitions first (to ensure display names)
    activeStreamSubjects.forEach(s => allSubjectsToMap.add(s.key));
    
    // 2. Add any other keys found in examResults
    subjectKeys.forEach(k => allSubjectsToMap.add(k));

    subjects = Array.from(allSubjectsToMap).map(key => {
      const def = activeStreamSubjects.find(s => s.key === key);
      let score = examResultsObj[key] ?? null;
      
      if (score === null) {
        // Try fuzzy match if score is missing for a defined subject
        const matchKey = Object.keys(examResultsObj).find(k => {
          const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '').replace('score', '');
          const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '').replace('score', '').replace('id', '');
          return cleanK === cleanKey;
        });
        if (matchKey) score = examResultsObj[matchKey];
      }

      // 3. Last resort: Check customAttributes (in case it was uploaded as a custom attr)
      if (score === null && student.customAttributes) {
        const customAttr = student.customAttributes as any;
        const matchKey = Object.keys(customAttr).find(k => {
          const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '').replace('score', '');
          const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '').replace('score', '').replace('id', '');
          return cleanK === cleanKey;
        });
        if (matchKey && typeof customAttr[matchKey] === 'number') {
          score = customAttr[matchKey];
        }
      }

      if (typeof score === 'number') totalScore += score;
      
      return { 
        name: def?.name || (key.charAt(0).toUpperCase() + key.slice(1).replace('Score', '')), 
        score 
      };
    }).filter(s => s.score !== null); // Only include subjects where we actually have a score

    maxScore = subjects.length * 100;
    
    // Fallback stream detection if still Unknown
    if (stream === 'Unknown') {
       if (Object.keys(examResultsObj).some(k => k.toLowerCase().includes('physics'))) stream = 'Natural Science';
       else if (Object.keys(examResultsObj).some(k => k.toLowerCase().includes('history'))) stream = 'Social Science';
    }

    const computedAge = student.dateOfBirth ? calculateAge(student.dateOfBirth) : student.age || null

    // ========== FETCH UNIVERSITY INVITATIONS ==========
    const invitations = await prisma.interviewInvitation.findMany({
      where: { studentId: student.id },
      include: {
        university: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        admissionTrack: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    const formattedInvitations = invitations.map(inv => ({
      id: inv.id,
      type: inv.type,
      date: inv.date,
      location: inv.location,
      instructions: inv.instructions,
      status: inv.status,
      responseDeadline: inv.responseDeadline,
      result: inv.result,
      resultNotes: inv.resultNotes,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
      university: inv.university ? {
        id: inv.university.id,
        name: inv.university.name,
        code: inv.university.code,
      } : null,
      program: inv.program ? {
        id: inv.program.id,
        name: inv.program.name,
        code: inv.program.code,
      } : null,
      admissionTrack: inv.admissionTrack ? {
        id: inv.admissionTrack.id,
        name: inv.admissionTrack.name,
      } : null,
    }))

    // ========== FETCH STUDENT APPLICATIONS (PREFERENCES) ==========
    const preferences = await prisma.preference.findMany({
      where: {
        application: { studentId: student.id }
      },
      include: {
        university: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        application: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formattedApplications = preferences.map(pref => ({
      id: pref.id,
      status: pref.status,
      decisionDate: pref.decisionDate,
      confirmationDeadline: pref.confirmationDeadline,
      remarks: pref.remarks,
      createdAt: pref.createdAt,
      updatedAt: pref.updatedAt,
      university: pref.university ? {
        id: pref.university.id,
        name: pref.university.name,
        code: pref.university.code,
      } : null,
      program: pref.program ? {
        id: pref.program.id,
        name: pref.program.name,
        code: pref.program.code,
      } : null,
      application: pref.application ? {
        id: pref.application.id,
        status: pref.application.status,
        submittedAt: pref.application.createdAt,
        createdAt: pref.application.createdAt,
        updatedAt: pref.application.updatedAt,
      } : null,
    }))

    // ========== FETCH STUDENT CONFIRMATION ==========
    let formattedConfirmation = null

    try {
      const confirmation = await prisma.studentConfirmation.findFirst({
        where: {
          studentId: student.id,
          academicYear: student.academicYear,
        },
        include: {
          university: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          program: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (confirmation) {
        formattedConfirmation = {
          id: confirmation.id,
          status: confirmation.status,
          confirmationDeadline: confirmation.confirmationDeadline,
          confirmedAt: confirmation.confirmedAt,
          declinedAt: confirmation.declinedAt,
          remarks: confirmation.remarks,
          createdAt: confirmation.createdAt,
          university: confirmation.university ? {
            id: confirmation.university.id,
            name: confirmation.university.name,
          } : null,
          program: confirmation.program ? {
            id: confirmation.program.id,
            name: confirmation.program.name,
          } : null,
        }
      }
    } catch (error) {
      // StudentConfirmation model might not exist yet
      console.warn('StudentConfirmation model not available:', error)
    }

    // ========== RETURN COMPLETE PROFILE ==========
    const responseData = {
      success: true,
      profile: {
        // Basic Info
        id: student.id,
        examID: student.examID,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        email: student.email,
        phone: student.phone,
        region: student.region,
        dateOfBirth: student.dateOfBirth,
        academicYear: student.academicYear,
        photo: student.photo,
        gender: student.gender,
        disability: student.disability,
        age: computedAge,
        isRegistered: student.isRegistered,
        emailVerified: student.emailVerified,
        
        // Academic Info
        stream,
        subjects,
        totalScore,
        maxScore,
        examResults: examResults,
        
        // University Communications
        invitations: formattedInvitations,
        applications: formattedApplications,
        confirmation: formattedConfirmation,
        
        // Pending Actions (for quick UI alerts)
        pendingActions: {
          hasPendingInvitations: formattedInvitations.some(inv => inv.status === 'PENDING'),
          pendingInvitationCount: formattedInvitations.filter(inv => inv.status === 'PENDING').length,
          hasPendingConfirmation: formattedConfirmation?.status === 'PENDING',
          acceptedApplications: formattedApplications.filter(app => app.status === 'ACCEPTED').length,
          rejectedApplications: formattedApplications.filter(app => app.status === 'REJECTED').length,
        },
        
        // Timestamps
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
        customAttributes: student.customAttributes,
      },
    }
    
    return withCors(NextResponse.json(responseData))
    
  } catch (error: any) {
    console.error('GET profile error:', error.message)
    const status = error.message === 'Forbidden' ? 403 : 401
    return withCors(NextResponse.json({ 
      success: false, 
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status }))
  }
}

// ============================================
// PUT - Update Student Profile
// ============================================

export async function PUT(request: Request) {
  try {
    const { studentId } = await verifyStudent(request)
    const body = await request.json()
    const { email, phone, region, photo, gender, disability, age } = body

    // Validate email if provided
    if (email !== undefined && !/^\S+@\S+\.\S+$/.test(email)) {
      return withCors(NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      ))
    }

    // Update student profile
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        email: email !== undefined ? email : undefined,
        phone: phone !== undefined ? phone : undefined,
        region: region !== undefined ? region : undefined,
        photo: photo !== undefined ? photo : undefined,
        gender: gender !== undefined ? gender : undefined,
        disability: disability !== undefined ? disability : undefined,
        age: age !== undefined ? age : undefined,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        examID: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        region: true,
        dateOfBirth: true,
        examResults: true,
        status: true,
        academicYear: true,
        photo: true,
        gender: true,
        disability: true,
        age: true,
        isRegistered: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return withCors(NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updated,
    }))

  } catch (error: any) {
    console.error('PUT profile error:', error)
    const status = error.message === 'Forbidden' ? 403 : 401
    return withCors(NextResponse.json({ success: false, error: error.message }, { status }))
  }
}