'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import {
  Mail, Send, Calendar, Clock, MapPin, FileText, User, CheckCircle,
  XCircle, AlertCircle, Plus, Trash2, Edit2, Eye, RefreshCw,
  Filter, Search, ChevronDown, ChevronUp, Loader2, GraduationCap,
  Phone, Mail as MailIcon, MessageCircle, Award, Target, Users
} from 'lucide-react';

interface Student {
  id: number;
  examID: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  region: string;
}

interface Program {
  id: number;
  name: string;
  code: string;
}

interface Invitation {
  id: number;
  studentId: number;
  student: Student;
  programId: number | null;
  program: Program | null;
  admissionTrackId: number | null;
  academicYear: string;
  type: 'INTERVIEW' | 'EXAM' | 'BOTH';
  date: string;
  location: string | null;
  instructions: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  studentResponse: string | null;
  respondedAt: string | null;
  result: string | null;
  resultNotes: string | null;
  responseDeadline: string;
  createdAt: string;
}

export default function UniversityInvitationsPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [academicYear, setAcademicYear] = useState('2024');
  const [filterStatus, setFilterStatus] = useState('all');
  const [streamFilter, setStreamFilter] = useState('all');

  // Form states for sending invitation
  const [inviteForm, setInviteForm] = useState({
    examID: '',
    type: 'INTERVIEW',
    date: '',
    time: '',
    location: '',
    instructions: '',
    programName: ''
  });

  // Form states for bulk invitation
  const [bulkInviteForm, setBulkInviteForm] = useState({
    filterType: 'WEIGHTED_SCORE', // 'WEIGHTED_SCORE' or 'RAW_SCORE'
    threshold: 350,
    type: 'INTERVIEW',
    date: '',
    time: '',
    location: '',
    instructions: '',
    programName: ''
  });

  // Form states for edit
  const [editForm, setEditForm] = useState({
    date: '',
    time: '',
    location: '',
    type: 'INTERVIEW',
    instructions: '',
    responseDeadline: ''
  });

  // Form states for result
  const [resultForm, setResultForm] = useState({
    result: 'PASS',
    resultNotes: '',
    acceptanceMessage: '',
    confirmationDeadline: ''
  });

  useEffect(() => {
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/university/login');
      return;
    }
    fetchInvitations();
  }, [filterStatus, academicYear]);

  const fetchInvitations = async () => {
    const token = authHelpers.getToken();
    setLoading(true);
    try {
      const url = filterStatus !== 'all' 
        ? `/api/universities/interviews?status=${filterStatus}&academicYear=${academicYear}`
        : `/api/universities/interviews?academicYear=${academicYear}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setInvitations(data.invitations);
        setError('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = authHelpers.getToken();
    
    if (!inviteForm.date || !inviteForm.time) {
      alert('Please select both date and time');
      return;
    }
    
    const dateTime = new Date(`${inviteForm.date}T${inviteForm.time}`);
    
    try {
      const res = await fetch('/api/universities/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invitations: [{
            examID: inviteForm.examID,
            type: inviteForm.type,
            date: dateTime.toISOString(),
            location: inviteForm.location,
            instructions: inviteForm.instructions,
            programName: inviteForm.programName || undefined
          }],
          academicYear: academicYear,
          responseDeadlineDays: 7
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        setShowSendModal(false);
        setInviteForm({
          examID: '',
          type: 'INTERVIEW',
          date: '',
          time: '',
          location: '',
          instructions: '',
          programName: ''
        });
        fetchInvitations();
      } else {
        alert(`❌ Error: ${data.error || data.results?.[0]?.reason || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Send error:', err);
      alert('Failed to send invitation');
    }
  };

  const handleClearAll = async () => {
    const confirm = window.confirm('Are you sure you want to clear ALL invitations? This action cannot be undone.');
    if (!confirm) return;

    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/universities/interviews?action=clearAll', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        alert('✅ All invitations have been cleared.');
        fetchInvitations();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Clear all error:', err);
      alert('Failed to clear invitations.');
    }
  };

  const handleBulkInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = authHelpers.getToken();
    
    if (!bulkInviteForm.date || !bulkInviteForm.time) {
      alert('Please select both date and time');
      return;
    }
    
    const dateTime = new Date(`${bulkInviteForm.date}T${bulkInviteForm.time}`);
    setLoading(true);
    
    try {
      // 1. Fetch applicants to filter
      const appsRes = await fetch(`/api/universities/applicants?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const appsData = await appsRes.json();
      
      if (!appsRes.ok || !appsData.applicants) {
        console.error('API Error Response:', appsData);
        throw new Error(appsData.error || 'Failed to fetch applicants for filtering');
      }

      // 2. Filter applicants
      const eligibleApplicants = appsData.applicants.filter((app: any) => {
        // Only invite students who haven't been placed/invited yet (status is SUBMITTED or PENDING)
        if (app.status !== 'SUBMITTED' && app.status !== 'PENDING') return false;
        if (app.finalStatus && app.finalStatus !== 'SUBMITTED' && app.finalStatus !== 'PENDING') return false;
        
        const score = bulkInviteForm.filterType === 'WEIGHTED_SCORE' 
          ? (app.score || app.student?.totalScore || 0)
          : (app.student?.totalScore || app.score || 0);
          
        return score >= bulkInviteForm.threshold;
      });

      if (eligibleApplicants.length === 0) {
        alert('No eligible students found matching this criteria that are not already placed/invited.');
        setLoading(false);
        return;
      }

      const confirm = window.confirm(`Found ${eligibleApplicants.length} eligible students. Send invitations to all of them?`);
      if (!confirm) {
        setLoading(false);
        return;
      }

      // 3. Construct invitations array
      const invitations = eligibleApplicants.map((app: any) => ({
        examID: app.student?.examID || app.examID,
        type: bulkInviteForm.type,
        date: dateTime.toISOString(),
        location: bulkInviteForm.location,
        instructions: bulkInviteForm.instructions,
        programName: bulkInviteForm.programName || undefined
      }));

      // 4. Send bulk invite request
      const res = await fetch('/api/universities/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invitations,
          academicYear: academicYear,
          responseDeadlineDays: 7
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`✅ Successfully sent ${eligibleApplicants.length} invitations!`);
        setShowBulkInviteModal(false);
        setBulkInviteForm({
          filterType: 'WEIGHTED_SCORE',
          threshold: 350,
          type: 'INTERVIEW',
          date: '',
          time: '',
          location: '',
          instructions: '',
          programName: ''
        });
        fetchInvitations();
      } else {
        alert(`❌ Error: ${data.error || 'Failed to send bulk invitations'}`);
      }
    } catch (err) {
      console.error('Bulk send error:', err);
      alert('An error occurred during bulk invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvitation) return;
    const token = authHelpers.getToken();
    
    let dateTimeStr = editForm.date;
    if (editForm.date && editForm.time) {
      dateTimeStr = new Date(`${editForm.date}T${editForm.time}`).toISOString();
    } else if (editForm.date) {
      dateTimeStr = new Date(editForm.date).toISOString();
    }
    
    try {
      const res = await fetch('/api/universities/interviews', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invitationId: selectedInvitation.id,
          date: dateTimeStr,
          location: editForm.location,
          instructions: editForm.instructions,
          type: editForm.type,
          responseDeadline: editForm.responseDeadline ? new Date(editForm.responseDeadline).toISOString() : undefined
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        setShowEditModal(false);
        setSelectedInvitation(null);
        fetchInvitations();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Edit error:', err);
      alert('Failed to update invitation');
    }
  };

  const handleUpdateResult = async () => {
    const token = authHelpers.getToken();
    
    // Validate selected invitation exists
    if (!selectedInvitation) {
      alert('No invitation selected');
      return;
    }
    
    try {
      const res = await fetch('/api/universities/interviews', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invitationId: selectedInvitation.id,
          result: resultForm.result,
          resultNotes: resultForm.resultNotes,
          acceptanceMessage: resultForm.acceptanceMessage,
          confirmationDeadline: resultForm.confirmationDeadline || undefined
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        setShowResultModal(false);
        setSelectedInvitation(null);
        // Reset result form
        setResultForm({
          result: 'PASS',
          resultNotes: '',
          acceptanceMessage: '',
          confirmationDeadline: ''
        });
        fetchInvitations();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Update result error:', err);
      alert('Failed to update result');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      INTERVIEW: 'bg-purple-100 text-purple-800',
      EXAM: 'bg-orange-100 text-orange-800',
      BOTH: 'bg-blue-100 text-blue-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type]}`}>
        {type}
      </span>
    );
  };

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard' },
    { label: 'Applications', href: '/university/applications' },
    { label: 'Applicants', href: '/university/applicants' },
    { label: 'Programs', href: '/university/programs' },
    { label: 'Invitations', href: '/university/invitations' },
    { label: 'Placements', href: '/university/placements' }
  ];

  if (loading) {
    return (
      <DashboardLayout title="Invitations" navLinks={navLinks} theme="green">
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin w-12 h-12 text-green-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Interview & Exam Invitations" navLinks={navLinks} theme="green">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
          </select>
          
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="2024">2024 Academic Year</option>
            <option value="2025">2025 Academic Year</option>
          </select>

          <select
            value={streamFilter}
            onChange={(e) => setStreamFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Streams</option>
            <option value="Natural Science">Natural Science</option>
            <option value="Social Science">Social Science</option>
          </select>
          <button
            onClick={() => fetchInvitations()}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
            title="Clear all invitations"
          >
            <XCircle className="w-4 h-4" />
            Reset All
          </button>
          
          <button
            onClick={() => setShowBulkInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <Users className="w-4 h-4" />
            Bulk Invite
          </button>
          
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
          >
            <Send className="w-4 h-4" />
            Send Invitation
          </button>
        </div>
      </div>

      {/* Invitations Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No invitations sent yet. Click "Send Invitation" to get started.
                  </td>
                </tr>
              ) : (
                invitations
                .filter(inv => {
                  if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
                  if (streamFilter !== 'all') {
                    // Assuming stream is available on student object in future, for now fallback to basic filtering if present
                    if (inv.student && (inv.student as any).stream) {
                      return (inv.student as any).stream === streamFilter;
                    }
                  }
                  return true;
                })
                .map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {inv.student?.firstName} {inv.student?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{inv.student?.examID}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getTypeBadge(inv.type)}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm">{new Date(inv.date).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">{new Date(inv.date).toLocaleTimeString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{inv.location || 'TBD'}</td>
                    <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                    <td className="px-6 py-4">
                      {inv.studentResponse === 'ACCEPTED' && (
                        <span className="text-green-600 text-sm flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Accepted
                        </span>
                      )}
                      {(inv.studentResponse === 'REJECTED' || inv.studentResponse === 'DECLINED') && (
                        <span className="text-red-600 text-sm flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> Declined
                        </span>
                      )}
                      {!inv.studentResponse && inv.status === 'PENDING' && (
                        <span className="text-yellow-600 text-sm">Awaiting response</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedInvitation(inv);
                            setResultForm({
                              result: inv.result === 'PASS' ? 'PASS' : inv.result === 'FAIL' ? 'FAIL' : 'PASS',
                              resultNotes: inv.resultNotes || '',
                              acceptanceMessage: '',
                              confirmationDeadline: ''
                            });
                            setShowResultModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Update Result"
                        >
                          <Award className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvitation(inv);
                            const d = new Date(inv.date);
                            const rd = inv.responseDeadline ? new Date(inv.responseDeadline) : null;
                            setEditForm({
                              date: d.toISOString().split('T')[0],
                              time: d.toTimeString().slice(0, 5),
                              location: inv.location || '',
                              type: inv.type,
                              instructions: inv.instructions || '',
                              responseDeadline: rd ? rd.toISOString().split('T')[0] : ''
                            });
                            setShowEditModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-800"
                          title="Edit / Reinvite"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.open(`/api/universities/interviews/${inv.id}`, '_blank')}
                          className="text-gray-600 hover:text-gray-800"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Invitation Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Send Invitation</h3>
              <button onClick={() => setShowSendModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSendInvitation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam ID *</label>
                <input
                  type="text"
                  value={inviteForm.examID}
                  onChange={(e) => setInviteForm({ ...inviteForm, examID: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., EXM-2024-001"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invitation Type *</label>
                <select
                  value={inviteForm.type}
                  onChange={(e) => setInviteForm({ ...inviteForm, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="INTERVIEW">Interview</option>
                  <option value="EXAM">Entrance Exam</option>
                  <option value="BOTH">Interview + Exam</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={inviteForm.date}
                    onChange={(e) => setInviteForm({ ...inviteForm, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    value={inviteForm.time}
                    onChange={(e) => setInviteForm({ ...inviteForm, time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={inviteForm.location}
                  onChange={(e) => setInviteForm({ ...inviteForm, location: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Room 101, Main Building"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea
                  value={inviteForm.instructions}
                  onChange={(e) => setInviteForm({ ...inviteForm, instructions: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="What should the student bring? Any special requirements?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program (Optional)</label>
                <input
                  type="text"
                  value={inviteForm.programName}
                  onChange={(e) => setInviteForm({ ...inviteForm, programName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Software Engineering"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Result Modal */}
      {showResultModal && selectedInvitation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Update Student Result</h3>
              <button onClick={() => setShowResultModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Student: <strong>{selectedInvitation.student?.firstName} {selectedInvitation.student?.lastName}</strong></p>
                <p className="text-sm text-gray-600">Exam ID: <strong>{selectedInvitation.student?.examID}</strong></p>
                <p className="text-sm text-gray-600">Invitation Type: <strong>{selectedInvitation.type}</strong></p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result *</label>
                <select
                  value={resultForm.result}
                  onChange={(e) => setResultForm({ ...resultForm, result: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="PASS">✅ Pass - Accept Student</option>
                  <option value="FAIL">❌ Fail - Reject Student</option>
                  <option value="PENDING">⏳ Pending - No Decision Yet</option>
                </select>
              </div>
              
              {(resultForm.result === 'PASS' || resultForm.result === 'FAIL') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result Notes</label>
                  <textarea
                    value={resultForm.resultNotes}
                    onChange={(e) => setResultForm({ ...resultForm, resultNotes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={3}
                    placeholder={resultForm.result === 'PASS' 
                      ? "Congratulations message for the student..." 
                      : "Explanation for rejection..."}
                  />
                </div>
              )}
              
              {resultForm.result === 'PASS' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Message</label>
                    <textarea
                      value={resultForm.acceptanceMessage}
                      onChange={(e) => setResultForm({ ...resultForm, acceptanceMessage: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      rows={2}
                      placeholder="Congratulations! You have been accepted to our program..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation Deadline</label>
                    <input
                      type="date"
                      value={resultForm.confirmationDeadline}
                      onChange={(e) => setResultForm({ ...resultForm, confirmationDeadline: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Student must confirm by this date</p>
                  </div>
                </>
              )}
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateResult}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Result
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invitation Modal */}
      {showEditModal && selectedInvitation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Edit / Reinvite Student</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleEditInvitation} className="p-6 space-y-4">
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Updating this invitation will reset the student's response to "Pending" so they can review the new details.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invitation Type *</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="INTERVIEW">Interview</option>
                  <option value="EXAM">Entrance Exam</option>
                  <option value="BOTH">Interview + Exam</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea
                  value={editForm.instructions}
                  onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Response Deadline</label>
                <input
                  type="date"
                  value={editForm.responseDeadline}
                  onChange={(e) => setEditForm({ ...editForm, responseDeadline: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Save & Reinvite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Invitation Modal */}
      {showBulkInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Bulk Invite Students
              </h3>
              <button onClick={() => setShowBulkInviteModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleBulkInvite} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  This tool will automatically find unplaced students who meet your score threshold and send them all an invitation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter By *</label>
                  <select
                    value={bulkInviteForm.filterType}
                    onChange={(e) => setBulkInviteForm({ ...bulkInviteForm, filterType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="WEIGHTED_SCORE">Weight Analysis Score</option>
                    <option value="RAW_SCORE">Raw Exam Score</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Score *</label>
                  <input
                    type="number"
                    value={bulkInviteForm.threshold}
                    onChange={(e) => setBulkInviteForm({ ...bulkInviteForm, threshold: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., 350"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invitation Type *</label>
                <select
                  value={bulkInviteForm.type}
                  onChange={(e) => setBulkInviteForm({ ...bulkInviteForm, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="INTERVIEW">Interview</option>
                  <option value="EXAM">Entrance Exam</option>
                  <option value="BOTH">Interview + Exam</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={bulkInviteForm.date}
                    onChange={(e) => setBulkInviteForm({ ...bulkInviteForm, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    value={bulkInviteForm.time}
                    onChange={(e) => setBulkInviteForm({ ...bulkInviteForm, time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={bulkInviteForm.location}
                  onChange={(e) => setBulkInviteForm({ ...bulkInviteForm, location: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Room 101, Main Building"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea
                  value={bulkInviteForm.instructions}
                  onChange={(e) => setBulkInviteForm({ ...bulkInviteForm, instructions: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="What should the students bring?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program (Optional)</label>
                <input
                  type="text"
                  value={bulkInviteForm.programName}
                  onChange={(e) => setBulkInviteForm({ ...bulkInviteForm, programName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Software Engineering"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBulkInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Finding Students...' : 'Review & Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}