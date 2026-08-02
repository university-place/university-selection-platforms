'use client';

import { useEffect, useState } from 'react';
import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';
import { moeAuthHelpers } from '@/lib/api';
import { 
  MessageSquare, Filter, CheckCircle, XCircle, Clock,
  LayoutDashboard, Users, FileText, Target, 
  AlertCircle, Building2, ShieldCheck, Upload, Settings
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/moe/dashboard', icon: LayoutDashboard },
  { label: 'Students', href: '/moe/students', icon: Users },
  { label: 'Applications', href: '/moe/applications', icon: FileText },
  { label: 'Placements', href: '/moe/placements', icon: Target },
  { label: 'Appeals', href: '/moe/appeals', icon: AlertCircle },
  { label: 'Universities', href: '/moe/universities', icon: Building2 },
  { label: 'Compliance', href: '/moe/compliance', icon: ShieldCheck },
  { label: 'Audit Log', href: '/moe/audit', icon: Clock },
  { label: 'Upload', href: '/moe/upload', icon: Upload },
  { label: 'Settings', href: '/moe/settings', icon: Settings },
];

interface Appeal {
  id: number;
  description: string;
  type: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  student: { examID: string; firstName: string; lastName: string; stream: string; region: string };
  preference?: {
    university: { name: true };
    program: { name: true };
  };
}

interface Summary { totalAppeals: number; pending: number; resolved: number; rejected: number; }

export default function MOEAppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalAppeals: 0, pending: 0, resolved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [streamFilter, setStreamFilter] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const token = moeAuthHelpers.getToken();
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter.toLowerCase());
      if (streamFilter) params.set('stream', streamFilter);
      
      const res = await fetch(`/api/moe/appeals?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAppeals(data.data);
        
        // Calculate summary from data
        const total = data.data.length;
        const pending = data.data.filter((a: any) => a.status === 'pending').length;
        const resolved = data.data.filter((a: any) => a.status === 'resolved').length;
        const rejected = data.data.filter((a: any) => a.status === 'rejected').length;
        setSummary({ totalAppeals: total, pending, resolved, rejected });
      } else {
        setError(data.error || 'Failed to load');
      }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAppeals(); }, [statusFilter, streamFilter]);

  const handleResolve = async () => {
    if (!selectedAppeal || !newStatus) return;
    setUpdating(selectedAppeal.id);
    try {
      const token = moeAuthHelpers.getToken();
      const res = await fetch('/api/moe/appeals', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedAppeal.id, status: newStatus.toLowerCase(), resolution }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAppeal(null);
        setResolution('');
        setNewStatus('');
        fetchAppeals();
      }
    } finally { setUpdating(null); }
  };

  const STATUS_COLOR: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={NAV_LINKS} theme="purple">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl p-6 shadow">
          <div className="flex items-center gap-3 mb-3">
            <MessageSquare className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Appeal & Dispute Management</h2>
              <p className="text-orange-100 text-sm">FR-M4, FR-M8 · Review and resolve student appeals</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {[
              { label: 'Total', value: summary.totalAppeals, color: 'bg-white/20' },
              { label: 'Pending', value: summary.pending, color: 'bg-yellow-500/30' },
              { label: 'Resolved', value: summary.resolved, color: 'bg-green-500/30' },
              { label: 'Rejected', value: summary.rejected, color: 'bg-red-500/30' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${color} rounded-lg p-3`}>
                <p className="text-xs opacity-80">{label}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm p-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select className="outline-none text-sm bg-transparent" value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStreamFilter('')}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                streamFilter === '' ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
              }`}
            >
              All Streams ({summary.totalAppeals})
            </button>
            <button
              onClick={() => setStreamFilter('Natural Science')}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                streamFilter === 'Natural Science' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Natural Science
            </button>
            <button
              onClick={() => setStreamFilter('Social Science')}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                streamFilter === 'Social Science' ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Social Science
            </button>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm overflow-hidden">
          {error && <div className="p-4 text-red-600 bg-red-50">{error}</div>}
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Student', 'Exam ID', 'Stream', 'Type', 'Description', 'Status', 'Filed', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-muted-foreground font-semibold text-xs uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appeals.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No appeals found</td></tr>
                  ) : appeals.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium">{a.student?.firstName} {a.student?.lastName}</td>
                      <td className="px-4 py-3 font-mono text-orange-700 text-xs">{a.student?.examID}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          a.student?.stream === 'Natural Science' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {a.student?.stream}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-medium uppercase text-xs">{a.type}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="truncate text-muted-foreground" title={a.description}>{a.description}</p>
                        {a.resolution && <p className="text-xs text-green-600 mt-1 truncate">Resolution: {a.resolution}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${STATUS_COLOR[a.status] || 'bg-gray-100 text-muted-foreground'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {a.status === 'pending' && (
                          <button onClick={() => { setSelectedAppeal(a); setNewStatus('resolved'); }}
                            className="text-xs font-bold bg-orange-600 text-white px-3 py-1 rounded-full hover:bg-orange-700 transition shadow-sm">
                            DECIDE
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resolution Modal */}
        {selectedAppeal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
              <h3 className="text-2xl font-black mb-2 tracking-tight">Resolve Appeal</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Student: <strong className="text-foreground">{selectedAppeal.student?.firstName} {selectedAppeal.student?.lastName}</strong> ({selectedAppeal.student?.examID})
              </p>
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-sm text-muted-foreground border border-border">
                <p className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground mb-2">Appeal Description</p>
                {selectedAppeal.description}
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Final Decision *</label>
                  <select className="w-full bg-muted border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-500 transition-all"
                    value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="">Select Action…</option>
                    <option value="resolved">Approve Appeal (Resolved)</option>
                    <option value="rejected">Deny Appeal (Rejected)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Resolution Note</label>
                  <textarea rows={3} className="w-full bg-muted border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-500 transition-all"
                    placeholder="Provide reasoning for your decision…" value={resolution}
                    onChange={(e) => setResolution(e.target.value)} />
                </div>
                <div className="flex gap-4 pt-2">
                  <button onClick={handleResolve} disabled={!newStatus || updating !== null}
                    className="flex-1 bg-orange-600 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-orange-700 disabled:opacity-50 shadow-lg shadow-orange-600/20 active:scale-95 transition-all">
                    {updating ? 'Processing…' : 'Submit Decision'}
                  </button>
                  <button onClick={() => setSelectedAppeal(null)}
                    className="flex-1 bg-gray-100 text-muted-foreground py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 active:scale-95 transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MOEDashboardLayout>
  );
}

