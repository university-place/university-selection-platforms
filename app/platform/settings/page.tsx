'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';

export default function PlatformSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authHelpers.isAuthenticated()) {
      router.push('/platform/login');
      return;
    }

    setLoading(false);
  }, [router]);

  const navLinks = [
    { label: 'Dashboard', href: '/platform/dashboard' },
    { label: 'Users', href: '/platform/users' },
    { label: 'Students', href: '/platform/students' },
    { label: 'Universities', href: '/platform/universities' },
  ];

  return (
    <DashboardLayout title="Settings" navLinks={navLinks} theme="orange">
      <div className="space-y-8">
        <div className="rounded-[2.5rem] border border-border/50 bg-card/80 p-8 shadow-2xl shadow-primary/5">
          <h1 className="text-4xl font-black tracking-tight">Platform Settings</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Manage platform-wide settings and account preferences for the Platform Admin portal.
          </p>
        </div>

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-[2.5rem] border border-border/50 bg-card/80 p-8 text-center">
            <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
            <p className="mt-4 text-gray-600">Loading settings…</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2.5rem] border border-border/50 bg-white/90 p-8 shadow-lg shadow-primary/5">
              <h2 className="text-2xl font-bold">General Platform Settings</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                You can add settings controls here, such as configuration for platform behavior,
                notification preferences, or admin account options.
              </p>
              <div className="mt-8 space-y-4">
                <div className="rounded-3xl bg-muted p-5">
                  <p className="text-sm font-semibold">Platform mode</p>
                  <p className="mt-2 text-sm text-muted-foreground">Live / maintenance toggle is not yet implemented.</p>
                </div>
                <div className="rounded-3xl bg-muted p-5">
                  <p className="text-sm font-semibold">Support email</p>
                  <p className="mt-2 text-sm text-muted-foreground">Update the support contact for platform administrators.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-border/50 bg-white/90 p-8 shadow-lg shadow-primary/5">
              <h2 className="text-2xl font-bold">Admin Account</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Use this section for platform admin profile and security settings.
              </p>
              <div className="mt-8 space-y-4">
                <div className="rounded-3xl bg-muted p-5">
                  <p className="text-sm font-semibold">Password</p>
                  <p className="mt-2 text-sm text-muted-foreground">Change your password from the account management screen.</p>
                </div>
                <div className="rounded-3xl bg-muted p-5">
                  <p className="text-sm font-semibold">Two-factor auth</p>
                  <p className="mt-2 text-sm text-muted-foreground">Two-factor authentication is not configured yet.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
