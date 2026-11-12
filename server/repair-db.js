const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const defaultDbPath = path.join(__dirname, 'workden_idcard.db');
const backupsRoot = path.join(__dirname, 'backups');

const KNOWN_TABLES = [
  'auth_users',
  'departments',
  'designations',
  'id_card_settings',
  'staff_profiles',
  'user_id_profiles',
  'id_card_records',
  'qr_verification_tokens',
  'id_card_history',
  'id_applications',
  'audit_logs'
];

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function moveOrCopyDbFiles(dbPath, destDir, move = false) {
  fs.mkdirSync(destDir, { recursive: true });
  const copied = [];
  for (const suffix of ['', '-wal', '-shm']) {
    const src = dbPath + suffix;
    if (fs.existsSync(src)) {
      const dst = path.join(destDir, path.basename(src));
      if (move) {
        fs.renameSync(src, dst);
      } else {
        fs.copyFileSync(src, dst);
      }
      copied.push(path.basename(src));
    }
  }
  return copied;
}

function removeWalFiles(dbPath) {
  for (const suffix of ['-wal', '-shm']) {
    const p = dbPath + suffix;
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  }
}

function checkIntegrity(filePath) {
  let conn = null;
  try {
    conn = new Database(filePath, { readonly: true, fileMustExist: true });
    const res = conn.pragma('integrity_check');
    return Array.isArray(res) && res.length === 1 && res[0].integrity_check === 'ok';
  } catch {
    return false;
  } finally {
    if (conn) {
      try { conn.close(); } catch {}
    }
  }
}

function readTableRowsSafely(sourceDb, tableName) {
  try {
    return sourceDb.prepare(`SELECT * FROM "${tableName}"`).all();
  } catch {
    // Fallback: salvage readable rows one-by-one by rowid
    const rows = [];
    let maxRowId = 0;
    try {
      const row = sourceDb.prepare(`SELECT MAX(rowid) as m FROM "${tableName}"`).get();
      maxRowId = row?.m || 0;
    } catch {
      maxRowId = 10000;
    }
    let stmt;
    try {
      stmt = sourceDb.prepare(`SELECT * FROM "${tableName}" WHERE rowid = ?`);
    } catch {
      return rows;
    }
    for (let id = 1; id <= maxRowId; id++) {
      try {
        const r = stmt.get(id);
        if (r) rows.push(r);
      } catch {
        // Skip corrupted row
      }
    }
    return rows;
  }
}

function copyAllSalvageableData(sourcePath, targetPath, initSchemaFn) {
  const srcDb = new Database(sourcePath, { readonly: true, fileMustExist: true });
  const dstDb = new Database(targetPath);
  const summary = {};

  try {
    if (typeof initSchemaFn === 'function') {
      initSchemaFn(dstDb);
    } else {
      // Copy table DDL from sqlite_master if no initSchemaFn provided
      const ddls = srcDb.prepare(
        "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"
      ).all();
      for (const item of ddls) {
        if (item.type === 'table') {
          try { dstDb.exec(item.sql); } catch {}
        }
      }
    }

    dstDb.pragma('foreign_keys = OFF');

    const existingTables = srcDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all().map(t => t.name);

    const orderedTables = [
      ...KNOWN_TABLES.filter(t => existingTables.includes(t)),
      ...existingTables.filter(t => !KNOWN_TABLES.includes(t))
    ];

    for (const table of orderedTables) {
      const dstTableExists = dstDb.prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?"
      ).get(table);
      if (!dstTableExists) continue;

      const rows = readTableRowsSafely(srcDb, table);
      if (rows.length === 0) {
        summary[table] = 0;
        continue;
      }

      const dstCols = dstDb.prepare(`PRAGMA table_info("${table}")`).all().map(c => c.name);
      const validCols = Object.keys(rows[0]).filter(c => dstCols.includes(c));
      if (validCols.length === 0) {
        summary[table] = 0;
        continue;
      }

      const placeholders = validCols.map(() => '?').join(', ');
      const colList = validCols.map(c => `"${c}"`).join(', ');
      const insertStmt = dstDb.prepare(`INSERT OR REPLACE INTO "${table}" (${colList}) VALUES (${placeholders})`);

      let inserted = 0;
      const insertMany = dstDb.transaction((items) => {
        for (const r of items) {
          try {
            insertStmt.run(...validCols.map(c => r[c]));
            inserted++;
          } catch {
            // Skip row that violates constraints
          }
        }
      });
      insertMany(rows);
      summary[table] = inserted;
    }

    dstDb.pragma('foreign_keys = ON');
    dstDb.pragma('wal_checkpoint(TRUNCATE)');
  } finally {
    try { srcDb.close(); } catch {}
    try { dstDb.close(); } catch {}
  }

  return summary;
}

