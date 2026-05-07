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

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary">
      {/* Premium Navigation Bar */}
      <nav className="bg-background/80 border-b border-border sticky top-0 z-50 backdrop-blur-2xl shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-28">
            <div className="flex items-center gap-12">
              <h1 className="text-4xl font-black tracking-tighter text-foreground flex items-center gap-4 cursor-pointer" onClick={() => router.push('/moe/dashboard')}>
                <div className={`w-3.5 h-12 ${themeClasses[theme]} rounded-full shadow-2xl shadow-primary/40`}></div>
                {title}
              </h1>
              
              {/* Desktop Nav */}
              <div className="hidden xl:flex items-center gap-3">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 ${
                        isActive 
                          ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-105' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {link.icon && <link.icon size={20} />}
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4 lg:gap-8">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                className="p-4 bg-muted/50 hover:bg-muted rounded-2xl text-foreground transition-all duration-300 border border-border/50"
                aria-label="Toggle theme"
              >
                {currentTheme === 'dark' ? <Sun size={28} /> : <Moon size={28} />}
              </button>

              {/* Logout Button (Desktop) */}
              <button
                onClick={handleLogout}
                className="hidden md:flex px-10 py-4 bg-destructive/5 text-destructive rounded-2xl font-black text-sm uppercase tracking-[0.2em] border-2 border-destructive/10 hover:bg-destructive hover:text-destructive-foreground hover:shadow-2xl hover:shadow-destructive/20 transition-all duration-500 active:scale-95"
              >
                <LogOut size={20} className="mr-3" />
                Logout
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="xl:hidden p-4 bg-muted/50 hover:bg-muted rounded-2xl text-foreground transition-all border border-border/50"
              >
                {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {isMobileMenuOpen && (
          <div className="xl:hidden bg-background border-b border-border animate-in slide-in-from-top-4 duration-300">
            <div className="px-6 py-8 space-y-3">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`w-full flex items-center gap-4 px-8 py-5 rounded-3xl font-black text-lg uppercase tracking-widest transition-all ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20' 
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {link.icon && <link.icon size={24} />}
                    {link.label}
                  </Link>
                );
              })}
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
      </nav>

      {/* Main Content Area */}
      <main className="max-w-[1800px] mx-auto py-16 px-6 lg:px-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="relative">
          {children}
        </div>
      </main>
    </div>
  );
}