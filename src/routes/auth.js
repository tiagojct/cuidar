'use strict';

const express   = require('express');
const bcrypt    = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db        = require('../db');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: false,
  legacyHeaders:   false,
  handler: (req, res) => {
    req.flash('error', 'Demasiadas tentativas de acesso. Aguarde 15 minutos antes de tentar novamente.');
    res.redirect('/login');
  },
});

const router = express.Router();

const ROLE_REDIRECT = {
  admin:     '/admin/utilizadores',
  clinician: '/clinico/fichas',
  caregiver: '/cuidador/doentes',
};

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('auth/login', { title: 'Iniciar sessão' });
});

router.post('/login', loginLimiter, (req, res, next) => {
  const email    = (req.body.email    || '').trim().toLowerCase();
  const password = (req.body.password || '');

  if (!email || !password) {
    req.flash('error', 'Preencha o email e a palavra-passe.');
    return res.redirect('/login');
  }

  const user = db.prepare(
    'SELECT * FROM users WHERE email = ? AND active = 1'
  ).get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    req.flash('error', 'Email ou palavra-passe incorrectos.');
    return res.redirect('/login');
  }

  db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(user.id);

  // Regenerate session to prevent fixation attacks
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId   = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;
    req.session.save((err) => {
      if (err) return next(err);
      res.redirect(ROLE_REDIRECT[user.role] || '/');
    });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
