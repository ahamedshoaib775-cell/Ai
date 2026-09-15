import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const { status, file_url, caption, hashtags } = body;

  // Check ownership if user is client
  const item = (await db.prepare(`
    SELECT ci.*, b.client_id
    FROM content_items ci
    JOIN batches b ON b.id = ci.batch_id
    WHERE ci.id = ?
  `).get(id)) as { id: string; client_id: string; status: string } | undefined;

  if (!item) {
    return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
  }

  if (user.role === 'client') {
    const clientRow = (await db.prepare('SELECT id FROM clients WHERE id = ? OR LOWER(email) = LOWER(?)').get(user.id, user.email)) as { id: string } | undefined;
    const canonicalClientId = clientRow?.id || user.id;

    if (item.client_id !== canonicalClientId) {
      return NextResponse.json({ error: 'Forbidden: Cannot update content for another client' }, { status: 403 });
    }
  }

  // Update item
  const updates: string[] = [];
  const params: any[] = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  if (file_url !== undefined) {
    updates.push('file_url = ?');
    params.push(file_url);
  }
  if (caption !== undefined) {
    updates.push('caption = ?');
    params.push(caption);
  }
  if (hashtags !== undefined) {
    updates.push('hashtags = ?');
    params.push(hashtags);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  params.push(id);
  await db.prepare(`UPDATE content_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  return NextResponse.json({ success: true, item: { ...item, status, file_url, caption, hashtags } });
}
