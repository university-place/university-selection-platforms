interface WeightingSettings {
  examScoreWeight: number;
  regionWeight: number;
  genderWeight: number;
  disabilityWeight: number;
  invitationScoreWeight?: number;
  documentScoreWeight?: number;
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
    attribute?: string; // Legacy
    key?: string;       // New
    value: any;
    operator: 'equals' | 'greater' | 'less' | 'contains' | 'value_map'; // UPDATED
    mappings?: { value: string; percent: number }[]; // ADDED
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
  invitationScore?: number | null;
  documentScore?: number | null;
}

export function calculateWeightedScore(student: StudentData, settings: WeightingSettings): {
  weightedScore: number;
  breakdown: {
    examScoreContribution: number;
    regionContribution: number;
    genderContribution: number;
    disabilityContribution: number;
    customContribution: number;
    invitationScoreContribution: number;
    documentContribution: number;
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
      const attrKey = criteria.key || criteria.attribute;
      if (!attrKey) return;

      // Check in customAttributes first, then in examResults (for new subjects), then in main student fields
      let studentValue = (student.customAttributes && student.customAttributes[attrKey]) ?? 
                         (student.examResults && student.examResults[attrKey]) ?? 
                         (student as any)[attrKey];
      
      if (studentValue !== undefined && studentValue !== null) {
        if (criteria.operator === 'value_map' && criteria.mappings) {
          const match = criteria.mappings.find(
            m => String(m.value).toLowerCase() === String(studentValue).toLowerCase()
          );
          if (match) {
            const percent = Number(match.percent) || 0;
            customContribution += (percent / 100) * criteria.weight;
          }
        } else {
          let isMatch = false;
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
          if (isMatch) {
            customContribution += criteria.weight;
          }
        }
      }
    });
  }

  // 6. Invitation Score Contribution
  let invitationScoreContribution = 0;
  if (settings.invitationScoreWeight && student.invitationScore !== undefined && student.invitationScore !== null) {
    invitationScoreContribution = (student.invitationScore / 100) * settings.invitationScoreWeight;
  }

  // 7. Document Score Contribution
  let documentContribution = 0;
  if (settings.documentScoreWeight && student.documentScore !== undefined && student.documentScore !== null) {
    documentContribution = (student.documentScore / 100) * settings.documentScoreWeight;
  }
  
  const weightedScore = examScoreContribution + regionContribution + genderContribution + disabilityContribution + customContribution + invitationScoreContribution + documentContribution;
  
  return {
    weightedScore,
    breakdown: {
      examScoreContribution,
      regionContribution,
      genderContribution,
      disabilityContribution,
      customContribution,
      invitationScoreContribution,
      documentContribution,
      maxPossible: 100
    }
  };
}

// Calculate normalized exam score (0-100)
export function normalizeExamScore(score: number, maxScore: number): number {
  return (score / maxScore) * 100;
}