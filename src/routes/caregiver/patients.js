'use strict';

const express = require('express');
const db = require('../../db');
const { requireRole } = require('../../middleware/auth');
const { sendMail } = require('../../utils/mailer');

const router = express.Router();
router.use(requireRole('caregiver'));

function isAlertEntry(entry) {
  if (entry.wellbeing_score !== null && entry.wellbeing_score <= 3) return true;
  try {
    return Object.values(JSON.parse(entry.symptoms_json)).some(v => Number(v) >= 7);
  } catch { return false; }
}

function computeSeverityLevel(wellbeing, symptomsObj) {
  const vals = Object.values(symptomsObj).map(Number);
  if ((wellbeing !== null && wellbeing <= 1) || vals.some(v => v === 10)) return 'urgente';
  if ((wellbeing !== null && wellbeing <= 3) || vals.some(v => v >= 7))   return 'equipa';
  if ((wellbeing !== null && wellbeing <= 4) || vals.some(v => v >= 5))   return 'vigilancia';
  return 'ok';
}

function buildChartData(entries) {
  const labels   = entries.map(e => e.recorded_at.substring(0, 10));
  const wellbeing = entries.map(e => e.wellbeing_score);
  const slugSet  = new Set();
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

// GET / — list this caregiver's patients
router.get('/', (req, res) => {
  const patients = db.prepare(`
    SELECT p.id, p.identifier, p.primary_diagnosis, p.updated_at,
           d.name AS diagnosis_name
    FROM patients p
    LEFT JOIN diagnoses d ON d.slug = p.primary_diagnosis
    WHERE p.caregiver_id = ?
    ORDER BY p.identifier
  `).all(req.session.userId);

  res.render('caregiver/patients-list', { title: 'Os meus doentes', patients });
});

// GET /:id — patient profile + recent entries
router.get('/:id(\\d+)', (req, res) => {
  const patient = db.prepare(`
    SELECT p.*, d.name AS diagnosis_name
    FROM patients p
    LEFT JOIN diagnoses d ON d.slug = p.primary_diagnosis
    WHERE p.id = ? AND p.caregiver_id = ?
  `).get(req.params.id, req.session.userId);

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
    SELECT * FROM symptom_entries
    WHERE patient_id = ?
    ORDER BY recorded_at DESC
    LIMIT 7
  `).all(patient.id);

  const severityAlert = (req.flash('severity') || [])[0] || null;
  const showAlert = !severityAlert && entries.length > 0 && isAlertEntry(entries[0]);

  let tmpl = db.prepare(`SELECT symptoms_json FROM symptom_templates WHERE condition = ? LIMIT 1`).get(patient.primary_diagnosis);
  if (!tmpl) tmpl = db.prepare(`SELECT symptoms_json FROM symptom_templates WHERE condition = 'geral' LIMIT 1`).get();
  const slugLabels = {};
  if (tmpl) {
    try { JSON.parse(tmpl.symptoms_json).forEach(s => { slugLabels[s.symptom] = s.label; }); } catch {}
  }

  res.render('caregiver/patient-view', {
    title: patient.identifier,
    patient, secondaryNames, entries, showAlert, slugLabels, severityAlert,
  });
});

// GET /:id/sintomas/novo — symptom entry form
router.get('/:id(\\d+)/sintomas/novo', (req, res) => {
  const patient = db.prepare(`
    SELECT p.*, d.name AS diagnosis_name
    FROM patients p
    LEFT JOIN diagnoses d ON d.slug = p.primary_diagnosis
    WHERE p.id = ? AND p.caregiver_id = ?
  `).get(req.params.id, req.session.userId);

  if (!patient) return res.status(404).render('error', {
    title: 'Não encontrado', message: 'Doente não encontrado.',
  });

  let template = db.prepare(
    `SELECT * FROM symptom_templates WHERE condition = ? ORDER BY id LIMIT 1`
  ).get(patient.primary_diagnosis);
  if (!template) {
    template = db.prepare(
      `SELECT * FROM symptom_templates WHERE condition = 'geral' ORDER BY id LIMIT 1`
    ).get();
  }

  let symptoms = [];
  if (template) {
    try { symptoms = JSON.parse(template.symptoms_json); } catch {}
  }

  const alreadyToday = !!db.prepare(
    `SELECT id FROM symptom_entries WHERE patient_id = ? AND DATE(recorded_at) = DATE('now')`
  ).get(patient.id);

  res.render('caregiver/symptom-form', {
    title: 'Registar sintomas',
    patient, symptoms,
    templateName: template ? template.name : null,
    alreadyToday,
  });
});

// POST /:id/sintomas — save entry
router.post('/:id(\\d+)/sintomas', (req, res) => {
  const patient = db.prepare(
    'SELECT p.*, d.name AS diagnosis_name FROM patients p LEFT JOIN diagnoses d ON d.slug = p.primary_diagnosis WHERE p.id = ? AND p.caregiver_id = ?'
  ).get(req.params.id, req.session.userId);

  if (!patient) return res.status(404).render('error', {
    title: 'Não encontrado', message: 'Doente não encontrado.',
  });

  const rawWb = parseInt(req.body.wellbeing_score);
  const wellbeing = !isNaN(rawWb) ? Math.min(10, Math.max(0, rawWb)) : null;
  const notes = (req.body.notes || '').trim();
  const mood  = (req.body.caregiver_mood || '').trim();

  const symptomsObj = {};
  for (const [key, val] of Object.entries(req.body)) {
    if (key.startsWith('symptom_')) {
      symptomsObj[key.slice(8)] = Math.min(10, Math.max(0, parseInt(val) || 0));
    }
  }

  db.prepare(`
    INSERT INTO symptom_entries
      (patient_id, caregiver_id, symptoms_json, wellbeing_score, notes, caregiver_mood)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(patient.id, req.session.userId,
         JSON.stringify(symptomsObj), wellbeing, notes, mood);

  const wbThreshold  = patient.alert_wellbeing_threshold  ?? 3;
  const symThreshold = patient.alert_symptom_threshold    ?? 7;
  const needsAlert = (wellbeing !== null && wellbeing <= wbThreshold)
    || Object.values(symptomsObj).some(v => v >= symThreshold);

  const severityLevel = computeSeverityLevel(wellbeing, symptomsObj);
  req.flash('severity', severityLevel);

  if (needsAlert && patient.team_email) {
    const caregiver = db.prepare('SELECT name FROM users WHERE id = ?').get(req.session.userId);
    const symptomLines = Object.entries(symptomsObj)
      .filter(([, v]) => v >= symThreshold)
      .map(([s, v]) => `  ${s}: ${v}/10`)
      .join('\n');
    sendMail({
      to: patient.team_email,
      subject: `[CUIDAR] Alerta de sintomas — ${patient.identifier}`,
      text: [
        `O cuidador ${caregiver ? caregiver.name : ''} registou valores preocupantes para ${patient.identifier}.`,
        '',
        wellbeing !== null && wellbeing <= wbThreshold ? `Bem-estar geral: ${wellbeing}/10` : '',
        symptomLines ? `Sintomas com valor elevado:\n${symptomLines}` : '',
        notes ? `\nNotas do cuidador: ${notes}` : '',
        '',
        `Aceda à aplicação CUIDAR para ver o registo completo.`,
      ].filter(Boolean).join('\n'),
    });
  }

  res.redirect(`/cuidador/doentes/${patient.id}`);
});

// GET /:id/dashboard
router.get('/:id(\\d+)/dashboard', (req, res) => {
  const patient = db.prepare(`
    SELECT p.*, d.name AS diagnosis_name
    FROM patients p LEFT JOIN diagnoses d ON d.slug = p.primary_diagnosis
    WHERE p.id = ? AND p.caregiver_id = ?
  `).get(req.params.id, req.session.userId);

  if (!patient) return res.status(404).render('error', {
    title: 'Não encontrado', message: 'Doente não encontrado.',
  });

  const dias    = req.query.dias !== undefined ? String(req.query.dias) : '30';
  const entries = getEntries(patient.id, dias, false);
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
    backUrl:     `/cuidador/doentes/${patient.id}`,
    reportUrl:   `/cuidador/doentes/${patient.id}/relatorio`,
    dashBaseUrl: `/cuidador/doentes/${patient.id}/dashboard`,
  });
});

