import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.substring(7);
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Find all preferences for this student
    const preferences = await prisma.preference.findMany({
      where: {
        OR: [
          { studentId: decoded.id },
          { application: { studentId: decoded.id } }
        ],
        status: { in: ['ACCEPTED', 'REJECTED'] }
      },
      include: {
        university: true,
        program: true,
        application: {
          include: {
            student: true
          }
        }
      },
      orderBy: { decisionDate: 'desc' }
    });
    
    // Also check student confirmations
    const confirmations = await prisma.studentConfirmation.findMany({
      where: {
        studentId: decoded.id
      }
    });
    
    const confirmationMap = new Map();
    confirmations.forEach(c => {
      confirmationMap.set(c.universityId, c);
    });
    
    const placements = preferences.map(pref => {
      const confirmation = confirmationMap.get(pref.universityId);
      
      let status = 'PENDING';
      if (pref.status === 'REJECTED') {
        status = 'NOT_PLACED';
      } else if (confirmation?.confirmed === true) {
        status = 'CONFIRMED';
      } else if (confirmation?.status === 'DECLINED') {
        status = 'DECLINED';
      }
      
      return {
        id: pref.id,
        examID: pref.application?.student?.examID,
        firstName: pref.application?.student?.firstName,
        lastName: pref.application?.student?.lastName,
        programName: pref.status === 'REJECTED' ? 'Not Placed' : pref.program?.name,
        programCode: pref.status === 'REJECTED' ? 'N/A' : pref.program?.code,
        universityName: pref.university?.name,
        universityRegion: pref.university?.region,
        acceptanceMessage: pref.status === 'REJECTED' 
          ? (pref.remarks || 'Does not select or placed in our university.')
          : (pref.remarks || 'Congratulations! You have been accepted.'),
        confirmationDeadline: pref.status === 'REJECTED' ? null : pref.confirmationDeadline,
        status: status,
        decisionDate: pref.decisionDate,
        confirmedAt: confirmation?.confirmedAt
      };
    });
    
    return NextResponse.json({
      success: true,
      placements
    });
    
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}