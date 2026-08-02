'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DataTable } from '@/components/DataTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { platformAPI, authHelpers } from '@/lib/api';
import { Student } from '@/lib/types';

export default function PlatformStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stream, setStream] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!authHelpers.isAuthenticated()) {
      router.push('/platform/login');
      return;
    }

    fetchStudents();
  }, [router, page, stream]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await platformAPI.getStudents(page, 10, search, stream);
      if (response.success) {
        if (Array.isArray(response.students)) {
          setStudents(response.students);
          setTotal(response.pagination?.total || 0);
        } else if (response.data && Array.isArray(response.data)) {
          setStudents(response.data);
          setTotal(response.total || 0);
        }
      } else {
        setError(response.error || 'Failed to load students');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const navLinks = [
    { label: 'Dashboard', href: '/platform/dashboard' },
    { label: 'Users', href: '/platform/users' },
    { label: 'Students', href: '/platform/students' },
    { label: 'Universities', href: '/platform/universities' },
    { label: 'Settings', href: '/platform/settings' },
  ];

  const columns = [
    { key: 'examID' as const, label: 'Exam ID' },
    {
      key: 'firstName' as const,
      label: 'Name',
      render: (value: string, row: Student) => `${row.firstName} ${row.lastName}`,
    },
    { key: 'email' as const, label: 'Email' },
    { key: 'region' as const, label: 'Region' },
    { key: 'stream' as const, label: 'Stream' },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string | null | undefined) => {
        const safeValue = value || 'pending';
        return (
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            safeValue === 'verified'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {safeValue.charAt(0).toUpperCase() + safeValue.slice(1)}
        </span>
      )},
    },
  ];

  return (
    <DashboardLayout title="Student Records Management" navLinks={navLinks} theme="orange">
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Search by Exam ID, Name, or Email
                </label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Enter search term"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Filter by Stream
                </label>
                <select
                  value={stream}
                  onChange={(e) => {
                    setStream(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Streams</option>
                  <option value="Natural Science">Natural Science</option>
                  <option value="Social Science">Social Science</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Search
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Students Table */}
        <DataTable
          columns={columns}
          data={students}
          loading={loading}
          onRowClick={(row) => router.push(`/platform/students/${(row as any).id}`)}
        />

        {/* Pagination */}
        {total > 10 && (
          <div className="flex justify-center gap-2 pt-4">
            <Button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-muted-foreground">
              Page {page} of {Math.ceil(total / 10)}
            </span>
            <Button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / 10)}
              className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
