import { NextResponse } from 'next/server';
import db, { hashPassword } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check existing client
    const existing = db.prepare('SELECT id, is_verified FROM clients WHERE email = ?').get(cleanEmail) as {
      id: string;
      is_verified: number;
    } | undefined;

    if (existing) {
      if (existing.is_verified === 1) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      } else {
        // Allow re-signing up or resending verification for unverified account
        db.prepare('DELETE FROM clients WHERE email = ? AND is_verified = 0').run(cleanEmail);
      }
    }

    // Call Supabase Auth signUp method
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const redirectUrl = `${origin}/verify-success?email=${encodeURIComponent(cleanEmail)}`;

    let supabaseUserId: string | null = null;

    try {
      const { data, error: sbError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name },
          emailRedirectTo: redirectUrl,
        },
      });

      if (data?.user?.id) {
        supabaseUserId = data.user.id;
      }
    } catch (e) {
      console.warn('Supabase Auth signUp call skipped or operating in local mode:', e);
    }

    // Create client row (linked to Auth user id if available, else generated UUID)
    const clientId = supabaseUserId || 'client_' + crypto.randomUUID().slice(0, 8);
    const passwordHash = hashPassword(password);

    db.prepare(`
      INSERT INTO clients (id, name, email, password_hash, is_verified)
      VALUES (?, ?, ?, ?, 0)
    `).run(clientId, name, cleanEmail, passwordHash);

    // Send verification email link (logged to Outbox & Resend API ready)
    const verifyLink = `${origin}/verify-success?email=${encodeURIComponent(cleanEmail)}`;
    await sendEmail({
      to: cleanEmail,
      subject: 'Verify your SocialSuite account email',
      body: `Hi ${name},\n\nThank you for signing up for SocialSuite! Please click the link below to verify your email address and activate your account:\n\n${verifyLink}\n\nOnce verified, you will be automatically routed to your client dashboard.\n\nBest regards,\nSocialSuite Team`,
    });

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      message: "We've sent a verification link to your email. Click it to activate your account.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sign up failed' }, { status: 500 });
  }
}
