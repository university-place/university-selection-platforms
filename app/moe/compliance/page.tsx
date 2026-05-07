'use client';

import { useEffect, useState } from 'react';
import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';
import { moeAuthHelpers } from '@/lib/api';
import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

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

interface ComplianceRow {
  id: number; name: string; code: string; region: string; isActive: boolean;
  totalApplications: number; invitationsSent: number; acceptedApplications: number;
  pendingApplications: number; totalPlacements: number; responseRate: number; complianceStatus: string;
}

const COMPLIANCE_COLOR: Record<string, { badge: string; icon: any; label: string }> = {
  COMPLIANT: { badge: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Compliant' },
  PARTIAL: { badge: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, label: 'Partial' },
  NON_COMPLIANT: { badge: 'bg-red-100 text-red-800', icon: XCircle, label: 'Non-Compliant' },
};

export default function MOECompliancePage() {
  const [data, setData] = useState<ComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = moeAuthHelpers.getToken();
        const res = await fetch('/api/moe/monitor/compliance', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setData(json.data);
        else setError(json.error || 'Failed to load');
      } catch { setError('Network error'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filtered = filter ? data.filter((d) => d.complianceStatus === filter) : data;
  const compliant = data.filter((d) => d.complianceStatus === 'COMPLIANT').length;
  const partial = data.filter((d) => d.complianceStatus === 'PARTIAL').length;
  const nonCompliant = data.filter((d) => d.complianceStatus === 'NON_COMPLIANT').length;

  return (
    <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={NAV_LINKS} theme="purple">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-6 shadow">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">University Compliance Monitoring</h2>
              <p className="text-blue-100 text-sm">FR-M5 · Track university responsiveness and adherence</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            {[
              { label: 'Compliant', value: compliant, color: 'bg-green-500/30' },
              { label: 'Partial', value: partial, color: 'bg-yellow-500/30' },
              { label: 'Non-Compliant', value: nonCompliant, color: 'bg-red-500/30' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${color} rounded-lg p-4 text-center`}>
                <p className="text-xs opacity-80">{label}</p>
                <p className="text-3xl font-bold mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3">
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
            value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All Universities</option>
            <option value="COMPLIANT">Compliant Only</option>
            <option value="PARTIAL">Partial Only</option>
            <option value="NON_COMPLIANT">Non-Compliant Only</option>
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {error && <div className="p-4 text-red-600 bg-red-50">{error}</div>}
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['University', 'Code', 'Region', 'Applications', 'Invitations', 'Accepted', 'Placements', 'Response Rate', 'Compliance'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-gray-600 font-semibold text-xs uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-gray-400">No data</td></tr>
                  ) : filtered.map((u) => {
                    const c = COMPLIANCE_COLOR[u.complianceStatus] || COMPLIANCE_COLOR.NON_COMPLIANT;
                    const Icon = c.icon;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-blue-700">{u.code}</td>
                        <td className="px-4 py-3 text-gray-500">{u.region}</td>
                        <td className="px-4 py-3 text-center font-semibold">{u.totalApplications}</td>
                        <td className="px-4 py-3 text-center">{u.invitationsSent}</td>
                        <td className="px-4 py-3 text-center text-green-700 font-semibold">{u.acceptedApplications}</td>
                        <td className="px-4 py-3 text-center text-purple-700 font-semibold">{u.totalPlacements}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="h-2 rounded-full bg-blue-500" style={{ width: `${u.responseRate}%` }} />
                            </div>
                            <span className="text-xs font-medium">{u.responseRate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${c.badge}`}>
                            <Icon className="w-3 h-3" /> {c.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MOEDashboardLayout>
  );
}
