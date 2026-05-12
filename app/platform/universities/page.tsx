'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DataTable } from '@/components/DataTable';
import { platformAPI, authHelpers } from '@/lib/api';

interface PlatformUniversity {
  id: string;
  name: string;
  code?: string;
  isActive?: boolean;
  hasDashboard?: boolean;
  createdAt?: string;
}

export default function PlatformUniversitiesPage() {
  const router = useRouter();
  const [universities, setUniversities] = useState<PlatformUniversity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authHelpers.isAuthenticated()) {
      router.push('/platform/login');
      return;
    }

    const fetchUniversities = async () => {
      setLoading(true);
      setError('');

      try {
        // Fetch universities
        const uniResponse = await platformAPI.getUniversities();
        if (!uniResponse.success || !Array.isArray(uniResponse.data)) {
          setError(uniResponse.error || uniResponse.message || 'Failed to load universities');
          setLoading(false);
          return;
        }

        // Fetch all users to check which universities have dashboards
        const usersResponse = await platformAPI.getUsers();
        const univAdmins = usersResponse.success && Array.isArray(usersResponse.data) 
          ? usersResponse.data.filter((u: any) => u.role === 'university' || u.role === 'UNIVERSITY')
          : [];

        // Map universities with dashboard info
        const universitiesWithDashboard = uniResponse.data.map((item: any) => {
          const adminCount = univAdmins.filter((admin: any) => 
            String(admin.university_id || admin.universityId) === String(item.id)
          ).length;

          return {
            id: String(item.id || item._id || item.code || item.name),
            name: item.name || 'Unknown university',
            code: item.code || item.uniCode || item.universityCode,
            isActive: item.isActive ?? item.active ?? true,
            hasDashboard: adminCount > 0,
            createdAt: item.createdAt || item.created_at || '',
          };
        });

        setUniversities(universitiesWithDashboard);
      } catch (err) {
        setError('An error occurred while loading data');
      }
      setLoading(false);
    };

    fetchUniversities();
  }, [router]);

  const navLinks = [
    { label: 'Dashboard', href: '/platform/dashboard' },
    { label: 'Users', href: '/platform/users' },
    { label: 'Students', href: '/platform/students' },
    { label: 'Settings', href: '/platform/settings' },
  ];

  const columns = [
    { key: 'name' as const, label: 'University' },
    { key: 'code' as const, label: 'Code' },
    {
      key: 'hasDashboard' as const,
      label: 'Status',
      render: (value: boolean) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value ? 'Has Dashboard' : 'No Dashboard'}
        </span>
      ),
    },
    {
      key: 'createdAt' as const,
      label: 'Created',
      render: (value: string) => (value ? new Date(value).toLocaleDateString() : '—'),
    },
  ];

  return (
    <DashboardLayout title="Universities" navLinks={navLinks} theme="orange">
      <div className="space-y-8">
        <div className="rounded-[2.5rem] border border-border/50 bg-card/80 p-8 shadow-2xl shadow-primary/5">
          <h1 className="text-4xl font-black tracking-tight">Platform Universities</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Review the list of registered universities for the platform admin portal.
          </p>
        </div>

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        )}

        <DataTable
          columns={columns}
          data={universities}
          loading={loading}
          emptyMessage={error ? 'Unable to load universities' : 'No universities found'}
        />
      </div>
    </DashboardLayout>
  );
}
