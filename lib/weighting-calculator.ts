interface WeightingSettings {
  examScoreWeight: number;
  regionWeight: number;
  genderWeight: number;
  disabilityWeight: number;
  regionPreferences: {
    region: string;
    weight: number;
  }[];
  genderPreferences: {
    male: number;
    female: number;
  };
  disabilityPreferences?: {
    visual: number;
    hearing: number;
    physical: number;
    learning: number;
    none: number;
  };
  disabilityBonus: number;
}

interface StudentData {
  examScore: number;
  maxExamScore: number;
  region: string;
  gender: string;
  hasDisability: boolean;
  disabilityType?: string;
}

export function calculateWeightedScore(student: StudentData, settings: WeightingSettings): {
  weightedScore: number;
  breakdown: {
    examScoreContribution: number;
    regionContribution: number;
    genderContribution: number;
    disabilityContribution: number;
    maxPossible: number;
  };
} {
  // 1. Exam Score Contribution (normalized to percentage)
  const examScorePercentage = (student.examScore / student.maxExamScore) * 100;
  const examScoreContribution = (examScorePercentage / 100) * settings.examScoreWeight;
  
  // 2. Region Contribution
  let regionContribution = 0;
  const regionPref = settings.regionPreferences.find(r => r.region === student.region);
  if (regionPref) {
    regionContribution = (regionPref.weight / 100) * settings.regionWeight;
  }
  
  // 3. Gender Contribution
  let genderContribution = 0;
  if (student.gender === 'Male') {
    genderContribution = (settings.genderPreferences.male / 100) * settings.genderWeight;
  } else if (student.gender === 'Female') {
    genderContribution = (settings.genderPreferences.female / 100) * settings.genderWeight;
  }
  
  // 4. Disability Contribution (bonus points)
  let disabilityContribution = 0;
  if (student.hasDisability && student.disabilityType && settings.disabilityPreferences) {
    const dType = student.disabilityType.toLowerCase() as keyof typeof settings.disabilityPreferences;
    const prefPercent = settings.disabilityPreferences[dType];
    const percent = prefPercent !== undefined ? prefPercent : 100;
    disabilityContribution = (percent / 100) * settings.disabilityWeight;
  } else if (student.hasDisability) {
    disabilityContribution = settings.disabilityWeight; // Direct points (e.g., 5%)
  }
  
  const weightedScore = examScoreContribution + regionContribution + genderContribution + disabilityContribution;
  
  return {
    weightedScore,
    breakdown: {
      examScoreContribution,
      regionContribution,
      genderContribution,
      disabilityContribution,
      maxPossible: 100
    }
  };
}

// Calculate normalized exam score (0-100)
export function normalizeExamScore(score: number, maxScore: number): number {
  return (score / maxScore) * 100;
}