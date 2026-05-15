'use client';

import { useState } from 'react';
import { AuthForm } from '@/components/AuthForm';

export default function StudentForgotPasswordPage() {
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: Record<string, string>) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/students/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Something went wrong');
      } else {
        setSuccess(data.message);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Forgot Password"
      description="Enter your details to receive a reset link"
      fields={[
        {
          name: 'examID',
          label: 'Exam ID',
          type: 'text',
          placeholder: 'Enter your exam ID',
          required: true,
          icon: 'grad'
        },
        {
          name: 'email',
          label: 'Email Address',
          type: 'email',
          placeholder: 'Enter your registered email',
          required: true,
          icon: 'mail'
        },
      ]}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      successMessage={success}
      submitButtonText="Send Reset Link"
      footerText="Remembered your password?"
      footerLink={{
        text: 'Back to Login',
        href: '/student/login',
      }}
      theme="blue"
    />
  );
}
