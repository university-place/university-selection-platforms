'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import {
  Users, Award, CheckCircle, XCircle, Clock, Calendar,
  Search, Filter, Eye, Download, Mail, Phone, MapPin,
  GraduationCap, BookOpen, TrendingUp, AlertCircle,
  Loader2, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';

interface PlacedStudent {
  id: number;
  examID: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  region: string;
  programName: string;
  programCode: string;
  interviewType: string;
  interviewDate: string;
  result: string;
  resultNotes: string;
  acceptanceMessage: string;
  confirmationDeadline: string;
  confirmedAt: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED';
}

interface Stats {
  totalPlaced: number;
  confirmed: number;
  pending: number;
  declined: number;
  byProgram: { programName: string; count: number }[];
  byRegion: { region: string; count: number }[];
}

export default function UniversityPlacementsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<PlacedStudent[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPlaced: 0,
    confirmed: 0,
    pending: 0,
    declined: 0,
    byProgram: [],
    byRegion: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [academicYear, setAcademicYear] = useState('2024');
  const [selectedStudent, setSelectedStudent] = useState<PlacedStudent | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/university/login');
      return;
    }
    fetchPlacements();
  }, [academicYear, filterStatus]);

  const fetchPlacements = async () => {
    const token = authHelpers.getToken();
    setLoading(true);
    try {
      // Fetch placed students (those who passed interview/exam)
      const url = filterStatus !== 'all'
        ? `/api/universities/placements?academicYear=${academicYear}&status=${filterStatus}`
        : `/api/universities/placements?academicYear=${academicYear}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setStudents(data.placements || []);
        setStats(data.stats || {
          totalPlaced: 0,
          confirmed: 0,
          pending: 0,
          declined: 0,
          byProgram: [],
          byRegion: []
        });
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Fetch placements error:', err);
      setError('Failed to load placements');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Confirmed</span>;
      case 'DECLINED':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> Declined</span>;
      case 'DRAFT':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Draft</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Awaiting Confirmation</span>;
    }
  };

  const filteredStudents = students.filter(student => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        student.examID.toLowerCase().includes(query) ||
        student.firstName.toLowerCase().includes(query) ||
        student.lastName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard' },
    { label: 'Applicants', href: '/university/applicants' },
    { label: 'Programs', href: '/university/programs' },
    { label: 'Invitations', href: '/university/invitations' },
    { label: 'Placements', href: '/university/placements' }
  ];

  if (loading) {
    return (
      <DashboardLayout title="Placements" navLinks={navLinks} theme="green">
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin w-12 h-12 text-green-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Student Placements" navLinks={navLinks} theme="green">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Awaiting Confirmation</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DECLINED">Declined</option>
            <option value="DRAFT">Draft</option>
          </select>
          
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="2024">2024 Academic Year</option>
            <option value="2025">2025 Academic Year</option>
          </select>
          
          <button
            onClick={() => fetchPlacements()}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or exam ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg w-64 text-sm"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-90">Total Placed</p>
              <p className="text-3xl font-bold">{stats.totalPlaced}</p>
            </div>
            <Award className="w-8 h-8 opacity-80" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-90">Confirmed</p>
              <p className="text-3xl font-bold">{stats.confirmed}</p>
            </div>
            <CheckCircle className="w-8 h-8 opacity-80" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-90">Awaiting Confirmation</p>
              <p className="text-3xl font-bold">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 opacity-80" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-90">Declined</p>
              <p className="text-3xl font-bold">{stats.declined}</p>
            </div>
            <XCircle className="w-8 h-8 opacity-80" />
          </div>
        </div>
      </div>

      {/* Placements Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Accepted Students</h2>
          <p className="text-sm text-gray-500">Students who passed interview/exam and received acceptance</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No placed students yet. Students who pass interviews/exams will appear here.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-mono text-sm font-medium">{student.examID}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{student.programName}</p>
                        <p className="text-xs text-gray-500">{student.programCode}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{student.region}</td>
                    <td className="px-6 py-4">{getStatusBadge(student.status)}</td>
                    <td className="px-6 py-4 text-sm">
                      {student.confirmationDeadline && (
                        <div>
                          <p>{new Date(student.confirmationDeadline).toLocaleDateString()}</p>
                          {new Date(student.confirmationDeadline) < new Date() && student.status === 'PENDING' && (
                            <p className="text-xs text-red-500 mt-1">Expired</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Student Placement Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Student Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3">Student Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-600">Exam ID:</span> <span className="font-medium">{selectedStudent.examID}</span></div>
                  <div><span className="text-gray-600">Name:</span> <span className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</span></div>
                  <div><span className="text-gray-600">Email:</span> <span className="font-medium">{selectedStudent.email}</span></div>
                  <div><span className="text-gray-600">Phone:</span> <span className="font-medium">{selectedStudent.phone}</span></div>
                  <div><span className="text-gray-600">Region:</span> <span className="font-medium">{selectedStudent.region}</span></div>
                  <div><span className="text-gray-600">Program:</span> <span className="font-medium">{selectedStudent.programName}</span></div>
                </div>
              </div>
              
              {/* Interview Info */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-3">Interview/Exam Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-600">Type:</span> <span className="font-medium">{selectedStudent.interviewType}</span></div>
                  <div><span className="text-gray-600">Date:</span> <span className="font-medium">{new Date(selectedStudent.interviewDate).toLocaleString()}</span></div>
                  <div><span className="text-gray-600">Result:</span> <span className="font-medium text-green-600">{selectedStudent.result}</span></div>
                  <div><span className="text-gray-600">Notes:</span> <span className="font-medium">{selectedStudent.resultNotes || '-'}</span></div>
                </div>
              </div>
              
              {/* Acceptance Info */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-3">Acceptance Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-600">Acceptance Message:</span></p>
                  <p className="bg-white p-3 rounded border border-green-200">{selectedStudent.acceptanceMessage || 'Congratulations! You have been accepted.'}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div><span className="text-gray-600">Confirmation Deadline:</span> <span className="font-medium">{new Date(selectedStudent.confirmationDeadline).toLocaleDateString()}</span></div>
                    <div><span className="text-gray-600">Status:</span> {getStatusBadge(selectedStudent.status)}</div>
                    {selectedStudent.confirmedAt && (
                      <div><span className="text-gray-600">Confirmed On:</span> <span className="font-medium">{new Date(selectedStudent.confirmedAt).toLocaleDateString()}</span></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}