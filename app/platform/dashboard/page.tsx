"use client";

import { Users, School, GraduationCap, ShieldAlert, Settings, ClipboardList, TrendingUp, Building2, FileText, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import Link from'next/link';

interface PlatformStats {
  totalStudents: number;
  totalUniversities: number;
  totalActiveUniversities: number;
  totalApplications: number;
  totalPlacements: number;
  totalPrograms: number;
  totalAppeals: number;
  totalInterviewInvitations: number;
  placementRate: number;
  naturalScience: number;
  socialScience: number;
  registered: number;
  verified: number;
}

export default function PlatformDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = authHelpers.getToken();
    if (!token) {
      setError('Not authenticated. Redirecting to login...');
      setLoading(false);
      router.push('/platform/login');
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/stats', {
          headers: authHelpers.getAuthHeaders(),
        });
        const data = await response.json();

        if (data.success && data.data) {
          setStats(data.data);
          setError('');
        } else {
          setError(data.error || data.message || 'Failed to load stats');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('An error occurred while loading stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  const navLinks = [
    { label: 'Users', href: '/platform/users', icon: Users },
    { label: 'Students', href: '/platform/students', icon: GraduationCap },
    { label: 'Universities', href: '/platform/universities', icon: School },
    { label: 'Settings', href: '/platform/settings', icon: Settings },
    { label: 'Logs', href: '/platform/logs', icon: ClipboardList },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Platform Admin" navLinks={navLinks} theme="orange">
        <div className="min-h-[60vh] flex justify-center items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500/20 border-t-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !stats) {
    return (
      <DashboardLayout title="Platform Admin" navLinks={navLinks} theme="orange">
        <div className="max-w-2xl mx-auto mt-12 p-8 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-[2.5rem] text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-red-900 dark:text-red-400 mb-4 tracking-tight">Access Error</h2>
          <p className="text-xl font-medium text-red-700 dark:text-red-300 mb-8">{error || 'No data available'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-10 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all"
          >
            Retry Connection
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Platform Admin" navLinks={navLinks} theme="orange">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {/* Welcome Section */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-3xl shadow-2xl shadow-orange-500/20 p-8">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">Platform Central</h2>
            <p className="text-orange-100">National University Selection Platform Oversight & Global Configuration</p>
            <div className="flex gap-3 mt-4 flex-wrap">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">📊 Placement Rate: {stats.placementRate || 0}%</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">🏫 Universities: {stats.totalUniversities || 0}</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">👨‍🎓 Students: {stats.totalStudents || 0}</span>
            </div>
          </div>
        </div>

        {/* Statistics Grid - Using actual data from API */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalStudents?.toLocaleString() || 0}</span>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Students</p>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="text-blue-600">🔬 Natural: {stats.naturalScience || 0}</span>
              <span className="text-green-600">📚 Social: {stats.socialScience || 0}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalUniversities?.toLocaleString() || 0}</span>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Universities</p>
            <p className="text-xs text-gray-500 mt-1">Active: {stats.totalActiveUniversities || 0}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalApplications?.toLocaleString() || 0}</span>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Applications</p>
            <p className="text-xs text-gray-500 mt-1">Submitted applications</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalPlacements?.toLocaleString() || 0}</span>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Placements</p>
            <p className="text-xs text-green-600 mt-1">📈 Rate: {stats.placementRate || 0}%</p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Registered</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">{stats.registered?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Verified</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">{stats.verified?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Programs</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">{stats.totalPrograms?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Appeals</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">{stats.totalAppeals?.toLocaleString() || 0}</p>
          </div>
        </div>

        {/* System Operations */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              className="group p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 text-center hover:border-orange-300"
            >
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-orange-500 transition-all">
                <link.icon size={20} className="text-orange-600 dark:text-orange-400 group-hover:text-white" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{link.label}</h3>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}