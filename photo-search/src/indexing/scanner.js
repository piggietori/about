const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDb } = require('../db/connection');
const repo = require('../db/photoRepository');
const logger = require('../lib/logger');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.heic', '.heif', '.png']);

function walkDir(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, results);
    } else if (IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

function hashFile(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha1').update(data).digest('hex');
}

function getExistingRow(filePath) {
  try {
    return getDb().prepare('SELECT id, file_mtime, file_size, file_hash, status FROM photos WHERE file_path = ?').get(filePath);
  } catch { return null; }
}

function scan(photoDir) {
  if (!photoDir || !fs.existsSync(photoDir)) {
    throw new Error(`Photo directory does not exist: ${photoDir}`);
  }

  logger.info(`Scanning ${photoDir}`);
  const allPaths = walkDir(photoDir);
  logger.info(`Found ${allPaths.length} image files`);

  const pending = [];
  for (const filePath of allPaths) {
    const stat = fs.statSync(filePath);
    const mtime = stat.mtimeMs;
    const size = stat.size;
    const existing = getExistingRow(filePath);

    let fileHash;
    let needsProcessing = false;

    if (!existing) {
      fileHash = hashFile(filePath);
      needsProcessing = true;
    } else if (existing.file_mtime !== mtime || existing.file_size !== size) {
      fileHash = hashFile(filePath);
      needsProcessing = existing.file_hash !== fileHash || existing.status === 'error';
    } else {
      needsProcessing = existing.status === 'pending' || existing.status === 'error';
      fileHash = existing.file_hash;
    }

    if (needsProcessing) {
      if (!fileHash) fileHash = hashFile(filePath);
      const id = repo.upsertPhoto({ filePath, fileHash, fileMtime: mtime, fileSize: size });
      pending.push({ id, filePath });
    }
  }

  logger.info(`${pending.length} photos need processing`);
  return pending;
}

module.exports = { scan };
