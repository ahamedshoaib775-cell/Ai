const Database = require('better-sqlite3');
const db = new Database('content_approval.db');

const client = db.prepare('SELECT id, name FROM clients WHERE email = ?').get('ahamedshoaib775@gmail.com');
if (client) {
  const batchId = 'batch_user_' + Date.now();
  db.prepare('INSERT INTO batches (id, client_id, week_start_date, week_end_date) VALUES (?, ?, ?, ?)').run(batchId, client.id, '2026-09-15', '2026-09-21');

  const items = [
    { d: 1, t: 'post', u: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', c: 'Unveil your natural glow with our new botanical facial serum! Formulated with pure hyaluronic acid.', h: '#SkincareRoutine #GlowSkin #CleanBeauty' },
    { d: 1, t: 'story', u: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80', c: 'Morning routine poll: What is your #1 step for glowing skin?', h: '#SkincarePoll #MorningGlow' },
    { d: 2, t: 'reel', u: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', c: '3 mistakes you are making with your evening skincare application!', h: '#SkincareTips #ReelsInstagram' },
    { d: 3, t: 'post', u: 'https://images.unsplash.com/photo-1512290900673-7002ffffff11?auto=format&fit=crop&w=800&q=80', c: 'Meet our lead aesthetician Sarah walking us through gentle double-cleansing.', h: '#DoubleCleanse #GlowingSkin' },
    { d: 4, t: 'story', u: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80', c: 'Behind the scenes at our lab formulating winter moisturizers!', h: '#BehindTheScenes #CleanBeauty' },
    { d: 5, t: 'post', u: 'https://images.unsplash.com/photo-1608248597261-e4d0450cbf1b?auto=format&fit=crop&w=800&q=80', c: 'Friday Favorites: Our soothing rosewater mist is essential for keeping skin balanced.', h: '#FridayFavorites #Rosewater' },
    { d: 6, t: 'reel', u: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80', c: 'ASMR unboxing of our limited-edition Spa Gift Set ✨', h: '#ASMRUnboxing #SpaSet' },
    { d: 7, t: 'post', u: 'https://images.unsplash.com/photo-1552046122-03184de85e08?auto=format&fit=crop&w=800&q=80', c: 'Sunday Reset: Take 15 minutes tonight for a deep nourishing face mask.', h: '#SundayReset #SelfCareSunday' }
  ];

  const stmt = db.prepare("INSERT INTO content_items (id, batch_id, day_number, type, file_url, caption, hashtags, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')");
  items.forEach((i, idx) => {
    stmt.run('item_u_' + idx + '_' + Date.now(), batchId, i.d, i.t, i.u, i.c, i.h);
  });

  console.log('Sample 7-day content batch created for ahamedshoaib775@gmail.com!');
}
