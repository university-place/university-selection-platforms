'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';

interface Application {
  id: number;
  universityId: number;
  universityName: string;
  status: string;
  submittedAt: string;
}

export default function StudentApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/student/login');
      return;
    }

    const fetchApplications = async () => {
      try {
        const res = await fetch('/api/students/applications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!isMounted) return;

        if (data.success) {
          // The API returns a flat applications array
          const apps = data.applications || [];
          setApplications(apps);
        } else {
          setError(data.error || 'Failed to load applications');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('An error occurred while loading applications');
      } finally {
        if (isMounted) setLoading(false);
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date not available';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString();
  };

  const navLinks = [
    { label: 'Dashboard', href: '/student/dashboard' },
    { label: 'Profile', href: '/student/profile' },
    { label: 'Invitations', href: '/student/invitations' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="My Applications" navLinks={navLinks} theme="blue">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="My Applications" navLinks={navLinks} theme="blue">
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
    <DashboardLayout title="My Applications" navLinks={navLinks} theme="blue">
      <div className="mb-6 flex justify-end">
        <a
          href="/student/apply"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Apply New
        </a>
      </div>

      {applications.length === 0 ? (
        <div className="bg-card rounded-lg shadow p-12 text-center border border-border">
          <p className="text-muted-foreground mb-4">You have no applications yet.</p>
          <a
            href="/student/apply"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Apply Now
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-card rounded-lg shadow p-6 border border-border">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{app.universityName}</h3>
                  <p className="text-xs text-muted-foreground mt-2">
                    Applied: {formatDate(app.submittedAt)}
                  </p>
                </div>
                <div>{getStatusBadge(app.status)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}