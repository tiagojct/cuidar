'use strict';

const db = require('../db');

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    req.flash('error', 'Tem de iniciar sessão para aceder a esta página.');
    return res.redirect('/login');
  }
  const user = db.prepare('SELECT active FROM users WHERE id = ?').get(req.session.userId);
  if (!user || user.active === 0) {
    req.session.destroy(() => {});
    req.flash('error', 'A sua conta foi desactivada. Contacte o administrador.');
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return [
    requireLogin,
    (req, res, next) => {
      if (!roles.includes(req.session.userRole)) {
        return res.status(403).render('error', {
          title: 'Acesso negado',
          message: 'Não tem permissões para aceder a esta página.',
        });
      }
      next();
    },
  ];
}

module.exports = { requireLogin, requireRole };
