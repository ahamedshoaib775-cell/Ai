import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const client = (await db.prepare('SELECT name, is_verified FROM clients WHERE email = ?').get(cleanEmail)) as {
      name: string;
      is_verified: number;
    } | undefined;

    if (!client) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (client.is_verified === 1) {
      return NextResponse.json({ message: 'Your email is already verified! You can log in.' });
    }

    // Try Supabase Auth resend
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });
    } catch (e) {
      console.warn('Supabase resend skipped:', e);
    }

    // Re-dispatch transactional verification link
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const verifyLink = `${origin}/verify-success?email=${encodeURIComponent(cleanEmail)}`;

    await sendEmail({
      to: cleanEmail,
      subject: 'Verify your SocialSuite account email (Resent Link)',
      body: `Hi ${client.name},\n\nHere is your requested verification link. Please click below to activate your account:\n\n${verifyLink}\n\nBest regards,\nSocialSuite Team`,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification link resent successfully! Please check your email inbox.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resend verification email' }, { status: 500 });
  }
}
