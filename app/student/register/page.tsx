'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    examID: '',
    firstName: '',
    lastName: '',
    email: '',        // ✅ Added email field
    phone: '',        // ✅ Added phone field
    password: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    // Validation - only examID, name, password are required
    if (!formData.examID || !formData.firstName || !formData.lastName || !formData.password || !formData.confirmPassword) {
      setError('Exam ID, Name, and Password are required');
      setLoading(false);
      return;
    }

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
          email: formData.email || undefined,      // ✅ Optional - send only if provided
          phone: formData.phone || undefined,      // ✅ Optional - send only if provided
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        // Clear form
        setFormData({
          examID: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
        });
        // Redirect to login after 2 seconds
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

  // Pre-fill for Almaz Getnet (EXM-2024-002) - with email
  const prefillAlmaz = () => {
    setFormData({
      examID: 'EXM-2024-002',
      firstName: 'Almaz',
      lastName: 'Getnet',
      email: 'redugetahun21@gmail.com',
      phone: '+251911111002',
      password: 'Almaz@123',
      confirmPassword: 'Almaz@123',
    });
  };

  // Pre-fill for Habtamu Tadesse (EXM-2024-003) - without email (rural student)
  const prefillHabtamu = () => {
    setFormData({
      examID: 'EXM-2024-003',
      firstName: 'Habtamu',
      lastName: 'Tadesse',
      email: '',
      phone: '',
      password: 'Habtamu@123',
      confirmPassword: 'Habtamu@123',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">Student Registration</h1>
        <p className="text-center text-gray-600 mb-6">Ethiopian University Selection Platform</p>

        {/* Quick fill buttons for testing */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={prefillAlmaz}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition text-sm"
          >
            📝 Almaz (With Email)
          </button>
          <button
            type="button"
            onClick={prefillHabtamu}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition text-sm"
          >
            📝 Habtamu (No Email)
          </button>
        </div>

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Admission ID / Exam ID *</label>
            <input
              type="text"
              name="examID"
              value={formData.examID}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., EXM-2024-002"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-2">First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Last name"
                required
              />
            </div>
          </div>

          {/* ✅ Optional Email Field */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">
              Email 
              <span className="text-gray-400 text-sm ml-1">(Optional)</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com (optional)"
            />
            <p className="text-xs text-gray-400 mt-1">Only needed if you want email verification</p>
          </div>

          {/* ✅ Optional Phone Field */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">
              Phone 
              <span className="text-gray-400 text-sm ml-1">(Optional)</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="09xxxxxxxx (optional)"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimum 6 characters"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Password must have uppercase, lowercase, and number
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/student/login" className="text-blue-500 hover:underline">
            Already have an account? Login here
          </a>
        </div>
      </div>
    </div>
  );
}