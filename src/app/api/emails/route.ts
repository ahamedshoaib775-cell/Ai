import { NextResponse } from 'next/server';
import { getOutboxEmails } from '@/lib/email';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const emails = getOutboxEmails();
  return NextResponse.json({ emails });
}
