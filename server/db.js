const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'workden_idcard.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance & safe concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    -- Authenticated Users Table (login accounts)
    CREATE TABLE IF NOT EXISTS auth_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('ADMIN', 'STAFF', 'USER')),
      full_name TEXT NOT NULL,
      profile_id INTEGER,
      profile_type TEXT CHECK(profile_type IN ('STAFF', 'USER')),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Departments table
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Designations table
    CREATE TABLE IF NOT EXISTS designations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      department_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Staff Profiles
    CREATE TABLE IF NOT EXISTS staff_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      father_name TEXT,
      dob TEXT,
      gender TEXT,
      photo_url TEXT,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL,
      residential_address TEXT,
      city TEXT,
      qualification TEXT,
      aadhar_number TEXT,
      aadhar_front TEXT,
      aadhar_back TEXT,
      designation TEXT NOT NULL,
      department TEXT NOT NULL,
      joining_date TEXT NOT NULL,
      employment_type TEXT DEFAULT 'Full-time',
      reporting_manager TEXT,
      reporting_manager_id TEXT,
      work_location TEXT DEFAULT 'Headquarters - Noida',
      employment_status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- User ID Profiles (Members / Coworking Clients)
    CREATE TABLE IF NOT EXISTS user_id_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id_code TEXT UNIQUE NOT NULL,
      workden_user_id TEXT,
      full_name TEXT NOT NULL,
      photo_url TEXT,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL,
      registration_date TEXT NOT NULL,
      current_plan TEXT DEFAULT 'Dedicated Desk',
      user_category TEXT DEFAULT 'Coworking Member',
      user_status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ID Card Records
    CREATE TABLE IF NOT EXISTS id_card_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_number TEXT UNIQUE NOT NULL,
      profile_type TEXT NOT NULL CHECK(profile_type IN ('STAFF', 'USER')),
      profile_id INTEGER NOT NULL,
      entity_code TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      validity_period TEXT DEFAULT '1 Year',
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED')),
      authorized_by TEXT DEFAULT 'Authorized Signatory',
      remarks TEXT,
      card_version INTEGER DEFAULT 1,
      created_by TEXT DEFAULT 'Admin',
      approved_by TEXT,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- QR Verification Tokens
    CREATE TABLE IF NOT EXISTS qr_verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      scan_count INTEGER DEFAULT 0,
      last_scanned_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(card_id) REFERENCES id_card_records(id) ON DELETE CASCADE
    );

    -- ID Card History
    CREATE TABLE IF NOT EXISTS id_card_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      performed_by TEXT DEFAULT 'Admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(card_id) REFERENCES id_card_records(id) ON DELETE CASCADE
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      ip_address TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ID Card Settings / Design Templates
    CREATE TABLE IF NOT EXISTS id_card_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT DEFAULT 'WORKDEN',
      company_tagline TEXT DEFAULT 'OFFICIAL IDENTITY CARD',
      company_logo TEXT DEFAULT '/logo.png',
      company_website TEXT DEFAULT 'https://workden.online',
      official_email TEXT DEFAULT 'contact@workden.online',
      office_address TEXT DEFAULT 'WorkDen Tower, Plot 14, Sector 62, Noida, UP 201301',
      authorized_signatory TEXT DEFAULT 'Director - People & Operations',
      signature_image TEXT DEFAULT '/signature.png',
      primary_color TEXT DEFAULT '#0f172a',
      secondary_color TEXT DEFAULT '#1e3a8a',
      accent_color TEXT DEFAULT '#38bdf8',
      card_usage_rules TEXT DEFAULT '1. This card is official property of WorkDen Unified Spaces.\n2. Must be visibly displayed at all times within premises.\n3. Non-transferable and must be surrendered upon request or employment cessation.\n4. Tampering or misuse is strictly prohibited.',
      lost_card_instructions TEXT DEFAULT 'If found, please immediately return to WorkDen Security or email contact@workden.online / Call +91 98765 43210',
      qr_position TEXT DEFAULT 'front_bottom_right',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ID Card Applications (user self-service)
    CREATE TABLE IF NOT EXISTS id_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant_user_id INTEGER NOT NULL,
      application_type TEXT NOT NULL DEFAULT 'USER' CHECK(application_type IN ('STAFF', 'USER')),
      full_name TEXT NOT NULL,
      photo_url TEXT,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL,
      designation TEXT,
      department TEXT,
      residential_address TEXT,
      city TEXT,
      qualification TEXT,
      aadhar_number TEXT,
      aadhar_front TEXT,
      aadhar_back TEXT,
      father_name TEXT,
      dob TEXT,
      gender TEXT,
      joining_date TEXT,
      employment_type TEXT,
      work_location TEXT,
      user_category TEXT DEFAULT 'Coworking Member',
      current_plan TEXT DEFAULT 'Hot Desk',
      remarks TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
      rejection_reason TEXT,
      reviewed_by TEXT,
      reviewed_at DATETIME,
      profile_id INTEGER,
      card_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(applicant_user_id) REFERENCES auth_users(id)
    );
  `);

  // Safe automatic column migrations for existing databases
  try {
    const staffCols = db.prepare("PRAGMA table_info(staff_profiles)").all().map(c => c.name);
    ['city', 'qualification', 'aadhar_number', 'aadhar_front', 'aadhar_back'].forEach(col => {
      if (!staffCols.includes(col)) {
        db.exec(`ALTER TABLE staff_profiles ADD COLUMN ${col} TEXT`);
      }
    });

    const appCols = db.prepare("PRAGMA table_info(id_applications)").all().map(c => c.name);
    ['city', 'qualification', 'aadhar_number', 'aadhar_front', 'aadhar_back'].forEach(col => {
      if (!appCols.includes(col)) {
        db.exec(`ALTER TABLE id_applications ADD COLUMN ${col} TEXT`);
      }
    });
  } catch (migErr) {
    console.error('Migration error:', migErr);
  }

  seedInitialData();
}

// Generate Next Sequential Staff ID (WD-EMP-YYYY-00001) with transaction
function generateStaffId() {
  const currentYear = new Date().getFullYear();
  const prefix = `WD-EMP-${currentYear}-`;

  const getNextSeq = db.transaction(() => {
    const row = db.prepare(`
      SELECT staff_id FROM staff_profiles 
      WHERE staff_id LIKE ? 
      ORDER BY id DESC LIMIT 1
    `).get(`${prefix}%`);

    let nextNumber = 1;
    if (row && row.staff_id) {
      const parts = row.staff_id.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextNumber = lastSeq + 1;
      }
    }
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  });

  return getNextSeq();
}

// Generate Next Sequential User ID (WD-USER-YYYY-00001) with transaction
function generateUserIdCode() {
  const currentYear = new Date().getFullYear();
  const prefix = `WD-USER-${currentYear}-`;

  const getNextSeq = db.transaction(() => {
    const row = db.prepare(`
      SELECT user_id_code FROM user_id_profiles 
      WHERE user_id_code LIKE ? 
      ORDER BY id DESC LIMIT 1
    `).get(`${prefix}%`);

    let nextNumber = 1;
    if (row && row.user_id_code) {
      const parts = row.user_id_code.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextNumber = lastSeq + 1;
      }
    }
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  });

  return getNextSeq();
}

// Generate Secure Cryptographic QR Verification Token
function generateSecureToken() {
  return crypto.randomBytes(24).toString('hex');
}

// Seed initial data (no fake staff/user records)
function seedInitialData() {
  // Seed settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM id_card_settings').get().count;
  if (settingsCount === 0) {
    db.prepare(`
      INSERT INTO id_card_settings (id, company_name, company_tagline, company_website, official_email, office_address, authorized_signatory)
      VALUES (1, 'WORKDEN', 'OFFICIAL IDENTITY CARD', 'https://workden.online', 'contact@workden.online', 'WorkDen Tower, Plot 14, Sector 62, Noida, UP 201301', 'Director of Operations')
    `).run();
  }

  // Seed Admin Account (only one, no fake records)
  const adminExists = db.prepare("SELECT id FROM auth_users WHERE email = ?").get('admin@workden.online');
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('WorkDen@2026', 12);
    db.prepare(`
      INSERT INTO auth_users (email, password_hash, role, full_name, is_active)
      VALUES (?, ?, 'ADMIN', 'WorkDen Administrator', 1)
    `).run('admin@workden.online', passwordHash);
    console.log('✅ Admin account seeded: admin@workden.online / WorkDen@2026');
  }

  // Seed Departments
  const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get().count;
  if (deptCount === 0) {
    const depts = [
      ['Administration', 'ADM'],
      ['Human Resources', 'HR'],
      ['Sales & Marketing', 'SM'],
      ['Customer Support', 'CS'],
      ['Technology & Operations', 'TO']
    ];
    const insertDept = db.prepare('INSERT INTO departments (name, code) VALUES (?, ?)');
    depts.forEach(([name, code]) => insertDept.run(name, code));
  }

  // Seed Designations
  const desigCount = db.prepare('SELECT COUNT(*) as count FROM designations').get().count;
  if (desigCount === 0) {
    const desigs = [
      ['Admin Executive', 'Administration'],
      ['Admin Manager', 'Administration'],
      ['HR Executive', 'Human Resources'],
      ['Telecaller Executive', 'Sales & Marketing'],
      ['Sales Manager', 'Sales & Marketing'],
      ['Customer Support Executive', 'Customer Support'],
      ['IT Executive', 'Technology & Operations'],
      ['Operations Manager', 'Technology & Operations']
    ];
    const insertDesig = db.prepare('INSERT INTO designations (name, department_name) VALUES (?, ?)');
    desigs.forEach(([name, dept]) => insertDesig.run(name, dept));
  }

  // Seed initial audit log
  const auditCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count;
  if (auditCount === 0) {
    db.prepare(`
      INSERT INTO audit_logs (action, performed_by, target_type, target_id, details)
      VALUES ('SYSTEM_INIT', 'System', 'DATABASE', 'ALL', 'WorkDen ID Card Management & QR Verification System initialized.')
    `).run();
  }
}

// Helper to log audit event
function logAudit(action, performedBy, targetType, targetId, details, ipAddress = '127.0.0.1') {
  try {
    db.prepare(`
      INSERT INTO audit_logs (action, performed_by, target_type, target_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(action, performedBy || 'Admin', targetType, String(targetId || ''), typeof details === 'object' ? JSON.stringify(details) : details, ipAddress);
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
}

// Function to auto-expire cards where expiry_date < today and status is ACTIVE
function updateExpiredCards() {
  const today = new Date().toISOString().split('T')[0];
  const expiredCards = db.prepare(`
    SELECT id, entity_code FROM id_card_records 
    WHERE status = 'ACTIVE' AND expiry_date < ?
  `).all(today);

  if (expiredCards.length > 0) {
    const updateStmt = db.prepare("UPDATE id_card_records SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    const historyStmt = db.prepare("INSERT INTO id_card_history (card_id, action, details, performed_by) VALUES (?, 'EXPIRED', 'Card automatically marked expired by system schedule', 'System')");
    
    db.transaction(() => {
      for (const card of expiredCards) {
        updateStmt.run(card.id);
        historyStmt.run(card.id);
        logAudit('AUTO_EXPIRE', 'System', 'CARD', card.id, `Card ${card.entity_code} automatically marked expired.`);
      }
    })();
  }
}

initDatabase();

module.exports = {
  db,
  generateStaffId,
  generateUserIdCode,
  generateSecureToken,
  logAudit,
  updateExpiredCards
};
