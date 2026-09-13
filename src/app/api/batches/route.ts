import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  
  if (user.role === 'client') {
    // Resolve client DB ID via user.id or user.email
    const clientRow = db.prepare(`
      SELECT id, email FROM clients WHERE id = ? OR LOWER(email) = LOWER(?)
    `).get(user.id, user.email) as { id: string; email: string } | undefined;

    const clientId = clientRow?.id || user.id;
    const clientEmail = clientRow?.email || user.email;

    // Get latest batch for this client
    const batch = db.prepare(`
      SELECT b.*, c.name as client_name, c.email as client_email
      FROM batches b
      JOIN clients c ON c.id = b.client_id
      WHERE b.client_id = ? OR LOWER(c.email) = LOWER(?)
      ORDER BY b.created_at DESC
      LIMIT 1
    `).get(clientId, clientEmail) as any;

    if (!batch) {
      return NextResponse.json({ batch: null, items: [] });
    }

    const items = db.prepare(`
      SELECT ci.*, 
        (SELECT er.client_note FROM edit_requests er WHERE er.content_item_id = ci.id AND er.status != 'done' ORDER BY er.created_at DESC LIMIT 1) as client_note,
        (SELECT er.id FROM edit_requests er WHERE er.content_item_id = ci.id AND er.status != 'done' ORDER BY er.created_at DESC LIMIT 1) as active_edit_request_id
      FROM content_items ci
      WHERE ci.batch_id = ?
      ORDER BY ci.day_number ASC, ci.created_at ASC
    `).all(batch.id);

    return NextResponse.json({ batch, items });
  }

  const targetClientId = searchParams.get('client_id');
  if (targetClientId) {
    // Get latest batch for specific client
    const batch = db.prepare(`
      SELECT b.*, c.name as client_name, c.email as client_email
      FROM batches b
      JOIN clients c ON c.id = b.client_id
      WHERE b.client_id = ? OR LOWER(c.email) = LOWER(?)
      ORDER BY b.created_at DESC
      LIMIT 1
    `).get(targetClientId, targetClientId) as any;

    if (!batch) {
      return NextResponse.json({ batch: null, items: [] });
    }

    const items = db.prepare(`
      SELECT ci.*, 
        (SELECT er.client_note FROM edit_requests er WHERE er.content_item_id = ci.id AND er.status != 'done' ORDER BY er.created_at DESC LIMIT 1) as client_note,
        (SELECT er.id FROM edit_requests er WHERE er.content_item_id = ci.id AND er.status != 'done' ORDER BY er.created_at DESC LIMIT 1) as active_edit_request_id
      FROM content_items ci
      WHERE ci.batch_id = ?
      ORDER BY ci.day_number ASC, ci.created_at ASC
    `).all(batch.id);

    return NextResponse.json({ batch, items });
  }

  // Admin fetching overview of all batches
  if (user.role === 'admin') {
    const batches = db.prepare(`
      SELECT b.*, c.name as client_name, c.email as client_email,
        (SELECT COUNT(*) FROM content_items ci WHERE ci.batch_id = b.id) as item_count,
        (SELECT COUNT(*) FROM content_items ci WHERE ci.batch_id = b.id AND ci.status = 'approved') as approved_count,
        (SELECT COUNT(*) FROM content_items ci WHERE ci.batch_id = b.id AND ci.status = 'edit_requested') as edit_requested_count
      FROM batches b
      JOIN clients c ON c.id = b.client_id
      ORDER BY b.created_at DESC
    `).all();

    return NextResponse.json({ batches });
  }

  return NextResponse.json({ error: 'Client ID parameter required' }, { status: 400 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { client_id, week_start_date, week_end_date, items } = await request.json();

    if (!client_id || !week_start_date || !week_end_date || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required batch metadata or items list' }, { status: 400 });
    }

    const batchId = 'batch_' + crypto.randomUUID().slice(0, 8);

    db.prepare(`
      INSERT INTO batches (id, client_id, week_start_date, week_end_date)
      VALUES (?, ?, ?, ?)
    `).run(batchId, client_id, week_start_date, week_end_date);

    const insertItem = db.prepare(`
      INSERT INTO content_items (id, batch_id, day_number, type, file_url, caption, hashtags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

    for (const item of items) {
      if (!item.file_url || !item.day_number || !item.type) continue;
      const itemId = 'item_' + crypto.randomUUID().slice(0, 8);
      insertItem.run(
        itemId,
        batchId,
        item.day_number,
        item.type,
        item.file_url,
        item.caption || '',
        item.hashtags || ''
      );
    }

    // Add notification to client about new batch ready
    const client = db.prepare('SELECT name FROM clients WHERE id = ?').get(client_id) as { name: string } | undefined;
    db.prepare(`
      INSERT INTO notifications (id, recipient_role, recipient_id, message)
      VALUES (?, 'client', ?, ?)
    `).run(
      'notif_' + crypto.randomUUID().slice(0, 8),
      client_id,
      `Your new 7-day content batch (${week_start_date} - ${week_end_date}) is ready for review!`
    );

    return NextResponse.json({ success: true, batchId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create batch' }, { status: 500 });
  }
}
