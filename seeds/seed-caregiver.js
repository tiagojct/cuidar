'use strict';
const bcrypt = require('bcryptjs');
const db = require('../src/db');

const USERS = [
  { email: 'cuidador@cuidar.local', password: 'cuidador123', name: 'Cuidador Teste' },
];

for (const u of USERS) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
  if (existing) {
    console.log(`Utilizador já existe: ${u.email}`);
    continue;
  }
  const hash = bcrypt.hashSync(u.password, 12);
  db.prepare(
    `INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, 'caregiver', ?)`
  ).run(u.email, hash, u.name);
  console.log(`Cuidador criado: ${u.email} / ${u.password}`);
}

console.warn('\n⚠️  Credenciais de desenvolvimento — alterar em produção!\n');
