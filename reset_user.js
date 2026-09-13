const Database = require('better-sqlite3');
const db = new Database('content_approval.db');

const client = db.prepare('SELECT id FROM clients WHERE email = ?').get('ahamedshoaib775@gmail.com');
if (client) {
  db.prepare('DELETE FROM batches WHERE client_id = ?').run(client.id);
  db.prepare("UPDATE clients SET onboarding_completed = 0, business_niche = '', business_description = '', brand_tone = '' WHERE id = ?").run(client.id);
  console.log('Reset ahamedshoaib775@gmail.com onboarding state!');
}
