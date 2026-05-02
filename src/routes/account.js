'use strict';

const express    = require('express');
const bcrypt     = require('bcryptjs');
const rateLimit  = require('express-rate-limit');
const db         = require('../db');
const { requireLogin } = require('../middleware/auth');

const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: false,
  legacyHeaders:   false,
  handler: (req, res) => {
    req.flash('error', 'Demasiadas tentativas. Aguarde 15 minutos antes de tentar novamente.');
    res.redirect('/conta');
  },
});

const router = express.Router();
router.use(requireLogin);

router.get('/', (req, res) => {
  res.render('shared/account', { title: 'A minha conta' });
});

router.post('/', accountLimiter, (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.redirect('/login');

  if (!bcrypt.compareSync(current_password || '', user.password_hash)) {
    req.flash('error', 'Palavra-passe actual incorrecta.');
    return res.redirect('/conta');
  }
  if (!new_password || new_password.length < 8) {
    req.flash('error', 'A nova palavra-passe deve ter pelo menos 8 caracteres.');
    return res.redirect('/conta');
  }
  if (new_password !== confirm_password) {
    req.flash('error', 'As palavras-passe não coincidem.');
    return res.redirect('/conta');
  }

  const hash = bcrypt.hashSync(new_password, 12);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(hash, user.id);

  req.flash('success', 'Palavra-passe alterada com sucesso.');
  res.redirect('/conta');
});

module.exports = router;
