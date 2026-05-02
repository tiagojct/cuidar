'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../../db');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireRole('admin'));

const ROLE_LABELS = {
  admin:     'Administrador',
  clinician: 'Profissional de saúde',
  caregiver: 'Cuidador',
};

// GET /
router.get('/', (req, res) => {
  const users = db.prepare(
    `SELECT id, name, email, role, active, created_at, last_login_at FROM users ORDER BY role, name`
  ).all();
  res.render('admin/users-list', { title: 'Utilizadores', users, ROLE_LABELS });
});

// GET /novo
router.get('/novo', (req, res) => {
  res.render('admin/user-form', {
    title: 'Novo utilizador',
    user: null,
    ROLE_LABELS,
    action: '/admin/utilizadores',
    submitLabel: 'Criar utilizador',
  });
});

// POST /
router.post('/', (req, res) => {
  const { name, email, role, password } = req.body;
  const errors = [];
  if (!name?.trim())           errors.push('O nome é obrigatório.');
  if (!email?.trim())          errors.push('O email é obrigatório.');
  if (!ROLE_LABELS[role])      errors.push('Papel inválido.');
  if (!password || password.length < 8) errors.push('A palavra-passe deve ter pelo menos 8 caracteres.');

  const rerender = (extra = []) => {
    [...errors, ...extra].forEach(e => res.locals.flash.error.push(e));
    return res.render('admin/user-form', {
      title: 'Novo utilizador',
      user: req.body,
      ROLE_LABELS,
      action: '/admin/utilizadores',
      submitLabel: 'Criar utilizador',
    });
  };

  if (errors.length) return rerender();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) return rerender(['Já existe um utilizador com esse email.']);

  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    `INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, ?, 1)`
  ).run(name.trim(), email.trim().toLowerCase(), hash, role);

  req.flash('success', `Utilizador ${name.trim()} criado com sucesso.`);
  res.redirect('/admin/utilizadores');
});

// GET /:id/editar
router.get('/:id(\\d+)/editar', (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, active FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).render('error', {
    title: 'Não encontrado', message: 'Utilizador não encontrado.',
  });
  res.render('admin/user-form', {
    title: `Editar — ${user.name}`,
    user,
    ROLE_LABELS,
    action: `/admin/utilizadores/${user.id}/editar`,
    submitLabel: 'Guardar alterações',
  });
});

// POST /:id/editar
router.post('/:id(\\d+)/editar', (req, res) => {
  const dbUser = db.prepare('SELECT id, name, email, role, active FROM users WHERE id = ?').get(req.params.id);
  if (!dbUser) return res.status(404).render('error', {
    title: 'Não encontrado', message: 'Utilizador não encontrado.',
  });

  const { name, email, role, password } = req.body;
  const errors = [];
  if (!name?.trim())      errors.push('O nome é obrigatório.');
  if (!email?.trim())     errors.push('O email é obrigatório.');
  if (!ROLE_LABELS[role]) errors.push('Papel inválido.');

  const rerender = (extra = []) => {
    [...errors, ...extra].forEach(e => res.locals.flash.error.push(e));
    return res.render('admin/user-form', {
      title: `Editar — ${dbUser.name}`,
      user: { ...dbUser, ...req.body, id: dbUser.id },
      ROLE_LABELS,
      action: `/admin/utilizadores/${dbUser.id}/editar`,
      submitLabel: 'Guardar alterações',
    });
  };

  if (errors.length) return rerender();

  const emailConflict = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?')
    .get(email.trim().toLowerCase(), dbUser.id);
  if (emailConflict) return rerender(['Já existe outro utilizador com esse email.']);

  if (password && password.length > 0) {
    if (password.length < 8) return rerender(['A nova palavra-passe deve ter pelo menos 8 caracteres.']);
    const hash = bcrypt.hashSync(password, 12);
    db.prepare(
      `UPDATE users SET name = ?, email = ?, role = ?, password_hash = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(name.trim(), email.trim().toLowerCase(), role, hash, dbUser.id);
  } else {
    db.prepare(
      `UPDATE users SET name = ?, email = ?, role = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(name.trim(), email.trim().toLowerCase(), role, dbUser.id);
  }

  req.flash('success', 'Dados do utilizador actualizados.');
  res.redirect('/admin/utilizadores');
});

// POST /:id/toggle-activo
router.post('/:id(\\d+)/toggle-activo', (req, res) => {
  const user = db.prepare('SELECT id, active, role FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).render('error', {
    title: 'Não encontrado', message: 'Utilizador não encontrado.',
  });

  if (user.role === 'admin' && user.active === 1) {
    const otherAdmins = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1 AND id != ?`).get(user.id).n;
    if (otherAdmins === 0) {
      req.flash('error', 'Não pode desactivar o único administrador activo.');
      return res.redirect('/admin/utilizadores');
    }
  }

  db.prepare(`UPDATE users SET active = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(user.active === 1 ? 0 : 1, user.id);

  req.flash('success', user.active === 1 ? 'Utilizador desactivado.' : 'Utilizador activado.');
  res.redirect('/admin/utilizadores');
});

module.exports = router;
