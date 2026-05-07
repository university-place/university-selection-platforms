'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Building, MapPin, Globe, Mail, Phone, BookOpen, Target, Users, 
  Calendar, Award, CheckCircle, Clock, ArrowLeft, Loader2,
  GraduationCap, FileText, AlertCircle, Sparkles, Heart, Library,
  Microscope, Trophy, Shield, HeartHandshake
} from 'lucide-react';
import { authHelpers } from '@/lib/api';

interface University {
  id: number;
  name: string;
  code: string;
  type: string;
  region: string;
  address: string;
  description: string;
  history: string;
  achievements: string;
  facilities: string;
  researchAreas: string;
  studentLife: string;
  accreditation: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  admissionInstructions: string;
  postDecisionInstructions: string;
   applicationStartDate?: string;      
  applicationDeadline?: string;
  keyFacts?: {
    established?: number;
    students?: number;
    programs?: number;
  };
}

interface AdmissionTrack {
  id: number;
  name: string;
  description: string;
  intakeCapacity: number;
  targetAudience: string;
}

interface Program {
  id: number;
  name: string;
  code: string;
  description: string;
  degree: string;
  duration: number;
  intakeCapacity: number;
  admissionTracks: AdmissionTrack[];
}

export default function UniversityPublicPage() {
  const params = useParams();
  const router = useRouter();
  const [university, setUniversity] = useState<University | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    const id = params.id;
    if (id) {
      fetchUniversityData(parseInt(id as string));
    }
  }, [params.id]);

  async function fetchUniversityData(universityId: number) {
    setLoading(true);
    setError('');
    try {
      // Fetch university basic info with all new fields
      const uniRes = await fetch(`/api/universities/${universityId}`);
      if (!uniRes.ok) throw new Error('University not found');
      const uniData = await uniRes.json();
      setUniversity(uniData);

      // Fetch programs with tracks
      const programsRes = await fetch(`/api/universities/${universityId}/programs`);
      const programsData = await programsRes.json();
      if (programsData.success) {
        setPrograms(programsData.programs);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load university data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-12 h-12 text-blue-600" />
      </div>
    );
  }

  if (error || !university) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-red-600 text-lg mb-4">{error || 'University not found'}</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" /> Back to Universities
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-4xl font-bold mb-2">{university.name}</h1>
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
              <Building className="w-4 h-4" /> {university.type || 'University'}
            </span>
            <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
              <MapPin className="w-4 h-4" /> {university.region || 'Location not specified'}
            </span>
            <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
              <Award className="w-4 h-4" /> Code: {university.code}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Key Facts Bar */}
        {(university.keyFacts?.established || university.keyFacts?.students || university.keyFacts?.programs) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {university.keyFacts?.established && (
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{university.keyFacts.established}</p>
                <p className="text-sm text-gray-500">Year Established</p>
              </div>
            )}
            {university.keyFacts?.students && (
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{university.keyFacts.students.toLocaleString()}+</p>
                <p className="text-sm text-gray-500">Total Students</p>
              </div>
            )}
            {university.keyFacts?.programs && (
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <GraduationCap className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{university.keyFacts.programs}+</p>
                <p className="text-sm text-gray-500">Academic Programs</p>
              </div>
            )}
          </div>
        )}

        {/* Application Deadline */}
        {/* Application Period - Shows BOTH Start Date AND Deadline */}
{(university.applicationStartDate || university.applicationDeadline) && (
  <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
      <Calendar className="w-5 h-5 text-blue-600" />
      Application Period
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Start Date */}
      {university.applicationStartDate && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Clock className="w-4 h-4" />
            <span className="font-semibold">Applications Open</span>
          </div>
          <p className="text-lg font-bold text-blue-900">
            {new Date(university.applicationStartDate).toLocaleDateString()}
          </p>
          <p className="text-sm text-blue-700">
            at {new Date(university.applicationStartDate).toLocaleTimeString()}
          </p>
        </div>
      )}
      
      {/* Deadline */}
     {/* Application Period - Shows BOTH Start Date AND Deadline */}
