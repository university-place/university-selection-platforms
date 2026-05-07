'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatsCard } from '@/components/StatsCard';
import { authHelpers } from '@/lib/api';

interface Application {
  id: number;
  examID: string;
  studentName: string;
  programName: string;
  score: number;
  status: string;
  appliedAt: string;
}

export default function UniversityApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
  let isMounted = true;
  const fetchApplications = async () => {
    try {
      const token = authHelpers.getToken();
      if (!token) {
        router.push('/university/login');
        return;
      }
      const res = await fetch('/api/universities/applications?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (isMounted) {
        if (data.success) {
          setApplications(data.applications || []);
        } else {
          setError(data.error || 'Failed to load applications');
        }
        setLoading(false);
      }
    } catch (err) {
      if (isMounted) {
        setError('An error occurred');
        setLoading(false);
      }
    }
  };
  fetchApplications();
  return () => { isMounted = false; };
}, [router]);
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACCEPTED':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Accepted</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
    }
  };

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard' },
    { label: 'Applications', href: '/university/applications' },
    { label: 'Applicants', href: '/university/applicants' },
    { label: 'Invitations', href: '/university/invitations' },
    { label: 'Placements', href: '/university/placements' },
    { label: 'Programs', href: '/university/programs' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Applications" navLinks={navLinks} theme="green">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Applications" navLinks={navLinks} theme="green">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-sm underline">
            Try again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Applications" navLinks={navLinks} theme="green">
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No applications found.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{app.examID}</td>
                    <td className="px-6 py-4 text-sm">{app.studentName}</td>
                    <td className="px-6 py-4 text-sm">{app.programName}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{app.score}</td>
                    <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}