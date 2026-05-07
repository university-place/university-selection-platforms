'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MOEDashboardLayout } from '@/components/MOEDashboardLayout';
import { Button } from '@/components/ui/button';
import { moeAuthHelpers } from '@/lib/api';

interface UploadResult {
  success: boolean;
  message?: string;
  summary?: {
    totalRecords: number;
    insertedOrUpdated?: number;
    processed?: number;
    mode?: string;
    naturalCount?: number;
    socialCount?: number;
    academicYear?: string;
    results?: any[];
  };
  error?: string;
}

export default function MOEUploadPage() {
  const router = useRouter();
  const studentFileInputRef = useRef<HTMLInputElement>(null);
  const universityFileInputRef = useRef<HTMLInputElement>(null);
  
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadType, setUploadType] = useState<'students' | 'universities'>('students');
  
  // Student upload states
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [academicYear, setAcademicYear] = useState('2024');
  const [uploadMode, setUploadMode] = useState<'upsert' | 'replace'>('upsert');
  const [activateNow, setActivateNow] = useState(false);
  
  // University upload states
  const [universityFile, setUniversityFile] = useState<File | null>(null);
  
  // Results
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setMounted(true);
    
    // Check authentication
    const token = moeAuthHelpers.getToken();
    console.log('Upload page - Token exists:', !!token);
    
    if (token) {
      // Verify token has MOE_ADMIN role
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Upload page - Token role:', payload.role);
        
        if (payload.role === 'MOE_ADMIN' || payload.role === 'PLATFORM_ADMIN') {
          setIsAuthenticated(true);
        } else {
          console.log('Invalid role for MOE access:', payload.role);
          router.push('/moe/login');
        }
      } catch (err) {
        console.error('Error parsing token:', err);
        router.push('/moe/login');
      }
    } else {
      console.log('No token found, redirecting to login');
      router.push('/moe/login');
    }
  }, [router]);

  // Validate CSV file
  const validateCSVFile = (file: File): { valid: boolean; error?: string } => {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'csv') {
      return { valid: false, error: 'File must be a CSV file' };
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }
    
    return { valid: true };
  };

  // Handle student file selection
  const handleStudentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateCSVFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        setStudentFile(null);
      } else {
        setError('');
        setStudentFile(file);
        setResult(null);
        setSuccess('');
      }
    }
  };

  // Handle university file selection
  const handleUniversityFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateCSVFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        setUniversityFile(null);
      } else {
        setError('');
        setUniversityFile(file);
        setResult(null);
        setSuccess('');
      }
    }
  };

  // Upload students
  const uploadStudents = async () => {
    if (!academicYear) {
      setError('Academic year is required');
      return;
    }

    if (!studentFile) {
      setError('Please select a CSV file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', studentFile);
      formData.append('academicYear', academicYear);
      formData.append('update', uploadMode === 'upsert' ? 'true' : 'false');
      formData.append('replace', uploadMode === 'replace' ? 'true' : 'false');
      formData.append('activateNow', String(activateNow));

      const token = moeAuthHelpers.getToken();
      console.log('Uploading students with token:', !!token);
      
      const response = await fetch('/api/moe/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      console.log('Upload response:', data);

      if (response.ok && data.success) {
        setResult(data);
        setSuccess(`✅ Upload successful! ${data.summary?.insertedOrUpdated || data.summary?.totalRecords} records processed.`);
        setStudentFile(null);
        if (studentFileInputRef.current) {
          studentFileInputRef.current.value = '';
        }
      } else {
        setError(data.error || data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('An error occurred during upload');
    } finally {
      setLoading(false);
    }
  };

  // Upload universities
  const uploadUniversities = async () => {
    if (!universityFile) {
      setError('Please select a CSV file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', universityFile);

      const token = moeAuthHelpers.getToken();
      const response = await fetch('/api/moe/upload-universities', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        setSuccess(`✅ Upload successful! ${data.summary?.processed || data.summary?.totalRecords} universities processed.`);
        setUniversityFile(null);
        if (universityFileInputRef.current) {
          universityFileInputRef.current.value = '';
        }
      } else {
        setError(data.error || data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('An error occurred during upload');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadType === 'students') {
      await uploadStudents();
    } else {
      await uploadUniversities();
    }
  };

  const navLinks = [
    { label: 'Dashboard', href: '/moe/dashboard' },
    { label: 'Students', href: '/moe/students' },
    { label: 'Upload', href: '/moe/upload' },
    { label: 'Universities', href: '/moe/universities' },
    { label: 'Academic Years', href: '/moe/academic-years' },
  ];

  // Show loading state
  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <MOEDashboardLayout title="CSV Upload" navLinks={navLinks} theme="purple">
      <div className="space-y-6">
        {/* Upload Type Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => {
              setUploadType('students');
              setError('');
              setSuccess('');
              setResult(null);
            }}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              uploadType === 'students'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📚 Upload Students
          </button>
          <button
            onClick={() => {
              setUploadType('universities');
              setError('');
              setSuccess('');
              setResult(null);
            }}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              uploadType === 'universities'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🏫 Upload Universities
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Form */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4">
              {uploadType === 'students' ? 'Upload Student Data' : 'Upload University Data'}
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Student-specific fields */}
              {uploadType === 'students' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Academic Year *
                    </label>
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="e.g., 2024"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Upload Mode
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="uploadMode"
                          value="upsert"
                          checked={uploadMode === 'upsert'}
                          onChange={(e) => setUploadMode(e.target.value as 'upsert')}
                          className="mr-2"
                        />
                        <span className="text-gray-700">
                          Upsert (Insert new, update existing)
                        </span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="uploadMode"
                          value="replace"
                          checked={uploadMode === 'replace'}
                          onChange={(e) => setUploadMode(e.target.value as 'replace')}
                          className="mr-2"
                        />
                        <span className="text-gray-700">
                          Replace (Clear and re-import all for this academic year)
                        </span>
                      </label>
                    </div>
                  </div>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activateNow}
                      onChange={(e) => setActivateNow(e.target.checked)}
                      className="mr-2 rounded"
                    />
                    <span className="text-gray-700">Activate these records immediately</span>
                  </label>
                </>
              )}

              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSV File *
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col w-full h-32 border-2 border-dashed border-purple-300 rounded-lg p-4 cursor-pointer hover:bg-purple-50">
                    <div className="flex flex-col items-center justify-center pt-7">
                      <span className="text-2xl mb-2">📁</span>
                      <span className="text-sm font-semibold text-gray-700">
                        Click to upload or drag and drop
                      </span>
                      <span className="text-xs text-gray-600">CSV files up to 10MB</span>
                    </div>
                    <input
                      ref={uploadType === 'students' ? studentFileInputRef : universityFileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={uploadType === 'students' ? handleStudentFileSelect : handleUniversityFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
                {uploadType === 'students' && studentFile && (
                  <p className="mt-2 text-sm text-green-600 font-semibold">
                    ✓ Selected: {studentFile.name}
                  </p>
                )}
                {uploadType === 'universities' && universityFile && (
                  <p className="mt-2 text-sm text-green-600 font-semibold">
                    ✓ Selected: {universityFile.name}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || (uploadType === 'students' ? !studentFile : !universityFile) || (uploadType === 'students' && !academicYear)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 py-2"
              >
                {loading ? 'Processing...' : `Upload ${uploadType === 'students' ? 'Students' : 'Universities'} CSV`}
              </Button>
            </form>
          </div>

          {/* CSV Format Example */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h3 className="text-lg font-bold mb-3">CSV Format</h3>
            
            {uploadType === 'students' ? (
              <>
                <div className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                  <pre className="text-gray-700">
{`examID,firstName,lastName,email,dateOfBirth,studentNationalID,mathScore,englishScore,physicsScore,chemistryScore,biologyScore,total
EXM-2024-001,Abebe,Kebede,abebe@email.com,2000-01-15,1234567890,85,78,92,88,90,433`}
                  </pre>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  <strong>Required columns:</strong> examID, firstName, lastName, email, dateOfBirth, studentNationalID
                </p>
              </>
            ) : (
              <>
                <div className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                  <pre className="text-gray-700">
{`code,name,type,region,address,contactEmail,contactPhone,website,description
AAU,Addis Ababa University,Public,Addis Ababa,5 kilo,info@aau.edu.et,+251111234567,www.aau.edu.et,Leading university`}
                  </pre>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  <strong>Required columns:</strong> code, name, type
                </p>
              </>
            )}
          </div>
        </div>

        {/* Upload Result */}
        {result && result.success && (
          <div className="bg-green-50 rounded-lg shadow p-6 border border-green-200">
            <h3 className="text-lg font-bold text-green-900 mb-3">Upload Summary</h3>
            <div className="space-y-2 text-sm">
              {uploadType === 'students' ? (
                <>
                  <p><strong>Academic Year:</strong> {result.summary?.academicYear}</p>
                  <p><strong>Total Records:</strong> {result.summary?.totalRecords}</p>
                  <p><strong>Inserted/Updated:</strong> {result.summary?.insertedOrUpdated}</p>
                  <p><strong>Natural Science:</strong> {result.summary?.naturalCount}</p>
                  <p><strong>Social Science:</strong> {result.summary?.socialCount}</p>
                  <p><strong>Mode:</strong> {result.summary?.mode}</p>
                </>
              ) : (
                <>
                  <p><strong>Total Records:</strong> {result.summary?.totalRecords}</p>
                  <p><strong>Processed:</strong> {result.summary?.processed}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </MOEDashboardLayout>
  );
}