'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save, Building, Mail, Phone, Globe, FileText, AlertCircle, CheckCircle,
  Upload, Users, Settings, BookOpen, Plus, Trash2, Edit2, X, ImageIcon,
  Target, Shield, Calendar, Award, Heart, Library, Microscope, Trophy, Sparkles, Clock,
  BarChart3, Bell
} from 'lucide-react';
import { authHelpers } from '@/lib/api';
import { DashboardLayout } from '@/components/DashboardLayout';

// ==================== Types ====================
interface UniversityProfile {
  id: number;
  name: string;
  code: string;
  type: string;
  region: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  description: string;
  history?: string;
  achievements?: string;
  facilities?: string;
  researchAreas?: string;
  studentLife?: string;
  accreditation?: string;
  admissionInstructions: string;
  postDecisionInstructions: string;
  applicationStartDate?: string;
  applicationDeadline?: string;
  totalCapacity?: number;
  keyFacts?: {
    established?: number;
    students?: number;
    programs?: number;
  };
}

interface Program {
  id: number;
  name: string;
  code: string;
  intakeCapacity: number;
  description: string;
}

interface AdmissionTrack {
  id: number;
  name: string;
  description: string;
  intakeCapacity: number;
  targetAudience: string;
  isActive: boolean;
  programId: number;
  programName?: string;
}

interface EligibilityRule {
  id: number;
  programId: number;
  programName: string;
  minScore: number;
  maxScore: number;
  region: string;
  disabilityStatus: string;
  stream: string;
}

interface IntakeItem {
  programId: number;
  programName: string;
  totalIntake: number;
  filled: number;
  available: number;
}

