'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import { 
  BarChart3, 
  Users, 
  Bell, 
  Award, 
  BookOpen, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Filter,
  Plus,
  Send,
  Loader2,
  ChevronRight,
  Inbox,
  ExternalLink
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/university/dashboard', icon: BarChart3 },
  { label: 'Applicants', href: '/university/applicants', icon: Users },
  { label: 'Invitations', href: '/university/invitations', icon: Bell },
  { label: 'Placements', href: '/university/placements', icon: Award },
  { label: 'Programs', href: '/university/programs', icon: BookOpen },
  { label: 'Appeals', href: '/university/appeals', icon: AlertCircle },
  { label: 'Settings', href: '/university/settings', icon: Settings },
];

interface Appeal {
  id: number;
  description: string;
  type: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  senderRole: string;
  target: string;
  student?: { examID: string; firstName: string; lastName: string; stream: string } | null;
  preference?: {
    program: { name: string } | null;
  } | null;
}

export default function UniversityAppealsPage() {
  const [studentAppeals, setStudentAppeals] = useState<Appeal[]>([]);
  const [moeAppeals, setMoeAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');

  // Modal State for responding to Student Appeals
  const [selectedStudentAppeal, setSelectedStudentAppeal] = useState<Appeal | null>(null);
  const [responseForm, setResponseForm] = useState({ status: 'resolved', resolution: '' });
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Modal State for filing new MoE Appeal
  const [showMoeAppealModal, setShowMoeAppealModal] = useState(false);
  const [moeAppealForm, setMoeAppealForm] = useState({ type: 'policy_variance', description: '' });
  const [submittingMoeAppeal, setSubmittingMoeAppeal] = useState(false);

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/universities/appeals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStudentAppeals(data.studentAppeals || []);
        setMoeAppeals(data.universityAppeals || []);
      } else {
        setError(data.error || 'Failed to load appeals');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  const handleOpenResponseModal = (appeal: Appeal) => {
    setSelectedStudentAppeal(appeal);
    setResponseForm({
      status: appeal.status === 'pending' ? 'resolved' : appeal.status,
      resolution: appeal.resolution || ''
    });
  };

  const handleUpdateStudentAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentAppeal) return;
    
    setSubmittingResponse(true);
    setMessage('');
    setError('');
    const token = authHelpers.getToken();

    try {
      const res = await fetch('/api/universities/appeals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          appealId: selectedStudentAppeal.id,
          status: responseForm.status,
          resolution: responseForm.resolution
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage('Successfully resolved student appeal.');
        setSelectedStudentAppeal(null);
        fetchAppeals();
      } else {
        setError(data.error || 'Failed to update appeal');
      }
    } catch {
      setError('Failed to update student appeal due to server/network issue');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleCreateMoeAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moeAppealForm.description || !moeAppealForm.type) return;

    setSubmittingMoeAppeal(true);
    setMessage('');
    setError('');
    const token = authHelpers.getToken();

    try {
      const res = await fetch('/api/universities/appeals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: moeAppealForm.type,
          description: moeAppealForm.description
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage('Appeal successfully sent to the Ministry of Education.');
        setShowMoeAppealModal(false);
        setMoeAppealForm({ type: 'policy_variance', description: '' });
        fetchAppeals();
      } else {
        setError(data.error || 'Failed to submit appeal');
      }
    } catch {
      setError('Failed to submit appeal to MoE due to network/server issue');
    } finally {
      setSubmittingMoeAppeal(false);
    }
  };

  const STATUS_COLOR: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    resolved: 'bg-green-100 text-green-800 border border-green-200',
    rejected: 'bg-red-100 text-red-800 border border-red-200',
  };

  return (
    <DashboardLayout title="University Appeals Dashboard" navLinks={NAV_LINKS} theme="blue">
      <div className="space-y-6 max-w-7xl mx-auto p-4">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-8 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2">
              <AlertCircle className="w-8 h-8 text-yellow-300" />
              Appeals Management Center
            </h1>
            <p className="text-blue-100 text-sm mt-2 max-w-xl">
              Respond directly to incoming student appeals or submit policy and capacity adjustments to the Ministry of Education.
            </p>
          </div>
          {activeTab === 'outgoing' && (
            <button
              onClick={() => setShowMoeAppealModal(true)}
              className="bg-card text-blue-700 hover:bg-blue-50 px-5 py-3 rounded-xl text-sm font-black shadow-md transition flex items-center gap-2 self-stretch md:self-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              File Appeal to MoE
            </button>
          )}
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition ${activeTab === 'incoming' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            📥 Incoming Student Appeals ({studentAppeals.length})
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition ${activeTab === 'outgoing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            📤 Outgoing MoE Appeals ({moeAppeals.length})
          </button>
        </div>

        {/* Alert Notifications */}
        {message && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700 text-sm font-bold">
            <CheckCircle className="w-5 h-5" />
            {message}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-bold">
            <XCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Dynamic Lists */}
        {loading ? (
          <div className="flex justify-center items-center py-20 bg-card rounded-2xl border">
            <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
          </div>
        ) : activeTab === 'incoming' ? (
          /* Student Appeals Grid */
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Stream</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Student Narrative</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {studentAppeals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-muted-foreground font-semibold italic">
                        No incoming student appeals found.
                      </td>
                    </tr>
                  ) : (
                    studentAppeals.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground">{a.student?.firstName} {a.student?.lastName}</div>
                          <div className="text-xs text-muted-foreground font-semibold mt-0.5">{a.student?.examID}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${a.student?.stream === 'Natural Science' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                            {a.student?.stream}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-muted-foreground capitalize">{a.type}</div>
                        </td>
                        <td className="px-6 py-4 max-w-sm">
                          <p className="text-muted-foreground line-clamp-2">"{a.description}"</p>
                          {a.resolution && (
                            <div className="text-xs text-green-700 font-semibold mt-1 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Resolution: {a.resolution}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLOR[a.status] || 'bg-gray-100 text-muted-foreground'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleOpenResponseModal(a)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-xl text-xs font-black transition"
                          >
                            Respond
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Outgoing MoE Appeals */
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Appeal Type</th>
                    <th className="px-6 py-4">Detailed Description</th>
                    <th className="px-6 py-4">MoE Status</th>
                    <th className="px-6 py-4">MoE Feedback</th>
                    <th className="px-6 py-4">Date Filed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {moeAppeals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-muted-foreground font-semibold italic">
                        No appeals filed to the Ministry of Education yet.
                      </td>
                    </tr>
                  ) : (
                    moeAppeals.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4 font-mono font-bold text-muted-foreground">
                          #{a.id}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground">{a.type === 'policy_variance' ? 'Policy Variance' : a.type === 'capacity_adjust' ? 'Capacity Adjustment' : a.type}</div>
                        </td>
                        <td className="px-6 py-4 max-w-sm">
                          <p className="text-muted-foreground">"{a.description}"</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLOR[a.status] || 'bg-gray-100 text-muted-foreground'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {a.resolution ? (
                            <p className="text-green-700 font-semibold bg-green-50/60 p-2.5 rounded-lg border border-green-200 text-xs">
                              {a.resolution}
                            </p>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Awaiting MoE decision</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Student Appeal Response Modal */}
        {selectedStudentAppeal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form onSubmit={handleUpdateStudentAppeal} className="bg-card rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <h3 className="text-xl font-black">Respond to Student Appeal</h3>
                <p className="text-blue-100 text-xs mt-1">Review applicant statement and post your administrative response.</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl space-y-2 border">
                  <p className="text-xs text-muted-foreground font-bold uppercase">Applicant Context</p>
                  <p className="text-sm font-black text-foreground">
                    {selectedStudentAppeal.student?.firstName} {selectedStudentAppeal.student?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Exam ID: {selectedStudentAppeal.student?.examID} | Stream: {selectedStudentAppeal.student?.stream}
                  </p>
                  <p className="text-xs text-muted-foreground italic mt-2 p-2.5 bg-card border rounded-lg">
                    "{selectedStudentAppeal.description}"
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-muted-foreground mb-2">Resolution Status *</label>
                  <select
                    value={responseForm.status}
                    onChange={(e) => setResponseForm({ ...responseForm, status: e.target.value })}
                    className="w-full border border-border rounded-xl px-3 py-2 bg-card font-semibold text-sm"
                  >
                    <option value="resolved">✅ Resolved / Approved</option>
                    <option value="rejected">❌ Rejected / Declined</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-muted-foreground mb-2">Resolution Notes *</label>
                  <textarea
                    required
                    value={responseForm.resolution}
                    onChange={(e) => setResponseForm({ ...responseForm, resolution: e.target.value })}
                    placeholder="Enter your administrative response detail here..."
                    rows={4}
                    className="w-full border border-border rounded-xl p-3 text-sm"
                  />
                </div>
              </div>
              
              <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setSelectedStudentAppeal(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-muted-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResponse}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md disabled:bg-gray-300"
                >
                  {submittingResponse ? 'Saving...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Outgoing MoE Appeal Modal */}
        {showMoeAppealModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form onSubmit={handleCreateMoeAppeal} className="bg-card rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                <h3 className="text-xl font-black">Submit Appeal to MoE</h3>
                <p className="text-indigo-100 text-xs mt-1">Appeal policies, student capacity allocations, or request review by Ministry of Education.</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-muted-foreground mb-2">Appeal Type *</label>
                  <select
                    value={moeAppealForm.type}
                    onChange={(e) => setMoeAppealForm({ ...moeAppealForm, type: e.target.value })}
                    className="w-full border border-border rounded-xl px-3 py-2 bg-card font-semibold text-sm"
                  >
                    <option value="policy_variance">Policy Variance Request</option>
                    <option value="capacity_adjust">Capacity Adjustment</option>
                    <option value="system_issue">System Interface Error</option>
                    <option value="other">Other Administrative Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-muted-foreground mb-2">Detailed Justification & Description *</label>
                  <textarea
                    required
                    value={moeAppealForm.description}
                    onChange={(e) => setMoeAppealForm({ ...moeAppealForm, description: e.target.value })}
                    placeholder="Provide full description, reasoning, and context for the Ministry..."
                    rows={6}
                    className="w-full border border-border rounded-xl p-3 text-sm"
                  />
                </div>
              </div>
              
              <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setShowMoeAppealModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-muted-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMoeAppeal}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md disabled:bg-gray-300"
                >
                  {submittingMoeAppeal ? 'Submitting...' : 'Submit Appeal'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
