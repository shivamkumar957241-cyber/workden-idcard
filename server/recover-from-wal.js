const fs = require('fs');
const path = require('path');
const { copyAllSalvageableData, checkIntegrity, moveOrCopyDbFiles } = require('./repair-db');

const serverDir = __dirname;
const backupsRoot = path.join(serverDir, 'backups');
const liveDbPath = path.join(serverDir, 'workden_idcard.db');

function findBestBackupSet() {
  if (!fs.existsSync(backupsRoot)) return null;

  const candidates = [];
  const checkDir = (dir) => {
    const dbFile = path.join(dir, 'workden_idcard.db');
    const walFile = path.join(dir, 'workden_idcard.db-wal');
    if (fs.existsSync(walFile)) {
      const walSize = fs.statSync(walFile).size;
      const dbSize = fs.existsSync(dbFile) ? fs.statSync(dbFile).size : 0;
      candidates.push({ dir, dbFile: fs.existsSync(dbFile) ? dbFile : null, walFile, walSize, dbSize });
    }
  };

  checkDir(backupsRoot);
  for (const entry of fs.readdirSync(backupsRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith('before-wal-restore-')) {
      checkDir(path.join(backupsRoot, entry.name));
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.walSize - a.walSize || b.dbSize - a.dbSize);
  return candidates[0];
}

function parseWalFrames(walBuffer) {
  if (walBuffer.length < 32) {
    throw new Error('WAL file is too small (< 32 bytes).');
  }
  const magic = walBuffer.readUInt32BE(0);
  if (magic !== 0x377f0682 && magic !== 0x377f0683) {
    throw new Error(`Invalid WAL magic header: 0x${magic.toString(16)}`);
  }

  const pageSize = walBuffer.readUInt32BE(8);
  if (!pageSize || (pageSize & (pageSize - 1)) !== 0 || pageSize < 512 || pageSize > 65536) {
    throw new Error(`Invalid WAL page size: ${pageSize}`);
  }

  const frameSize = 24 + pageSize;
  const frames = [];
  let offset = 32;

  while (offset + frameSize <= walBuffer.length) {
    const pageNo = walBuffer.readUInt32BE(offset);
    const dbSizeAfterCommit = walBuffer.readUInt32BE(offset + 4);
    const salt1 = walBuffer.readUInt32BE(offset + 8);
    const salt2 = walBuffer.readUInt32BE(offset + 12);
    const pageData = walBuffer.subarray(offset + 24, offset + frameSize);

    if (pageNo >= 1) {
      frames.push({
        pageNo,
        dbSizeAfterCommit,
        saltKey: `${salt1}:${salt2}`,
        pageData
      });
    }
    offset += frameSize;
  }

  return { pageSize, frames };
}

function buildReconstructedDb(baseDbBuffer, pageSize, framesToApply, outPath) {
  let maxPage = Math.ceil(baseDbBuffer.length / pageSize);
  for (const f of framesToApply) {
    if (f.pageNo > maxPage) maxPage = f.pageNo;
  }

  const outBuf = Buffer.alloc(maxPage * pageSize, 0);
  if (baseDbBuffer.length > 0) {
    baseDbBuffer.copy(outBuf, 0, 0, Math.min(baseDbBuffer.length, outBuf.length));
  }

  for (const f of framesToApply) {
    const targetOffset = (f.pageNo - 1) * pageSize;
    f.pageData.copy(outBuf, targetOffset, 0, pageSize);
  }

  fs.writeFileSync(outPath, outBuf);
}

function scoreSummary(summary) {
  if (!summary) return -1;
  const keyTables = [
    'staff_profiles',
    'user_id_profiles',
    'id_card_records',
    'id_applications',
    'qr_verification_tokens',
    'auth_users'
  ];
  let score = 0;
  for (const t of keyTables) {
    score += (summary[t] || 0) * 10;
  }
  for (const v of Object.values(summary)) {
    score += v || 0;
  }
  return score;
}

function recoverFromBackupWal() {
  const backup = findBestBackupSet();
  if (!backup) {
    throw new Error('No backup WAL file found in server/backups/.');
  }

  console.log(`Found backup WAL: ${backup.walFile} (${Math.round(backup.walSize / 1024)} KB)`);
  if (backup.dbFile) {
    console.log(`Found base DB:  ${backup.dbFile} (${Math.round(backup.dbSize / 1024)} KB)`);
  }

  const walBuf = fs.readFileSync(backup.walFile);
  const baseBuf = backup.dbFile ? fs.readFileSync(backup.dbFile) : Buffer.alloc(0);
  const { pageSize, frames } = parseWalFrames(walBuf);
  console.log(`Parsed ${frames.length} WAL frames (pageSize=${pageSize}).`);

  if (frames.length === 0) {
    throw new Error('WAL file contains 0 frames.');
  }

  // Group frames by saltKey so we can test dominant session frames as well as all frames
  const bySalt = new Map();
  for (const f of frames) {
    if (!bySalt.has(f.saltKey)) bySalt.set(f.saltKey, []);
    bySalt.get(f.saltKey).push(f);
  }

  const strategies = [{ name: 'all-frames', frames }];
  for (const [saltKey, group] of bySalt.entries()) {
    if (group.length !== frames.length) {
      strategies.push({ name: `salt-${saltKey} (${group.length} frames)`, frames: group });
    }
  }

  let best = null;
  const tempFiles = [];

  try {
    for (let i = 0; i < strategies.length; i++) {
      const strat = strategies[i];
      const rawTmp = path.join(backupsRoot, `_tmp_raw_${i}.db`);
      const cleanTmp = path.join(backupsRoot, `_tmp_clean_${i}.db`);
      tempFiles.push(rawTmp, cleanTmp, cleanTmp + '-wal', cleanTmp + '-shm');

      try {
        buildReconstructedDb(baseBuf, pageSize, strat.frames, rawTmp);
        const summary = copyAllSalvageableData(rawTmp, cleanTmp, null);
        const healthy = checkIntegrity(cleanTmp);
        const score = scoreSummary(summary);
        console.log(`Strategy [${strat.name}] -> healthy=${healthy}, score=${score}`, summary);

        if (healthy && (!best || score > best.score)) {
          best = { name: strat.name, cleanPath: cleanTmp, summary, score };
        }
      } catch (err) {
        console.warn(`Strategy [${strat.name}] failed: ${err.message}`);
      }
    }

    if (!best) {
      throw new Error('Could not reconstruct a valid SQLite database from the WAL frames.');
    }

    // Safely archive current live DB (if any) before replacing
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    if (fs.existsSync(liveDbPath) || fs.existsSync(liveDbPath + '-wal') || fs.existsSync(liveDbPath + '-shm')) {
      const archiveDir = path.join(backupsRoot, `before-wal-restore-${ts}`);
      moveOrCopyDbFiles(liveDbPath, archiveDir, true);
      console.log(`Archived previous live DB files to: ${archiveDir}`);
    }

    fs.copyFileSync(best.cleanPath, liveDbPath);
    console.log('\n=======================================================');
    console.log('  DATABASE RECOVERED SUCCESSFULLY FROM WAL BACKUP!');
    console.log('  Strategy:', best.name);
    console.log('  Recovered row counts:');
    for (const [table, count] of Object.entries(best.summary)) {
      console.log(`   - ${table}: ${count}`);
    }
    console.log('=======================================================');
    return best.summary;
  } finally {
    for (const f of tempFiles) {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch {}
      }
    }
  }
}

if (require.main === module) {
  try {
    recoverFromBackupWal();
  } catch (err) {
    console.error('❌ WAL Recovery failed:', err.message);
    process.exit(1);
  }
}

module.exports = { recoverFromBackupWal };
