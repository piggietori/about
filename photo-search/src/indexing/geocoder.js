const { getDb } = require('../db/connection');
const logger = require('../lib/logger');

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'photo-memory-search/1.0 (local personal app)';
const ROUND = 3; // ~111m precision

let lastRequestTime = 0;

function roundCoord(v) {
  return Math.round(v * Math.pow(10, ROUND)) / Math.pow(10, ROUND);
}

async function rateLimitedFetch(url) {
  const now = Date.now();
  const wait = 1000 - (now - lastRequestTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();
  return fetch(url, { headers: { 'User-Agent': USER_AGENT } });
}

async function reverseGeocode(lat, lon) {
  if (lat == null || lon == null) return null;

  const latR = roundCoord(lat);
  const lonR = roundCoord(lon);
  const db = getDb();

  const cached = db.prepare('SELECT place_name FROM geocode_cache WHERE lat_round = ? AND lon_round = ?').get(latR, lonR);
  if (cached) return cached.place_name;

  try {
    const url = `${NOMINATIM}?lat=${lat}&lon=${lon}&format=jsonv2`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const addr = json.address || {};
    const parts = [
      addr.city || addr.town || addr.village || addr.hamlet || addr.county,
      addr.state || addr.region || addr.country,
    ].filter(Boolean);
    const placeName = parts.join(', ') || json.display_name?.split(',').slice(0, 2).join(',') || null;

    db.prepare('INSERT OR REPLACE INTO geocode_cache (lat_round, lon_round, place_name, raw_json) VALUES (?, ?, ?, ?)').run(latR, lonR, placeName, JSON.stringify(json));
    return placeName;
  } catch (err) {
    logger.warn(`Geocoding failed for ${lat},${lon}: ${err.message}`);
    db.prepare('INSERT OR IGNORE INTO geocode_cache (lat_round, lon_round, place_name) VALUES (?, ?, NULL)').run(latR, lonR);
    return null;
  }
}

module.exports = { reverseGeocode };
