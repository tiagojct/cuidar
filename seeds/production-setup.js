'use strict';
// Idempotent setup — runs on every container start.
// Spawns each seed in a child process to handle their process.exit() calls.

const { execFileSync } = require('child_process');
const db     = require('../src/db');
const bcrypt = require('bcryptjs');

const node  = process.execPath;
const flag  = '--experimental-sqlite';

// Step 1: Run categories and diagnoses seeds
console.log('[CUIDAR] A executar seeds: categorias e diagnósticos...');
execFileSync(node, [flag, 'seeds/seed-categories.js'], { stdio: 'inherit' });
execFileSync(node, [flag, 'seeds/seed-diagnoses.js'], { stdio: 'inherit' });

// Step 2: Create admin user from env vars (must exist before seed-cards.js)
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

// Step 3: Run remaining seeds that require admin/clinician to exist
console.log('[CUIDAR] A executar seeds: fichas e modelos...');
execFileSync(node, [flag, 'seeds/seed-cards.js'], { stdio: 'inherit' });
execFileSync(node, [flag, 'seeds/seed-cards-extended.js'], { stdio: 'inherit' });
execFileSync(node, [flag, 'seeds/seed-templates-extended.js'], { stdio: 'inherit' });

console.log('[CUIDAR] Setup completo.');