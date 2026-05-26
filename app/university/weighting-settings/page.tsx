'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { authHelpers } from '@/lib/api';
import { Save, AlertCircle, CheckCircle, Percent, MapPin, Users, Heart, GraduationCap, FileText } from 'lucide-react';

interface WeightingSettings {
  examScoreWeight: number;
  regionWeight: number;
  genderWeight: number;
  disabilityWeight: number;
  invitationScoreWeight?: number;
  documentScoreWeight?: number;
  regionPreferences: { region: string; weight: number }[];
  genderPreferences: { male: number; female: number };
  disabilityPreferences: { visual: number; hearing: number; physical: number; learning: number; none: number };
  disabilityBonus: number;
  customCriteria: { 
    name: string; 
    weight: number; 
    key?: string; 
    source?: 'system' | 'manual';
    operator?: 'equals' | 'greater' | 'less' | 'contains' | 'value_map';
    value?: string | number | boolean;
    mappings?: { value: string; percent: number }[];
  }[];
}

export default function WeightingSettingsPage() {
  const [settings, setSettings] = useState<WeightingSettings>({
    examScoreWeight: 70,
    regionWeight: 15,
    genderWeight: 10,
    disabilityWeight: 5,
    invitationScoreWeight: 0,
    documentScoreWeight: 0,
    regionPreferences: [],
    genderPreferences: { male: 50, female: 50 },
    disabilityPreferences: { visual: 100, hearing: 100, physical: 100, learning: 100, none: 0 },
    disabilityBonus: 5,
    customCriteria: []
  });
  const [selectedStream, setSelectedStream] = useState<'all' | 'natural' | 'social'>('all');
  const [customAttrDefs, setCustomAttrDefs] = useState<any[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [streamSubjects, setStreamSubjects] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [attributeOptions, setAttributeOptions] = useState<Record<string, string[]>>({});

  // Dynamic Abebe Kebede calculation
  const numSubjects = selectedStream === 'all' 
    ? Math.max(streamSubjects?.natural?.length || 6, streamSubjects?.social?.length || 6)
    : (streamSubjects?.[selectedStream]?.length || 6);
  const abebeMaxExam = numSubjects * 100;
  const abebeExam = Math.round(abebeMaxExam * 0.91); // approx 91%
  const abebeRegion = 'Addis Ababa';
  const abebeGender = 'Male';
  const abebeDisability = 'hearing';
  const abebeInterview = 90;
  const abebeDocument = 85;

  const abebeExamPct = (abebeExam / abebeMaxExam) * 100;
  const abebeExamContribution = (abebeExamPct / 100) * (settings.examScoreWeight || 0);

  const regionPref = settings.regionPreferences?.find(r => r.region === abebeRegion);
  const regionPct = regionPref ? regionPref.weight : 0;
  const abebeRegionContribution = (regionPct / 100) * (settings.regionWeight || 0);

  const genderPct = abebeGender === 'Male' ? (settings.genderPreferences?.male || 50) : (settings.genderPreferences?.female || 50);
  const abebeGenderContribution = (genderPct / 100) * (settings.genderWeight || 0);

  const disabilityPct = settings.disabilityPreferences ? (settings.disabilityPreferences[abebeDisability as keyof typeof settings.disabilityPreferences] ?? 100) : 100;
  const abebeDisabilityContribution = (disabilityPct / 100) * (settings.disabilityWeight || 0);

  const abebeInvitationContribution = (settings.invitationScoreWeight || 0) > 0 ? (abebeInterview / 100) * (settings.invitationScoreWeight || 0) : 0;
  const abebeDocumentContribution = (settings.documentScoreWeight || 0) > 0 ? (abebeDocument / 100) * (settings.documentScoreWeight || 0) : 0;

  const abebeTotalScore = abebeExamContribution + abebeRegionContribution + abebeGenderContribution + abebeDisabilityContribution + abebeInvitationContribution + abebeDocumentContribution;

  useEffect(() => {
    fetchSettings();
    fetchRegions();
    fetchCustomAttrDefs();
    fetchStreamSubjects();
  }, [selectedStream]);

  useEffect(() => {
    if (settings.customCriteria) {
      settings.customCriteria.forEach(c => {
        if (c.source === 'system' && c.key) {
          fetchOptionsForAttribute(c.key);
        }
      });
    }
  }, [settings.customCriteria]);

  const fetchOptionsForAttribute = async (key: string) => {
    if (!key || attributeOptions[key]) return;
    const token = authHelpers.getToken();
    try {
      const res = await fetch(`/api/universities/applicants/attribute-values?key=${key}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.values) {
        setAttributeOptions(prev => ({
          ...prev,
          [key]: data.values
        }));
      }
    } catch (err) {
      console.error('Failed to fetch dynamic options for attribute:', key);
    }
  };

  const fetchCustomAttrDefs = async () => {
    try {
      const res = await fetch('/api/common/settings?key=student_custom_attributes');
      const data = await res.json();
      if (data.success) setCustomAttrDefs(data.value || []);
    } catch (err) {
      console.error('Failed to fetch attribute definitions');
    }
  };

  const fetchStreamSubjects = async () => {
    try {
      const res = await fetch('/api/common/settings?key=stream_subjects');
      const data = await res.json();
      if (data.success) {
        setStreamSubjects(data.value);
      }
    } catch (e) {
      console.error(e);
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
        setSettings({
          ...data.settings,
          invitationScoreWeight: data.settings.invitationScoreWeight || 0,
          documentScoreWeight: data.settings.documentScoreWeight || 0
        });
      } else {
        // Reset to default if no settings found for this stream
        setSettings({
          examScoreWeight: 70,
          regionWeight: 15,
          genderWeight: 10,
          disabilityWeight: 5,
          invitationScoreWeight: 0,
          documentScoreWeight: 0,
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
        setAvailableRegions(regions as string[]);
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
  const totalWeight = settings.examScoreWeight + settings.regionWeight + settings.genderWeight + settings.disabilityWeight + (settings.invitationScoreWeight || 0) + (settings.documentScoreWeight || 0) + customCriteriaTotal;

  const navLinks = [
    { label: 'Dashboard', href: '/university/dashboard' },
    { label: 'Analytics', href: '/university/analytics' },
    { label: 'Document Evaluation', href: '/university/documents-evaluation' },
    { label: 'Weighting Settings', href: '/university/weighting-settings' }
  ];

  if (loading) {
    return (
      <DashboardLayout title="Weighting Settings" navLinks={navLinks}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Weighting Settings" navLinks={navLinks}>
      <div className="max-w-4xl mx-auto p-4">
        {/* Stream Selector */}
        <div className="mb-6 flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setSelectedStream('all')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${selectedStream === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            All Students
          </button>
          <button
            onClick={() => setSelectedStream('natural')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${selectedStream === 'natural' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Natural Science
          </button>
          <button
            onClick={() => setSelectedStream('social')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${selectedStream === 'social' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Social Science
          </button>
        </div>

        {/* Global Progress Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Total Assigned Weight</h2>
              <p className="text-xs text-gray-500">All criteria must add up to exactly 100%</p>
            </div>
            <span className={`text-2xl font-black ${totalWeight === 100 ? 'text-green-600' : 'text-red-500'}`}>
              {totalWeight}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(totalWeight, 100)}%` }}></div>
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
                  value={Number.isNaN(settings.genderPreferences.male) ? '' : settings.genderPreferences.male}
                  onChange={(e) => setSettings({
                    ...settings,
                    genderPreferences: { ...settings.genderPreferences, male: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Female Preference (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Number.isNaN(settings.genderPreferences.female) ? '' : settings.genderPreferences.female}
                  onChange={(e) => setSettings({
                    ...settings,
                    genderPreferences: { ...settings.genderPreferences, female: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
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
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white"
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
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white"
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
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white"
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
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Percentage of the maximum disability bonus allocated to each type.
            </p>
          </div>

          {/* Interview/Invitation Score Weight */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="flex items-center gap-2 text-gray-700 font-medium">
                <Percent className="w-4 h-4 text-orange-600" />
                Interview / Entrance Exam Score Weight
              </label>
              <span className="text-orange-600 font-bold">{settings.invitationScoreWeight || 0}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.invitationScoreWeight || 0}
              onChange={(e) => setSettings({ ...settings, invitationScoreWeight: parseInt(e.target.value) || 0 })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
            <p className="text-xs text-gray-500 mt-1">Weight allocated to the candidate's interview or entrance exam score</p>
          </div>

          {/* Document Score Weight */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="flex items-center gap-2 text-gray-700 font-medium">
                <FileText className="w-4 h-4 text-teal-600" />
                Document Evaluation Score Weight
              </label>
              <span className="text-teal-600 font-bold">{settings.documentScoreWeight || 0}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.documentScoreWeight || 0}
              onChange={(e) => setSettings({ ...settings, documentScoreWeight: parseInt(e.target.value) || 0 })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <p className="text-xs text-gray-500 mt-1">Weight allocated to the candidate's evaluated document score</p>
          </div>
          
          {/* Sample Weight Calculation Example */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
            <h3 className="text-lg font-bold text-blue-900 mb-2">Analysis Example: Abebe Kebede's Total Weight</h3>
            <p className="text-sm text-blue-800 mb-4">
              This demonstrates how Abebe Kebede's final score is calculated dynamically using your current weight distribution settings, to assure examiners of the calculation's exactness.
            </p>
            <div className="bg-white rounded-lg p-4 font-mono text-sm shadow-sm space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Exam Score ({abebeExam}/{abebeMaxExam} - Weight: {settings.examScoreWeight}%):</span>
                <span>{abebeExamContribution.toFixed(2)} pts</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Region Match ({abebeRegion} - Pref: {regionPct}% - Weight: {settings.regionWeight}%):</span>
                <span>{abebeRegionContribution.toFixed(2)} pts</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Gender Balance ({abebeGender} - Pref: {genderPct}% - Weight: {settings.genderWeight}%):</span>
                <span>{abebeGenderContribution.toFixed(2)} pts</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Disability Status (Hearing - Pref: {disabilityPct}% - Weight: {settings.disabilityWeight}%):</span>
                <span>{abebeDisabilityContribution.toFixed(2)} pts</span>
              </div>
              {((settings as any).invitationScoreWeight || 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Interview/Entrance (Score: {abebeInterview}% - Weight: {(settings as any).invitationScoreWeight}%):</span>
                  <span>{abebeInvitationContribution.toFixed(2)} pts</span>
                </div>
              )}
              {(settings.documentScoreWeight || 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Document Evaluation (Score: {abebeDocument}% - Weight: {settings.documentScoreWeight}%):</span>
                  <span>{abebeDocumentContribution.toFixed(2)} pts</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 font-bold text-gray-900 flex justify-between">
                <span>Total Final Weight Score:</span>
                <span>{abebeTotalScore.toFixed(2)}% / 100.00%</span>
              </div>
            </div>
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
            settings.customCriteria.map((criterion, index) => {
              const def = customAttrDefs.find(d => d.name === criterion.key);
              const isString = criterion.source === 'system' && (
                def?.type === 'string' || 
                ['economicStatus', 'gender', 'region', 'disability'].includes(criterion.key || '')
              );

              return (
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
                            newCriteria[index].mappings = [];
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
                          onChange={async (e) => {
                            const selectedKey = e.target.value;
                            const def = customAttrDefs.find(d => d.name === selectedKey);
                            const newCriteria = [...settings.customCriteria];
                            newCriteria[index].key = selectedKey;
                            newCriteria[index].name = def?.label || selectedKey;
                            const isStr = def?.type === 'string' || ['economicStatus', 'gender', 'region', 'disability'].includes(selectedKey);
                            if (isStr) {
                              newCriteria[index].operator = 'value_map';
                              
                              let opts = ['High', 'Medium', 'Low'];
                              if (selectedKey === 'gender') opts = ['Male', 'Female'];
                              else if (selectedKey === 'disability') opts = ['Visual', 'Hearing', 'Physical', 'Learning', 'None'];
                              
                              const token = authHelpers.getToken();
                              try {
                                const res = await fetch(`/api/universities/applicants/attribute-values?key=${selectedKey}`, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                const data = await res.json();
                                if (data.success && data.values && data.values.length > 0) {
                                  opts = data.values;
                                  setAttributeOptions(prev => ({ ...prev, [selectedKey]: opts }));
                                }
                              } catch (err) {
                                console.error(err);
                              }

                              newCriteria[index].mappings = opts.map((opt, i) => ({
                                value: opt,
                                percent: i === 0 ? 100 : i === 1 ? 75 : i === 2 ? 50 : 0
                              }));
                            } else {
                              newCriteria[index].operator = 'equals';
                              newCriteria[index].value = '';
                              newCriteria[index].mappings = [];
                            }
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

                    {isString ? (
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">Option Percentages</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {(attributeOptions[criterion.key || ''] || (criterion.key === 'gender' ? ['Male', 'Female'] : criterion.key === 'disability' ? ['Visual', 'Hearing', 'Physical', 'Learning', 'None'] : ['High', 'Medium', 'Low'])).map(opt => {
                            const existingMap = criterion.mappings?.find((m: any) => m.value.toLowerCase() === opt.toLowerCase());
                            const pct = existingMap ? existingMap.percent : 100;
                            return (
                              <div key={opt} className="bg-white p-2 rounded border border-gray-200">
                                <label className="text-[10px] text-gray-600 block truncate font-bold" title={opt}>{opt} (%)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={pct}
                                  onChange={(e) => {
                                    const newCriteria = [...settings.customCriteria];
                                    const val = parseInt(e.target.value) || 0;
                                    let maps = [...(criterion.mappings || [])];
                                    const idx = maps.findIndex((m: any) => m.value.toLowerCase() === opt.toLowerCase());
                                    if (idx >= 0) {
                                      maps[idx].percent = val;
                                    } else {
                                      maps.push({ value: opt, percent: val });
                                    }
                                    newCriteria[index].mappings = maps;
                                    newCriteria[index].operator = 'value_map';
                                    setSettings({ ...settings, customCriteria: newCriteria });
                                  }}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
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
              );
            })
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