'use strict';

const express = require('express');
const db = require('../../db');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireRole('clinician', 'admin'));

function parseSecondary(raw) {
  if (!raw) return [];
  return [].concat(raw).filter(Boolean);
}

function isAlertEntry(entry) {
  if (entry.wellbeing_score !== null && entry.wellbeing_score <= 3) return true;
  try { return Object.values(JSON.parse(entry.symptoms_json)).some(v => Number(v) >= 7); }
  catch { return false; }
}

function buildChartData(entries) {
  const labels    = entries.map(e => e.recorded_at.substring(0, 10));
  const wellbeing = entries.map(e => e.wellbeing_score);
  const slugSet   = new Set();
  entries.forEach(e => {
    try { Object.keys(JSON.parse(e.symptoms_json || '{}')).forEach(s => slugSet.add(s)); } catch {}
  });
  const slugs = [...slugSet];
  const symptomData = {};
  slugs.forEach(slug => {
    symptomData[slug] = entries.map(e => {
      try { const s = JSON.parse(e.symptoms_json || '{}'); return slug in s ? Number(s[slug]) : null; }
      catch { return null; }
    });
  });
  return { labels, wellbeing, slugs, symptomData };
}

function computeStats(entries) {
  const wbVals = entries.map(e => e.wellbeing_score).filter(v => v !== null);
  const avgWellbeing = wbVals.length > 0
    ? (wbVals.reduce((a, b) => a + b, 0) / wbVals.length).toFixed(1) : null;
  return { total: entries.length, avgWellbeing, alertDays: entries.filter(isAlertEntry).length };
}

function getEntries(patientId, dias, full) {
  const base = `SELECT recorded_at, symptoms_json, wellbeing_score${full ? ', notes, caregiver_mood' : ''}
    FROM symptom_entries WHERE patient_id = ?`;
  if (dias && /^\d+$/.test(String(dias))) {
    return db.prepare(`${base} AND recorded_at >= datetime('now',?) ORDER BY recorded_at ASC`)
      .all(patientId, `-${dias} days`);
  }
  return db.prepare(`${base} ORDER BY recorded_at ASC`).all(patientId);
}

const PAGE_SIZE = 50;

