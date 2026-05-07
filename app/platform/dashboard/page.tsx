import { Users, School, GraduationCap, ShieldAlert, Settings, ClipboardList, TrendingUp } from 'lucide-react';

export default function PlatformDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authHelpers.isAuthenticated()) {
      router.push('/platform/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const response = await platformAPI.getStats();
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError(response.error || 'Failed to load stats');
        }
      } catch (err) {
        setError('An error occurred');
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

  if (error) {
    return (
      <DashboardLayout title="Platform Admin" navLinks={navLinks} theme="orange">
        <div className="max-w-2xl mx-auto mt-12 p-8 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-[2.5rem] text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-red-900 dark:text-red-400 mb-4 tracking-tight">Access Error</h2>
          <p className="text-xl font-medium text-red-700 dark:text-red-300 mb-8">{error}</p>
          <button onClick={() => window.location.reload()} className="px-10 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all">Retry Connection</button>
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) {
    return (
      <DashboardLayout title="Platform Admin" navLinks={navLinks} theme="orange">
        <div className="text-center py-24">
          <p className="text-2xl font-black text-muted-foreground uppercase tracking-widest">No Analytics Available</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Platform Admin" navLinks={navLinks} theme="orange">
      <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {/* Welcome Section */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-[3.5rem] shadow-2xl shadow-orange-500/20 p-16">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
          <div className="relative z-10">
            <h2 className="text-6xl font-black tracking-tighter mb-4">Platform Central</h2>
            <p className="text-2xl font-medium text-orange-100/80 max-w-2xl">National University Selection Platform Oversight & Global Configuration</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'orange' },
            { label: 'Universities', value: stats.universities, icon: School, color: 'blue' },
            { label: 'Students', value: stats.students, icon: GraduationCap, color: 'green' },
            { label: 'MOE Admins', value: stats.moeAdmins, icon: ShieldAlert, color: 'purple' },
          ].map((item, idx) => (
            <div key={idx} className="group glass-card rounded-[3rem] p-10 transition-all duration-500 hover:translate-y-[-8px]">
              <div className="flex items-center justify-between mb-8">
                <div className={`w-16 h-16 bg-${item.color}-50 dark:bg-${item.color}-900/20 rounded-2xl flex items-center justify-center group-hover:bg-${item.color}-500 transition-all duration-500 shadow-lg`}>
                  <item.icon className={`w-8 h-8 text-${item.color}-500 group-hover:text-white`} />
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{item.label}</p>
                  <p className="text-4xl font-black text-foreground tracking-tighter tabular-nums">{item.value}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-black text-green-500">
                <TrendingUp size={16} />
                <span>+4% this month</span>
              </div>
            </div>
          ))}
        </div>

        {/* System Operations */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              className="group p-10 bg-card border border-border/50 rounded-[2.5rem] shadow-xl shadow-foreground/5 hover:shadow-2xl hover:border-orange-500/50 transition-all duration-500 text-center"
            >
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500">
                <link.icon size={28} />
              </div>
              <h3 className="text-xl font-black text-foreground tracking-tight mb-2">{link.label}</h3>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Manage Control</p>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
