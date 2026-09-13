import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const dbPath = path.join(process.cwd(), 'content_approval.db');

let instance: InstanceType<typeof Database> | null = null;
let isInitialized = false;

export function getDb(): InstanceType<typeof Database> {
  if (!instance) {
    instance = new Database(dbPath, { timeout: 10000 });
    try {
      instance.pragma('journal_mode = WAL');
    } catch (e) {
      // WAL pragma ok
    }
  }

  if (!isInitialized) {
    isInitialized = true;
    initDbSchema(instance);
  }

  return instance;
}

const db = {
  prepare: (sql: string) => getDb().prepare(sql),
  transaction: (fn: any) => getDb().transaction(fn),
  exec: (sql: string) => getDb().exec(sql),
};

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'socialsuite_salt').digest('hex');
}

function initDbSchema(dbInstance: InstanceType<typeof Database>) {
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

  // Migrations for existing database instances
  try { dbInstance.exec('ALTER TABLE clients ADD COLUMN is_verified INTEGER DEFAULT 1;'); } catch (e) {}
  try { dbInstance.exec("ALTER TABLE clients ADD COLUMN business_niche TEXT DEFAULT '';"); } catch (e) {}
  try { dbInstance.exec("ALTER TABLE clients ADD COLUMN business_description TEXT DEFAULT '';"); } catch (e) {}
  try { dbInstance.exec("ALTER TABLE clients ADD COLUMN brand_tone TEXT DEFAULT '';"); } catch (e) {}
  try { dbInstance.exec('ALTER TABLE clients ADD COLUMN onboarding_completed INTEGER DEFAULT 0;'); } catch (e) {}

  const clientCount = dbInstance.prepare('SELECT count(*) as count FROM clients').get() as { count: number };
  if (clientCount.count === 0) {
    seedInitialData(dbInstance);
  }
}

function seedInitialData(dbInstance: InstanceType<typeof Database>) {
  const glowId = 'client_glow_skincare';
  const apexId = 'client_apex_fitness';
  const defaultPassword = hashPassword('client123');

  // Add demo clients (mark glow skincare onboarding_completed = 1)
  dbInstance.prepare(`
    INSERT INTO clients (id, name, email, password_hash, is_verified, business_niche, business_description, brand_tone, onboarding_completed)
    VALUES (?, ?, ?, ?, 1, 'Beauty & Skincare', 'Botanical skincare products and natural facial treatments.', 'Elegant, inspiring, clean', 1)
  `).run(glowId, 'Glow Skincare Co.', 'glow@skincare.com', defaultPassword);

  dbInstance.prepare(`
    INSERT INTO clients (id, name, email, password_hash, is_verified, business_niche, business_description, brand_tone, onboarding_completed)
    VALUES (?, ?, ?, ?, 1, 'Fitness & Wellness', 'High-intensity fitness studio and wellness coaching.', 'Energetic, motivational', 0)
  `).run(apexId, 'Apex Fitness Studio', 'apex@fitness.com', defaultPassword);

  const batchId = 'batch_glow_week1';
  dbInstance.prepare(`
    INSERT INTO batches (id, client_id, week_start_date, week_end_date)
    VALUES (?, ?, ?, ?)
  `).run(batchId, glowId, '2026-09-15', '2026-09-21');

  const sampleItems = [
    {
      id: 'item_glow_d1_post',
      day_number: 1,
      type: 'post',
      file_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
      caption: 'Unveil your natural glow with our new botanical facial serum! Formulated with pure hyaluronic acid and organic chamomile for instant hydration.',
      hashtags: '#SkincareRoutine #GlowSkin #BotanicalBeauty #CleanBeauty #HydrationBoost',
      status: 'pending',
    },
    {
      id: 'item_glow_d1_story',
      day_number: 1,
      type: 'story',
      file_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
      caption: 'Morning routine poll: What is your #1 step for glowing skin in the morning?',
      hashtags: '#SkincarePoll #MorningGlow #SelfCare',
      status: 'pending',
    },
    {
      id: 'item_glow_d2_reel',
      day_number: 2,
      type: 'reel',
      file_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
      caption: '3 mistakes you are making with your evening skincare application (and how to fix them today!).',
      hashtags: '#SkincareTips #ReelsInstagram #SkinCareHacks #EveningRoutine',
      status: 'edit_requested',
    },
    {
      id: 'item_glow_d3_post',
      day_number: 3,
      type: 'post',
      file_url: 'https://images.unsplash.com/photo-1512290900673-7002ffffff11?auto=format&fit=crop&w=800&q=80',
      caption: 'Meet our lead aesthetician Sarah as she walks us through the gentle double-cleansing method.',
      hashtags: '#AestheticianAdvice #DoubleCleanse #GentleSkincare #GlowingSkin',
      status: 'approved',
    },
    {
      id: 'item_glow_d4_story',
      day_number: 4,
      type: 'story',
      file_url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80',
      caption: 'Behind the scenes at our lab formulating the winter moisturizers!',
      hashtags: '#BehindTheScenes #CleanBeauty #LabFresh',
      status: 'pending',
    },
    {
      id: 'item_glow_d5_post',
      day_number: 5,
      type: 'post',
      file_url: 'https://images.unsplash.com/photo-1608248597261-e4d0450cbf1b?auto=format&fit=crop&w=800&q=80',
      caption: 'Friday Favorites: Our soothing rosewater mist is essential for keeping skin balanced all day.',
      hashtags: '#FridayFavorites #RosewaterMist #SkinRefresher #DailyGlow',
      status: 'pending',
    },
    {
      id: 'item_glow_d6_reel',
      day_number: 6,
      type: 'reel',
      file_url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80',
      caption: 'ASMR unboxing of our limited-edition Spa Gift Set ✨',
      hashtags: '#ASMRUnboxing #SpaSet #GiftIdeas #Relaxation',
      status: 'approved',
    },
    {
      id: 'item_glow_d7_post',
      day_number: 7,
      type: 'post',
      file_url: 'https://images.unsplash.com/photo-1552046122-03184de85e08?auto=format&fit=crop&w=800&q=80',
      caption: 'Sunday Reset: Take 15 minutes tonight for a deep nourishing face mask.',
      hashtags: '#SundayReset #SelfCareSunday #FaceMaskNight #SkincareCommunity',
      status: 'pending',
    },
  ];

  const insertItem = dbInstance.prepare(`
    INSERT INTO content_items (id, batch_id, day_number, type, file_url, caption, hashtags, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of sampleItems) {
    insertItem.run(
      item.id,
      batchId,
      item.day_number,
      item.type,
      item.file_url,
      item.caption,
      item.hashtags,
      item.status
    );
  }

  dbInstance.prepare(`
    INSERT INTO edit_requests (id, content_item_id, client_note, status)
    VALUES (?, ?, ?, ?)
  `).run(
    'edit_req_d2',
    'item_glow_d2_reel',
    'Could we change the caption font emphasis and add a call to action at the end to check out our bio link?',
    'open'
  );

  dbInstance.prepare(`
    INSERT INTO notifications (id, recipient_role, recipient_id, message, related_content_item_id, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'notif_admin_1',
    'admin',
    'admin',
    'Edit requested: Glow Skincare Co. — Day 2 [Reel]',
    'item_glow_d2_reel',
    0
  );
}

export default db;
