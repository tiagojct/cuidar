'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../../db');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireRole('clinician', 'admin'));

// GET /novo
router.get('/novo', (req, res) => {
  res.render('clinician/caregiver-form', {
    title: 'Novo cuidador',
    returnTo: req.query.returnTo || '/clinico/doentes/novo',
  });
});

// POST /
router.post('/', (req, res) => {
  const { name, email, password, returnTo } = req.body;
  const safeReturn = (returnTo && returnTo.startsWith('/clinico/')) ? returnTo : '/clinico/doentes/novo';

  const errors = [];
  if (!name?.trim())                    errors.push('O nome é obrigatório.');
  if (!email?.trim())                   errors.push('O email é obrigatório.');
  if (!password || password.length < 8) errors.push('A palavra-passe deve ter pelo menos 8 caracteres.');

  const rerender = (extra = []) => {
    [...errors, ...extra].forEach(e => res.locals.flash.error.push(e));
    return res.render('clinician/caregiver-form', {
      title: 'Novo cuidador',
      returnTo: safeReturn,
      form: req.body,
    });
  };

  if (errors.length) return rerender();

  const emailLc = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailLc);
  if (existing) return rerender(['Não foi possível criar o cuidador. Verifique os dados e tente novamente.']);

  const hash   = bcrypt.hashSync(password, 12);
  const result = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, 'caregiver', 1)`
  ).run(name.trim(), emailLc, hash);

  req.flash('success', `Cuidador ${name.trim()} criado. Pode agora seleccioná-lo na lista.`);
  res.redirect(`${safeReturn}?cuid=${result.lastInsertRowid}`);
});

// GET /:id/editar
router.get('/:id(\\d+)/editar', (req, res) => {
  const caregiver = db.prepare(`SELECT id, name, email, active FROM users WHERE id = ? AND role = 'caregiver'`).get(Number(req.params.id));
  if (!caregiver) {
    req.flash('error', 'Cuidador não encontrado.');
    return res.redirect('/clinico/doentes');
  }
  res.render('clinician/caregiver-edit', { title: `Editar cuidador — ${caregiver.name}`, caregiver });
});

// POST /:id/editar
router.post('/:id(\\d+)/editar', (req, res) => {
  const id = Number(req.params.id);
  const caregiver = db.prepare(`SELECT id FROM users WHERE id = ? AND role = 'caregiver'`).get(id);
  if (!caregiver) {
    req.flash('error', 'Cuidador não encontrado.');
    return res.redirect('/clinico/doentes');
  }

  const { name, new_password } = req.body;
  if (!name?.trim()) {
    req.flash('error', 'O nome é obrigatório.');
    return res.redirect(`/clinico/cuidadores/${id}/editar`);
  }

  if (new_password && new_password.length > 0) {
    if (new_password.length < 8) {
      req.flash('error', 'A nova palavra-passe deve ter pelo menos 8 caracteres.');
      return res.redirect(`/clinico/cuidadores/${id}/editar`);
    }
    const hash = bcrypt.hashSync(new_password, 12);
    db.prepare(`UPDATE users SET name = ?, password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(name.trim(), hash, id);
  } else {
    db.prepare(`UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(name.trim(), id);
  }

  req.flash('success', 'Dados do cuidador actualizados.');
  res.redirect(`/clinico/cuidadores/${id}/editar`);
});

module.exports = router;