<div className="mb-6 bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
    <Calendar className="w-5 h-5 text-blue-600" />
    Application Period
  </h2>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Start Date - THIS IS WHAT'S MISSING */}
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center gap-2 text-blue-700 mb-2">
        <Clock className="w-4 h-4" />
        <span className="font-semibold">Applications Open</span>
      </div>
      {university.applicationStartDate ? (
        <>
          <p className="text-lg font-bold text-blue-900">
            {new Date(university.applicationStartDate).toLocaleDateString()}
          </p>
          <p className="text-sm text-blue-700">
            at {new Date(university.applicationStartDate).toLocaleTimeString()}
          </p>
        </>
      ) : (
        <p className="text-yellow-600 text-sm">⚠️ Start date not set by university</p>
      )}
    </div>
    
    {/* Deadline */}
    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
      <div className="flex items-center gap-2 text-orange-700 mb-2">
        <Calendar className="w-4 h-4" />
        <span className="font-semibold">Application Deadline</span>
      </div>
      {university.applicationDeadline ? (
        <>
          <p className="text-lg font-bold text-orange-900">
            {new Date(university.applicationDeadline).toLocaleDateString()}
          </p>
          <p className="text-sm text-orange-700">
            at {new Date(university.applicationDeadline).toLocaleTimeString()}
          </p>
        </>
      ) : (
        <p className="text-gray-500">Not set</p>
      )}
    </div>
  </div>
  
  {/* Status Banner */}
  <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
    <div className="flex items-center gap-3">
      {(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (university.applicationStartDate) {
          const startDate = new Date(university.applicationStartDate);
          startDate.setHours(0, 0, 0, 0);
          if (today < startDate) {
            return (
              <>
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-800">⏳ Applications Not Yet Open</p>
                  <p className="text-sm text-blue-700">
                    Applications will open on {startDate.toLocaleDateString()}
                  </p>
                </div>
              </>
            );
          }
        }
        
        if (university.applicationDeadline) {
          const deadline = new Date(university.applicationDeadline);
          deadline.setHours(23, 59, 59, 999);
          if (today > deadline) {
            return (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">❌ Applications Closed</p>
                  <p className="text-sm text-red-700">
                    The application deadline has passed
                  </p>
                </div>
              </>
            );
          }
        }
        
        return (
          <>
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">✅ Applications Open</p>
              <p className="text-sm text-green-700">
                You can apply now
              </p>
            </div>
          </>
        );
      })()}
    </div>
  </div>
