CREATE TABLE IF NOT EXISTS photos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path       TEXT UNIQUE NOT NULL,
    file_hash       TEXT NOT NULL,
    file_mtime      INTEGER NOT NULL,
    file_size       INTEGER NOT NULL,

    taken_at        TEXT,
    gps_lat         REAL,
    gps_lon         REAL,
    place_name      TEXT,

    description     TEXT,
    scene_type      TEXT,
    categories      TEXT,
    objects         TEXT,
    is_indoor       INTEGER,
    people_count    INTEGER,
    people_desc     TEXT,

    status          TEXT NOT NULL DEFAULT 'pending',
    error_message   TEXT,
    processed_at    TEXT,

    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_photos_status   ON photos(status);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at);
CREATE INDEX IF NOT EXISTS idx_photos_place    ON photos(place_name);

CREATE VIRTUAL TABLE IF NOT EXISTS photos_fts USING fts5(
    description, scene_type, categories, objects, people_desc, place_name,
    content='photos', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS photos_ai AFTER INSERT ON photos BEGIN
    INSERT INTO photos_fts(rowid, description, scene_type, categories, objects, people_desc, place_name)
    VALUES (new.id, new.description, new.scene_type, new.categories, new.objects, new.people_desc, new.place_name);
END;

CREATE TRIGGER IF NOT EXISTS photos_ad AFTER DELETE ON photos BEGIN
    INSERT INTO photos_fts(photos_fts, rowid, description, scene_type, categories, objects, people_desc, place_name)
    VALUES ('delete', old.id, old.description, old.scene_type, old.categories, old.objects, old.people_desc, old.place_name);
END;

CREATE TRIGGER IF NOT EXISTS photos_au AFTER UPDATE ON photos BEGIN
    INSERT INTO photos_fts(photos_fts, rowid, description, scene_type, categories, objects, people_desc, place_name)
    VALUES ('delete', old.id, old.description, old.scene_type, old.categories, old.objects, old.people_desc, old.place_name);
    INSERT INTO photos_fts(rowid, description, scene_type, categories, objects, people_desc, place_name)
    VALUES (new.id, new.description, new.scene_type, new.categories, new.objects, new.people_desc, new.place_name);
END;

CREATE TABLE IF NOT EXISTS geocode_cache (
    lat_round   REAL NOT NULL,
    lon_round   REAL NOT NULL,
    place_name  TEXT,
    raw_json    TEXT,
    fetched_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (lat_round, lon_round)
);

CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);
