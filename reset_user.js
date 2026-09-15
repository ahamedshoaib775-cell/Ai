const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'content_approval.db');
const db = new Database(dbPath, { timeout: 10000 });

try {
  const client = db.prepare('SELECT id FROM clients WHERE email = ?').get('ahamedshoaib775@gmail.com');
  if (client) {
    db.prepare('DELETE FROM batches WHERE client_id = ?').run(client.id);
    db.prepare("UPDATE clients SET onboarding_completed = 0, business_niche = '', business_description = '', brand_tone = '' WHERE id = ?").run(client.id);
    console.log('Reset ahamedshoaib775@gmail.com onboarding state!');
  }
} finally {
  db.close();
}
