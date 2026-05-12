import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  try {
    // 1. Verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    // ✅ DECLARE allowedRoles ONLY ONCE at the top
    const allowedRoles = ['MOE_ADMIN', 'PLATFORM_ADMIN', 'moe_admin', 'platform_admin', 'MOE', 'ADMIN'];
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('Decoded token role:', decoded.role);
      console.log('Allowed roles:', allowedRoles);
      console.log('Is allowed:', allowedRoles.includes(decoded.role));
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // 2. Role check - Accept multiple variations (case insensitive)
    // ✅ REMOVE this duplicate declaration!
    // const allowedRoles = ['MOE_ADMIN', 'PLATFORM_ADMIN', ...];  // ← DELETE THIS LINE
    
    const userRole = decoded.role?.toUpperCase();
    
    if (!allowedRoles.includes(decoded.role) && !allowedRoles.includes(userRole)) {
      console.log(`Role not allowed: ${decoded.role}`);
      return NextResponse.json(
        { success: false, error: `Forbidden - Your role (${decoded.role}) does not have access` },
        { status: 403 }
      );
    }

    // 3. Fetch all statistics
    const [
      totalStudents,
      naturalScienceStudents,
      socialScienceStudents,
      registeredStudents,
      activeStudents,
      totalUniversities,
      totalPrograms,
      totalApplications,
      totalPlacements,
      totalActiveUniversities,
      totalVerifiedUniversities,
      totalAppeals,
      totalInterviewInvitations,
      byYear,
      activeYearRecord,
      recentUploads,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { stream: 'Natural Science' } }),
      prisma.student.count({ where: { stream: 'Social Science' } }),
      prisma.student.count({ where: { isRegistered: true } }),
      prisma.student.count({ where: { isActive: true } }),
      prisma.university.count(),
      prisma.program.count(),
      prisma.application.count({ where: { status: { not: 'DRAFT' } } }),
      prisma.placement.count(),
      prisma.university.count({ where: { isActive: true } }),
      prisma.university.count({ where: { isVerified: true } }),
      prisma.appeal.count(),
      prisma.interviewInvitation.count(),
      prisma.student.groupBy({
        by: ['academicYear'],
        _count: true,
        orderBy: { academicYear: 'desc' },
      }),
      prisma.academicYear.findFirst({
        where: { isActive: true },
      }),
      prisma.auditLog.findMany({
        where: { action: 'MOE_UPLOAD' },
        orderBy: { timestamp: 'desc' },
        take: 5,
        include: { user: { select: { email: true, name: true } } },
      }),
    ]);

    const placementRate = totalApplications > 0 
      ? Math.round((totalPlacements / totalApplications) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalStudents,
        naturalScience: naturalScienceStudents,
        socialScience: socialScienceStudents,
        registered: registeredStudents,
        verified: activeStudents,
        totalUniversities,
        totalPrograms,
        totalApplications,
        totalPlacements,
        totalActiveUniversities,
        totalVerifiedUniversities,
        totalAppeals,
        totalInterviewInvitations,
        placementRate,
      },
      extra: {
        byYear: byYear.map(item => ({
          academicYear: item.academicYear,
          count: item._count,
        })),
        activeYear: activeYearRecord?.year || null,
        recentUploads: recentUploads.map(upload => ({
          id: upload.id,
          filename: upload.filename,
          recordsInserted: upload.recordsInserted,
          recordsSkipped: upload.recordsSkipped,
          timestamp: upload.timestamp,
          user: {
            email: upload.user?.email,
            name: upload.user?.name,
          },
        })),
      },
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}