'use client';

import { useState, useEffect } from 'react';
import { 
  X, FileText, Image, CheckCircle, XCircle, Clock, Download, 
  User, Mail, Phone, MapPin, Calendar, Award, BookOpen, 
  GraduationCap, AlertCircle 
} from 'lucide-react';
import CustomAttributes from './CustomAttributes';

interface Document {
  id: number;
  type: string;
  fileName: string;
  fileUrl: string;
  uploadDate: string;
  verificationStatus: string;
}

interface Student {
  id: number;
  examID: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  region: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  disability: string;
  stream: string;  // ✅ ADDED - Natural Science or Social Science
  academicYear: string;
  photo: string;
  examResults: Record<string, number>;
  totalScore: number;
  documents: Document[];
  documentsByType: {
    transcript: Document[];
    portfolio: Document[];
    essay: Document[];
    other: Document[];
  };
  school: string;
  customAttributes?: Record<string, any>;
}

interface Props {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ApplicantDetailsModal({ student, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('profile');
  const [streamSubjects, setStreamSubjects] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      async function fetchSubjects() {
        try {
          const res = await fetch('/api/common/settings?key=stream_subjects');
          const data = await res.json();
          if (data.success) setStreamSubjects(data.value);
        } catch (err) {
          console.error('Failed to fetch subjects:', err);
        }
      }
      fetchSubjects();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (!student) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Error</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>No student data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-50 to-white">
          <h2 className="text-2xl font-bold text-gray-900">Applicant Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6 bg-gray-50">
          {['profile', 'documents', 'exam-results'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium transition capitalize ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'profile' ? 'Profile Information' : tab === 'documents' ? 'Documents' : 'Exam Results'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              {/* Profile Header with Photo */}
              <div className="flex items-start gap-6 mb-8 pb-6 border-b">
                {student.photo ? (
                  <img
                    src={student.photo}
                    alt={student.fullName}
                    className="w-28 h-28 rounded-full object-cover border-4 border-blue-200 shadow-md"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-md">
                    {student.firstName?.[0]}{student.lastName?.[0]}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">{student.fullName}</h3>
                  <p className="text-gray-600">Exam ID: {student.examID}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      Score: {student.totalScore}
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      {student.academicYear}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Information Grid */}
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Personal Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-sm">{student.email}</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium text-sm">{student.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Region</p>
                    <p className="font-medium text-sm">{student.region || 'Not specified'}</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Date of Birth</p>
                    <p className="font-medium text-sm">
                      {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'Not specified'}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Age / Gender</p>
                    <p className="font-medium text-sm">{student.age || 'N/A'} years • {student.gender || 'Not specified'}</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                  <Award className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Disability</p>
                    <p className="font-medium text-sm">{student.disability || 'None'}</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                  <GraduationCap className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">School</p>
                    <p className="font-medium text-sm">{student.school || 'Not specified'}</p>
                  </div>
                </div>
                {/* ✅ STREAM FIELD ADDED HERE */}
                <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                  <GraduationCap className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Stream</p>
                    <p className="font-medium text-sm">
                      {student.stream === 'Natural Science' ? (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs inline-block">
                          🔬 Natural Science
                        </span>
                      ) : student.stream === 'Social Science' ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs inline-block">
                          📚 Social Science
                        </span>
                      ) : (
                        student.stream || 'Not specified'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                Academic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-500">Academic Year</p>
                  <p className="font-medium">{student.academicYear}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500">Total Exam Score</p>
                  <p className="font-bold text-lg text-green-700">{student.totalScore}</p>
                </div>
              </div>

              {/* ✅ DYNAMIC CUSTOM ATTRIBUTES */}
              <CustomAttributes attributes={student.customAttributes || null} theme="green" />
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900">Uploaded Documents</h3>
                <p className="text-sm text-gray-500">Total: {student.documents?.length || 0} document(s)</p>
              </div>

              {(!student.documents || student.documents.length === 0) ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                  <p>No documents uploaded by this student</p>
                </div>
              ) : (
                <>
                  {/* Transcripts */}
                  {student.documentsByType?.transcript?.length > 0 && (
                    <div className="mb-8">
                      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2 pb-2 border-b">
                        <BookOpen className="w-4 h-4 text-green-600" />
                        Transcripts ({student.documentsByType.transcript.length})
                      </h4>
                      <div className="space-y-2">
                        {student.documentsByType.transcript.map((doc) => (
                          <DocumentItem key={doc.id} document={doc} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Portfolios */}
                  {student.documentsByType?.portfolio?.length > 0 && (
                    <div className="mb-8">
                      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2 pb-2 border-b">
                        <Image className="w-4 h-4 text-purple-600" />
                        Portfolios ({student.documentsByType.portfolio.length})
                      </h4>
                      <div className="space-y-2">
                        {student.documentsByType.portfolio.map((doc) => (
                          <DocumentItem key={doc.id} document={doc} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Essays */}
                  {student.documentsByType?.essay?.length > 0 && (
                    <div className="mb-8">
                      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2 pb-2 border-b">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Essays ({student.documentsByType.essay.length})
                      </h4>
                      <div className="space-y-2">
                        {student.documentsByType.essay.map((doc) => (
                          <DocumentItem key={doc.id} document={doc} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Documents */}
                  {student.documentsByType?.other?.length > 0 && (
                    <div className="mb-8">
                      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2 pb-2 border-b">
                        <FileText className="w-4 h-4 text-gray-500" />
                        Other Documents ({student.documentsByType.other.length})
                      </h4>
                      <div className="space-y-2">
                        {student.documentsByType.other.map((doc) => (
                          <DocumentItem key={doc.id} document={doc} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Exam Results Tab */}
          {activeTab === 'exam-results' && (
            <div>
              <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                <p className="text-sm text-gray-600">Total Score</p>
                <p className="text-4xl font-bold text-blue-700">
                  {student.totalScore} 
                  <span className="text-lg font-normal text-gray-400 ml-1">
                    / {student.maxScore || (() => {
                      const subjects = streamSubjects?.[student.stream === 'Natural Science' ? 'Natural' : 'Social'];
                      return (subjects?.length || 7) * 100;
                    })()}
                  </span>
                </p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min(100, (student.totalScore / (
                        student.maxScore || (streamSubjects?.[student.stream === 'Natural Science' ? 'Natural' : 'Social']?.length || 7) * 100
                      )) * 100)}%` 
                    }}
                  />
                </div>
              </div>
                {student.examResults && Object.keys(student.examResults).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(student.examResults)
                    .filter(([key]) => {
                      const k = key.toLowerCase();
                      return k !== 'total' && k !== 'totalscore' && !k.startsWith('__');
                    })
                    .sort((a, b) => a[0].localeCompare(b[0])) // Sort alphabetically
                    .map(([subject, score]) => (
                    <div key={subject} className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                          {subject.replace('_id', '').replace('Score', '')}
                        </span>
                        <span className="font-bold text-gray-800 text-lg">
                          {score}
                        </span>
                      </div>
                      <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xs">PTS</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No exam results available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Document Item Component
function DocumentItem({ document }: { document: Document }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
          <FileText className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <a
            href={document.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-sm truncate block"
          >
            {document.fileName}
          </a>
          <p className="text-xs text-gray-500">
            Uploaded: {new Date(document.uploadDate).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div>
          {document.verificationStatus === 'VERIFIED' && (
            <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
              <CheckCircle className="w-3 h-3" /> Verified
            </span>
          )}
          {document.verificationStatus === 'REJECTED' && (
            <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
              <XCircle className="w-3 h-3" /> Rejected
            </span>
          )}
          {document.verificationStatus === 'PENDING' && (
            <span className="flex items-center gap-1 text-yellow-600 text-xs font-medium">
              <Clock className="w-3 h-3" /> Pending
            </span>
          )}
        </div>
        <a
          href={document.fileUrl}
          download
          className="p-1.5 hover:bg-white rounded-lg transition"
          title="Download"
        >
          <Download className="w-4 h-4 text-gray-500" />
        </a>
      </div>
    </div>
  );
}