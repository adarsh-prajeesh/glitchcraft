import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSeedEmbedding } from './biometric.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'aegis_mfa.db');

export const db = new Database(dbPath);

// Enable WAL mode for high performance
db.pragma('journal_mode = WAL');

// Drop and recreate or alter cleanly
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    clearance_level INTEGER NOT NULL DEFAULT 1,
    face_embedding TEXT NOT NULL,
    reference_photo TEXT,
    barcode_payload TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    step1_face_passed INTEGER DEFAULT 0,
    step2_barcode_passed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
  );
`);

// Reset and seed default personnel profiles if empty or for clean state
const count = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;

if (count === 0) {
  console.log('[DB] Seeding biometric & barcode security profiles...');

  const insertUser = db.prepare(`
    INSERT INTO users (
      id, name, email, role, department, clearance_level,
      face_embedding, barcode_payload, avatar_url
    ) VALUES (
      @id, @name, @email, @role, @department, @clearance_level,
      @face_embedding, @barcode_payload, @avatar_url
    )
  `);

  const initialUsers = [
    {
      id: 'SEC-8801',
      name: 'Dr. Elena Vance',
      email: 'e.vance@blackmesa.defense.gov',
      role: 'Chief Biometric Research Scientist',
      department: 'Quantum & Biometrics Division',
      clearance_level: 5,
      face_embedding: JSON.stringify(generateSeedEmbedding('elena_vance_biometric_seed_v5')),
      barcode_payload: 'AUTH-VANCE-8801-L5',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'SEC-8802',
      name: 'Major Alex Mercer',
      email: 'a.mercer@aegis.defense.gov',
      role: 'Director of Tactical Infrastructure',
      department: 'Physical Security & Cyber Warfare',
      clearance_level: 4,
      face_embedding: JSON.stringify(generateSeedEmbedding('alex_mercer_biometric_seed_v4')),
      barcode_payload: 'AUTH-MERCER-8802-L4',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'SEC-8803',
      name: 'Sarah Connor',
      email: 's.connor@skyguard.defense.gov',
      role: 'Operations Security Architect',
      department: 'Autonomous Systems Defense',
      clearance_level: 5,
      face_embedding: JSON.stringify(generateSeedEmbedding('sarah_connor_biometric_seed_v5')),
      barcode_payload: 'AUTH-CONNOR-8803-L5',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80'
    }
  ];

  for (const user of initialUsers) {
    insertUser.run(user);
  }

  // Pre-seed some realistic audit log entries
  const insertLog = db.prepare(`
    INSERT INTO audit_logs (user_id, user_name, event_type, step_reached, failure_reason, ip_address, user_agent, latency_ms, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  insertLog.run('SEC-8801', 'Dr. Elena Vance', 'LOGIN_SUCCESS', 2, null, '192.168.1.104', 'Aegis Biometric Camera #1', 640, '-2 hours');
  insertLog.run('SEC-8802', 'Major Alex Mercer', 'LOGIN_SUCCESS', 2, null, '10.0.4.12', 'Aegis Optical Gate #4', 580, '-5 hours');
  insertLog.run(null, 'Unknown Subject', 'LOGIN_FAILED', 1, 'Face cosine similarity 0.44 below threshold 0.80', '10.0.12.89', 'External Camera Stream', 320, '-12 hours');
  insertLog.run('SEC-8803', 'Sarah Connor', 'LOGIN_SUCCESS', 2, null, '192.168.1.18', 'Aegis Biometric Terminal', 610, '-1 day');

  console.log('[DB] Seeding completed.');
}
