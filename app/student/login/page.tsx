'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { authHelpers } from '@/lib/api';
import { validateLoginForm } from '@/lib/validators';

export default function StudentLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: Record<string, string>) => {
    setError('');
    setLoading(true);

    const { examId, password } = formData;

    const validation = validateLoginForm(examId, password);
    if (!validation.valid) {
      setError(Object.values(validation.errors)[0]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/students/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examID: examId, password }),
      });
      
      const data = await response.json();
      console.log('Login response:', data);

      if (!data.success) {
        setError(data.message || data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Store token
      if (data.token) {
        localStorage.setItem('token', data.token);
        console.log('Token saved successfully');
      }

      // Store student data
      if (data.student) {
        localStorage.setItem('student', JSON.stringify(data.student));
      }

      // Verify token was saved
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        console.log('Token verified in localStorage');
        router.push('/student/dashboard');
      } else {
        setError('Token not saved. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Student Login"
      description="Sign in to your account"
      fields={[
        {
          name: 'examId',
          label: 'Exam ID',
          type: 'text',
          placeholder: 'Enter your exam ID',
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
        text: 'Register here',
        href: '/student/register',
      }}
      forgotPasswordLink={{
        text: 'Forgot Password?',
        href: '/student/forgot-password',
      }}
      theme="blue"
    />
  );
}