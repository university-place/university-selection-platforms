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
    
    // Get weighting settings
    const settingsConfig = await prisma.systemConfig.findFirst({
      where: { key: `weighting_${universityId}` }
    });
    
    const defaultSettings = {
      examScoreWeight: 70,
      regionWeight: 15,
      genderWeight: 10,
      disabilityWeight: 5,
      regionPreferences: [],
      genderPreferences: { male: 50, female: 50 },
      disabilityBonus: 5
    };
    
    const settings = settingsConfig?.value || defaultSettings;
    const maxExamScore = 700; // Maximum possible exam score
    
    // Get all submitted applicants for this university
    const applicants = await prisma.preference.findMany({
      where: {
        universityId: universityId,
        status: 'SUBMITTED',
        isCancelled: false
      },
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
    
    for (const app of applicants) {
      const student = app.application?.student;
      if (!student) continue;
      
      const examScore = calculateTotalScore(student.examResults);
      const hasDisability = student.disability && student.disability !== 'none' && student.disability !== 'No';
      
      const result = calculateWeightedScore({
        examScore: examScore,
        maxExamScore: maxExamScore,
        region: student.region || 'Unknown',
        gender: student.gender || 'Unknown',
        hasDisability: hasDisability
      }, settings);
      
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
    
    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        totalWeight: settings.examScoreWeight + settings.regionWeight + settings.genderWeight + settings.disabilityWeight
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
        disabilityAvg: totalApplicants > 0 ? (totalDisabilityPoints / totalApplicants).toFixed(2) : 0
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