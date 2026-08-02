'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, BookOpen, AlertCircle, BarChart3, Users, Bell, Award, Settings, X } from 'lucide-react';
import { authHelpers } from '@/lib/api';
import { DashboardLayout } from '@/components/DashboardLayout';

interface Program {
  id: number;
  name: string;
  code: string;
  description: string;
  intakeCapacity: number;
  isActive: boolean;
}

export default function UniversityProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    intakeCapacity: 0,
  });

  useEffect(() => {
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/university/login');
      return;
    }
    fetchPrograms();
  }, []);

  async function fetchPrograms() {
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/universities/programs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPrograms(data.programs);
      } else {
        setError(data.error || 'Failed to load programs');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function saveProgram() {
    if (!formData.name || !formData.code) {
      setError('Name and code are required');
      return;
    }

    const token = authHelpers.getToken();
    const method = editingProgram ? 'PUT' : 'POST';
    const url = editingProgram 
      ? `/api/universities/programs?id=${editingProgram.id}`
      : '/api/universities/programs';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setEditingProgram(null);
        setFormData({ name: '', code: '', description: '', intakeCapacity: 0 });
        fetchPrograms();
      } else {
        setError(data.error || 'Failed to save program');
      }
    } catch (err) {
      setError('Network error');
    }
  }

  async function deleteProgram(id: number) {
    if (!confirm('Are you sure you want to delete this program?')) return;
    const token = authHelpers.getToken();
    try {
      const res = await fetch(`/api/universities/programs?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchPrograms();
      } else {
        setError(data.error || 'Failed to delete program');
      }
    } catch (err) {
      setError('Network error');
    }
  }

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard', icon: BarChart3 },
    { label: 'Applicants', href: '/university/applicants', icon: Users },
    { label: 'Invitations', href: '/university/invitations', icon: Bell },
    { label: 'Placements', href: '/university/placements', icon: Award },
    { label: 'Programs', href: '/university/programs', icon: BookOpen },
    { label: 'Appeals', href: '/university/appeals', icon: AlertCircle },
    { label: 'Settings', href: '/university/settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Academic Programs" navLinks={navLinks} theme="green">
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Academic Programs</h1>
            <p className="text-muted-foreground mt-1">Manage programs, admission tracks, and intake capacities</p>
          </div>
          <button
            onClick={() => {
              setEditingProgram(null);
              setFormData({ name: '', code: '', description: '', intakeCapacity: 0 });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            <Plus className="w-5 h-5" /> Add Program
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {programs.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border-2 border-dashed border-border">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">No programs found</p>
            <p className="text-muted-foreground text-sm">Click "Add Program" to create your first program</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map(program => (
              <div key={program.id} className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-foreground">{program.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProgram(program);
                        setFormData({
                          name: program.name,
                          code: program.code,
                          description: program.description || '',
                          intakeCapacity: program.intakeCapacity,
                        });
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteProgram(program.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm mb-2">Code: {program.code}</p>
                <p className="text-muted-foreground text-sm mb-3">{program.description || 'No description'}</p>
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">Intake Capacity</span>
                  <span className="text-lg font-bold text-green-600">{program.intakeCapacity}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Program Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b-2">
              <h3 className="text-2xl font-bold text-foreground">
                {editingProgram ? 'Edit Program' : 'Add Program'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-muted-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-muted-foreground mb-1">Program Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border-2 border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Computer Science"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-muted-foreground mb-1">Program Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full border-2 border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., CS001"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-muted-foreground mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border-2 border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Program description..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-muted-foreground mb-1">Intake Capacity</label>
                <input
                  type="number"
                  value={formData.intakeCapacity}
                  onChange={e => setFormData({ ...formData, intakeCapacity: parseInt(e.target.value) || 0 })}
                  className="w-full border-2 border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 100"
                />
              </div>
            </div>
            <div className="border-t p-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={saveProgram} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                {editingProgram ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// // Add X icon if not imported
// const X = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;