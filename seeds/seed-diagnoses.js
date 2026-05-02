'use strict';

const db = require('../src/db');

const diagnoses = [
  { name: 'Oncologia',                     slug: 'oncologia',              sort_order: 1 },
  { name: 'Insuficiência Cardíaca',        slug: 'insuficiencia-cardiaca', sort_order: 2 },
  { name: 'Doença Pulmonar Obstrutiva Crónica (DPOC)', slug: 'dpoc',      sort_order: 3 },
  { name: 'Insuficiência Renal Crónica',   slug: 'insuficiencia-renal',    sort_order: 4 },
  { name: 'Demência',                      slug: 'demencia',               sort_order: 5 },
  { name: 'Esclerose Lateral Amiotrófica', slug: 'ela',                    sort_order: 6 },
  { name: 'Geral',                         slug: 'geral',                  sort_order: 99 },
];

const insert = db.prepare('INSERT OR IGNORE INTO diagnoses (name, slug, sort_order) VALUES (?, ?, ?)');

let created = 0;
for (const d of diagnoses) {
  const result = insert.run(d.name, d.slug, d.sort_order);
  if (result.changes) created++;
}

console.log(`Diagnósticos: ${created} criados, ${diagnoses.length - created} já existiam.`);

// Seed default symptom templates (requires at least one admin user)
const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!admin) {
  console.log('Nenhum utilizador admin encontrado — saltar modelos de sintomas.');
  process.exit(0);
}

const templates = [
  {
    name: 'Oncologia — padrão',
    condition: 'oncologia',
    symptoms: [
      { symptom: 'dor',          label: 'Dor' },
      { symptom: 'nauseas',      label: 'Náuseas' },
      { symptom: 'apetite',      label: 'Apetite' },
      { symptom: 'fadiga',       label: 'Fadiga/cansaço' },
      { symptom: 'dispneia',     label: 'Dificuldade respiratória' },
      { symptom: 'ansiedade',    label: 'Ansiedade' },
      { symptom: 'obstipacao',   label: 'Obstipação' },
      { symptom: 'sono',         label: 'Qualidade do sono' },
    ],
  },
  {
    name: 'Insuficiência Cardíaca — padrão',
    condition: 'insuficiencia-cardiaca',
    symptoms: [
      { symptom: 'dispneia',     label: 'Dificuldade respiratória' },
      { symptom: 'edema',        label: 'Inchaço (edema)' },
      { symptom: 'fadiga',       label: 'Fadiga/cansaço' },
      { symptom: 'apetite',      label: 'Apetite' },
      { symptom: 'ansiedade',    label: 'Ansiedade' },
      { symptom: 'sono',         label: 'Qualidade do sono' },
    ],
  },
  {
    name: 'Geral — padrão',
    condition: 'geral',
    symptoms: [
      { symptom: 'dor',          label: 'Dor' },
      { symptom: 'apetite',      label: 'Apetite' },
      { symptom: 'fadiga',       label: 'Fadiga/cansaço' },
      { symptom: 'sono',         label: 'Qualidade do sono' },
      { symptom: 'ansiedade',    label: 'Ansiedade' },
    ],
  },
];

const insertTemplate = db.prepare(`
  INSERT OR IGNORE INTO symptom_templates (name, condition, symptoms_json, created_by)
  VALUES (?, ?, ?, ?)
`);

let tplCreated = 0;
for (const t of templates) {
  const result = insertTemplate.run(t.name, t.condition, JSON.stringify(t.symptoms), admin.id);
  if (result.changes) tplCreated++;
}

console.log(`Modelos de sintomas: ${tplCreated} criados.`);
