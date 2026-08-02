'use client';

import { useEffect, useState } from 'react';
import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';
import { moeAuthHelpers } from '@/lib/api';
import { ClipboardList, Filter } from 'lucide-react';

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

interface AuditLog {
  id: number; action: string; userEmail: string; timestamp: string;
  academicYear: string | null; recordsInserted: number | null; filename: string | null;
  user: { email: string; name: string; role: string } | null;
}

const ACTION_COLOR: Record<string, string> = {
  MOE_UPLOAD: 'bg-purple-100 text-purple-800',
  LOGIN: 'bg-blue-100 text-blue-800',
  LOGOUT: 'bg-gray-100 text-muted-foreground',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  CREATE: 'bg-green-100 text-green-800',
};

export default function MOEAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = moeAuthHelpers.getToken();
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (actionFilter) params.set('action', actionFilter);
      const res = await fetch(`/api/moe/monitor/audit?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) { setLogs(data.data); setTotal(data.total || 0); }
      else setError(data.error || 'Failed to load');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, actionFilter]);

  return (
    <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={NAV_LINKS} theme="purple">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-xl p-6 shadow">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">System Audit Log</h2>
              <p className="text-gray-300 text-sm">FR-M7 · Complete record of all system actions</p>
            </div>
          </div>
          <p className="text-3xl font-bold mt-4">{total.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">total entries</span></p>
        </div>

        <div className="bg-card rounded-xl shadow-sm p-4 flex gap-3">
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select className="outline-none text-sm bg-transparent" value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
              <option value="">All Actions</option>
              <option value="MOE_UPLOAD">MOE Upload</option>
              <option value="LOGIN">Login</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="CREATE">Create</option>
            </select>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm overflow-hidden">
          {error && <div className="p-4 text-red-600 bg-red-50">{error}</div>}
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-600 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Timestamp', 'Action', 'User', 'Role', 'File', 'Records', 'Acad. Year'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-muted-foreground font-semibold text-xs uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No audit entries found</td></tr>
                  ) : logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ACTION_COLOR[log.action] || 'bg-gray-100 text-muted-foreground'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{log.user?.name || log.userEmail}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{log.user?.role || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{log.filename || '—'}</td>
                      <td className="px-4 py-3 text-center font-semibold">{log.recordsInserted ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.academicYear || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > 30 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Page {page} · {total} total entries</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(page + 1)} disabled={page * 30 >= total}
                className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </MOEDashboardLayout>
  );
}
