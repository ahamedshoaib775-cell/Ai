'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlEmail = searchParams.get('email');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    async function verifyAccount() {
      try {
        let emailToVerify = urlEmail;

        // 1. Try fetching email from Supabase Auth session (if redirect came from Supabase email link)
        if (!emailToVerify) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user?.email) {
            emailToVerify = data.session.user.email;
          }
        }

        // 2. Parse hash params if Supabase redirected with #access_token=...
        if (!emailToVerify && typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          if (accessToken) {
            const { data } = await supabase.auth.getUser(accessToken);
            if (data?.user?.email) {
              emailToVerify = data.user.email;
            }
          }
        }

        if (!emailToVerify) {
          // If still no email detected, try getting current logged in user or query param
          setError('Email verification token missing or expired. Please sign in or resend link.');
          setLoading(false);
          return;
        }

        // 3. Mark account as verified in DB and create session cookie
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailToVerify }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Verification failed');
        }

        setClientName(data.user?.name || '');

        // Redirect to /dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch (err: any) {
        setError(err.message || 'Error verifying account');
      } finally {
        setLoading(false);
      }
    }

    verifyAccount();
  }, [urlEmail, router]);

  return (
    <div className="bg-white border border-[#E4E6EA] rounded-xl p-8 shadow-sm text-center space-y-6">
      <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[#050505] tracking-tight">Email Verified!</h1>
        <p className="text-sm text-[#65676B] leading-relaxed">
          {clientName ? `Welcome, ${clientName}! ` : ''}Your account has been successfully verified.
        </p>
      </div>

      {loading ? (
        <div className="p-3 bg-[#F0F2F5] text-xs font-semibold text-[#050505] rounded-lg">
          Activating account session...
        </div>
      ) : error ? (
        <div className="p-3 bg-red-50 text-xs font-semibold text-red-700 rounded-lg">
          {error}
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
          <span>Redirecting to your dashboard in 2 seconds...</span>
        </div>
      )}

      <div className="pt-4 border-t border-[#E4E6EA]">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-2.5 px-4 bg-[#0866FF] hover:bg-[#0055D4] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          Go to Dashboard Now <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function VerifySuccessPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="text-center text-sm text-[#65676B]">Loading verification...</div>}>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
