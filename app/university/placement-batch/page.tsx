'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import { calculateWeightedScore as calculateTrueWeightedScore } from '@/lib/weighting-calculator';
import {
  Users, Award, CheckCircle, XCircle, Clock, Calendar, AlertCircle,
  TrendingUp, PieChart, Filter, Download, RefreshCw, Settings,
  Play, Pause, Zap, FileText, BarChart3, Shield, Target, Percent,
  Info, ChevronDown, ChevronUp, Loader2, Eye, Edit, Save
} from 'lucide-react';

interface Student {
  id: number;
  examID: string;
  firstName: string;
  lastName: string;
  region: string;
  gender: string;
  disability: string;
  stream: string;
  examScore: number;
  weightedScore: number;
  timestamp: string;
  currentStatus?: 'PLACED' | 'NOT_PLACED' | 'WAITLISTED';
  currentProgram?: string;
}

interface Program {
  id: number;
  name: string;
  code: string;
  intakeCapacity: number;
  currentApplicants: number;
  filled: number;
  remaining: number;
}

interface PlacementResult {
  examID: string;
  studentName: string;
  status: 'PLACED' | 'NOT_PLACED' | 'WAITLISTED' | 'ALREADY_PLACED';
  weightedScore: number;
  weightPercent: number;
  previousStatus?: string;
  reason?: string;
}

interface UniversitySettings {
  totalIntakeCapacity: number;
  naturalIntakeCapacity: number;
  socialIntakeCapacity: number;
  allowOverCapacity: boolean;
  notificationEmail: string;
  autoPlacementEnabled: boolean;
  placementMethod: 'weighted' | 'timestamp';
  weightingSettings: {
    includeDisability: boolean;
    disabilityBonus: number;
    includeGender: boolean;
    includeRegion: boolean;
    genderBalance: { male: number; female: number };
    regionWeights: { region: string; weight: number }[];
  };
}

