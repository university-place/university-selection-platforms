'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { moeAPI, moeAuthHelpers } from '@/lib/api';
import { University } from '@/lib/types';
import { 
  Users, GraduationCap, Building2, FileText, TrendingUp,
  Calendar, CheckCircle, Clock, AlertCircle,
  Upload, BookOpen, UserPlus, BarChart3, Activity,
  Award, Target, Download, Eye, X, LayoutDashboard
} from 'lucide-react';

interface UniversityFormData {
  name: string;
  code: string;
  type: string;
  region: string;
  domain: string;
}

export default function MOEUniversitiesPage() {
  const router = useRouter();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [formData, setFormData] = useState<UniversityFormData>({
    name: '',
    code: '',
    type: '',
    region: '',
    domain: '',
  });

  useEffect(() => {
    if (!moeAuthHelpers.isAuthenticated()) {
      router.push('/moe/login');
      return;
    }

    fetchUniversities();
  }, [router]);

  const fetchUniversities = async () => {
    setLoading(true);
    try {
      const response = await moeAPI.getUniversities();
      if (response.success && Array.isArray(response.data)) {
        setUniversities(
          (response.data as any[]).map((u) => ({
            ...u,
            status: u.status || (u.isRegistered ? 'active' : 'inactive'),
          })) as University[]
        );
      } else if (response.success && response.data && 'universities' in response.data) {
        setUniversities(
          ((response.data as any).universities || []).map((u: any) => ({
            ...u,
            status: u.status || (u.isRegistered ? 'active' : 'inactive'),
          }))
        );
      } else {
        setError(response.error || 'Failed to load universities');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (university?: University) => {
    if (university) {
      setIsEditing(true);
      setSelectedUniversity(university);
      setFormData({
        name: university.name,
        code: university.code,
        type: university.type,
        region: university.region,
        domain: university.domain || '',
      });
    } else {
      setIsEditing(false);
      setSelectedUniversity(null);
      setFormData({ name: '', code: '', type: '', region: '', domain: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isEditing && selectedUniversity) {
        const response = await moeAPI.updateUniversity(selectedUniversity.id, formData);
        if (response.success) {
          setSuccess('University updated successfully');
          fetchUniversities();
          handleCloseModal();
        } else {
          setError(response.error || 'Failed to update university');
        }
      } else {
        const response = await moeAPI.addUniversity(formData);
        if (response.success) {
          setSuccess('University added successfully');
          fetchUniversities();
          handleCloseModal();
        } else {
          setError(response.error || 'Failed to add university');
        }
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const handleDelete = async (universityId: string) => {
    if (!confirm('Are you sure you want to delete this university?')) return;

    try {
      const response = await moeAPI.deleteUniversity(universityId);
      if (response.success) {
        setSuccess('University deleted successfully');
        fetchUniversities();
      } else {
        setError(response.error || 'Failed to delete university');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const handleToggleStatus = async (universityId: string, currentStatus: string) => {
    const isCurrentlyActive = currentStatus === 'active';
    try {
      const response = await moeAPI.toggleUniversity(universityId, isCurrentlyActive);
      if (response.success) {
        setSuccess(`University ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully`);
        fetchUniversities();
      } else {
        setError(response.error || 'Failed to update university status');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const navLinks = [
    { label: 'Dashboard', href: '/moe/dashboard', icon: LayoutDashboard },
    { label: 'Students', href: '/moe/students', icon: Users },
    { label: 'Upload', href: '/moe/upload', icon: Upload },
    { label: 'Universities', href: '/moe/universities', icon: Building2 },
  ];

  const columns = [
    { key: 'name' as const, label: 'Name' },
    { key: 'code' as const, label: 'Code' },
    { key: 'type' as const, label: 'Type' },
    { key: 'region' as const, label: 'Region' },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string | null | undefined) => {
        const safeValue = value || 'inactive';
        return (
        <span
          className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
            safeValue === 'active'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-gray-100 text-gray-700 border border-gray-200'
          }`}
        >
          {safeValue}
        </span>
      )},
    },
  ];

  return (
    <DashboardLayout
      title="MOE Administration"
      navLinks={navLinks}
      theme="purple"
    >
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">Universities</h1>
            <p className="text-xl font-medium text-gray-500">Manage national university records and availability</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-8 py-4 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-105 transition-transform active:scale-95"
          >
            Add University
          </button>
        </div>

        {error && (
          <div className="p-6 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4">
             <div className="bg-red-500 p-2 rounded-xl"><X className="w-5 h-5 text-white" /></div>
             <p className="text-lg font-bold text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-6 bg-green-50 border border-green-100 rounded-3xl flex items-center gap-4">
             <div className="bg-green-500 p-2 rounded-xl"><CheckCircle className="w-5 h-5 text-white" /></div>
             <p className="text-lg font-bold text-green-700">{success}</p>
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-50 overflow-hidden">
          <DataTable
            columns={columns}
            data={universities}
            loading={loading}
            onRowClick={(row) => router.push(`/moe/universities/${(row as University).id}`)}
          />
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 max-w-xl w-full border border-gray-100 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                  {isEditing ? 'Edit University' : 'Add New Institution'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Name</label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="University Name"
                      className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all text-lg font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Code</label>
                    <Input
                      name="code"
                      value={formData.code}
                      onChange={handleFormChange}
                      placeholder="Code (e.g. AAU)"
                      className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all text-lg font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Type</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleFormChange}
                      className="w-full h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all text-lg font-bold px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="Public">Public</option>
                      <option value="Autonomous">Autonomous</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Region</label>
                    <Input
                      name="region"
                      value={formData.region}
                      onChange={handleFormChange}
                      placeholder="Region"
                      className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all text-lg font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Domain</label>
                  <Input
                    name="domain"
                    value={formData.domain}
                    onChange={handleFormChange}
                    placeholder="university.edu.et"
                    className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all text-lg font-bold"
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="submit"
                    className="flex-1 h-16 bg-gray-900 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-gray-900/20 hover:scale-[1.02] transition-transform active:scale-[0.98]"
                  >
                    {isEditing ? 'Save Changes' : 'Create Institution'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-8 h-16 bg-gray-50 text-gray-400 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
