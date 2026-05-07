'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import ApplicantDetailsModal from '@/components/ApplicantDetailsModal';
import { 
  Search, Filter, X, Calendar, MapPin, Users, Award, 
  ChevronDown, ChevronUp, GraduationCap, SortAsc, SortDesc,
  BookOpen, Eye, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle,
  UserCheck, UserX, BarChart3
} from 'lucide-react';

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
  stream: string;
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
}

interface Applicant {
  id: number;
  examID: string;
  fullName: string;
  programName: string;
  programId: number;
  score: number;
  status: string;
  finalStatus?: string;
  appliedAt: string;
  submittedAt: string;
  student: Student | null;
}

interface FilterOptions {
  searchQuery: string;
  region: string;
  gender: string;
  stream: string;
  status: string;
  scoreType: 'all' | 'greater' | 'less' | 'range';
  scoreValue: number;
  scoreMin: number;
  scoreMax: number;
  ageType: 'all' | 'greater' | 'less' | 'range';
  ageValue: number;
  ageMin: number;
  ageMax: number;
  sortBy: 'name' | 'score' | 'age' | 'submittedAt';
  sortOrder: 'asc' | 'desc';
}

export default function UniversityApplicantsPage() {
  const router = useRouter();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  
  // Quick filter states
  const [quickStreamFilter, setQuickStreamFilter] = useState<'all' | 'natural' | 'social'>('all');
  const [quickStatusFilter, setQuickStatusFilter] = useState<'all' | 'pending' | 'placed' | 'not_placed' | 'pending_response' | 'confirmed' | 'declined'>('all');

  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    region: 'all',
    gender: 'all',
    stream: 'all',
    status: 'all',
    scoreType: 'all',
    scoreValue: 0,
    scoreMin: 0,
    scoreMax: 700,
    ageType: 'all',
    ageValue: 0,
    ageMin: 0,
    ageMax: 100,
    sortBy: 'submittedAt',
    sortOrder: 'desc',
  });

  useEffect(() => {
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/university/login');
      return;
    }
    fetchApplicants();
  }, [router]);

  const fetchApplicants = async () => {
    try {
      const token = authHelpers.getToken();
      // ✅ Fetch ALL applicants including placed and invited students
      const res = await fetch('/api/universities/applicants?limit=1000&includePlaced=true&includeInvited=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.applicants) {
        setApplicants(data.applicants);
        setFilteredApplicants(data.applicants);
        
        const regions = [...new Set(data.applicants.map((app: Applicant) => app.student?.region).filter(Boolean))];
        setAvailableRegions(regions as string[]);
      } else {
        setError(data.error || 'Failed to load applicants');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading applicants');
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters
  useEffect(() => {
    let filtered = [...applicants];
    
    // Search filter
    if (filters.searchQuery) {
      filtered = filtered.filter(app => 
        (app.student?.fullName || app.fullName || '').toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (app.student?.examID || app.examID || '').toLowerCase().includes(filters.searchQuery.toLowerCase())
      );
    }
    
    // Quick Stream Filter
    if (quickStreamFilter !== 'all') {
      filtered = filtered.filter(app => {
        const studentStream = app.student?.stream || '';
        if (quickStreamFilter === 'natural') return studentStream === 'Natural Science';
        if (quickStreamFilter === 'social') return studentStream === 'Social Science';
        return true;
      });
    }
    
    // Quick Status Filter
    if (quickStatusFilter !== 'all') {
      filtered = filtered.filter(app => {
        const status = app.finalStatus || app.status;
        if (quickStatusFilter === 'pending') return status === 'SUBMITTED' || status === 'PENDING';
        if (quickStatusFilter === 'placed') return (['BATCH_PLACED', 'ACCEPTED', 'CONFIRMED'].includes(status)) && status !== 'DECLINED';
        if (quickStatusFilter === 'not_placed') return ['BATCH_NOT_PLACED', 'REJECTED', 'DECLINED'].includes(status);
        if (quickStatusFilter === 'pending_response') return status === 'ACCEPTED' && app.finalStatus !== 'CONFIRMED' && app.finalStatus !== 'DECLINED';
        if (quickStatusFilter === 'confirmed') return status === 'CONFIRMED';
        if (quickStatusFilter === 'declined') return status === 'DECLINED';
        return true;
      });
    }
    
    // Advanced filters
    if (filters.region !== 'all') filtered = filtered.filter(app => app.student?.region === filters.region);
    if (filters.gender !== 'all') filtered = filtered.filter(app => app.student?.gender === filters.gender);
    if (filters.stream !== 'all') filtered = filtered.filter(app => app.student?.stream === filters.stream);
    if (filters.status !== 'all') filtered = filtered.filter(app => app.status === filters.status);
    
    // Score filter
    if (filters.scoreType === 'greater') {
      filtered = filtered.filter(app => (app.student?.totalScore || app.score || 0) >= filters.scoreValue);
    } else if (filters.scoreType === 'less') {
      filtered = filtered.filter(app => (app.student?.totalScore || app.score || 0) <= filters.scoreValue);
    } else if (filters.scoreType === 'range') {
      filtered = filtered.filter(app => {
        const score = app.student?.totalScore || app.score || 0;
        return score >= filters.scoreMin && score <= filters.scoreMax;
      });
    }
    
    // Age filter
    if (filters.ageType === 'greater') {
      filtered = filtered.filter(app => (app.student?.age || 0) >= filters.ageValue);
    } else if (filters.ageType === 'less') {
      filtered = filtered.filter(app => (app.student?.age || 0) <= filters.ageValue);
    } else if (filters.ageType === 'range') {
      filtered = filtered.filter(app => {
        const age = app.student?.age || 0;
        return age >= filters.ageMin && age <= filters.ageMax;
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = (a.student?.fullName || a.fullName || '').localeCompare(b.student?.fullName || b.fullName || '');
          break;
        case 'score':
          comparison = (a.student?.totalScore || a.score || 0) - (b.student?.totalScore || b.score || 0);
          break;
        case 'age':
          comparison = (a.student?.age || 0) - (b.student?.age || 0);
          break;
        case 'submittedAt':
          comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
          break;
        default:
          comparison = 0;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredApplicants(filtered);
  }, [applicants, filters, quickStreamFilter, quickStatusFilter]);

  const getStatusBadge = (status: string, finalStatus?: string) => {
    const s = finalStatus || status;
    switch (s) {
      case 'CONFIRMED': 
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Accepted by Student</span>;
      case 'DECLINED': 
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> Declined by Student</span>;
      case 'BATCH_PLACED':
      case 'PLACED': 
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Placed</span>;
      case 'BATCH_NOT_PLACED':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 flex items-center gap-1"><UserX className="w-3 h-3" /> Not Placed</span>;
      case 'ACCEPTED':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending Student Response</span>;
      case 'REJECTED': 
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
      default: 
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Pending Process</span>;
    }
  };

  const handleViewDetails = (applicant: Applicant) => {
    setSelectedStudent(applicant.student);
    setModalOpen(true);
  };

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      region: 'all',
      gender: 'all',
      stream: 'all',
      status: 'all',
      scoreType: 'all',
      scoreValue: 0,
      scoreMin: 0,
      scoreMax: 700,
      ageType: 'all',
      ageValue: 0,
      ageMin: 0,
      ageMax: 100,
      sortBy: 'submittedAt',
      sortOrder: 'desc',
    });
    setQuickStreamFilter('all');
    setQuickStatusFilter('all');
  };

  // Calculate statistics
  const stats = {
    total: applicants.length,
    natural: applicants.filter(a => a.student?.stream === 'Natural Science').length,
    social: applicants.filter(a => a.student?.stream === 'Social Science').length,
    pending: applicants.filter(a => a.status === 'SUBMITTED' || a.status === 'PENDING').length,
    placed: applicants.filter(a => (['BATCH_PLACED', 'ACCEPTED', 'CONFIRMED'].includes(a.finalStatus || a.status)) && (a.finalStatus !== 'DECLINED')).length,
    notPlaced: applicants.filter(a => ['BATCH_NOT_PLACED', 'REJECTED', 'DECLINED'].includes(a.finalStatus || a.status)).length,
    pendingResponse: applicants.filter(a => a.status === 'ACCEPTED' && a.finalStatus !== 'CONFIRMED' && a.finalStatus !== 'DECLINED').length,
    confirmed: applicants.filter(a => a.finalStatus === 'CONFIRMED').length,
    declined: applicants.filter(a => a.finalStatus === 'DECLINED').length,
  };

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard' },
    { label: 'Applicants', href: '/university/applicants' },
    { label: 'Invitations', href: '/university/invitations' },
    { label: 'Placements', href: '/university/placements' },
    { label: 'Programs', href: '/university/programs' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Applicants" navLinks={navLinks} theme="green">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Applicants" navLinks={navLinks} theme="green">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-sm underline">Try again</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Applicants" navLinks={navLinks} theme="green">
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header with Search and Filters */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">All Applicants</h2>
              <p className="text-sm text-gray-500 mt-1">
                Showing {filteredApplicants.length} of {applicants.length} student(s)
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or exam ID..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                    showFilters ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Advanced Filters
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mt-4">
            <div className="bg-gray-100 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600 font-medium">Total</p>
              <p className="text-lg font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center">
              <p className="text-xs text-yellow-700 font-medium">Pending</p>
              <p className="text-lg font-bold text-yellow-800">{stats.pending}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
              <p className="text-xs text-blue-700 font-medium">Placed</p>
              <p className="text-lg font-bold text-blue-800">{stats.placed}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center">
              <p className="text-xs text-orange-700 font-medium">Not Placed</p>
              <p className="text-lg font-bold text-orange-800">{stats.notPlaced}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
              <p className="text-xs text-purple-700 font-medium">Pending Response</p>
              <p className="text-lg font-bold text-purple-800">{stats.pendingResponse}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
              <p className="text-xs text-green-700 font-medium">Confirmed</p>
              <p className="text-lg font-bold text-green-800">{stats.confirmed}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
              <p className="text-xs text-red-700 font-medium">Declined</p>
              <p className="text-lg font-bold text-red-800">{stats.declined}</p>
            </div>
          </div>
          
          {/* Quick Stream Filter Tabs */}
          <div className="flex gap-2 mt-4 border-b pb-2">
            <button 
              onClick={() => setQuickStreamFilter('all')} 
              className={`px-4 py-2 rounded-lg transition ${quickStreamFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              All Students ({stats.total})
            </button>
            <button 
              onClick={() => setQuickStreamFilter('natural')} 
              className={`px-4 py-2 rounded-lg transition ${quickStreamFilter === 'natural' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
            >
              🔬 Natural Science ({stats.natural})
            </button>
            <button 
              onClick={() => setQuickStreamFilter('social')} 
              className={`px-4 py-2 rounded-lg transition ${quickStreamFilter === 'social' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
            >
              📚 Social Science ({stats.social})
            </button>
          </div>
          
          {/* Quick Status Filter Tabs */}
          <div className="flex flex-wrap gap-2 mt-3 pb-2">
            <button 
              onClick={() => setQuickStatusFilter('all')} 
              className={`px-3 py-1 text-xs rounded-full transition ${quickStatusFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              All Status
            </button>
            <button 
              onClick={() => setQuickStatusFilter('pending')} 
              className={`px-3 py-1 text-xs rounded-full transition ${quickStatusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
            >
              ⏳ Pending ({stats.pending})
            </button>
            <button 
              onClick={() => setQuickStatusFilter('placed')} 
              className={`px-3 py-1 text-xs rounded-full transition ${quickStatusFilter === 'placed' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
            >
              ✅ Placed ({stats.placed})
            </button>
            <button 
              onClick={() => setQuickStatusFilter('not_placed')} 
              className={`px-3 py-1 text-xs rounded-full transition ${quickStatusFilter === 'not_placed' ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
            >
              ❌ Not Placed ({stats.notPlaced})
            </button>
            <button 
              onClick={() => setQuickStatusFilter('pending_response')} 
              className={`px-3 py-1 text-xs rounded-full transition ${quickStatusFilter === 'pending_response' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
            >
              🕰️ Pending Response ({stats.pendingResponse})
            </button>
            <button 
              onClick={() => setQuickStatusFilter('confirmed')} 
              className={`px-3 py-1 text-xs rounded-full transition ${quickStatusFilter === 'confirmed' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
            >
              ✅ Confirmed ({stats.confirmed})
            </button>
            <button 
              onClick={() => setQuickStatusFilter('declined')} 
              className={`px-3 py-1 text-xs rounded-full transition ${quickStatusFilter === 'declined' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
            >
              ❌ Declined ({stats.declined})
            </button>
          </div>
          
          {/* Advanced Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-5 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" /> Region
                  </label>
                  <select
                    value={filters.region}
                    onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Regions</option>
                    {availableRegions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Users className="w-3 h-3 inline mr-1" /> Gender
                  </label>
                  <select
                    value={filters.gender}
                    onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <BookOpen className="w-3 h-3 inline mr-1" /> Stream
                  </label>
                  <select
                    value={filters.stream}
                    onChange={(e) => setFilters({ ...filters, stream: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Streams</option>
                    <option value="Natural Science">🔬 Natural Science</option>
                    <option value="Social Science">📚 Social Science</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <GraduationCap className="w-3 h-3 inline mr-1" /> Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="submittedAt">Submission Date</option>
                    <option value="name">Student Name (A-Z)</option>
                    <option value="score">Exam Score</option>
                    <option value="age">Age</option>
                  </select>
                </div>
              </div>
              
              {/* Score Filter Section */}
              <div className="mb-5 p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  Filter by Exam Score
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Score Type</label>
                    <select
                      value={filters.scoreType}
                      onChange={(e) => setFilters({ ...filters, scoreType: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="all">All Scores</option>
                      <option value="greater">Greater Than or Equal</option>
                      <option value="less">Less Than or Equal</option>
                      <option value="range">Range Between</option>
                    </select>
                  </div>
                  
                  {filters.scoreType === 'greater' && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Minimum Score ≥</label>
                      <input
                        type="number"
                        value={filters.scoreValue}
                        onChange={(e) => setFilters({ ...filters, scoreValue: parseInt(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., 450"
                      />
                    </div>
                  )}
                  
                  {filters.scoreType === 'less' && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Maximum Score ≤</label>
                      <input
                        type="number"
                        value={filters.scoreValue}
                        onChange={(e) => setFilters({ ...filters, scoreValue: parseInt(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., 400"
                      />
                    </div>
                  )}
                  
                  {filters.scoreType === 'range' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Minimum Score</label>
                        <input
                          type="number"
                          value={filters.scoreMin}
                          onChange={(e) => setFilters({ ...filters, scoreMin: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Min"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Maximum Score</label>
                        <input
                          type="number"
                          value={filters.scoreMax}
                          onChange={(e) => setFilters({ ...filters, scoreMax: parseInt(e.target.value) || 700 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Max"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Age Filter Section */}
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Filter by Age
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Age Type</label>
                    <select
                      value={filters.ageType}
                      onChange={(e) => setFilters({ ...filters, ageType: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="all">All Ages</option>
                      <option value="greater">Greater Than or Equal</option>
                      <option value="less">Less Than or Equal</option>
                      <option value="range">Range Between</option>
                    </select>
                  </div>
                  
                  {filters.ageType === 'greater' && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Minimum Age ≥</label>
                      <input
                        type="number"
                        value={filters.ageValue}
                        onChange={(e) => setFilters({ ...filters, ageValue: parseInt(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., 20"
                      />
                    </div>
                  )}
                  
                  {filters.ageType === 'less' && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Maximum Age ≤</label>
                      <input
                        type="number"
                        value={filters.ageValue}
                        onChange={(e) => setFilters({ ...filters, ageValue: parseInt(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., 25"
                      />
                    </div>
                  )}
                  
                  {filters.ageType === 'range' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Minimum Age</label>
                        <input
                          type="number"
                          value={filters.ageMin}
                          onChange={(e) => setFilters({ ...filters, ageMin: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Min Age"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Maximum Age</label>
                        <input
                          type="number"
                          value={filters.ageMax}
                          onChange={(e) => setFilters({ ...filters, ageMax: parseInt(e.target.value) || 100 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Max Age"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Sort Order Toggle */}
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setFilters({ ...filters, sortOrder: 'asc' })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                    filters.sortOrder === 'asc' ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <SortAsc className="w-4 h-4" />
                  Ascending
                </button>
                <button
                  onClick={() => setFilters({ ...filters, sortOrder: 'desc' })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                    filters.sortOrder === 'desc' ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <SortDesc className="w-4 h-4" />
                  Descending
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Applicants Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stream</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredApplicants.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                    No applicants match your filters.
                  </td>
                </tr>
              ) : (
                filteredApplicants.map((applicant, index) => (
                  <tr key={`${applicant.id}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium font-mono">{applicant.student?.examID || applicant.examID || '—'}</td>
                    <td className="px-6 py-4 text-sm font-medium">{applicant.student?.fullName || applicant.fullName || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      {applicant.student?.stream === 'Natural Science' ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">🔬 Natural</span>
                      ) : applicant.student?.stream === 'Social Science' ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">📚 Social</span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm max-w-[200px] truncate">{applicant.programName || '—'}</td>
                    <td className="px-6 py-4 text-sm">{applicant.student?.region || '—'}</td>
                    <td className="px-6 py-4 text-sm">{applicant.student?.gender || '—'}</td>
                    <td className="px-6 py-4 text-sm">{applicant.student?.age || '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (applicant.student?.totalScore || applicant.score || 0) >= 500 ? 'bg-green-100 text-green-800' :
                        (applicant.student?.totalScore || applicant.score || 0) >= 400 ? 'bg-blue-100 text-blue-800' :
                        (applicant.student?.totalScore || applicant.score || 0) >= 300 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {applicant.student?.totalScore || applicant.score || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(applicant.status, applicant.finalStatus)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {applicant.submittedAt ? new Date(applicant.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewDetails(applicant)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer with pagination info */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <p>Showing {filteredApplicants.length} of {applicants.length} applicants</p>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded border hover:bg-white transition">Previous</button>
              <button className="px-3 py-1 rounded border hover:bg-white transition">Next</button>
            </div>
          </div>
        </div>
      </div>

      <ApplicantDetailsModal
        student={selectedStudent}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedStudent(null);
        }}
      />
    </DashboardLayout>
  );
}