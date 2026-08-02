'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';
import { moeAuthHelpers } from '@/lib/api';
import {
  Users, GraduationCap, Building2, FileText, TrendingUp,
  Calendar, CheckCircle, Clock, AlertCircle,
  Upload, BookOpen, UserPlus, BarChart3, Activity,
  Award, Target, Download, Eye,
  ShieldCheck, Settings,
  LayoutDashboard
} from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  naturalScience: number;
  socialScience: number;
  registered: number;
  activeStudents?: number;
  totalUniversities: number;
  totalPrograms: number;
  totalApplications: number;
  totalPlacements: number;
  pendingApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  placementRate: number;
  activeUniversities: number;
}

interface RecentActivity {
  id: number;
  action: string;
  userEmail: string;
  timestamp: string;
  academicYear?: string;
  recordsInserted?: number;
  filename?: string;
}

interface YearlyData {
  academicYear: string;
  count: number;
}

interface UniversityData {
  id: number;
  name: string;
  studentCount: number;
  placementCount: number;
}

export default function MOEDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    naturalScience: 0,
    socialScience: 0,
    registered: 0,
    activeStudents: 0,
    totalUniversities: 0,
    totalPrograms: 0,
    totalApplications: 0,
    totalPlacements: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
    placementRate: 0,
    activeUniversities: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [topUniversities, setTopUniversities] = useState<UniversityData[]>([]);
  const [activeYear, setActiveYear] = useState<string>('');

  useEffect(() => {
    const token = moeAuthHelpers.getToken();
    if (!token) {
      router.push('/moe/login');
      return;
    }
    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = moeAuthHelpers.getToken();
      
      // Fetch stats only (since other APIs might be missing)
      const statsRes = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const statsData = await statsRes.json();
      console.log('Stats data:', statsData);

      if (statsData.success) {
        setStats({
          totalStudents: statsData.data?.totalStudents || 0,
          naturalScience: statsData.data?.naturalScience || 0,
          socialScience: statsData.data?.socialScience || 0,
          registered: statsData.data?.registered || 0,
          activeStudents: statsData.data?.activeStudents || statsData.data?.verified || 0,
          totalUniversities: statsData.data?.totalUniversities || 0,
          totalPrograms: statsData.data?.totalPrograms || 0,
          totalApplications: statsData.data?.totalApplications || 0,
          totalPlacements: statsData.data?.totalPlacements || 0,
          pendingApplications: statsData.data?.pendingApplications || 0,
          acceptedApplications: statsData.data?.acceptedApplications || 0,
          rejectedApplications: statsData.data?.rejectedApplications || 0,
          placementRate: statsData.data?.placementRate || 0,
          activeUniversities: statsData.data?.activeUniversities || 0,
        });
        
        setActiveYear(statsData.extra?.activeYear || '2024');
        setYearlyData(statsData.extra?.byYear || []);
      } else {
        setError(statsData.error || 'Failed to load stats');
      }

      // Try to fetch activities (optional, may fail)
      try {
        const activitiesRes = await fetch('/api/admin/activities?limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const activitiesData = await activitiesRes.json();
        if (activitiesData.success) {
          setRecentActivities(activitiesData.data || []);
        }
      } catch (err) {
        console.log('Activities API not available yet');
      }

      // Try to fetch top universities (optional)
      try {
        const universitiesRes = await fetch('/api/admin/universities/top?limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const universitiesData = await universitiesRes.json();
        if (universitiesData.success) {
          setTopUniversities(universitiesData.data || []);
        }
      } catch (err) {
        console.log('Top universities API not available yet');
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const navLinks = [
    { label: 'Dashboard', href: '/moe/dashboard', icon: LayoutDashboard },
    { label: 'Students', href: '/moe/students', icon: Users },
    { label: 'Upload', href: '/moe/upload', icon: Upload },
    { label: 'Universities', href: '/moe/universities', icon: Building2 },
    { label: 'Placements', href: '/moe/placements', icon: Target },
    { label: 'Appeals', href: '/moe/appeals', icon: AlertCircle },
    { label: 'Compliance', href: '/moe/compliance', icon: ShieldCheck },
    { label: 'Audit Log', href: '/moe/audit', icon: FileText },
    { label: 'Reports', href: '/moe/reports', icon: BarChart3 },
    { label: 'Registry', href: '/moe/registry', icon: BookOpen },
    { label: 'Settings', href: '/moe/settings', icon: Settings },
  ];

  if (loading) {
    return (
      <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={navLinks} theme="purple">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      </MOEDashboardLayout>
    );
  }

  if (error) {
    return (
      <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={navLinks} theme="purple">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </MOEDashboardLayout>
    );
  }

  // Safe helper for number formatting
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  return (
    <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={navLinks} theme="purple">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Welcome back!</h2>
              <p className="text-purple-100 mt-1">
                Ministry of Education - Higher Education Placement System
              </p>
              <div className="mt-3 flex gap-2">
                <span className="bg-purple-500/30 px-3 py-1 rounded-full text-sm">
                  Active Year: {activeYear}
                </span>
                <span className="bg-green-500/30 px-3 py-1 rounded-full text-sm">
                  {stats.totalUniversities} Universities
                </span>
              </div>
            </div>
            <div className="hidden md:block">
              <GraduationCap className="w-16 h-16 text-white/20" />
            </div>
          </div>
        </div>

        {/* Main Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border-border rounded-xl shadow-sm p-5 border-l-4 border-purple-500 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-sm">Total Students</p>
                <p className="text-3xl font-bold text-foreground">{formatNumber(stats.totalStudents)}</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-blue-600">🔬 Nat: {formatNumber(stats.naturalScience)}</span>
                  <span className="text-green-600">📚 Soc: {formatNumber(stats.socialScience)}</span>
                </div>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-card border-border rounded-xl shadow-sm p-5 border-l-4 border-blue-500 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-sm">Universities</p>
                <p className="text-3xl font-bold text-foreground">{formatNumber(stats.totalUniversities)}</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-green-600">✓ Active: {formatNumber(stats.activeUniversities)}</span>
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-card border-border rounded-xl shadow-sm p-5 border-l-4 border-green-500 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-sm">Applications</p>
                <p className="text-3xl font-bold text-foreground">{formatNumber(stats.totalApplications)}</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-yellow-600">⏳ Pending: {formatNumber(stats.pendingApplications)}</span>
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-card border-border rounded-xl shadow-sm p-5 border-l-4 border-emerald-500 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-sm">Placements</p>
                <p className="text-3xl font-bold text-foreground">{formatNumber(stats.totalPlacements)}</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-emerald-600">📊 Rate: {stats.placementRate || 0}%</span>
                </div>
              </div>
              <div className="bg-emerald-100 p-3 rounded-full">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border-border rounded-lg shadow-sm p-4 text-center">
            <p className="text-muted-foreground text-xs">Registered Students</p>
            <p className="text-2xl font-bold text-indigo-600">{formatNumber(stats.registered)}</p>
          </div>
          <div className="bg-card border-border rounded-lg shadow-sm p-4 text-center">
            <p className="text-muted-foreground text-xs">Active Students</p>
            <p className="text-2xl font-bold text-green-600">{formatNumber(stats.activeStudents)}</p>
          </div>
          <div className="bg-card border-border rounded-lg shadow-sm p-4 text-center">
            <p className="text-muted-foreground text-xs">Total Programs</p>
            <p className="text-2xl font-bold text-purple-600">{formatNumber(stats.totalPrograms)}</p>
          </div>
          <div className="bg-card border-border rounded-lg shadow-sm p-4 text-center">
            <p className="text-muted-foreground text-xs">Accepted Apps</p>
            <p className="text-2xl font-bold text-blue-600">{formatNumber(stats.acceptedApplications)}</p>
          </div>
        </div>

        {/* Students by Academic Year */}
        {yearlyData.length > 0 && (
          <div className="bg-card border-border rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Students by Academic Year
              </h3>
            </div>
            <div className="space-y-3">
              {yearlyData.map((year) => {
                const maxCount = Math.max(...yearlyData.map(y => y.count), 1);
                const percentage = (year.count / maxCount) * 100;
                return (
                  <div key={year.academicYear} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium text-muted-foreground">{year.academicYear}</div>
                    <div className="flex-1">
                      <div className="h-8 bg-purple-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full flex items-center justify-end px-3 text-xs text-white font-medium"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 30 && year.count}
                        </div>
                      </div>
                    </div>
                    <div className="w-16 text-right text-sm font-semibold text-muted-foreground">{year.count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/moe/students')}
            className="bg-card border-border rounded-lg shadow-sm p-4 text-center hover:shadow-md transition border border-border group"
          >
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-semibold text-foreground">Manage Students</h4>
            <p className="text-xs text-muted-foreground mt-1">View and edit student records</p>
          </button>

          <button
            onClick={() => router.push('/moe/upload')}
            className="bg-card border-border rounded-lg shadow-sm p-4 text-center hover:shadow-md transition border border-border group"
          >
            <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold text-foreground">Upload CSV</h4>
            <p className="text-xs text-muted-foreground mt-1">Bulk import student data</p>
          </button>

          <button
            onClick={() => router.push('/moe/universities')}
            className="bg-card border-border rounded-lg shadow-sm p-4 text-center hover:shadow-md transition border border-border group"
          >
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-semibold text-foreground">Universities</h4>
            <p className="text-xs text-muted-foreground mt-1">Manage university records</p>
          </button>

          <button
            onClick={() => router.push('/moe/reports')}
            className="bg-card border-border rounded-lg shadow-sm p-4 text-center hover:shadow-md transition border border-border group"
          >
            <div className="bg-yellow-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-yellow-200 transition">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <h4 className="font-semibold text-foreground">National Reports</h4>
            <p className="text-xs text-muted-foreground mt-1">Generate FR-M6 national reports</p>
          </button>
        </div>

        {/* Footer Stats */}
        <div className="bg-muted/30 rounded-lg p-4 text-center text-sm text-muted-foreground">
          <div className="flex justify-center gap-6 flex-wrap">
            <span>📊 Last updated: {new Date().toLocaleDateString()}</span>
            <span>🏫 Active Universities: {formatNumber(stats.activeUniversities)}</span>
            <span>📈 Overall Placement Rate: {stats.placementRate || 0}%</span>
            <span>👨‍🎓 Total Registered: {formatNumber(stats.registered)}</span>
          </div>
        </div>
      </div>
    </MOEDashboardLayout>
  );
}