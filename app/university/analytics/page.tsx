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

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/universities/analytics', {
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
                <tr key={index} className="hover:bg-gray-50">
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
    </DashboardLayout>
  );
}