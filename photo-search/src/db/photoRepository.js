const { getDb } = require('./connection');

function upsertPhoto(photo) {
  const db = getDb();
  const existing = db.prepare('SELECT id, file_hash FROM photos WHERE file_path = ?').get(photo.filePath);

  if (!existing) {
    db.prepare(`
      INSERT INTO photos (file_path, file_hash, file_mtime, file_size, status)
      VALUES (@filePath, @fileHash, @fileMtime, @fileSize, 'pending')
    `).run(photo);
    return db.prepare('SELECT id FROM photos WHERE file_path = ?').get(photo.filePath).id;
  }

  if (existing.file_hash !== photo.fileHash) {
    db.prepare(`
      UPDATE photos SET
        file_hash = @fileHash, file_mtime = @fileMtime, file_size = @fileSize,
        status = 'pending', description = NULL, scene_type = NULL, categories = NULL,
        objects = NULL, is_indoor = NULL, people_count = NULL, people_desc = NULL,
        place_name = NULL, gps_lat = NULL, gps_lon = NULL, taken_at = NULL,
        error_message = NULL, processed_at = NULL, updated_at = datetime('now')
      WHERE file_path = @filePath
    `).run(photo);
  }

  return existing.id;
}

function updateExif(id, exif) {
  getDb().prepare(`
    UPDATE photos SET taken_at = @takenAt, gps_lat = @gpsLat, gps_lon = @gpsLon,
      updated_at = datetime('now')
    WHERE id = @id
  `).run({ id, ...exif });
}

function updatePlaceName(id, placeName) {
  getDb().prepare(`
    UPDATE photos SET place_name = @placeName, updated_at = datetime('now') WHERE id = @id
  `).run({ id, placeName });
}

function markProcessing(id) {
  getDb().prepare(`UPDATE photos SET status = 'processing', updated_at = datetime('now') WHERE id = ?`).run(id);
}

function markDone(id, analysis) {
  getDb().prepare(`
    UPDATE photos SET
      status = 'done', description = @description, scene_type = @sceneType,
      categories = @categories, objects = @objects, is_indoor = @isIndoor,
      people_count = @peopleCount, people_desc = @peopleDesc,
      processed_at = datetime('now'), updated_at = datetime('now'), error_message = NULL
    WHERE id = @id
  `).run({ id, ...analysis });
}

function markError(id, message) {
  getDb().prepare(`
    UPDATE photos SET status = 'error', error_message = @message,
      updated_at = datetime('now')
    WHERE id = @id
  `).run({ id, message });
}

function getPendingPhotos() {
  return getDb().prepare(`SELECT id, file_path FROM photos WHERE status = 'pending'`).all();
}

function getPhotoById(id) {
  return getDb().prepare('SELECT * FROM photos WHERE id = ?').get(id);
}

function listPhotos({ page = 1, perPage = 60, status } = {}) {
  const db = getDb();
  const offset = (page - 1) * perPage;
  const where = status ? `WHERE status = '${status.replace(/'/g, '')}'` : '';
  return db.prepare(`SELECT * FROM photos ${where} ORDER BY taken_at DESC LIMIT ? OFFSET ?`).all(perPage, offset);
}

function getStats() {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
    FROM photos
  `).get();
  return row;
}

function searchByFts(query) {
  const db = getDb();
  const terms = query.trim().split(/\s+/).map(t => t.replace(/["*]/g, '')).filter(Boolean);
  if (!terms.length) return [];

  const ftsQuery = terms.map(t => `"${t}"`).join(' OR ');
  try {
    return db.prepare(`
      SELECT photos.* FROM photos_fts
      JOIN photos ON photos_fts.rowid = photos.id
      WHERE photos_fts MATCH ? AND photos.status = 'done'
      ORDER BY rank
      LIMIT 100
    `).all(ftsQuery);
  } catch {
    return [];
  }
}

function searchByCategories(categories) {
  if (!categories || !categories.length) return [];
  const db = getDb();
  const results = new Map();

  for (const cat of categories) {
    const like = `%${cat.replace(/%/g, '\\%')}%`;
    const rows = db.prepare(`
      SELECT * FROM photos
      WHERE status = 'done' AND (categories LIKE ? OR scene_type LIKE ? OR description LIKE ?)
      ORDER BY taken_at DESC LIMIT 60
    `).all(like, like, like);
    for (const row of rows) {
      if (!results.has(row.id)) results.set(row.id, row);
    }
  }
  return [...results.values()];
}

function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
}

module.exports = {
  upsertPhoto, updateExif, updatePlaceName,
  markProcessing, markDone, markError,
  getPendingPhotos, getPhotoById, listPhotos, getStats,
  searchByFts, searchByCategories,
  getSetting, setSetting,
};
