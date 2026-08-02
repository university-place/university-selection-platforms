'use client';

import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/moe/dashboard' },
  { label: 'Registry', href: '/moe/registry' },
  { label: 'Universities', href: '/moe/universities' },
];

export default function MOERegistryPage() {
  return (
    <MOEDashboardLayout title="MOE Admin Dashboard" navLinks={NAV_LINKS} theme="purple">
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-foreground">University Registry Maintenance</h2>
        <p className="text-muted-foreground mt-2">FR-M11 page is available for registration status, verification, and registry governance.</p>
      </div>
    </MOEDashboardLayout>
  );
}
