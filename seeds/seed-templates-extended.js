'use strict';
const db = require('../src/db');

const admin = db.prepare("SELECT id FROM users WHERE role IN ('admin','clinician') LIMIT 1").get();
if (!admin) {
  console.error('Nenhum utilizador admin/clinician encontrado. Execute seed-admin primeiro.');
  process.exit(1);
}

const templates = [
  {
    name: 'DPOC — padrão',
    condition: 'dpoc',
    symptoms: [
      { symptom: 'dispneia',     label: 'Dificuldade respiratória' },
      { symptom: 'tosse',        label: 'Tosse' },
      { symptom: 'fadiga',       label: 'Fadiga/cansaço' },
      { symptom: 'ansiedade',    label: 'Ansiedade' },
      { symptom: 'sono',         label: 'Qualidade do sono' },
      { symptom: 'apetite',      label: 'Apetite' },
    ],
  },
  {
    name: 'Insuficiência Renal Crónica — padrão',
    condition: 'insuficiencia-renal',
    symptoms: [
      { symptom: 'fadiga',       label: 'Fadiga/cansaço' },
      { symptom: 'dor',          label: 'Dor' },
      { symptom: 'nauseas',      label: 'Náuseas' },
      { symptom: 'apetite',      label: 'Apetite' },
      { symptom: 'ansiedade',    label: 'Ansiedade' },
      { symptom: 'sono',         label: 'Qualidade do sono' },
    ],
  },
  {
    name: 'Demência — padrão',
    condition: 'demencia',
    symptoms: [
      { symptom: 'dor',          label: 'Dor (sinais comportamentais)' },
      { symptom: 'agitacao',     label: 'Agitação/inquietude' },
      { symptom: 'apetite',      label: 'Apetite' },
      { symptom: 'sono',         label: 'Qualidade do sono' },
      { symptom: 'ansiedade',    label: 'Ansiedade' },
    ],
  },
  {
    name: 'Esclerose Lateral Amiotrófica — padrão',
    condition: 'ela',
    symptoms: [
      { symptom: 'dispneia',     label: 'Dificuldade respiratória' },
      { symptom: 'fadiga',       label: 'Fadiga/cansaço' },
      { symptom: 'dor',          label: 'Dor' },
      { symptom: 'degluticao',   label: 'Dificuldade de deglutição' },
      { symptom: 'ansiedade',    label: 'Ansiedade' },
      { symptom: 'sono',         label: 'Qualidade do sono' },
    ],
  },
];

const insertTemplate = db.prepare(`
  INSERT OR IGNORE INTO symptom_templates (name, condition, symptoms_json, created_by)
  VALUES (?, ?, ?, ?)
`);

let created = 0;
for (const t of templates) {
  const result = insertTemplate.run(t.name, t.condition, JSON.stringify(t.symptoms), admin.id);
  if (result.changes) { console.log(`Modelo criado: ${t.name}`); created++; }
  else console.log(`Modelo já existe: ${t.name}`);
}

console.log(`\n${created} modelo(s) criado(s).`);
