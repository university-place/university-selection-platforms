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
  placementId: number;
  reason: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  responseMessage?: string;
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
  const [availablePrograms, setAvailablePrograms] = useState<{ id: number; name: string }[]>([]);
  const [availableTracks, setAvailableTracks] = useState<{ id: number; name: string }[]>([]);
  const [editingPreferenceId, setEditingPreferenceId] = useState<number | null>(null);
  const [appealForm, setAppealForm] = useState({ reason: '', document: null as File | null });
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);
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

        setPreferences(preferencesWithDates);

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
      <div key={pref.id} className={`bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition border-l-4 ${isCancelled ? 'border-l-gray-400 bg-gray-50' : 'border-l-blue-500'}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {/* Header section */}
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                {displayIndex}
              </span>
              <h4 className="font-semibold text-lg text-gray-900">{pref.universityName}</h4>
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
              <p className="text-sm text-gray-700">
                <span className="font-medium">Program:</span>
                {pref.programName && pref.programName !== 'Program not found'
                  ? pref.programName
                  : 'Not specified (University only)'}
              </p>
              <p className="text-sm text-gray-700">
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
                    <XCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-500">
                      Cancelled on {pref.cancelledAt ? new Date(pref.cancelledAt).toLocaleString() : 'Unknown date'}
                    </span>
                  </div>
                  {pref.cancelledReason && (
                    <div className="text-xs text-gray-400 ml-6">
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
                    📝 {pref.remainingAttempts || 100} attempts remaining
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
                    ? `🔄 Resubmit (${pref.remainingAttempts || 100} left)`
                    : `📝 Submit (${pref.remainingAttempts || 100} left)`
                )}
              </button>
            )}

            {/* Submitted Badge - shows remaining attempts */}
            {isSubmitted && !isCancelled && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-gray-400">
                  {pref.remainingAttempts || 100} attempts left
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
                <span className="text-xs text-gray-400">
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
    if (!appealForm.reason) return;
    const token = authHelpers.getToken();
    const formData = new FormData();
    formData.append('placementId', placement!.id.toString());
    formData.append('reason', appealForm.reason);
    if (appealForm.document) formData.append('document', appealForm.document);
    const res = await fetch('/api/students/appeals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      setShowAppealModal(false);
      fetchDashboardData();
    } else alert(data.error);
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
    { id: 'apeal', label: ' Appeal', icon: FileCheck },
    { id: 'invitations', label: 'My Invitations', icon: Mail },  // ✅ ADD THIS
    { id: 'my-placements', label: '📋 My Placement Offers', icon: Award },
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
  onClick={() => {
    if (item.id === 'invitations') {
      router.push('/student/invitations');
    } else {
      setActiveTab(item.id);
    }
  }}
  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id && item.id !== 'invitations' ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
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
                <button
                  onClick={() => {
                    fetchGeneralDocuments();
                    setShowGeneralDocModal(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition text-left font-medium text-purple-700"
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload General Documents</span>
                </button>
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
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Program (Optional)</label>
                  <select
                    value={newPreference.programId}
                    onChange={e => {
                      const programId = parseInt(e.target.value);
                      setNewPreference({ ...newPreference, programId: programId, admissionTrackId: 0 });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!newPreference.universityId}
                  >
                    <option value={0}>-- No Program (Apply to University only) --</option>
                    {availablePrograms.map(program => (
                      <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select a specific program or leave as "No Program"</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Admission Track (Optional)</label>
                  <select
                    value={newPreference.admissionTrackId}
                    onChange={e => setNewPreference({ ...newPreference, admissionTrackId: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!newPreference.programId}
                  >
                    <option value={0}>-- No Track (Use default admission) --</option>
                    {availableTracks.map(track => (
                      <option key={track.id} value={track.id}>{track.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select a specific track or leave as "No Track"</p>
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
                    {preferences.map((pref, index) => renderPreferenceCard(pref, index + 1))}
                  </div>
                )}
              </div>


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
              <h2 className="text-lg font-bold mb-6">Appeals</h2>

              {appeals.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No appeals submitted</p>
                  {placement && placement.status !== 'PLACED' && (
                    <p className="text-sm text-gray-400 mt-1">You can file an appeal below</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {appeals.map(ap => (
                    <div key={ap.id} className="p-4 border rounded-lg hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Appeal #{ap.id}</h3>
                        <div className="flex items-center gap-2">
                          {ap.status === 'APPROVED' && (
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Approved</span>
                          )}
                          {ap.status === 'REJECTED' && (
                            <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Rejected</span>
                          )}
                          {ap.status === 'UNDER_REVIEW' && (
                            <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">Under Review</span>
                          )}
                          {ap.status === 'SUBMITTED' && (
                            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Submitted</span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 mb-2">{ap.reason}</p>
                      <p className="text-xs text-gray-500">Submitted on {new Date(ap.submittedAt).toLocaleString()}</p>
                      {ap.responseMessage && (
                        <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Response from University:</p>
                          <p className="text-sm text-gray-600">{ap.responseMessage}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {placement && placement.status !== 'PLACED' && (
                <button
                  onClick={() => setShowAppealModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold transition"
                >
                  <Plus className="w-5 h-5" />
                  File an Appeal
                </button>
              )}
            </div>

            {/* Appeal Modal */}
            {showAppealModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
                  <div className="p-6 border-b">
                    <h3 className="text-xl font-bold text-gray-900">File an Appeal</h3>
                    <p className="text-sm text-gray-600 mt-1">Provide detailed information about why you believe your placement decision should be reconsidered</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">Appeal Reason</label>
                      <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        rows={5}
                        placeholder="Explain in detail why you are filing this appeal..."
                        value={appealForm.reason}
                        onChange={e => setAppealForm({ ...appealForm, reason: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">Supporting Document (Optional)</label>
                      <input
                        type="file"
                        onChange={e => setAppealForm({ ...appealForm, document: e.target.files?.[0] || null })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {appealForm.document && (
                        <p className="text-xs text-gray-500 mt-2">Selected file: {appealForm.document.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
                    <button
                      onClick={() => setShowAppealModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitAppeal}
                      disabled={!appealForm.reason}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
                    >
                      Submit Appeal
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
      <button
  key="my-placements"
  onClick={() => router.push('/student/placements')}
  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-700 hover:bg-blue-50 hover:text-blue-600"
>
  <Award className="w-5 h-5" />
  <span>My Placement Offers</span>
</button>


      </main>
      {/* Edit Program/Track Modal */}
      {editingPref && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Edit Program & Track</h3>
              <p className="text-sm text-gray-500 mt-1">
                {editingPref.universityName}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Program Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Program
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Admission Track
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <p className="text-xs text-gray-500 mt-1">Please select a program first</p>
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

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setEditingPref(null);
                  setAvailablePrograms([]);
                  setAvailableTracks([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition"
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">General Documents</h3>
                <p className="text-sm text-gray-500">(For all universities)</p>
              </div>
              <button onClick={() => setShowGeneralDocModal(false)} className="text-gray-500 hover:text-gray-700">
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
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No general documents uploaded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {generalDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          <p className="text-xs text-gray-500">Type: {doc.type} | Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}</p>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Documents for {selectedUniversityForDocs.universityName}</h3>
                  <p className="text-sm text-gray-500">(Specific to this university)</p>
                </div>
                <button onClick={() => setShowUniversityDocModal(false)} className="text-gray-500 hover:text-gray-700">
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
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No documents uploaded for this university yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {universityDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          <p className="text-xs text-gray-500">Type: {doc.type} | Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}</p>
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