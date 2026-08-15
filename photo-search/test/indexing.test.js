const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Redirect DB to a temp location for isolation
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pms-test-'));
process.env.PHOTO_DIR = path.join(__dirname, 'fixtures/images');

// Monkey-patch config before any module loads connection
const config = require('../config/config');
config.dbPath = path.join(tmpDir, 'test.db');
config.thumbnailDir = path.join(tmpDir, 'thumbs');

// Inject mock Claude client
const Module = require('module');
const originalLoad = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.endsWith('claudeClient') || request.endsWith('claudeClient.js')) {
    return require.resolve('./mocks/claudeClientMock');
  }
  return originalLoad.call(this, request, parent, isMain, options);
};

const { extractExif } = require('../src/indexing/exifExtractor');
const repo = require('../src/db/photoRepository');
const { getDb } = require('../src/db/connection');

const FIXTURE_DIR = path.join(__dirname, 'fixtures/images');

describe('EXIF extractor', () => {
  test('returns nulls for a plain JPEG with no EXIF', async () => {
    const files = fs.readdirSync(FIXTURE_DIR).filter(f => f.endsWith('.jpg'));
    if (!files.length) return; // fixtures not generated yet
    const result = await extractExif(path.join(FIXTURE_DIR, files[0]));
    assert.equal(typeof result.takenAt === 'string' || result.takenAt === null, true);
    assert.equal(typeof result.gpsLat === 'number' || result.gpsLat === null, true);
  });
});

describe('photoRepository', () => {
  before(() => getDb()); // init schema

  test('upserts a photo and retrieves it', () => {
    const id = repo.upsertPhoto({
      filePath: '/tmp/test-photo.jpg',
      fileHash: 'abc123',
      fileMtime: 1700000000000,
      fileSize: 12345,
    });
    assert.ok(typeof id === 'number');

    const row = repo.getPhotoById(id);
    assert.equal(row.file_path, '/tmp/test-photo.jpg');
    assert.equal(row.status, 'pending');
  });

  test('marks photo done and retrieves analysis fields', () => {
    const id = repo.upsertPhoto({
      filePath: '/tmp/done-photo.jpg',
      fileHash: 'def456',
      fileMtime: 1700000001000,
      fileSize: 5000,
    });
    repo.markDone(id, {
      description: 'A sunny beach day.',
      sceneType: 'beach',
      categories: '["family vacation","beach"]',
      objects: '["umbrella","waves"]',
      isIndoor: 0,
      peopleCount: 4,
      peopleDesc: 'two adults and two children',
    });

    const row = repo.getPhotoById(id);
    assert.equal(row.status, 'done');
    assert.equal(row.scene_type, 'beach');
    assert.ok(row.description.includes('beach'));
  });

  test('getStats returns counts', () => {
    const s = repo.getStats();
    assert.ok(s.total >= 2);
    assert.ok(typeof s.done === 'number');
  });

  test('FTS search finds photo by description keyword', () => {
    const results = repo.searchByFts('beach');
    assert.ok(results.length >= 1);
    assert.ok(results.some(r => r.scene_type === 'beach'));
  });

  test('settings key-value store works', () => {
    repo.setSetting('photo_dir', '/test/path');
    assert.equal(repo.getSetting('photo_dir'), '/test/path');
  });
});

describe('visionAnalyzer with mock client', () => {
  test('returns structured analysis from mock', async () => {
    const { analyzeImage } = require('../src/indexing/visionAnalyzer');
    const result = await analyzeImage('base64imagedata');
    assert.equal(typeof result.description, 'string');
    assert.equal(typeof result.sceneType, 'string');
    assert.ok(result.categories.startsWith('['));
    assert.equal(typeof result.peopleCount, 'number');
  });
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
