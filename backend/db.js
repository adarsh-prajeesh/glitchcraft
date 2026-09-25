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
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    course TEXT NOT NULL,
    age INTEGER NOT NULL,
    face_embedding TEXT NOT NULL,
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
  { id: 'ID-1', name: 'Sreevyas', email: 'sreevyas@example.com', course: 'AI MLL', age: 19, avatar: '/avatars/sreevyas.jpg' },
  { id: 'ID-2', name: 'Daivik', email: 'daivik@example.com', course: 'Computer Science', age: 18, avatar: '/avatars/daivik.jpg' },
  { id: 'ID-3', name: 'Adarsh', email: 'adarsh@example.com', course: 'Computer Science', age: 17, avatar: '/avatars/adarsh.jpg' },
  { id: 'ID-4', name: 'Raghav', email: 'raghav@example.com', course: 'Computer Science', age: 18, avatar: '/avatars/raghav.jpg' },
  { id: 'ID-5', name: 'Shravan', email: 'shravan@example.com', course: 'Computer Science', age: 18, avatar: '/avatars/shravan.jpg' }
];

const deleteExisting = db.prepare('DELETE FROM users WHERE id = ? OR email = ?');
const insertUser = db.prepare(`
  INSERT INTO users (id, name, email, course, age, face_embedding, barcode_payload, avatar_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertClaim = db.prepare(`
  INSERT INTO user_claims (user_id, claim_key, claim_value, category)
  VALUES (?, ?, ?, ?)
`);

for (const u of defaultUsers) {
  const dummyVec = Array.from({ length: 128 }, (_, i) => Math.sin(i + parseInt(u.id.replace('ID-', ''))));
  deleteExisting.run(u.id, u.email);
  insertUser.run(u.id, u.name, u.email, u.course, u.age, JSON.stringify(dummyVec), `BC-${u.id}`, u.avatar);

  db.prepare('DELETE FROM user_claims WHERE user_id = ?').run(u.id);
  insertClaim.run(u.id, 'Name', u.name, 'basic');
  insertClaim.run(u.id, 'Email', u.email, 'basic');
  insertClaim.run(u.id, 'Course / Department', u.course, 'basic');
  insertClaim.run(u.id, 'Age', String(u.age), 'basic');
  insertClaim.run(u.id, 'Student ID', u.id, 'basic');
  insertClaim.run(u.id, 'National SSN / Gov ID', `GOV-ID-${Math.floor(100000 + Math.random() * 900000)}`, 'protected');
  insertClaim.run(u.id, 'Bank Account Details', `ACC-${Math.floor(10000000 + Math.random() * 90000000)}`, 'protected');
}

console.log('[DB] Digital Identity Wallet & Cryptographic Proof Database initialized.');

