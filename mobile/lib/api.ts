


import { Platform } from 'react-native';

// API Client for Mobile App
// Current local Wi-Fi IPv4 is 10.46.46.141. For Web simulation, use localhost.
const DEV_HOST = '10.46.46.141';

const API_BASE_URL = Platform.select({
  android: `http://${DEV_HOST}:3000/api`,
  ios: `http://${DEV_HOST}:3000/api`,
  default: 'http://localhost:3000/api',
}) || 'http://localhost:3000/api';

// Safe JSON parser: avoids "Unexpected token '<'" when server returns HTML error pages
async function safeJsonParse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(
      `Server returned non-JSON response (HTTP ${response.status}). ` +
      `This usually means the backend API server is down or the database is not connected. ` +
      `Preview: ${text.substring(0, 120)}`
    );
  }
  return response.json();
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  student?: T;
  [key: string]: any;
}

export const apiClient = {
  // Auth endpoints
  async login(examID: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ examID, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      return {
        success: true,
        token: data.token,
        student: data.student,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network error',
      };
    }
  },

  async changePasswordDirect(examId: string, currentPassword: string, newPassword: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/change-password-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ examId, currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to change password');
      }

      return {
        success: true,
        message: data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network error',
      };
    }
  },

  async register(formData: {
    examID: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    password: string;
    confirmPassword: string;
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      return {
        success: true,
        message: data.message,
        student: data.student,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network error',
      };
    }
  },

  // Student profile endpoints
  async getProfile(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile');
      }

      return {
        success: true,
        data: data.profile,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network error',
      };
    }
  },

  // Get dashboard data (applications, invitations, stats)
  async getDashboardData(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dashboard data');
      }

      return {
        success: true,
        data: data.profile,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network error',
      };
    }
  },

  // Get universities list
  async getUniversities(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/universities`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to fetch universities');
      }

      // API returns: { success: true, universities: [...] }
      // Normalize to { success: true, data: { universities: [...] } }
      return {
        success: true,
        data: {
          universities: data.universities || data.data?.universities || [],
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network error',
        data: { universities: [] },
      };
    }
  },

  // Get full university profile by ID (matches web /university/[id] page)
  async getUniversityById(token: string, universityId: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/universities/${universityId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await safeJsonParse(response);
      if (!response.ok) {
        throw new Error(data.error || 'University not found');
      }
      return { success: true, university: data };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error', university: null };
    }
  },

  // Get programs for a university (matches web /api/universities/[id]/programs)
  async getUniversityPrograms(token: string, universityId: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/universities/${universityId}/programs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await safeJsonParse(response);
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch programs');
      }
      return { success: true, programs: data.programs || [] };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error', programs: [] };
    }
  },

  // Placements endpoints
  async getMyPlacements(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/my-placements`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch placements');
      return { success: true, placements: data.placements };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  async confirmPlacement(token: string, preferenceId: number, action: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/confirm-placement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferenceId, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to confirm placement');
      return { success: true, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  async respondToInvitation(token: string, invitationId: number, responseStr: 'ACCEPTED' | 'DECLINED', reason?: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invitationId, response: responseStr, reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to respond to invitation');
      return { success: true, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  // Applications/Preferences endpoints
  async updatePreference(token: string, preferenceId: number, programId?: number | null, admissionTrackId?: number | null) {
    try {
      const body: any = { preferenceId };
      if (programId !== undefined) body.programId = programId === 0 ? null : programId;
      if (admissionTrackId !== undefined) body.admissionTrackId = admissionTrackId === 0 ? null : admissionTrackId;

      const response = await fetch(`${API_BASE_URL}/students/applications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update preference');
      return { success: true, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  async deletePreference(token: string, preferenceId: number, reason: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/applications?preferenceId=${preferenceId}&reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete preference');
      return { success: true, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  async submitPreference(token: string, preferenceId: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'submit', preferenceId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Failed to submit preference');
      return { success: true, message: data.message || `Application submitted successfully` };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  async getApplications(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/applications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch applications');
      return { success: true, applications: data.applications, submissionInfo: data.submissionInfo };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  async getPrograms(token: string, universityId: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/universities/${universityId}/programs`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch programs');
      return { success: true, programs: data.programs };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  async getTracks(token: string, programId: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/programs/${programId}/tracks`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch tracks');
      return { success: true, tracks: data.tracks };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  // Invitations endpoints
  async getInvitations(token: string, status?: string) {
    try {
      let url = `${API_BASE_URL}/students/interviews`;
      if (status) url += `?status=${status}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch invitations');
      return { success: true, invitations: data.invitations || [] };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error', invitations: [] };
    }
  },



  // Add new preference
  async addPreference(token: string, universityId: number, programId?: number | null, admissionTrackId?: number | null) {
    try {
      const body: any = {
        applications: [{
          universityId,
          programId: programId || null,
          admissionTrackId: admissionTrackId || null
        }]
      };

      const response = await fetch(`${API_BASE_URL}/students/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add preference');
      return { success: true, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  async uploadDocument(
    token: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    docType: string,
    scope: 'general' | 'university',
    universityId?: number,
    webFile?: any
  ) {
    try {
      const formData = new FormData();
      if (webFile) {
        formData.append('file', webFile);
      } else {
        formData.append('file', {
          uri: fileUri,
          name: fileName,
          type: mimeType,
        } as any);
      }
      formData.append('type', docType);
      formData.append('scope', scope);
      if (universityId) {
        formData.append('universityId', String(universityId));
      }

      const response = await fetch(`${API_BASE_URL}/students/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Let fetch set the multipart/form-data boundary automatically
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload document');
      return { success: true, message: data.message, document: data.document };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  async changePassword(token: string, currentPassword: string, newPassword: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Failed to change password');
      return { success: true, message: data.message || 'Password changed successfully' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },

  // Appeals endpoints
  async getAppeals(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/appeals`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch appeals');
      return { success: true, data: data.data || [] };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error', data: [] };
    }
  },

  async submitAppeal(token: string, appealData: { type: string, description: string, target: string, preferenceId?: string, universityId?: string }) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/appeals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(appealData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit appeal');
      return { success: true, message: data.message || 'Appeal submitted successfully', data: data.data };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  },
};
