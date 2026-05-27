'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldAlert, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

export default function StudentChangeDefaultPasswordPage() {
  const router = useRouter();
  const [examId, setExamId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!examId || !currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New Password and Confirm New Password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/students/change-password-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          currentPassword,
          newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || data.message || 'Failed to update password.');
      } else {
        setSuccess('Password updated successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/student/login');
        }, 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px]" />

      <div className="w-full max-w-md bg-slate-800/50 border border-slate-700/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 animate-bounce">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-200 to-violet-400 bg-clip-text text-transparent">
            Change Default Password
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Please update your password before logging in
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl flex items-start gap-3 text-sm animate-shake">
            <ShieldAlert className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-2xl flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Exam ID */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
              Exam ID
            </label>
            <input
              type="text"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              placeholder="EXM-2024-085"
              className="w-full bg-slate-900/60 border border-slate-700 focus:border-blue-500 rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition"
              required
            />
          </div>

          {/* Current Password */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full bg-slate-900/60 border border-slate-700 focus:border-blue-500 rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition"
              required
            />
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full bg-slate-900/60 border border-slate-700 focus:border-blue-500 rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition"
              required
            />
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-slate-900/60 border border-slate-700 focus:border-blue-500 rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/student/login')}
              disabled={loading}
              className="flex-1 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 font-bold py-3.5 px-4 rounded-2xl text-sm transition flex items-center justify-center gap-2 hover:border-slate-600 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
