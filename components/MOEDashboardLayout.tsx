'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { moeAuthHelpers } from '@/lib/api';
import { Sun, Moon, Menu, X, LogOut, LayoutDashboard, User, Settings, Bell, ShieldCheck } from 'lucide-react';
import { useTheme } from 'next-themes';

interface NavLink {
  label: string;
  href: string;
  icon?: any;
}

interface MOEDashboardLayoutProps {
  title: string;
  navLinks: NavLink[];
  children: ReactNode;
  theme?: 'blue' | 'purple' | 'green' | 'orange';
}

const themeClasses = {
  blue: 'bg-blue-600',
  purple: 'bg-purple-600',
  green: 'bg-green-600',
  orange: 'bg-orange-600',
};

export function MOEDashboardLayout({
  title,
  navLinks,
  children,
  theme = 'purple',
}: MOEDashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme: currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = moeAuthHelpers.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'MOE_ADMIN' || payload.role === 'MOE-ADMIN' || payload.role === 'PLATFORM_ADMIN') {
          setIsAuthenticated(true);
        } else {
          router.push('/moe/login');
        }
      } catch (err) {
        router.push('/moe/login');
      }
    } else {
      router.push('/moe/login');
    }
  }, [router]);

  const handleLogout = () => {
    moeAuthHelpers.clearToken();
    localStorage.removeItem('moe_user');
    router.push('/moe/login');
  };

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const renderNavLink = (link: NavLink, isMobile: boolean = false) => {
    const isActive = pathname === link.href;
    const content = (
      <>
        {link.icon && <link.icon size={isMobile ? 24 : 20} />}
        {link.label}
      </>
    );

    const baseClass = isMobile
      ? `w-full flex items-center gap-4 px-8 py-5 rounded-3xl font-black text-lg uppercase tracking-widest transition-all ${
          isActive 
            ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20' 
            : 'text-muted-foreground hover:bg-muted'
        }`
      : `px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 ${
          isActive 
            ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-105' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`;

    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={() => { if(isMobile) setIsMobileMenuOpen(false); }}
        className={baseClass}
      >
        {content}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col xl:flex-row selection:bg-primary/20 selection:text-primary">
      {/* Mobile Top Bar */}
      <nav className="xl:hidden bg-background/80 border-b border-border sticky top-0 z-50 backdrop-blur-2xl shadow-sm h-24 flex items-center justify-between px-6">
        <h1 className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-3" onClick={() => router.push('/moe/dashboard')}>
          <div className={`w-2.5 h-8 ${themeClasses[theme]} rounded-full shadow-lg shadow-primary/40`}></div>
          {title}
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            className="p-3 bg-muted/50 rounded-xl text-foreground"
          >
            {currentTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-3 bg-muted/50 rounded-xl text-foreground"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-[100] bg-background animate-in slide-in-from-top-4 duration-300 overflow-y-auto">
          <div className="p-6 space-y-3">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-black tracking-tighter text-foreground">{title}</h1>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-3 bg-muted/50 rounded-xl"><X size={24} /></button>
            </div>
            {navLinks.map((link) => renderNavLink(link, true))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-8 py-5 bg-destructive/10 text-destructive rounded-3xl font-black text-lg uppercase tracking-widest mt-6"
            >
              <LogOut size={24} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden xl:flex flex-col w-[400px] border-r border-border bg-card/50 backdrop-blur-3xl sticky top-0 h-screen overflow-y-auto p-10">
        <div className="mb-16">
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => router.push('/moe/dashboard')}>
            <div className={`w-3.5 h-12 ${themeClasses[theme]} rounded-full shadow-2xl shadow-primary/40`}></div>
            {title}
          </h1>
        </div>

        <nav className="flex-1 space-y-3">
          {navLinks.map((link) => renderNavLink(link))}
        </nav>

        <div className="mt-12 pt-8 border-t border-border/50 space-y-4">
          <button
            onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-4 px-8 py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted/50 transition-all duration-300"
          >
            {currentTheme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
            {currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-8 py-5 bg-destructive/5 text-destructive rounded-3xl font-black text-sm uppercase tracking-[0.2em] border-2 border-destructive/10 hover:bg-destructive hover:text-destructive-foreground hover:shadow-2xl hover:shadow-destructive/20 transition-all duration-500 active:scale-95"
          >
            <LogOut size={24} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 py-12 px-6 lg:px-12 xl:py-24 xl:px-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto relative">
          {children}
        </div>
      </main>
    </div>
  );
}