// ==================== Main Component ====================
export default function UniversitySettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UniversityProfile | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [admissionTracks, setAdmissionTracks] = useState<AdmissionTrack[]>([]);
  // const [eligibilityRules, setEligibilityRules] = useState<EligibilityRule[]>([]);
  const [intakeItems, setIntakeItems] = useState<IntakeItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // Password form state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' }); return;
    }
    setPasswordSaving(true);
    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }); }
    finally { setPasswordSaving(false); setTimeout(() => setMessage(null), 4000); }
  };

  // Modal states
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState<AdmissionTrack | null>(null);
  const [editingRule, setEditingRule] = useState<EligibilityRule | null>(null);
  const [editingIntakes, setEditingIntakes] = useState<IntakeItem[]>([]);

  // Form states
  const [trackForm, setTrackForm] = useState({
    name: '',
    description: '',
    intakeCapacity: 0,
    targetAudience: 'BOTH',
    programId: 0,
  });

  const [ruleForm, setRuleForm] = useState({
    programId: 0,
    minScore: 0,
    maxScore: 350,
    region: '',
    disabilityStatus: '',
    stream: '',
  });

  // Fetch all data on load
  useEffect(() => {
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/university/login');
      return;
    }
    fetchAllData();
  }, []);

  async function fetchAllData() {
    const token = authHelpers.getToken();
    if (!token) return;
    setLoading(true);
    try {
      // Fetch profile
      const profileRes = await fetch('/api/universities/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        // Ensure keyFacts is at least an empty object to avoid crashes
        if (profileData && !profileData.keyFacts) {
          profileData.keyFacts = {};
        }
        setProfile(profileData);
      } else {
        const errData = await profileRes.json().catch(() => ({}));
        setMessage({ type: 'error', text: errData.error || `Failed to load profile (Status: ${profileRes.status})` });
      }

      // Fetch programs
      const programsRes = await fetch('/api/universities/programs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (programsRes.ok) {
        const programsData = await programsRes.json();
        if (programsData.success) setPrograms(programsData.programs);
      }

      // Fetch admission tracks
      const tracksRes = await fetch('/api/universities/tracks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        if (tracksData.success) setAdmissionTracks(tracksData.tracks);
      }

      // Fetch eligibility rules
      // const rulesRes = await fetch('/api/universities/rules', {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // if (rulesRes.ok) {
      //   const rulesData = await rulesRes.json();
      //   if (rulesData.success) setEligibilityRules(rulesData.rules);
      // }

      // Fetch intake capacities
      const intakeRes = await fetch('/api/universities/intake', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (intakeRes.ok) {
        const intakeData = await intakeRes.json();
        if (Array.isArray(intakeData)) setIntakeItems(intakeData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }

  // ==================== Profile Functions ====================
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/universities/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile saved successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to save profile' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  // ==================== Track Functions ====================
  const handleSaveTrack = async () => {
    if (!trackForm.name || !trackForm.programId) {
      setMessage({ type: 'error', text: 'Track name and program are required' });
      return;
    }

    const token = authHelpers.getToken();
    const method = editingTrack ? 'PUT' : 'POST';
    const url = editingTrack
      ? `/api/universities/tracks?id=${editingTrack.id}`
      : '/api/universities/tracks';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(trackForm),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Track ${editingTrack ? 'updated' : 'added'} successfully` });
        setShowTrackModal(false);
        setEditingTrack(null);
        setTrackForm({ name: '', description: '', intakeCapacity: 0, targetAudience: 'BOTH', programId: 0 });
        await fetchAllData();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save track' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const handleDeleteTrack = async (trackId: number) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    const token = authHelpers.getToken();
    try {
      const res = await fetch(`/api/universities/tracks?id=${trackId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Track deleted successfully' });
        await fetchAllData();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete track' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  // ==================== Rule Functions ====================
  const handleSaveRule = async () => {
    if (!ruleForm.programId) {
      setMessage({ type: 'error', text: 'Program is required' });
      return;
    }

    const token = authHelpers.getToken();
    const method = editingRule ? 'PUT' : 'POST';
    const url = editingRule
      ? `/api/universities/rules?id=${editingRule.id}`
      : '/api/universities/rules';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(ruleForm),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Rule ${editingRule ? 'updated' : 'added'} successfully` });
        setShowRuleModal(false);
        setEditingRule(null);
        setRuleForm({ programId: 0, minScore: 0, maxScore: 350, region: '', disabilityStatus: '', stream: '' });
        await fetchAllData();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save rule' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    const token = authHelpers.getToken();
    try {
      const res = await fetch(`/api/universities/rules?id=${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Rule deleted successfully' });
        await fetchAllData();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete rule' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  // ==================== Intake Functions ====================
  const handleSaveIntakeCapacities = async () => {
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/universities/intake', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editingIntakes.map(i => ({ programId: i.programId, totalIntake: i.totalIntake }))),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Intake capacities updated successfully' });
        setShowIntakeModal(false);
        await fetchAllData();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update capacities' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  // Get application period status for display
  const getApplicationPeriodStatus = () => {
    if (!profile) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (profile.applicationStartDate) {
      const startDate = new Date(profile.applicationStartDate);
      startDate.setHours(0, 0, 0, 0);
      if (today < startDate) {
        return { status: 'upcoming', message: `Applications open on ${startDate.toLocaleDateString()}`, color: 'blue' };
      }
    }

    if (profile.applicationDeadline) {
      const deadline = new Date(profile.applicationDeadline);
      deadline.setHours(23, 59, 59, 999);
      if (today > deadline) {
        return { status: 'closed', message: `Applications closed on ${deadline.toLocaleDateString()}`, color: 'red' };
      }
    }

    if (profile.applicationStartDate && profile.applicationDeadline) {
      return { status: 'open', message: `Applications open until ${new Date(profile.applicationDeadline).toLocaleDateString()}`, color: 'green' };
    }

    return null;
  };

  const periodStatus = getApplicationPeriodStatus();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard', icon: BarChart3 },
    { label: 'Applicants', href: '/university/applicants', icon: Users },
    { label: 'Invitations', href: '/university/invitations', icon: Bell },
    { label: 'Placements', href: '/university/placements', icon: Award },
    { label: 'Programs', href: '/university/programs', icon: BookOpen },
    { label: 'Appeals', href: '/university/appeals', icon: AlertCircle },
    { label: 'Settings', href: '/university/settings', icon: Settings },
  ];

  const tabs = [
    { id: 'basic', label: 'Basic Information', icon: Building },
    { id: 'programs', label: 'Academic Programs', icon: BookOpen },
    { id: 'tracks', label: 'Admission Tracks', icon: Target },
    { id: 'intake', label: 'Intake Capacity', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <DashboardLayout title="University Admin" navLinks={navLinks} theme="green">
      <div className="max-w-6xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">University Administration Settings</h1>
          <p className="text-gray-600 mt-1">Configure university information, programs, admission tracks, and rules</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Application Period Banner */}
        {periodStatus && (
          <div className={`mb-6 p-4 rounded-lg border-2 bg-${periodStatus.color}-50 border-${periodStatus.color}-200`}>
            <div className="flex items-center gap-3">
              {periodStatus.status === 'open' && <CheckCircle className="w-6 h-6 text-green-600" />}
              {periodStatus.status === 'upcoming' && <Clock className="w-6 h-6 text-blue-600" />}
              {periodStatus.status === 'closed' && <AlertCircle className="w-6 h-6 text-red-600" />}
              <div>
                <p className={`font-semibold text-${periodStatus.color}-800`}>Application Period: {periodStatus.message}</p>
                <p className="text-sm text-gray-600 mt-1">Students can only apply during this period.</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-base font-semibold transition whitespace-nowrap ${activeTab === tab.id
                      ? 'bg-white text-green-700 border-b-4 border-green-600'
                      : 'text-gray-600 hover:text-green-700'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {/* ==================== BASIC INFORMATION TAB ==================== */}
            {activeTab === 'basic' && profile && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Basic Info Section */}
                <div className="border-b pb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">University Name *</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">University Code *</label>
                      <input
                        type="text"
                        value={profile.code}
                        onChange={e => setProfile({ ...profile, code: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">University Type</label>
                      <select
                        value={profile.type}
                        onChange={e => setProfile({ ...profile, type: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="public">Public (Non-Autonomous)</option>
                        <option value="autonomous">Autonomous</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">Region</label>
                      <input
                        type="text"
                        value={profile.region || ''}
                        onChange={e => setProfile({ ...profile, region: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-lg font-bold text-gray-900 mb-2">Address</label>
                    <textarea
                      rows={3}
                      value={profile.address || ''}
                      onChange={e => setProfile({ ...profile, address: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">Contact Email</label>
                      <input
                        type="email"
                        value={profile.contactEmail || ''}
                        onChange={e => setProfile({ ...profile, contactEmail: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">Contact Phone</label>
                      <input
                        type="tel"
                        value={profile.contactPhone || ''}
                        onChange={e => setProfile({ ...profile, contactPhone: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-lg font-bold text-gray-900 mb-2">Website</label>
                    <input
                      type="url"
                      value={profile.website || ''}
                      onChange={e => setProfile({ ...profile, website: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="mt-6">
                    <label className="block text-lg font-bold text-gray-900 mb-2">Short Description</label>
                    <textarea
                      rows={4}
                      value={profile.description || ''}
                      onChange={e => setProfile({ ...profile, description: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Brief description of your university..."
                    />
                  </div>
                </div>

                {/* History Section */}
                <div className="border-b pb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-blue-600" />
                    University History
                  </h2>
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-2">History & Background</label>
                    <textarea
                      rows={5}
                      value={profile.history || ''}
                      onChange={e => setProfile({ ...profile, history: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Describe the history, founding, and background of your university..."
                    />
                  </div>
                </div>

                {/* Achievements Section */}
                <div className="border-b pb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                    Achievements & Recognition
                  </h2>
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-2">Achievements</label>
                    <textarea
                      rows={5}
                      value={profile.achievements || ''}
                      onChange={e => setProfile({ ...profile, achievements: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="List your university's achievements..."
                    />
                  </div>
                </div>

                {/* Facilities Section */}
                <div className="border-b pb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Library className="w-6 h-6 text-purple-600" />
                    Campus Facilities
                  </h2>
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-2">Facilities</label>
                    <textarea
                      rows={5}
                      value={profile.facilities || ''}
                      onChange={e => setProfile({ ...profile, facilities: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="List available facilities..."
                    />
                  </div>
                </div>

                {/* Research Areas Section */}
                <div className="border-b pb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Microscope className="w-6 h-6 text-indigo-600" />
                    Research Areas
                  </h2>
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-2">Research Areas</label>
                    <textarea
                      rows={5}
                      value={profile.researchAreas || ''}
                      onChange={e => setProfile({ ...profile, researchAreas: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="List key research areas and centers..."
                    />
                  </div>
                </div>

                {/* Student Life Section */}
                <div className="border-b pb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Heart className="w-6 h-6 text-pink-600" />
                    Student Life
                  </h2>
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-2">Student Life & Activities</label>
                    <textarea
                      rows={5}
                      value={profile.studentLife || ''}
                      onChange={e => setProfile({ ...profile, studentLife: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Describe student activities, clubs, events..."
                    />
                  </div>
                </div>

                {/* Accreditation Section */}
                <div className="border-b pb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-green-600" />
                    Accreditation & Partnerships
                  </h2>
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-2">Accreditations</label>
                    <textarea
                      rows={4}
                      value={profile.accreditation || ''}
                      onChange={e => setProfile({ ...profile, accreditation: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="List accreditations and international partnerships..."
                    />
                  </div>
                </div>

                {/* Key Facts Section */}
                <div className="border-b pb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-orange-600" />
                    Key Facts
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">Established Year</label>
                      <input
                        type="number"
                        value={profile.keyFacts?.established ?? ''}
                        onChange={e => setProfile({
                          ...profile,
                          keyFacts: { ...(profile.keyFacts || {}), established: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">Total Students</label>
                      <input
                        type="number"
                        value={profile.keyFacts?.students ?? ''}
                        onChange={e => setProfile({
                          ...profile,
                          keyFacts: { ...(profile.keyFacts || {}), students: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">Number of Programs</label>
                      <input
                        type="number"
                        value={profile.keyFacts?.programs ?? ''}
                        onChange={e => setProfile({
                          ...profile,
                          keyFacts: { ...(profile.keyFacts || {}), programs: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  {/* Total Intake Capacity */}
                  <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-6 h-6 text-green-600" />
                      <label className="block text-lg font-bold text-gray-900">Total University Intake Capacity</label>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min="0"
                        value={profile.totalCapacity || 0}
                        onChange={e => setProfile({ ...profile, totalCapacity: parseInt(e.target.value) || 0 })}
                        className="w-48 border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <p className="text-sm text-gray-600">
                        Maximum number of student applications accepted platform-wide.
                        <br />
                        <span className="text-xs text-gray-500 font-normal">Leave 0 for unlimited (default).</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* ✅ Application Period Settings Section */}
                <div className="border-b pb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    Application Period Settings
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">Application Start Date</label>
                      <input
                        type="datetime-local"
                        value={profile.applicationStartDate ? profile.applicationStartDate.slice(0, 16) : ''}
                        onChange={e => setProfile({ ...profile, applicationStartDate: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <p className="text-sm text-gray-500 mt-1">📅 Students can apply on or after this date</p>
                    </div>
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">Application Deadline</label>
                      <input
                        type="datetime-local"
                        value={profile.applicationDeadline ? profile.applicationDeadline.slice(0, 16) : ''}
                        onChange={e => setProfile({ ...profile, applicationDeadline: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <p className="text-sm text-gray-500 mt-1">⏰ Students cannot apply after this date</p>
                    </div>
                  </div>

                  {/* Status Preview */}
                  {periodStatus && (
                    <div className={`mt-4 p-4 bg-${periodStatus.color}-50 rounded-lg border border-${periodStatus.color}-200`}>
                      <p className={`text-sm font-semibold text-${periodStatus.color}-800 mb-2`}>📊 Current Status:</p>
                      <div className={`space-y-1 text-sm text-${periodStatus.color}-700`}>
                        {profile.applicationStartDate && (
                          <p>📅 Applications open: {new Date(profile.applicationStartDate).toLocaleDateString()} at {new Date(profile.applicationStartDate).toLocaleTimeString()}</p>
                        )}
                        {profile.applicationDeadline && (
                          <p>⏰ Application deadline: {new Date(profile.applicationDeadline).toLocaleDateString()} at {new Date(profile.applicationDeadline).toLocaleTimeString()}</p>
                        )}
                        {periodStatus.status === 'upcoming' && (
                          <p className="text-yellow-600">⚠️ Applications are NOT open yet. Students cannot apply until the start date.</p>
                        )}
                        {periodStatus.status === 'closed' && (
                          <p className="text-red-600">⚠️ Application deadline has passed. Students cannot apply anymore.</p>
                        )}
                        {periodStatus.status === 'open' && (
                          <p className="text-green-600">✅ Applications are OPEN! Students can apply now.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions Section */}
                <div className="border-b pb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Instructions & Policies</h2>
                  <div className="mb-6">
                    <label className="block text-lg font-bold text-gray-900 mb-2">Admission Instructions</label>
                    <textarea
                      rows={4}
                      value={profile.admissionInstructions || ''}
                      onChange={e => setProfile({ ...profile, admissionInstructions: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Instructions for students on admission process..."
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-2">Post-Decision Instructions</label>
                    <textarea
                      rows={4}
                      value={profile.postDecisionInstructions || ''}
                      onChange={e => setProfile({ ...profile, postDecisionInstructions: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Instructions after admission decision has been made..."
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
                >
                  {saving ? 'Saving...' : 'Save All Changes'}
                </button>
              </form>
            )}

            {/* ==================== PROGRAMS TAB ==================== */}
            {activeTab === 'programs' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Academic Programs</h2>
                {programs.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No programs found. Add programs to continue.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {programs.map(program => (
                      <div key={program.id} className="p-4 border-2 border-gray-200 rounded-lg">
                        <h3 className="text-xl font-bold text-gray-900">{program.name}</h3>
                        <p className="text-gray-600">Code: {program.code} | Capacity: {program.intakeCapacity}</p>
                        {program.description && <p className="text-gray-500 text-sm mt-2">{program.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== ADMISSION TRACKS TAB ==================== */}
            {activeTab === 'tracks' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Admission Tracks</h2>
                  <button
                    onClick={() => {
                      setEditingTrack(null);
                      setTrackForm({ name: '', description: '', intakeCapacity: 0, targetAudience: 'BOTH', programId: programs[0]?.id || 0 });
                      setShowTrackModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    <Plus className="w-5 h-5" /> Add Track
                  </button>
                </div>

                {admissionTracks.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Target className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 text-lg">No admission tracks added yet</p>
                    <p className="text-gray-400 text-sm">Click "Add Track" to create your first admission track</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {admissionTracks.map(track => (
                      <div key={track.id} className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-md transition bg-white">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-xl font-bold text-gray-900">{track.name}</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingTrack(track);
                                setTrackForm({
                                  name: track.name,
                                  description: track.description || '',
                                  intakeCapacity: track.intakeCapacity,
                                  targetAudience: track.targetAudience || 'BOTH',
                                  programId: track.programId,
                                });
                                setShowTrackModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTrack(track.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{track.description || 'No description'}</p>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Capacity: {track.intakeCapacity}</span>
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Audience: {track.targetAudience || 'BOTH'}</span>
                          {track.programName && <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Program: {track.programName}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== ELIGIBILITY RULES TAB ==================== */}
            {/* {activeTab === 'eligibility' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Eligibility Rules</h2>
                  <button
                    onClick={() => {
                      setEditingRule(null);
                      setRuleForm({ programId: programs[0]?.id || 0, minScore: 0, maxScore: 350, region: '', disabilityStatus: '', stream: '' });
                      setShowRuleModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    <Plus className="w-5 h-5" /> Add Rule
                  </button>
                </div>

                {eligibilityRules.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Shield className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 text-lg">No eligibility rules added yet</p>
                    <p className="text-gray-400 text-sm">Click "Add Rule" to set eligibility requirements</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eligibilityRules.map(rule => (
                      <div key={rule.id} className="flex justify-between items-center p-4 border-2 border-gray-200 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900">{rule.programName}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm">
                            <span className="text-gray-600">Score: {rule.minScore} - {rule.maxScore}</span>
                            {rule.region && <span className="text-gray-600">Region: {rule.region}</span>}
                            {rule.disabilityStatus && <span className="text-gray-600">Disability: {rule.disabilityStatus}</span>}
                            {rule.stream && <span className="text-gray-600">Stream: {rule.stream}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteRule(rule.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )} */}

            {/* ==================== INTAKE CAPACITY TAB ==================== */}
            {activeTab === 'intake' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Intake Capacity</h2>
                  <button
                    onClick={() => {
                      setEditingIntakes(intakeItems.map(i => ({ ...i })));
                      setShowIntakeModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    <Edit2 className="w-5 h-5" /> Edit Capacities
                  </button>
                </div>

                {intakeItems.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 text-lg">No intake data available</p>
                    <p className="text-gray-400 text-sm">Add programs to set intake capacity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {intakeItems.map(item => (
                      <div key={item.programId} className="p-4 border-2 border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{item.programName}</h3>
                          <span className="text-sm font-semibold">{item.filled} / {item.totalIntake} filled</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-600 h-3 rounded-full transition-all"
                            style={{ width: `${item.totalIntake > 0 ? (item.filled / item.totalIntake) * 100 : 0}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{item.available} seats available</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== SECURITY TAB ==================== */}
            {activeTab === 'security' && (
              <div className="max-w-md">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-indigo-100 p-3 rounded-xl">
                    <Shield className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Account Security</h2>
                    <p className="text-sm text-gray-500">Update your university administration account password</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {passwordSaving ? 'Updating...' : 'Change Password'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== ADD/EDIT TRACK MODAL ==================== */}
      {showTrackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b-2">
              <h3 className="text-2xl font-bold text-gray-900">{editingTrack ? 'Edit Admission Track' : 'Add Admission Track'}</h3>
              <button onClick={() => { setShowTrackModal(false); setEditingTrack(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Program *</label>
                <select
                  value={trackForm.programId}
                  onChange={e => setTrackForm({ ...trackForm, programId: parseInt(e.target.value) })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value={0}>Select Program</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Track Name *</label>
                <input
                  type="text"
                  value={trackForm.name}
                  onChange={e => setTrackForm({ ...trackForm, name: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Regular, Scholarship"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={trackForm.description}
                  onChange={e => setTrackForm({ ...trackForm, description: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Track description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Intake Capacity</label>
                  <input
                    type="number"
                    value={trackForm.intakeCapacity}
                    onChange={e => setTrackForm({ ...trackForm, intakeCapacity: parseInt(e.target.value) || 0 })}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Target Audience</label>
                  <select
                    value={trackForm.targetAudience}
                    onChange={e => setTrackForm({ ...trackForm, targetAudience: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="BOTH">Both</option>
                    <option value="LOCAL">Local Only</option>
                    <option value="FOREIGN">Foreign Only</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t p-6 flex justify-end gap-3">
              <button onClick={() => { setShowTrackModal(false); setEditingTrack(null); }} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSaveTrack} className="px-4 py-2 bg-green-600 text-white rounded-lg">{editingTrack ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADD/EDIT RULE MODAL ==================== */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b-2">
              <h3 className="text-2xl font-bold text-gray-900">{editingRule ? 'Edit Eligibility Rule' : 'Add Eligibility Rule'}</h3>
              <button onClick={() => { setShowRuleModal(false); setEditingRule(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Program *</label>
                <select
                  value={ruleForm.programId}
                  onChange={e => setRuleForm({ ...ruleForm, programId: parseInt(e.target.value) })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value={0}>Select Program</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Min Score</label>
                  <input
                    type="number"
                    value={ruleForm.minScore}
                    onChange={e => setRuleForm({ ...ruleForm, minScore: parseInt(e.target.value) || 0 })}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Max Score</label>
                  <input
                    type="number"
                    value={ruleForm.maxScore}
                    onChange={e => setRuleForm({ ...ruleForm, maxScore: parseInt(e.target.value) || 0 })}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Region (Optional)</label>
                <input
                  type="text"
                  value={ruleForm.region}
                  onChange={e => setRuleForm({ ...ruleForm, region: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Addis Ababa, Oromia"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Disability Status (Optional)</label>
                <select
                  value={ruleForm.disabilityStatus}
                  onChange={e => setRuleForm({ ...ruleForm, disabilityStatus: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">All</option>
                  <option value="none">No Disability</option>
                  <option value="deaf">Deaf/Hard of Hearing</option>
                  <option value="blind">Blind/Visual Impairment</option>
                  <option value="mobility">Mobility Impairment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Stream (Optional)</label>
                <select
                  value={ruleForm.stream}
                  onChange={e => setRuleForm({ ...ruleForm, stream: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Both</option>
                  <option value="Natural Science">Natural Science</option>
                  <option value="Social Science">Social Science</option>
                </select>
              </div>
            </div>
            <div className="border-t p-6 flex justify-end gap-3">
              <button onClick={() => { setShowRuleModal(false); setEditingRule(null); }} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSaveRule} className="px-4 py-2 bg-green-600 text-white rounded-lg">{editingRule ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT INTAKE MODAL ==================== */}
      {showIntakeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b-2">
              <h3 className="text-2xl font-bold text-gray-900">Edit Intake Capacities</h3>
              <button onClick={() => setShowIntakeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {editingIntakes.map((item, idx) => (
                <div key={item.programId} className="space-y-2">
                  <label className="block font-semibold text-gray-900">{item.programName}</label>
                  <input
                    type="number"
                    min="0"
                    value={item.totalIntake}
                    onChange={e => {
                      const newVal = parseInt(e.target.value) || 0;
                      const updated = [...editingIntakes];
                      updated[idx].totalIntake = newVal;
                      updated[idx].available = newVal - updated[idx].filled;
                      setEditingIntakes(updated);
                    }}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500">Currently filled: {item.filled}</p>
                </div>
              ))}
            </div>
            <div className="border-t p-6 flex justify-end gap-3">
              <button onClick={() => setShowIntakeModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSaveIntakeCapacities} className="px-4 py-2 bg-green-600 text-white rounded-lg">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}