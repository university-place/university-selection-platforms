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
import {
  MapPin,
  Calendar,
  GraduationCap,
  RefreshCw
} from 'lucide-react';
import { studentAPI, authHelpers } from '@/lib/api';
import CustomAttributes from '@/components/CustomAttributes';

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
  customAttributes: Record<string, any> | null;
}

interface Document {
  id: number;
  fileName: string;           // Changed from 'name' to match API
  type: string;
  fileUrl: string;
  uploadDate: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  scope?: 'general' | 'university';
  universityId?: number;
  university?: { id: number; name: string };
  fileSize?: number;
  mimeType?: string;
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
  universityDeadline?: string;        // ✅ This is the correct property name
  applicationStartDate?: string;      // ✅ This is for start date
  isApplicationOpen?: boolean;
  isDeadlinePassed?: boolean;
  isCancelled?: boolean;
  cancelledAt?: string;
  cancelledReason?: string;
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
  resolution?: string;
  createdAt: string;
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
    maxAttempts: 10,
    attemptsLeft: 10,
    lastSubmittedAt: null as string | null
  });
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingPref, setSubmittingPref] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  // Data states

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [admissionTracks, setAdmissionTracks] = useState<AdmissionTrack[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  // const [compareList, setCompareList] = useState<University[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [placement, setPlacement] = useState<PlacementResult | null>(null);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [submissionAttemptsLeft, setSubmissionAttemptsLeft] = useState(10);
  const [showFinalSubmitConfirm, setShowFinalSubmitConfirm] = useState(false);
  // Document modal states
  const [showGeneralDocModal, setShowGeneralDocModal] = useState(false);
  const [showUniversityDocModal, setShowUniversityDocModal] = useState(false);
  const [selectedUniversityForDocs, setSelectedUniversityForDocs] = useState<Preference | null>(null);
  const [generalDocuments, setGeneralDocuments] = useState<Document[]>([]);
  const [universityDocuments, setUniversityDocuments] = useState<Document[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  // UI states
  const [uploading, setUploading] = useState(false);
  const [newPreference, setNewPreference] = useState({ universityId: 0, programId: 0, admissionTrackId: 0 });
  
  // Password change states
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });
  
  const [availablePrograms, setAvailablePrograms] = useState<{ id: number; name: string }[]>([]);
  const [availableTracks, setAvailableTracks] = useState<{ id: number; name: string }[]>([]);
  const [editingPreferenceId, setEditingPreferenceId] = useState<number | null>(null);
  const [appealForm, setAppealForm] = useState({ type: 'placement', description: '', preferenceId: '', target: 'MOE', universityId: '' });
  const [appealSubTab, setAppealSubTab] = useState<'MOE' | 'UNIVERSITY'>('MOE');
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);
  const [streamSubjects, setStreamSubjects] = useState<any>(null);
  const [editingPref, setEditingPref] = useState<{
    id: number;
    programId: number;
    trackId: number;
    universityId: number;
    universityName: string
  } | null>(null);
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
  // Fetch placement offers when 'my-placements' tab is selected


  // ============================================
  // Placement Offers Component (Add before return)
  // ============================================



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

        // Load documents from profile
        if (profileResult.profile.documents) {
          setUploadedDocuments(profileResult.profile.documents);
          setDocuments(profileResult.profile.documents);
        }
      } else if (profileResult.error && (
        profileResult.error.toLowerCase().includes('auth failed') || 
        profileResult.error.toLowerCase().includes('token') || 
        profileResult.error.toLowerCase().includes('unauthorized') ||
        profileResult.error === 'Forbidden'
      )) {
        console.error('Dashboard: Auth error detected:', profileResult.error);
        authHelpers.logout();
        router.push('/student/login');
        return;
      }

      const appsResult = await studentAPI.getApplications();

      // ✅ FETCH UNIVERSITIES TO GET DATES
      const token = authHelpers.getToken();
      const uniRes = await fetch('/api/universities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const uniData = await uniRes.json();

      // Create a map of university dates
      const uniDateMap = new Map();
      if (uniData.success) {
        uniData.universities.forEach((uni: any) => {
          uniDateMap.set(uni.id, {
            startDate: uni.applicationStartDate,
            deadline: uni.applicationDeadline
          });
        });
        console.log('📅 University date map created:', Array.from(uniDateMap.entries()));
      }

      if (appsResult.success) {
        // ✅ MERGE DATES FROM UNIVERSITY DATA
        const preferencesWithDates = (appsResult.applications || []).map((pref: Preference) => {
          const uniDates = uniDateMap.get(pref.universityId);

          // Debug log for Bahir Dar
          if (pref.universityName?.toLowerCase().includes('bahir')) {
            console.log('🎓 Bahir Dar University date merge:', {
              originalStartDate: pref.applicationStartDate,
              uniDatesStartDate: uniDates?.startDate,
              mergedStartDate: pref.applicationStartDate || uniDates?.startDate,
              originalDeadline: pref.universityDeadline,
              uniDatesDeadline: uniDates?.deadline,
              mergedDeadline: pref.universityDeadline || uniDates?.deadline
            });
          }

          return {
            ...pref,
            applicationStartDate: pref.applicationStartDate || uniDates?.startDate,
            universityDeadline: pref.universityDeadline || uniDates?.deadline
          };
        });

        setPreferences(preferencesWithDates.filter((pref: any) => !pref.isCancelled));

        if (appsResult.submissionInfo) {
          setSubmissionInfo(appsResult.submissionInfo);
          setSubmissionAttemptsLeft(appsResult.submissionInfo.attemptsLeft);
        }
      }

      // Fetch documents separately if not in profile
      const docsRes = await fetch('/api/students/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const docsData = await docsRes.json();
      if (docsData.success && docsData.documents) {
        setUploadedDocuments(docsData.documents);
        setDocuments(docsData.documents);
      }

      const uniRes2 = await fetch('/api/universities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const uniData2 = await uniRes2.json();
      if (uniData2.success) {
        setUniversities(uniData2.universities);
      }

      // Fetch stream subjects
      const subjectsRes = await fetch('/api/common/settings?key=stream_subjects');
      const subjectsData = await subjectsRes.json();
      if (subjectsData.success) {
        setStreamSubjects(subjectsData.value);
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
        // Refresh documents list
        await fetchDashboardData();
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
  // Fetch general documents (scope=general)
  async function fetchGeneralDocuments() {
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/students/documents?scope=general', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setGeneralDocuments(data.documents);
      }
    } catch (err) {
      console.error('Error fetching general documents:', err);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ text: 'New passwords do not match', type: 'error' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ text: 'Password must be at least 6 characters long', type: 'error' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage({ text: '', type: '' });

    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/students/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordMessage({ text: 'Password updated successfully!', type: 'success' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMessage({ text: data.error || 'Failed to update password', type: 'error' });
      }
    } catch (err) {
      setPasswordMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  }

  // Fetch documents for a specific university
  async function fetchUniversityDocuments(universityId: number) {
    const token = authHelpers.getToken();
    try {
      const res = await fetch(`/api/students/documents?scope=university&universityId=${universityId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUniversityDocuments(data.documents);
      }
    } catch (err) {
      console.error('Error fetching university documents:', err);
    }
  }

  // Upload general document
  async function uploadGeneralDocument(file: File, docType: string) {
    const token = authHelpers.getToken();
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', docType);
    formData.append('scope', 'general');

    try {
      const res = await fetch('/api/students/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ General document uploaded successfully');
        await fetchGeneralDocuments();
        await fetchDashboardData(); // refresh main document list
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed');
    } finally {
      setUploadingDoc(false);
    }
  }

  // Upload university-specific document
  async function uploadUniversityDocument(file: File, docType: string, universityId: number, preferenceId: number) {
    const token = authHelpers.getToken();
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', docType);
    formData.append('scope', 'university');
    formData.append('universityId', universityId.toString());
    formData.append('preferenceId', preferenceId.toString());

    try {
      const res = await fetch('/api/students/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Document uploaded for ${selectedUniversityForDocs?.universityName}`);
        await fetchUniversityDocuments(universityId);
        await fetchDashboardData();
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed');
    } finally {
      setUploadingDoc(false);
    }
  }

  // Delete document
  async function deleteDocument(docId: number, isUniversityDoc: boolean, universityId?: number) {
    if (!confirm('Delete this document?')) return;
    const token = authHelpers.getToken();
    try {
      const res = await fetch(`/api/students/documents?id=${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('Document deleted');
        if (isUniversityDoc && universityId) {
          await fetchUniversityDocuments(universityId);
        } else {
          await fetchGeneralDocuments();
        }
        await fetchDashboardData();
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Delete failed');
    }
  }
  async function submitPreference(preferenceId: number, universityName: string) {
    // ✅ FIRST CHECK - Validate dates before showing confirm dialog
    const token = authHelpers.getToken();
    if (!token) {
      alert('Please login again');
      return;
    }

    // Find the preference to check its dates
    const pref = preferences.find(p => p.id === preferenceId);
    if (!pref) {
      alert('Preference not found');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ✅ Check if application hasn't started
    if (pref.applicationStartDate) {
      const startDate = new Date(pref.applicationStartDate);
      startDate.setHours(0, 0, 0, 0);
      if (startDate > today) {
        alert(`📅 Applications for ${universityName} open on ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}\n\nYou cannot submit before the application period starts.`);
        return;
      }
    }

    // ✅ Check if deadline has passed
    if (pref.universityDeadline) {
      const deadline = new Date(pref.universityDeadline);
      deadline.setHours(23, 59, 59, 999);
      if (deadline < today) {
        alert(`⏰ Application deadline for ${universityName} was ${deadline.toLocaleDateString()}\n\nYou cannot submit after the deadline has passed.`);
        return;
      }
    }

    // ✅ If dates are valid, show confirmation
    if (!confirm(`Submit your application to ${universityName}?`)) return;

    setSubmittingPref(preferenceId);

    try {
      const res = await fetch('/api/students/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'submit',
          preferenceId
        })
      });

      const data = await res.json();
      console.log('Submit response:', data);

      if (res.ok && data.success) {
        alert(`✅ Application to ${universityName} submitted successfully!\nRemaining attempts: ${data.remainingAttempts}`);
        await fetchDashboardData();
      } else if (res.status === 404) {
        alert('Preference not found. Refreshing page...');
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

    if (!universityId || universityId === 0) {
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
      // ✅ Convert 0 to null for program (meaning "No Program")
      const finalProgramId = (!programId || programId === 0) ? null : Number(programId);
      // ✅ Convert 0 to null for track (meaning "No Track")
      const finalTrackId = (!admissionTrackId || admissionTrackId === 0) ? null : Number(admissionTrackId);

      console.log('Submitting preference:', {
        universityId: Number(universityId),
        programId: finalProgramId,
        admissionTrackId: finalTrackId
      });

      const response = await fetch('/api/students/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          applications: [{
            universityId: Number(universityId),
            programId: finalProgramId,
            admissionTrackId: finalTrackId
          }]
        }),
      });

      const data = await response.json();
      console.log('Add preference response:', data);

      if (response.ok && data.success) {
        await fetchDashboardData();
        setNewPreference({ universityId: 0, programId: 0, admissionTrackId: 0 });
        setAvailablePrograms([]);
        setAvailableTracks([]);
        alert('Preference added successfully!');
      } else {
        alert(data.error || 'Failed to add preference');
      }
    } catch (err) {
      console.error('Add preference error:', err);
      alert(`Error: ${err.message}`);
    }
  }
  function renderPreferenceCard(pref: Preference, displayIndex: number) {
    const isSubmitted = !!pref.submittedAt;
    const hasAttemptsLeft = (pref.remainingAttempts || 0) > 0;
    const isDeadlinePassed = pref.isDeadlinePassed || false;
    const isCancelled = pref.isCancelled === true;

    const isDateValid = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (pref.applicationStartDate) {
        const startDate = new Date(pref.applicationStartDate);
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        if (startDateOnly > today) return false;
      }

      if (pref.universityDeadline) {
        const deadline = new Date(pref.universityDeadline);
        const deadlineDateOnly = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
        if (deadlineDateOnly < today) return false;
      }
      return true;
    };

    const dateValid = isDateValid();
    const canSubmit = !isCancelled && hasAttemptsLeft && !isDeadlinePassed && dateValid;

    return (
      <div key={pref.id} className={`bg-card border-border rounded-lg shadow-md p-5 hover:shadow-lg transition border-l-4 ${isCancelled ? 'border-l-gray-400 bg-muted/30' : 'border-l-blue-500'}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {/* Header section */}
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                {displayIndex}
              </span>
              <h4 className="font-semibold text-lg text-foreground">{pref.universityName}</h4>
              {isCancelled && (
                <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded-full flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Cancelled
                </span>
              )}
              {isSubmitted && !isCancelled && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Submitted
                </span>
              )}
            </div>

            {/* Program and Track info */}
            <div className="ml-11 space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Program:</span>
                {pref.programName && pref.programName !== 'Program not found'
                  ? pref.programName
                  : 'Not specified (University only)'}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Track:</span>
                {pref.admissionTrackName && pref.admissionTrackName !== 'Track not found'
                  ? pref.admissionTrackName
                  : 'Not specified (Default admission)'}
              </p>
            </div>

            {/* Application Period Status */}
            {pref.applicationStartDate && (
              <div className="ml-11 mt-2">
                {new Date(pref.applicationStartDate) > new Date() ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">
                      📅 Opens: {new Date(pref.applicationStartDate).toLocaleDateString()}
                    </span>
                  </div>
                ) : pref.universityDeadline && new Date(pref.universityDeadline) < new Date() ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs">
                      ⚠️ Closed: {new Date(pref.universityDeadline).toLocaleDateString()}
                    </span>
                  </div>
                ) : pref.universityDeadline && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">
                      📅 Deadline: {new Date(pref.universityDeadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Status message section */}
            <div className="ml-11 mt-3">
              {isCancelled ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Cancelled on {pref.cancelledAt ? new Date(pref.cancelledAt).toLocaleString() : 'Unknown date'}
                    </span>
                  </div>
                  {pref.cancelledReason && (
                    <div className="text-xs text-muted-foreground ml-6">
                      Reason: {pref.cancelledReason}
                    </div>
                  )}
                </div>
              ) : isSubmitted ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-700">
                      Submitted on {new Date(pref.submittedAt!).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    ✅ {pref.remainingAttempts} attempts left
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-orange-700">Not submitted yet</span>
                  </div>
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    📝 {pref.remainingAttempts} attempts remaining
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* BUTTONS SECTION - CORRECTED */}
          <div className="flex items-center gap-2">
            {/* Edit Button */}
            {!isCancelled && (
              <button
                onClick={() => {
                  const fetchProgramsForEdit = async () => {
                    const token = authHelpers.getToken();
                    try {
                      // Fetch programs for this university
                      const programsRes = await fetch(`/api/students/universities/${pref.universityId}/programs`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      const programsData = await programsRes.json();
                      if (programsData.success && programsData.programs) {
                        setAvailablePrograms(programsData.programs);
                      }

                      // If there's already a program selected, fetch its tracks
                      if (pref.programId && pref.programId !== 0) {
                        const tracksRes = await fetch(`/api/students/programs/${pref.programId}/tracks`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        const tracksData = await tracksRes.json();
                        if (tracksData.success && tracksData.tracks) {
                          setAvailableTracks(tracksData.tracks);
                        }
                      }

                      // Open edit modal
                      setEditingPref({
                        id: pref.id,
                        programId: pref.programId || 0,
                        trackId: pref.admissionTrackId || 0,
                        universityId: pref.universityId,
                        universityName: pref.universityName
                      });
                    } catch (err) {
                      console.error('Error fetching edit data:', err);
                      alert('Failed to load edit options');
                    }
                  };
                  fetchProgramsForEdit();
                }}
                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                title="Edit Program/Track"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            {/* Delete/Cancel Button */}
            {!isCancelled && (
              <button
                onClick={async () => {
                  const reason = prompt('Why are you cancelling this application? (Optional)', 'Student cancelled');
                  if (confirm(`Are you sure you want to cancel ${pref.universityName}?`)) {
                    const token = authHelpers.getToken();
                    const res = await fetch(`/api/students/applications?preferenceId=${pref.id}&reason=${encodeURIComponent(reason || 'Student cancelled')}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.success) {
                      alert('✅ Application cancelled successfully. Record kept for MOE.');
                      await fetchDashboardData();
                    }
                  }
                }}
                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition"
                title="Cancel application"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* ✅ University Documents Button - Upload documents specific to this university */}
            {!isCancelled && (
              <button
                onClick={() => {
                  setSelectedUniversityForDocs(pref);
                  fetchUniversityDocuments(pref.universityId);
                  setShowUniversityDocModal(true);
                }}
                className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition"
                title="Upload Documents for this University (Recommendation Letters, Portfolio, etc.)"
              >
                <Upload className="w-4 h-4" />
              </button>
            )}

            {/* ✅ SUBMIT/RESUBMIT BUTTON with Full Date Validation */}
            {!isCancelled && (
              <button
                onClick={() => {
                  // Get today's date at midnight for fair comparison
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  // Check if application period hasn't started yet
                  if (pref.applicationStartDate) {
                    const startDate = new Date(pref.applicationStartDate);
                    startDate.setHours(0, 0, 0, 0);
                    if (startDate > today) {
                      alert(`📅 Applications for ${pref.universityName} open on ${startDate.toLocaleDateString()} at ${new Date(pref.applicationStartDate).toLocaleTimeString()}\n\nYou cannot submit before the application period starts.`);
                      return;
                    }
                  }

                  // Check if deadline has passed
                  if (pref.universityDeadline) {
                    const deadline = new Date(pref.universityDeadline);
                    deadline.setHours(23, 59, 59, 999);
                    if (deadline < today) {
                      alert(`⏰ Application deadline for ${pref.universityName} was ${deadline.toLocaleDateString()}\n\nYou cannot submit after the deadline has passed.`);
                      return;
                    }
                  }

                  // Check if has attempts left
                  const hasAttemptsLeft = (pref.remainingAttempts || 0) > 0;
                  if (!hasAttemptsLeft) {
                    alert(`❌ You have no remaining submission attempts for ${pref.universityName}. Maximum attempts: 100`);
                    return;
                  }

                  // If all checks pass, proceed with submission
                  if (confirm(`Submit your application to ${pref.universityName}?\n\nRemaining attempts: ${pref.remainingAttempts || 100}`)) {
                    handleSubmitWithRefresh(pref.id, pref.universityName);
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition ${isSubmitted
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
              >
                {submittingPref === pref.id ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  isSubmitted
                    ? `🔄 Resubmit (${pref.remainingAttempts || 0} left)`
                    : `📝 Submit (${pref.remainingAttempts || 0} left)`
                )}
              </button>
            )}

            {/* Submitted Badge - shows remaining attempts */}
            {isSubmitted && !isCancelled && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">
                  {pref.remainingAttempts || 0} attempts left
                </span>
              </div>
            )}

            {/* Cancelled Badge */}
            {isCancelled && (
              <div className="flex flex-col items-end gap-1">
                <span className="px-3 py-1 bg-gray-400 text-white text-sm rounded-full flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  Cancelled
                </span>
                <span className="text-xs text-muted-foreground">
                  Record kept for MOE
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  async function updatePreference(prefId: number, newRank?: number, newProgramId?: number | null, newAdmissionTrackId?: number | null) {
    const token = authHelpers.getToken();
    if (!token) {
      alert('Please login again');
      return false;
    }

    const body: any = { preferenceId: prefId };

    // ✅ Allow programId to be null (meaning "No Program")
    if (newProgramId !== undefined) {
      // Convert 0 to null, otherwise keep the number
      body.programId = (newProgramId === 0 || newProgramId === null) ? null : Number(newProgramId);
    }

    // ✅ Allow admissionTrackId to be null (meaning "No Track")
    if (newAdmissionTrackId !== undefined) {
      body.admissionTrackId = (newAdmissionTrackId === 0 || newAdmissionTrackId === null) ? null : Number(newAdmissionTrackId);
    }

    console.log('Updating preference with:', body);

    try {
      const res = await fetch('/api/students/applications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await fetchDashboardData();
        alert('Preference updated successfully! Please click Submit to send to university.');
        return true;
      } else if (res.status === 404) {
        alert('Preference not found. Refreshing page...');
        await fetchDashboardData();
        return false;
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
    const reason = prompt('Why are you cancelling this application? (Optional)', 'Student cancelled');

    if (!confirm(`Are you sure you want to cancel this preference? This will be recorded for MOE.`)) return;

    const token = authHelpers.getToken();
    if (!token) {
      alert('Please login again');
      return;
    }

    try {
      const res = await fetch(`/api/students/applications?preferenceId=${prefId}&reason=${encodeURIComponent(reason || 'Student cancelled')}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert('✅ Preference cancelled successfully. Record kept for MOE.');
        await fetchDashboardData(); // Refresh to show cancelled status
      } else {
        alert(data.error || 'Cancel failed');
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
      // This is correct - uses PATCH to main endpoint
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
        await fetchDashboardData();
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
    if (!appealForm.description) return;
    try {
      const token = authHelpers.getToken();
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
          target: appealForm.target || 'MOE',
          universityId: appealForm.target === 'UNIVERSITY' ? parseInt(appealForm.universityId) : null
        }),
      });
      const data = await res.json();
      if (data.success) {
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
  // Add this function - Handles submit with fresh data
  async function handleSubmitWithRefresh(prefId: number, universityName: string) {
    const token = authHelpers.getToken();
    if (!token) {
      alert('Please login again');
      return;
    }

    setSubmittingPref(prefId);

    try {
      // First, refresh to get the current preference ID
      const refreshRes = await fetch('/api/students/applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const refreshData = await refreshRes.json();

      if (refreshData.success && refreshData.applications) {
        const currentPref = refreshData.applications.find((p: any) => p.id === prefId);
        if (currentPref) {
          // Use the fresh preference ID
          await submitPreference(currentPref.id, universityName);
        } else {
          alert('Preference not found. Refreshing page...');
          await fetchDashboardData();
        }
      } else {
        alert('Could not refresh data. Please try again.');
      }
    } catch (err) {
      console.error('Refresh error:', err);
      alert('Error refreshing data');
    } finally {
      setSubmittingPref(null);
    }
  }
  // Sidebar navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile & Documents', icon: User },
    { id: 'exam-results', label: 'Exam Results', icon: FileText },
    { id: 'universities', label: 'Universities', icon: University },
    { id: 'preferences', label: 'My Preferences', icon: ClipboardList },
    { id: 'appeal', label: 'Appeals', icon: MessageCircle },
    { id: 'invitations', label: 'My Invitations', icon: Mail },  // ✅ ADD THIS
    { id: 'my-placements', label: '📋 My Placement Offers', icon: Award },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    // { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`min-h-screen bg-muted/30 flex ${darkMode ? 'dark' : ''}`}>
      {darkMode && (
        <style dangerouslySetInnerHTML={{ __html: `
          .dark {
            background-color: #0B132B !important;
            color: #F8FAFC !important;
          }
          .dark aside {
            background-color: #131B2E !important;
            border-right: 1px solid #1E293B !important;
            box-shadow: none !important;
          }
          .dark aside h2, .dark aside span {
            color: #F8FAFC !important;
          }
          .dark aside button {
            color: #94A3B8 !important;
          }
          .dark aside button:hover {
            background-color: #1E293B !important;
            color: #F8FAFC !important;
          }
          .dark aside .bg-blue-50 {
            background-color: #1E293B !important;
            color: #38BDF8 !important;
          }
          .dark aside .bg-blue-50 span {
            color: #38BDF8 !important;
          }
          .dark aside .border-b {
            border-color: #1E293B !important;
          }
          .dark main {
            background-color: #0B132B !important;
          }
          .dark main h1, .dark main h2, .dark main h3, .dark main h4, .dark main span:not(.text-blue-100):not(.text-green-700), .dark main p:not(.text-blue-800):not(.text-green-600) {
            color: #F8FAFC !important;
          }
          .dark main .bg-card border-border {
            background-color: #131B2E !important;
            border-color: #1E293B !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1) !important;
          }
          .dark main .border, .dark main .border-gray-100, .dark main .border-border {
            border-color: #1E293B !important;
          }
          .dark main input, .dark main select {
            background-color: #0B132B !important;
            border-color: #1E293B !important;
            color: #F8FAFC !important;
          }
          .dark main .bg-blue-50 {
            background-color: #1E293B !important;
            border-color: #1E293B !important;
          }
          .dark main .bg-blue-50 p {
            color: #38BDF8 !important;
          }
          .dark main .bg-muted/30 {
            background-color: #131B2E !important;
            border-color: #1E293B !important;
          }
          .dark main .hover\:bg-gray-50:hover {
            background-color: #1E293B !important;
          }
          .dark main .text-foreground {
            color: #F8FAFC !important;
          }
          .dark main .text-muted-foreground {
            color: #94A3B8 !important;
          }
          .dark main .text-muted-foreground {
            color: #64748B !important;
          }
        `}} />
      )}
      {/* Sidebar */}
      <aside className="w-72 bg-white/80 backdrop-blur-md shadow-xl fixed h-full overflow-y-auto z-10 border-r border-border">
        <div className="p-8 border-b border-border text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-10"></div>
          <div className="flex flex-col items-center gap-4 relative z-10">
            {profile.photo ? (
              <img src={profile.photo} className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white" />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-lg border-4 border-white">
                {profile.firstName[0]}{profile.lastName[0]}
              </div>
            )}
            <div>
              <h2 className="font-bold text-xl text-foreground tracking-tight">{profile.firstName} {profile.lastName}</h2>
              <p className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full mt-2 inline-block shadow-sm">ID: {profile.examID}</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'invitations') {
                  router.push('/student/invitations');
                } else if (item.id === 'my-placements') {
                  router.push('/student/placements');
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${activeTab === item.id && item.id !== 'invitations' && item.id !== 'my-placements' ? 'bg-gradient-to-r from-blue-50 to-indigo-50/50 text-blue-700 shadow-sm border-l-4 border-blue-600' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground hover:translate-x-1'}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-gray-100 mt-8 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {darkMode ? (
              <>
                <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M6.343 17.657L5.636 18.364m12.728-12.728l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span>Dark Mode</span>
              </>
            )}
          </button>
          <button
            onClick={() => { authHelpers.removeToken(); router.push('/student/login'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 mt-2"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-72 flex-1 p-8 xl:p-12 relative min-h-screen overflow-hidden bg-slate-50">
        {/* Dynamic Mesh Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob"></div>
          <div className="absolute top-40 -right-20 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-40 left-20 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-4000"></div>
        </div>

        {/* Dashboard Home */}
        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="mb-12">
              <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Welcome back, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                  {profile.firstName} {profile.lastName}
                </span>
              </h1>
              <p className="text-slate-600 mt-3 font-medium text-lg flex items-center gap-2">
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-sm font-bold tracking-widest uppercase">ID: {profile.examID}</span> 
                Here is your application overview.
              </p>
            </div>

            {/* Application Journey Timeline */}
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 p-10 mb-12 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 h-full"></div>
              <h2 className="text-2xl font-black mb-10 text-slate-800 tracking-tight flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Award className="w-4 h-4 text-white" />
                </div>
                Your Application Journey
              </h2>
              
              <div className="flex items-center justify-between relative px-6">
                {/* Connecting Solid Line Track */}
                <div className="absolute top-7 left-16 right-16 h-2 bg-slate-100 rounded-full -z-10 shadow-inner"></div>
                
                {/* Active connecting line fill - could be dynamic based on progress */}
                <div className="absolute top-7 left-16 right-16 h-2 bg-gradient-to-r from-green-400 via-blue-500 to-slate-100 rounded-full -z-10 opacity-70"></div>

                {/* Step 1: Profile Complete */}
                <div className="flex flex-col items-center w-1/4 group cursor-pointer">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 group-hover:-translate-y-1 ${profile.isRegistered ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-4 ring-emerald-50' : 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.4)] ring-4 ring-blue-50'}`}>
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="text-center text-sm font-black mt-4 text-slate-800 tracking-tight">Profile</p>
                  <p className="text-xs text-emerald-600 text-center mt-1 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Complete</p>
                </div>

                {/* Step 2: Documents */}
                <div className="flex flex-col items-center w-1/4 group cursor-pointer">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 group-hover:-translate-y-1 ${documents.length > 0 && documents.every(d => d.verificationStatus === 'VERIFIED') ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-4 ring-emerald-50' : documents.length > 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-4 ring-amber-50' : 'bg-slate-200 text-slate-400 shadow-none ring-4 ring-slate-50'}`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-center text-sm font-black mt-4 text-slate-800 tracking-tight">Documents</p>
                  <p className={`text-xs text-center mt-1 font-bold px-3 py-1 rounded-full border ${documents.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {documents.filter(d => d.verificationStatus === 'VERIFIED').length}/{documents.length}
                  </p>
                </div>

                {/* Step 3: Preferences */}
                <div className="flex flex-col items-center w-1/4 group cursor-pointer">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 group-hover:-translate-y-1 ${preferences.length >= 3 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-4 ring-emerald-50' : preferences.length > 0 ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.4)] ring-4 ring-blue-50' : 'bg-slate-200 text-slate-400 shadow-none ring-4 ring-slate-50'}`}>
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <p className="text-center text-sm font-black mt-4 text-slate-800 tracking-tight">Preferences</p>
                  <p className={`text-xs text-center mt-1 font-bold px-3 py-1 rounded-full border ${preferences.length > 0 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {preferences.length} added
                  </p>
                </div>

                {/* Step 4: Results */}
                <div className="flex flex-col items-center w-1/4 group cursor-pointer">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 group-hover:-translate-y-1 ${placement && placement.status === 'PLACED' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-4 ring-emerald-50' : placement ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.4)] ring-4 ring-blue-50' : 'bg-slate-200 text-slate-400 shadow-none ring-4 ring-slate-50'}`}>
                    <Award className="w-6 h-6" />
                  </div>
                  <p className="text-center text-sm font-black mt-4 text-slate-800 tracking-tight">Placement</p>
                  <p className="text-xs text-slate-500 text-center mt-1 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    {placement ? placement.status : 'Pending'}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] transition-all duration-300 group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Exam Score</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">{profile.totalScore}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(16,185,129,0.15)] transition-all duration-300 group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Preferences</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">{preferences.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(168,85,247,0.15)] transition-all duration-300 group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                    <FileCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Documents</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">{documents.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(249,115,22,0.15)] transition-all duration-300 group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Unread</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">{notifications.filter(n => !n.read).length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Document Status */}
              <div className="lg:col-span-2 bg-white/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 p-8">
                <h2 className="text-xl font-black mb-6 text-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <FileCheck className="w-4 h-4 text-white" />
                  </div>
                  Document Status
                </h2>
                {documents.length === 0 ? (
                  <div className="text-center py-12 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No documents uploaded yet</p>
                    <button onClick={() => setActiveTab('profile')} className="mt-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 px-6 py-2 rounded-full text-sm font-bold transition-colors">Upload Documents →</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-5 bg-white/80 border border-white rounded-2xl hover:bg-card border-border shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all">
                        <div className="flex items-center gap-5 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                            <FileText className="w-6 h-6 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-base">{doc.name}</p>
                            <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">{new Date(doc.uploadDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.verificationStatus === 'VERIFIED' ? (
                            <span className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-sm border border-emerald-100">
                              <CheckCircle className="w-4 h-4" /> Verified
                            </span>
                          ) : doc.verificationStatus === 'REJECTED' ? (
                            <span className="flex items-center gap-2 text-rose-700 bg-rose-50 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-sm border border-rose-100">
                              <XCircle className="w-4 h-4" /> Rejected
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-amber-700 bg-amber-50 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-sm border border-amber-100">
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
              <div className="bg-slate-900 text-white rounded-3xl shadow-[0_20px_40px_rgba(15,23,42,0.3)] border border-slate-800 p-8 relative overflow-hidden">
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600 rounded-full mix-blend-screen filter blur-[80px] opacity-60"></div>
                
                <h2 className="text-xl font-black mb-8 text-white relative z-10">Quick Actions</h2>
                <div className="space-y-4 relative z-10">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="w-full flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 hover:-translate-y-1 rounded-2xl transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/40 transition-colors">
                      <Upload className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="font-bold text-sm tracking-wide">Upload Documents</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('universities')}
                    className="w-full flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 hover:-translate-y-1 rounded-2xl transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/40 transition-colors">
                      <Search className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="font-bold text-sm tracking-wide">Find Universities</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('preferences')}
                    className="w-full flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 hover:-translate-y-1 rounded-2xl transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/40 transition-colors">
                      <ClipboardList className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="font-bold text-sm tracking-wide">Manage Preferences</span>
                  </button>
                  {placement && (
                    <button
                      onClick={() => router.push('/student/placements')}
                      className="w-full flex items-center gap-4 p-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 hover:border-orange-500/50 hover:-translate-y-1 rounded-2xl transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-500/30 flex items-center justify-center group-hover:bg-orange-500/50 transition-colors">
                        <Award className="w-5 h-5 text-orange-400" />
                      </div>
                      <span className="font-bold text-sm tracking-wide text-orange-100">Check Placement</span>
                    </button>
                  )}

                </div>
                <button
                  onClick={() => {
                    fetchGeneralDocuments();
                    setShowGeneralDocModal(true);
                  }}
                  className="w-full flex items-center gap-3 p-4 mt-3 bg-muted/30 border border-border hover:bg-gray-100 hover:-translate-y-0.5 rounded-xl transition-all text-left font-semibold text-muted-foreground"
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload General Docs</span>
                </button>
              </div>
            </div>

            {/* Placement Status */}
            {placement && (
              <div className="mt-6 bg-card border-border rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                <h2 className="text-lg font-bold mb-4">Your Placement</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">University</p>
                    <p className="text-lg font-semibold text-foreground">{placement.universityName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Program</p>
                    <p className="text-lg font-semibold text-foreground">{placement.programName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Status</p>
                    <p className={`text-lg font-bold ${placement.status === 'PLACED' ? 'text-green-600' : 'text-red-600'}`}>
                      {placement.status === 'PLACED' ? '✓ Accepted' : placement.status === 'NOT_PLACED' ? '✗ Not Placed' : 'Pending'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Deadline</p>
                    <p className="text-lg font-semibold text-foreground">{new Date(placement.confirmationDeadline).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Notifications */}
            {notifications.length > 0 && (
              <div className="mt-6 bg-card border-border rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">Recent Notifications</h2>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {notifications.slice(0, 5).map(n => (
                    <div key={n.id} className={`p-3 rounded-lg ${!n.read ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-muted/30'}`}>
                      <p className="font-semibold text-sm">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
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
              <h1 className="text-3xl font-bold text-foreground">Profile & Documents</h1>
              <p className="text-muted-foreground mt-1">Manage your account information and upload required documents</p>
            </div>

            {/* Personal Information */}
            <div className="bg-card border-border rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-bold mb-6">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exam ID</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{profile.examID}</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{profile.firstName} {profile.lastName}</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</p>
                  <p className="text-lg font-semibold text-foreground mt-1 flex items-center gap-2">
                    {profile.email}
                    {profile.emailVerified ? (
                      <CheckCircle className="w-5 h-5 text-green-500" title="Verified" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" title="Not verified" />
                    )}
                  </p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{profile.phone || 'Not provided'}</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Region</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{profile.region || 'Not specified'}</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date of Birth</p>
                  <p className="text-lg font-semibold text-foreground mt-1">
                    {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gender</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{profile.gender || 'Not specified'}</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Disability Status</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{profile.disability}</p>
                </div>
                <div className="pb-4 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stream</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{profile.stream}</p>
                </div>
              </div>

              {/* Dynamic Attributes */}
              <CustomAttributes attributes={profile.customAttributes} theme="blue" />
            </div>

            {/* Security Section */}
            <div className="bg-card border-border rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-muted-foreground" />
                Security
              </h2>
              <div className="max-w-md">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {passwordMessage.text && (
                    <div className={`p-3 rounded-md text-sm font-medium ${
                      passwordMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                      {passwordMessage.text}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-1">Current Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-1">New Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-70 flex items-center justify-center min-w-[140px]"
                  >
                    {passwordLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Change Password'}
                  </button>
                </form>
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-card border-border rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-6">Required Documents</h2>

              {/* Upload Area */}
              <div className="mb-8 p-6 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <label htmlFor="document-upload" className="cursor-pointer">
                    <span className="font-semibold text-foreground hover:text-blue-600">Click to upload</span>
                    <span className="text-muted-foreground"> or drag and drop</span>
                  </label>
                  <p className="text-sm text-muted-foreground mt-2">PDF, JPG, or PNG (max 10MB)</p>
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
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground mb-4">Uploaded Documents ({documents.length})</h3>
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition">
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
                          <p className="text-sm text-muted-foreground mt-1">{new Date(doc.uploadDate).toLocaleDateString()}</p>
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-8">
              <h1 className="text-4xl font-black text-foreground tracking-tighter">Exam Results</h1>
              <p className="text-muted-foreground font-medium mt-1">Official national examination scores</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-2xl shadow-blue-500/20 col-span-1 md:col-span-2">
                 <div className="flex justify-between items-start">
                   <div>
                     <p className="text-blue-100 font-black uppercase tracking-widest text-xs mb-2">Examination Stream</p>
                     <h2 className="text-3xl font-black tracking-tight">{profile.stream}</h2>
                   </div>
                   <Award className="w-12 h-12 text-blue-200/50" />
                 </div>
                 <div className="mt-12">
                   <p className="text-blue-100 font-black uppercase tracking-widest text-xs mb-2">Total Score</p>
                   <div className="flex items-baseline gap-2">
                     <span className="text-6xl font-black tracking-tighter">{profile.totalScore}</span>
                     <span className="text-blue-200 font-bold text-xl">/ {profile.maxScore || 700}</span>
                   </div>
                 </div>
               </div>

               {/* <div className="bg-card border-border rounded-[2rem] p-8 border-2 border-border shadow-sm flex flex-col justify-center">
                 <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px] mb-4">Percentile Ranking</p>
                 <div className="text-5xl font-black text-foreground tracking-tighter mb-2">
                   {((profile.totalScore / 700) * 100).toFixed(1)}%
                 </div>
                 <p className="text-muted-foreground text-sm font-medium">Top candidate performance in the {profile.academicYear} academic year.</p>
               </div> */}
            </div>

            <h2 className="text-xl font-black text-foreground mb-6 flex items-center gap-3">
               <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
               Subject Performance Breakdown
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(profile.subjects && profile.subjects.length > 0 ? profile.subjects : 
                Object.entries(profile.examResults)
                  .filter(([subj]) => subj.toLowerCase() !== 'total')
                  .map(([name, score]) => ({ name, score }))
              ).map((subj: any, index: number) => (
                <div key={`${subj.name}-${index}`} className="bg-card border-border p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative z-10">
                    <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px] mb-1">{subj.name}</p>
                    <div className="flex justify-between items-end">
                      <span className="text-3xl font-black text-foreground tracking-tighter">{subj.score}</span>
                      <span className="text-gray-300 font-bold text-sm mb-1">pts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admission Tracks */}


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
                <div key={uni.id} className="bg-card border-border rounded-xl shadow-sm p-4 flex justify-between items-center">
                  <div><h3 className="font-semibold">{uni.name}</h3><p className="text-sm text-muted-foreground">{uni.region} | {uni.type}</p></div>
                  <div className="flex gap-2">
                    <button onClick={() => window.open(`/university/${uni.id}`, '_blank')} className="px-3 py-1 text-blue-600 border border-blue-600 rounded-lg">View Profile</button>
                    {/* <button onClick={() => setCompareList(prev => prev.includes(uni) ? prev.filter(u => u.id !== uni.id) : [...prev, uni])} className={`px-3 py-1 rounded-lg ${compareList.includes(uni) ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Compare</button> */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Preferences */}
        {activeTab === 'preferences' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">My Preferences</h1>
              <p className="text-muted-foreground mt-1">Build your ranked list of university preferences by admission track</p>
            </div>

            {/* Info Banner */}

            {/* Add New Preference */}
            {/* Add New Preference */}
            {/* Info Banner - Add this back */}
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
            <div className="bg-card border-border rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">Add University Preference</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-1">University</label>
                  <select
                    value={newPreference.universityId}
                    onChange={e => {
                      setNewPreference({ ...newPreference, universityId: parseInt(e.target.value), programId: 0, admissionTrackId: 0 });
                    }}
                    className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Choose university...</option>
                    {universities
                      .filter(u => !preferences.some(p => p.universityId === u.id))
                      .map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-1">Program (Optional)</label>
                  <select
                    value={newPreference.programId}
                    onChange={e => {
                      const programId = parseInt(e.target.value);
                      setNewPreference({ ...newPreference, programId: programId, admissionTrackId: 0 });
                    }}
                    className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!newPreference.universityId}
                  >
                    <option value={0}>-- No Program (Apply to University only) --</option>
                    {availablePrograms.map(program => (
                      <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Select a specific program or leave as "No Program"</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-1">Admission Track (Optional)</label>
                  <select
                    value={newPreference.admissionTrackId}
                    onChange={e => setNewPreference({ ...newPreference, admissionTrackId: parseInt(e.target.value) })}
                    className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!newPreference.programId}
                  >
                    <option value={0}>-- No Track (Use default admission) --</option>
                    {availableTracks.map(track => (
                      <option key={track.id} value={track.id}>{track.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Select a specific track or leave as "No Track"</p>
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
            <div className="bg-card border-border rounded-xl shadow-sm p-6">
              <div className="bg-card border-border rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold">Your Preferences</h2>
                    <p className="text-sm text-muted-foreground mt-1">{preferences.length} preference(s) added</p>
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
                    <p className="text-muted-foreground font-medium">No preferences added yet</p>
                    <p className="text-muted-foreground text-sm mt-1">Add your university preferences above</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {preferences.map((pref, index) => renderPreferenceCard(pref, index + 1))}
                  </div>
                )}
              </div>


            </div>

            {/* Confirmation Modal */}
            {showFinalSubmitConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-card border-border rounded-xl w-full max-w-md shadow-2xl">
                  <div className="p-6 border-b">
                    <h3 className="text-xl font-bold text-foreground">Confirm Submission</h3>
                  </div>
                  <div className="p-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-yellow-900 font-semibold text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        This action cannot be undone
                      </p>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      You are about to submit your final preference list of <span className="font-bold">{preferences.length}</span> preference(s).
                    </p>
                    <p className="text-muted-foreground text-sm mb-6">
                      After submission, you will have <span className="font-bold">{Math.max(0, submissionAttemptsLeft - 1)}</span> attempt(s) remaining.
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto mb-6 p-4 bg-muted/30 rounded-lg">
                      {preferences.sort((a, b) => a.rank - b.rank).map((pref, index) => (
                        <div key={pref.id} className="flex gap-2 text-sm">
                          <span className="font-bold text-blue-600 w-6">{index + 1}.</span>
                          <span className="text-muted-foreground">{pref.universityName} - {pref.programName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 p-6 border-t bg-muted/30 rounded-b-xl">
                    <button
                      onClick={() => setShowFinalSubmitConfirm(false)}
                      className="px-4 py-2 border border-border rounded-lg font-semibold text-muted-foreground hover:bg-gray-100 transition"
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

        {/* Appeals to MoE or Universities */}
        {activeTab === 'appeal' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">My Appeals Portal</h1>
              <p className="text-muted-foreground mt-1">Submit and track your appeals directly with the Ministry of Education or specific Universities</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Appeals List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-card border-border rounded-xl shadow-sm p-6">
                  {/* Category sub-tabs */}
                  <div className="flex border-b border-gray-150 mb-6">
                    <button
                      onClick={() => setAppealSubTab('MOE')}
                      className={`pb-4 px-6 text-sm font-bold transition-all relative ${
                        appealSubTab === 'MOE'
                          ? 'text-purple-600 border-b-2 border-purple-600'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Ministry of Education ({appeals.filter(a => a.target === 'MOE').length})
                    </button>
                    <button
                      onClick={() => setAppealSubTab('UNIVERSITY')}
                      className={`pb-4 px-6 text-sm font-bold transition-all relative ${
                        appealSubTab === 'UNIVERSITY'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      University Appeals ({appeals.filter(a => a.target === 'UNIVERSITY').length})
                    </button>
                  </div>

                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold">
                      {appealSubTab === 'MOE' ? 'MoE Appeals' : 'University Appeals'} History
                    </h2>
                    <span className="text-xs font-medium text-muted-foreground">
                      {appeals.filter(a => appealSubTab === 'MOE' ? a.target === 'MOE' : a.target === 'UNIVERSITY').length} Total
                    </span>
                  </div>

                  {appeals.filter(a => appealSubTab === 'MOE' ? a.target === 'MOE' : a.target === 'UNIVERSITY').length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">No appeals in this category yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Need help? File a new appeal using the form on the right.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {appeals
                        .filter(a => appealSubTab === 'MOE' ? a.target === 'MOE' : a.target === 'UNIVERSITY')
                        .map(ap => {
                          const isMoe = ap.target === 'MOE';
                          return (
                            <div key={ap.id} className="p-5 border rounded-2xl hover:shadow-md transition-all duration-300 group border-border hover:border-orange-200">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                      isMoe ? 'text-purple-600 bg-purple-50' : 'text-blue-600 bg-blue-50'
                                    }`}>
                                      #{ap.id} • {ap.type}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                      {new Date(ap.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  {ap.preference && (
                                    <p className="text-sm font-bold text-foreground">
                                      Target: {ap.preference.university?.name || 'N/A'}
                                      <span className="mx-2 text-gray-300">|</span>
                                      <span className="text-muted-foreground font-medium">{ap.preference.program?.name || 'General Appeal'}</span>
                                    </p>
                                  )}
                                  {!ap.preference && ap.university?.name && (
                                    <p className="text-sm font-bold text-foreground">
                                      Target University: <span className="text-blue-600 font-semibold">{ap.university.name}</span>
                                    </p>
                                  )}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                  ap.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                  ap.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {ap.status}
                                </span>
                              </div>
                              <p className="text-muted-foreground text-sm italic bg-muted/30 p-3 rounded-xl border border-border">
                                "{ap.description}"
                              </p>

                              {/* Resolutions display based on colors requested */}
                              {ap.status === 'pending' && (
                                <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100 animate-in fade-in slide-in-from-top-1 flex items-center gap-2">
                                  <Clock size={14} className="text-yellow-600 animate-pulse" />
                                  <p className="text-xs font-semibold text-yellow-800">
                                    Pending: This appeal is currently being reviewed by the {isMoe ? 'Ministry of Education' : 'University'}.
                                  </p>
                                </div>
                              )}

                              {ap.status === 'resolved' && ap.resolution && (
                                <div className={`mt-4 p-4 rounded-xl border animate-in fade-in slide-in-from-top-1 ${
                                  isMoe ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-blue-50 border-blue-100 text-blue-700'
                                }`}>
                                  <p className={`text-[10px] font-black mb-2 uppercase tracking-widest flex items-center gap-1 ${
                                    isMoe ? 'text-purple-800' : 'text-blue-800'
                                  }`}>
                                    <CheckCircle size={12} /> {isMoe ? 'MoE Resolution' : `${ap.university?.name || 'University'} Response`}
                                  </p>
                                  <p className="text-sm font-medium">{ap.resolution}</p>
                                </div>
                              )}

                              {ap.status === 'rejected' && ap.resolution && (
                                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-1">
                                  <p className="text-[10px] font-black text-red-800 mb-2 uppercase tracking-widest flex items-center gap-1">
                                    <XCircle size={12} className="text-red-600" /> Rejection Notes ({isMoe ? 'Ministry of Education' : 'University'})
                                  </p>
                                  <p className="text-sm text-red-700 font-medium">{ap.resolution}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* New Appeal Form */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-8 text-white shadow-xl shadow-orange-500/20">
                  <h2 className="text-xl font-black tracking-tight mb-2">New Appeal</h2>
                  <p className="text-orange-100 text-xs leading-relaxed opacity-90">
                    Submit your petition regarding placement decisions, eligibility requirements, or technical errors to MoE or a university.
                  </p>
                </div>

                <div className="bg-card border-border rounded-3xl shadow-sm p-8 border border-border">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-3">Submit Appeal To</label>
                      <select
                        className="w-full bg-muted/30 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all appearance-none cursor-pointer"
                        value={appealForm.target || 'MOE'}
                        onChange={e => {
                          const val = e.target.value;
                          setAppealForm({
                            ...appealForm,
                            target: val,
                            universityId: val === 'UNIVERSITY' && preferences.length > 0 ? String(preferences[0].universityId) : ''
                          });
                        }}
                      >
                        <option value="MOE">Ministry of Education (MoE)</option>
                        <option value="UNIVERSITY">University</option>
                      </select>
                    </div>

                    {appealForm.target === 'UNIVERSITY' && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-3">Select Target University</label>
                        <select
                          className="w-full bg-muted/30 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all appearance-none cursor-pointer"
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
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-3">Appeal Type</label>
                      <select
                        className="w-full bg-muted/30 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all appearance-none cursor-pointer"
                        value={appealForm.type || 'placement'}
                        onChange={e => setAppealForm({ ...appealForm, type: e.target.value })}
                      >
                        <option value="placement">Placement Reconsideration</option>
                        <option value="eligibility">Eligibility Dispute</option>
                        <option value="technical">Technical Error</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-3">Related Preference</label>
                      <select
                        className="w-full bg-muted/30 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all appearance-none cursor-pointer"
                        value={appealForm.preferenceId || ''}
                        onChange={e => setAppealForm({ ...appealForm, preferenceId: e.target.value })}
                      >
                        <option value="">General (Not Preference Related)</option>
                        {preferences.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.universityName} - {p.programName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-3">Description</label>
                      <textarea
                        className="w-full bg-muted/30 border-none rounded-2xl p-5 text-sm font-medium focus:ring-2 focus:ring-orange-500 resize-none min-h-[160px]"
                        placeholder="Explain your case in detail..."
                        value={appealForm.description || ''}
                        onChange={e => setAppealForm({ ...appealForm, description: e.target.value })}
                      />
                    </div>

                    <button
                      onClick={submitAppeal}
                      disabled={!appealForm.description || (appealForm.target === 'UNIVERSITY' && !appealForm.universityId)}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 disabled:text-muted-foreground text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-orange-600/20"
                    >
                      {appealForm.target === 'UNIVERSITY' 
                        ? `Submit Appeal to ${preferences.find(p => String(p.universityId) === appealForm.universityId)?.universityName || 'University'}` 
                        : 'Submit Appeal to MoE'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placement Offers */}
        {activeTab === 'my-placements' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">📋 My Placement Offers</h1>
              <p className="text-muted-foreground mt-1">Official placement results from the Ministry of Education</p>
            </div>

            {placement ? (
              <div className="bg-card border-border rounded-2xl shadow-xl border-2 border-blue-500 overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Award className="w-8 h-8" />
                    <div>
                      <h2 className="text-xl font-bold">Official Placement Result</h2>
                      <p className="text-blue-100 text-sm">Academic Year 2024/25</p>
                    </div>
                  </div>
                  <div className="bg-white/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Status: {placement.status}
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div>
                      <div className="mb-6">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Assigned University</p>
                        <h3 className="text-3xl font-black text-foreground tracking-tight">{placement.universityName}</h3>
                      </div>

                      <div className="mb-8">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Assigned Program</p>
                        <h4 className="text-xl font-bold text-blue-700">{placement.programName}</h4>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 p-4 rounded-2xl border border-border">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span>Decision Date: {new Date(placement.decisionDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 p-4 rounded-2xl border border-border">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <span>Confirmation Deadline: {new Date(placement.confirmationDeadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-[40px] p-10 border border-blue-100 text-center">
                      {placement.confirmedAt ? (
                        <div className="animate-in zoom-in duration-700">
                          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-green-200">
                            <CheckCircle size={48} />
                          </div>
                          <h4 className="text-2xl font-black text-green-700 mb-2">Offer Confirmed!</h4>
                          <p className="text-green-600 text-sm font-medium">Confirmed on {new Date(placement.confirmedAt).toLocaleString()}</p>
                          <button className="mt-8 px-6 py-2 bg-card border-border text-green-700 rounded-full text-xs font-black uppercase tracking-widest border border-green-200 shadow-sm">
                            Download Certificate
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-6">
                            <University size={40} />
                          </div>
                          <h4 className="text-2xl font-black text-blue-900 mb-4 tracking-tight">Accept Your Placement</h4>
                          <p className="text-blue-700 text-sm mb-10 leading-relaxed font-medium">
                            Congratulations! Please confirm your acceptance of this placement offer before the deadline to secure your official spot.
                          </p>
                          <button
                            onClick={() => alert('Confirming placement...')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-blue-600/30"
                          >
                            Confirm Acceptance
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card border-border rounded-[40px] shadow-sm p-24 text-center border-2 border-dashed border-border">
                <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center text-gray-200 mx-auto mb-8">
                  <Award size={48} />
                </div>
                <h2 className="text-2xl font-black text-gray-300 mb-3 tracking-tight">No Placement Result Yet</h2>
                <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed text-sm font-medium">
                  The Ministry of Education has not yet published the official placement results. We'll notify you as soon as they're available!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Notifications</h1>
            <div className="bg-card border-border rounded-xl shadow-sm p-6">
              {notifications.map(n => (
                <div key={n.id} className={`p-4 border-b ${!n.read ? 'bg-blue-50' : ''}`}>
                  <div className="flex justify-between"><h3 className="font-semibold">{n.title}</h3><span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span></div>
                  <p className="text-muted-foreground mt-1">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Settings</h1>
            <div className="bg-card border-border rounded-xl shadow-sm p-6">
              <h2 className="font-semibold mb-4">Account Security</h2>
              <button className="w-full text-left p-3 border rounded mb-2">Change Password</button>
              <button className="w-full text-left p-3 border rounded mb-2">Manage Recovery Contacts</button>
              <button className="w-full text-left p-3 border rounded">View Active Sessions</button>
            </div>
          </div>
        )}

        <button
          key="my-placements"
          onClick={() => router.push('/student/placements')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
        >
          <Award className="w-5 h-5" />
          <span>My Placement Offers</span>
        </button>
      </main>
      {/* Edit Program/Track Modal */}
      {editingPref && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-foreground">Edit Program & Track</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {editingPref.universityName}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Program Selection */}
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2">
                  Program
                </label>
                <select
                  className="w-full border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingPref.programId}
                  onChange={async (e) => {
                    const newProgramId = parseInt(e.target.value);

                    // Fetch tracks for the selected program
                    const token = authHelpers.getToken();
                    const trackRes = await fetch(`/api/students/programs/${newProgramId}/tracks`, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const trackData = await trackRes.json();

                    if (trackData.success && trackData.tracks) {
                      setAvailableTracks(trackData.tracks);
                    }

                    setEditingPref({
                      ...editingPref,
                      programId: newProgramId,
                      trackId: 0
                    });
                  }}
                >
                  <option value={0}>-- No Program (Apply to University only) --</option>
                  {availablePrograms.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Track Selection */}
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2">
                  Admission Track
                </label>
                <select
                  className="w-full border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  value={editingPref.trackId}
                  onChange={(e) => setEditingPref({ ...editingPref, trackId: parseInt(e.target.value) })}
                  disabled={!editingPref.programId}
                >
                  <option value={0}>-- No Track (Use default admission) --</option>
                  {availableTracks.map(track => (
                    <option key={track.id} value={track.id}>
                      {track.name}
                    </option>
                  ))}
                </select>
                {!editingPref.programId && (
                  <p className="text-xs text-muted-foreground mt-1">Please select a program first</p>
                )}
              </div>

              {/* Warning Message */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  After editing, you must click "Resubmit" for changes to be sent to the university.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-muted/30 rounded-b-xl">
              <button
                onClick={() => {
                  setEditingPref(null);
                  setAvailablePrograms([]);
                  setAvailableTracks([]);
                }}
                className="px-4 py-2 border border-border rounded-lg font-semibold text-muted-foreground hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Convert 0 to null for database
                  const finalProgramId = editingPref.programId === 0 ? null : editingPref.programId;
                  const finalTrackId = editingPref.trackId === 0 ? null : editingPref.trackId;

                  await updatePreference(
                    editingPref.id,
                    undefined,
                    finalProgramId,
                    finalTrackId
                  );
                  setEditingPref(null);
                  setAvailablePrograms([]);
                  setAvailableTracks([]);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* General Documents Modal */}
      {showGeneralDocModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-card border-border border-b p-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-foreground">General Documents</h3>
                <p className="text-sm text-muted-foreground">(For all universities)</p>
              </div>
              <button onClick={() => setShowGeneralDocModal(false)} className="text-muted-foreground hover:text-muted-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50 mb-4">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm">
                    Upload General Document
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const docType = prompt('Enter document type (e.g., Transcript, ID Card):');
                          if (docType) {
                            await uploadGeneralDocument(e.target.files[0], docType);
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              {generalDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No general documents uploaded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {generalDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">Type: {doc.type} | Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}</p>
                          <p className="text-xs">Status: {doc.verificationStatus === 'VERIFIED' ? '✅ Verified' : doc.verificationStatus === 'REJECTED' ? '❌ Rejected' : '⏳ Pending'}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteDocument(doc.id, false)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* University-Specific Documents Modal */}
      {showUniversityDocModal && selectedUniversityForDocs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-card border-border border-b p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Documents for {selectedUniversityForDocs.universityName}</h3>
                  <p className="text-sm text-muted-foreground">(Specific to this university)</p>
                </div>
                <button onClick={() => setShowUniversityDocModal(false)} className="text-muted-foreground hover:text-muted-foreground">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50 mb-4">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                    Upload University Document
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const docType = prompt('Enter document type (e.g., Recommendation Letter, Portfolio):');
                          if (docType) {
                            await uploadUniversityDocument(
                              e.target.files[0],
                              docType,
                              selectedUniversityForDocs.universityId,
                              selectedUniversityForDocs.id
                            );
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              {universityDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No documents uploaded for this university yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {universityDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">Type: {doc.type} | Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}</p>
                          <p className="text-xs">Status: {doc.verificationStatus === 'VERIFIED' ? '✅ Verified' : doc.verificationStatus === 'REJECTED' ? '❌ Rejected' : '⏳ Pending'}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteDocument(doc.id, true, selectedUniversityForDocs.universityId)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
