'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import { Save, AlertCircle, CheckCircle, Percent, MapPin, Users, Heart, GraduationCap } from 'lucide-react';

interface WeightingSettings {
  examScoreWeight: number;
  regionWeight: number;
  genderWeight: number;
  disabilityWeight: number;
  regionPreferences: { region: string; weight: number }[];
  genderPreferences: { male: number; female: number };
  disabilityPreferences: { visual: number; hearing: number; physical: number; learning: number; none: number };
  disabilityBonus: number;
  customCriteria: { 
    name: string; 
    weight: number; 
    key?: string; 
    source?: 'system' | 'manual';
    operator?: 'equals' | 'greater' | 'less' | 'contains';
    value?: string | number | boolean;
  }[];
}

export default function WeightingSettingsPage() {
  const [settings, setSettings] = useState<WeightingSettings>({
    examScoreWeight: 70,
    regionWeight: 15,
    genderWeight: 10,
    disabilityWeight: 5,
    regionPreferences: [],
    genderPreferences: { male: 50, female: 50 },
    disabilityPreferences: { visual: 100, hearing: 100, physical: 100, learning: 100, none: 0 },
    disabilityBonus: 5,
    customCriteria: []
  });
  const [selectedStream, setSelectedStream] = useState<'all' | 'natural' | 'social'>('all');
  const [customAttrDefs, setCustomAttrDefs] = useState<any[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchRegions();
    fetchCustomAttrDefs();
  }, [selectedStream]);

  const fetchCustomAttrDefs = async () => {
    try {
      const res = await fetch('/api/common/settings?key=student_custom_attributes');
      const data = await res.json();
      if (data.success) setCustomAttrDefs(data.value || []);
    } catch (err) {
      console.error('Failed to fetch attribute definitions');
    }
  };

  const fetchSettings = async () => {
    const token = authHelpers.getToken();
    setLoading(true);
    try {
      const res = await fetch(`/api/universities/weighting-settings?stream=${selectedStream}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      } else {
        // Reset to default if no settings found for this stream
        setSettings({
          examScoreWeight: 70,
          regionWeight: 15,
          genderWeight: 10,
          disabilityWeight: 5,
          regionPreferences: [],
          genderPreferences: { male: 50, female: 50 },
          disabilityPreferences: { visual: 100, hearing: 100, physical: 100, learning: 100, none: 0 },
          disabilityBonus: 5,
          customCriteria: []
        });
      }
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/universities/applicants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.applicants) {
        const regions = [...new Set(data.applicants.map((a: any) => a.student?.region).filter(Boolean))];
        setAvailableRegions(regions);
      }
    } catch (err) {
      console.error('Failed to load regions');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    
    const token = authHelpers.getToken();
    try {
      const res = await fetch(`/api/universities/weighting-settings?stream=${selectedStream}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      
      const data = await res.json();
      if (data.success) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const customCriteriaTotal = settings.customCriteria?.reduce((sum, c) => sum + (c.weight || 0), 0) || 0;
  const totalWeight = settings.examScoreWeight + settings.regionWeight + settings.genderWeight + settings.disabilityWeight + customCriteriaTotal;

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard' },
    { label: 'Analytics', href: '/university/analytics' },
    { label: 'Weighting Settings', href: '/university/weighting-settings' }
  ];

  if (loading) {
    return (
      <DashboardLayout title="Weighting Settings" navLinks={navLinks} theme="green">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Applicant Weighting Settings" navLinks={navLinks} theme="green">
      <div className="max-w-3xl mx-auto pb-12">
        {/* Stream Selector */}
        <div className="mb-8 flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <label className="font-bold text-gray-700">Configure for Stream:</label>
          <div className="flex gap-2">
            {(['all', 'natural', 'social'] as const).map((stream) => (
              <button
                key={stream}
                onClick={() => setSelectedStream(stream)}
                className={`px-4 py-2 rounded-lg font-semibold transition capitalize ${
                  selectedStream === stream
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {stream}
              </button>
            ))}
          </div>
        </div>
        {/* Total Weight Indicator */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Total Weight Distribution</span>
            </div>
            <span className={`text-xl font-bold ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
              {totalWeight}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalWeight}%` }}></div>
          </div>
          {totalWeight !== 100 && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Total must equal 100%. Current: {totalWeight}%
            </p>
          )}
        </div>

        {/* Weight Sliders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Weight Distribution</h2>
          
          {/* Exam Score Weight */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="flex items-center gap-2 text-gray-700 font-medium">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                Exam Score Weight
              </label>
              <span className="text-blue-600 font-bold">{settings.examScoreWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.examScoreWeight}
              onChange={(e) => setSettings({ ...settings, examScoreWeight: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-xs text-gray-500 mt-1">Higher weight gives more importance to academic performance</p>
          </div>

          {/* Region Weight */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="flex items-center gap-2 text-gray-700 font-medium">
                <MapPin className="w-4 h-4 text-green-600" />
                Region Weight
              </label>
              <span className="text-green-600 font-bold">{settings.regionWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.regionWeight}
              onChange={(e) => setSettings({ ...settings, regionWeight: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
          </div>

          {/* Gender Weight */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="flex items-center gap-2 text-gray-700 font-medium">
                <Users className="w-4 h-4 text-purple-600" />
                Gender Balance Weight
              </label>
              <span className="text-purple-600 font-bold">{settings.genderWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.genderWeight}
              onChange={(e) => setSettings({ ...settings, genderWeight: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            
            {/* Gender Balance Preferences */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Male Preference (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.genderPreferences.male}
                  onChange={(e) => setSettings({
                    ...settings,
                    genderPreferences: { ...settings.genderPreferences, male: parseInt(e.target.value) }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Female Preference (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.genderPreferences.female}
                  onChange={(e) => setSettings({
                    ...settings,
                    genderPreferences: { ...settings.genderPreferences, female: parseInt(e.target.value) }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Gender preference percentage within the gender weight
            </p>
          </div>

          {/* Disability Weight */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="flex items-center gap-2 text-gray-700 font-medium">
                <Heart className="w-4 h-4 text-red-600" />
                Disability Bonus Weight
              </label>
              <span className="text-red-600 font-bold">{settings.disabilityWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={settings.disabilityWeight}
              onChange={(e) => setSettings({ ...settings, disabilityWeight: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            
            {/* Disability Preferences */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Visual (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.disabilityPreferences?.visual || 0}
                  onChange={(e) => setSettings({
                    ...settings,
                    disabilityPreferences: { ...settings.disabilityPreferences, visual: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Hearing (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.disabilityPreferences?.hearing || 0}
                  onChange={(e) => setSettings({
                    ...settings,
                    disabilityPreferences: { ...settings.disabilityPreferences, hearing: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Physical (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.disabilityPreferences?.physical || 0}
                  onChange={(e) => setSettings({
                    ...settings,
                    disabilityPreferences: { ...settings.disabilityPreferences, physical: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Learning (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.disabilityPreferences?.learning || 0}
                  onChange={(e) => setSettings({
                    ...settings,
                    disabilityPreferences: { ...settings.disabilityPreferences, learning: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Percentage of the maximum disability bonus allocated to each type.
            </p>
          </div>
        </div>

        {/* Custom Criteria */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Custom Criteria</h2>
            <button
              onClick={() => {
                setSettings({
                  ...settings,
                  customCriteria: [...(settings.customCriteria || []), { name: 'New Criterion', weight: 0 }]
                });
              }}
              className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
            >
              + Add Criterion
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Add additional custom weighting criteria specific to your university's evaluation process.
          </p>

          {(!settings.customCriteria || settings.customCriteria.length === 0) ? (
            <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              No custom criteria added yet.
            </p>
          ) : (
            settings.customCriteria.map((criterion, index) => (
              <div key={index} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">Source</label>
                    <select
                      value={criterion.source || 'manual'}
                      onChange={(e) => {
                        const newCriteria = [...settings.customCriteria];
                        newCriteria[index].source = e.target.value as any;
                        if (e.target.value === 'system') {
                          newCriteria[index].name = customAttrDefs[0]?.label || 'New Criterion';
                          newCriteria[index].key = customAttrDefs[0]?.name || '';
                          newCriteria[index].operator = 'equals';
                          newCriteria[index].value = '';
                        }
                        setSettings({ ...settings, customCriteria: newCriteria });
                      }}
                      className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="manual">Manual Input</option>
                      <option value="system">System Attribute (MOE)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">Field / Attribute</label>
                    {criterion.source === 'system' ? (
                      <select
                        value={criterion.key || ''}
                        onChange={(e) => {
                          const def = customAttrDefs.find(d => d.name === e.target.value);
                          const newCriteria = [...settings.customCriteria];
                          newCriteria[index].key = e.target.value;
                          newCriteria[index].name = def?.label || e.target.value;
                          setSettings({ ...settings, customCriteria: newCriteria });
                        }}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="">Select Attribute</option>
                        {customAttrDefs.map(def => (
                          <option key={def.name} value={def.name}>{def.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={criterion.name}
                        onChange={(e) => {
                          const newCriteria = [...settings.customCriteria];
                          newCriteria[index].name = e.target.value;
                          setSettings({ ...settings, customCriteria: newCriteria });
                        }}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="e.g. Extra Curricular"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">Condition</label>
                    <select
                      value={criterion.operator || 'equals'}
                      onChange={(e) => {
                        const newCriteria = [...settings.customCriteria];
                        newCriteria[index].operator = e.target.value as any;
                        setSettings({ ...settings, customCriteria: newCriteria });
                      }}
                      className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="equals">Equals</option>
                      <option value="greater">Greater Than</option>
                      <option value="less">Less Than</option>
                      <option value="contains">Contains</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">Value</label>
                    <input
                      type="text"
                      value={String(criterion.value || '')}
                      onChange={(e) => {
                        const newCriteria = [...settings.customCriteria];
                        newCriteria[index].value = e.target.value;
                        setSettings({ ...settings, customCriteria: newCriteria });
                      }}
                      className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="Match value"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mb-3">
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-gray-500 uppercase">Weight</span>
                   </div>
                  <div className="flex items-center gap-4">
                    <span className="text-blue-600 font-bold">{criterion.weight}%</span>
                    <button
                      onClick={() => {
                        const newCriteria = settings.customCriteria.filter((_, i) => i !== index);
                        setSettings({ ...settings, customCriteria: newCriteria });
                      }}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={criterion.weight}
                  onChange={(e) => {
                    const newCriteria = [...settings.customCriteria];
                    newCriteria[index].weight = parseInt(e.target.value) || 0;
                    setSettings({ ...settings, customCriteria: newCriteria });
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            ))
          )}
        </div>

        {/* Region Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Region Preferences</h2>
          <p className="text-sm text-gray-600 mb-4">
            Assign preference weights to different regions within the region weight
          </p>
          
          {availableRegions.map((region, index) => {
            const existingPref = settings.regionPreferences.find(r => r.region === region);
            const weight = existingPref?.weight || 0;
            
            return (
              <div key={index} className="mb-4">
                <div className="flex justify-between mb-1">
                  <label className="text-sm text-gray-700">{region}</label>
                  <span className="text-sm font-medium text-green-600">{weight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weight}
                  onChange={(e) => {
                    const newWeight = parseInt(e.target.value);
                    const newPreferences = [...settings.regionPreferences];
                    const existingIndex = newPreferences.findIndex(r => r.region === region);
                    
                    if (existingIndex >= 0) {
                      newPreferences[existingIndex].weight = newWeight;
                    } else {
                      newPreferences.push({ region, weight: newWeight });
                    }
                    
                    setSettings({ ...settings, regionPreferences: newPreferences });
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
              </div>
            );
          })}
          
          {availableRegions.length === 0 && (
            <p className="text-gray-500 text-center py-4">No applicants yet. Regions will appear here when students apply.</p>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={saving || totalWeight !== 100}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-4 h-4" />
            {message}
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}