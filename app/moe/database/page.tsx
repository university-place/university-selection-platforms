'use client';

import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/moe/dashboard' },
  { label: 'Database', href: '/moe/database' },
  { label: 'Students', href: '/moe/students' },
];

export default function MOEDatabasePage() {
  return (
    <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={NAV_LINKS} theme="purple">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">National Student Database Management</h2>
        <p className="text-gray-600 mt-2">FR-M10 page is available to manage the national student database lifecycle.</p>
      </div>
    </MOEDashboardLayout>
  );
}