// GET /
router.get('/', (req, res) => {
  const q              = (req.query.q || '').trim();
  const showArchived   = req.query.arquivados === '1';
  const page           = Math.max(1, parseInt(req.query.pagina) || 1);
  const offset         = (page - 1) * PAGE_SIZE;
  const archiveClause  = showArchived ? `p.archived_at IS NOT NULL` : `p.archived_at IS NULL`;

  const baseSelect = `
    SELECT p.id, p.identifier, p.primary_diagnosis, p.created_at, p.updated_at,
           p.archived_at,
           u.name AS caregiver_name, d.name AS diagnosis_name,
           MAX(se.recorded_at) AS last_entry_at
    FROM patients p
    JOIN users u ON u.id = p.caregiver_id
    LEFT JOIN diagnoses d ON d.slug = p.primary_diagnosis
    LEFT JOIN symptom_entries se ON se.patient_id = p.id
  `;

  let patients, totalCount;
  if (q) {
    patients = db.prepare(`${baseSelect}
      WHERE (p.identifier LIKE ? OR u.name LIKE ?) AND ${archiveClause}
      GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    `).all(`%${q}%`, `%${q}%`, PAGE_SIZE, offset);
    totalCount = db.prepare(`SELECT COUNT(*) AS n FROM patients p JOIN users u ON u.id = p.caregiver_id
      WHERE (p.identifier LIKE ? OR u.name LIKE ?) AND ${archiveClause}`).get(`%${q}%`, `%${q}%`).n;
  } else {
    patients = db.prepare(`${baseSelect}
      WHERE ${archiveClause}
      GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    `).all(PAGE_SIZE, offset);
    totalCount = db.prepare(`SELECT COUNT(*) AS n FROM patients WHERE ${archiveClause}`).get().n;
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const inactiveDays = 14;
  const inactiveCutoff = new Date(Date.now() - inactiveDays * 86400000).toISOString().substring(0, 10);
  const inactivePatients = (showArchived || page > 1) ? [] : patients.filter(p =>
    !p.last_entry_at || p.last_entry_at.substring(0, 10) < inactiveCutoff
  );

  res.render('clinician/patients-list', {
    title: 'Doentes', patients, searchQuery: q,
    showArchived, inactivePatients, inactiveDays,
    page, totalPages, totalCount,
  });
});

// GET /novo
router.get('/novo', (req, res) => {
  const caregivers = db.prepare(
    `SELECT id, name, email FROM users WHERE role = 'caregiver' AND active = 1 ORDER BY name`
  ).all();
  const diagnoses = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();
  const preselectedCuid = req.query.cuid ? parseInt(req.query.cuid) : null;

  res.render('clinician/patient-form', {
    title: 'Novo doente',
    patient: null,
    secondaryList: [],
    caregivers,
    diagnoses,
    preselectedCuid,
    action: '/clinico/doentes',
    submitLabel: 'Criar doente',
    newCaregiverUrl: '/clinico/cuidadores/novo?returnTo=/clinico/doentes/novo',
  });
});

// POST /
router.post('/', (req, res) => {
  const { identifier, caregiver_id, primary_diagnosis,
          clinical_status, medication, team_contact, team_email, notes } = req.body;
  const secondary = parseSecondary(req.body.secondary_diagnoses);

  const caregiverOk = caregiver_id &&
    db.prepare(`SELECT id FROM users WHERE id = ? AND role = 'caregiver' AND active = 1`).get(parseInt(caregiver_id));

  if (!identifier?.trim() || !caregiverOk || !primary_diagnosis) {
    const msg = !caregiverOk && caregiver_id
      ? 'O cuidador seleccionado não existe ou está inactivo.'
      : 'Preencha os campos obrigatórios: identificador, cuidador e diagnóstico principal.';
    res.locals.flash.error.push(msg);
    const caregivers = db.prepare(
      `SELECT id, name, email FROM users WHERE role = 'caregiver' AND active = 1 ORDER BY name`
    ).all();
    const diagnoses = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();
    return res.render('clinician/patient-form', {
      title: 'Novo doente',
      patient: req.body,
      secondaryList: secondary,
      caregivers,
      diagnoses,
      preselectedCuid: parseInt(caregiver_id) || null,
      action: '/clinico/doentes',
      submitLabel: 'Criar doente',
      newCaregiverUrl: '/clinico/cuidadores/novo?returnTo=/clinico/doentes/novo',
    });
  }

  const validSlugs = new Set(db.prepare('SELECT slug FROM diagnoses').all().map(d => d.slug));
  const secondaryFiltered = secondary.filter(s => validSlugs.has(s));

  const teamEmailClean = (team_email || '').trim().toLowerCase();
  if (teamEmailClean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teamEmailClean)) {
    res.locals.flash.error.push('O email da equipa não é válido.');
    const caregivers = db.prepare(
      `SELECT id, name, email FROM users WHERE role = 'caregiver' AND active = 1 ORDER BY name`
    ).all();
    const diagnoses = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();
    return res.render('clinician/patient-form', {
      title: 'Novo doente', patient: req.body, secondaryList: secondary, caregivers, diagnoses,
      preselectedCuid: parseInt(caregiver_id) || null, action: '/clinico/doentes',
      submitLabel: 'Criar doente', newCaregiverUrl: '/clinico/cuidadores/novo?returnTo=/clinico/doentes/novo',
    });
  }

  db.prepare(`
    INSERT INTO patients
      (caregiver_id, identifier, primary_diagnosis, secondary_diagnoses,
       clinical_status, medication, team_contact, team_email, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    parseInt(caregiver_id), identifier.trim(), primary_diagnosis,
    JSON.stringify(secondaryFiltered),
    (clinical_status || '').trim(), (medication || '').trim(),
    (team_contact || '').trim(), teamEmailClean,
    (notes || '').trim(),
  );

  req.flash('success', 'Doente criado com sucesso.');
  res.redirect('/clinico/doentes');
});

// GET /:id
router.get('/:id(\\d+)', (req, res) => {
  const patient = db.prepare(`
    SELECT p.*, u.name AS caregiver_name, d.name AS diagnosis_name
    FROM patients p
    JOIN users u ON u.id = p.caregiver_id
    LEFT JOIN diagnoses d ON d.slug = p.primary_diagnosis
    WHERE p.id = ?
  `).get(req.params.id);

  if (!patient) return res.status(404).render('error', {
    title: 'Não encontrado', message: 'Doente não encontrado.',
  });

  let secondaryList = [];
  try { secondaryList = JSON.parse(patient.secondary_diagnoses || '[]'); } catch {}

  const secondaryNames = secondaryList.length > 0
    ? db.prepare(`SELECT name, slug FROM diagnoses WHERE slug IN (${secondaryList.map(() => '?').join(',')})`)
        .all(...secondaryList)
    : [];

  const entries = db.prepare(`
    SELECT se.*, u.name AS caregiver_name
    FROM symptom_entries se
    JOIN users u ON u.id = se.caregiver_id
    WHERE se.patient_id = ?
    ORDER BY se.recorded_at DESC
    LIMIT 20
  `).all(patient.id);

  let tmpl = db.prepare(`SELECT symptoms_json FROM symptom_templates WHERE condition = ? LIMIT 1`).get(patient.primary_diagnosis);
  if (!tmpl) tmpl = db.prepare(`SELECT symptoms_json FROM symptom_templates WHERE condition = 'geral' LIMIT 1`).get();
  const slugLabels = {};
  if (tmpl) {
    try { JSON.parse(tmpl.symptoms_json).forEach(s => { slugLabels[s.symptom] = s.label; }); } catch {}
  }

  const unreadMessages = db.prepare(
    'SELECT COUNT(*) AS n FROM caregiver_messages WHERE patient_id = ? AND read_at IS NULL'
  ).get(patient.id).n;

  const auditLog = db.prepare(`
    SELECT al.*, u.name AS user_name FROM patient_audit_log al
    JOIN users u ON u.id = al.user_id WHERE al.patient_id = ? ORDER BY al.created_at DESC LIMIT 10
  `).all(patient.id);

  res.render('clinician/patient-view', {
    title: patient.identifier,
    patient, secondaryNames, entries, slugLabels, unreadMessages, auditLog,
  });
});

// GET /:id/editar
router.get('/:id(\\d+)/editar', (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).render('error', {
    title: 'Não encontrado', message: 'Doente não encontrado.',
  });

  const caregivers = db.prepare(
    `SELECT id, name, email FROM users WHERE role = 'caregiver' AND active = 1 ORDER BY name`
  ).all();
  const diagnoses = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();
  let secondaryList = [];
  try { secondaryList = JSON.parse(patient.secondary_diagnoses || '[]'); } catch {}

  res.render('clinician/patient-form', {
    title: `Editar — ${patient.identifier}`,
    patient, secondaryList, caregivers, diagnoses,
    preselectedCuid: null,
    action: `/clinico/doentes/${patient.id}/editar`,
    submitLabel: 'Guardar alterações',
    newCaregiverUrl: `/clinico/cuidadores/novo?returnTo=/clinico/doentes/${patient.id}/editar`,
  });
});

// POST /:id/editar
router.post('/:id(\\d+)/editar', (req, res) => {
  const existing = db.prepare('SELECT id FROM patients WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).render('error', {
    title: 'Não encontrado', message: 'Doente não encontrado.',
  });

  const { identifier, caregiver_id, primary_diagnosis,
          clinical_status, medication, team_contact, team_email, notes } = req.body;
  const secondary = parseSecondary(req.body.secondary_diagnoses);

  if (!identifier?.trim() || !caregiver_id || !primary_diagnosis) {
    req.flash('error', 'Preencha os campos obrigatórios.');
    return res.redirect(`/clinico/doentes/${existing.id}/editar`);
  }

  const validSlugsE = new Set(db.prepare('SELECT slug FROM diagnoses').all().map(d => d.slug));
  const secondaryFiltered = secondary.filter(s => validSlugsE.has(s));

  const alertWellbeing  = req.body.alert_wellbeing_threshold ? parseInt(req.body.alert_wellbeing_threshold) : null;
  const alertSymptom    = req.body.alert_symptom_threshold   ? parseInt(req.body.alert_symptom_threshold)   : null;
  const alertConsec     = parseInt(req.body.alert_consecutive_days) || 1;

  const before = db.prepare('SELECT * FROM patients WHERE id = ?').get(existing.id);

  const teamEmailEdit = (team_email || '').trim().toLowerCase();
  if (teamEmailEdit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teamEmailEdit)) {
    req.flash('error', 'O email da equipa não é válido.');
    return res.redirect(`/clinico/doentes/${existing.id}/editar`);
  }

  db.prepare(`
    UPDATE patients SET
      caregiver_id = ?, identifier = ?, primary_diagnosis = ?, secondary_diagnoses = ?,
      clinical_status = ?, medication = ?, team_contact = ?, team_email = ?, notes = ?,
      alert_wellbeing_threshold = ?, alert_symptom_threshold = ?, alert_consecutive_days = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    parseInt(caregiver_id), identifier.trim(), primary_diagnosis, JSON.stringify(secondaryFiltered),
    (clinical_status || '').trim(), (medication || '').trim(),
    (team_contact || '').trim(), teamEmailEdit,
    (notes || '').trim(),
    alertWellbeing, alertSymptom, alertConsec,
    existing.id,
  );

  db.prepare('INSERT INTO patient_audit_log (patient_id, user_id, action, changes_json) VALUES (?, ?, ?, ?)')
    .run(existing.id, res.locals.user.id, 'edited', JSON.stringify({
      identifier: before.identifier !== identifier.trim() ? [before.identifier, identifier.trim()] : undefined,
      caregiver_id: before.caregiver_id !== parseInt(caregiver_id) ? [before.caregiver_id, parseInt(caregiver_id)] : undefined,
      primary_diagnosis: before.primary_diagnosis !== primary_diagnosis ? [before.primary_diagnosis, primary_diagnosis] : undefined,
    }));

  req.flash('success', 'Dados do doente actualizados.');
  res.redirect(`/clinico/doentes/${existing.id}`);
});

