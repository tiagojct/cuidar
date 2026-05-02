'use strict';

const bcrypt = require('bcryptjs');
const db     = require('../src/db');

const email    = process.argv[2] || 'admin@cuidar.local';
const password = process.argv[3] || 'admin123';
const name     = process.argv[4] || 'Administrador';

if (!process.argv[2]) {
  console.warn('\nATENCAO: a usar credenciais padrao de desenvolvimento.');
  console.warn('  Email:    admin@cuidar.local');
  console.warn('  Password: admin123');
  console.warn('  Altere a password imediatamente apos o primeiro inicio de sessao.\n');
}

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log(`Utilizador "${email}" ja existe. Nada a fazer.`);
  process.exit(0);
}

const hash = bcrypt.hashSync(password, 12);
db.prepare(
  'INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)'
).run(email, hash, 'admin', name);

console.log(`Admin criado: ${email} (${name})`);
