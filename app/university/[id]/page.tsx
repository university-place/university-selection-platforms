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
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    const id = params.id;
    if (id) {
      const parsedId = parseInt(id as string);
      if (isNaN(parsedId)) {
        setError('Invalid university ID');
        setLoading(false);
      } else {
        fetchUniversityData(parsedId);
      }
    }
  }, [params.id]);

  async function fetchUniversityData(universityId: number) {
    setLoading(true);
    setError('');
    try {
      // Fetch university basic info
      const uniRes = await fetch(`/api/universities/${universityId}`);
      
      // Safe parse: handles HTML error pages (e.g. 500 from DB crash)
      const uniData = await uniRes.json().catch(() => null);
      
      if (!uniRes.ok || !uniData) {
        const msg = uniData?.error || `Failed to load university (HTTP ${uniRes.status})`;
        throw new Error(
          uniRes.status === 500
            ? 'The server encountered an error. This usually means the database is not connected. Please try again later.'
            : msg
        );
      }
      setUniversity(uniData);

      // Fetch programs with tracks — safe parse
      const programsRes = await fetch(`/api/universities/${universityId}/programs`);
      const programsData = await programsRes.json().catch(() => null);
      if (programsData?.success && programsData.programs) {
        setPrograms(programsData.programs);
      }
      // Programs failing is non-fatal — page still renders with empty programs list
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Failed to load university data');
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
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
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
              <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{university.keyFacts.established}</p>
                <p className="text-sm text-muted-foreground">Year Established</p>
              </div>
            )}
            {university.keyFacts?.students && (
              <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{university.keyFacts.students.toLocaleString()}+</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            )}
            {university.keyFacts?.programs && (
              <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                <GraduationCap className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{university.keyFacts.programs}+</p>
                <p className="text-sm text-muted-foreground">Academic Programs</p>
              </div>
            )}
          </div>
        )}

        {/* Application Deadline */}
        {/* Application Period - Shows BOTH Start Date AND Deadline */}
{(university.applicationStartDate || university.applicationDeadline) && (
  <div className="mb-6 bg-card rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
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
<div className="mb-6 bg-card rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
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
        <p className="text-muted-foreground">Not set</p>
      )}
    </div>
  </div>
  
  {/* Status Banner */}
  <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-border">
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
    <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-border">
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
          <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              About the University
            </h2>
            <p className="text-muted-foreground leading-relaxed">
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
          <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              History & Background
            </h2>
            <p className="text-muted-foreground leading-relaxed">{university.history}</p>
          </div>
        )}

        {/* Achievements */}
        {university.achievements && (
          <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              Achievements & Recognition
            </h2>
            <div className="space-y-2">
              {university.achievements.split('\n').map((item, idx) => (
                item.trim() && (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item.replace('• ', '')}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Facilities */}
        {university.facilities && (
          <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <Library className="w-5 h-5 text-purple-600" />
              Campus Facilities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {university.facilities.split('\n').map((item, idx) => (
                item.trim() && (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-muted-foreground text-sm">{item.replace('• ', '')}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Research Areas */}
        {university.researchAreas && (
          <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
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
          <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-pink-600" />
              Student Life
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {university.studentLife.split('\n').map((item, idx) => (
                item.trim() && (
                  <div key={idx} className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-muted-foreground text-sm">{item.replace('• ', '')}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Accreditation */}
        {university.accreditation && (
          <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Accreditation & Partnerships
            </h2>
            <div className="space-y-2">
              {university.accreditation.split('\n').map((item, idx) => (
                item.trim() && (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item.replace('• ', '')}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {university.contactEmail && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a href={`mailto:${university.contactEmail}`} className="text-blue-600 hover:underline">
                    {university.contactEmail}
                  </a>
                </div>
              </div>
            )}
            {university.contactPhone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a href={`tel:${university.contactPhone}`} className="text-foreground">
                    {university.contactPhone}
                  </a>
                </div>
              </div>
            )}
            {university.website && (
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  <a href={university.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {university.website}
                  </a>
                </div>
              </div>
            )}
            {university.address && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-foreground">{university.address}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Academic Programs */}
        <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <GraduationCap className="w-7 h-7 text-blue-600" />
            Academic Programs
          </h2>

          {programs.length === 0 ? (
            <div className="text-center py-10 bg-blue-50 rounded-2xl border border-blue-100">
              <BookOpen className="w-16 h-16 text-blue-300 mx-auto mb-3" />
              <p className="text-blue-800 font-medium">No programs available for this university yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map(program => (
                <div key={program.id} className="bg-card border-2 border-border rounded-2xl p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300 group flex flex-col h-full">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-blue-600 transition-colors">
                    {program.name}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-grow">
                    {program.description || 'No description available for this program.'}
                  </p>
                  <div className="flex items-center text-sm font-medium text-blue-600 mt-auto">
                    <span className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Code: {program.code || 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admission Instructions */}
        {university.admissionInstructions && (
          <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-6 h-6 text-green-600" />
              Admission Instructions
            </h2>
            <p className="text-muted-foreground leading-relaxed">{university.admissionInstructions}</p>
          </div>
        )}

        {/* Apply Button */}

      </div>
    </div>
  );
}