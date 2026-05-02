'use strict';

const db = require('../src/db');

const categories = [
  { name: 'Gestão de Sintomas',  sort_order: 1 },
  { name: 'Cuidados Diários',    sort_order: 2 },
  { name: 'Apoio Emocional',     sort_order: 3 },
  { name: 'Situações Urgentes',  sort_order: 4 },
];

const insert = db.prepare(
  'INSERT OR IGNORE INTO categories (name, sort_order) VALUES (?, ?)'
);

let created = 0;
for (const cat of categories) {
  const result = insert.run(cat.name, cat.sort_order);
  if (result.changes) created++;
}

console.log(`Categorias: ${created} criadas, ${categories.length - created} já existiam.`);
