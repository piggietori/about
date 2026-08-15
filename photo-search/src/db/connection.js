const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../../config/config');

let db;

function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
  }
  return db;
}

function runMigrations(db) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
}

module.exports = { getDb };