// POST /:id/arquivar
router.post('/:id(\\d+)/arquivar', (req, res) => {
  const p = db.prepare('SELECT id, identifier FROM patients WHERE id = ? AND archived_at IS NULL').get(req.params.id);
  if (!p) { req.flash('error', 'Doente não encontrado ou já arquivado.'); return res.redirect('/clinico/doentes'); }
  db.prepare(`UPDATE patients SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(p.id);
  db.prepare('INSERT INTO patient_audit_log (patient_id, user_id, action) VALUES (?, ?, ?)').run(p.id, res.locals.user.id, 'archived');
  req.flash('success', `Doente "${p.identifier}" arquivado. Os dados ficam preservados.`);
  res.redirect('/clinico/doentes');
});

// POST /:id/desarquivar
router.post('/:id(\\d+)/desarquivar', (req, res) => {
  const p = db.prepare('SELECT id, identifier FROM patients WHERE id = ? AND archived_at IS NOT NULL').get(req.params.id);
  if (!p) { req.flash('error', 'Doente não encontrado ou não está arquivado.'); return res.redirect('/clinico/doentes?arquivados=1'); }
  db.prepare(`UPDATE patients SET archived_at = NULL, updated_at = datetime('now') WHERE id = ?`).run(p.id);
  db.prepare('INSERT INTO patient_audit_log (patient_id, user_id, action) VALUES (?, ?, ?)').run(p.id, res.locals.user.id, 'unarchived');
  req.flash('success', `Doente "${p.identifier}" reactivado.`);
  res.redirect(`/clinico/doentes/${p.id}`);
});

// POST /:id/eliminar
router.post('/:id(\\d+)/eliminar', (req, res) => {
  const existing = db.prepare('SELECT id FROM patients WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).render('error', {
    title: 'Não encontrado', message: 'Doente não encontrado.',
  });

  try {
    db.exec('BEGIN');
    db.prepare('DELETE FROM caregiver_messages WHERE patient_id = ?').run(existing.id);
    db.prepare('DELETE FROM patient_audit_log WHERE patient_id = ?').run(existing.id);
    db.prepare('DELETE FROM symptom_entries WHERE patient_id = ?').run(existing.id);
    db.prepare('DELETE FROM card_views WHERE patient_id = ?').run(existing.id);
    db.prepare('DELETE FROM patients WHERE id = ?').run(existing.id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error(err);
    req.flash('error', 'Erro ao eliminar o doente.');
    return res.redirect('/clinico/doentes');
  }

  req.flash('success', 'Doente eliminado.');
  res.redirect('/clinico/doentes');
});

// GET /:id/dashboard
router.get('/:id(\\d+)/dashboard', (req, res) => {
  const patient = db.prepare(`
    SELECT p.*, u.name AS caregiver_name, d.name AS diagnosis_name
    FROM patients p
    JOIN users u ON u.id = p.caregiver_id
    LEFT JOIN diagnoses d ON d.slug = p.primary_diagnosis
    WHERE p.id = ?
  `).get(req.params.id);

  if (!patient) return res.status(404).render('error', {
    title: 'Não encontrado', message: 'Doente não encontrado.',
  });

  const dias      = req.query.dias !== undefined ? String(req.query.dias) : '30';
  const entries   = getEntries(patient.id, dias, false);
  const chartData = buildChartData(entries);
  const stats     = computeStats(entries);

  let tmpl = db.prepare(`SELECT symptoms_json FROM symptom_templates WHERE condition = ? LIMIT 1`).get(patient.primary_diagnosis);
  if (!tmpl) tmpl = db.prepare(`SELECT symptoms_json FROM symptom_templates WHERE condition = 'geral' LIMIT 1`).get();
  const slugLabels = {};
  if (tmpl) {
    try { JSON.parse(tmpl.symptoms_json).forEach(s => { slugLabels[s.symptom] = s.label; }); } catch {}
  }

  res.render('shared/dashboard', {
    title: `Evolução — ${patient.identifier}`,
    patient, chartData, stats, dias, slugLabels,
    backUrl:     `/clinico/doentes/${patient.id}`,
    reportUrl:   `/clinico/doentes/${patient.id}/relatorio`,
    dashBaseUrl: `/clinico/doentes/${patient.id}/dashboard`,
  });
});

// GET /:id/relatorio
router.get('/:id(\\d+)/relatorio', (req, res) => {
  const patient = db.prepare(`
    SELECT p.*, u.name AS caregiver_name, d.name AS diagnosis_name
    FROM patients p
    JOIN users u ON u.id = p.caregiver_id
    LEFT JOIN diagnoses d ON d.slug = p.primary_diagnosis
    WHERE p.id = ?
  `).get(req.params.id);

  if (!patient) return res.status(404).render('error', {
    title: 'Não encontrado', message: 'Doente não encontrado.',
  });

  const entries = getEntries(patient.id, null, true);

  const slugSet = new Set();
  entries.forEach(e => {
    try { Object.keys(JSON.parse(e.symptoms_json || '{}')).forEach(s => slugSet.add(s)); } catch {}
  });
  const slugs = [...slugSet];

  let template = db.prepare(
    `SELECT * FROM symptom_templates WHERE condition = ? LIMIT 1`
  ).get(patient.primary_diagnosis);
  if (!template) template = db.prepare(
    `SELECT * FROM symptom_templates WHERE condition = 'geral' LIMIT 1`
  ).get();
  const slugLabels = {};
  if (template) {
    try { JSON.parse(template.symptoms_json).forEach(s => { slugLabels[s.symptom] = s.label; }); } catch {}
  }

  res.locals.layout = 'layouts/print';
  res.render('shared/report', {
    title: `Relatório — ${patient.identifier}`,
    patient, entries, slugs, slugLabels,
    backUrl: `/clinico/doentes/${patient.id}`,
    generatedAt: new Date().toISOString().substring(0, 16).replace('T', ' '),
  });
});

// GET /:id/export.csv
router.get('/:id(\\d+)/export.csv', (req, res) => {
  const patient = db.prepare(`
    SELECT p.*, u.name AS caregiver_name, d.name AS diagnosis_name
    FROM patients p
    JOIN users u ON u.id = p.caregiver_id
    LEFT JOIN diagnoses d ON d.slug = p.primary_diagnosis
    WHERE p.id = ?
  `).get(req.params.id);

  if (!patient) return res.status(404).send('Doente não encontrado.');

  const entries = db.prepare(`
    SELECT recorded_at, symptoms_json, wellbeing_score, caregiver_mood, notes
    FROM symptom_entries WHERE patient_id = ? ORDER BY recorded_at ASC
  `).all(patient.id);

  let tmpl = db.prepare(`SELECT symptoms_json FROM symptom_templates WHERE condition = ? LIMIT 1`).get(patient.primary_diagnosis);
  if (!tmpl) tmpl = db.prepare(`SELECT symptoms_json FROM symptom_templates WHERE condition = 'geral' LIMIT 1`).get();
  const slugLabels = {};
  if (tmpl) {
    try { JSON.parse(tmpl.symptoms_json).forEach(s => { slugLabels[s.symptom] = s.label; }); } catch {}
  }

  const slugSet = new Set();
  entries.forEach(e => {
    try { Object.keys(JSON.parse(e.symptoms_json || '{}')).forEach(s => slugSet.add(s)); } catch {}
  });
  const slugs = [...slugSet];

  function csvCell(v) {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const headers = ['Data', 'Bem-estar', ...slugs.map(s => slugLabels[s] || s), 'Estado cuidador', 'Notas'];
  const rows = entries.map(e => {
    let syms = {};
    try { syms = JSON.parse(e.symptoms_json || '{}'); } catch {}
    return [
      e.recorded_at.substring(0, 16).replace('T', ' '),
      e.wellbeing_score !== null ? e.wellbeing_score : '',
      ...slugs.map(s => s in syms ? syms[s] : ''),
      e.caregiver_mood || '',
      e.notes || '',
    ];
  });

  const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  const filename = `cuidar-${patient.identifier.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().substring(0,10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + csv); // BOM for Excel compatibility
});

// POST /:id/registos/:entryId/nota — clinician annotation on a symptom entry
router.post('/:id(\\d+)/registos/:entryId(\\d+)/nota', (req, res) => {
  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).render('error', { title: 'Não encontrado', message: 'Doente não encontrado.' });

  const entry = db.prepare('SELECT id FROM symptom_entries WHERE id = ? AND patient_id = ?').get(req.params.entryId, patient.id);
  if (!entry) return res.status(404).render('error', { title: 'Não encontrado', message: 'Registo não encontrado.' });

  const note = (req.body.clinician_note || '').trim();
  db.prepare('UPDATE symptom_entries SET clinician_note = ? WHERE id = ?').run(note || null, entry.id);

  req.flash('success', note ? 'Nota clínica guardada.' : 'Nota clínica removida.');
  res.redirect(`/clinico/doentes/${patient.id}`);
});

// GET /export-todos.csv — export all active patients
router.get('/export-todos.csv', (req, res) => {
  const patients = db.prepare(`
    SELECT p.*, u.name AS caregiver_name, d.name AS diagnosis_name
    FROM patients p
    JOIN users u ON u.id = p.caregiver_id
    LEFT JOIN diagnoses d ON d.slug = p.primary_diagnosis
    WHERE p.archived_at IS NULL
    ORDER BY p.identifier
  `).all();

  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  const headers = ['Identificador','Diagnóstico principal','Cuidador','Estado clínico','Medicação','Contacto equipa','Notas','Criado em'];
  const rows = patients.map(p => [
    p.identifier, p.diagnosis_name || p.primary_diagnosis, p.caregiver_name,
    p.clinical_status || '', p.medication || '', p.team_contact || '',
    p.notes || '', p.created_at.substring(0,10),
  ]);

  const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="cuidar-doentes-${new Date().toISOString().substring(0,10)}.csv"`);
  res.send('﻿' + csv);
});

// GET /:id/mensagens — clinician view of caregiver messages for a patient
router.get('/:id(\\d+)/mensagens', (req, res) => {
  const patient = db.prepare(`
    SELECT p.*, u.name AS caregiver_name FROM patients p JOIN users u ON u.id = p.caregiver_id WHERE p.id = ?
  `).get(req.params.id);
  if (!patient) return res.status(404).render('error', { title: 'Não encontrado', message: 'Doente não encontrado.' });

  const messages = db.prepare(`
    SELECT m.*, u.name AS read_by_name
    FROM caregiver_messages m
    LEFT JOIN users u ON u.id = m.read_by
    WHERE m.patient_id = ?
    ORDER BY m.created_at DESC
  `).all(patient.id);

  // Mark unread as read
  db.prepare(`UPDATE caregiver_messages SET read_at = datetime('now'), read_by = ? WHERE patient_id = ? AND read_at IS NULL`)
    .run(res.locals.user.id, patient.id);

  res.render('clinician/patient-messages', { title: `Mensagens — ${patient.identifier}`, patient, messages });
});

module.exports = router;
