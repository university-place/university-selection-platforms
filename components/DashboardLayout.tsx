'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { authHelpers } from '@/lib/api';
import { Sun, Moon, Menu, X, LogOut, LayoutDashboard, User, Settings, Bell, Search, GraduationCap } from 'lucide-react';
import { useTheme } from 'next-themes';

interface NavLink {
  id?: string;
  label: string;
  href?: string;
  icon?: any;
  onClick?: () => void;
}

interface DashboardLayoutProps {
  title: string;
  navLinks: NavLink[];
  children: ReactNode;
  theme?: 'blue' | 'purple' | 'green' | 'orange';
  activeId?: string;
}

const themeClasses = {
  blue: 'bg-blue-600',
  purple: 'bg-purple-600',
  green: 'bg-green-600',
  orange: 'bg-orange-600',
};

export function DashboardLayout({
  title,
  navLinks,
  children,
  theme = 'blue',
  activeId,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme: currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    authHelpers.clearToken();
    router.push('/');
    router.refresh();
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-28 border-b border-border flex items-center px-10">
          <div className="w-64 h-12 bg-muted rounded-2xl animate-pulse"></div>
        </div>
        <main className="max-w-[1600px] mx-auto py-16 px-8">
          <div className="animate-pulse space-y-12">
            <div className="h-64 bg-muted rounded-[3.5rem]"></div>
            <div className="h-[30rem] bg-card border border-border rounded-[3.5rem]"></div>
          </div>
        </main>
      </div>
    );
  }

  const renderNavLink = (link: NavLink, isMobile: boolean = false) => {
    const isActive = activeId ? activeId === link.id : (link.href && pathname === link.href);
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

    if (link.onClick) {
      return (
        <button key={link.label} onClick={() => { link.onClick!(); if(isMobile) setIsMobileMenuOpen(false); }} className={baseClass}>
          {content}
        </button>
      );
    }

    return (
      <Link
        key={link.label}
        href={link.href || '#'}
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
        <h1 className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-3" onClick={() => router.push('/')}>
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
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => router.push('/')}>
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
        <div className="max-w-[1400px] mx-auto relative">
          {children}
        </div>
      </main>
    </div>
  );
}