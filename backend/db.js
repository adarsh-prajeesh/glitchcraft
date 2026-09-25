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

console.log('[DB] Digital Identity Wallet & Cryptographic Proof Database initialized.');
