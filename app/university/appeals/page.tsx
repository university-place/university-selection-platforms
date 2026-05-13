'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import { BarChart3, Users, Bell, Award, BookOpen, Settings, AlertCircle, CheckCircle, XCircle, Clock, MessageSquare, Filter } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/university/dashboard', icon: BarChart3 },
  { label: 'Applicants', href: '/university/applicants', icon: Users },
  { label: 'Invitations', href: '/university/invitations', icon: Bell },
  { label: 'Placements', href: '/university/placements', icon: Award },
  { label: 'Programs', href: '/university/programs', icon: BookOpen },
  { label: 'Appeals', href: '/university/appeals', icon: AlertCircle },
  { label: 'Settings', href: '/university/settings', icon: Settings },
];

interface Appeal {
  id: number;
  description: string;
  type: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  student: { examID: string; firstName: string; lastName: string; stream: string };
  preference?: {
    program: { name: string } | null;
  };
}

export default function UniversityAppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/universities/appeals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAppeals(data.data);
      } else {
        setError(data.error || 'Failed to load appeals');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  const STATUS_COLOR: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <DashboardLayout title="University Admin" navLinks={NAV_LINKS} theme="blue">
      <div className="space-y-8">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-5xl font-black tracking-tighter mb-4">Student Appeals</h2>
            <p className="text-blue-100 text-xl font-medium max-w-2xl">
              Monitor disputes and appeals submitted by students regarding your institution. Note: Final decisions are managed by the MoE.
            </p>
          </div>
          <div className="absolute right-[-50px] top-[-50px] w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        <div className="bg-card glass-card rounded-[3rem] border border-border/50 overflow-hidden shadow-xl">
          {error && <div className="p-8 text-red-600 bg-red-50 font-bold">{error}</div>}
          
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent shadow-xl" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {['Student', 'Stream', 'Appeal Type', 'Description', 'Status', 'Date'].map((h) => (
                      <th key={h} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {appeals.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-24 text-muted-foreground font-medium italic">No appeals found for your institution</td></tr>
                  ) : appeals.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-black text-foreground group-hover:text-blue-600 transition-colors">
                          {a.student?.firstName} {a.student?.lastName}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground mt-1">{a.student?.examID}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          a.student?.stream === 'Natural Science' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {a.student?.stream}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-xs font-black uppercase tracking-widest text-foreground">{a.type}</div>
                        {a.preference?.program && (
                          <div className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">{a.preference.program.name}</div>
                        )}
                      </td>
                      <td className="px-8 py-6 max-w-md">
                        <p className="text-sm text-foreground/80 leading-relaxed italic line-clamp-2" title={a.description}>
                          "{a.description}"
                        </p>
                        {a.resolution && (
                          <div className="mt-2 flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-tighter">
                            <CheckCircle size={14} /> Resolution: {a.resolution}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${STATUS_COLOR[a.status] || 'bg-gray-100 text-gray-700'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-xs font-bold text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
