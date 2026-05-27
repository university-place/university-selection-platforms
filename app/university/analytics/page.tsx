'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import {
  BarChart3, PieChart, TrendingUp, Award, Users, MapPin,
  Heart, GraduationCap, Percent, Medal, Crown
} from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  const [selectedStream, setSelectedStream] = useState<'all' | 'natural' | 'social'>('all');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedStream]);

  const fetchAnalytics = async () => {
    const token = authHelpers.getToken();
    setLoading(true);
    try {
      const res = await fetch(`/api/universities/analytics?stream=${selectedStream}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (err) {
      console.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard' },
    { label: 'Analytics', href: '/university/analytics' },
    { label: 'Document Evaluation', href: '/university/documents-evaluation' },
    { label: 'Weighting Settings', href: '/university/weighting-settings' }
  ];

  if (loading) {
    return (
      <DashboardLayout title="Analytics" navLinks={navLinks} theme="green">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Analytics" navLinks={navLinks} theme="green">
        <div className="text-center py-12 text-gray-500">No applicant data available</div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout title="Applicant Analytics" navLinks={navLinks} theme="green">
      {/* Stream Selector */}
      <div className="mb-6 flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setSelectedStream('all')}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${selectedStream === 'all' ? 'bg-white shadow-sm text-green-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          All Streams
        </button>
        <button
          onClick={() => setSelectedStream('natural')}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${selectedStream === 'natural' ? 'bg-white shadow-sm text-green-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Natural Science
        </button>
        <button
          onClick={() => setSelectedStream('social')}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${selectedStream === 'social' ? 'bg-white shadow-sm text-green-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Social Science
        </button>
      </div>

      {/* Weight Distribution Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-6 text-white">
        <h2 className="text-lg font-bold mb-3">Weight Distribution Formula</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <GraduationCap className="w-6 h-6 mx-auto mb-1" />
            <p className="text-2xl font-bold">{data.settings.examScoreWeight}%</p>
            <p className="text-xs opacity-80">Exam Score</p>
          </div>
          <div className="text-center">
            <MapPin className="w-6 h-6 mx-auto mb-1" />
            <p className="text-2xl font-bold">{data.settings.regionWeight}%</p>
            <p className="text-xs opacity-80">Region</p>
          </div>
          <div className="text-center">
            <Users className="w-6 h-6 mx-auto mb-1" />
            <p className="text-2xl font-bold">{data.settings.genderWeight}%</p>
            <p className="text-xs opacity-80">Gender</p>
          </div>
          <div className="text-center">
            <Heart className="w-6 h-6 mx-auto mb-1" />
            <p className="text-2xl font-bold">{data.settings.disabilityWeight}%</p>
            <p className="text-xs opacity-80">Disability Bonus</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Applicants</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary.totalApplicants}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Average Weighted Score</p>
              <p className="text-2xl font-bold text-green-600">{data.summary.avgWeightedScore}</p>
            </div>
            <Award className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Top 10% Avg Score</p>
              <p className="text-2xl font-bold text-purple-600">{data.summary.top10AvgScore}</p>
            </div>
            <Crown className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gender Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Gender Distribution
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Male ({data.distribution.gender.male})</span>
                <span>{data.distribution.gender.malePercentage.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${data.distribution.gender.malePercentage}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Female ({data.distribution.gender.female})</span>
                <span>{data.distribution.gender.femalePercentage.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 rounded-full" style={{ width: `${data.distribution.gender.femalePercentage}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Disability Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-600" />
            Disability Status
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>With Disability ({data.distribution.disability.hasDisability})</span>
                <span>{data.distribution.disability.disabilityPercentage.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${data.distribution.disability.disabilityPercentage}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>No Disability ({data.distribution.disability.noDisability})</span>
                <span>{(100 - data.distribution.disability.disabilityPercentage).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${100 - data.distribution.disability.disabilityPercentage}%` }}></div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            * Students with disability receive +{data.settings.disabilityWeight}% bonus
          </p>
        </div>
      </div>

      {/* Top Ranked Applicants */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Medal className="w-5 h-5 text-yellow-500" />
            Top Ranked Applicants (Weighted Score)
          </h3>
          <p className="text-xs text-gray-500 mt-1">Click on any candidate to inspect their detailed weighted score breakdown.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Exam ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Raw Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Weighted Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.ranking.slice(0, 10).map((applicant: any, index: number) => (
                <tr 
                  key={index} 
                  onClick={() => setSelectedApplicant(applicant)}
                  className="hover:bg-green-50/50 cursor-pointer transition-colors duration-150"
                >
                  <td className="px-6 py-4">
                    {index === 0 && <Crown className="w-5 h-5 text-yellow-500" />}
                    {index === 1 && <Medal className="w-5 h-5 text-gray-400" />}
                    {index === 2 && <Medal className="w-5 h-5 text-amber-600" />}
                    {index > 2 && <span className="text-gray-500">{index + 1}</span>}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">{applicant.examID}</td>
                  <td className="px-6 py-4 font-medium">{applicant.name}</td>
                  <td className="px-6 py-4">{applicant.examScore} / {data.summary?.maxExamScore || 700}</td>
                  <td className="px-6 py-4 font-bold text-green-600">{applicant.weightedScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Breakdown Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 transform scale-100 transition-all">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white relative">
              <button 
                onClick={() => setSelectedApplicant(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">Applicant Score Breakdown</span>
              <h4 className="text-2xl font-black mt-2">{selectedApplicant.name}</h4>
              <p className="text-sm opacity-90 font-mono mt-1">Exam ID: {selectedApplicant.examID}</p>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Raw Score</p>
                  <p className="text-lg font-black text-gray-800">{selectedApplicant.examScore} <span className="text-xs text-gray-400 font-normal">/ {data.summary?.maxExamScore || 700}</span></p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Final Weighted Score</p>
                  <p className="text-lg font-black text-green-600">{Number(selectedApplicant.weightedScore || 0).toFixed(2)}%</p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Weighted Contributions</h5>

                {/* Exam Score */}
                {data.settings.examScoreWeight > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">Exam Performance ({data.settings.examScoreWeight}%)</span>
                      <span className="font-bold text-gray-900">{Number(selectedApplicant.breakdown?.examScoreContribution || 0).toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(Number(selectedApplicant.breakdown?.examScoreContribution || 0) / data.settings.examScoreWeight) * 100}%` }}></div>
                    </div>
                  </div>
                )}

                {/* Region */}
                {data.settings.regionWeight > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">Regional Preference ({selectedApplicant.region} - {data.settings.regionWeight}%)</span>
                      <span className="font-bold text-gray-900">{Number(selectedApplicant.breakdown?.regionContribution || 0).toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${(Number(selectedApplicant.breakdown?.regionContribution || 0) / data.settings.regionWeight) * 100}%` }}></div>
                    </div>
                  </div>
                )}

                {/* Gender */}
                {data.settings.genderWeight > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">Gender Balance ({selectedApplicant.gender} - {data.settings.genderWeight}%)</span>
                      <span className="font-bold text-gray-900">{Number(selectedApplicant.breakdown?.genderContribution || 0).toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(Number(selectedApplicant.breakdown?.genderContribution || 0) / data.settings.genderWeight) * 100}%` }}></div>
                    </div>
                  </div>
                )}

                {/* Disability */}
                {data.settings.disabilityWeight > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">Disability Bonus ({selectedApplicant.disability || 'None'} - {data.settings.disabilityWeight}%)</span>
                      <span className="font-bold text-gray-900">{Number(selectedApplicant.breakdown?.disabilityContribution || 0).toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${(Number(selectedApplicant.breakdown?.disabilityContribution || 0) / data.settings.disabilityWeight) * 100}%` }}></div>
                    </div>
                  </div>
                )}

                {/* Interview / Entrance Exam */}
                {(data.settings.invitationScoreWeight || 0) > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">Interview / Entrance Exam ({data.settings.invitationScoreWeight}%)</span>
                      <span className="font-bold text-gray-900">{Number(selectedApplicant.breakdown?.invitationScoreContribution || 0).toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(Number(selectedApplicant.breakdown?.invitationScoreContribution || 0) / data.settings.invitationScoreWeight) * 100}%` }}></div>
                    </div>
                  </div>
                )}

                {/* Document Evaluation */}
                {(data.settings.documentScoreWeight || 0) > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">Document Evaluation ({data.settings.documentScoreWeight}%)</span>
                      <span className="font-bold text-gray-900">{Number(selectedApplicant.breakdown?.documentContribution || 0).toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(Number(selectedApplicant.breakdown?.documentContribution || 0) / data.settings.documentScoreWeight) * 100}%` }}></div>
                    </div>
                  </div>
                )}

                {/* Custom Criteria */}
                {Number(selectedApplicant.breakdown?.customContribution || 0) > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">Custom Criteria Contributions</span>
                      <span className="font-bold text-gray-900">{Number(selectedApplicant.breakdown?.customContribution || 0).toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${100}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedApplicant(null)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-semibold transition shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}