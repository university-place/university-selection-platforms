'use client';

import { useEffect, useState } from 'react';
import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';
import { moeAuthHelpers } from '@/lib/api';
import { MessageSquare, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/moe/dashboard' },
  { label: 'Students', href: '/moe/students' },
  { label: 'Applications', href: '/moe/applications' },
  { label: 'Placements', href: '/moe/placements' },
  { label: 'Appeals', href: '/moe/appeals' },
  { label: 'Universities', href: '/moe/universities' },
  { label: 'Compliance', href: '/moe/compliance' },
  { label: 'Audit Log', href: '/moe/audit' },
  { label: 'Upload', href: '/moe/upload' },
];

interface Appeal {
  id: number;
  reason: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  student: { examID: string; firstName: string; lastName: string; stream: string };
}

interface Summary { totalAppeals: number; pending: number; resolved: number; rejected: number; }

export default function MOEAppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalAppeals: 0, pending: 0, resolved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const token = moeAuthHelpers.getToken();
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/moe/monitor/appeals?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAppeals(data.data);
        if (data.summary) setSummary(data.summary);
      } else {
        setError(data.error || 'Failed to load');
      }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAppeals(); }, [statusFilter]);

  const handleResolve = async () => {
    if (!selectedAppeal || !newStatus) return;
    setUpdating(selectedAppeal.id);
    try {
      const token = moeAuthHelpers.getToken();
      const res = await fetch('/api/moe/monitor/appeals', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ appealId: selectedAppeal.id, status: newStatus, resolution }),
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
    PENDING: 'bg-yellow-100 text-yellow-800',
    RESOLVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
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

        <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3">
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select className="outline-none text-sm bg-transparent" value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
                    {['Student', 'Exam ID', 'Stream', 'Reason', 'Status', 'Filed', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-gray-600 font-semibold text-xs uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appeals.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">No appeals found</td></tr>
                  ) : appeals.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium">{a.student?.firstName} {a.student?.lastName}</td>
                      <td className="px-4 py-3 font-mono text-orange-700 text-xs">{a.student?.examID}</td>
                      <td className="px-4 py-3 text-gray-600">{a.student?.stream}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="truncate text-gray-700" title={a.reason}>{a.reason}</p>
                        {a.resolution && <p className="text-xs text-green-600 mt-1 truncate">Resolution: {a.resolution}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[a.status] || 'bg-gray-100 text-gray-700'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {a.status === 'PENDING' && (
                          <button onClick={() => { setSelectedAppeal(a); setNewStatus('RESOLVED'); }}
                            className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition">
                            Resolve
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
              <h3 className="text-lg font-bold mb-2">Resolve Appeal</h3>
              <p className="text-sm text-gray-600 mb-4">
                Student: <strong>{selectedAppeal.student?.firstName} {selectedAppeal.student?.lastName}</strong>
              </p>
              <p className="text-sm bg-gray-50 rounded p-3 mb-4 text-gray-700">{selectedAppeal.reason}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Decision *</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="">Select…</option>
                    <option value="RESOLVED">Resolved (Approve)</option>
                    <option value="REJECTED">Rejected (Deny)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Note</label>
                  <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Explain your decision…" value={resolution}
                    onChange={(e) => setResolution(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleResolve} disabled={!newStatus || updating !== null}
                    className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
                    {updating ? 'Saving…' : 'Submit Decision'}
                  </button>
                  <button onClick={() => setSelectedAppeal(null)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300">
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
