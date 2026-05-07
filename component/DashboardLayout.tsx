'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { authHelpers } from '@/lib/api';

interface NavLink {
  label: string;
  href: string;
  icon?: string;
}

interface DashboardLayoutProps {
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

export function DashboardLayout({
  title,
  navLinks,
  children,
  theme = 'blue',
}: DashboardLayoutProps) {
  const router = useRouter();

  const handleLogout = () => {
    authHelpers.clearToken();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className={`${themeClasses[theme]} text-white shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold">{title}</h1>
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:bg-opacity-80 px-3 py-2 rounded-md transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Button
                onClick={handleLogout}
                className="bg-white text-gray-900 hover:bg-gray-100"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
