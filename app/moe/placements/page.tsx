'use client';

import { useEffect, useState } from 'react';
import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';
import { moeAuthHelpers } from '@/lib/api';
import { Award, CheckCircle, XCircle, Clock, Filter, Search } from 'lucide-react';

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

interface Placement {
  id: number;
  status: string;
  createdAt: string;
  student: { examID: string; firstName: string; lastName: string; stream: string; totalScore: number };
  university: { name: string; code: string; region: string };
  batch: { name: string; academicYear: string } | null;
}

interface Summary { totalPlaced: number; accepted: number; rejected: number; pending: number; }

const STATUS_COLOR: Record<string, string> = {
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  OFFERED: 'bg-blue-100 text-blue-800',
};

export default function MOEPlacementsPage() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalPlaced: 0, accepted: 0, rejected: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchPlacements = async () => {
    setLoading(true);
    try {
      const token = moeAuthHelpers.getToken();
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/moe/monitor/placements?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPlacements(data.data);
        setTotal(data.total || 0);
        if (data.summary) setSummary(data.summary);
      } else {
        setError(data.error || 'Failed to load');
      }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlacements(); }, [page, statusFilter]);

  const filtered = search
    ? placements.filter((p) =>
        `${p.student?.firstName} ${p.student?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        p.student?.examID?.toLowerCase().includes(search.toLowerCase()) ||
        p.university?.name?.toLowerCase().includes(search.toLowerCase()))
    : placements;

  return (
    <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={NAV_LINKS} theme="purple">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl p-6 shadow">
          <div className="flex items-center gap-3 mb-3">
            <Award className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Student Data Distribution</h2>
              <p className="text-emerald-100 text-sm">FR-M9 · All national placement records</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {[
              { label: 'Total Placed', value: summary.totalPlaced, color: 'bg-white/20' },
              { label: 'Accepted', value: summary.accepted, color: 'bg-green-500/30' },
              { label: 'Rejected', value: summary.rejected, color: 'bg-red-500/30' },
              { label: 'Pending', value: summary.pending, color: 'bg-yellow-500/30' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${color} rounded-lg p-3`}>
                <p className="text-xs font-medium opacity-80">{label}</p>
                <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400" />
            <input className="outline-none text-sm w-full" placeholder="Search…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select className="outline-none text-sm bg-transparent" value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="OFFERED">Offered</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {error && <div className="p-4 text-red-600 bg-red-50">{error}</div>}
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-600 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['#', 'Student', 'Exam ID', 'Stream', 'Score', 'University', 'Region', 'Batch', 'Status', 'Date'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-gray-600 font-semibold text-xs uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-12 text-gray-400">No placement records found</td></tr>
                  ) : filtered.map((p, i) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-500">{(page - 1) * 30 + i + 1}</td>
                      <td className="px-4 py-3 font-medium">{p.student?.firstName} {p.student?.lastName}</td>
                      <td className="px-4 py-3 font-mono text-emerald-700 text-xs">{p.student?.examID}</td>
                      <td className="px-4 py-3 text-gray-600">{p.student?.stream}</td>
                      <td className="px-4 py-3 font-semibold">{p.student?.totalScore ?? '—'}</td>
                      <td className="px-4 py-3">{p.university?.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.university?.region}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.batch?.academicYear || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[p.status] || 'bg-gray-100 text-gray-700'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > 30 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Showing {Math.min((page-1)*30+1, total)}–{Math.min(page*30, total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page-1))} disabled={page===1}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(page+1)} disabled={page*30>=total}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </MOEDashboardLayout>
  );
}
