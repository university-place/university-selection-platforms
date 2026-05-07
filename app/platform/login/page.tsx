'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { authAPI, authHelpers } from '@/lib/api';
import { validatePlatformLoginForm } from '@/lib/validators';

export default function PlatformLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: Record<string, string>) => {
    setError('');
    setLoading(true);

    const { username, password } = formData;

    const validation = validatePlatformLoginForm(username, password);
    if (!validation.valid) {
      setError(Object.values(validation.errors)[0]);
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.platformLogin(username, password);

      if (!response.success) {
        setError(response.message || 'Login failed');
        setLoading(false);
        return;
      }

      authHelpers.setToken(response.token || '');
      router.push('/platform/dashboard');
      router.refresh();
    } catch (err) {
      setError('An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Platform Admin Login"
      description="Sign in to the Platform Admin Portal"
      fields={[
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          placeholder: 'Enter your username',
          required: true,
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          placeholder: 'Enter your password',
          required: true,
        },
      ]}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitButtonText="Sign In"
      footerText="Don&apos;t have an account?"
      footerLink={{
        text: 'Register here',
        href: '/platform/register',
      }}
      theme="orange"
    />
  );
}
