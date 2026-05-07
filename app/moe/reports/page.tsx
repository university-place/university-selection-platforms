'use client';

import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/moe/dashboard' },
  { label: 'Reports', href: '/moe/reports' },
  { label: 'Students', href: '/moe/students' },
  { label: 'Universities', href: '/moe/universities' },
];

export default function MOEReportsPage() {
  return (
    <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={NAV_LINKS} theme="purple">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">National Report Generation</h2>
        <p className="text-gray-600 mt-2">FR-M6 page is now available. Use dashboard APIs and export workflows from this module.</p>
      </div>
    </MOEDashboardLayout>
  );
}
