// lib/types.ts
export interface StudentProfile {
  id: number;
  examID: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  region?: string;
  stream: string;
  totalScore: number;
  subjects?: { name: string; score: number }[];
  academicYear?: string;
  dateOfBirth?: string;
  pendingInvitations?: any[];
  applications?: any[];
  pendingActions?: {
    hasPendingInvitations: boolean;
    pendingInvitationCount: number;
    hasPendingConfirmation: boolean;
    acceptedApplications: number;
  };
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  student?: StudentProfile;
  message?: string;
  error?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  error?: string;
  student?: StudentProfile;
}