'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';

export default function StudentRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // State for prefilling
  const [prefillKey, setPrefillKey] = useState(0);
  const [initialData, setInitialData] = useState<Record<string, string>>({
    examID: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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
      const response = await fetch('/api/students/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examID: formData.examID,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Registration successful!');
        setTimeout(() => {
          router.push('/student/login');
        }, 2000);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const prefillAlmaz = () => {
    setInitialData({
      examID: 'EXM-2024-002',
      firstName: 'Almaz',
      lastName: 'Getnet',
      email: 'redugetahun21@gmail.com',
      phone: '+251911111002',
      password: 'Almaz@123',
      confirmPassword: 'Almaz@123',
    });
    setPrefillKey(prev => prev + 1);
  };

  const prefillHabtamu = () => {
    setInitialData({
      examID: 'EXM-2024-003',
      firstName: 'Habtamu',
      lastName: 'Tadesse',
      email: '',
      phone: '',
      password: 'Habtamu@123',
      confirmPassword: 'Habtamu@123',
    });
    setPrefillKey(prev => prev + 1);
  };

  const fields = [
    {
      name: 'examID',
      label: 'Admission ID / Exam ID',
      type: 'text',
      placeholder: 'e.g., EXM-2024-002',
      icon: 'shield' as const,
    },
    {
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      placeholder: 'Enter first name',
      icon: 'user' as const,
    },
    {
      name: 'lastName',
      label: 'Last Name',
      type: 'text',
      placeholder: 'Enter last name',
      icon: 'user' as const,
    },
    {
      name: 'email',
      label: 'Email (Optional)',
      type: 'email',
      placeholder: 'your@email.com (optional)',
      required: false,
      icon: 'mail' as const,
    },
    {
      name: 'phone',
      label: 'Phone (Optional)',
      type: 'tel',
      placeholder: '09xxxxxxxx (optional)',
      required: false,
      icon: 'user' as const,
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
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <button
          type="button"
          onClick={prefillAlmaz}
          className="bg-slate-800/80 border border-slate-700/50 hover:bg-slate-750 text-slate-200 py-1.5 px-3 rounded-lg text-xs transition"
        >
          📝 Prefill Almaz
        </button>
        <button
          type="button"
          onClick={prefillHabtamu}
          className="bg-slate-800/80 border border-slate-700/50 hover:bg-slate-750 text-slate-200 py-1.5 px-3 rounded-lg text-xs transition"
        >
          📝 Prefill Habtamu
        </button>
      </div>

      <AuthForm
        key={prefillKey}
        title="Student Registration"
        description="Ethiopian University Selection Platform"
        fields={fields}
        onSubmit={handleRegister}
        loading={loading}
        error={error}
        successMessage={success}
        submitButtonText="Register"
        footerText="Already have an account?"
        footerLink={{
          text: 'Login here',
          href: '/student/login',
        }}
      />
    </div>
  );
}