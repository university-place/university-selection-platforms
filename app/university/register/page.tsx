'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';

export default function UniversityRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // State for prefilling
  const [prefillKey, setPrefillKey] = useState(0);
  const [initialData, setInitialData] = useState<Record<string, string>>({
    code: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleRegister = async (formData: Record<string, string>) => {
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/universities/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: formData.code.toUpperCase(),
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => {
          router.push('/university/login');
        }, 2000);
      } else {
        setError(data.error || data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const prefillUniversity = (code: string, name: string, email: string) => {
    setInitialData({
      code: code,
      name: name,
      email: email,
      password: 'University@2024',
      confirmPassword: 'University@2024',
    });
    setPrefillKey(prev => prev + 1);
  };

  const fields = [
    {
      name: 'code',
      label: 'University Code',
      type: 'text',
      placeholder: 'e.g., BDU, AAU, JU',
      icon: 'shield' as const,
    },
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      placeholder: 'Enter your full name',
      icon: 'user' as const,
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'your.email@university.edu',
      icon: 'mail' as const,
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'Minimum 6 characters',
      icon: 'lock' as const,
    },
    {
      name: 'confirmPassword',
      label: 'Confirm Password',
      type: 'password',
      placeholder: 'Confirm your password',
      icon: 'lock' as const,
    },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Floating Developer Test Controls */}
      <div className="absolute top-4 left-4 z-50 flex flex-wrap gap-2 max-w-xs sm:max-w-none">
        <button
          type="button"
          onClick={() => prefillUniversity('BDU', 'Bahir Dar University Admin', 'bahirdar.university@gmail.com')}
          className="bg-slate-800/80 border border-slate-700/50 hover:bg-slate-750 text-slate-200 py-1 px-2.5 rounded text-[10px] transition"
        >
          BDU Prefill
        </button>
        <button
          type="button"
          onClick={() => prefillUniversity('AAU', 'Addis Ababa University Admin', 'addisababa.university@gmail.com')}
          className="bg-slate-800/80 border border-slate-700/50 hover:bg-slate-750 text-slate-200 py-1 px-2.5 rounded text-[10px] transition"
        >
          AAU Prefill
        </button>
        <button
          type="button"
          onClick={() => prefillUniversity('JU', 'Jimma University Admin', 'jimma.university@gmail.com')}
          className="bg-slate-800/80 border border-slate-700/50 hover:bg-slate-750 text-slate-200 py-1 px-2.5 rounded text-[10px] transition"
        >
          JU Prefill
        </button>
        <button
          type="button"
          onClick={() => prefillUniversity('MU', 'Mekelle University Admin', 'mekelle.university@gmail.com')}
          className="bg-slate-800/80 border border-slate-700/50 hover:bg-slate-750 text-slate-200 py-1 px-2.5 rounded text-[10px] transition"
        >
          MU Prefill
        </button>
      </div>

      <AuthForm
        key={prefillKey}
        title="University Registration"
        description="Create your university admin account"
        fields={fields}
        onSubmit={handleRegister}
        loading={loading}
        error={error}
        successMessage={success}
        submitButtonText="Register"
        footerText="Already have an account?"
        footerLink={{
          text: 'Login here',
          href: '/university/login',
        }}
      />
    </div>
  );
}