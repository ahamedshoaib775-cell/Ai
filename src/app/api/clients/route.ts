import { NextResponse } from 'next/server';
import db, { hashPassword } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const clients = db.prepare(`
    SELECT c.id, c.name, c.email, c.created_at, 
           (SELECT COUNT(*) FROM batches b WHERE b.client_id = c.id) as batch_count
    FROM clients c
    ORDER BY c.created_at DESC
  `).all();

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM clients WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'Client with this email already exists' }, { status: 400 });
    }

    const clientId = 'client_' + crypto.randomUUID().slice(0, 8);
    const passwordHash = hashPassword(password);

    db.prepare(`
      INSERT INTO clients (id, name, email, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(clientId, name, email.toLowerCase(), passwordHash);

    return NextResponse.json({
      success: true,
      client: { id: clientId, name, email, created_at: new Date().toISOString() },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create client' }, { status: 500 });
  }
}
