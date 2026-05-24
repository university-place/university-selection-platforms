'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { authHelpers } from '@/lib/api';

export default function UniversityLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: Record<string, string>) => {
    setError('');
    setLoading(true);

    const { email, password } = formData;

    if (!email || !password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/universities/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        authHelpers.setToken(data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/university/dashboard');
      } else {
        setError(data.message || data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="University Admin Login"
      description="Sign in to your university dashboard"
      fields={[
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          placeholder: 'admin@university.edu.et',
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
      footerText="Don't have an account?"
      footerLink={{
        text: 'Register your university',
        href: '/university/register',
      }}
      forgotPasswordLink={{
        text: 'Forgot Password?',
        href: '/university/forgot-password',
      }}
      theme="green"
    />
  );
}