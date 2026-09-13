'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, ArrowRight, CheckCircle2, ShieldCheck, RefreshCw, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUnverified(false);
    setResendMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.unverified) {
          setIsUnverified(true);
        }
        throw new Error(data.error || 'Login failed');
      }

      if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setResendMsg(data.message || 'Verification link resent!');
    } catch (err) {
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  const quickLogin = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setIsUnverified(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Meta Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0866FF]/10 text-[#0866FF] mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#050505] tracking-tight">SocialSuite Approval</h1>
          <p className="text-sm text-[#65676B] mt-1">Review, approve, or request edits for weekly media content</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#E4E6EA] rounded-xl p-8 shadow-sm">
          {error && (
            <div className="mb-5 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <span>⚠️ {error}</span>
              </div>
              {isUnverified && (
                <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-[#0866FF] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {resending ? 'Sending...' : 'Resend verification email'}
                  </button>
                </div>
              )}
            </div>
          )}

          {resendMsg && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              ✓ {resendMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
                  placeholder="name@business.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] placeholder-[#65676B] focus:outline-none focus:border-[#0866FF] focus:ring-1 focus:ring-[#0866FF]"
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
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] placeholder-[#65676B] focus:outline-none focus:border-[#0866FF] focus:ring-1 focus:ring-[#0866FF]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#0866FF] hover:bg-[#0055D4] text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Self-Serve Client Signup Prompt */}
          <div className="mt-6 text-center text-sm">
            <span className="text-[#65676B]">Don&apos;t have a client account? </span>
            <Link href="/signup" className="text-[#0866FF] font-bold hover:underline inline-flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5" /> Create account
            </Link>
          </div>

          {/* Preset Buttons for Quick Testing */}
          <div className="mt-6 pt-6 border-t border-[#E4E6EA]">
            <p className="text-xs font-semibold text-[#65676B] uppercase tracking-wider mb-3">
              One-Click Demo Passwords
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => quickLogin('admin@socialsuite.com', 'admin123')}
                className="w-full text-left px-3 py-2 bg-[#F0F2F5] hover:bg-[#E4E6EA] rounded-lg text-xs font-medium text-[#050505] flex items-center justify-between transition-colors"
              >
                <span>
                  👑 <strong>Admin Account</strong> (admin@socialsuite.com)
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0866FF]" />
              </button>
              <button
                type="button"
                onClick={() => quickLogin('glow@skincare.com', 'client123')}
                className="w-full text-left px-3 py-2 bg-[#F0F2F5] hover:bg-[#E4E6EA] rounded-lg text-xs font-medium text-[#050505] flex items-center justify-between transition-colors"
              >
                <span>
                  ✨ <strong>Client: Glow Skincare Co.</strong> (glow@skincare.com)
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0866FF]" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[#65676B] mt-6">
          Meta product style design • Content Approval System v1.0
        </p>
      </div>
    </div>
  );
}
