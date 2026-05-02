'use strict';
// Idempotent setup — runs on every container start.
// Spawns each seed in a child process to handle their process.exit() calls.

const { execFileSync } = require('child_process');
const db     = require('../src/db');
const bcrypt = require('bcryptjs');

const node  = process.execPath;
const flag  = '--experimental-sqlite';
const seeds = [
  'seeds/seed-categories.js',
  'seeds/seed-diagnoses.js',
  'seeds/seed-cards.js',
  'seeds/seed-cards-extended.js',
  'seeds/seed-templates-extended.js',
];

for (const s of seeds) {
  execFileSync(node, [flag, s], { stdio: 'inherit' });
}

// Create admin from env vars if not yet present
const email    = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name     = process.env.ADMIN_NAME || 'Administrador';

if (email && password) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 12);
    db.prepare(
      "INSERT INTO users (email, password_hash, role, name, active) VALUES (?, ?, 'admin', ?, 1)"
    ).run(email, hash, name);
    console.log(`[CUIDAR] Admin criado: ${email}`);
  } else {
    console.log(`[CUIDAR] Admin já existe — sem alterações.`);
  }
} else {
  console.log('[CUIDAR] ADMIN_EMAIL/ADMIN_PASSWORD não definidos — saltar criação de admin.');
}
