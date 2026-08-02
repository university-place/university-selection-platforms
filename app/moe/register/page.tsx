'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { authAPI } from '@/lib/api';
import { validateAdminRegisterForm } from '@/lib/validators';

export default function MOERegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push('/moe/login');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

  const handleSubmit = async (formData: Record<string, string>) => {
    setError('');
    setLoading(true);

    const { name, email, password, confirmPassword } = formData;

    // Validate form
    const validation = validateAdminRegisterForm(name, email, password, confirmPassword);

    if (!validation.valid) {
      setError(Object.values(validation.errors)[0]);
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.moeRegister({
        name,
        email,
        password,
      });

      if (!response.success) {
        setError(response.error || 'Registration failed');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An error occurred during registration');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="w-full max-w-md bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-xl border border-purple-200 p-8 text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Registration Successful!</h1>
          <p className="text-muted-foreground mb-4">Redirecting to login page in 3 seconds...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <AuthForm
      title="MOE Admin Registration"
      description="Create your admin account"
      fields={[
        {
          name: 'name',
          label: 'Full Name',
          type: 'text',
          placeholder: 'Enter your full name',
          required: true,
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          placeholder: 'Enter your email',
          required: true,
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          placeholder: 'Enter your password (8-10 chars, uppercase, lowercase, number, symbol)',
          required: true,
        },
        {
          name: 'confirmPassword',
          label: 'Confirm Password',
          type: 'password',
          placeholder: 'Confirm your password',
          required: true,
        },
      ]}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitButtonText="Register"
      footerText="Already have an account?"
      footerLink={{
        text: 'Login here',
        href: '/moe/login',
      }}
      theme="purple"
    />
  );
}
