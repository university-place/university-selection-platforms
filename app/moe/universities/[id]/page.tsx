'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';
import { moeAuthHelpers } from '@/lib/api';

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

export default function MOEUniversityDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const token = moeAuthHelpers.getToken();
        const res = await fetch(`/api/moe/university/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setData(json.data);
        else setError(json.error || 'Failed to load university details');
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    if (params.id) run();
  }, [params.id]);

  return (
    <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={NAV_LINKS} theme="purple">
      <div className="space-y-6">
        {loading && <div className="p-8 bg-white rounded-lg">Loading...</div>}
        {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        {data && (
          <>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">{data.university.name}</h2>
              <p className="text-gray-600 mt-1">{data.university.code} · {data.university.type} · {data.university.region || 'N/A'}</p>
              <p className="text-sm mt-2 text-gray-500">
                Registered: {data.university.isRegistered ? 'Yes' : 'No'} · Active: {data.university.isActive ? 'Yes' : 'No'} · Verified: {data.university.isVerified ? 'Yes' : 'No'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(data.statusSummary).map(([key, value]) => (
                <div key={key} className="bg-white rounded-lg p-4 shadow-sm border">
                  <p className="text-xs uppercase text-gray-500">{key}</p>
                  <p className="text-2xl font-bold text-gray-900">{String(value)}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Applications</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Exam ID</th>
                      <th className="px-4 py-3 text-left">Program</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.applications || []).slice(0, 100).map((item: any) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-3">{item.student?.firstName} {item.student?.lastName}</td>
                        <td className="px-4 py-3">{item.student?.examID}</td>
                        <td className="px-4 py-3">{item.program?.name || 'N/A'}</td>
                        <td className="px-4 py-3">{item.status || 'PENDING'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </MOEDashboardLayout>
  );
}
