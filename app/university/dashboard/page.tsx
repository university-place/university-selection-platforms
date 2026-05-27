'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3, Users, FileText, Settings, TrendingUp, Bell, AlertCircle,
  CheckCircle, Clock, Upload, BookOpen, TargetIcon, Calendar, Building,
  Mail, Phone, Globe, Award, Heart, Library, Microscope, Trophy, Sparkles,
  Shield, Plus, Trash2, Edit2, X, ImageIcon, Save,
  Sliders, Zap, ChevronRight
} from 'lucide-react';
import { authHelpers } from '@/lib/api';
import { DashboardLayout } from '@/components/DashboardLayout';

interface DashboardStats {
  totalApplications: number;
  accepted: number;
  rejected: number;
  pending: number;
  invitationsSent: number;
  totalPrograms: number;
  intakeFilled: number;
  placementRate: number;
}

interface RecentApplication {
  id: number;
  examID: string;
  studentName: string;
  programName: string;
  score: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  appliedAt: string;
}

interface UniversityProfile {
  id: number;
  name: string;
  code: string;
  type: string;
  region: string;
  applicationStartDate?: string;
  applicationDeadline?: string;
}

export default function UniversityDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [universityName, setUniversityName] = useState<string>('Loading...');
  const [universityProfile, setUniversityProfile] = useState<UniversityProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    accepted: 0,
    rejected: 0,
    pending: 0,
    invitationsSent: 0,
    totalPrograms: 0,
    intakeFilled: 0,
    placementRate: 0,
  });
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/university/login');
      return;
    }
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    const token = authHelpers.getToken();
    try {
      // Fetch university profile
      const profileRes = await fetch('/api/universities/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const profile = await profileRes.json();
      if (profile.name) {
        setUniversityName(profile.name);
        setUniversityProfile(profile);
      }

      // Fetch stats
      const statsRes = await fetch('/api/universities/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // Fetch recent applications
      const appsRes = await fetch('/api/universities/applications?limit=5', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const appsData = await appsRes.json();
      if (appsData.success && appsData.applications) {
        setRecentApplications(appsData.applications);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const badgeStyles = {
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badgeStyles[status as keyof typeof badgeStyles]}`}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  // Check application period status
  const getApplicationPeriodStatus = () => {
    if (!universityProfile) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (universityProfile.applicationStartDate) {
      const startDate = new Date(universityProfile.applicationStartDate);
      startDate.setHours(0, 0, 0, 0);
      if (today < startDate) {
        return { status: 'upcoming', message: `Applications open on ${startDate.toLocaleDateString()}`, color: 'blue' };
      }
    }

    if (universityProfile.applicationDeadline) {
      const deadline = new Date(universityProfile.applicationDeadline);
      deadline.setHours(23, 59, 59, 999);
      if (today > deadline) {
        return { status: 'closed', message: `Applications closed on ${deadline.toLocaleDateString()}`, color: 'red' };
      }
    }

    if (universityProfile.applicationStartDate && universityProfile.applicationDeadline) {
      return { status: 'open', message: `Applications open until ${new Date(universityProfile.applicationDeadline).toLocaleDateString()}`, color: 'green' };
    }

    return null;
  };

  const periodStatus = getApplicationPeriodStatus();

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard', icon: BarChart3 },
    { label: 'Applicants', href: '/university/applicants', icon: Users },
    { label: 'Programs', href: '/university/programs', icon: BookOpen },
    { label: 'Invitations', href: '/university/invitations', icon: Bell },
    { label: 'Placements', href: '/university/placements', icon: TargetIcon },
    { label: 'Analytics', href: '/university/analytics', icon: TrendingUp },
    { label: 'Document Evaluation', href: '/university/documents-evaluation', icon: FileText },
    { label: 'Appeals', href: '/university/appeals', icon: AlertCircle },
    { label: 'Weighting Settings', href: '/university/weighting-settings', icon: Sliders },
    { label: 'Placement Invitation', href: '/university/placement-invitation', icon: Zap },
    // { label: 'Placement Policy', href: '/university/placement-policy', icon: Shield },
    { label: 'Settings', href: '/university/settings', icon: Settings },
    { label: 'Batch Placement', href: '/university/placement-batch', icon: Zap },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-center">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-green-600 underline">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title={universityName}
      navLinks={navLinks}
      theme="green"
    >
      <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <h2 className="text-5xl font-black text-foreground tracking-tighter mb-4">University Dashboard</h2>
            <p className="text-xl font-medium text-muted-foreground">Analytics and administration for {universityName}</p>
          </div>
          {periodStatus && (
            <div className={`flex items-center gap-4 px-8 py-4 rounded-[2rem] text-lg font-black uppercase tracking-widest bg-${periodStatus.color}-50 dark:bg-${periodStatus.color}-900/20 text-${periodStatus.color}-600 border border-${periodStatus.color}-100 dark:border-${periodStatus.color}-800 shadow-xl shadow-${periodStatus.color}-500/10`}>
              <Calendar size={28} />
              {periodStatus.message}
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="group glass-card rounded-[3rem] p-12 transition-all duration-500 hover:translate-y-[-8px]">
            <div className="flex items-center justify-between mb-10">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center group-hover:bg-blue-500 transition-all duration-500 shadow-lg">
                <FileText className="w-10 h-10 text-blue-500 group-hover:text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">total applicants </p>
                <p className="text-5xl font-black text-foreground tracking-tighter tabular-nums">{stats.totalApplications}</p>
              </div>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full shadow-lg shadow-blue-500/30" style={{ width: '75%' }}></div>
            </div>
          </div>

          <div className="group glass-card rounded-[3rem] p-12 transition-all duration-500 hover:translate-y-[-8px]">
            <div className="flex items-center justify-between mb-10">
              <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-3xl flex items-center justify-center group-hover:bg-green-500 transition-all duration-500 shadow-lg">
                <CheckCircle className="w-10 h-10 text-green-500 group-hover:text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Accepted</p>
                <p className="text-5xl font-black text-foreground tracking-tighter tabular-nums">{stats.accepted}</p>
              </div>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full shadow-lg shadow-green-500/30" style={{ width: `${stats.totalApplications > 0 ? (stats.accepted / stats.totalApplications) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="group glass-card rounded-[3rem] p-12 transition-all duration-500 hover:translate-y-[-8px]">
            <div className="flex items-center justify-between mb-10">
              <div className="w-20 h-20 bg-yellow-50 dark:bg-yellow-900/20 rounded-3xl flex items-center justify-center group-hover:bg-yellow-500 transition-all duration-500 shadow-lg">
                <Clock className="w-10 h-10 text-yellow-500 group-hover:text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Pending</p>
                <p className="text-5xl font-black text-foreground tracking-tighter tabular-nums">{stats.pending}</p>
              </div>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/30" style={{ width: `${stats.totalApplications > 0 ? (stats.pending / stats.totalApplications) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="group glass-card rounded-[3rem] p-12 transition-all duration-500 hover:translate-y-[-8px]">
            <div className="flex items-center justify-between mb-10">
              <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-3xl flex items-center justify-center group-hover:bg-purple-500 transition-all duration-500 shadow-lg">
                <TrendingUp className="w-10 h-10 text-purple-500 group-hover:text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Success Rate</p>
                <p className="text-5xl font-black text-foreground tracking-tighter tabular-nums">{stats.placementRate}%</p>
              </div>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full shadow-lg shadow-purple-500/30" style={{ width: `${stats.placementRate}%` }}></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 glass-card rounded-[3.5rem] p-16">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-4xl font-black text-foreground tracking-tighter">Applicant Overview</h2>
              <div className="flex gap-3">
                 <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg shadow-green-500/20"></div>
                 <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/20"></div>
                 <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/20"></div>
              </div>
            </div>
            <div className="space-y-10">
              <div className="p-10 bg-muted/30 rounded-[2.5rem] border border-border/50">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Approved Applications</p>
                    <p className="text-5xl font-black text-foreground tabular-nums">{stats.accepted}</p>
                  </div>
                  <span className="text-2xl font-black text-green-600 bg-green-100 dark:bg-green-900/30 px-6 py-2 rounded-2xl shadow-sm">
                    {stats.totalApplications > 0 ? Math.round((stats.accepted / stats.totalApplications) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-5 overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full shadow-lg shadow-green-500/30 transition-all duration-1000" style={{ width: `${stats.totalApplications > 0 ? (stats.accepted / stats.totalApplications) * 100 : 0}%` }}></div>
                </div>
              </div>
              <div className="p-10 bg-muted/30 rounded-[2.5rem] border border-border/50">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Pending Decisions</p>
                    <p className="text-5xl font-black text-foreground tabular-nums">{stats.pending}</p>
                  </div>
                  <span className="text-2xl font-black text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-6 py-2 rounded-2xl shadow-sm">
                    {stats.totalApplications > 0 ? Math.round((stats.pending / stats.totalApplications) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-5 overflow-hidden">
                  <div className="bg-yellow-500 h-full rounded-full shadow-lg shadow-yellow-500/30 transition-all duration-1000" style={{ width: `${stats.totalApplications > 0 ? (stats.pending / stats.totalApplications) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>


        </div>

        {/* Recent Applications Table */}
        <div className="glass-card rounded-[3.5rem] overflow-hidden border-border/50">
          <div className="px-16 py-12 border-b border-border/50 flex justify-between items-center">
            <h2 className="text-4xl font-black text-foreground tracking-tighter">Latest Applications</h2>
            <Link href="/university/applications" className="px-10 py-4 bg-muted text-foreground font-black text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-primary hover:text-primary-foreground hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500">
              Full Database
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-16 py-8 text-left text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Applicant ID</th>
                  <th className="px-8 py-8 text-left text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Name</th>
                  <th className="px-8 py-8 text-left text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Choice</th>
                  <th className="px-8 py-8 text-left text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">National Score</th>
                  <th className="px-8 py-8 text-left text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Status</th>
                  <th className="px-16 py-8 text-right text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Submission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-16 py-32 text-center">
                       <div className="flex flex-col items-center gap-6">
                          <Users className="w-24 h-24 text-muted/30" />
                          <p className="text-3xl font-black text-muted/40 uppercase tracking-[0.3em]">No Applications Yet</p>
                       </div>
                    </td>
                  </tr>
                ) : (
                  recentApplications.map((app) => (
                    <tr key={app.id} className="group hover:bg-muted/20 transition-all duration-300 cursor-pointer">
                      <td className="px-16 py-10 text-xl font-black text-foreground tabular-nums tracking-tighter">{app.examID}</td>
                      <td className="px-8 py-10">
                         <p className="text-xl font-black text-foreground tracking-tight">{app.studentName}</p>
                         <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-1">Ranked {app.id}</p>
                      </td>
                      <td className="px-8 py-10 text-xl font-bold text-muted-foreground">{app.programName}</td>
                      <td className="px-8 py-10">
                         <div className="flex items-center gap-3">
                            <span className="text-3xl font-black text-foreground tabular-nums tracking-tighter">{app.score}</span>
                            <span className="text-sm font-black text-muted/40">/ 100</span>
                         </div>
                      </td>
                      <td className="px-8 py-10">
                         <span className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-sm ${
                           app.status === 'ACCEPTED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 
                           app.status === 'REJECTED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700' : 
                           'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700'
                         }`}>
                           {app.status}
                         </span>
                      </td>
                      <td className="px-16 py-10 text-right text-lg font-black text-muted/50 tabular-nums">
                         {new Date(app.appliedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}