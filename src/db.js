'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');
const config = require('./config');

const dataDir = path.dirname(config.dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(config.dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK(role IN ('admin','clinician','caregiver')),
    name          TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT,
    active        INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid     TEXT    PRIMARY KEY,
    sess    TEXT    NOT NULL,
    expired INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS patients (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    caregiver_id         INTEGER NOT NULL REFERENCES users(id),
    identifier           TEXT    NOT NULL,
    primary_diagnosis    TEXT    NOT NULL,
    secondary_diagnoses  TEXT,
    clinical_status      TEXT,
    medication           TEXT,
    team_contact         TEXT,
    notes                TEXT,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cards (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id           INTEGER NOT NULL REFERENCES categories(id),
    title                 TEXT    NOT NULL,
    body_markdown         TEXT    NOT NULL,
    body_html             TEXT    NOT NULL,
    tags                  TEXT    NOT NULL DEFAULT '',
    applicable_conditions TEXT    NOT NULL DEFAULT 'geral',
    version               INTEGER NOT NULL DEFAULT 1,
    author_id             INTEGER NOT NULL REFERENCES users(id),
    created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS card_views (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id      INTEGER NOT NULL REFERENCES cards(id),
    caregiver_id INTEGER NOT NULL REFERENCES users(id),
    patient_id   INTEGER REFERENCES patients(id),
    viewed_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS symptom_templates (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    condition     TEXT    NOT NULL,
    symptoms_json TEXT    NOT NULL,
    created_by    INTEGER NOT NULL REFERENCES users(id),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS symptom_entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id      INTEGER NOT NULL REFERENCES patients(id),
    caregiver_id    INTEGER NOT NULL REFERENCES users(id),
    recorded_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    symptoms_json   TEXT    NOT NULL,
    wellbeing_score INTEGER,
    notes           TEXT,
    caregiver_mood  TEXT
  );

  CREATE TABLE IF NOT EXISTS diagnoses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    slug       TEXT    NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS related_cards (
    card_id         INTEGER NOT NULL REFERENCES cards(id),
    related_card_id INTEGER NOT NULL REFERENCES cards(id),
    PRIMARY KEY (card_id, related_card_id)
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
    title,
    body_markdown,
    tags,
    content='cards',
    content_rowid='id'
  );

  CREATE TRIGGER IF NOT EXISTS cards_fts_insert AFTER INSERT ON cards BEGIN
    INSERT INTO cards_fts(rowid, title, body_markdown, tags)
      VALUES (new.id, new.title, new.body_markdown, new.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS cards_fts_update AFTER UPDATE ON cards BEGIN
    INSERT INTO cards_fts(cards_fts, rowid, title, body_markdown, tags)
      VALUES ('delete', old.id, old.title, old.body_markdown, old.tags);
    INSERT INTO cards_fts(rowid, title, body_markdown, tags)
      VALUES (new.id, new.title, new.body_markdown, new.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS cards_fts_delete AFTER DELETE ON cards BEGIN
    INSERT INTO cards_fts(cards_fts, rowid, title, body_markdown, tags)
      VALUES ('delete', old.id, old.title, old.body_markdown, old.tags);
  END;
`);

// Migrations for existing databases
function columnExists(table, col) {
  return db.prepare(`SELECT COUNT(*) AS n FROM pragma_table_info('${table}') WHERE name=?`).get(col).n > 0;
}
if (!columnExists('users', 'updated_at'))    db.exec(`ALTER TABLE users    ADD COLUMN updated_at    TEXT`);
if (!columnExists('users', 'last_login_at')) db.exec(`ALTER TABLE users    ADD COLUMN last_login_at TEXT`);
if (!columnExists('patients', 'team_email')) db.exec(`ALTER TABLE patients ADD COLUMN team_email    TEXT`);

// Sprint 7 migrations
if (!columnExists('patients', 'archived_at'))
  db.exec(`ALTER TABLE patients ADD COLUMN archived_at TEXT`);
if (!columnExists('patients', 'alert_wellbeing_threshold'))
  db.exec(`ALTER TABLE patients ADD COLUMN alert_wellbeing_threshold INTEGER`);
if (!columnExists('patients', 'alert_symptom_threshold'))
  db.exec(`ALTER TABLE patients ADD COLUMN alert_symptom_threshold INTEGER`);
if (!columnExists('patients', 'alert_consecutive_days'))
  db.exec(`ALTER TABLE patients ADD COLUMN alert_consecutive_days INTEGER NOT NULL DEFAULT 1`);
if (!columnExists('symptom_entries', 'clinician_note'))
  db.exec(`ALTER TABLE symptom_entries ADD COLUMN clinician_note TEXT`);

function tableExists(name) {
  return db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name=?`).get(name).n > 0;
}

if (!tableExists('caregiver_messages')) {
  db.exec(`
    CREATE TABLE caregiver_messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id  INTEGER NOT NULL REFERENCES patients(id),
      caregiver_id INTEGER NOT NULL REFERENCES users(id),
      message     TEXT NOT NULL,
      is_urgent   INTEGER NOT NULL DEFAULT 0,
      read_at     TEXT,
      read_by     INTEGER REFERENCES users(id),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_patient ON caregiver_messages(patient_id);
  `);
}

if (!tableExists('patient_audit_log')) {
  db.exec(`
    CREATE TABLE patient_audit_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id  INTEGER NOT NULL REFERENCES patients(id),
      user_id     INTEGER NOT NULL REFERENCES users(id),
      action      TEXT NOT NULL,
      changes_json TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_patient ON patient_audit_log(patient_id);
  `);
}

if (!tableExists('card_feedback')) {
  db.exec(`
    CREATE TABLE card_feedback (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id      INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      caregiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      helpful      INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(card_id, caregiver_id)
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_card ON card_feedback(card_id);
  `);
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
  CREATE INDEX IF NOT EXISTS idx_patients_caregiver ON patients(caregiver_id);
  CREATE INDEX IF NOT EXISTS idx_entries_patient    ON symptom_entries(patient_id);
  CREATE INDEX IF NOT EXISTS idx_cards_category     ON cards(category_id);
  CREATE INDEX IF NOT EXISTS idx_card_views_card    ON card_views(card_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expired   ON sessions(expired);
`);

module.exports = db;