// GET /:id/relatorio
router.get('/:id(\\d+)/relatorio', (req, res) => {
  const patient = db.prepare(`
    SELECT p.*, d.name AS diagnosis_name
    FROM patients p LEFT JOIN diagnoses d ON d.slug = p.primary_diagnosis
    WHERE p.id = ? AND p.caregiver_id = ?
  `).get(req.params.id, req.session.userId);

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
    backUrl: `/cuidador/doentes/${patient.id}`,
    generatedAt: new Date().toISOString().substring(0, 16).replace('T', ' '),
  });
});

// GET /:id/mensagem — form to send a question/flag to the clinical team
router.get('/:id(\\d+)/mensagem', (req, res) => {
  const patient = db.prepare(
    `SELECT p.id, p.identifier FROM patients p WHERE p.id = ? AND p.caregiver_id = ?`
  ).get(req.params.id, req.session.userId);
  if (!patient) return res.status(404).render('error', { title: 'Não encontrado', message: 'Doente não encontrado.' });
  res.render('caregiver/message-form', { title: 'Enviar mensagem', patient });
});

// POST /:id/mensagem
router.post('/:id(\\d+)/mensagem', (req, res) => {
  const patient = db.prepare(
    `SELECT p.id, p.identifier, p.team_email FROM patients p WHERE p.id = ? AND p.caregiver_id = ?`
  ).get(req.params.id, req.session.userId);
  if (!patient) return res.status(404).render('error', { title: 'Não encontrado', message: 'Doente não encontrado.' });

  const message  = (req.body.message || '').trim();
  const isUrgent = req.body.is_urgent === '1' ? 1 : 0;

  if (!message) {
    req.flash('error', 'A mensagem não pode estar vazia.');
    return res.redirect(`/cuidador/doentes/${patient.id}/mensagem`);
  }

  db.prepare('INSERT INTO caregiver_messages (patient_id, caregiver_id, message, is_urgent) VALUES (?, ?, ?, ?)')
    .run(patient.id, req.session.userId, message, isUrgent);

  if (patient.team_email) {
    const caregiver = db.prepare('SELECT name FROM users WHERE id = ?').get(req.session.userId);
    sendMail({
      to: patient.team_email,
      subject: `[CUIDAR]${isUrgent ? ' URGENTE —' : ''} Mensagem do cuidador — ${patient.identifier}`,
      text: `${caregiver ? caregiver.name : 'O cuidador'} enviou uma mensagem relativa a ${patient.identifier}:\n\n"${message}"\n\nAceda à aplicação CUIDAR para responder.`,
    });
  }

  req.flash('success', isUrgent
    ? 'Mensagem urgente enviada. A equipa clínica foi notificada.'
    : 'Mensagem enviada. A equipa clínica irá responder em breve.');
  res.redirect(`/cuidador/doentes/${patient.id}`);
});

module.exports = router;
