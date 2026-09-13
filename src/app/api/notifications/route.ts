import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let notifications: any[] = [];
  if (user.role === 'admin') {
    notifications = db.prepare(`
      SELECT n.*, ci.day_number, ci.type, ci.file_url, c.name as client_name
      FROM notifications n
      LEFT JOIN content_items ci ON ci.id = n.related_content_item_id
      LEFT JOIN batches b ON b.id = ci.batch_id
      LEFT JOIN clients c ON c.id = b.client_id
      WHERE n.recipient_role = 'admin'
      ORDER BY n.created_at DESC
      LIMIT 30
    `).all();
  } else {
    notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE recipient_role = 'client' AND recipient_id = ?
      ORDER BY created_at DESC
      LIMIT 30
    `).all(user.id);
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, markAllRead } = await request.json();

  if (markAllRead) {
    if (user.role === 'admin') {
      db.prepare(`UPDATE notifications SET is_read = 1 WHERE recipient_role = 'admin'`).run();
    } else {
      db.prepare(`UPDATE notifications SET is_read = 1 WHERE recipient_role = 'client' AND recipient_id = ?`).run(user.id);
    }
    return NextResponse.json({ success: true });
  }

  if (id) {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Notification ID or markAllRead parameter required' }, { status: 400 });
}
