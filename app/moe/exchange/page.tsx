'use client';

import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/moe/dashboard' },
  { label: 'Exchange', href: '/moe/exchange' },
  { label: 'Upload', href: '/moe/upload' },
];

export default function MOEExchangePage() {
  return (
    <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={NAV_LINKS} theme="purple">
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-foreground">Data Exchange Facilitation</h2>
        <p className="text-muted-foreground mt-2">FR-M3 page is available for managing data exchange workflows between MOE and universities.</p>
      </div>
    </MOEDashboardLayout>
  );
}
