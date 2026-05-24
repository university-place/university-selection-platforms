import { NextResponse } from 'next/server';
import prisma from '@/prisma/client';
import jwt from 'jsonwebtoken';
import { calculateWeightedScore } from '@/lib/weighting-calculator';

async function verifyUniversityAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token provided');
  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  if (decoded.role !== 'UNIVERSITY_ADMIN') throw new Error('Forbidden');
  const admin = await prisma.universityAdmin.findUnique({
    where: { userId: decoded.id },
    select: { universityId: true }
  });
  if (!admin) throw new Error('University admin record not found');
  return { userId: decoded.id, universityId: admin.universityId };
}

function calculateTotalScore(examResults: any): number {
  if (!examResults) return 0;
  if (examResults.total) return Number(examResults.total) || 0;
  
  let total = 0;
  for (const [key, value] of Object.entries(examResults)) {
    if (key !== 'total' && !key.startsWith('__')) {
      const numericScore = Number(value);
      if (!isNaN(numericScore)) total += numericScore;
    }
  }
  return total;
}

export async function GET(request: Request) {
  try {
    const { universityId } = await verifyUniversityAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const selectedStream = searchParams.get('stream') || 'all';

    // Get weighting settings for this stream
    let settingsConfig = await prisma.systemConfig.findUnique({
      where: { key: `weighting_${universityId}_${selectedStream}` }
    });
    
    // Fallback to 'all' or default
    if (!settingsConfig && selectedStream !== 'all') {
       settingsConfig = await prisma.systemConfig.findUnique({
         where: { key: `weighting_${universityId}_all` }
       });
    }

    if (!settingsConfig) {
       settingsConfig = await prisma.systemConfig.findUnique({
         where: { key: `weighting_${universityId}` }
       });
    }
    
    const defaultSettings = {
      examScoreWeight: 70,
      regionWeight: 15,
      genderWeight: 10,
      disabilityWeight: 5,
      invitationScoreWeight: 0,
      documentScoreWeight: 0,
      regionPreferences: [],
      genderPreferences: { male: 50, female: 50 },
      disabilityBonus: 5,
      customCriteria: []
    };
    
    const settings = settingsConfig?.value || defaultSettings;
    const maxExamScore = 700; // Maximum possible exam score
    
    // Get all submitted applicants for this university
    const where: any = {
      universityId: universityId,
      status: 'SUBMITTED',
      isCancelled: false
    };

    if (selectedStream !== 'all') {
      where.application = {
        student: {
          stream: selectedStream === 'natural' ? 'Natural Science' : 'Social Science'
        }
      };
    }

    const applicants = await prisma.preference.findMany({
      where,
      include: {
        application: {
          include: {
            student: true
          }
        }
      }
    });
    
    // Calculate weighted scores for each applicant
    const weightedApplicants = [];
    let totalExamPoints = 0;
    let totalRegionPoints = 0;
    let totalGenderPoints = 0;
    let totalDisabilityPoints = 0;
    let totalDocumentPoints = 0;
    
    for (const app of applicants) {
      const student = app.application?.student;
      if (!student) continue;
      
      const examScore = calculateTotalScore(student.examResults);
      const hasDisability = student.disability && student.disability !== 'none' && student.disability !== 'No';
      
      // Fetch invitation score if any
      const invitation = await prisma.interviewInvitation.findFirst({
        where: {
          studentId: student.id,
          universityId: universityId
        },
        select: {
          invitationScore: true
        }
      });
      const invitationScore = invitation?.invitationScore || null;

      const result = calculateWeightedScore({
        examScore: examScore,
        maxExamScore: maxExamScore,
        region: student.region || 'Unknown',
        gender: student.gender || 'Unknown',
        hasDisability: hasDisability,
        disabilityType: student.disability,
        customAttributes: (student as any).customAttributes || {},
        examResults: student.examResults as any,
        invitationScore: invitationScore,
        documentScore: app.documentScore
      }, settings as any);
      
      weightedApplicants.push({
        id: student.id,
        examID: student.examID,
        name: `${student.firstName} ${student.lastName}`,
        region: student.region,
        gender: student.gender,
        disability: student.disability,
        examScore: examScore,
        weightedScore: result.weightedScore,
        breakdown: result.breakdown
      });
      
      totalExamPoints += result.breakdown.examScoreContribution;
      totalRegionPoints += result.breakdown.regionContribution;
      totalGenderPoints += result.breakdown.genderContribution;
      totalDisabilityPoints += result.breakdown.disabilityContribution;
      totalDocumentPoints += result.breakdown.documentContribution;
    }
    
    // Calculate statistics
    const totalApplicants = weightedApplicants.length;
    const avgWeightedScore = totalApplicants > 0 
      ? weightedApplicants.reduce((sum, a) => sum + a.weightedScore, 0) / totalApplicants 
      : 0;
    
    // Sort by weighted score (highest first)
    weightedApplicants.sort((a, b) => b.weightedScore - a.weightedScore);
    
    // Calculate top 10%
    const top10Count = Math.ceil(totalApplicants * 0.1);
    const top10Applicants = weightedApplicants.slice(0, top10Count);
    
    // Gender distribution
    const maleCount = weightedApplicants.filter(a => a.gender === 'Male').length;
    const femaleCount = weightedApplicants.filter(a => a.gender === 'Female').length;
    
    // Disability distribution
    const disabilityCount = weightedApplicants.filter(a => a.disability && a.disability !== 'none' && a.disability !== 'No').length;
    
    // Region distribution
    const regionMap = new Map();
    weightedApplicants.forEach(a => {
      const region = a.region || 'Unknown';
      regionMap.set(region, (regionMap.get(region) || 0) + 1);
    });
    const regionDistribution = Array.from(regionMap.entries()).map(([region, count]) => ({
      region,
      count,
      percentage: (count / totalApplicants) * 100
    }));
    
    // Score distribution (ranges)
    const scoreRanges = [
      { min: 0, max: 500, count: 0, label: '0-500' },
      { min: 501, max: 550, count: 0, label: '501-550' },
      { min: 551, max: 600, count: 0, label: '551-600' },
      { min: 601, max: 650, count: 0, label: '601-650' },
      { min: 651, max: 700, count: 0, label: '651-700' }
    ];
    
    weightedApplicants.forEach(a => {
      for (const range of scoreRanges) {
        if (a.examScore >= range.min && a.examScore <= range.max) {
          range.count++;
          break;
        }
      }
    });
    
    const customCriteriaSum = ((settings as any).customCriteria || []).reduce((sum: number, c: any) => sum + (c.weight || 0), 0);
    const totalWeightCalculated = 
      (settings.examScoreWeight || 0) + 
      (settings.regionWeight || 0) + 
      (settings.genderWeight || 0) + 
      (settings.disabilityWeight || 0) + 
      ((settings as any).invitationScoreWeight || 0) + 
      ((settings as any).documentScoreWeight || 0) + 
      customCriteriaSum;

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        totalWeight: totalWeightCalculated
      },
      summary: {
        totalApplicants,
        avgWeightedScore: avgWeightedScore.toFixed(2),
        weightedScoreRange: {
          min: totalApplicants > 0 ? Math.min(...weightedApplicants.map(a => a.weightedScore)) : 0,
          max: totalApplicants > 0 ? Math.max(...weightedApplicants.map(a => a.weightedScore)) : 0
        },
        top10Count,
        top10AvgScore: top10Count > 0 
          ? (top10Applicants.reduce((sum, a) => sum + a.weightedScore, 0) / top10Count).toFixed(2)
          : 0
      },
      distribution: {
        gender: {
          male: maleCount,
          female: femaleCount,
          malePercentage: totalApplicants > 0 ? (maleCount / totalApplicants) * 100 : 0,
          femalePercentage: totalApplicants > 0 ? (femaleCount / totalApplicants) * 100 : 0
        },
        disability: {
          hasDisability: disabilityCount,
          noDisability: totalApplicants - disabilityCount,
          disabilityPercentage: totalApplicants > 0 ? (disabilityCount / totalApplicants) * 100 : 0
        },
        region: regionDistribution,
        examScores: scoreRanges
      },
      weightedContributions: {
        examScoreAvg: totalApplicants > 0 ? (totalExamPoints / totalApplicants).toFixed(2) : 0,
        regionAvg: totalApplicants > 0 ? (totalRegionPoints / totalApplicants).toFixed(2) : 0,
        genderAvg: totalApplicants > 0 ? (totalGenderPoints / totalApplicants).toFixed(2) : 0,
        disabilityAvg: totalApplicants > 0 ? (totalDisabilityPoints / totalApplicants).toFixed(2) : 0,
        documentAvg: totalApplicants > 0 ? (totalDocumentPoints / totalApplicants).toFixed(2) : 0
      },
      ranking: weightedApplicants.map((a, index) => ({
        rank: index + 1,
        examID: a.examID,
        name: a.name,
        examScore: a.examScore,
        weightedScore: a.weightedScore.toFixed(2),
        breakdown: a.breakdown
      }))
    });
    
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}