</div>
    </div>
    
    {/* Status Banner */}
    <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
      <div className="flex items-center gap-3">
        {(() => {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          if (university.applicationStartDate) {
            const startDate = new Date(university.applicationStartDate);
            startDate.setHours(0, 0, 0, 0);
            if (today < startDate) {
              return (
                <>
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-800">⏳ Applications Not Yet Open</p>
                    <p className="text-sm text-blue-700">
                      Applications will open on {startDate.toLocaleDateString()}
                    </p>
                  </div>
                </>
              );
            }
          }
          
          if (university.applicationDeadline) {
            const deadline = new Date(university.applicationDeadline);
            deadline.setHours(23, 59, 59, 999);
            if (today > deadline) {
              return (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-800">❌ Applications Closed</p>
                    <p className="text-sm text-red-700">
                      The application deadline has passed
                    </p>
                  </div>
                </>
              );
            }
          }
          
          return (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">✅ Applications Open</p>
                <p className="text-sm text-green-700">
                  You can apply now
                </p>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  </div>
)}

        {/* Description */}
        {university.description && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              About the University
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {showFullDescription ? university.description : `${university.description.substring(0, 400)}...`}
            </p>
            {university.description.length > 400 && (
              <button 
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showFullDescription ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* History */}
        {university.history && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              History & Background
            </h2>
            <p className="text-gray-700 leading-relaxed">{university.history}</p>
          </div>
        )}

        {/* Achievements */}
        {university.achievements && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              Achievements & Recognition
            </h2>
            <div className="space-y-2">
              {university.achievements.split('\n').map((item, idx) => (
                item.trim() && (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item.replace('• ', '')}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Facilities */}
        {university.facilities && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Library className="w-5 h-5 text-purple-600" />
              Campus Facilities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {university.facilities.split('\n').map((item, idx) => (
                item.trim() && (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-700 text-sm">{item.replace('• ', '')}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Research Areas */}
        {university.researchAreas && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Microscope className="w-5 h-5 text-indigo-600" />
              Research Areas
            </h2>
            <div className="flex flex-wrap gap-2">
              {university.researchAreas.split('\n').map((item, idx) => (
                item.trim() && (
                  <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {item.replace('• ', '')}
                  </span>
                )
              ))}
            </div>
          </div>
        )}

        {/* Student Life */}
        {university.studentLife && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-pink-600" />
              Student Life
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {university.studentLife.split('\n').map((item, idx) => (
                item.trim() && (
                  <div key={idx} className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-gray-700 text-sm">{item.replace('• ', '')}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Accreditation */}
        {university.accreditation && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Accreditation & Partnerships
            </h2>
            <div className="space-y-2">
              {university.accreditation.split('\n').map((item, idx) => (
                item.trim() && (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item.replace('• ', '')}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {university.contactEmail && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <a href={`mailto:${university.contactEmail}`} className="text-blue-600 hover:underline">
                    {university.contactEmail}
                  </a>
                </div>
              </div>
            )}
            {university.contactPhone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <a href={`tel:${university.contactPhone}`} className="text-gray-900">
                    {university.contactPhone}
                  </a>
                </div>
              </div>
            )}
            {university.website && (
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Website</p>
                  <a href={university.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {university.website}
                  </a>
                </div>
              </div>
            )}
            {university.address && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-gray-900">{university.address}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Programs and Tracks */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            Academic Programs & Admission Tracks
          </h2>

          {programs.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No programs available for this university yet.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Program</label>
                <select
                  value={selectedProgram || ''}
                  onChange={(e) => setSelectedProgram(parseInt(e.target.value))}
                  className="w-full md:w-96 border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a program --</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>{program.name}</option>
                  ))}
                </select>
              </div>

              {selectedProgram && (
                <>
                  {(() => {
                    const program = programs.find(p => p.id === selectedProgram);
                    if (!program) return null;
                    return (
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-lg font-bold text-gray-900">{program.name}</h3>
                        <p className="text-gray-600 mt-1">{program.description || 'No description available'}</p>
                      </div>
                    );
                  })()}

                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 text-lg">Admission Tracks</h3>
                    {(() => {
                      const program = programs.find(p => p.id === selectedProgram);
                      if (!program || !program.admissionTracks?.length) {
                        return (
                          <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <Target className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-500">No admission tracks found for this program</p>
                          </div>
                        );
                      }
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {program.admissionTracks.map(track => (
                            <div key={track.id} className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                              <div className="flex justify-between items-start">
                                <h4 className="text-lg font-bold text-gray-900">{track.name}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  track.targetAudience === 'LOCAL' ? 'bg-green-100 text-green-700' :
                                  track.targetAudience === 'FOREIGN' ? 'bg-blue-100 text-blue-700' :
                                  'bg-purple-100 text-purple-700'
                                }`}>
                                  {track.targetAudience === 'LOCAL' ? 'Local Only' :
                                   track.targetAudience === 'FOREIGN' ? 'Foreign Only' : 'Both'}
                                </span>
                              </div>
                              <p className="text-gray-600 text-sm mt-2">{track.description || 'No description available'}</p>
                              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" /> Capacity: {track.intakeCapacity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Admission Instructions */}
        {university.admissionInstructions && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-6 h-6 text-green-600" />
              Admission Instructions
            </h2>
            <p className="text-gray-700 leading-relaxed">{university.admissionInstructions}</p>
          </div>
        )}

        {/* Apply Button */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/student/dashboard?tab=preferences')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
          >
            Apply to {university.name}
          </button>
        </div>
      </div>
    </div>
  );
}