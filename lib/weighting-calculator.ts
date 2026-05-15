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
  customCriteria?: {
    attribute: string;
    value: any;
    operator: 'equals' | 'greater' | 'less' | 'contains';
    weight: number;
  }[];
}

interface StudentData {
  examScore: number;
  maxExamScore: number;
  region: string;
  gender: string;
  hasDisability: boolean;
  disabilityType?: string;
  customAttributes?: Record<string, any>;
  examResults?: Record<string, number>;
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
  
  // 5. Custom Criteria Contribution
  let customContribution = 0;
  if (settings.customCriteria && settings.customCriteria.length > 0) {
    settings.customCriteria.forEach(criteria => {
      // Check in customAttributes first, then in examResults (for new subjects), then in main student fields
      let studentValue = (student.customAttributes && student.customAttributes[criteria.attribute]) ?? 
                         (student.examResults && student.examResults[criteria.attribute]) ?? 
                         (student as any)[criteria.attribute];
      
      let isMatch = false;
      if (studentValue !== undefined && studentValue !== null) {
        switch (criteria.operator) {
          case 'equals':
            isMatch = String(studentValue).toLowerCase() === String(criteria.value).toLowerCase();
            break;
          case 'greater':
            isMatch = Number(studentValue) > Number(criteria.value);
            break;
          case 'less':
            isMatch = Number(studentValue) < Number(criteria.value);
            break;
          case 'contains':
            isMatch = String(studentValue).toLowerCase().includes(String(criteria.value).toLowerCase());
            break;
        }
      }
      
      if (isMatch) {
        customContribution += criteria.weight;
      }
    });
  }
  
  const weightedScore = examScoreContribution + regionContribution + genderContribution + disabilityContribution + customContribution;
  
  return {
    weightedScore,
    breakdown: {
      examScoreContribution,
      regionContribution,
      genderContribution,
      disabilityContribution,
      customContribution, // ADDED
      maxPossible: 100
    }
  };
}

// Calculate normalized exam score (0-100)
export function normalizeExamScore(score: number, maxScore: number): number {
  return (score / maxScore) * 100;
}