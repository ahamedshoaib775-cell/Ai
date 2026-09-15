import { supabase } from './supabase';
import crypto from 'crypto';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'socialsuite_salt').digest('hex');
}

// Check if running on Vercel or local environment
let sqliteDb: any = null;
if (!process.env.VERCEL) {
  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const fs = require('fs');
    const dbPath = path.resolve(process.cwd(), 'content_approval.db');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    sqliteDb = new Database(dbPath, { timeout: 10000 });
    try { sqliteDb.pragma('journal_mode = WAL'); } catch (e) {}
    initDbSchema(sqliteDb);
  } catch (err) {
    console.warn('SQLite unavailable, fallback to Supabase Cloud DB:', err);
    sqliteDb = null;
  }
}

function initDbSchema(dbInstance: any) {
  try {
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_verified INTEGER DEFAULT 1,
        business_niche TEXT DEFAULT '',
        business_description TEXT DEFAULT '',
        brand_tone TEXT DEFAULT '',
        onboarding_completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        week_start_date TEXT NOT NULL,
        week_end_date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS content_items (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        day_number INTEGER CHECK(day_number BETWEEN 1 AND 7),
        type TEXT CHECK(type IN ('post', 'reel', 'story')),
        file_url TEXT NOT NULL,
        caption TEXT,
        hashtags TEXT,
        status TEXT CHECK(status IN ('pending', 'approved', 'edit_requested')) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS edit_requests (
        id TEXT PRIMARY KEY,
        content_item_id TEXT NOT NULL,
        client_note TEXT NOT NULL,
        status TEXT CHECK(status IN ('open', 'in_progress', 'done')) DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        recipient_role TEXT CHECK(recipient_role IN ('admin', 'client')),
        recipient_id TEXT NOT NULL,
        message TEXT NOT NULL,
        related_content_item_id TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS emails_outbox (
        id TEXT PRIMARY KEY,
        to_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT DEFAULT 'sent',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    // schema init ok
  }
}

async function executeSupabaseQuery(sql: string, params: any[], mode: 'get' | 'all' | 'run'): Promise<any> {
  const normalizedSql = sql.trim().replace(/\s+/g, ' ');

  // 1. CLIENTS queries
  if (/FROM clients/i.test(normalizedSql) || /INTO clients/i.test(normalizedSql) || /UPDATE clients/i.test(normalizedSql) || /DELETE FROM clients/i.test(normalizedSql)) {
    if (/SELECT \* FROM clients WHERE email = \?/i.test(normalizedSql) || /SELECT id, name FROM clients WHERE email = \?/i.test(normalizedSql)) {
      const email = params[0]?.toLowerCase();
      const { data } = await supabase.from('clients').select('*').ilike('email', email).maybeSingle();
      return data || undefined;
    }
    if (/SELECT \* FROM clients WHERE id = \? OR LOWER\(email\) = LOWER\(\?\)/i.test(normalizedSql) || /SELECT id, email FROM clients WHERE id = \? OR LOWER\(email\) = LOWER\(\?\)/i.test(normalizedSql)) {
      const [id, email] = params;
      const { data } = await supabase.from('clients').select('*').or(`id.eq.${id},email.ilike.${email}`).maybeSingle();
      return data || undefined;
    }
    if (/SELECT \* FROM clients WHERE id = \?/i.test(normalizedSql) || /SELECT name FROM clients WHERE id = \?/i.test(normalizedSql)) {
      const id = params[0];
      const { data } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
      return data || undefined;
    }
    if (/SELECT \* FROM clients/i.test(normalizedSql) || /SELECT c\.\*/i.test(normalizedSql)) {
      const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      return data || [];
    }
    if (/INSERT INTO clients/i.test(normalizedSql)) {
      let insertObj: any = {};
      if (params.length === 9) {
        insertObj = {
          id: params[0],
          name: params[1],
          email: params[2],
          password_hash: params[3],
          is_verified: params[4] ?? 1,
          business_niche: params[5] || '',
          business_description: params[6] || '',
          brand_tone: params[7] || '',
          onboarding_completed: params[8] ?? 0,
        };
      } else {
        insertObj = {
          id: params[0],
          name: params[1],
          email: params[2],
          password_hash: params[3],
          is_verified: params[4] ?? 1,
        };
      }
      const { error } = await supabase.from('clients').insert([insertObj]);
      return { success: !error };
    }
    if (/UPDATE clients SET onboarding_completed =/i.test(normalizedSql)) {
      const [niche, desc, tone, completed, id] = params;
      const { error } = await supabase.from('clients').update({
        business_niche: niche,
        business_description: desc,
        brand_tone: tone,
        onboarding_completed: completed,
      }).eq('id', id);
      return { success: !error };
    }
    if (/UPDATE clients SET is_verified = 1/i.test(normalizedSql)) {
      const [id] = params;
      const { error } = await supabase.from('clients').update({ is_verified: 1 }).eq('id', id);
      return { success: !error };
    }
    if (/DELETE FROM clients WHERE id = \?/i.test(normalizedSql)) {
      const [id] = params;
      const { error } = await supabase.from('clients').delete().eq('id', id);
      return { success: !error };
    }
  }

  // 2. BATCHES queries
  if (/FROM batches/i.test(normalizedSql) || /INTO batches/i.test(normalizedSql) || /DELETE FROM batches/i.test(normalizedSql)) {
    if (/SELECT b\.\*, c\.name as client_name/i.test(normalizedSql) && /WHERE b\.id = \?/i.test(normalizedSql)) {
      const [batchId] = params;
      const { data } = await supabase.from('batches').select('*, clients!inner(name, email)').eq('id', batchId).maybeSingle();
      if (!data) return undefined;
      return {
        ...data,
        client_name: data.clients?.name,
        client_email: data.clients?.email,
      };
    }
    if (/SELECT b\.\*, c\.name as client_name/i.test(normalizedSql) && (/WHERE b\.client_id = \?/i.test(normalizedSql) || /ORDER BY b\.created_at DESC LIMIT 1/i.test(normalizedSql))) {
      const [clientId, email] = params;
      const { data } = await supabase.from('batches').select('*, clients!inner(name, email)').or(`client_id.eq.${clientId},clients.email.ilike.${email || clientId}`).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!data) return undefined;
      return {
        ...data,
        client_name: data.clients?.name,
        client_email: data.clients?.email,
      };
    }
    if (/SELECT b\.\*, c\.name as client_name/i.test(normalizedSql)) {
      const { data } = await supabase.from('batches').select('*, clients!inner(name, email), content_items(id, status)').order('created_at', { ascending: false });
      if (!data) return [];
      return data.map((b: any) => ({
        ...b,
        client_name: b.clients?.name,
        client_email: b.clients?.email,
        item_count: b.content_items?.length || 0,
        approved_count: b.content_items?.filter((i: any) => i.status === 'approved').length || 0,
        edit_requested_count: b.content_items?.filter((i: any) => i.status === 'edit_requested').length || 0,
      }));
    }
    if (/INSERT INTO batches/i.test(normalizedSql)) {
      const [id, client_id, week_start_date, week_end_date] = params;
      const { error } = await supabase.from('batches').insert([{ id, client_id, week_start_date, week_end_date }]);
      return { success: !error };
    }
    if (/DELETE FROM batches WHERE client_id = \?/i.test(normalizedSql)) {
      const [client_id] = params;
      const { error } = await supabase.from('batches').delete().eq('client_id', client_id);
      return { success: !error };
    }
  }

  // 3. CONTENT ITEMS queries
  if (/FROM content_items/i.test(normalizedSql) || /INTO content_items/i.test(normalizedSql) || /UPDATE content_items/i.test(normalizedSql)) {
    if (/WHERE ci\.batch_id = \?/i.test(normalizedSql) || /WHERE batch_id = \?/i.test(normalizedSql)) {
      const [batchId] = params;
      const { data } = await supabase.from('content_items').select('*, edit_requests(id, client_note, status, created_at)').eq('batch_id', batchId).order('day_number', { ascending: true }).order('created_at', { ascending: true });
      if (!data) return [];
      return data.map((ci: any) => {
        const openEdits = (ci.edit_requests || []).filter((er: any) => er.status !== 'done').sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return {
          ...ci,
          client_note: openEdits[0]?.client_note || null,
          active_edit_request_id: openEdits[0]?.id || null,
        };
      });
    }
    if (/SELECT ci\.\*, b\.client_id/i.test(normalizedSql) && /WHERE ci\.id = \?/i.test(normalizedSql)) {
      const [id] = params;
      const { data } = await supabase.from('content_items').select('*, batches!inner(client_id)').eq('id', id).maybeSingle();
      if (!data) return undefined;
      return {
        ...data,
        client_id: data.batches?.client_id,
      };
    }
    if (/INSERT INTO content_items/i.test(normalizedSql)) {
      const [id, batch_id, day_number, type, file_url, caption, hashtags, status] = params;
      const { error } = await supabase.from('content_items').insert([{
        id, batch_id, day_number, type, file_url, caption: caption || '', hashtags: hashtags || '', status: status || 'pending'
      }]);
      return { success: !error };
    }
    if (/UPDATE content_items SET/i.test(normalizedSql)) {
      const id = params[params.length - 1];
      const updateData: any = {};
      if (/status = \?/i.test(sql)) updateData.status = params[0];
      if (/file_url = \?/i.test(sql)) updateData.file_url = params[1] || params[0];
      if (/caption = \?/i.test(sql)) updateData.caption = params[2] || params[1] || params[0];
      if (/hashtags = \?/i.test(sql)) updateData.hashtags = params[3] || params[2] || params[1] || params[0];

      const { error } = await supabase.from('content_items').update(updateData).eq('id', id);
      return { success: !error };
    }
  }

  // 4. EDIT REQUESTS queries
  if (/FROM edit_requests/i.test(normalizedSql) || /INTO edit_requests/i.test(normalizedSql) || /UPDATE edit_requests/i.test(normalizedSql)) {
    if (/SELECT er\.\*/i.test(normalizedSql)) {
      const { data } = await supabase.from('edit_requests').select('*, content_items!inner(*, batches!inner(*, clients!inner(*)))').order('created_at', { ascending: false });
      if (!data) return [];
      return data.map((er: any) => ({
        ...er,
        day_number: er.content_items?.day_number,
        type: er.content_items?.type,
        file_url: er.content_items?.file_url,
        client_id: er.content_items?.batches?.client_id,
        client_name: er.content_items?.batches?.clients?.name,
      }));
    }
    if (/INSERT INTO edit_requests/i.test(normalizedSql)) {
      const [id, content_item_id, client_note, status] = params;
      const { error } = await supabase.from('edit_requests').insert([{
        id, content_item_id, client_note, status: status || 'open'
      }]);
      return { success: !error };
    }
    if (/UPDATE edit_requests SET status =/i.test(normalizedSql)) {
      const [status, id] = params;
      const { error } = await supabase.from('edit_requests').update({ status }).eq('id', id);
      return { success: !error };
    }
  }

  // 5. NOTIFICATIONS queries
  if (/FROM notifications/i.test(normalizedSql) || /INTO notifications/i.test(normalizedSql) || /UPDATE notifications/i.test(normalizedSql)) {
    if (/SELECT \* FROM notifications/i.test(normalizedSql)) {
      const [role, recipientId] = params;
      let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (role) query = query.eq('recipient_role', role);
      if (recipientId && recipientId !== 'all') {
        query = query.or(`recipient_id.eq.${recipientId},recipient_id.eq.all`);
      }
      const { data } = await query;
      return data || [];
    }
    if (/INSERT INTO notifications/i.test(normalizedSql)) {
      const [id, recipient_role, recipient_id, message, related_content_item_id, is_read] = params;
      const { error } = await supabase.from('notifications').insert([{
        id, recipient_role, recipient_id, message, related_content_item_id: related_content_item_id || null, is_read: is_read ?? 0
      }]);
      return { success: !error };
    }
    if (/UPDATE notifications SET is_read = 1/i.test(normalizedSql)) {
      if (params.length === 1 && typeof params[0] === 'string') {
        const [id] = params;
        const { error } = await supabase.from('notifications').update({ is_read: 1 }).eq('id', id);
        return { success: !error };
      } else {
        const [role, recipientId] = params;
        let query = supabase.from('notifications').update({ is_read: 1 }).eq('recipient_role', role);
        if (recipientId) query = query.eq('recipient_id', recipientId);
        const { error } = await query;
        return { success: !error };
      }
    }
  }

  // 6. EMAILS OUTBOX queries
  if (/FROM emails_outbox/i.test(normalizedSql) || /INTO emails_outbox/i.test(normalizedSql)) {
    if (/SELECT \* FROM emails_outbox/i.test(normalizedSql)) {
      const { data } = await supabase.from('emails_outbox').select('*').order('created_at', { ascending: false }).limit(50);
      return data || [];
    }
    if (/INSERT INTO emails_outbox/i.test(normalizedSql)) {
      const [id, to_email, subject, body, status] = params;
      const { error } = await supabase.from('emails_outbox').insert([{
        id, to_email, subject, body, status: status || 'sent'
      }]);
      return { success: !error };
    }
  }

  return mode === 'all' ? [] : undefined;
}

const db = {
  prepare: (sql: string) => ({
    get: async (...args: any[]) => {
      if (sqliteDb) {
        try {
          return sqliteDb.prepare(sql).get(...args);
        } catch (e) {
          // fallback to Supabase if SQLite file fails
        }
      }
      return executeSupabaseQuery(sql, args, 'get');
    },
    all: async (...args: any[]) => {
      if (sqliteDb) {
        try {
          return sqliteDb.prepare(sql).all(...args);
        } catch (e) {
          // fallback to Supabase if SQLite file fails
        }
      }
      return executeSupabaseQuery(sql, args, 'all');
    },
    run: async (...args: any[]) => {
      if (sqliteDb) {
        try {
          return sqliteDb.prepare(sql).run(...args);
        } catch (e) {
          // fallback to Supabase if SQLite file fails
        }
      }
      return executeSupabaseQuery(sql, args, 'run');
    },
  }),
  exec: (sql: string) => {
    if (sqliteDb) {
      try { sqliteDb.exec(sql); } catch (e) {}
    }
  },
  transaction: (fn: any) => fn(),
};

export default db;
