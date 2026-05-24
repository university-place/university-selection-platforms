'use client';

import { useState } from 'react';
import { AuthForm } from '@/components/AuthForm';

export default function UniversityForgotPasswordPage() {
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: Record<string, string>) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/universities/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Something went wrong');
      } else {
        setSuccess(data.message || 'If an account with that email exists, a password reset link has been sent.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="University Password Reset"
      description="Enter your registered email for verification"
      fields={[
        {
          name: 'email',
          label: 'Admin Email Address',
          type: 'email',
          placeholder: 'admin@university.edu.et',
          required: true,
          icon: 'mail'
        },
      ]}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      successMessage={success}
      submitButtonText="Send Verification Link"
      footerText="Remembered your password?"
      footerLink={{
        text: 'Back to Login',
        href: '/university/login',
      }}
      theme="green"
    />
  );
}
