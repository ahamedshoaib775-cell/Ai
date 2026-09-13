'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, MailCheck, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Verification Screen state
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendMsg('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sign up failed');
      }

      // Show "Check your email" screen
      setSubmittedEmail(data.email || email);
    } catch (err: any) {
      setError(err.message || 'Signup error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!submittedEmail) return;
    setResending(true);
    setResendMsg('');

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: submittedEmail }),
      });

      const data = await res.json();
      setResendMsg(data.message || 'Verification link resent!');
    } catch (err) {
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Meta Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0866FF]/10 text-[#0866FF] mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#050505] tracking-tight">Create Client Account</h1>
          <p className="text-sm text-[#65676B] mt-1">Register your business to review and approve media content</p>
        </div>

        {/* Screen 2: "Check your email" Screen */}
        {submittedEmail ? (
          <div className="bg-white border border-[#E4E6EA] rounded-xl p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 bg-[#0866FF]/10 text-[#0866FF] rounded-2xl flex items-center justify-center mx-auto">
              <MailCheck className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#050505]">Check your email</h2>
              <p className="text-sm text-[#65676B] leading-relaxed">
                We&apos;ve sent a verification link to{' '}
                <strong className="text-[#050505]">{submittedEmail}</strong>. Click it to activate your account.
              </p>
            </div>

            {resendMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg">
                ✓ {resendMsg}
              </div>
            )}

            <div className="pt-4 border-t border-[#E4E6EA] space-y-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="w-full py-2.5 px-4 bg-[#F0F2F5] hover:bg-[#E4E6EA] text-[#050505] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#0866FF]" />
                {resending ? 'Resending verification link...' : 'Resend verification email'}
              </button>

              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-[#0866FF] font-semibold hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          /* Screen 1: Signup Form */
          <div className="bg-white border border-[#E4E6EA] rounded-xl p-8 shadow-sm">
            {error && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5">
                  Business / Client Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#65676B]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Zenith Yoga Studio"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] placeholder-[#65676B] focus:outline-none focus:border-[#0866FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#65676B]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="business@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] placeholder-[#65676B] focus:outline-none focus:border-[#0866FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#65676B]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] placeholder-[#65676B] focus:outline-none focus:border-[#0866FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#65676B]" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] placeholder-[#65676B] focus:outline-none focus:border-[#0866FF]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#0866FF] hover:bg-[#0055D4] text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  'Creating Account...'
                ) : (
                  <>
                    Create Account <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-[#65676B]">Already registered? </span>
              <Link href="/login" className="text-[#0866FF] font-bold hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[#65676B] mt-6">
          Meta product style design • Self-Serve Client Onboarding
        </p>
      </div>
    </div>
  );
}
