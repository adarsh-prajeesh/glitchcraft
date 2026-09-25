import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'aegis_mfa.db');

export const db = new Database(dbPath);

// Enable WAL mode for fast concurrency
db.pragma('journal_mode = WAL');

// Digital Identity Wallet & Cryptographic Proof Verification Database Schema
// Add phone and card_number columns dynamically if missing
try { db.exec('ALTER TABLE users ADD COLUMN phone TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN card_number TEXT;'); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    course TEXT NOT NULL,
    age INTEGER NOT NULL,
    phone TEXT,
    card_number TEXT,
    face_embedding TEXT NOT NULL,
    barcode_payload TEXT,
    reference_photo TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    claim_key TEXT NOT NULL,
    claim_value TEXT NOT NULL,
    category TEXT DEFAULT 'basic', -- 'basic' | 'protected'
    is_verified INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS trusted_websites (
    domain TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'trusted', -- 'trusted' | 'blocked'
    public_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    user_name TEXT,
    event_type TEXT NOT NULL,
    step_reached INTEGER DEFAULT 1,
    failure_reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    latency_ms INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    challenge_passed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
  );
`);

// Seed default trusted domains if not present
const seedTrusted = db.prepare('SELECT COUNT(*) as cnt FROM trusted_websites').get().cnt;
if (seedTrusted === 0) {
  const insertTrusted = db.prepare('INSERT INTO trusted_websites (domain, name, status) VALUES (?, ?, ?)');
  insertTrusted.run('localhost', 'Campus Portal Localhost', 'trusted');
  insertTrusted.run('127.0.0.1', 'Local Testing Gateway', 'trusted');
  insertTrusted.run('library.university.edu', 'Central Digital Library', 'trusted');
  insertTrusted.run('gov.portal.service', 'National Identity Portal', 'trusted');
}

// Seed key personnel records for smooth presentation
const defaultUsers = [
  { id: 'ID-1', name: 'Sreevyas', email: 'sreevyas@example.com', course: 'AI MLL', age: 19, phone: '+91 98765 43210', cardNumber: '4532 8912 3456 7890', avatar: '/avatars/sreevyas.jpg' },
  { id: 'ID-2', name: 'Daivik', email: 'daivik@example.com', course: 'Computer Science', age: 18, phone: '+91 98765 43211', cardNumber: '5412 7522 9012 3411', avatar: '/avatars/daivik.jpg' },
  { id: 'ID-3', name: 'Adarsh', email: 'adarsh@example.com', course: 'Computer Science', age: 17, phone: '+91 98765 43212', cardNumber: '4916 2201 8842 1093', avatar: '/avatars/adarsh.jpg' },
  { id: 'ID-4', name: 'Raghav', email: 'raghav@example.com', course: 'Computer Science', age: 18, phone: '+91 98765 43213', cardNumber: '3782 8224 1290 8472', avatar: '/avatars/raghav.jpg' },
  { id: 'ID-5', name: 'Shravan', email: 'shravan@example.com', course: 'Computer Science', age: 18, phone: '+91 98765 43214', cardNumber: '4223 9012 5543 8910', avatar: '/avatars/shravan.jpg' }
];

const deleteExisting = db.prepare('DELETE FROM users WHERE id = ? OR email = ?');
const insertUser = db.prepare(`
  INSERT INTO users (id, name, email, course, age, phone, card_number, face_embedding, barcode_payload, avatar_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertClaim = db.prepare(`
  INSERT INTO user_claims (user_id, claim_key, claim_value, category)
  VALUES (?, ?, ?, ?)
`);

for (const u of defaultUsers) {
  const dummyVec = Array.from({ length: 128 }, (_, i) => Math.sin(i + parseInt(u.id.replace('ID-', ''))));
  deleteExisting.run(u.id, u.email);
  insertUser.run(u.id, u.name, u.email, u.course, u.age, u.phone, u.cardNumber, JSON.stringify(dummyVec), `BC-${u.id}`, u.avatar);

  db.prepare('DELETE FROM user_claims WHERE user_id = ?').run(u.id);
  insertClaim.run(u.id, 'Name', u.name, 'basic');
  insertClaim.run(u.id, 'Email', u.email, 'basic');
  insertClaim.run(u.id, 'Course / Department', u.course, 'basic');
  insertClaim.run(u.id, 'Age', String(u.age), 'basic');
  insertClaim.run(u.id, 'Phone Number', u.phone, 'basic');
  insertClaim.run(u.id, 'Credit Card Number', u.cardNumber, 'protected');
  insertClaim.run(u.id, 'Student ID', u.id, 'basic');
  insertClaim.run(u.id, 'National SSN / Gov ID', `GOV-ID-${Math.floor(100000 + Math.random() * 900000)}`, 'protected');
  insertClaim.run(u.id, 'Bank Account Details', `ACC-${Math.floor(10000000 + Math.random() * 90000000)}`, 'protected');

  // Seed session_id tokens for auto-login
  db.prepare(`
    INSERT OR REPLACE INTO auth_sessions (session_id, user_id, expires_at)
    VALUES (?, ?, DATETIME('now', '+1 year'))
  `).run(u.id, u.id);

  db.prepare(`
    INSERT OR REPLACE INTO auth_sessions (session_id, user_id, expires_at)
    VALUES (?, ?, DATETIME('now', '+1 year'))
  `).run(`SESSION-${u.id}`, u.id);
}

console.log('[DB] Digital Identity Wallet & Cryptographic Proof Database initialized.');

