'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { platformAPI, authHelpers } from '@/lib/api';
import { PlatformUser } from '@/lib/types';

export default function PlatformUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') || '';

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roleFilter, setRoleFilter] = useState(initialRole);

  useEffect(() => {
    if (!authHelpers.isAuthenticated()) {
      router.push('/platform/login');
      return;
    }

    fetchUsers();
  }, [router, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      // If filtering by student, fetch students instead of users
      if (roleFilter === 'student') {
        const response = await platformAPI.getStudents(1, 500, '');
        if (response.success) {
          const studentData = Array.isArray(response.data) ? response.data : response.students || [];
          setUsers(
            studentData.map((student: any) => ({
              id: String(student.id || student._id),
              email: student.email || student.examID || '',
              name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown',
              role: 'student',
              status: student.isActive ? 'active' : 'inactive',
              verified: student.isVerified || false,
            }))
          );
        } else {
          setError(response.error || 'Failed to load students');
        }
      } else {
        // Fetch regular users for other roles
        const response = await platformAPI.getUsers(roleFilter || undefined);
        if (response.success && Array.isArray(response.data)) {
          setUsers(response.data);
        } else if (response.success && response.data && 'users' in response.data) {
          setUsers((response.data as any).users);
        } else {
          setError(response.error || 'Failed to load users');
        }
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string, role?: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      let response;
      if (roleFilter === 'student' || role === 'student') {
        response = await platformAPI.toggleStudent(userId, currentStatus === 'inactive');
      } else {
        response = await platformAPI.toggleUser(userId, currentStatus === 'inactive');
      }

      if (response.success) {
        setSuccess(`User ${newStatus} successfully`);
        setUsers((prev) =>
          prev.map((user) => (user.id === userId ? { ...user, status: newStatus as any } : user))
        );
      } else {
        setError(response.error || 'Failed to update status');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const handleDeleteUser = async (userId: string, role?: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      let response;
      if (roleFilter === 'student' || role === 'student') {
        response = await platformAPI.deleteStudent(userId);
      } else {
        response = await platformAPI.deleteUser(userId);
      }

      if (response.success) {
        setSuccess('User deleted successfully');
        setUsers((prev) => prev.filter((user) => user.id !== userId));
      } else {
        setError(response.error || 'Failed to delete user');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const navLinks = [
    { label: 'Dashboard', href: '/platform/dashboard' },
    { label: 'Students', href: '/platform/students' },
    { label: 'Universities', href: '/platform/universities' },
    { label: 'Settings', href: '/platform/settings' },
  ];

  const columns = [
    { key: 'email' as const, label: 'Email' },
    { key: 'name' as const, label: 'Name' },
    {
      key: 'role' as const,
      label: 'Role',
      render: (value: string) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold capitalize">
          {value}
        </span>
      ),
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            value === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'verified' as const,
      label: 'Verified',
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          value ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout title="Users Management" navLinks={navLinks} theme="orange">
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Roles</option>
                <option value="student">Students</option>
                <option value="moe">MOE Admins</option>
                <option value="university">University Admins</option>
                <option value="platform">Platform Admins</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
            <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
            <p className="mt-4 text-gray-600">Loading users…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
            <p className="text-gray-600">No users found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Verified</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            user.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            user.verified
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {user.verified ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2 flex gap-2">
                        <Button
                          onClick={() => handleToggleStatus(user.id, user.status, user.role)}
                          className={`px-3 py-1 rounded text-xs ${
                            user.status === 'active'
                              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          onClick={() => handleDeleteUser(user.id, user.role)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
