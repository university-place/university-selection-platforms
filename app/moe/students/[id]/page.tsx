'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';
import { moeAuthHelpers } from '@/lib/api';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/moe/dashboard' },
  { label: 'Students', href: '/moe/students' },
  { label: 'Upload', href: '/moe/upload' },
  { label: 'Universities', href: '/moe/universities' },
  { label: 'Placements', href: '/moe/placements' },
  { label: 'Appeals', href: '/moe/appeals' },
  { label: 'Compliance', href: '/moe/compliance' },
  { label: 'Audit Log', href: '/moe/audit' },
  { label: 'Reports', href: '/moe/reports' },
  { label: 'Registry', href: '/moe/registry' },
];

export default function MOEStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const token = moeAuthHelpers.getToken();
        const res = await fetch(`/api/moe/student/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setStudent(json.student);
        else setError(json.error || 'Failed to load student details');
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
        {loading && <div className="bg-white rounded-lg p-6">Loading...</div>}
        {error && <div className="bg-red-50 text-red-700 rounded-lg p-4">{error}</div>}

        {student && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold">{student.fullName}</h2>
              <p className="text-gray-600 mt-1">Exam ID: {student.examID}</p>
              <p className="text-gray-600 mt-1">
                Email: {student.email || 'N/A'} · Phone: {student.phone || 'N/A'} · Region: {student.region || 'N/A'}
              </p>
              <p className="text-gray-600 mt-1">
                Stream: {student.stream || 'N/A'} · Age: {student.age || 'N/A'} · Disability: {student.disability || 'None'}
              </p>
              <p className="text-gray-600 mt-1">
                Total Score: {student.totalScore || 'N/A'} · Placement Status: {student.placementStatus}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b"><h3 className="font-semibold">University Status Timeline</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">University</th>
                      <th className="px-4 py-3 text-left">Program</th>
                      <th className="px-4 py-3 text-left">Preference Status</th>
                      <th className="px-4 py-3 text-left">MOE Status</th>
                      <th className="px-4 py-3 text-left">Invitation</th>
                      <th className="px-4 py-3 text-left">Confirmation</th>
                      <th className="px-4 py-3 text-left">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(student.universityStatuses || []).length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-6 text-gray-500">No university records</td></tr>
                    ) : (
                      (student.universityStatuses || []).map((u: any) => (
                        <tr key={u.preferenceId} className="border-t hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-purple-700">{u.universityName || 'N/A'}</td>
                          <td className="px-4 py-3">{u.programName || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                              {u.preferenceStatus || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              u.normalizedStatus === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                              u.normalizedStatus === 'PLACED' ? 'bg-blue-100 text-blue-700' :
                              u.normalizedStatus === 'NOT_PLACED' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {u.normalizedStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">{u.invitationStatus || 'N/A'}</td>
                          <td className="px-4 py-3 text-xs">{u.confirmationStatus || 'N/A'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {u.timestamp ? new Date(u.timestamp).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b"><h3 className="font-semibold">Invitations</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">University</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(student.invitations || []).length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-6 text-gray-500">No invitations</td></tr>
                    ) : (
                      (student.invitations || []).map((inv: any) => (
                        <tr key={inv.id} className="border-t">
                          <td className="px-4 py-3">{inv.universityName || 'N/A'}</td>
                          <td className="px-4 py-3">{inv.type || 'N/A'}</td>
                          <td className="px-4 py-3">{inv.date ? new Date(inv.date).toLocaleString() : 'N/A'}</td>
                          <td className="px-4 py-3">{inv.status || 'N/A'}</td>
                          <td className="px-4 py-3">{inv.location || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b"><h3 className="font-semibold">Documents (CSV/Profile Records)</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">File</th>
                      <th className="px-4 py-3 text-left">Verification</th>
                      <th className="px-4 py-3 text-left">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(student.documents || []).length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-gray-500">No documents</td></tr>
                    ) : (
                      (student.documents || []).map((d: any) => (
                        <tr key={d.id} className="border-t">
                          <td className="px-4 py-3">{d.type || 'N/A'}</td>
                          <td className="px-4 py-3">{d.fileName || 'N/A'}</td>
                          <td className="px-4 py-3">{d.verificationStatus || 'N/A'}</td>
                          <td className="px-4 py-3">{d.uploadDate ? new Date(d.uploadDate).toLocaleString() : 'N/A'}</td>
                        </tr>
                      ))
                    )}
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
