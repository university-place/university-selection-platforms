'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';

export default function StudentResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (formData: Record<string, string>) => {
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/students/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword
        }),
      });
      
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Something went wrong');
      } else {
        setSuccess(data.message);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/student/login');
        }, 3000);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Reset Password"
      description="Enter your new password below"
      fields={[
        {
          name: 'newPassword',
          label: 'New Password',
          type: 'password',
          placeholder: 'Enter new password',
          required: true,
          icon: 'lock'
        },
        {
          name: 'confirmPassword',
          label: 'Confirm Password',
          type: 'password',
          placeholder: 'Confirm new password',
          required: true,
          icon: 'lock'
        },
      ]}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      successMessage={success}
      submitButtonText="Update Password"
      footerText="Back to"
      footerLink={{
        text: 'Login',
        href: '/student/login',
      }}
      theme="blue"
    />
  );
}
