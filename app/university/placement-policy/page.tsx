'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import { 
  Save, Plus, Trash2, Edit2, X, CheckCircle, AlertCircle,
  Target, Award, Users, MapPin, Calendar, BookOpen, Settings,
  TrendingUp, Shield, Clock, DollarSign, Heart, Zap
} from 'lucide-react';

interface PlacementRule {
  id: number;
  name: string;
  type: 'score' | 'region' | 'gender' | 'disability' | 'stream' | 'custom';
  condition: string;
  priority: number;
  isActive: boolean;
  action: 'auto_accept' | 'priority_consideration' | 'weighted_score';
  value?: number;
}

interface PlacementPolicy {
  id: number;
  name: string;
  description: string;
  academicYear: string;
  isActive: boolean;
  rules: PlacementRule[];
  createdAt: string;
  updatedAt: string;
}

export default function PlacementPolicyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState<PlacementPolicy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<PlacementPolicy | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New rule form
  const [newRule, setNewRule] = useState<Partial<PlacementRule>>({
    name: '',
    type: 'score',
    condition: '',
    priority: 0,
    isActive: true,
    action: 'auto_accept',
    value: 0,
  });

  useEffect(() => {
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/university/login');
      return;
    }
    fetchPolicies();
  }, [router]);

  const fetchPolicies = async () => {
    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/universities/placement-policy', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPolicies(data.policies);
        if (data.policies.length > 0) {
          setSelectedPolicy(data.policies[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching policies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!selectedPolicy) return;
    setSaving(true);
    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/universities/placement-policy', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(selectedPolicy),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Placement policy saved successfully' });
        setTimeout(() => setMessage(null), 3000);
        fetchPolicies();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = async () => {
    if (!selectedPolicy) return;
    setSaving(true);
    try {
      const token = authHelpers.getToken();
      const res = await fetch('/api/universities/placement-policy/rule', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          policyId: selectedPolicy.id,
          rule: newRule,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Rule added successfully' });
        setShowAddRule(false);
        setNewRule({
          name: '',
          type: 'score',
          condition: '',
          priority: 0,
          isActive: true,
          action: 'auto_accept',
          value: 0,
        });
        fetchPolicies();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add rule' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      const token = authHelpers.getToken();
      const res = await fetch(`/api/universities/placement-policy/rule?id=${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Rule deleted successfully' });
        fetchPolicies();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete rule' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'score': return <Award className="w-4 h-4" />;
      case 'region': return <MapPin className="w-4 h-4" />;
      case 'gender': return <Users className="w-4 h-4" />;
      case 'disability': return <Heart className="w-4 h-4" />;
      case 'stream': return <BookOpen className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard' },
    { label: 'Applications', href: '/university/applications' },
    { label: 'Applicants', href: '/university/applicants' },
    { label: 'Placements', href: '/university/placements' },
    { label: 'Placement Policy', href: '/university/placement-policy' },
    { label: 'Analytics', href: '/university/analytics' },
    { label: 'Programs', href: '/university/programs' },
    { label: 'Settings', href: '/university/settings' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Placement Policy" navLinks={navLinks} theme="green">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Placement Policy" navLinks={navLinks} theme="green">
      <div className="max-w-6xl mx-auto">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Policy Header */}
        <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Placement Policy Configuration</h2>
              <p className="text-muted-foreground mt-1">Define rules for automatic student placement</p>
            </div>
            <button
              onClick={handleSavePolicy}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Policy'}
            </button>
          </div>

          {/* Policy Form */}
          {selectedPolicy && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Policy Name</label>
                <input
                  type="text"
                  value={selectedPolicy.name}
                  onChange={(e) => setSelectedPolicy({ ...selectedPolicy, name: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Academic Year</label>
                <input
                  type="text"
                  value={selectedPolicy.academicYear}
                  onChange={(e) => setSelectedPolicy({ ...selectedPolicy, academicYear: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 2024/2025"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                <textarea
                  value={selectedPolicy.description}
                  onChange={(e) => setSelectedPolicy({ ...selectedPolicy, description: e.target.value })}
                  rows={3}
                  className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPolicy.isActive}
                    onChange={(e) => setSelectedPolicy({ ...selectedPolicy, isActive: e.target.checked })}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-muted-foreground">Active Policy</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Placement Rules Section */}
        <div className="bg-card rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Placement Rules</h3>
              <p className="text-sm text-muted-foreground">Rules are evaluated in priority order</p>
            </div>
            <button
              onClick={() => setShowAddRule(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Rule
            </button>
          </div>

          {/* Rules List */}
          {selectedPolicy?.rules.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">No placement rules defined</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Add Rule" to create your first placement rule</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedPolicy?.rules.sort((a, b) => a.priority - b.priority).map((rule, index) => (
                <div key={rule.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-border">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getRuleTypeIcon(rule.type)}
                        <span className="font-semibold text-foreground">{rule.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-muted-foreground'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Condition: {rule.condition}</p>
                      <p className="text-sm text-muted-foreground">Action: {rule.action.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Rule Modal */}
      {showAddRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold text-foreground">Add Placement Rule</h3>
              <button onClick={() => setShowAddRule(false)} className="text-muted-foreground hover:text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Rule Name</label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., High Achiever Auto Accept"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Rule Type</label>
                <select
                  value={newRule.type}
                  onChange={(e) => setNewRule({ ...newRule, type: e.target.value as any })}
                  className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="score">Score Based</option>
                  <option value="region">Region Based</option>
                  <option value="gender">Gender Based</option>
                  <option value="disability">Disability Based</option>
                  <option value="stream">Stream Based</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Condition</label>
                <input
                  type="text"
                  value={newRule.condition}
                  onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., score >= 500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Priority (Lower = Higher Priority)</label>
                <input
                  type="number"
                  value={newRule.priority}
                  onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
                  className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Action</label>
                <select
                  value={newRule.action}
                  onChange={(e) => setNewRule({ ...newRule, action: e.target.value as any })}
                  className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="auto_accept">Auto Accept</option>
                  <option value="priority_consideration">Priority Consideration</option>
                  <option value="weighted_score">Weighted Score</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRule.isActive}
                    onChange={(e) => setNewRule({ ...newRule, isActive: e.target.checked })}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-muted-foreground">Active Rule</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowAddRule(false)}
                className="px-4 py-2 border border-border rounded-lg text-muted-foreground hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRule}
                disabled={!newRule.name || !newRule.condition}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
              >
                Add Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}