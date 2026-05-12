// lib/api.ts
export const API_BASE = '/api';

const TOKEN_KEY = 'token';

export const authHelpers = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      console.log('Token saved to localStorage');
    }
  },
  
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },
  
  removeToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('studentData');
      sessionStorage.clear();
      console.log('Token removed from localStorage');
    }
  },
  
  isAuthenticated: () => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem(TOKEN_KEY);
    }
    return false;
  },
  
  clearToken: () => {
    authHelpers.removeToken();
  },
  
  logout: () => {
    authHelpers.removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/student/login';
    }
  },
  
  getAuthHeaders: () => {
    const token = authHelpers.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  },
};

// ============================================
// STUDENT AUTH API
// ============================================
export const authAPI = {
  // Student Login
  studentLogin: async (examId: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/students/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examID: examId, password }),
      });
      const data = await res.json();
      
      if (data.success && data.token) {
        authHelpers.setToken(data.token);
        if (data.student) {
          localStorage.setItem('studentData', JSON.stringify(data.student));
        }
      }
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  },
  
  // ✅ Student Register - ADD THIS
  studentRegister: async (data: {
    examID: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    password: string;
    confirmPassword: string;
  }) => {
    try {
      const res = await fetch(`${API_BASE}/students/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Platform Admin Login
  platformLogin: async (username: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/platform/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Platform login error:', error);
      return { success: false, error: 'Network error' };
    }
  },

  // Platform Admin Register
  platformRegister: async (data: {
    username: string;
    name?: string;
    password: string;
    confirmPassword: string;
  }) => {
    try {
      const res = await fetch(`${API_BASE}/platform/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (error) {
      console.error('Platform register error:', error);
      return { success: false, error: 'Network error' };
    }
  },

  // Student Logout
  logout: () => {
    authHelpers.logout();
  },
};

// ============================================
// STUDENT API (Dashboard)
// ============================================
export const studentAPI = {
  getProfile: async () => {
    const token = authHelpers.getToken();
    if (!token) {
      return { success: false, error: 'No token found' };
    }
    
    try {
      const res = await fetch(`${API_BASE}/students/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, error: 'Network error' };
    }
  },
  
  getApplications: async () => {
    const token = authHelpers.getToken();
    console.log('🔑 getApplications - Token exists:', !!token);
    
    if (!token) {
      return { 
        success: false, 
        error: 'No token found', 
        applications: [], 
        submissionInfo: { attemptsUsed: 0, maxAttempts: 3, attemptsLeft: 3, lastSubmittedAt: null } 
      };
    }
    
    try {
      const res = await fetch(`${API_BASE}/students/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('🔑 API Response status:', res.status);
      const data = await res.json();
      console.log('🔑 API Response data:', data);
      return data;
    } catch (error) {
      console.error('Get applications error:', error);
      return { 
        success: false, 
        error: 'Network error', 
        applications: [], 
        submissionInfo: { attemptsUsed: 0, maxAttempts: 3, attemptsLeft: 3, lastSubmittedAt: null } 
      };
    }
  },
  
  getInvitations: async () => {
    const token = authHelpers.getToken();
    if (!token) {
      return { success: false, error: 'No token found', invitations: [] };
    }
    
    try {
      const res = await fetch(`${API_BASE}/students/invitations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error', invitations: [] };
    }
  },
  
  getDocuments: async () => {
    const token = authHelpers.getToken();
    if (!token) {
      return { success: false, error: 'No token found', documents: [] };
    }
    
    try {
      const res = await fetch(`${API_BASE}/students/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error', documents: [] };
    }
  },
  
  getPlacement: async () => {
    const token = authHelpers.getToken();
    if (!token) {
      return { success: false, error: 'No token found', placement: null };
    }
    
    try {
      const res = await fetch(`${API_BASE}/students/placement`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error', placement: null };
    }
  },
  
  getAppeals: async () => {
    const token = authHelpers.getToken();
    if (!token) {
      return { success: false, error: 'No token found', appeals: [] };
    }
    
    try {
      const res = await fetch(`${API_BASE}/students/appeals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error', appeals: [] };
    }
  },
  
  submitPreference: async (preferenceId: number) => {
    const token = authHelpers.getToken();
    if (!token) {
      return { success: false, error: 'No token found' };
    }
    
    try {
      const res = await fetch(`${API_BASE}/students/applications/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ preferenceId }),
      });
      return await res.json();
    } catch (error) {
      console.error('Submit preference error:', error);
      return { success: false, error: 'Network error' };
    }
  },
  
  submitSinglePreference: async (preferenceId: number) => {
    const token = authHelpers.getToken();
    if (!token) {
      return { success: false, error: 'No token found' };
    }
    
    try {
      const res = await fetch(`${API_BASE}/students/applications`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ preferenceId }),
      });
      return await res.json();
    } catch (error) {
      console.error('Submit single preference error:', error);
      return { success: false, error: 'Network error' };
    }
  },
  
  submitAllPreferences: async () => {
    const token = authHelpers.getToken();
    if (!token) {
      return { success: false, error: 'No token found' };
    }
    
    try {
      const res = await fetch(`${API_BASE}/students/applications`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
      });
      return await res.json();
    } catch (error) {
      console.error('Submit all error:', error);
      return { success: false, error: 'Network error' };
    }
  },
  
  addPreference: async (universityId: number, programId?: number, admissionTrackId?: number) => {
    const token = authHelpers.getToken();
    if (!token) {
      return { success: false, error: 'No token found' };
    }
    
    try {
      const res = await fetch(`${API_BASE}/students/applications`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          applications: [{ 
            universityId, 
            programId: programId || null, 
            admissionTrackId: admissionTrackId || null 
          }] 
        }),
      });
      return await res.json();
    } catch (error) {
      console.error('Add preference error:', error);
      return { success: false, error: 'Network error' };
    }
  },
  
  updatePreference: async (preferenceId: number, rank?: number, programId?: number, admissionTrackId?: number) => {
    const token = authHelpers.getToken();
    if (!token) {
      return { success: false, error: 'No token found' };
    }
    
    try {
      const body: any = { preferenceId };
      if (rank !== undefined) body.rank = rank;
      if (programId !== undefined) body.programId = programId;
      if (admissionTrackId !== undefined) body.admissionTrackId = admissionTrackId;
      
      const res = await fetch(`${API_BASE}/students/applications`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (error) {
      console.error('Update preference error:', error);
      return { success: false, error: 'Network error' };
    }
  },
  
  deletePreference: async (preferenceId: number) => {
    const token = authHelpers.getToken();
    if (!token) {
      return { success: false, error: 'No token found' };
    }
    
    try {
      const res = await fetch(`${API_BASE}/students/applications?preferenceId=${preferenceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      console.error('Delete preference error:', error);
      return { success: false, error: 'Network error' };
    }
  },
};

// ============================================
// UNIVERSITY API (For University Dashboard)
// ============================================
export const universityAPI = {
  getProfile: async () => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/universities/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  getStats: async () => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/universities/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  getApplicants: async (params?: { programId?: number; page?: number; limit?: number }) => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    let url = `${API_BASE}/universities/applicants`;
    const query = new URLSearchParams();
    if (params?.programId) query.append('programId', params.programId.toString());
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (query.toString()) url += `?${query.toString()}`;
    
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  getApplicantDetails: async (studentId: number) => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/universities/applicants/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  getApplications: async () => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/universities/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  updateApplicationStatus: async (applicationId: number, status: string, remarks?: string) => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/universities/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, remarks }),
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  getInvitations: async () => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/universities/invitations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  sendInvitation: async (data: any) => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/universities/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  getPlacements: async () => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/universities/placements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  updatePlacementStatus: async (placementId: number, status: string, remarks?: string) => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/universities/placements`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ placementId, status, remarks }),
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
};

// ============================================
// PUBLIC UNIVERSITIES API (No auth required)
// ============================================
export const universitiesAPI = {
  getAll: async (params?: { type?: string; region?: string }) => {
    try {
      let url = `${API_BASE}/universities`;
      const query = new URLSearchParams();
      if (params?.type) query.append('type', params.type);
      if (params?.region) query.append('region', params.region);
      if (query.toString()) url += `?${query.toString()}`;
      
      const res = await fetch(url);
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  getById: async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/universities/${id}`);
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
};

// ============================================
// ADMIN API (For Platform Admin)
// ============================================
export const platformAPI = {
  getStats: async () => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  getUniversities: async () => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/admin/universities/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  getStudents: async (page = 1, limit = 50, search = '', stream = '') => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      let url = `${API_BASE}/admin/students?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (stream) url += `&stream=${encodeURIComponent(stream)}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },

  getUsers: async (role?: string) => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      let url = `${API_BASE}/admin/users`;
      if (role) url += `?role=${role}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },

  toggleUser: async (userId: string, activate: boolean) => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/toggle`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ active: activate }),
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },

  deleteUser: async (userId: string) => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },

  toggleStudent: async (studentId: string, activate: boolean) => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/admin/students/${studentId}/toggle`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ isActive: activate }),
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },

  deleteStudent: async (studentId: string) => {
    const token = authHelpers.getToken();
    if (!token) return { success: false, error: 'No token found' };
    
    try {
      const res = await fetch(`${API_BASE}/admin/students/${studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
};

// ============================================
// HELPER FUNCTION to check auth status
// ============================================
export const checkAuth = () => {
  const token = authHelpers.getToken();
  if (!token) return false;
  return true;
};

// ============================================
// MOE AUTH HELPERS (separate token key)
// ============================================
const MOE_TOKEN_KEY = 'moe_token';

export const moeAuthHelpers = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MOE_TOKEN_KEY, token);
    }
  },

  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MOE_TOKEN_KEY);
    }
    return null;
  },

  removeToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MOE_TOKEN_KEY);
      localStorage.removeItem('moe_user');
    }
  },

  isAuthenticated: () => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem(MOE_TOKEN_KEY);
    }
    return false;
  },

  clearToken: () => {
    moeAuthHelpers.removeToken();
  },
};
// ============================================
// MOE API (Ministry of Education)
// ============================================
const getMoeAuthHeader = () => {
  const token = moeAuthHelpers.getToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

export const moeAPI = {
  // ── Auth ────────────────────────────────────────────────────────
  moeLogin: async (email: string, password: string) => {
    try {
      const response = await fetch('/api/moe/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error || `Login failed (${response.status})` };
      return data;
    } catch (error: any) {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  },

  // ── Students ────────────────────────────────────────────────────
  getStudents: async (page = 1, limit = 50, search = '', stream = '', placementStatus = '') => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (stream) params.set('stream', stream === 'Natural Science' ? 'natural' : 'social');
      if (placementStatus) params.set('placementStatus', placementStatus);
      const res = await fetch(`/api/admin/students?${params}`, { headers: getMoeAuthHeader() });
      const data = await res.json();
      if (data.success) {
        return { success: true, data: data.students, total: data.pagination?.total || 0 };
      }
      return { success: false, error: data.error || 'Failed to load students', data: [] };
    } catch {
      return { success: false, error: 'Network error', data: [] };
    }
  },

  // ── Universities ────────────────────────────────────────────────
  getUniversities: async (page = 1, limit = 50, search = '') => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/universities/list?${params}`, { headers: getMoeAuthHeader() });
      const data = await res.json();
      if (data.success) {
        return { success: true, data: data.data, total: data.total || 0 };
      }
      return { success: false, error: data.error || 'Failed to load universities', data: [] };
    } catch {
      return { success: false, error: 'Network error', data: [] };
    }
  },

  addUniversity: async (formData: Record<string, string>) => {
    try {
      const res = await fetch('/api/admin/universities/list', {
        method: 'POST',
        headers: getMoeAuthHeader(),
        body: JSON.stringify(formData),
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  },

  updateUniversity: async (id: string | number, formData: Record<string, string>) => {
    try {
      const res = await fetch(`/api/admin/universities/${id}`, {
        method: 'PATCH',
        headers: getMoeAuthHeader(),
        body: JSON.stringify(formData),
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  },

  deleteUniversity: async (id: string | number) => {
    try {
      const res = await fetch(`/api/admin/universities/${id}`, {
        method: 'DELETE',
        headers: getMoeAuthHeader(),
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  },

  toggleUniversity: async (id: string | number, activate: boolean) => {
    try {
      const res = await fetch(`/api/admin/universities/${id}`, {
        method: 'PATCH',
        headers: getMoeAuthHeader(),
        body: JSON.stringify({ isActive: !activate }), // toggles: if currently active, deactivate
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  },
};

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
  authAPI,
  studentAPI,
  universityAPI,
  universitiesAPI,
  platformAPI,
  moeAPI,
  authHelpers,
  checkAuth,
};
