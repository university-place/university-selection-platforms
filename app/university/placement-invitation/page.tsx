'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import {
  Users,
  Search,
  Percent,
  Award,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  Filter,
  Save,
  CheckSquare,
  Square,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

interface Candidate {
  invitationId: number;
  studentId: number;
  examID: string;
  name: string;
  gender: string;
  stream: string;
  region: string;
  examScore: number;
  programId: number;
  programName: string;
  invitationScore: number | null;
  result: string;
  status: string;
  selected?: boolean;
}

export default function BulkInvitationPlacementPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState<'all' | 'Natural Science' | 'Social Science'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'accepted' | 'rejected'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');
  const [scoreOperator, setScoreOperator] = useState<'all' | 'gt' | 'gte' | 'lt' | 'lte'>('all');
  const [scoreThreshold, setScoreThreshold] = useState<string>('');
  const [unlockedRowIds, setUnlockedRowIds] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<'examScore' | 'invitationScore' | 'name'>('examScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    const token = authHelpers.getToken();
    setLoading(true);
    try {
      const res = await fetch('/api/universities/placements/invitation', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCandidates(data.candidates.map((c: Candidate) => ({ ...c, selected: false })));
      } else {
        setError(data.error || 'Failed to load candidates');
      }
    } catch (err) {
      setError('An error occurred while loading candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (invitationId: number, value: string) => {
    const numeric = value === '' ? null : parseFloat(value);
    setCandidates(prev => prev.map(c =>
      c.invitationId === invitationId
        ? { ...c, invitationScore: numeric }
        : c
    ));
  };

  const handleSelectAll = () => {
    const visible = getFilteredCandidates();
    const allSelected = visible.every(c => c.selected);
    setCandidates(prev => prev.map(c => {
      const isVisible = visible.some(v => v.invitationId === c.invitationId);
      return isVisible ? { ...c, selected: !allSelected } : c;
    }));
  };

  const handleSelectCandidate = (invitationId: number) => {
    setCandidates(prev => prev.map(c =>
      c.invitationId === invitationId ? { ...c, selected: !c.selected } : c
    ));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStreamFilter('all');
    setStatusFilter('all');
    setGenderFilter('all');
    setScoreOperator('all');
    setScoreThreshold('');
  };

  const handleUnlockRow = (invitationId: number) => {
    setUnlockedRowIds(prev => [...prev, invitationId]);
  };

  const handleSaveRow = async (c: Candidate) => {
    setSaving(true);
    setMessage('');
    setError('');
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/universities/placements/invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidates: [{
            invitationId: c.invitationId,
            invitationScore: c.invitationScore,
            result: c.result || null,
            place: false
          }]
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Successfully saved score for ${c.name}!`);
        setUnlockedRowIds(prev => prev.filter(id => id !== c.invitationId));
        fetchCandidates();
      } else {
        setError(data.error || 'Failed to save score');
      }
    } catch (err) {
      setError('An error occurred while saving score');
    } finally {
      setSaving(false);
    }
  };

  const handleRowPlacement = async (invitationId: number, decision: 'PASS' | 'FAIL') => {
    const cand = candidates.find(c => c.invitationId === invitationId);
    if (!cand) return;

    const confirm = window.confirm(`Are you sure you want to set the decision for ${cand.name} to ${decision === 'PASS' ? 'Accepted & Placed' : 'Rejected'}?`);
    if (!confirm) return;

    setSaving(true);
    setMessage('');
    setError('');
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/universities/placements/invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidates: [{
            invitationId: cand.invitationId,
            invitationScore: cand.invitationScore,
            result: decision,
            place: decision === 'PASS' ? true : false
          }]
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Successfully updated decision for ${cand.name}!`);
        setUnlockedRowIds(prev => prev.filter(id => id !== invitationId));
        fetchCandidates();
      } else {
        setError(data.error || 'Failed to update decision');
      }
    } catch (err) {
      setError('An error occurred during operation');
    } finally {
      setSaving(false);
    }
  };

  const getFilteredCandidates = () => {
    return candidates
      .filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.examID.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStream = streamFilter === 'all' || c.stream === streamFilter;
        const matchesGender = genderFilter === 'all' || c.gender === genderFilter;

        let matchesStatus = true;
        if (statusFilter === 'pending') {
          matchesStatus = c.status !== 'COMPLETED';
        } else if (statusFilter === 'completed') {
          matchesStatus = c.status === 'COMPLETED';
        } else if (statusFilter === 'accepted') {
          matchesStatus = c.status === 'COMPLETED' && c.result === 'PASS';
        } else if (statusFilter === 'rejected') {
          matchesStatus = c.status === 'COMPLETED' && c.result === 'FAIL';
        }

        let matchesScore = true;
        if (scoreOperator !== 'all' && scoreThreshold !== '') {
          const threshold = parseFloat(scoreThreshold);
          if (!isNaN(threshold)) {
            const score = c.invitationScore;
            if (score === null || score === undefined) {
              matchesScore = false;
            } else {
              if (scoreOperator === 'gt') matchesScore = score > threshold;
              else if (scoreOperator === 'gte') matchesScore = score >= threshold;
              else if (scoreOperator === 'lt') matchesScore = score < threshold;
              else if (scoreOperator === 'lte') matchesScore = score <= threshold;
            }
          }
        }

        return matchesSearch && matchesStream && matchesGender && matchesStatus && matchesScore;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (valA === null || valA === undefined) valA = 0;
        if (valB === null || valB === undefined) valB = 0;

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  };

  const toggleSort = (field: 'examScore' | 'invitationScore' | 'name') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleBulkAction = async (actionType: 'saveScores' | 'acceptSelected' | 'rejectSelected') => {
    const selectedList = candidates.filter(c => c.selected);
    if (selectedList.length === 0) {
      alert('Please select at least one student first.');
      return;
    }

    if (actionType === 'acceptSelected') {
      const confirm = window.confirm(`Are you sure you want to bulk-place and ACCEPT ${selectedList.length} selected students at your university?`);
      if (!confirm) return;
    } else if (actionType === 'rejectSelected') {
      const confirm = window.confirm(`Are you sure you want to bulk-REJECT ${selectedList.length} selected students?`);
      if (!confirm) return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    const token = authHelpers.getToken();
    try {
      const payload = selectedList.map(c => ({
        invitationId: c.invitationId,
        invitationScore: c.invitationScore,
        result: actionType === 'acceptSelected' ? 'PASS' : actionType === 'rejectSelected' ? 'FAIL' : c.result,
        place: actionType === 'acceptSelected' ? true : false
      }));

      const res = await fetch('/api/universities/placements/invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ candidates: payload })
      });

      const data = await res.json();
      if (data.success) {
        if (actionType === 'acceptSelected') {
          setMessage(`Successfully placed ${selectedList.length} students!`);
        } else if (actionType === 'rejectSelected') {
          setMessage(`Successfully rejected ${selectedList.length} candidates.`);
        } else {
          setMessage('Scores saved successfully!');
        }
        fetchCandidates();
      } else {
        setError(data.error || 'Failed to perform action');
      }
    } catch (err) {
      setError('An error occurred during bulk operation');
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: candidates.length,
    placed: candidates.filter(c => c.status === 'COMPLETED' && c.result === 'PASS').length,
    pending: candidates.filter(c => c.status !== 'COMPLETED').length,
    avgScore: (() => {
      const scored = candidates.filter(c => c.invitationScore !== null);
      if (scored.length === 0) return 0;
      const sum = scored.reduce((acc, c) => acc + (c.invitationScore || 0), 0);
      return Math.round((sum / scored.length) * 10) / 10;
    })()
  };

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard' },
    { label: 'Analytics', href: '/university/analytics' },
    { label: 'Weighting Settings', href: '/university/weighting-settings' }
  ];

  return (
    <DashboardLayout title="Invitation Placement & Bulk Scoring" navLinks={navLinks}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Award className="w-7 h-7 text-yellow-300" />
              Interview Score & Invitation Placement
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Score candidates in bulk and instantly place successful interviewees to your programs.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/university/weighting-settings"
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold transition border border-white/10 flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Configure Weight Settings
            </a>
          </div>
        </div>

        {/* Stats Blocks */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Interviewees</p>
              <h3 className="text-xl font-black text-gray-900 mt-1">{stats.total}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Successfully Placed</p>
              <h3 className="text-xl font-black text-gray-900 mt-1">{stats.placed}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Pending Review</p>
              <h3 className="text-xl font-black text-gray-900 mt-1">{stats.pending}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Average Score</p>
              <h3 className="text-xl font-black text-gray-900 mt-1">{stats.avgScore}%</h3>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            {/* Search */}
            <div className="relative w-full xl:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search candidate name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setStreamFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${streamFilter === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  All Streams
                </button>
                <button
                  onClick={() => setStreamFilter('Natural Science')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${streamFilter === 'Natural Science' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Natural Science
                </button>
                <button
                  onClick={() => setStreamFilter('Social Science')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${streamFilter === 'Social Science' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Social Science
                </button>
              </div>

              <select
                value={genderFilter}
                onChange={(e: any) => setGenderFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white"
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white"
              >
                <option value="all">All Placement Statuses</option>
                <option value="pending">Pending Decision</option>
                <option value="completed">Completed (Any)</option>
                <option value="accepted">Accepted & Placed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Advanced Score Filters & Clear All */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filter Score %:</span>
              <select
                value={scoreOperator}
                onChange={(e: any) => setScoreOperator(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white"
              >
                <option value="all">All Scores</option>
                <option value="gt">Greater Than (&gt;)</option>
                <option value="gte">Greater or Equal (&gt;=)</option>
                <option value="lt">Less Than (&lt;)</option>
                <option value="lte">Less or Equal (&lt;=)</option>
              </select>

              {scoreOperator !== 'all' && (
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Threshold score %"
                  value={scoreThreshold}
                  onChange={(e) => setScoreThreshold(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-gray-200 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset / Clear All Filters
            </button>
          </div>
        </div>

        {/* Action Controls for Selection */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-sm text-gray-500 font-semibold">
            Showing {getFilteredCandidates().length} of {candidates.length} interviewees
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleBulkAction('saveScores')}
              disabled={saving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-xl text-sm font-semibold transition"
            >
              <Save className="w-4 h-4 text-gray-600" />
              Save Selected Scores
            </button>
            <button
              onClick={() => handleBulkAction('acceptSelected')}
              disabled={saving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-black transition shadow-sm animate-pulse"
            >
              <CheckCircle className="w-4 h-4" />
              Bulk Accept & Place
            </button>
            <button
              onClick={() => handleBulkAction('rejectSelected')}
              disabled={saving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black transition shadow-sm"
            >
              <AlertCircle className="w-4 h-4" />
              Bulk Reject Selected
            </button>
          </div>
        </div>

        {/* Alerts */}
        {message && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700 text-sm font-semibold">
            <CheckCircle className="w-5 h-5" />
            {message}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-semibold">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : getFilteredCandidates().length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">No interview candidates match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="p-4 w-12 text-center">
                      <button onClick={handleSelectAll} className="text-gray-500 hover:text-blue-600">
                        {getFilteredCandidates().every(c => c.selected) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th className="p-4">Candidate Info</th>
                    <th className="p-4">Academic Stream</th>
                    <th className="p-4">Target Program</th>
                    <th className="p-4 text-center cursor-pointer" onClick={() => toggleSort('examScore')}>
                      <div className="flex items-center justify-center gap-1 hover:text-gray-900">
                        Exam Score
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="p-4 text-center cursor-pointer" onClick={() => toggleSort('invitationScore')}>
                      <div className="flex items-center justify-center gap-1 hover:text-gray-900">
                        Interview Score (%)
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {getFilteredCandidates().map((c) => (
                    <tr
                      key={c.invitationId}
                      className={`hover:bg-blue-50/20 transition ${c.selected ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleSelectCandidate(c.invitationId)}
                          className="text-gray-500 hover:text-blue-600"
                        >
                          {c.selected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500 font-semibold">{c.examID} • {c.gender} • {c.region}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${c.stream === 'Natural Science' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                          {c.stream}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">{c.programName}</div>
                      </td>
                      <td className="p-4 text-center font-black text-gray-800">
                        {c.examScore}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={c.invitationScore === null || c.invitationScore === undefined ? '' : c.invitationScore}
                            onChange={(e) => handleScoreChange(c.invitationId, e.target.value)}
                            placeholder="Score %"
                            disabled={c.status === 'COMPLETED' && !unlockedRowIds.includes(c.invitationId)}
                            className="w-20 text-center border border-gray-300 rounded-lg px-2 py-1 font-bold text-sm bg-white focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.status === 'COMPLETED'
                          ? c.result === 'PASS'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          }`}>
                          {c.status === 'COMPLETED'
                            ? c.result === 'PASS' ? 'Accepted & Placed' : 'Rejected'
                            : 'Pending Decision'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {c.status === 'COMPLETED' && !unlockedRowIds.includes(c.invitationId) ? (
                            <button
                              onClick={() => handleUnlockRow(c.invitationId)}
                              className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-blue-200 shadow-sm"
                            >
                              Edit Decision
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleSaveRow(c)}
                                disabled={saving}
                                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-gray-300"
                              >
                                Save Score
                              </button>
                              <button
                                onClick={() => handleRowPlacement(c.invitationId, 'PASS')}
                                disabled={saving}
                                className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                              >
                                Pass & Place
                              </button>
                              <button
                                onClick={() => handleRowPlacement(c.invitationId, 'FAIL')}
                                disabled={saving}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
