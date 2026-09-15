import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const { replacement_file_url, new_caption, new_hashtags, status } = await request.json();

  const editReq = (await db.prepare(`
    SELECT er.*, ci.id as item_id, ci.day_number, ci.type, b.client_id, c.name as client_name
    FROM edit_requests er
    JOIN content_items ci ON ci.id = er.content_item_id
    JOIN batches b ON b.id = ci.batch_id
    JOIN clients c ON c.id = b.client_id
    WHERE er.id = ?
  `).get(id)) as any;

  if (!editReq) {
    return NextResponse.json({ error: 'Edit request not found' }, { status: 404 });
  }

  // Update edit request status
  await db.prepare(`UPDATE edit_requests SET status = ? WHERE id = ?`).run(status || 'done', id);

  // If marking done, update item back to 'pending' with optional new media/caption
  if ((status || 'done') === 'done') {
    const itemUpdates: string[] = ["status = 'pending'"];
    const itemParams: any[] = [];

    if (replacement_file_url) {
      itemUpdates.push('file_url = ?');
      itemParams.push(replacement_file_url);
    }
    if (new_caption !== undefined) {
      itemUpdates.push('caption = ?');
      itemParams.push(new_caption);
    }
    if (new_hashtags !== undefined) {
      itemUpdates.push('hashtags = ?');
      itemParams.push(new_hashtags);
    }

    itemParams.push(editReq.item_id);
    await db.prepare(`UPDATE content_items SET ${itemUpdates.join(', ')} WHERE id = ?`).run(...itemParams);

    // Notify client in-app
    const typeTitle = editReq.type.charAt(0).toUpperCase() + editReq.type.slice(1);
    const notifMessage = `Your edit for Day ${editReq.day_number} [${typeTitle}] has been updated and is ready for review!`;
    await db.prepare(`
      INSERT INTO notifications (id, recipient_role, recipient_id, message, related_content_item_id, is_read)
      VALUES (?, 'client', ?, ?, ?, 0)
    `).run('notif_' + crypto.randomUUID().slice(0, 8), editReq.client_id, notifMessage, editReq.item_id);
  }

  return NextResponse.json({ success: true, message: 'Edit request marked as done' });
}
