'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';
import { moeAuthHelpers } from '@/lib/api';
import { Settings, Shield, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/moe/dashboard' },
  { label: 'Students', href: '/moe/students' },
  { label: 'Upload', href: '/moe/upload' },
  { label: 'Universities', href: '/moe/universities' },
  { label: 'Placements', href: '/moe/placements' },
  { label: 'Settings', href: '/moe/settings' },
];

export default function MOESettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Rule settings
  const [maxAcceptances, setMaxAcceptances] = useState(1);

  // Password change settings
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!moeAuthHelpers.isAuthenticated()) {
      router.push('/moe/login');
      return;
    }
    fetchSettings();
  }, [router]);

  async function fetchSettings() {
    setLoading(true);
    try {
      const token = moeAuthHelpers.getToken();
      const res = await fetch('/api/moe/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.settings?.maxPlacementAcceptances !== undefined) {
        setMaxAcceptances(Number(data.settings.maxPlacementAcceptances));
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRules() {
    setSaving(true);
    try {
      const token = moeAuthHelpers.getToken();
      const res = await fetch('/api/moe/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          key: 'maxPlacementAcceptances',
          value: maxAcceptances,
          description: 'Maximum number of university placements a student is allowed to accept'
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Rules updated successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update rules' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
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
      const token = moeAuthHelpers.getToken();
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
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
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  return (
    <MOEDashboardLayout title="MOE Settings" navLinks={NAV_LINKS} theme="purple">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">System Rules & Configuration</h2>
              <p className="text-gray-500 text-sm">Configure national placement behavior and student limits</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <label className="block text-sm font-bold text-gray-800 mb-2">Max University Acceptances per Student</label>
              <div className="flex gap-4 items-center">
                <input
                  type="number"
                  min="1"
                  value={maxAcceptances}
                  onChange={(e) => setMaxAcceptances(parseInt(e.target.value) || 1)}
                  className="w-32 border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-sm text-gray-500">Students can accept up to this many placements from different universities.</p>
              </div>
            </div>
            <button
              onClick={handleSaveRules}
              disabled={saving}
              className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Update Rules'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Security & Password</h2>
              <p className="text-gray-500 text-sm">Manage your administrator account credentials</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-800 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Shield className="w-5 h-5" />
              {saving ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>

        {message && (
          <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-lg border flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 ${
            message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-semibold">{message.text}</span>
          </div>
        )}
      </div>
    </MOEDashboardLayout>
  );
}
