'use strict';
const bcrypt = require('bcryptjs');
const db = require('../src/db');

const email    = 'clinico@cuidar.local';
const password = 'clinico123';
const name     = 'Profissional de Saúde Teste';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log(`Utilizador já existe: ${email}`);
} else {
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    `INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, 'clinician', ?)`
  ).run(email, hash, name);
  console.log(`Profissional criado: ${email} / ${password}`);
}

// Create a demo patient assigned to the test caregiver (if one exists and no patients yet)
const caregiver = db.prepare(`SELECT id FROM users WHERE email = 'cuidador@cuidar.local' LIMIT 1`).get();
if (!caregiver) {
  console.log('Cuidador de teste não encontrado — saltar criação do doente de demo.');
  process.exit(0);
}

const existingPatient = db.prepare('SELECT id FROM patients WHERE caregiver_id = ?').get(caregiver.id);
if (existingPatient) {
  console.log('Doente de demo já existe.');
  process.exit(0);
}

const diagnosis = db.prepare(`SELECT slug FROM diagnoses WHERE slug = 'oncologia' LIMIT 1`).get();
if (!diagnosis) {
  console.log('Diagnóstico oncologia não encontrado — saltar criação do doente de demo.');
  process.exit(0);
}

db.prepare(`
  INSERT INTO patients (caregiver_id, identifier, primary_diagnosis, secondary_diagnoses,
    clinical_status, team_contact, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  caregiver.id,
  'Doente Demo',
  'oncologia',
  JSON.stringify([]),
  'Fase avançada — cuidados paliativos domiciliários',
  'Dr.ª Santos — 910 000 000 — seg a sex 9h–17h',
  'Doente de demonstração criado pelo seed. Pode ser eliminado.',
);

console.log('Doente de demo criado para o cuidador de teste.');

console.warn('\n⚠️  Credenciais de desenvolvimento — alterar em produção!\n');