function repairDatabase(dbPath = defaultDbPath, initSchemaFn = null) {
  const ts = getTimestamp();

  // Handle orphaned WAL/SHM when main .db is missing
  if (!fs.existsSync(dbPath)) {
    const hasWal = fs.existsSync(dbPath + '-wal') || fs.existsSync(dbPath + '-shm');
    if (hasWal) {
      const orphanDir = path.join(backupsRoot, `orphaned-${ts}`);
      const moved = moveOrCopyDbFiles(dbPath, orphanDir, true);
      return { status: 'CLEANED_ORPHAN_WAL', backupDir: orphanDir, files: moved };
    }
    return { status: 'NO_DB_FOUND' };
  }

  // Always create a safety backup first
  const backupDir = path.join(backupsRoot, `pre-repair-${ts}`);
  moveOrCopyDbFiles(dbPath, backupDir, false);

  // 1. Check if current DB + WAL is already healthy
  if (checkIntegrity(dbPath)) {
    let conn = null;
    try {
      conn = new Database(dbPath);
      conn.pragma('wal_checkpoint(TRUNCATE)');
    } finally {
      if (conn) try { conn.close(); } catch {}
    }
    return { status: 'HEALTHY', backupDir };
  }

  // 2. Try checking main .db without stale -wal / -shm
  const tempNoWal = dbPath + '.nowal.tmp';
  const tempRecovered = dbPath + '.recovered.tmp';

  try {
    fs.copyFileSync(dbPath, tempNoWal);
    if (checkIntegrity(tempNoWal)) {
      removeWalFiles(dbPath);
      fs.copyFileSync(tempNoWal, dbPath);
      return { status: 'RECOVERED_BY_DROPPING_STALE_WAL', backupDir };
    }
  } catch {
    // Continue to row-by-row salvage
  } finally {
    if (fs.existsSync(tempNoWal)) {
      try { fs.unlinkSync(tempNoWal); } catch {}
    }
  }

  // 3. Row-by-row salvage from damaged DB into a fresh DB
  try {
    fs.copyFileSync(dbPath, tempNoWal);
    const summary = copyAllSalvageableData(tempNoWal, tempRecovered, initSchemaFn);
    if (checkIntegrity(tempRecovered)) {
      removeWalFiles(dbPath);
      removeWalFiles(tempRecovered);
      fs.renameSync(tempRecovered, dbPath);
      return { status: 'SALVAGED', backupDir, summary };
    }
  } catch (err) {
    console.error('Row salvage failed:', err.message);
  } finally {
    for (const f of [tempNoWal, tempRecovered, tempRecovered + '-wal', tempRecovered + '-shm']) {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch {}
      }
    }
  }

  // 4. Unrecoverable: move corrupted files to backup so server can start with fresh DB
  moveOrCopyDbFiles(dbPath, backupDir, true);
  return { status: 'RESET_FRESH', backupDir };
}

if (require.main === module) {
  console.log('=======================================================');
  console.log('  WorkDen Database Health Check & Repair Tool');
  console.log('=======================================================');
  const result = repairDatabase(defaultDbPath);
  console.log('Result:', JSON.stringify(result, null, 2));
}

module.exports = {
  repairDatabase,
  moveOrCopyDbFiles,
  checkIntegrity,
  copyAllSalvageableData
};
