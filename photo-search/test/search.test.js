const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pms-search-test-'));

// Patch config before modules load
const config = require('../config/config');
config.dbPath = path.join(tmpDir, 'test.db');
config.thumbnailDir = path.join(tmpDir, 'thumbs');
config.apiKey = 'test-key';

// Inject mock Claude client
const Module = require('module');
const originalLoad = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.endsWith('claudeClient') || request.endsWith('claudeClient.js')) {
    return require.resolve('./mocks/claudeClientMock');
  }
  return originalLoad.call(this, request, parent, isMain, options);
};

const repo = require('../src/db/photoRepository');
const { getDb } = require('../src/db/connection');

function seedPhoto(overrides = {}) {
  const defaults = {
    filePath: `/tmp/seed-${Math.random().toString(36).slice(2)}.jpg`,
    fileHash: Math.random().toString(36),
    fileMtime: Date.now(),
    fileSize: 1000,
  };
  const id = repo.upsertPhoto({ ...defaults, ...overrides });
  return id;
}

before(() => {
  getDb();
  // Seed a few done photos
  const vacId = seedPhoto({ filePath: '/tmp/vacation.jpg' });
  repo.markDone(vacId, {
    description: 'Family at the beach on a sunny day.',
    sceneType: 'beach',
    categories: '["family vacation","beach"]',
    objects: '["umbrella","towel"]',
    isIndoor: 0, peopleCount: 4, peopleDesc: 'two adults and two children',
  });
  repo.updateExif(vacId, { takenAt: '2024-07-15T10:00:00.000Z', gpsLat: 37.7, gpsLon: -122.4 });
  repo.updatePlaceName(vacId, 'San Francisco, CA');

  const schoolId = seedPhoto({ filePath: '/tmp/school.jpg' });
  repo.markDone(schoolId, {
    description: 'Children performing in a school play on stage.',
    sceneType: 'school auditorium',
    categories: '["school event","performance"]',
    objects: '["stage","costumes"]',
    isIndoor: 1, peopleCount: 10, peopleDesc: 'several children on stage',
  });
});

describe('searchByFts', () => {
  test('finds photos by description keyword', () => {
    const results = repo.searchByFts('beach');
    assert.ok(results.some(r => r.scene_type === 'beach'));
  });

  test('finds school event photos', () => {
    const results = repo.searchByFts('school');
    assert.ok(results.some(r => r.scene_type === 'school auditorium'));
  });

  test('returns empty for unknown term', () => {
    const results = repo.searchByFts('zzzyyyxxx');
    assert.equal(results.length, 0);
  });
});

describe('summarizer', () => {
  test('returns a summary string for matched photos', async () => {
    const { summarize } = require('../src/search/summarizer');
    const all = repo.listPhotos({ status: 'done' });
    const summary = await summarize('family vacation', all);
    assert.ok(typeof summary === 'string');
    assert.ok(summary.length > 10);
  });
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
