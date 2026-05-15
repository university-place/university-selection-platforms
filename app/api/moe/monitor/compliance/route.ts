import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

function verifyMOEToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded: any = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!);
    if (decoded.role !== 'MOE_ADMIN' && decoded.role !== 'PLATFORM_ADMIN') return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const decoded = verifyMOEToken(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // FIXED: Use correct relation names from your schema
    const universities = await prisma.university.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        region: true,
        isActive: true,
        _count: {
          select: {
            preferences: true,    // ✅ Changed from 'applications' to 'preferences'
            placements: true,     // ✅ This exists in your schema
            // Other available relations from your schema:
            // programs: true,
            // admins: true,
            // DepartmentPlacement: true,
            // InterviewInvitation: true,
            // StudentConfirmation: true,
            // UniversityAdmissionResult: true,
            // documents: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const complianceData = await Promise.all(
      universities.map(async (uni) => {
        // Get counts from the correct models
        const totalApplications = uni._count.preferences; // ✅ Now this works
        
        const acceptedApplications = await prisma.preference.count({
          where: { 
            universityId: uni.id, 
            status: 'ACCEPTED' 
          }
        });
        
        const pendingApplications = await prisma.preference.count({
          where: { 
            universityId: uni.id, 
            status: 'PENDING' 
          }
        });
        
        const rejectedApplications = await prisma.preference.count({
          where: { 
            universityId: uni.id, 
            status: 'REJECTED' 
          }
        });
        
        // Interview invitations count
        const invitationsSent = await prisma.interviewInvitation.count({
          where: { universityId: uni.id }
        });
        
        // Appeals count (through preferences)
        const appealCount = await prisma.appeal.count({
          where: { 
            preference: { 
              universityId: uni.id 
            } 
          }
        });
        
        // Student confirmations count
        const studentConfirmations = await prisma.studentConfirmation.count({
          where: { 
            universityId: uni.id,
            confirmed: true 
          }
        });
        
        const responseRate = totalApplications > 0
          ? Math.round(((acceptedApplications + rejectedApplications) / totalApplications) * 100)
          : 0;
        
        const totalPlacements = uni._count.placements || 0;

        // Determine compliance status based on response rate and appeals
        let complianceStatus = 'NON_COMPLIANT';
        if (responseRate >= 80 && appealCount < 5) {
          complianceStatus = 'COMPLIANT';
        } else if (responseRate >= 50 || appealCount < 10) {
          complianceStatus = 'PARTIAL';
        } else {
          complianceStatus = 'NON_COMPLIANT';
        }

        return {
          id: uni.id,
          name: uni.name,
          code: uni.code,
          region: uni.region || 'N/A',
          isActive: uni.isActive,
          totalApplications,
          invitationsSent,
          acceptedApplications,
          pendingApplications,
          rejectedApplications,
          totalPlacements,
          studentConfirmations,
          appealCount,
          responseRate,
          complianceStatus,
          // Additional metrics for better monitoring
          completionRate: totalApplications > 0 
            ? Math.round((studentConfirmations / totalApplications) * 100)
            : 0,
        };
      })
    );

    // Calculate overall compliance statistics
    const summary = {
      totalUniversities: complianceData.length,
      compliantUniversities: complianceData.filter(u => u.complianceStatus === 'COMPLIANT').length,
      partialUniversities: complianceData.filter(u => u.complianceStatus === 'PARTIAL').length,
      nonCompliantUniversities: complianceData.filter(u => u.complianceStatus === 'NON_COMPLIANT').length,
      totalApplications: complianceData.reduce((sum, u) => sum + u.totalApplications, 0),
      totalPlacements: complianceData.reduce((sum, u) => sum + u.totalPlacements, 0),
      averageResponseRate: Math.round(
        complianceData.reduce((sum, u) => sum + u.responseRate, 0) / (complianceData.length || 1)
      ),
      totalAppeals: complianceData.reduce((sum, u) => sum + u.appealCount, 0),
    };

    return NextResponse.json({ 
      success: true, 
      data: complianceData,
      summary,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('MOE compliance monitor error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}