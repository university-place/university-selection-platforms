'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';
import { moeAuthHelpers } from '@/lib/api';
import { Settings, Shield, Lock, Save, AlertCircle, CheckCircle, ClipboardList } from 'lucide-react';

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

  // Custom attributes settings
  const [customAttributes, setCustomAttributes] = useState<{ name: string; label: string; type: 'string' | 'number' | 'boolean' }[]>([]);
  const [newAttr, setNewAttr] = useState({ name: '', label: '', type: 'string' as const });

  // Stream subjects settings
  const [streamSubjects, setStreamSubjects] = useState<{ Natural: { name: string; key: string }[]; Social: { name: string; key: string }[] }>({ Natural: [], Social: [] });
  const [newSubject, setNewSubject] = useState({ stream: 'Natural' as 'Natural' | 'Social', name: '', key: '' });

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
      if (data.success && data.settings?.student_custom_attributes) {
        setCustomAttributes(data.settings.student_custom_attributes);
      }
      if (data.success && data.settings?.stream_subjects) {
        setStreamSubjects(data.settings.stream_subjects);
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

  async function handleSaveCustomAttributes() {
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
          key: 'student_custom_attributes',
          value: customAttributes,
          description: 'Definition of dynamic student attributes for CSV uploads and dashboards'
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Custom attributes updated successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update custom attributes' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  const addAttribute = () => {
    if (!newAttr.name || !newAttr.label) return;
    // Basic validation: names should be alphanumeric_underscores
    if (!/^[a-zA-Z0-9_]+$/.test(newAttr.name)) {
      setMessage({ type: 'error', text: 'Attribute name must be alphanumeric with underscores only' });
      return;
    }
    if (customAttributes.some(a => a.name === newAttr.name)) {
      setMessage({ type: 'error', text: 'Attribute name already exists' });
      return;
    }
    setCustomAttributes([...customAttributes, newAttr]);
    setNewAttr({ name: '', label: '', type: 'string' });
  };

  const removeAttribute = (name: string) => {
    setCustomAttributes(customAttributes.filter(a => a.name !== name));
  };

  async function handleSaveStreamSubjects() {
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
          key: 'stream_subjects',
          value: streamSubjects,
          description: 'Definition of dynamic subjects for Natural and Social streams'
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Stream subjects updated successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update stream subjects' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  const addSubject = () => {
    if (!newSubject.name || !newSubject.key) return;
    if (!/^[a-zA-Z0-9_]+$/.test(newSubject.key)) {
      setMessage({ type: 'error', text: 'Subject key must be alphanumeric with underscores only' });
      return;
    }
    const streamList = streamSubjects[newSubject.stream];
    if (streamList.some(s => s.key === newSubject.key)) {
      setMessage({ type: 'error', text: 'Subject key already exists in this stream' });
      return;
    }
    setStreamSubjects({
      ...streamSubjects,
      [newSubject.stream]: [...streamList, { name: newSubject.name, key: newSubject.key }]
    });
    setNewSubject({ ...newSubject, name: '', key: '' });
  };

  const removeSubject = (stream: 'Natural' | 'Social', key: string) => {
    setStreamSubjects({
      ...streamSubjects,
      [stream]: streamSubjects[stream].filter(s => s.key !== key)
    });
  };

  return (
    <MOEDashboardLayout title="MOE Settings" navLinks={NAV_LINKS} theme="purple">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-card rounded-2xl shadow-sm p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">System Rules & Configuration</h2>
              <p className="text-muted-foreground text-sm">Configure national placement behavior and student limits</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-gray-50 rounded-2xl border border-border">
              <label className="block text-sm font-bold text-foreground mb-2">Max University Acceptances per Student</label>
              <div className="flex gap-4 items-center">
                <input
                  type="number"
                  min="1"
                  value={maxAcceptances}
                  onChange={(e) => setMaxAcceptances(parseInt(e.target.value) || 1)}
                  className="w-32 border-2 border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-sm text-muted-foreground">Students can accept up to this many placements from different universities.</p>
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

        <div className="bg-card rounded-2xl shadow-sm p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Custom Student Attributes</h2>
              <p className="text-muted-foreground text-sm">Define additional fields for students (e.g., School, Woreda, Subjects)</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-6 rounded-2xl border border-border">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Field Name (ID)</label>
                <input
                  type="text"
                  placeholder="e.g. school_name"
                  value={newAttr.name}
                  onChange={(e) => setNewAttr({ ...newAttr, name: e.target.value.toLowerCase() })}
                  className="w-full border-2 border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Display Label</label>
                <input
                  type="text"
                  placeholder="e.g. Previous School"
                  value={newAttr.label}
                  onChange={(e) => setNewAttr({ ...newAttr, label: e.target.value })}
                  className="w-full border-2 border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Data Type</label>
                <select
                  value={newAttr.type}
                  onChange={(e) => setNewAttr({ ...newAttr, type: e.target.value as any })}
                  className="w-full border-2 border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="string">Text</option>
                  <option value="number">Number (Score)</option>
                  <option value="boolean">Yes/No</option>
                </select>
              </div>
              <button
                onClick={addAttribute}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition h-[42px]"
              >
                Add Field
              </button>
            </div>

            {customAttributes.length > 0 && (
              <div className="border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Field ID</th>
                      <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Display Label</th>
                      <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Type</th>
                      <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customAttributes.map((attr) => (
                      <tr key={attr.name}>
                        <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{attr.name}</td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{attr.label}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground capitalize">{attr.type}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => removeAttribute(attr.name)}
                            className="text-red-600 hover:text-red-800 font-bold text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={handleSaveCustomAttributes}
              disabled={saving}
              className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save All Attributes'}
            </button>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-100 p-3 rounded-xl text-green-600">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Stream Subject Configuration</h2>
              <p className="text-muted-foreground text-sm">Define dynamic subjects for Natural and Social streams for score calculations</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-6 rounded-2xl border border-border">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Stream</label>
                <select
                  value={newSubject.stream}
                  onChange={(e) => setNewSubject({ ...newSubject, stream: e.target.value as 'Natural' | 'Social' })}
                  className="w-full border-2 border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="Natural">Natural Science</option>
                  <option value="Social">Social Science</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Subject Key (ID)</label>
                <input
                  type="text"
                  placeholder="e.g. math_social"
                  value={newSubject.key}
                  onChange={(e) => setNewSubject({ ...newSubject, key: e.target.value.toLowerCase() })}
                  className="w-full border-2 border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  className="w-full border-2 border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <button
                onClick={addSubject}
                className="px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition h-[42px]"
              >
                Add Subject
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['Natural', 'Social'].map((stream) => (
                <div key={stream} className="border border-border rounded-2xl overflow-hidden">
                  <div className={`px-6 py-3 font-bold text-white ${stream === 'Natural' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                    {stream} Science Subjects
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Key</th>
                        <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Name</th>
                        <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {streamSubjects[stream as 'Natural' | 'Social']?.map((subject) => (
                        <tr key={subject.key}>
                          <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{subject.key}</td>
                          <td className="px-6 py-3 text-sm font-medium text-foreground">{subject.name}</td>
                          <td className="px-6 py-3">
                            <button
                              onClick={() => removeSubject(stream as 'Natural' | 'Social', subject.key)}
                              className="text-red-600 hover:text-red-800 font-bold text-xs"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!streamSubjects[stream as 'Natural' | 'Social'] || streamSubjects[stream as 'Natural' | 'Social'].length === 0) && (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-sm text-muted-foreground">No subjects defined</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveStreamSubjects}
              disabled={saving}
              className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save All Subjects'}
            </button>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Security & Password</h2>
              <p className="text-muted-foreground text-sm">Manage your administrator account credentials</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-foreground mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full border-2 border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full border-2 border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full border-2 border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