export default function UniversityPlacementBatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [results, setResults] = useState<PlacementResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [placementMethod, setPlacementMethod] = useState<'weighted' | 'timestamp'>('weighted');
  const [selectedStream, setSelectedStream] = useState<'all' | 'natural' | 'social'>('all');
  const [confirmationDeadline, setConfirmationDeadline] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showUniSettings, setShowUniSettings] = useState(false);
  const [universitySettings, setUniversitySettings] = useState<UniversitySettings>({
    totalIntakeCapacity: 0,
    naturalIntakeCapacity: 0,
    socialIntakeCapacity: 0,
    allowOverCapacity: false,
    notificationEmail: '',
    autoPlacementEnabled: false,
    placementMethod: 'weighted',
    weightingSettings: {
      includeDisability: true,
      disabilityBonus: 5,
      includeGender: true,
      includeRegion: true,
      genderBalance: { male: 50, female: 50 },
      regionWeights: []
    }
  });
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ programName: string; status: any }>({ programName: '', status: 'PLACED' });
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState('');

  const [advancedWeightingSettings, setAdvancedWeightingSettings] = useState({
    examScoreWeight: 70,
    regionWeight: 15,
    genderWeight: 10,
    disabilityWeight: 5,
    regionPreferences: [] as { region: string; weight: number }[],
    genderPreferences: { male: 50, female: 50 },
    disabilityBonus: 5
  });

  const clearPlacements = async () => {
    if (!confirm('⚠️ Are you sure you want to CLEAR all unconfirmed placements? This will reset all students back to "Submitted" status and cannot be undone.')) {
      return;
    }

    setProcessing(true);
    const token = authHelpers.getToken();

    try {
      const res = await fetch('/api/universities/placements/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'clear', academicYear: '2024' })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        fetchData(); // Refresh counts
        setResults([]);
        setShowResults(false);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to clear placements');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditRow = (examID: string) => {
    const row = results.find(r => r.examID === examID);
    if (row) {
      setEditingRow(examID);
      setEditData({ programName: row.programName, status: row.status });
    }
  };

  const saveRowEdit = () => {
    setResults(results.map(r =>
      r.examID === editingRow
        ? { ...r, programName: editData.programName, status: editData.status }
        : r
    ));
    setEditingRow(null);
  };
  const [settings, setSettings] = useState({
    includeDisability: true,
    includeGender: false,
    includeRegion: false,
    disabilityBonus: 5,
    regionWeights: [],
    genderWeights: [
      { gender: 'Male', weight: 50 },
      { gender: 'Female', weight: 50 }
    ]
  });
  const [stats, setStats] = useState({
    totalApplicants: 0,
    placed: 0,
    notPlaced: 0,
    alreadyPlaced: 0,
    waitlisted: 0,
    programsFilled: 0,
    totalCapacity: 0,
    totalIntakeRemaining: 0
  });

  useEffect(() => {
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/university/login');
      return;
    }
    fetchData();
    fetchUniversitySettings();
    fetchAdvancedWeightingSettings();
  }, []);

  const fetchAdvancedWeightingSettings = async () => {
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/universities/weighting-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setAdvancedWeightingSettings(data.settings);
      }
    } catch (err) {
      console.error('Error fetching advanced weighting settings:', err);
    }
  };

  const fetchUniversitySettings = async () => {
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/universities/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (data.settings) {
          setUniversitySettings({
            totalIntakeCapacity: data.settings.totalIntakeCapacity || 0,
            naturalIntakeCapacity: data.settings.naturalIntakeCapacity || 0,
            socialIntakeCapacity: data.settings.socialIntakeCapacity || 0,
            allowOverCapacity: data.settings.allowOverCapacity || false,
            notificationEmail: data.settings.notificationEmail || '',
            autoPlacementEnabled: data.settings.autoPlacementEnabled || false,
            placementMethod: data.settings.placementMethod || 'weighted',
            weightingSettings: data.settings.weightingSettings || {
              includeDisability: true,
              disabilityBonus: 5,
              includeGender: true,
              includeRegion: true,
              genderBalance: { male: 50, female: 50 },
              regionWeights: []
            }
          });
          setPlacementMethod(data.settings.placementMethod || 'weighted');
        }
      }
    } catch (err) {
      console.error('Error fetching university settings:', err);
    }
  };

  const updateUniversitySettings = async () => {
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/universities/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(universitySettings)
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ University settings saved successfully');
        setShowUniSettings(false);
        setEditingCapacity(false);
      } else {
        alert(data.error || 'Failed to save settings');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  const fetchData = async () => {
    const token = authHelpers.getToken();
    try {
      // ✅ Fetch ALL applicants (including those already placed via invitations)
      const applicantsRes = await fetch('/api/universities/applicants?limit=1000&includePlaced=true&includeInvited=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const applicantsData = await applicantsRes.json();

      let transformedStudents: Student[] = [];

      if (applicantsData.applicants) {
        transformedStudents = applicantsData.applicants.map((app: any) => ({
          id: app.student?.id,
          examID: app.student?.examID,
          firstName: app.student?.firstName,
          lastName: app.student?.lastName,
          region: app.student?.region || 'Unknown',
          gender: app.student?.gender || 'Unknown',
          disability: app.student?.disability || 'none',
          stream: app.student?.stream || 'Unknown', // Added stream
          examScore: app.student?.totalScore || 0,
          weightedScore: app.student?.totalScore || 0,
          timestamp: app.submittedAt || new Date().toISOString(),
          currentStatus:
            (app.status === 'ACCEPTED' || app.status === 'BATCH_PLACED') ? 'PLACED' :
              (app.status === 'REJECTED' || app.status === 'BATCH_NOT_PLACED') ? 'NOT_PLACED' :
                undefined,
          currentProgram: app.program?.name
        }));
        setStudents(transformedStudents);
      }

      // Fetch programs with capacities just to know if we need them, but we won't use them for placement
      const programsRes = await fetch('/api/universities/programs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const programsData = await programsRes.json();

      let totalCapacity = 0;

      // Total capacity is managed by settings now
      const token2 = authHelpers.getToken();
      const settingsRes = await fetch('/api/universities/settings', {
        headers: { Authorization: `Bearer ${token2}` }
      });
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.settings) {
        totalCapacity = settingsData.settings.totalIntakeCapacity || 0;
      }

      // Count already placed students
      const alreadyPlacedCount = transformedStudents.filter(s => s.currentStatus === 'PLACED').length;

      setStats(prev => ({
        ...prev,
        totalApplicants: transformedStudents.length,
        totalCapacity,
        alreadyPlaced: alreadyPlacedCount,
        totalIntakeRemaining: totalCapacity - alreadyPlacedCount
      }));

      // Check capacity warning
      if (totalCapacity > 0 && totalCapacity < transformedStudents.length) {
        setCapacityWarning(`⚠️ Warning: Total capacity (${totalCapacity}) is less than total applicants (${transformedStudents.length}). ${transformedStudents.length - totalCapacity} students will not be placed.`);
      } else {
        setCapacityWarning('');
      }

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeightedScore = (student: Student): number => {
    const hasDisability = Boolean(student.disability && student.disability !== 'none' && student.disability !== 'No' && student.disability !== '');
    const result = calculateTrueWeightedScore({
      examScore: student.examScore,
      maxExamScore: 700,
      region: student.region || 'Unknown',
      gender: student.gender || 'Unknown',
      hasDisability,
      disabilityType: student.disability
    }, advancedWeightingSettings);

    return result.weightedScore;
  };

  const runPlacement = async () => {
    if (students.length === 0) {
      alert('No applicants available for placement. Please verify applicants are submitted and refresh the page.');
      return;
    }

    setProcessing(true);
    setCapacityWarning('');

    const naturalCap = universitySettings.naturalIntakeCapacity || 0;
    const socialCap = universitySettings.socialIntakeCapacity || 0;
    const totalCap = universitySettings.totalIntakeCapacity || (naturalCap + socialCap);

    if (!universitySettings.allowOverCapacity && students.length > totalCap) {
      const confirmRun = confirm(`⚠️ WARNING: You have ${students.length} applicants but only ${totalCap} total capacity. Some students will NOT be placed.\n\nDo you want to continue?`);
      if (!confirmRun) {
        setProcessing(false);
        return;
      }
    }

    // Separate students by stream
    const naturalStudents = students.filter(s => s.stream?.toLowerCase().includes('natural'));
    const socialStudents = students.filter(s => s.stream?.toLowerCase().includes('social'));
    const unknownStudents = students.filter(s => !s.stream?.toLowerCase().includes('natural') && !s.stream?.toLowerCase().includes('social'));

    console.log(`Running placement for: ${naturalStudents.length} Natural, ${socialStudents.length} Social, ${unknownStudents.length} Unknown`);

    const placementResults: PlacementResult[] = [];
    let placed = 0;
    let notPlaced = 0;
    let alreadyPlaced = 0;
    let placedNatural = 0;
    let placedSocial = 0;

    // Calculate already placed stream counts
    students.forEach(s => {
      if (s.currentStatus === 'PLACED') {
        const isNatural = s.stream?.toLowerCase().includes('natural');
        const isSocial = s.stream?.toLowerCase().includes('social');
        if (isNatural) placedNatural++;
        if (isSocial) placedSocial++;
      }
    });

    // Define the processing function
    const processStudent = (student: Student) => {
      // Check if student is in the selected stream
      const isNatural = student.stream?.toLowerCase().includes('natural');
      const isSocial = student.stream?.toLowerCase().includes('social');
      const matchesStream = selectedStream === 'all' ||
        (selectedStream === 'natural' && isNatural) ||
        (selectedStream === 'social' && isSocial);

      if (!matchesStream) {
        return; // Skip completely
      }

      // Calculate weighted score
      const weightedScore = student.examScore; // Ensure raw score is saved as weightedScore for Analytics consistency
      const weightPercent = placementMethod === 'weighted' ? (student as any).sortScore : (student.examScore / 700) * 100;

      if (student.currentStatus === 'PLACED') {
        placementResults.push({
          examID: student.examID,
          studentName: `${student.firstName} ${student.lastName}`,
          status: 'ALREADY_PLACED',
          weightedScore,
          weightPercent,
          reason: 'Already placed via prior placement or invitation'
        });
        alreadyPlaced++;
        return;
      }

      // STREAM CAPACITY CHECK
      if (!universitySettings.allowOverCapacity) {
        if (isNatural && naturalCap > 0 && placedNatural >= naturalCap) {
          placementResults.push({
            examID: student.examID,
            studentName: `${student.firstName} ${student.lastName}`,
            status: 'NOT_PLACED',
            weightedScore,
            weightPercent,
            reason: 'Natural stream capacity full'
          });
          notPlaced++;
          return;
        }
        if (isSocial && socialCap > 0 && placedSocial >= socialCap) {
          placementResults.push({
            examID: student.examID,
            studentName: `${student.firstName} ${student.lastName}`,
            status: 'NOT_PLACED',
            weightedScore,
            weightPercent,
            reason: 'Social stream capacity full'
          });
          notPlaced++;
          return;
        }
        if (placed + alreadyPlaced >= totalCap) {
          placementResults.push({
            examID: student.examID,
            studentName: `${student.firstName} ${student.lastName}`,
            status: 'NOT_PLACED',
            weightedScore,
            weightPercent,
            reason: 'University total capacity full'
          });
          notPlaced++;
          return;
        }
      }

      // If we passed the capacity checks, they are PLACED
      placementResults.push({
        examID: student.examID,
        studentName: `${student.firstName} ${student.lastName}`,
        status: 'PLACED',
        weightedScore,
        weightPercent,
        reason: 'Placed via General Capacity'
      });

      placed++;
      if (isNatural) placedNatural++;
      if (isSocial) placedSocial++;
    };

    // Sort students before processing to honor priority
    const studentsToProcess = [...students].map(s => ({
      ...s,
      sortScore: placementMethod === 'weighted' ? calculateWeightedScore(s) : s.examScore
    }));

    if (placementMethod === 'weighted') {
      studentsToProcess.sort((a, b) => b.sortScore - a.sortScore);
    } else {
      studentsToProcess.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    // Process all sorted students
    studentsToProcess.forEach(processStudent);

    setResults(placementResults);
    setStats(prev => ({
      ...prev,
      placed,
      notPlaced,
      alreadyPlaced,
      totalCapacity: totalCap
    }));

    alert(`📊 Placement Complete for ${selectedStream === 'all' ? 'All' : selectedStream.charAt(0).toUpperCase() + selectedStream.slice(1)} Stream!\n\n✅ Placed: ${placed}\n❌ Not Placed: ${notPlaced}\n📋 Already Placed: ${alreadyPlaced}\n\nProcessed: ${placementResults.length} students total.`);

    setShowResults(true);
    setProcessing(false);
  };

  const confirmAndSavePlacements = async () => {
    if (!confirm('Proceed to SAVE these placements as drafts? Results will NOT be visible to students until you click "Send Result to Student".')) {
      return;
    }

    const token = authHelpers.getToken();
    setProcessing(true);

    try {
      const res = await fetch('/api/universities/placements/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'save',
          results: results.filter(r => r.status === 'PLACED' || r.status === 'NOT_PLACED'),
          academicYear: '2024'
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        fetchData(); // Refresh counts
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save placements');
    } finally {
      setProcessing(false);
    }
  };

  const publishResults = async () => {
    if (!confirm('🚀 This will SEND all saved placement results to students. They will see the results in their dashboards immediately. Continue?')) {
      return;
    }

    const token = authHelpers.getToken();
    setProcessing(true);

    try {
      const res = await fetch('/api/universities/placements/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'publish',
          academicYear: '2024',
          confirmationDeadline
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        router.push('/university/placements');
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to publish results');
    } finally {
      setProcessing(false);
    }
  };

  const exportResults = () => {
    const csv = [
      ['Exam ID', 'Student Name', 'Status', 'Weighted Score', 'Weight %', 'Previous Status', 'Reason'],
      ...results.map(r => [
        r.examID,
        r.studentName,
        r.status,
        r.weightedScore,
        r.weightPercent.toFixed(2) + '%',
        r.previousStatus || '',
        r.reason || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `placement-results-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard' },
    { label: 'Applications', href: '/university/applications' },
    { label: 'Applicants', href: '/university/applicants' },
    { label: 'Programs', href: '/university/programs' },
    { label: 'Invitations', href: '/university/invitations' },
    { label: 'Placements', href: '/university/placements' },
    { label: 'Batch Placement', href: '/university/placement-batch' }
  ];

  if (loading) {
    return (
      <DashboardLayout title="Batch Placement" navLinks={navLinks} theme="green">
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin w-12 h-12 text-green-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Automated Batch Placement" navLinks={navLinks} theme="green">
      <div className="space-y-6">
        {/* Capacity Warning Banner */}
        {capacityWarning && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <p className="text-yellow-700">{capacityWarning}</p>
            </div>
          </div>
        )}

        {/* University Settings Button */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowUniSettings(!showUniSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={clearPlacements}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
            Undo / Clear All
          </button>
        </div>

        {/* University Settings Panel */}
        {showUniSettings && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">University Placement Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:col-span-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Capacity
                  </label>
                  <input
                    type="number"
                    value={universitySettings.totalIntakeCapacity}
                    onChange={(e) => setUniversitySettings({ ...universitySettings, totalIntakeCapacity: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Natural Stream
                  </label>
                  <input
                    type="number"
                    value={universitySettings.naturalIntakeCapacity}
                    onChange={(e) => setUniversitySettings({ ...universitySettings, naturalIntakeCapacity: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Social Stream
                  </label>
                  <input
                    type="number"
                    value={universitySettings.socialIntakeCapacity}
                    onChange={(e) => setUniversitySettings({ ...universitySettings, socialIntakeCapacity: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allow Over Capacity
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="allowOverCapacity"
                    checked={universitySettings.allowOverCapacity}
                    onChange={(e) => setUniversitySettings({ ...universitySettings, allowOverCapacity: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="allowOverCapacity" className="text-sm text-gray-700">
                    Allow placement beyond capacity (not recommended)
                  </label>
                </div>
                <p className="text-xs text-red-500 mt-1">⚠️ May cause resource allocation issues</p>
              </div>

              {/* <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Email
                </label>
                <input
                  type="email"
                  value={universitySettings.notificationEmail}
                  onChange={(e) => setUniversitySettings({ ...universitySettings, notificationEmail: e.target.value })}
                  placeholder="admin@university.edu.et"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Email for placement completion notifications</p>
              </div> */}

              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={updateUniversitySettings}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stream Filter */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Academic Stream Filter</label>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'all', label: 'All Students', icon: Users, color: 'blue' },
              { id: 'natural', label: 'Natural Science', icon: Zap, color: 'orange' },
              { id: 'social', label: 'Social Science', icon: FileText, color: 'purple' }
            ].map((stream) => (
              <button
                key={stream.id}
                onClick={() => setSelectedStream(stream.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${selectedStream === stream.id
                    ? `border-${stream.color}-500 bg-${stream.color}-50 text-${stream.color}-700 shadow-sm`
                    : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                  }`}
              >
                <stream.icon className={`w-4 h-4 ${selectedStream === stream.id ? `text-${stream.color}-600` : 'text-gray-400'}`} />
                <span className="font-medium text-sm">{stream.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500 italic">
            Placement algorithm will only run for students in the selected stream.
          </p>
        </div>

        {/* Priority Selection */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Placement Priority Method</h2>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Settings className="w-4 h-4" />
              Weighting Settings
              {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <button
              onClick={() => setPlacementMethod('weighted')}
              className={`p-4 rounded-xl border-2 transition-all ${placementMethod === 'weighted'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-200'
                }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-6 h-6 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Weighted Analytics</h3>
              </div>
              <p className="text-sm text-gray-600">
                Places students based on weighted score including exam results,
                disability bonus, region preference, and gender balance.
              </p>
              {placementMethod === 'weighted' && (
                <div className="mt-2 text-xs text-purple-600 font-medium">✓ Selected</div>
              )}
            </button>

            <button
              onClick={() => setPlacementMethod('timestamp')}
              className={`p-4 rounded-xl border-2 transition-all ${placementMethod === 'timestamp'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200'
                }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Timestamp Priority</h3>
              </div>
              <p className="text-sm text-gray-600">
                First Come First Serve basis. Students who submitted applications
                earlier get priority regardless of exam scores.
              </p>
              {placementMethod === 'timestamp' && (
                <div className="mt-2 text-xs text-blue-600 font-medium">✓ Selected</div>
              )}
            </button>
          </div>

          {/* Weighting Settings Panel */}
          {showSettings && placementMethod === 'weighted' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-semibold text-gray-900 mb-3">Weighting Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="includeDisability"
                    checked={settings.includeDisability}
                    onChange={(e) => setSettings({ ...settings, includeDisability: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="includeDisability" className="text-sm text-gray-700">
                    Disability Bonus (+{settings.disabilityBonus} points)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="includeGender"
                    checked={settings.includeGender}
                    onChange={(e) => setSettings({ ...settings, includeGender: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="includeGender" className="text-sm text-gray-700">
                    Gender Balance
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="includeRegion"
                    checked={settings.includeRegion}
                    onChange={(e) => setSettings({ ...settings, includeRegion: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="includeRegion" className="text-sm text-gray-700">
                    Region Preference
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600">Total Applicants</p>
            <p className="text-2xl font-bold text-blue-700">{stats.totalApplicants}</p>
          </div>
         
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-xs text-yellow-600">Already Placed</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.alreadyPlaced}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-600">Available for Placement</p>
            <p className="text-2xl font-bold text-orange-700">{stats.totalApplicants - stats.alreadyPlaced}</p>
          </div>
        </div>

        {/* Program Capacity Overview Removed */}

        {/* Placement Options & Deadline */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Response Deadline
              </h3>
              <p className="text-sm text-gray-500">Set the date by which students must accept or decline their placement offer.</p>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="deadline" className="text-sm font-medium text-gray-700">Deadline Date:</label>
              <input
                id="deadline"
                type="date"
                value={confirmationDeadline}
                onChange={(e) => setConfirmationDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={runPlacement}
            disabled={processing}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
          >
            {processing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            Run Placement Algorithm
          </button>

          {showResults && results.length > 0 && (
            <>
              <button
                onClick={confirmAndSavePlacements}
                disabled={processing}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-md"
              >
                <Save className="w-5 h-5" />
                Save Placements
              </button>

              <button
                onClick={publishResults}
                disabled={processing}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition animate-pulse-subtle shadow-md"
              >
                <Zap className="w-5 h-5" />
                Send Result to Student
              </button>

              <button
                onClick={exportResults}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
            </>
          )}
        </div>

        {/* Results Table */}
        {showResults && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Placement Results</h2>
                  <p className="text-sm text-gray-600">
                    Using: {placementMethod === 'weighted' ? 'Weighted Analytics' : 'Timestamp Priority'}
                  </p>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.placed}</p>
                    <p className="text-xs text-gray-500">Newly Placed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{stats.alreadyPlaced}</p>
                    <p className="text-xs text-gray-500">Already Placed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{stats.notPlaced}</p>
                    <p className="text-xs text-gray-500">Not Placed</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Exam ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Student Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Weight %</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((res, index) => (
                    <tr key={res.examID} className={`hover:bg-gray-50 ${editingRow === res.examID ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-3 text-xs font-medium text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs">{res.examID}</td>
                      <td className="px-4 py-3 font-medium text-sm">{res.studentName}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-600">{res.weightedScore}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-600">{res.weightPercent.toFixed(2)}%</td>
                      <td className="px-4 py-3">
                        {editingRow === res.examID ? (
                          <select
                            value={editData.status}
                            onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                            className="text-xs border rounded px-1 py-1 w-full"
                          >
                            <option value="PLACED">Placed</option>
                            <option value="NOT_PLACED">Not Placed</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${res.status === 'PLACED' ? 'bg-green-100 text-green-700' :
                              res.status === 'ALREADY_PLACED' ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                            {res.status === 'ALREADY_PLACED' ? 'Already Placed' :
                              res.status === 'PLACED' ? 'Placed' : 'Not Placed'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{res.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.length > 100 && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Showing first 100 of {results.length} results. Export CSV to see all.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}