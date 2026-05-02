'use strict';

const express = require('express');
const db = require('../../db');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireRole('clinician', 'admin'));

router.get('/', (req, res) => {
  const diagnoses = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();
  const editId    = req.query.editar ? Number(req.query.editar) : null;

  res.render('clinician/diagnoses', {
    title: 'Condições clínicas',
    diagnoses,
    editId,
  });
});

router.post('/', (req, res) => {
  const { name, slug, sort_order } = req.body;

  const errors = [];
  if (!name || !name.trim()) errors.push('O nome é obrigatório.');
  if (!slug || !slug.trim()) errors.push('A chave (slug) é obrigatória.');

  const cleanSlug = (slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!cleanSlug) errors.push('A chave contém caracteres inválidos.');

  if (!errors.length) {
    const existing = db.prepare('SELECT id FROM diagnoses WHERE slug = ?').get(cleanSlug);
    if (existing) errors.push('Já existe uma condição com essa chave.');
  }

  if (errors.length) {
    errors.forEach(e => res.locals.flash.error.push(e));
    const diagnoses = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();
    return res.render('clinician/diagnoses', {
      title: 'Condições clínicas',
      diagnoses,
      editId: null,
      formData: req.body,
    });
  }

  db.prepare('INSERT INTO diagnoses (name, slug, sort_order) VALUES (?, ?, ?)').run(
    name.trim(), cleanSlug, Number(sort_order) || 0,
  );

  req.flash('success', 'Condição criada.');
  res.redirect('/clinico/condicoes');
});

router.post('/:id(\\d+)/editar', (req, res) => {
  const id = Number(req.params.id);
  const { name, sort_order } = req.body;

  if (!name || !name.trim()) {
    req.flash('error', 'O nome é obrigatório.');
    return res.redirect('/clinico/condicoes');
  }

  db.prepare('UPDATE diagnoses SET name = ?, sort_order = ? WHERE id = ?').run(
    name.trim(), Number(sort_order) || 0, id,
  );

  req.flash('success', 'Condição actualizada.');
  res.redirect('/clinico/condicoes');
});

router.post('/:id(\\d+)/eliminar', (req, res) => {
  const id       = Number(req.params.id);
  const existing = db.prepare('SELECT name, slug FROM diagnoses WHERE id = ?').get(id);
  if (!existing) {
    req.flash('error', 'Condição não encontrada.');
    return res.redirect('/clinico/condicoes');
  }

  const patientCount  = db.prepare('SELECT COUNT(*) AS n FROM patients WHERE primary_diagnosis = ?').get(existing.slug).n;
  const templateCount = db.prepare('SELECT COUNT(*) AS n FROM symptom_templates WHERE condition = ?').get(existing.slug).n;

  if (patientCount > 0 || templateCount > 0) {
    const parts = [];
    if (patientCount  > 0) parts.push(`${patientCount} doente(s)`);
    if (templateCount > 0) parts.push(`${templateCount} modelo(s) de sintomas`);
    req.flash('error', `Não é possível eliminar "${existing.name}" porque está referenciada por ${parts.join(' e ')}. Reatribua-os primeiro.`);
    return res.redirect('/clinico/condicoes');
  }

  db.prepare('DELETE FROM diagnoses WHERE id = ?').run(id);
  req.flash('success', `Condição "${existing.name}" eliminada.`);
  res.redirect('/clinico/condicoes');
});

module.exports = router;
