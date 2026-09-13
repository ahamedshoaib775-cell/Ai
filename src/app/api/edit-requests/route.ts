import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = db.prepare(`
    SELECT er.*, ci.day_number, ci.type, ci.file_url, ci.caption, ci.hashtags, ci.status as item_status,
           c.name as client_name, c.email as client_email, b.client_id
    FROM edit_requests er
    JOIN content_items ci ON ci.id = er.content_item_id
    JOIN batches b ON b.id = ci.batch_id
    JOIN clients c ON c.id = b.client_id
    ORDER BY er.created_at DESC
  `).all();

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'client') {
    return NextResponse.json({ error: 'Unauthorized: Only clients can request edits' }, { status: 403 });
  }

  try {
    const { content_item_id, client_note } = await request.json();

    if (!content_item_id || !client_note) {
      return NextResponse.json({ error: 'Content item ID and note are required' }, { status: 400 });
    }

    // Verify ownership
    const item = db.prepare(`
      SELECT ci.*, c.name as client_name, b.client_id
      FROM content_items ci
      JOIN batches b ON b.id = ci.batch_id
      JOIN clients c ON c.id = b.client_id
      WHERE ci.id = ?
    `).get(content_item_id) as any;

    if (!item) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
    }

    const clientRow = db.prepare('SELECT id FROM clients WHERE id = ? OR LOWER(email) = LOWER(?)').get(user.id, user.email) as { id: string } | undefined;
    const canonicalClientId = clientRow?.id || user.id;

    if (item.client_id !== canonicalClientId) {
      return NextResponse.json({ error: 'Forbidden: Cannot edit content of another client' }, { status: 403 });
    }

    // 1. Create edit request entry
    const requestId = 'edit_req_' + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO edit_requests (id, content_item_id, client_note, status)
      VALUES (?, ?, ?, 'open')
    `).run(requestId, content_item_id, client_note);

    // 2. Set item status to edit_requested
    db.prepare(`
      UPDATE content_items SET status = 'edit_requested' WHERE id = ?
    `).run(content_item_id);

    // 3. Create notification for admin
    const typeTitle = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    const notificationMessage = `Edit requested: ${item.client_name} — Day ${item.day_number} [${typeTitle}]`;
    const notifId = 'notif_' + crypto.randomUUID().slice(0, 8);

    db.prepare(`
      INSERT INTO notifications (id, recipient_role, recipient_id, message, related_content_item_id, is_read)
      VALUES (?, 'admin', 'admin', ?, ?, 0)
    `).run(notifId, notificationMessage, content_item_id);

    // 4. Send transactional email to Admin
    const emailSubject = `Edit requested: ${item.client_name} — Day ${item.day_number} [${typeTitle}]`;
    const emailBody = `Client ${item.client_name} requested edits on Day ${item.day_number} [${typeTitle}]:

Client Note:
"${client_note}"

View and resolve request in Admin Panel:
/admin/requests?item_id=${content_item_id}`;

    await sendEmail({
      to: 'admin@socialsuite.com',
      subject: emailSubject,
      body: emailBody,
      contentItemId: content_item_id,
    });

    return NextResponse.json({
      success: true,
      requestId,
      message: 'Got it — this will be edited within 10–15 minutes.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit edit request' }, { status: 500 });
  }
}
