'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DataTable } from '@/components/DataTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { moeAPI, moeAuthHelpers } from '@/lib/api';
import { Student } from '@/lib/types';
import { Users, CheckCircle, XCircle, Clock, Award, AlertTriangle } from 'lucide-react';

interface PlacementSummary {
  total: number;
  placed: number;
  multiPlaced: number;
  notPlacedSome: number;
  notPlacedNone: number;
  acceptedByStudent: number;
}

export default function MOEStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stream, setStream] = useState('');
  const [placementStatus, setPlacementStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<PlacementSummary>({
    total: 0, placed: 0, multiPlaced: 0, notPlacedSome: 0, notPlacedNone: 0, acceptedByStudent: 0
  });

  useEffect(() => {
    if (!moeAuthHelpers.isAuthenticated()) {
      router.push('/moe/login');
      return;
    }
    fetchStudents();
  }, [router, page, stream]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await moeAPI.getStudents(page, 10, search, stream, placementStatus);
      if (response.success) {
        const data = response.data as any;
        const studentList = Array.isArray(data)
          ? data
          : Array.isArray(data?.students)
          ? data.students
          : Array.isArray(data?.data)
          ? data.data
          : [];
        setStudents(studentList);
        setTotal(data?.pagination?.total || data?.total || studentList.length);
        if (data?.summary) setSummary(data.summary);
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
    { label: 'Dashboard', href: '/moe/dashboard' },
    { label: 'Students', href: '/moe/students' },
    { label: 'Upload', href: '/moe/upload' },
    { label: 'Universities', href: '/moe/universities' },
    { label: 'Placements', href: '/moe/placements' },
    { label: 'Appeals', href: '/moe/appeals' },
    { label: 'Compliance', href: '/moe/compliance' },
    { label: 'Audit Log', href: '/moe/audit' },
    { label: 'Settings', href: '/moe/settings' },
  ];

  const summaryCards = [
    { label: 'Total Students', value: summary.total, icon: Users, color: 'bg-purple-50 text-purple-700 border-purple-200', iconBg: 'bg-purple-100' },
    { label: 'Placed', value: summary.placed, icon: CheckCircle, color: 'bg-green-50 text-green-700 border-green-200', iconBg: 'bg-green-100' },
    { label: 'Multi-Placed', value: summary.multiPlaced, icon: Award, color: 'bg-blue-50 text-blue-700 border-blue-200', iconBg: 'bg-blue-100' },
    { label: 'Not Placed (Applied)', value: summary.notPlacedSome, icon: AlertTriangle, color: 'bg-yellow-50 text-yellow-700 border-yellow-200', iconBg: 'bg-yellow-100' },
    { label: 'Not Placed (No App)', value: summary.notPlacedNone, icon: XCircle, color: 'bg-red-50 text-red-700 border-red-200', iconBg: 'bg-red-100' },
    { label: 'Accepted by Student', value: summary.acceptedByStudent, icon: Clock, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', iconBg: 'bg-emerald-100' },
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
    { key: 'totalScore' as const, label: 'Total Score' },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string | null | undefined) => {
        const safeValue = value || 'pending';
        return (
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            safeValue === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {safeValue.charAt(0).toUpperCase() + safeValue.slice(1)}
          </span>
        );
      },
    },
  ];

  return (
    <DashboardLayout title="Student Management" navLinks={navLinks} theme="purple">
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Placement Status Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${card.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
                <p className="text-xs font-medium mt-1 opacity-80">{card.label}</p>
              </div>
            );
          })}
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search by Exam ID, Name, or Email
                </label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Enter search term"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Stream
                </label>
                <select
                  value={stream}
                  onChange={(e) => { setStream(e.target.value); setPage(1); }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Streams</option>
                  <option value="Natural Science">Natural Science</option>
                  <option value="Social Science">Social Science</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placement Status
                </label>
                <select
                  value={placementStatus}
                  onChange={(e) => { setPlacementStatus(e.target.value); setPage(1); }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Statuses</option>
                  <option value="NOT_REGISTERED">Not Registered in our platform</option>
                  <option value="PLACED">Placed (Any University)</option>
                  <option value="NOT_PLACED">Not Placed (All)</option>
                  <option value="NOT_PLACED_SOME">Not Placed (Applied to Some)</option>
                  <option value="NOT_PLACED_NONE">Not Placed (Applied to None)</option>
                  <option value="MULTI_PLACED">Placed (Multiple Universities)</option>
                  <option value="ACCEPTED">Accepted by Student</option>
                  <option value="ACCEPTED_MULTIPLE">Accepted Multiple</option>
                  <option value="REJECTED">Declined/Rejected by Student</option>
                  <option value="PENDING">Pending Response</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
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
          onRowClick={(row) => router.push(`/moe/students/${(row as any).id}`)}
        />

        {/* Pagination */}
        {total > 10 && (
          <div className="flex justify-center gap-2 pt-4">
            <Button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-gray-600">
              Page {page} of {Math.ceil(total / 10)}
            </span>
            <Button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / 10)}
              className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
