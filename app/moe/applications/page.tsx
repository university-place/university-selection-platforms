'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';
import { moeAuthHelpers } from '@/lib/api';
import { FileText, Filter, Search, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

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

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-100 text-blue-800',
  NOT_PLACED: 'bg-orange-100 text-orange-800',
  WAITING_RESPONSE: 'bg-purple-100 text-purple-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
};

interface ApplicationRow {
  id: number;
  status: string;
  createdAt: string;
  student: {
    id: number;
    examID: string;
    firstName: string;
    lastName: string;
    stream: string;
    totalScore: number;
  };
  university: { id: number; name: string };
  program: { id: number; name: string } | null;
}

export default function MOEApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [streamFilter, setStreamFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [summary, setSummary] = useState({
    total: 0,
    placed: 0,
    notPlaced: 0,
    waitingResponse: 0,
    confirmed: 0,
    declined: 0,
    pending: 0,
  });

  const fetchRows = async () => {
    setLoading(true);
    try {
      const token = moeAuthHelpers.getToken();
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (streamFilter) params.set('stream', streamFilter);
      if (regionFilter) params.set('region', regionFilter);
      if (minScore) params.set('minScore', minScore);
      if (maxScore) params.set('maxScore', maxScore);

      const res = await fetch(`/api/moe/monitor/applications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load applications');

      setApplications(data.data || []);
      setTotal(data.total || 0);
      setSummary(data.summary || summary);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [page, statusFilter, streamFilter, regionFilter]);

  const statusCards = [
    { label: 'Placed', value: summary.placed, cls: 'bg-blue-50 border-blue-200 text-blue-800', icon: CheckCircle },
    { label: 'Not Placed', value: summary.notPlaced, cls: 'bg-orange-50 border-orange-200 text-orange-800', icon: XCircle },
    { label: 'Waiting Response', value: summary.waitingResponse, cls: 'bg-purple-50 border-purple-200 text-purple-800', icon: Clock },
    { label: 'Confirmed', value: summary.confirmed, cls: 'bg-green-50 border-green-200 text-green-800', icon: CheckCircle },
    { label: 'Declined', value: summary.declined, cls: 'bg-red-50 border-red-200 text-red-800', icon: XCircle },
    { label: 'Pending', value: summary.pending, cls: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: AlertCircle },
  ];

  return (
    <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={NAV_LINKS} theme="purple">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-6 shadow">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">National Submission Monitoring</h2>
              <p className="text-purple-100 text-sm mt-0.5">FR-M2 · Student-university status tracking</p>
            </div>
          </div>
          <div className="mt-4 text-3xl font-bold">{summary.total.toLocaleString()} <span className="text-lg font-normal text-purple-200">records</span></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statusCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`border rounded-lg p-3 ${card.cls}`}>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Icon className="w-4 h-4" />
                  <span>{card.label}</span>
                </div>
                <p className="text-2xl font-bold mt-2">{card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              className="outline-none text-sm w-full"
              placeholder="Student/university..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select className="outline-none text-sm bg-transparent w-full" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="PLACED">Placed</option>
              <option value="NOT_PLACED">Not Placed</option>
              <option value="WAITING_RESPONSE">Waiting Response</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="DECLINED">Declined</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={streamFilter} onChange={(e) => { setStreamFilter(e.target.value); setPage(1); }}>
            <option value="">All Streams</option>
            <option value="natural">Natural Science</option>
            <option value="social">Social Science</option>
          </select>
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Region" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Min score" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Max score" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          <button onClick={() => { setPage(1); fetchRows(); }} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm">Apply Filters</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {error && <div className="p-4 text-red-600 bg-red-50">{error}</div>}
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['#', 'Student', 'Exam ID', 'Stream', 'Score', 'University', 'Program', 'Status', 'Date'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-gray-600 font-semibold text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {applications.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-gray-400">No applications found</td></tr>
                  ) : applications.map((app, i) => (
                    <tr key={app.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => router.push(`/moe/students/${app.student?.id}`)}>
                      <td className="px-4 py-3 text-gray-500">{(page - 1) * 30 + i + 1}</td>
                      <td className="px-4 py-3 font-medium">{app.student?.firstName} {app.student?.lastName}</td>
                      <td className="px-4 py-3 font-mono text-purple-700 text-xs">{app.student?.examID}</td>
                      <td className="px-4 py-3 text-gray-600">{app.student?.stream}</td>
                      <td className="px-4 py-3 font-semibold">{app.student?.totalScore ?? '—'}</td>
                      <td className="px-4 py-3">{app.university?.name}</td>
                      <td className="px-4 py-3">{app.program?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-700'}`}>{app.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(app.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > 30 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Showing {Math.min((page - 1) * 30 + 1, total)}–{Math.min(page * 30, total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(page + 1)} disabled={page * 30 >= total} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </MOEDashboardLayout>
  );
}
