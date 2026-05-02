'use strict';

const express = require('express');
const db = require('../../db');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireRole('clinician', 'admin'));

router.get('/', (req, res) => {
  const templates = db.prepare(`
    SELECT t.*, u.name AS author_name
    FROM symptom_templates t
    JOIN users u ON t.created_by = u.id
    ORDER BY t.condition, t.name
  `).all();

  const diagnoses = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();

  res.render('clinician/templates-list', {
    title: 'Modelos de sintomas',
    templates,
    diagnoses,
  });
});

router.get('/novo', (req, res) => {
  const diagnoses = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();

  res.render('clinician/template-editor', {
    title:       'Novo modelo',
    template:    null,
    diagnoses,
    symptoms:    [],
    action:      '/clinico/modelos',
    submitLabel: 'Criar modelo',
  });
});

router.post('/', (req, res) => {
  const { name, condition, symptoms_json } = req.body;

  const errors = [];
  if (!name || !name.trim())      errors.push('O nome é obrigatório.');
  if (!condition || !condition.trim()) errors.push('A condição é obrigatória.');

  let symptoms = [];
  try {
    symptoms = JSON.parse(symptoms_json || '[]');
    if (!Array.isArray(symptoms) || symptoms.length === 0) errors.push('Adicione pelo menos um sintoma.');
  } catch {
    errors.push('Dados de sintomas inválidos.');
  }

  if (errors.length) {
    errors.forEach(e => req.flash('error', e));
    const diagnoses = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();
    return res.render('clinician/template-editor', {
      title: 'Novo modelo', template: req.body, diagnoses, symptoms,
      action: '/clinico/modelos', submitLabel: 'Criar modelo',
    });
  }

  db.prepare(`
    INSERT INTO symptom_templates (name, condition, symptoms_json, created_by)
    VALUES (?, ?, ?, ?)
  `).run(name.trim(), condition.trim(), JSON.stringify(symptoms), res.locals.user.id);

  req.flash('success', 'Modelo criado com sucesso.');
  res.redirect('/clinico/modelos');
});

router.get('/:id(\\d+)/editar', (req, res) => {
  const template = db.prepare('SELECT * FROM symptom_templates WHERE id = ?').get(Number(req.params.id));
  if (!template) {
    req.flash('error', 'Modelo não encontrado.');
    return res.redirect('/clinico/modelos');
  }

  const diagnoses = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();

  res.render('clinician/template-editor', {
    title:       `Editar — ${template.name}`,
    template,
    diagnoses,
    symptoms:    JSON.parse(template.symptoms_json || '[]'),
    action:      `/clinico/modelos/${template.id}/editar`,
    submitLabel: 'Guardar alterações',
  });
});

router.post('/:id(\\d+)/editar', (req, res) => {
  const id       = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM symptom_templates WHERE id = ?').get(id);
  if (!existing) {
    req.flash('error', 'Modelo não encontrado.');
    return res.redirect('/clinico/modelos');
  }

  const { name, condition, symptoms_json } = req.body;

  const errors = [];
  if (!name || !name.trim())      errors.push('O nome é obrigatório.');
  if (!condition || !condition.trim()) errors.push('A condição é obrigatória.');

  let symptoms = [];
  try {
    symptoms = JSON.parse(symptoms_json || '[]');
    if (!Array.isArray(symptoms) || symptoms.length === 0) errors.push('Adicione pelo menos um sintoma.');
  } catch {
    errors.push('Dados de sintomas inválidos.');
  }

  if (errors.length) {
    errors.forEach(e => req.flash('error', e));
    const diagnoses = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();
    return res.render('clinician/template-editor', {
      title: `Editar — ${name || existing.name}`,
      template: { ...existing, ...req.body, id }, diagnoses, symptoms,
      action: `/clinico/modelos/${id}/editar`, submitLabel: 'Guardar alterações',
    });
  }

  db.prepare(`
    UPDATE symptom_templates SET name = ?, condition = ?, symptoms_json = ?
    WHERE id = ?
  `).run(name.trim(), condition.trim(), JSON.stringify(symptoms), id);

  req.flash('success', 'Modelo actualizado com sucesso.');
  res.redirect('/clinico/modelos');
});

router.post('/:id(\\d+)/eliminar', (req, res) => {
  const id       = Number(req.params.id);
  const existing = db.prepare('SELECT name FROM symptom_templates WHERE id = ?').get(id);
  if (!existing) {
    req.flash('error', 'Modelo não encontrado.');
    return res.redirect('/clinico/modelos');
  }

  db.prepare('DELETE FROM symptom_templates WHERE id = ?').run(id);
  req.flash('success', `Modelo "${existing.name}" eliminado.`);
  res.redirect('/clinico/modelos');
});

module.exports = router;
