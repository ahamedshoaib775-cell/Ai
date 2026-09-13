import { NextResponse } from 'next/server';
import db, { hashPassword } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fetchAll = searchParams.get('all') === 'true' || user.role === 'admin';

  if (fetchAll) {
    const clients = db.prepare(`
      SELECT c.id, c.name, c.email, c.is_verified, c.business_niche, c.business_description, c.brand_tone, c.onboarding_completed, c.created_at, 
             (SELECT COUNT(*) FROM batches b WHERE b.client_id = c.id OR LOWER(b.client_id) = LOWER(c.email)) as batch_count
      FROM clients c
      ORDER BY c.created_at DESC
    `).all();
    return NextResponse.json({ clients });
  }

  // If user is client and not requesting all, return single client profile
  const client = db.prepare(`
    SELECT id, name, email, is_verified, business_niche, business_description, brand_tone, onboarding_completed, created_at
    FROM clients
    WHERE id = ? OR LOWER(email) = LOWER(?)
  `).get(user.id, user.email);

  return NextResponse.json({ client });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, email, password, business_niche, business_description, brand_tone } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM clients WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'Client with this email already exists' }, { status: 400 });
    }

    const clientId = 'client_' + crypto.randomUUID().slice(0, 8);
    const passwordHash = hashPassword(password);
    const hasNiche = business_niche ? 1 : 0;

    db.prepare(`
      INSERT INTO clients (id, name, email, password_hash, is_verified, business_niche, business_description, brand_tone, onboarding_completed)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).run(
      clientId,
      name,
      email.toLowerCase(),
      passwordHash,
      business_niche || '',
      business_description || '',
      brand_tone || '',
      hasNiche
    );

    return NextResponse.json({
      success: true,
      client: { id: clientId, name, email, created_at: new Date().toISOString() },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create client' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, business_niche, business_description, brand_tone, onboarding_completed } = await request.json();

    const targetClientId = user.role === 'admin' ? (await request.json()).client_id || user.id : user.id;

    db.prepare(`
      UPDATE clients 
      SET name = COALESCE(?, name),
          business_niche = COALESCE(?, business_niche),
          business_description = COALESCE(?, business_description),
          brand_tone = COALESCE(?, brand_tone),
          onboarding_completed = COALESCE(?, onboarding_completed)
      WHERE id = ?
    `).run(
      name || null,
      business_niche !== undefined ? business_niche : null,
      business_description !== undefined ? business_description : null,
      brand_tone !== undefined ? brand_tone : null,
      onboarding_completed !== undefined ? onboarding_completed : null,
      targetClientId
    );

    const updatedClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(targetClientId);
    return NextResponse.json({ success: true, client: updatedClient });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update business profile' }, { status: 500 });
  }
}
