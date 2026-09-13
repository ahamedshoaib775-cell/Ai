import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const client = db.prepare('SELECT id, name, email FROM clients WHERE email = ?').get(cleanEmail) as {
      id: string;
      name: string;
      email: string;
    } | undefined;

    if (!client) {
      return NextResponse.json({ error: 'Client account not found' }, { status: 404 });
    }

    // Set is_verified = 1
    db.prepare('UPDATE clients SET is_verified = 1 WHERE email = ?').run(cleanEmail);

    // Issue session cookie so client is automatically logged in and routed to /dashboard
    const userSession = {
      id: client.id,
      name: client.name,
      email: client.email,
      role: 'client' as const,
    };

    const token = signToken(userSession);
    const response = NextResponse.json({ success: true, user: userSession });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}
