'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { moeAuthHelpers, moeAPI } from '@/lib/api';

export default function MOELoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const handleSubmit = async (formData: Record<string, string>) => {
    setError('');
    setLoading(true);

    const { email, password } = formData;

    // Validate form
    if (!email || !password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting MOE login for:', email);
      
      const response = await moeAPI.moeLogin(email, password);

      console.log('Login response:', response);

      if (!response.success) {
        setError(response.error || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      if (!response.data?.token) {
        setError('Invalid response from server. Please try again.');
        setLoading(false);
        return;
      }

      // Store token so MOEDashboardLayout can read it
      moeAuthHelpers.setToken(response.data.token);
      
      // Store user info
      if (response.data.user) {
        localStorage.setItem('moe_user', JSON.stringify(response.data.user));
      }
      
      // Redirect to dashboard
      router.push('/moe/dashboard');
      
    } catch (err: any) {
      console.error('MOE Login error:', err);
      setError(err.message || 'An error occurred during login. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Debug Panel - Remove in production */}
        {showDebug && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-xs">
            <p className="font-bold text-yellow-800">Debug Info:</p>
            <p>Try these credentials:</p>
            <p className="font-mono">Email: admin@moe.gov.et</p>
            <p className="font-mono">Password: Admin@123</p>
            <button 
              onClick={() => setShowDebug(false)}
              className="text-red-600 text-xs mt-1"
            >
              Hide Debug
            </button>
          </div>
        )}
        
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="mb-2 text-xs text-purple-300 hover:text-white transition"
        >
          {showDebug ? 'Hide' : 'Show'} Debug Info
        </button>
        
        <AuthForm
          title="MOE Admin Login"
          description="Sign in to the MOE Admin Portal"
          fields={[
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
            href: '/moe/register',
          }}
          theme="purple"
        />
      </div>
    </div>
  );
}