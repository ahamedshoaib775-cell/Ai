import { NextResponse } from 'next/server';
import { getOutboxEmails } from '@/lib/email';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const emails = await getOutboxEmails();
  return NextResponse.json({ emails });
}
