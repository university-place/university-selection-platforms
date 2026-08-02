'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authHelpers } from '@/lib/api';
import {
    CheckCircle, XCircle, Clock, Calendar, AlertCircle, Award,
    MapPin, GraduationCap, MessageCircle, Loader2, ArrowLeft
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface PlacementOffer {
    id: number;
    examID: string;
    firstName: string;
    lastName: string;
    universityName: string;
    universityRegion: string;
    programName?: string;
    acceptanceMessage: string;
    confirmationDeadline: string;
    status: string;
}

export default function StudentPlacementsPage() {
    const router = useRouter();
    const [placements, setPlacements] = useState<PlacementOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedPlacement, setSelectedPlacement] = useState<PlacementOffer | null>(null);
    const [confirmAction, setConfirmAction] = useState<'confirm' | 'decline' | null>(null);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const token = authHelpers.getToken();
        if (!token) {
            router.push('/student/login');
            return;
        }
        fetchMyPlacements();
    }, []);

    const fetchMyPlacements = async () => {
        const token = authHelpers.getToken();
        setLoading(true);
        try {
            const res = await fetch('/api/students/my-placements', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            console.log('Fetched placements:', data);

            if (data.success && data.placements) {
                setPlacements(data.placements);
                setError('');
            } else {
                setError('No placements found');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load placements');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedPlacement) return;

        setSubmitting(true);
        const token = authHelpers.getToken();

        try {
            const res = await fetch('/api/students/confirm-placement', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    preferenceId: selectedPlacement.id,
                    action: confirmAction
                })
            });

            const data = await res.json();
            if (data.success) {
                setMessage(confirmAction === 'confirm'
                    ? '✅ Congratulations! You have accepted the offer.'
                    : '❌ You have declined the offer.'
                );
                setTimeout(() => {
                    setShowConfirmModal(false);
                    setMessage('');
                    fetchMyPlacements();
                }, 2000);
            } else {
                alert(data.error || 'Failed to update');
            }
        } catch (err) {
            console.error('Confirm error:', err);
            alert('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getDaysLeft = (deadline: string) => {
        const daysLeft = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysLeft > 0 ? daysLeft : 0;
    };

    const isExpired = (deadline: string) => {
        return new Date(deadline) < new Date();
    };

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
            <header className="bg-card shadow-md px-6 py-4 sticky top-0 z-10 flex justify-between items-center">
                <div className="max-w-4xl mx-auto flex items-center gap-4 w-full">
                    <Link href="/student/dashboard" className="text-muted-foreground hover:text-blue-600 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">My Placement Offers</h1>
                        <p className="text-muted-foreground text-sm">Review and respond to your offers</p>
                    </div>
                </div>
                <ThemeToggle />
            </header>

            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Success/Error Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.includes('accepted')
                            ? 'bg-green-100 border border-green-300 text-green-800'
                            : 'bg-red-100 border border-red-300 text-red-800'
                        }`}>
                        {message.includes('accepted') ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        <span>{message}</span>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* No Placements */}
                {placements.length === 0 ? (
                    <div className="bg-card rounded-xl shadow-sm p-12 text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Award className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Placement Offers Yet</h3>
                        <p className="text-muted-foreground">You don't have any placement offers at this time.</p>
                        <Link
                            href="/student/dashboard"
                            className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {placements.map((placement) => {
                            const daysLeft = getDaysLeft(placement.confirmationDeadline);
                            const expired = isExpired(placement.confirmationDeadline);
                            const canRespond = !expired && placement.status !== 'NOT_PLACED';

                            return (
                                <div key={placement.id} className="bg-card rounded-xl shadow-sm border overflow-hidden transition hover:shadow-md">
                                    {/* University Banner */}
                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                                        <h2 className="text-xl font-bold text-white">{placement.universityName}</h2>
                                        <p className="text-blue-100 text-sm flex items-center gap-2 mt-1">
                                            <MapPin className="w-4 h-4" />
                                            {placement.universityRegion}
                                        </p>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6">
                                        {/* Status and Deadline */}
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <GraduationCap className="w-5 h-5 text-muted-foreground" />
                                                    <span className="font-semibold text-foreground">
                                                        {placement.status === 'NOT_PLACED' ? 'Not Placed' : (placement.programName || 'Program not specified')}
                                                    </span>
                                                </div>
                                                {placement.status !== 'NOT_PLACED' && (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-muted-foreground">Deadline:</span>
                                                        <span className={`font-medium ${daysLeft <= 2 && daysLeft > 0 ? 'text-red-600' : 'text-foreground'}`}>
                                                            {placement.confirmationDeadline ? new Date(placement.confirmationDeadline).toLocaleDateString() : 'N/A'}
                                                        </span>
                                                        {!expired && daysLeft > 0 && (
                                                            <span className={`text-xs ml-2 px-2 py-1 rounded-full ${daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`px-3 py-1 rounded-full flex items-center gap-1 text-sm whitespace-nowrap ${
                                                placement.status === 'NOT_PLACED' ? 'bg-red-100 text-red-800' :
                                                placement.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                                placement.status === 'DECLINED' ? 'bg-orange-100 text-orange-800' :
                                                expired ? 'bg-gray-100 text-muted-foreground' : 
                                                'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {placement.status === 'NOT_PLACED' ? <XCircle className="w-4 h-4" /> :
                                                 placement.status === 'CONFIRMED' ? <CheckCircle className="w-4 h-4" /> :
                                                 placement.status === 'DECLINED' ? <XCircle className="w-4 h-4" /> :
                                                 expired ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                                {placement.status === 'NOT_PLACED' ? 'Not Placed' :
                                                 placement.status === 'CONFIRMED' ? 'Accepted' :
                                                 placement.status === 'DECLINED' ? 'Declined' :
                                                 expired ? 'Expired' : 'Pending Response'}
                                            </div>
                                        </div>

                                        {/* Message from University / Not Placed Result */}
                                        {placement.status === 'NOT_PLACED' ? (
                                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                                <div>
                                                    <h4 className="font-bold text-red-800">Selection Result</h4>
                                                    <p className="text-sm text-red-700">{placement.acceptanceMessage}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-green-50 rounded-lg p-4 mb-4 border border-green-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MessageCircle className="w-5 h-5 text-green-600" />
                                                    <span className="font-semibold text-green-800">Message from University</span>
                                                </div>
                                                <p className="text-green-700">{placement.acceptanceMessage}</p>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        {canRespond && placement.status !== 'NOT_PLACED' && (
                                            <div className="flex flex-col sm:flex-row gap-4 mt-4">
                                                {placement.status !== 'CONFIRMED' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPlacement(placement);
                                                            setConfirmAction('confirm');
                                                            setShowConfirmModal(true);
                                                        }}
                                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                        {placement.status === 'DECLINED' ? 'Change to Accept' : 'Accept Offer'}
                                                    </button>
                                                )}
                                                {placement.status !== 'DECLINED' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPlacement(placement);
                                                            setConfirmAction('decline');
                                                            setShowConfirmModal(true);
                                                        }}
                                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                        {placement.status === 'CONFIRMED' ? 'Change to Decline' : 'Decline Offer'}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Expired Message */}
                                        {expired && placement.status !== 'NOT_PLACED' && (
                                            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                                    <span className="font-semibold text-red-800">Offer Expired</span>
                                                </div>
                                                <p className="text-red-700 text-sm">
                                                    This offer expired on {new Date(placement.confirmationDeadline).toLocaleDateString()}.
                                                    Please contact the university for extension.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
 })}
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && selectedPlacement && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b">
                            <h3 className="text-xl font-bold text-foreground">
                                {confirmAction === 'confirm' ? 'Accept Offer' : 'Decline Offer'}
                            </h3>
                        </div>

                        <div className="p-6">
                            <p className="text-muted-foreground mb-4">
                                {confirmAction === 'confirm'
                                    ? `Are you sure you want to accept the offer from ${selectedPlacement.universityName}?`
                                    : `Are you sure you want to decline the offer from ${selectedPlacement.universityName}?`
                                }
                            </p>
                            {confirmAction === 'confirm' && (
                                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <p className="text-sm text-yellow-800 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        By accepting this offer, you will be committed to this university. This action cannot be undone.
                                    </p>
                                </div>
                            )}
                            {confirmAction === 'decline' && (
                                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <p className="text-sm text-yellow-800 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        By declining this offer, you will lose your spot at this university.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 border border-border rounded-lg font-semibold text-muted-foreground hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={submitting}
                                className={`px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${confirmAction === 'confirm'
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : confirmAction === 'confirm' ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : (
                                    <XCircle className="w-4 h-4" />
                                )}
                                {confirmAction === 'confirm' ? 'Yes, Accept' : 'Yes, Decline'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}