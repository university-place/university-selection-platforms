'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UniversityRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',        // University code (e.g., BDU, AAU, JU)
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.code) {
      setError('University code is required');
      return false;
    }
    if (!formData.name) {
      setError('Full name is required');
      return false;
    }
    if (!formData.email) {
      setError('Email address is required');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

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

      if (!response.ok || !data.success) {
        setError(data.error || data.message || 'Registration failed');
        setLoading(false);
        return;
      }

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/university/login');
      }, 3000);
      
    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred during registration');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="w-full max-w-md bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-xl border border-green-200 p-8 text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h1>
          <p className="text-gray-600 mb-4">Please check your email to verify your account.</p>
          <p className="text-gray-500 text-sm mb-4">Redirecting to login page...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  // Pre-fill buttons for testing
  const prefillUniversity = (code: string, name: string, email: string) => {
    setFormData({
      code: code,
      name: name,
      email: email,
      password: 'University@2024',
      confirmPassword: 'University@2024',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">University Registration</h1>
        <p className="text-center text-gray-600 mb-6">Create your university admin account</p>

        {/* Quick fill buttons for testing */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => prefillUniversity('BDU', 'Bahir Dar University Admin', 'bahirdar.university@gmail.com')}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 rounded"
          >
            📝 BDU
          </button>
          <button
            type="button"
            onClick={() => prefillUniversity('AAU', 'Addis Ababa University Admin', 'addisababa.university@gmail.com')}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 rounded"
          >
            📝 AAU
          </button>
          <button
            type="button"
            onClick={() => prefillUniversity('JU', 'Jimma University Admin', 'jimma.university@gmail.com')}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 rounded"
          >
            📝 JU
          </button>
          <button
            type="button"
            onClick={() => prefillUniversity('MU', 'Mekelle University Admin', 'mekelle.university@gmail.com')}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 rounded"
          >
            📝 MU
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              University Code *
            </label>
            <input
              name="code"
              type="text"
              placeholder="e.g., BDU, AAU, JU"
              value={formData.code}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your university code (same as in MoE system)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              name="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              name="email"
              type="email"
              placeholder="your.email@university.edu"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              name="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Registering...
              </div>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Already have an account?{' '}
          <a href="/university/login" className="text-green-600 hover:text-green-700 font-semibold">
            Login here
          </a>
        </p>
      </div>
    </div>
  );
}