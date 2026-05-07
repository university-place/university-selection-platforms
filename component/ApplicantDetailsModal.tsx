'use client';

import { useState, useEffect } from 'react';
import { universityAPI } from '@/lib/api';

interface ApplicantDetails {
  id: number;
  examID: string;
  fullName: string;
  email: string;
  phone: string;
  region: string;
  dateOfBirth: string;
  age: number | null;
  gender: string;
  disability: string;
  photo?: string;
  academicYear: string;
  examResults: any;
  totalScore: number;
  applications: Array<{
    id: number;
    programName: string;

    status: string;
    submittedAt: string;
    decisionDate: string | null;
    remarks: string | null;
  }>;
}

interface Props {
  studentId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ApplicantDetailsModal({ studentId, isOpen, onClose }: Props) {
  const [details, setDetails] = useState<ApplicantDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !studentId) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await universityAPI.getApplicantDetails(studentId);
        if (data.success) {
          setDetails(data.student);
        } else {
          setError(data.error || 'Failed to load details');
          // If token is missing or invalid, redirect to login after a short delay
          if (data.error === 'No token found' || data.status === 401) {
            setTimeout(() => {
              window.location.href = '/university/login';
            }, 2000);
          }
        }
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [studentId, isOpen]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">Applicant Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
              <span className="ml-2">Loading...</span>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-medium">Error</p>
              <p>{error}</p>
              {error.includes('token') && (
                <button
                  onClick={() => (window.location.href = '/university/login')}
                  className="mt-2 text-sm underline"
                >
                  Go to Login
                </button>
              )}
            </div>
          )}
          {details && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="flex items-start gap-6">
                {details.photo && (
                  <img src={details.photo} alt={details.fullName} className="w-24 h-24 rounded-full object-cover" />
                )}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><span className="font-medium">Exam ID:</span> {details.examID}</div>
                  <div><span className="font-medium">Full Name:</span> {details.fullName}</div>
                  <div><span className="font-medium">Email:</span> {details.email}</div>
                  <div><span className="font-medium">Phone:</span> {details.phone}</div>
                  <div><span className="font-medium">Region:</span> {details.region}</div>
                  <div><span className="font-medium">Date of Birth:</span> {new Date(details.dateOfBirth).toLocaleDateString()}</div>
                  <div><span className="font-medium">Age:</span> {details.age || 'N/A'}</div>
                  <div><span className="font-medium">Gender:</span> {details.gender}</div>
                  <div><span className="font-medium">Disability:</span> {details.disability || 'None'}</div>
                  <div><span className="font-medium">Academic Year:</span> {details.academicYear}</div>
                  <div><span className="font-medium">Total Exam Score:</span> <strong>{details.totalScore}</strong></div>
                </div>
              </div>

              {/* Exam Results */}
              {details.examResults && Object.keys(details.examResults).length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Exam Results</h3>
                  <div className="bg-gray-50 p-3 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(details.examResults).map(([key, value]) => (
                      <div key={key} className="capitalize"><span className="font-medium">{key}:</span> {value}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Applications */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Applications to Your University</h3>
                {details.applications.length === 0 ? (
                  <p className="text-gray-500">No applications found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Program</th>
                          <th className="px-4 py-2 text-left">Rank</th>
                          <th className="px-4 py-2 text-left">Status</th>
                          <th className="px-4 py-2 text-left">Submitted</th>
                          <th className="px-4 py-2 text-left">Decision Date</th>
                          <th className="px-4 py-2 text-left">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.applications.map(app => (
                          <tr key={app.id} className="border-t">
                            <td className="px-4 py-2">{app.programName}</td>
                            <td className="px-4 py-2">{app.rank || '—'}</td>
                            <td className="px-4 py-2">{getStatusBadge(app.status)}</td>
                            <td className="px-4 py-2">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}</td>
                            <td className="px-4 py-2">{app.decisionDate ? new Date(app.decisionDate).toLocaleDateString() : '—'}</td>
                            <td className="px-4 py-2">{app.remarks || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}