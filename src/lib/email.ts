import db from './db';
import crypto from 'crypto';

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  contentItemId?: string;
}

export async function sendEmail({ to, subject, body }: SendEmailPayload): Promise<{ success: boolean; id: string }> {
  const id = 'email_' + crypto.randomUUID();

  // 1. Record email in SQLite outbox table for live visual inspection inside Admin panel
  try {
    db.prepare(`
      INSERT INTO emails_outbox (id, to_email, subject, body, status)
      VALUES (?, ?, ?, ?, 'sent')
    `).run(id, to, subject, body);
  } catch (e) {
    console.error('Failed to log email to outbox:', e);
  }

  // 2. If Resend API Key is set in process.env, dispatch via Resend HTTP API
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'SocialSuite <notifications@socialsuite.com>',
          to: [to],
          subject,
          html: `<div style="font-family: sans-serif; padding: 20px; color: #050505;">
            <h2 style="color: #0866FF; font-size: 20px;">${subject}</h2>
            <div style="background: #F0F2F5; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #E4E6EA;">
              ${body.replace(/\n/g, '<br/>')}
            </div>
            <p style="font-size: 12px; color: #65676B;">SocialSuite Media Approval Platform</p>
          </div>`,
        }),
      });
    } catch (err) {
      console.warn('Resend API dispatch error (logged in local outbox):', err);
    }
  }

  console.log(`[EMAIL DISPATCHED] To: ${to} | Subject: ${subject}`);

  return { success: true, id };
}

export function getOutboxEmails() {
  return db.prepare('SELECT * FROM emails_outbox ORDER BY created_at DESC LIMIT 50').all();
}
