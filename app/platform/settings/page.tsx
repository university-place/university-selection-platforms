'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import {
  Calendar, CheckCircle, Clock, Lock, Save,
  AlertCircle, Settings, Shield, Plus
} from 'lucide-react';

interface AcademicYear {
  id: number;
  year: string;
  isActive: boolean;
  archived: boolean;
  studentCount: number;
}

export default function PlatformSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // System config
  const [maxAttempts, setMaxAttempts] = useState(10);

  // Academic year management
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [activatingYear, setActivatingYear] = useState('');

  // Password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const navLinks = [
    { label: 'Dashboard', href: '/platform/dashboard' },
    { label: 'Users', href: '/platform/users' },
    { label: 'Students', href: '/platform/students' },
    { label: 'Universities', href: '/platform/universities' },
    { label: 'Settings', href: '/platform/settings' },
  ];

  useEffect(() => {
    if (!authHelpers.isAuthenticated()) {
      router.push('/platform/login');
      return;
    }
    fetchAll();
  }, [router]);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchSettings(), fetchYears()]);
    setLoading(false);
  }

  async function fetchSettings() {
    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/platform/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.settings?.maxSubmissionAttempts !== undefined) {
        setMaxAttempts(Number(data.settings.maxSubmissionAttempts));
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    }
  }

  async function fetchYears() {
    setYearsLoading(true);
    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/admin/years', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setYears(data);
    } catch (err) {
      console.error('Fetch years error:', err);
    } finally {
      setYearsLoading(false);
    }
  }

  async function handleActivateYear(year: string) {
    setActivatingYear(year);
    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/admin/years/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ academicYear: year })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Academic year ${year} activated successfully!` });
        fetchYears();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to activate year' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setActivatingYear('');
      setTimeout(() => setMessage(null), 4000);
    }
  }

  async function handleAddYear() {
    if (!newYear.trim()) return;
    try {
      const token = authHelpers.getToken();
      // Use the activate endpoint which creates the year if it doesn't exist
      const res = await fetch('/api/admin/years/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ academicYear: newYear.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Year ${newYear} added and activated` });
        setNewYear('');
        fetchYears();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add year' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setTimeout(() => setMessage(null), 4000);
    }
  }

  async function handleSaveMaxAttempts() {
    setSaving(true);
    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/platform/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          key: 'maxSubmissionAttempts',
          value: maxAttempts,
          description: 'Maximum number of submission attempts allowed for each student preference'
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setSaving(true);
    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  const activeYear = years.find(y => y.isActive);

  return (
    <DashboardLayout title="Platform Settings" navLinks={navLinks} theme="orange">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Platform Settings</h1>
              <p className="text-orange-100 text-sm">Manage global configuration, academic years, and security</p>
            </div>
          </div>
          {activeYear && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-semibold">
              <CheckCircle className="w-4 h-4" />
              Active Academic Year: {activeYear.year}
            </div>
          )}
        </div>

        {/* Toast message */}
        {message && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border font-medium ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* ── Academic Year Management ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Academic Year Management</h2>
              <p className="text-sm text-gray-500">Activate an academic year to make it the current working year</p>
            </div>
          </div>

          {/* Add new year */}
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={newYear}
              onChange={e => setNewYear(e.target.value)}
              placeholder="e.g. 2025, 2025/2026"
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
            <button
              onClick={handleAddYear}
              disabled={!newYear.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition disabled:opacity-50 text-sm"
            >
              <Plus className="w-4 h-4" /> Add & Activate
            </button>
          </div>

          {/* Years list */}
          {yearsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500/20 border-t-orange-500" />
            </div>
          ) : years.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No academic years found. Add one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {years.map(year => (
                <div key={year.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition ${
                  year.isActive ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    {year.isActive
                      ? <CheckCircle className="w-5 h-5 text-green-600" />
                      : <Clock className="w-5 h-5 text-gray-400" />
                    }
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{year.year}</p>
                      <p className="text-xs text-gray-500">{year.studentCount} students enrolled</p>
                    </div>
                    {year.isActive && (
                      <span className="ml-3 px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  {!year.isActive && (
                    <button
                      onClick={() => handleActivateYear(year.year)}
                      disabled={activatingYear === year.year}
                      className="px-5 py-2 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition text-sm disabled:opacity-50"
                    >
                      {activatingYear === year.year ? 'Activating...' : 'Activate'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── System Config ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-100 p-3 rounded-xl">
              <Settings className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">System Configuration</h2>
              <p className="text-sm text-gray-500">Control platform-wide behavioral limits</p>
            </div>
          </div>

          <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
            <label className="block text-sm font-bold text-gray-800 mb-2">Max Submission Attempts per Student</label>
            <div className="flex gap-3">
              <input
                type="number"
                min="1"
                value={maxAttempts}
                onChange={e => setMaxAttempts(parseInt(e.target.value) || 1)}
                className="w-32 border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={handleSaveMaxAttempts}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Number of times a student can submit per university preference</p>
          </div>
        </div>

        {/* ── Change Password ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-500">Update your Platform Admin account credentials</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <Shield className="w-4 h-4" />
              {saving ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>

      </div>
    </DashboardLayout>
  );
}
