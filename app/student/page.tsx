'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, FileText, Mail, LogOut, LayoutDashboard, ClipboardList, Inbox,
  Search, ChevronDown, ChevronUp, Upload, Trash2, Edit2, Save, X,
  CheckCircle, XCircle, Clock, AlertCircle, Plus, Minus, ArrowUp, ArrowDown,
  Compare, University, BookOpen, Bell, Settings, Shield, Award, FileCheck,
  MessageCircle, Heart, Loader2, Eye
} from 'lucide-react';
import { studentAPI, authHelpers } from '@/lib/api'; 

// ------------------------------
// Types
// ------------------------------
interface StudentProfile {
  id: number;
  examID: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  region: string;
  dateOfBirth: string;
  age: number | null;
  gender: string;
  disability: string;
  photo?: string;
  academicYear: string;
  stream: string;
  totalScore: number;
  examResults: Record<string, number>;
  submissionAttemptsUsed: number;
  maxSubmissionAttempts: number;
  isRegistered: boolean;
  emailVerified: boolean;
}

interface Document {
  id: number;
  name: string;
  type: string;
  fileUrl: string;
  uploadDate: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

interface AdmissionTrack {
  id: number;
  name: string;
  type: 'non-autonomous' | 'autonomous' | 'scholarship';
  description: string;
  eligibilityCriteria: string;
  capacity: number;
  isEligible: boolean;
}

interface University {
  id: number;
  name: string;
  code: string;
  type: string;
  region: string;
  description: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
}

interface Preference {
  id: number;
  rank: number;
  universityId: number;
  universityName: string;
  programId: number;
  programName: string;
  admissionTrackId: number;
  admissionTrackName: string;
  status: string;
  submittedAt?: string;
  submissionCount?: number;
  remainingAttempts?: number;
  universityDeadline?: string;
  isDeadlinePassed?: boolean;
}

interface PlacementResult {
  id: number;
  universityId: number;
  universityName: string;
  programId: number;
  programName: string;
  status: 'PLACED' | 'NOT_PLACED' | 'PENDING';
  decisionDate: string;
  confirmationDeadline: string;
  confirmedAt?: string;
}

interface Appeal {
  id: number;
  type: string;
  description: string;
  status: 'pending' | 'resolved' | 'rejected';
  target?: string;
  resolvedBy?: string;
  resolution?: string;
  createdAt: string;
  university?: { name: string };
  preference?: {
    university: { name: string };
    program: { name: string };
  };
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  read: boolean;
  createdAt: string;
}

// ------------------------------
// Helper Functions
// ------------------------------
function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ------------------------------
// Main Component
// ------------------------------
export default function StudentDashboardPage() {
  const [submissionInfo, setSubmissionInfo] = useState({
  attemptsUsed: 0,
  maxAttempts: 3,
  attemptsLeft: 3,
  lastSubmittedAt: null as string | null
});
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
const [submittingPref, setSubmittingPref] = useState<number | null>(null);
  // Data states
  
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [admissionTracks, setAdmissionTracks] = useState<AdmissionTrack[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [compareList, setCompareList] = useState<University[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [placement, setPlacement] = useState<PlacementResult | null>(null);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [submissionAttemptsLeft, setSubmissionAttemptsLeft] = useState(3);
  const [showFinalSubmitConfirm, setShowFinalSubmitConfirm] = useState(false);

  // UI states
  const [uploading, setUploading] = useState(false);
  const [newPreference, setNewPreference] = useState({ universityId: 0, programId: 0, admissionTrackId: 0 });
  const [availablePrograms, setAvailablePrograms] = useState<{ id: number; name: string }[]>([]);
  const [availableTracks, setAvailableTracks] = useState<{ id: number; name: string }[]>([]);
  const [editingPreferenceId, setEditingPreferenceId] = useState<number | null>(null);
  const [appealForm, setAppealForm] = useState({ type: 'placement', description: '', preferenceId: '', target: 'MOE', universityId: '' });
  const [appealSubTab, setAppealSubTab] = useState<'MOE' | 'UNIVERSITY'>('MOE');
  const [showAppealModal, setShowAppealModal] = useState(false);

  // Fetch all data on load
  useEffect(() => {
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/student/login');
      return;
    }
    fetchDashboardData();
  }, []);
// Fetch programs when university is selected
useEffect(() => {
  console.log('University changed to:', newPreference.universityId);
  if (newPreference.universityId && newPreference.universityId !== 0) {
    fetchUniversityPrograms(newPreference.universityId);
  } else {
    setAvailablePrograms([]);
    setAvailableTracks([]);
  }
}, [newPreference.universityId]);


  // ✅ ADD THIS - Fetch tracks when program is selected
  useEffect(() => {
  console.log('Program changed to:', newPreference.programId);
  if (newPreference.programId && newPreference.programId !== 0) {
    fetchTracksForProgram(newPreference.programId);
  } else {
    setAvailableTracks([]);
  }
}, [newPreference.programId]);
  // Replace your fetchDashboardData function with this:
async function fetchDashboardData() {
  setLoading(true);
  try {
    const profileResult = await studentAPI.getProfile();
    if (profileResult.success && profileResult.profile) {
      setProfile(profileResult.profile);
    }

    const appsResult = await studentAPI.getApplications();
    if (appsResult.success) {
      // Use 'applications' (latest per university) for display
      setPreferences(appsResult.applications || []);
      
      // Store 'allSubmissions' separately if you want a history page
      if (appsResult.allSubmissions) {
        localStorage.setItem('submissionHistory', JSON.stringify(appsResult.allSubmissions));
      }
      
      if (appsResult.submissionInfo) {
        setSubmissionInfo(appsResult.submissionInfo);
        setSubmissionAttemptsLeft(appsResult.submissionInfo.attemptsLeft);
      }
    }

    const token = authHelpers.getToken();
    const uniRes = await fetch('/api/universities', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const uniData = await uniRes.json();
    if (uniData.success) {
      setUniversities(uniData.universities);
    }

    // Fetch live appeals and resolutions
    try {
      const appealsRes = await fetch('/api/students/appeals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const appealsData = await appealsRes.json();
      if (appealsData.success) {
        setAppeals(appealsData.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch appeals:', e);
    }

  } catch (err) {
    console.error('Error fetching data:', err);
    setError('Failed to load dashboard data');
  } finally {
    setLoading(false);
  }
}
// ==================== ADD THESE MISSING FUNCTIONS ====================

async function fetchUniversityPrograms(universityId: number) {
  const token = authHelpers.getToken();
  try {
    const res = await fetch(`/api/students/universities/${universityId}/programs`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.programs) {
      setAvailablePrograms(data.programs);
    } else {
      setAvailablePrograms([]);
    }
  } catch (err) {
    console.error('Error fetching programs:', err);
    setAvailablePrograms([]);
  }
}

async function fetchTracksForProgram(programId: number) {
  const token = authHelpers.getToken();
  try {
    const res = await fetch(`/api/students/programs/${programId}/tracks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.tracks) {
      setAvailableTracks(data.tracks);
    } else {
      setAvailableTracks([]);
    }
  } catch (err) {
    console.error('Error fetching tracks:', err);
    setAvailableTracks([]);
  }
}

async function handleDocumentUpload(file: File, type: string) {
  const token = authHelpers.getToken();
  if (!token) return;
  setUploading(true);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  try {
    const res = await fetch('/api/students/documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      setDocuments(prev => [...prev, data.document]);
      alert('Document uploaded successfully!');
    } else {
      alert(data.error || 'Upload failed');
    }
  } catch (err) {
    console.error('Upload error:', err);
    alert('Upload failed. Please try again.');
  } finally {
    setUploading(false);
  }
}
// Update submitPreference function:
// Remove this duplicate submitPreference


// Remove this duplicate submitFinalPreferences

// Update submitFinalPreferences function:
// Keep this version of submitPreference


// Submit a single preference to a university
async function submitPreference(preferenceId: number, universityName: string) {
  if (!confirm(`Submit your application to ${universityName}?`)) return;
  
  setSubmittingPref(preferenceId);
  const token = authHelpers.getToken();
  
  if (!token) {
    alert('Please login again');
    setSubmittingPref(null);
    return;
  }
  
  try {
    const res = await fetch('/api/students/applications/submit', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ preferenceId })
    });
    
    const data = await res.json();
    
    if (data.success) {
      alert(`✅ Application to ${universityName} submitted successfully!\nRemaining attempts: ${data.remainingAttempts}`);
      await fetchDashboardData();
    } else {
      alert(data.error || 'Submission failed');
    }
  } catch (err) {
    console.error('Submit error:', err);
    alert('Network error. Please try again.');
  } finally {
    setSubmittingPref(null);
  }
}
  // Preference management
  // After adding/updating preference, refresh the list
async function addPreference() {
  const { universityId, programId, admissionTrackId } = newPreference;
  
  if (!universityId) {
    alert('Please select a university');
    return;
  }
  
  const token = authHelpers.getToken();
  if (!token) {
    alert('Please login again');
    router.push('/student/login');
    return;
  }
  
  try {
    // First, check if a preference for this university already exists
    const existingPreference = preferences.find(p => p.universityId === universityId);
    
    if (existingPreference) {
      // UPDATE existing preference instead of creating new one
      console.log('Updating existing preference:', existingPreference.id);
      
      const response = await fetch('/api/students/applications', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          preferenceId: existingPreference.id,
          programId: programId || null,
          admissionTrackId: admissionTrackId || null
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        await fetchDashboardData();
        setNewPreference({ universityId: 0, programId: 0, admissionTrackId: 0 });
        setAvailablePrograms([]);
        setAvailableTracks([]);
        alert('Preference updated successfully!');
      } else {
        alert(data.error || 'Failed to update preference');
      }
    } else {
      // CREATE new preference
      console.log('Creating new preference for university:', universityId);
      
      const response = await fetch('/api/students/applications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          applications: [{ 
            universityId: Number(universityId), 
            programId: programId ? Number(programId) : null, 
            admissionTrackId: admissionTrackId ? Number(admissionTrackId) : null 
          }] 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        await fetchDashboardData();
        setNewPreference({ universityId: 0, programId: 0, admissionTrackId: 0 });
        setAvailablePrograms([]);
        setAvailableTracks([]);
        alert('Preference added successfully!');
      } else {
        alert(data.error || 'Failed to add preference');
      }
    }
  } catch (err) {
    console.error('Add/Update preference error:', err);
    alert(`Error: ${err.message}`);
  }
}
  async function updatePreference(prefId: number, newRank?: number, newProgramId?: number, newAdmissionTrackId?: number) {
  const token = authHelpers.getToken();
  if (!token) {
    alert('Please login again');
    return;
  }
  
  const body: any = { preferenceId: prefId };
  if (newRank !== undefined) body.rank = newRank;
  if (newProgramId !== undefined) body.programId = newProgramId;
  if (newAdmissionTrackId !== undefined) body.admissionTrackId = newAdmissionTrackId;
  
  try {
    const res = await fetch('/api/students/applications', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    if (data.success) {
      await fetchDashboardData();
      alert('Preference updated successfully!');
      return true;
    } else {
      alert(data.error || 'Update failed');
      return false;
    }
  } catch (err) {
    console.error('Update error:', err);
    alert('Network error. Please try again.');
    return false;
  }
} 
// Edit preference - allows updating program/track
async function editPreference(prefId: number, currentProgramId: number, currentTrackId: number) {
  // You can show a modal or inline form to edit
  const newProgramId = prompt('Enter new Program ID:', currentProgramId.toString());
  if (newProgramId) {
    await updatePreference(prefId, undefined, parseInt(newProgramId), undefined);
  }
}
// Add this function to handle edit and resubmit
async function editAndResubmit(preferenceId: number, universityName: string, currentProgramId: number, currentTrackId: number) {
  // Show modal or prompt for new values
  const newProgramId = prompt('Enter new Program ID (or leave empty to keep current):', currentProgramId?.toString() || '');
  const newTrackId = prompt('Enter new Admission Track ID (or leave empty to keep current):', currentTrackId?.toString() || '');
  
  const token = authHelpers.getToken();
  if (!token) {
    alert('Please login again');
    return;
  }
  
  setSubmittingPref(preferenceId);
  
  try {
    // First update the preference
    const updateBody: any = { preferenceId };
    if (newProgramId && newProgramId !== '') {
      updateBody.programId = parseInt(newProgramId);
    }
    if (newTrackId && newTrackId !== '') {
      updateBody.admissionTrackId = parseInt(newTrackId);
    }
    
    // If there are updates, send them
    if (updateBody.programId !== undefined || updateBody.admissionTrackId !== undefined) {
      const updateRes = await fetch('/api/students/applications', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateBody),
      });
      
      if (!updateRes.ok) {
        throw new Error('Failed to update preference');
      }
    }
    
    // Then submit
    const submitRes = await fetch('/api/students/applications/submit', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ preferenceId })
    });
    
    const data = await submitRes.json();
    
    if (data.success) {
      alert(`✅ Successfully submitted to ${universityName}!\nRemaining attempts: ${data.remainingAttempts}`);
      await fetchDashboardData();
    } else {
      alert(data.error || 'Submission failed');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Network error. Please try again.');
  } finally {
    setSubmittingPref(null);
  }
}
  async function deletePreference(prefId: number) {
  if (!confirm('Are you sure you want to remove this preference?')) return;
  
  const token = authHelpers.getToken();
  if (!token) {
    alert('Please login again');
    return;
  }
  
  try {
    const res = await fetch(`/api/students/applications?preferenceId=${prefId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    if (data.success) {
      await fetchDashboardData();
      alert('Preference removed successfully!');
    } else {
      alert(data.error || 'Delete failed');
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert('Network error. Please try again.');
  }
}
 async function submitFinalPreferences() {
  const token = authHelpers.getToken();
  if (!token) {
    alert('Please login again');
    return;
  }
  
  try {
    const res = await fetch('/api/students/applications', {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await res.json();
    
    if (data.success) {
      alert(`✅ ${data.message}`);
      await fetchDashboardData(); // Refresh the dashboard
      setShowFinalSubmitConfirm(false);
    } else {
      alert(data.error || 'Submission failed');
    }
  } catch (err) {
    console.error('Submit error:', err);
    alert('Network error. Please try again.');
  }
}

  async function submitAppeal() {
    if (!appealForm.description || !appealForm.type) return;
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/students/appeals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          type: appealForm.type,
          description: appealForm.description,
          preferenceId: appealForm.preferenceId || null,
          target: appealForm.target,
          universityId: appealForm.target === 'UNIVERSITY' ? parseInt(appealForm.universityId) : null
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAppealModal(false);
        setAppealForm({ type: 'placement', description: '', preferenceId: '', target: 'MOE', universityId: '' });
        alert('Appeal submitted successfully.');
        
        // Refresh appeals
        const appealsRes = await fetch('/api/students/appeals', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const appealsData = await appealsRes.json();
        if (appealsData.success) setAppeals(appealsData.data);
      } else {
        alert(data.error || 'Failed to submit appeal');
      }
    } catch (err) {
      alert('Network error');
    }
  }

  // Render different sections
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-12 h-12 text-blue-600" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center">No profile data</div>;

  // Sidebar navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile & Documents', icon: User },
    { id: 'exam-results', label: 'Exam Results', icon: FileText },
    { id: 'admission-tracks', label: 'Admission Tracks', icon: Award },
    { id: 'universities', label: 'Universities', icon: University },
    { id: 'preferences', label: 'My Preferences', icon: ClipboardList },
    { id: 'placement', label: 'Placement & Appeal', icon: FileCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white shadow-lg fixed h-full overflow-y-auto z-10">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            {profile.photo ? (
              <img src={profile.photo} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {profile.firstName[0]}{profile.lastName[0]}
              </div>
            )}
            <div>
              <h2 className="font-semibold">{profile.firstName} {profile.lastName}</h2>
              <p className="text-sm text-gray-500">{profile.examID}</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => { authHelpers.removeToken(); router.push('/student/login'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 mt-8"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-72 flex-1 p-8">
        {/* Dashboard Home */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-gray-600 mt-1">{profile.firstName} {profile.lastName} • Exam ID: {profile.examID}</p>
            </div>

            {/* Application Journey Timeline */}
            <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
              <h2 className="text-lg font-bold mb-6">Your Application Journey</h2>
              <div className="flex items-center justify-between relative">
                {/* Step 1: Profile Complete */}
                <div className="flex flex-col items-center w-1/4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${profile.isRegistered ? 'bg-green-500' : 'bg-blue-500'}`}>
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="text-center text-sm font-semibold mt-2">Profile</p>
                  <p className="text-xs text-gray-500 text-center mt-1">Complete</p>
                </div>

                {/* Step 2: Documents */}
                <div className="flex flex-col items-center w-1/4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${documents.length > 0 && documents.every(d => d.verificationStatus === 'VERIFIED') ? 'bg-green-500' : documents.length > 0 ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-center text-sm font-semibold mt-2">Documents</p>
                  <p className="text-xs text-gray-500 text-center mt-1">{documents.filter(d => d.verificationStatus === 'VERIFIED').length}/{documents.length}</p>
                </div>

                {/* Step 3: Preferences */}
                <div className="flex flex-col items-center w-1/4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${preferences.length >= 3 ? 'bg-green-500' : preferences.length > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <p className="text-center text-sm font-semibold mt-2">Preferences</p>
                  <p className="text-xs text-gray-500 text-center mt-1">{preferences.length} added</p>
                </div>

                {/* Step 4: Results */}
                <div className="flex flex-col items-center w-1/4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${placement && placement.status === 'PLACED' ? 'bg-green-500' : placement ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <Award className="w-6 h-6" />
                  </div>
                  <p className="text-center text-sm font-semibold mt-2">Placement</p>
                  <p className="text-xs text-gray-500 text-center mt-1">{placement ? placement.status : 'Pending'}</p>
                </div>

                {/* Connecting Line */}
                <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 -z-10"></div>
              </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <Award className="w-8 h-8 text-blue-600 mb-2" />
                <p className="text-gray-600 text-sm">Exam Score</p>
                <p className="text-3xl font-bold text-blue-700">{profile.totalScore}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <ClipboardList className="w-8 h-8 text-green-600 mb-2" />
                <p className="text-gray-600 text-sm">Preferences</p>
                <p className="text-3xl font-bold text-green-700">{preferences.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <FileCheck className="w-8 h-8 text-purple-600 mb-2" />
                <p className="text-gray-600 text-sm">Documents</p>
                <p className="text-3xl font-bold text-purple-700">{documents.length}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                <Bell className="w-8 h-8 text-orange-600 mb-2" />
                <p className="text-gray-600 text-sm">Unread</p>
                <p className="text-3xl font-bold text-orange-700">{notifications.filter(n => !n.read).length}</p>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Document Status */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">Document Status</h2>
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No documents uploaded yet</p>
                    <button onClick={() => setActiveTab('profile')} className="mt-3 text-blue-600 hover:underline text-sm font-semibold">Upload Documents →</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm">{doc.name}</p>
                            <p className="text-xs text-gray-500">{new Date(doc.uploadDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.verificationStatus === 'VERIFIED' ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                              <CheckCircle className="w-4 h-4" /> Verified
                            </span>
                          ) : doc.verificationStatus === 'REJECTED' ? (
                            <span className="flex items-center gap-1 text-red-600 text-sm font-semibold">
                              <XCircle className="w-4 h-4" /> Rejected
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-600 text-sm font-semibold">
                              <Clock className="w-4 h-4" /> Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <button 
                    onClick={() => setActiveTab('profile')} 
                    className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition text-left font-medium text-blue-700"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Upload Documents</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('universities')} 
                    className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition text-left font-medium text-green-700"
                  >
                    <Search className="w-5 h-5" />
                    <span>Find Universities</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('preferences')} 
                    className="w-full flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition text-left font-medium text-purple-700"
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span>Manage Preferences</span>
                  </button>
                  {placement && (
                    <button 
                      onClick={() => setActiveTab('placement')} 
                      className="w-full flex items-center gap-3 p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition text-left font-medium text-orange-700"
                    >
                      <Award className="w-5 h-5" />
                      <span>Check Placement</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Placement Status */}
            {placement && (
              <div className="mt-6 bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                <h2 className="text-lg font-bold mb-4">Your Placement</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">University</p>
                    <p className="text-lg font-semibold text-gray-900">{placement.universityName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Program</p>
                    <p className="text-lg font-semibold text-gray-900">{placement.programName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Status</p>
                    <p className={`text-lg font-bold ${placement.status === 'PLACED' ? 'text-green-600' : 'text-red-600'}`}>
                      {placement.status === 'PLACED' ? '✓ Accepted' : placement.status === 'NOT_PLACED' ? '✗ Not Placed' : 'Pending'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Deadline</p>
                    <p className="text-lg font-semibold text-gray-900">{new Date(placement.confirmationDeadline).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Notifications */}
            {notifications.length > 0 && (
              <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">Recent Notifications</h2>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {notifications.slice(0, 5).map(n => (
                    <div key={n.id} className={`p-3 rounded-lg ${!n.read ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-gray-50'}`}>
                      <p className="font-semibold text-sm">{n.title}</p>
                      <p className="text-sm text-gray-600">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile & Documents */}
        {activeTab === 'profile' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Profile & Documents</h1>
              <p className="text-gray-600 mt-1">Manage your account information and upload required documents</p>
            </div>

            {/* Personal Information */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-bold mb-6">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Exam ID</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{profile.examID}</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{profile.firstName} {profile.lastName}</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1 flex items-center gap-2">
                    {profile.email}
                    {profile.emailVerified ? (
                      <CheckCircle className="w-5 h-5 text-green-500" title="Verified" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" title="Not verified" />
                    )}
                  </p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{profile.phone || 'Not provided'}</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{profile.region || 'Not specified'}</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{new Date(profile.dateOfBirth).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500 mt-1">{profile.age} years old</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{profile.gender || 'Not specified'}</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Disability Status</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{profile.disability}</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stream</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{profile.stream}</p>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-6">Required Documents</h2>
              
              {/* Upload Area */}
<div className="mb-8 p-6 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
  <div className="text-center">
    <Upload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
    <label htmlFor="document-upload" className="cursor-pointer">
      <span className="font-semibold text-gray-900 hover:text-blue-600">Click to upload</span>
      <span className="text-gray-600"> or drag and drop</span>
    </label>
    <p className="text-sm text-gray-500 mt-2">PDF, JPG, or PNG (max 10MB)</p>
    <input 
      id="document-upload"
      type="file" 
      onChange={e => e.target.files && handleDocumentUpload(e.target.files[0], 'GENERAL')} 
      disabled={uploading}
      className="hidden"
    />
    {uploading && (
      <div className="mt-3 flex items-center justify-center gap-2 text-blue-600">
        <Loader2 className="animate-spin w-4 h-4" />
        <span>Uploading...</span>
      </div>
    )}
  </div>
</div>

              {/* Documents List */}
              {documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-4">Uploaded Documents ({documents.length})</h3>
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-shrink-0">
                          {doc.verificationStatus === 'VERIFIED' ? (
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                          ) : doc.verificationStatus === 'REJECTED' ? (
                            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                              <XCircle className="w-6 h-6 text-red-600" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                              <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">
                            {doc.name}
                          </a>
                          <p className="text-sm text-gray-500 mt-1">{new Date(doc.uploadDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          {doc.verificationStatus === 'VERIFIED' && (
                            <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Verified</span>
                          )}
                          {doc.verificationStatus === 'REJECTED' && (
                            <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Rejected</span>
                          )}
                          {doc.verificationStatus === 'PENDING' && (
                            <span className="inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">Pending Review</span>
                          )}
                        </div>
                        <button onClick={() => window.open(doc.fileUrl, '_blank')} className="text-blue-600 hover:text-blue-800" title="View document">
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Document Requirements */}
              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Required Documents</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>National Identity Card or Passport</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Birth Certificate</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>School Transcript</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Medical Certificate (if applicable)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Exam Results */}
        {activeTab === 'exam-results' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Exam Results</h1>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="mb-4"><span className="font-semibold">Stream:</span> {profile.stream}</div>
              <div className="mb-4"><span className="font-semibold">Total Score:</span> <span className="text-2xl font-bold text-blue-600">{profile.totalScore}</span></div>
              <h3 className="font-semibold mb-3">Subject Scores</h3>
              <div className="space-y-3">
                {Object.entries(profile.examResults).map(([subj, score]) => (
                  <div key={subj}>
                    <div className="flex justify-between"><span>{subj.charAt(0).toUpperCase() + subj.slice(1)}</span><span>{score}</span></div>
                    <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(score / 100) * 100}%` }}></div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Admission Tracks */}
        {activeTab === 'admission-tracks' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Admission Tracks</h1>
            <div className="grid gap-4">
              {admissionTracks.map(track => (
                <div key={track.id} className={`bg-white rounded-xl shadow-sm p-6 border-l-8 ${track.isEligible ? 'border-green-500' : 'border-red-500'}`}>
                  <div className="flex justify-between"><h3 className="font-bold text-lg">{track.name}</h3>{track.isEligible ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}</div>
                  <p className="text-gray-600 mt-2">{track.description}</p>
                  <p className="text-sm text-gray-500 mt-1">Eligibility: {track.eligibilityCriteria}</p>
                  <p className="text-sm text-gray-500">Capacity: {track.capacity}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Universities Search & Compare */}
        {activeTab === 'universities' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Universities</h1>
            <div className="flex gap-4 mb-6">
              <input type="text" placeholder="Search by name..." className="flex-1 border rounded-lg px-4 py-2" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <select className="border rounded-lg px-4 py-2" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="all">All Types</option>
                <option value="public">Public</option>
                <option value="autonomous">Autonomous</option>
              </select>
            </div>
            <div className="grid gap-4">
              {universities.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) && (filterType === 'all' || u.type === filterType)).map(uni => (
                <div key={uni.id} className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
                  <div><h3 className="font-semibold">{uni.name}</h3><p className="text-sm text-gray-500">{uni.region} | {uni.type}</p></div>
                  <div className="flex gap-2">
                    <button onClick={() => window.open(`/university/${uni.id}`, '_blank')} className="px-3 py-1 text-blue-600 border border-blue-600 rounded-lg">View Profile</button>
                    <button onClick={() => setCompareList(prev => prev.includes(uni) ? prev.filter(u => u.id !== uni.id) : [...prev, uni])} className={`px-3 py-1 rounded-lg ${compareList.includes(uni) ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Compare</button>
                  </div>
                </div>
              ))}
            </div>
            {compareList.length > 0 && (
              <div className="fixed bottom-4 right-4 bg-white shadow-xl rounded-xl p-4 w-96 border">
                <h3 className="font-bold mb-2">Compare ({compareList.length})</h3>
                <div className="max-h-64 overflow-auto">
                  {compareList.map(uni => <div key={uni.id} className="flex justify-between"><span>{uni.name}</span><button onClick={() => setCompareList(prev => prev.filter(u => u.id !== uni.id))}><X className="w-4 h-4" /></button></div>)}
                </div>
                <button className="mt-2 w-full bg-blue-600 text-white py-1 rounded-lg" onClick={() => alert('Comparison table would open here')}>Compare Now</button>
              </div>
            )}
          </div>
        )}

        {/* My Preferences */}
        {activeTab === 'preferences' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">My Preferences</h1>
              <p className="text-gray-600 mt-1">Build your ranked list of university preferences by admission track</p>
            </div>

            {/* Info Banner */}
<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
  <div>
    <p className="font-semibold text-blue-900">
      Submission Attempts: {submissionInfo.attemptsUsed} of {submissionInfo.maxAttempts} used
    </p>
    <p className="text-sm text-blue-800 mt-1">
      You have {submissionInfo.attemptsLeft} submission(s) remaining. 
      Each submission replaces your previous list.
    </p>
    {submissionInfo.lastSubmittedAt && (
      <p className="text-xs text-blue-600 mt-1">
        Last submitted: {new Date(submissionInfo.lastSubmittedAt).toLocaleString()}
      </p>
    )}
  </div>
</div>

            {/* Add New Preference */}
            {/* Add New Preference */}
<div className="bg-white rounded-xl shadow-sm p-6 mb-6">
  <h2 className="text-lg font-bold mb-4">Add University Preference</h2>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-1">University</label>
      <select 
        value={newPreference.universityId} 
        onChange={e => { 
          setNewPreference({ ...newPreference, universityId: parseInt(e.target.value), programId: 0, admissionTrackId: 0 }); 
        }} 
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value={0}>Choose university...</option>
        {universities.map(u => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </div>
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-1">Program</label>
      <select 
        value={newPreference.programId} 
        onChange={e => { 
          setNewPreference({ ...newPreference, programId: parseInt(e.target.value), admissionTrackId: 0 }); 
        }} 
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!newPreference.universityId}
      >
        <option value={0}>Select program...</option>
        {availablePrograms.map(program => (
          <option key={program.id} value={program.id}>{program.name}</option>
        ))}
      </select>
    </div>
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-1">Admission Track</label>
      <select 
        value={newPreference.admissionTrackId} 
        onChange={e => setNewPreference({ ...newPreference, admissionTrackId: parseInt(e.target.value) })} 
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!newPreference.programId}
      >
        <option value={0}>Select track...</option>
        {availableTracks.map(track => (
          <option key={track.id} value={track.id}>{track.name}</option>
        ))}
      </select>
    </div>
    <div className="flex items-end">
      <button 
        onClick={addPreference}
        disabled={!newPreference.universityId}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Preference
      </button>
    </div>
  </div>
</div>
            {/* Current Preferences List */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold">Your Ranked Preferences</h2>
                  <p className="text-sm text-gray-600 mt-1">{preferences.length} preference(s) added</p>
                </div>
                {preferences.length > 0 && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${submissionAttemptsLeft > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {submissionAttemptsLeft > 0 ? 'Ready to Submit' : 'No Attempts Left'}
                  </span>
                )}
              </div>

{preferences.length === 0 ? (
  <div className="text-center py-12">
    <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-3" />
    <p className="text-gray-500 font-medium">No preferences added yet</p>
    <p className="text-gray-400 text-sm mt-1">Add your university preferences above</p>
  </div>
) : (
  <div className="space-y-4">
    {preferences.map((pref, index) => {
      const isSubmitted = !!pref.submittedAt;
const hasAttemptsLeft = (pref.remainingAttempts || 0) > 0;
const isDeadlinePassed = pref.isDeadlinePassed || false;

// Determine if button should be disabled
const isDisabled = (!hasAttemptsLeft) || (isDeadlinePassed);

let buttonClasses = "px-4 py-2 rounded-lg font-semibold transition ";
let buttonText = "";

// Button text and styling based on status
if (isSubmitted && hasAttemptsLeft) {
  buttonText = `🔄 Resubmit (${pref.remainingAttempts} attempts left)`;
  buttonClasses += "bg-yellow-600 hover:bg-yellow-700 text-white";
} else if (isSubmitted && !hasAttemptsLeft) {
  buttonText = "✓ Submitted - No Attempts Left";
  buttonClasses += "bg-gray-300 cursor-not-allowed text-gray-600";
} else if (!isSubmitted && hasAttemptsLeft && !isDeadlinePassed) {
  buttonText = `📝 Submit (${pref.remainingAttempts} attempts left)`;
  buttonClasses += "bg-green-600 hover:bg-green-700 text-white";
} else if (!isSubmitted && hasAttemptsLeft && isDeadlinePassed) {
  buttonText = "⏰ Deadline Passed";
  buttonClasses += "bg-gray-300 cursor-not-allowed text-gray-600";
} else {
  buttonText = "❌ No Attempts Left";
  buttonClasses += "bg-red-300 cursor-not-allowed text-white";
}

// For disabled state override
const finalDisabled = isDisabled || (!hasAttemptsLeft);
      
      return (
        <div key={pref.id} className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                  {index + 1}
                </span>
                <h4 className="font-semibold text-lg text-gray-900">{pref.universityName}</h4>
                {isSubmitted && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Submitted
                  </span>
                )}
              </div>
              
              <div className="ml-11 space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Program:</span> {pref.programName}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Track:</span> {pref.admissionTrackName}
                </p>
              </div>
              
              <div className="ml-11 mt-3 space-y-1">
                {isSubmitted ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-700">
                      Submitted on {new Date(pref.submittedAt!).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-orange-700">
                      Not submitted yet • {pref.remainingAttempts || 3} attempt(s) remaining
                    </span>
                  </div>
                )}
                
                {pref.universityDeadline && (
                  <div className="flex items-center gap-2">
                    {new Date(pref.universityDeadline) < new Date() ? (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-xs text-red-600">
                          Deadline passed: {new Date(pref.universityDeadline).toLocaleDateString()}
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-600">
                          Deadline: {new Date(pref.universityDeadline).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
           <button
  onClick={() => {
    if (!finalDisabled) {
      submitPreference(pref.id, pref.universityName);
    }
  }}
  disabled={finalDisabled}
  className={buttonClasses}
>
              {submittingPref === pref.id ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                buttonText
              )}
            </button>
          </div>
        </div>
      );
    })}
  </div>
)}
 
              {preferences.length > 0 && submissionAttemptsLeft > 0 && (
                <button 
                  onClick={() => setShowFinalSubmitConfirm(true)} 
                  className="mt-8 w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-lg font-bold transition text-lg"
                >
                  Submit Preferences ({submissionAttemptsLeft} attempts left)
                </button>
              )}
              {submissionAttemptsLeft === 0 && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-semibold">You have exhausted your submission attempts.</p>
                  <p className="text-red-600 text-sm mt-1">Please contact support if you need further assistance.</p>
                </div>
              )}
            </div>

            {/* Confirmation Modal */}
            {showFinalSubmitConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
                  <div className="p-6 border-b">
                    <h3 className="text-xl font-bold text-gray-900">Confirm Submission</h3>
                  </div>
                  <div className="p-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-yellow-900 font-semibold text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        This action cannot be undone
                      </p>
                    </div>
                    <p className="text-gray-700 mb-4">
                      You are about to submit your final preference list of <span className="font-bold">{preferences.length}</span> preference(s).
                    </p>
                    <p className="text-gray-600 text-sm mb-6">
                      After submission, you will have <span className="font-bold">{Math.max(0, submissionAttemptsLeft - 1)}</span> attempt(s) remaining.
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto mb-6 p-4 bg-gray-50 rounded-lg">
                      {preferences.sort((a, b) => a.rank - b.rank).map((pref, index) => (
                        <div key={pref.id} className="flex gap-2 text-sm">
                          <span className="font-bold text-blue-600 w-6">{index + 1}.</span>
                          <span className="text-gray-700">{pref.universityName} - {pref.programName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
                    <button 
                      onClick={() => setShowFinalSubmitConfirm(false)} 
                      className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={submitFinalPreferences} 
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
                    >
                      Confirm Submission
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Placement & Appeal */}
        {activeTab === 'placement' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Placement Results & Appeals</h1>
              <p className="text-gray-600 mt-1">View your placement decision and submit appeals if needed</p>
            </div>

            {/* Placement Result */}
            {placement ? (
              <div className={`rounded-xl shadow-sm p-8 mb-6 border-l-4 ${placement.status === 'PLACED' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {placement.status === 'PLACED' ? '✓ Placement Confirmed' : placement.status === 'NOT_PLACED' ? '✗ Not Placed' : 'Decision Pending'}
                    </h2>
                    <p className={`text-sm mt-2 ${placement.status === 'PLACED' ? 'text-green-700' : placement.status === 'NOT_PLACED' ? 'text-red-700' : 'text-gray-600'}`}>
                      Last updated: {new Date(placement.decisionDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`text-4xl ${placement.status === 'PLACED' ? 'text-green-500' : placement.status === 'NOT_PLACED' ? 'text-red-500' : 'text-gray-400'}`}>
                    {placement.status === 'PLACED' ? '✓' : placement.status === 'NOT_PLACED' ? '✗' : '...'}
                  </div>
                </div>

                {placement.status === 'PLACED' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">University</p>
                      <p className="text-lg font-bold text-gray-900 mt-2">{placement.universityName}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program</p>
                      <p className="text-lg font-bold text-gray-900 mt-2">{placement.programName}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirmation Deadline</p>
                      <p className="text-lg font-bold text-gray-900 mt-2">{new Date(placement.confirmationDeadline).toLocaleDateString()}</p>
                      {new Date() < new Date(placement.confirmationDeadline) && (
                        <p className="text-xs text-green-600 font-semibold mt-1">
                          {Math.ceil((new Date(placement.confirmationDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {placement.status !== 'PENDING' && (
                  <div className="mt-6 p-4 bg-white rounded-lg border">
                    <p className="text-sm text-gray-600 mb-3">
                      {placement.status === 'PLACED' 
                        ? 'You have been accepted to your selected program. Please review the details above and confirm your placement before the deadline.'
                        : 'Unfortunately, you were not placed in any of your preferred choices. You may file an appeal to reconsider your case.'}
                    </p>
                    {placement.status === 'PLACED' && (
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition">
                        Accept Placement
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 mb-6 text-center">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900">Placement Results Not Yet Available</h3>
                <p className="text-gray-600 mt-2">Placement decisions will be published once universities complete their selection process.</p>
              </div>
            )}

            {/* Appeals Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">My Appeals Portal</h2>
                  <p className="text-sm text-gray-500 mt-1">Track and submit your petitions to the Ministry or specific Universities.</p>
                </div>
                <button 
                  onClick={() => setShowAppealModal(true)}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-lg shadow-orange-600/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  File New Appeal
                </button>
              </div>

              {/* Sub-tabs to filter appeals clearly */}
              <div className="flex border-b border-gray-100 mb-6">
                <button
                  onClick={() => setAppealSubTab('MOE')}
                  className={`pb-4 px-6 text-sm font-bold transition-all relative ${
                    appealSubTab === 'MOE'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Ministry of Education ({appeals.filter(a => a.target === 'MOE').length})
                </button>
                <button
                  onClick={() => setAppealSubTab('UNIVERSITY')}
                  className={`pb-4 px-6 text-sm font-bold transition-all relative ${
                    appealSubTab === 'UNIVERSITY'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  University Appeals ({appeals.filter(a => a.target === 'UNIVERSITY').length})
                </button>
              </div>
              
              {appeals.filter(a => appealSubTab === 'MOE' ? a.target === 'MOE' : a.target === 'UNIVERSITY').length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">No appeals in this category yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appeals
                    .filter(a => appealSubTab === 'MOE' ? a.target === 'MOE' : a.target === 'UNIVERSITY')
                    .map(ap => {
                      const isMoe = ap.target === 'MOE';
                      return (
                        <div key={ap.id} className="p-5 border rounded-2xl hover:shadow-md transition-all duration-300 border-gray-100">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                  isMoe ? 'text-purple-600 bg-purple-50' : 'text-blue-600 bg-blue-50'
                                }`}>
                                  Appeal #{ap.id} • {ap.type}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                  {new Date(ap.createdAt).toLocaleString()}
                                </span>
                              </div>
                              {ap.preference && (
                                <p className="text-xs text-blue-600 font-semibold mt-1">
                                  Related Preference: {ap.preference.university.name} - {ap.preference.program.name}
                                </p>
                              )}
                              {!ap.preference && ap.university?.name && (
                                <p className="text-xs text-blue-600 font-semibold mt-1">
                                  Target University: {ap.university.name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                ap.status === 'resolved' ? 'bg-green-100 text-green-700' : 
                                ap.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {ap.status}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm italic bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2">"{ap.description}"</p>

                          {/* Yellow pending review system */}
                          {ap.status === 'pending' && (
                            <div className="mt-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-yellow-600 animate-pulse" />
                              <p className="text-xs font-semibold text-yellow-800">
                                Pending: This appeal is currently being reviewed by the {isMoe ? 'Ministry of Education' : 'University'}.
                              </p>
                            </div>
                          )}

                           {/* Purple/Blue Resolution Response */}
                          {ap.resolution && (ap.status?.toLowerCase() === 'resolved' || ap.status?.toLowerCase() === 'approved') && (
                            isMoe ? (
                              <div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-100 text-purple-700">
                                <p className="text-xs font-bold text-purple-800 mb-1 uppercase tracking-wider flex items-center gap-1">
                                  <CheckCircle size={12} /> MOE Resolution:
                                </p>
                                <p className="text-sm font-medium">{ap.resolution}</p>
                              </div>
                            ) : (
                              <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-700">
                                <p className="text-xs font-bold text-blue-800 mb-1 uppercase tracking-wider flex items-center gap-1">
                                  <CheckCircle size={12} /> {ap.university?.name || 'University'} Response:
                                </p>
                                <p className="text-sm font-medium">{ap.resolution}</p>
                              </div>
                            )
                          )}

                          {/* Red Rejection system */}
                          {ap.resolution && ap.status?.toLowerCase() === 'rejected' && (
                            <div className="mt-3 p-4 bg-red-50 rounded-xl border border-red-100 text-red-700">
                              <p className="text-xs font-bold text-red-800 mb-1 uppercase tracking-wider flex items-center gap-1">
                                <XCircle size={12} /> Rejection Decision ({isMoe ? 'MOE' : 'University'}):
                              </p>
                              <p className="text-sm font-medium">{ap.resolution}</p>
                            </div>
                          )}

                          {/* Fallback for general response if status matches anything else but has a resolution */}
                          {ap.resolution && ap.status?.toLowerCase() !== 'resolved' && ap.status?.toLowerCase() !== 'approved' && ap.status?.toLowerCase() !== 'rejected' && (
                            <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-150 text-gray-700">
                              <p className="text-xs font-bold text-gray-800 mb-1 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle size={12} /> {isMoe ? 'MOE' : (ap.university?.name || 'University')} Response ({ap.status}):
                              </p>
                              <p className="text-sm font-medium">{ap.resolution}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Appeal Modal */}
            {showAppealModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-8 bg-gradient-to-r from-orange-500 to-red-600 text-white">
                    <h3 className="text-2xl font-black tracking-tight">File an Appeal</h3>
                    <p className="text-orange-100 text-sm mt-1 opacity-90">File an appeal to either the MoE or a specific preferred university.</p>
                  </div>
                  <div className="p-8 space-y-6">
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-3">Submit Appeal To *</label>
                      <select 
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                        value={appealForm.target}
                        onChange={e => {
                          const val = e.target.value;
                          setAppealForm({ 
                            ...appealForm, 
                            target: val, 
                            universityId: val === 'UNIVERSITY' && preferences.length > 0 ? String(preferences[0].universityId) : '' 
                          });
                        }}
                      >
                        <option value="MOE">Ministry of Education (MOE)</option>
                        <option value="UNIVERSITY">University</option>
                      </select>
                    </div>

                    {appealForm.target === 'UNIVERSITY' && (
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-3">Select Target University *</label>
                        <select 
                          className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                          value={appealForm.universityId}
                          onChange={e => setAppealForm({ ...appealForm, universityId: e.target.value })}
                        >
                          <option value="">Select University...</option>
                          {Array.from(new Map(preferences.map(p => [p.universityId, p.universityName])).entries()).map(([id, name]) => (
                            <option key={id} value={String(id)}>{name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-3">Appeal Type *</label>
                      <select 
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                        value={appealForm.type}
                        onChange={e => setAppealForm({ ...appealForm, type: e.target.value })}
                      >
                        <option value="placement">Placement Reconsideration</option>
                        <option value="eligibility">Eligibility Dispute</option>
                        <option value="technical">Technical Error</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-3">Related Preference (Optional)</label>
                      <select 
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                        value={appealForm.preferenceId}
                        onChange={e => setAppealForm({ ...appealForm, preferenceId: e.target.value })}
                      >
                        <option value="">None / Not Applicable</option>
                        {preferences.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.universityName} - {p.programName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-3">Detailed Description *</label>
                      <textarea 
                        className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-orange-500 resize-none min-h-[120px]"
                        placeholder="Please explain your case clearly..."
                        value={appealForm.description}
                        onChange={e => setAppealForm({ ...appealForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 p-8 bg-gray-50/50">
                    <button 
                      onClick={submitAppeal}
                      disabled={!appealForm.description}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-lg shadow-orange-600/20"
                    >
                      Submit Appeal
                    </button>
                    <button 
                      onClick={() => setShowAppealModal(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-300 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Notifications</h1>
            <div className="bg-white rounded-xl shadow-sm p-6">
              {notifications.map(n => (
                <div key={n.id} className={`p-4 border-b ${!n.read ? 'bg-blue-50' : ''}`}>
                  <div className="flex justify-between"><h3 className="font-semibold">{n.title}</h3><span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span></div>
                  <p className="text-gray-600 mt-1">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Settings</h1>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold mb-4">Account Security</h2>
              <button className="w-full text-left p-3 border rounded mb-2">Change Password</button>
              <button className="w-full text-left p-3 border rounded mb-2">Manage Recovery Contacts</button>
              <button className="w-full text-left p-3 border rounded">View Active Sessions</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}