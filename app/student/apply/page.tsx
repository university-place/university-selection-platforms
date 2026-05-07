'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';

type ApplicationType = 'scholarship' | 'autonomous' | 'non-autonomous';

interface University {
  id: number;
  name: string;
  code: string;
  type: string;
}

export default function ApplyPage() {
  const router = useRouter();
  const [applicationType, setApplicationType] = useState<ApplicationType>('non-autonomous');
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fetchingUniversities, setFetchingUniversities] = useState(false);

  const fetchUniversities = async (type: ApplicationType) => {
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/student/login');
      return;
    }

    let typeParam = '';
    if (type === 'autonomous') typeParam = 'autonomous';
    if (type === 'non-autonomous') typeParam = 'non-autonomous';
    const url = typeParam ? `/api/universities?type=${typeParam}` : '/api/universities';

    setFetchingUniversities(true);
    setUniversities([]);

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setUniversities(data.universities);
      } else {
        throw new Error(data.error || 'Failed to load universities');
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Could not load universities' });
    } finally {
      setFetchingUniversities(false);
    }
  };

  useEffect(() => {
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/student/login');
      return;
    }
    fetchUniversities(applicationType);
    setSelectedUniversity(null);
  }, [applicationType, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUniversity) {
      setMessage({ type: 'error', text: 'Please select a university' });
      return;
    }
    setLoading(true);
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/students/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          applications: [{ universityId: selectedUniversity }] // only universityId
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Application submitted successfully! Redirecting...' });
        setTimeout(() => router.push('/student/applications'), 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Submission failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred while submitting.' });
    } finally {
      setLoading(false);
    }
  };

  const navLinks = [
    { label: 'Dashboard', href: '/student/dashboard' },
    { label: 'Applications', href: '/student/applications' },
    { label: 'Invitations', href: '/student/invitations' },
  ];

  return (
    <DashboardLayout title="New Application" navLinks={navLinks} theme="blue">
      <div className="max-w-3xl mx-auto">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setApplicationType('non-autonomous')}
              className={`flex-1 py-3 text-center font-medium transition ${
                applicationType === 'non-autonomous'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Non‑Autonomous Universities
            </button>
            <button
              onClick={() => setApplicationType('autonomous')}
              className={`flex-1 py-3 text-center font-medium transition ${
                applicationType === 'autonomous'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Autonomous Universities
            </button>
            <button
              onClick={() => setApplicationType('scholarship')}
              className={`flex-1 py-3 text-center font-medium transition ${
                applicationType === 'scholarship'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Scholarship (Foreign Students)
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold mb-6">
            {applicationType === 'scholarship' && 'Apply for Scholarship'}
            {applicationType === 'autonomous' && 'Apply to Autonomous University'}
            {applicationType === 'non-autonomous' && 'Apply to Public University'}
          </h2>

          {message && (
            <div className={`p-3 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-medium mb-1">University</label>
              {fetchingUniversities ? (
                <div className="text-gray-500">Loading...</div>
              ) : universities.length === 0 ? (
                <div className="text-red-500">No universities available for this category.</div>
              ) : (
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={selectedUniversity || ''}
                  onChange={(e) => setSelectedUniversity(Number(e.target.value))}
                  required
                >
                  <option value="">-- Select university --</option>
                  {universities.map(uni => (
                    <option key={uni.id} value={uni.id}>{uni.name}</option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || fetchingUniversities || !selectedUniversity}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}