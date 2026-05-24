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
  
  // Filter States
  const [stream, setStream] = useState('all');
  const [gender, setGender] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const token = moeAuthHelpers.getToken();
        const queryParams = new URLSearchParams({
          stream,
          gender,
          status,
        });
        const res = await fetch(`/api/moe/university/${params.id}?${queryParams}`, {
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
  }, [params.id, stream, gender, status]);

  return (
    <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={NAV_LINKS} theme="purple">
      <div className="space-y-6">
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

            {/* Filters Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Stream Filter</label>
                <select
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Streams</option>
                  <option value="natural">Natural Science</option>
                  <option value="social">Social Science</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Gender Filter</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status Filter</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="PLACED">Placed</option>
                  <option value="NOT_PLACED">Not Placed</option>
                  <option value="ACCEPTED_BY_STUDENT">Accepted by Student</option>
                  <option value="REJECTED_BY_STUDENT">Rejected by Student</option>
                  <option value="INVITATION_ACCEPTED">Invitation Accepted</option>
                  <option value="INVITATION_REJECTED">Invitation Rejected</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Applications</h3>
                <span className="text-sm text-gray-500">{(data.applications || []).length} results</span>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading filtered applications...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Student</th>
                        <th className="px-4 py-3 text-left">Exam ID</th>
                        <th className="px-4 py-3 text-left">Gender</th>
                        <th className="px-4 py-3 text-left">Stream</th>
                        <th className="px-4 py-3 text-left">Program</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.applications || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No applications found matching the criteria.
                          </td>
                        </tr>
                      ) : (
                        (data.applications || []).slice(0, 100).map((item: any) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {item.student?.firstName} {item.student?.lastName}
                            </td>
                            <td className="px-4 py-3 font-mono">{item.student?.examID}</td>
                            <td className="px-4 py-3">{item.student?.gender || 'N/A'}</td>
                            <td className="px-4 py-3 text-xs font-semibold">
                              <span className={`px-2 py-1 rounded-full ${item.student?.stream === 'Natural Science' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                {item.student?.stream || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">{item.program?.name || 'N/A'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                item.isCancelled ? 'bg-red-100 text-red-800' :
                                item.status === 'PLACED' ? 'bg-green-100 text-green-800' :
                                item.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.isCancelled ? 'CANCELLED' : item.status || 'PENDING'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MOEDashboardLayout>
  );
}
