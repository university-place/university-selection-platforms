'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authHelpers } from '@/lib/api';
import {
  Calendar, MapPin, Clock, CheckCircle, XCircle, Loader2,
  ArrowLeft, Bell, BookOpen, AlertCircle, MessageCircle, Award, FileText
} from 'lucide-react';

interface Invitation {
  id: number;
  type: 'INTERVIEW' | 'EXAM' | 'BOTH';
  date: string;
  location: string | null;
  instructions: string | null;
  status: string;
  studentResponse: string | null;
  result: string | null;
  resultNotes: string | null;
  responseDeadline: string;
  university: {
    id: number;
    name: string;
    region: string;
    code: string;
  };
  program: {
    id: number;
    name: string;
    code: string;
  } | null;
}

export default function StudentInvitationsPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState<number | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = authHelpers.getToken();
    if (!token) {
      router.push('/student/login');
      return;
    }
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    const token = authHelpers.getToken();
    try {
      const res = await fetch('/api/students/interviews', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setInvitations(data.invitations);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    setResponding(invitationId);
    const token = authHelpers.getToken();
    
    try {
      const res = await fetch('/api/students/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ invitationId, response: 'ACCEPTED' })
      });
      
      const data = await res.json();
      if (data.success) {
        alert('✅ You have accepted the invitation. Please check your email for details.');
        fetchInvitations();
      } else {
        alert(data.error || 'Failed to accept invitation');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!selectedInvitation) return;
    
    setSubmitting(true);
    const token = authHelpers.getToken();
    
    try {
      const res = await fetch('/api/students/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          invitationId: selectedInvitation.id, 
          response: 'DECLINED',
          reason: rejectReason 
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert('❌ You have declined the invitation.');
        setShowRejectModal(false);
        setSelectedInvitation(null);
        setRejectReason('');
        fetchInvitations();
      } else {
        alert(data.error || 'Failed to decline invitation');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.studentResponse === 'ACCEPTED') {
      return { text: 'Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
    if (invitation.studentResponse === 'REJECTED') {
      return { text: 'Declined', color: 'bg-red-100 text-red-800', icon: XCircle };
    }
    if (invitation.result === 'FAIL') {
      return { text: 'Not Selected', color: 'bg-red-100 text-red-800', icon: XCircle };
    }
    if (invitation.result === 'PASS') {
      return { text: 'Selected - Check Placement', color: 'bg-green-100 text-green-800', icon: Award };
    }
    if (new Date(invitation.responseDeadline) < new Date()) {
      return { text: 'Expired', color: 'bg-gray-100 text-gray-600', icon: AlertCircle };
    }
    return { text: 'Pending Response', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
  };

  const getDaysLeft = (deadline: string) => {
    const daysLeft = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  const pendingInvitations = invitations.filter(
    inv => inv.studentResponse === null && inv.result !== 'FAIL' && new Date(inv.responseDeadline) > new Date()
  );
  
  const respondedInvitations = invitations.filter(
    inv => inv.studentResponse !== null && inv.result !== 'PASS' && inv.result !== 'FAIL'
  );
  
  const resultInvitations = invitations.filter(
    inv => (inv.result === 'PASS' || inv.result === 'FAIL') && inv.status !== 'PENDING'
  );

  // ✅ Rejected invitations filter
  const rejectedInvitations = invitations.filter(
    inv => inv.result === 'FAIL' && inv.status !== 'PENDING'
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="animate-spin w-12 h-12 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/student/dashboard" className="text-gray-600 hover:text-blue-600 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Invitations</h1>
              <p className="text-gray-600 text-sm">Review and respond to university invitations</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Pending Invitations Section */}
        {pendingInvitations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-500" />
              Pending Invitations ({pendingInvitations.length})
            </h2>
            <div className="space-y-4">
              {pendingInvitations.map((inv) => {
                const daysLeft = getDaysLeft(inv.responseDeadline);
                const isExpiringSoon = daysLeft <= 3 && daysLeft > 0;
                
                return (
                  <div key={inv.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className={`p-4 ${isExpiringSoon ? 'bg-gradient-to-r from-red-600 to-orange-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
                      <h3 className="text-xl font-bold text-white">{inv.university.name}</h3>
                      <p className="text-blue-100 text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {inv.university.region}
                      </p>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                        <div>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            inv.type === 'INTERVIEW' ? 'bg-purple-100 text-purple-800' :
                            inv.type === 'EXAM' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {inv.type}
                          </span>
                          {inv.program && (
                            <span className="ml-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              <BookOpen className="w-3 h-3" />
                              {inv.program.name}
                            </span>
                          )}
                        </div>
                        {daysLeft > 0 && (
                          <span className={`text-sm font-medium ${isExpiringSoon ? 'text-red-600' : 'text-orange-600'}`}>
                            ⏰ {daysLeft} day{daysLeft !== 1 ? 's' : ''} left to respond
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(inv.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(inv.date).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{inv.location || 'Location TBA'}</span>
                        </div>
                      </div>
                      
                      {inv.instructions && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageCircle className="w-4 h-4 text-blue-600" />
                            <span className="font-semibold text-blue-800">Instructions</span>
                          </div>
                          <p className="text-blue-700 text-sm">{inv.instructions}</p>
                        </div>
                      )}
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAcceptInvitation(inv.id)}
                          disabled={responding === inv.id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                        >
                          {responding === inv.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Accept Invitation
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvitation(inv);
                            setShowRejectModal(true);
                            setRejectReason('');
                          }}
                          disabled={responding === inv.id}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline Invitation
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ✅ REJECTED RESULTS SECTION - Added */}
        {rejectedInvitations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Rejection Results ({rejectedInvitations.length})
            </h2>
            <div className="space-y-3">
              {rejectedInvitations.map((inv) => (
                <div key={inv.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{inv.university.name}</h3>
                      <p className="text-sm text-gray-600">
                        {inv.type} on {new Date(inv.date).toLocaleDateString()}
                      </p>
                      {inv.resultNotes && (
                        <div className="mt-2 p-2 bg-white rounded border border-red-100">
                          <p className="text-sm text-red-700">
                            <strong>Reason:</strong> {inv.resultNotes}
                          </p>
                        </div>
                      )}
                    </div>
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      Not Selected
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Placement Results Section (PASS) */}
        {resultInvitations.filter(inv => inv.result === 'PASS').length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-500" />
              Interview/Exam Results
            </h2>
            <div className="space-y-4">
              {resultInvitations.filter(inv => inv.result === 'PASS').map((inv) => (
                <div key={inv.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">{inv.university.name}</h3>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Passed
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-gray-500">{inv.type} on {new Date(inv.date).toLocaleDateString()}</span>
                    </div>
                    {inv.resultNotes && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700">{inv.resultNotes}</p>
                      </div>
                    )}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-blue-800">Next Step</span>
                      </div>
                      <p className="text-blue-700 text-sm">
                        Congratulations! You have been selected. Please check the "My Placement Offers" tab to accept or decline your placement offer.
                      </p>
                      <button
                        onClick={() => router.push('/student/placements')}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Placement Offers →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Responded Invitations Section */}
        {respondedInvitations.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              My Responses
            </h2>
            <div className="space-y-3">
              {respondedInvitations.map((inv) => {
                const status = getStatusBadge(inv);
                const StatusIcon = status.icon;
                
                return (
                  <div key={inv.id} className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-900">{inv.university.name}</h3>
                        <p className="text-sm text-gray-500">{inv.type} on {new Date(inv.date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${status.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          {status.text}
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Action Buttons for Changing Response */}
                    {new Date(inv.responseDeadline) > new Date() && (
                       <div className="mt-4 pt-3 border-t flex items-center justify-between">
                          <span className="text-xs text-gray-500 font-medium">Update your response:</span>
                          <div className="flex gap-2">
                            {inv.studentResponse !== 'ACCEPTED' && (
                              <button
                                onClick={() => handleAcceptInvitation(inv.id)}
                                className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded hover:bg-green-100 transition flex items-center gap-1 font-medium"
                              >
                                <CheckCircle className="w-3 h-3" /> Change to Accept
                              </button>
                            )}
                            {inv.studentResponse !== 'REJECTED' && (
                              <button
                                onClick={() => {
                                  setSelectedInvitation(inv);
                                  setShowRejectModal(true);
                                  setRejectReason('');
                                }}
                                className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded hover:bg-red-100 transition flex items-center gap-1 font-medium"
                              >
                                <XCircle className="w-3 h-3" /> Change to Decline
                              </button>
                            )}
                          </div>
                       </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Invitations Message */}
        {pendingInvitations.length === 0 && respondedInvitations.length === 0 && resultInvitations.filter(inv => inv.result === 'PASS').length === 0 && rejectedInvitations.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invitations</h3>
            <p className="text-gray-500">You don't have any invitations at this time.</p>
            <Link href="/student/dashboard" className="inline-block mt-4 text-blue-600 hover:text-blue-800">
              ← Back to Dashboard
            </Link>
          </div>
        )}
      </div>

      {/* Decline Reason Modal */}
      {showRejectModal && selectedInvitation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Decline Invitation</h3>
              <p className="text-gray-600 text-sm mt-1">{selectedInvitation.university.name}</p>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to decline this invitation?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (Optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="e.g., Schedule conflict, Already accepted another university..."
                />
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  By declining, you will lose this opportunity. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedInvitation(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineInvitation}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Yes, Decline Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}