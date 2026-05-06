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
let email    = process.env.ADMIN_EMAIL;
let password = process.env.ADMIN_PASSWORD;
let name     = process.env.ADMIN_NAME || 'Administrador';

// Fallback to default admin in production if env vars not set
if (process.env.NODE_ENV === 'production' && (!email || !password)) {
  email    = 'admin@cuidar.local';
  password = 'Cuidar2025!Admin';
  console.log('[CUIDAR] A usar admin por defeito (defina ADMIN_EMAIL/ADMIN_PASSWORD para customizar)');
}

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