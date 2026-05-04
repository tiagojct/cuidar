'use strict';

const express = require('express');
const session = require('express-session');
const flash   = require('connect-flash');
const path    = require('path');
const crypto  = require('crypto');
const layouts = require('express-ejs-layouts');

const db     = require('./db');
const config = require('./config');
const { requireRole } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

// Clinician routes (Sprint 2)
const clinicoCards      = require('./routes/clinician/cards');
const clinicoCategories = require('./routes/clinician/categories');
const clinicoTemplates  = require('./routes/clinician/templates');
const clinicoDiagnoses  = require('./routes/clinician/diagnoses');
const clinicoStats      = require('./routes/clinician/stats');

// Caregiver routes (Sprint 3)
const cuidadorInfo     = require('./routes/caregiver/info');

// Patient routes (Sprint 4)
const clinicoPacientes = require('./routes/clinician/patients');
const cuidadorDoentes  = require('./routes/caregiver/patients');

// Admin routes (Sprint 6)
const adminUtilizadores  = require('./routes/admin/users');
const clinicoCuidadores  = require('./routes/clinician/caregivers');
const contaRoutes        = require('./routes/account');

const app = express();

// ── Session store (better-sqlite3, no extra dependency) ──────────────────────
class SQLiteStore extends session.Store {
  constructor(database) {
    super();
    this._db = database;
    const cleanup = database.prepare('DELETE FROM sessions WHERE expired < ?');
    setInterval(() => cleanup.run(Date.now()), 15 * 60 * 1000).unref();
  }

  get(sid, cb) {
    try {
      const row = this._db.prepare(
        'SELECT sess FROM sessions WHERE sid = ? AND expired > ?'
      ).get(sid, Date.now());
      cb(null, row ? JSON.parse(row.sess) : null);
    } catch (err) { cb(err); }
  }

  set(sid, sess, cb) {
    try {
      const expired = sess.cookie.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + 7 * 24 * 60 * 60 * 1000;
      this._db.prepare(
        'INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?, ?, ?)'
      ).run(sid, JSON.stringify(sess), expired);
      cb(null);
    } catch (err) { cb(err); }
  }

  destroy(sid, cb) {
    try {
      this._db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      cb(null);
    } catch (err) { cb(err); }
  }

  touch(sid, sess, cb) {
    try {
      const expired = sess.cookie.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + 7 * 24 * 60 * 60 * 1000;
      this._db.prepare(
        'UPDATE sessions SET expired = ? WHERE sid = ?'
      ).run(expired, sid);
      cb(null);
    } catch (err) { cb(err); }
  }
}

// ── View engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(layouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));

// ── Session ───────────────────────────────────────────────────────────────────
app.use(session({
  store: new SQLiteStore(db),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'cuidar.sid',
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'strict',
  },
}));

app.use(flash());

// ── Template locals (runs early so error pages always have user/flash) ────────
app.use((req, res, next) => {
  res.locals.title   = 'CUIDAR';
  res.locals.backUrl = req.headers.referer || '/';
  res.locals.user  = req.session.userId ? {
    id:   req.session.userId,
    role: req.session.userRole,
    name: req.session.userName,
  } : null;
  res.locals.flash = {
    error:   req.flash('error'),
    success: req.flash('success'),
    info:    req.flash('info'),
  };
  next();
});

// ── CSRF (synchroniser token, Node built-in crypto) ───────────────────────────
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.body._csrf || req.headers['x-csrf-token'];
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).render('error', {
        title:   'Erro de segurança',
        message: 'Token de segurança inválido. Por favor recarregue a página e tente novamente.',
        status:  403,
        backUrl: req.headers.referer || '/',
      });
    }
  }
  next();
});

// ── Security headers ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.session && req.session.userId) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
  }
  next();
});

// ── Health check (no auth required) ───────────────────────────────────────────
app.get('/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', authRoutes);

app.get('/', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const dest = {
    admin:     '/admin/utilizadores',
    clinician: '/clinico/fichas',
    caregiver: '/cuidador/doentes',
  };
  res.redirect(dest[req.session.userRole] || '/login');
});

// Clinician area (Sprint 2)
app.use('/clinico/fichas',      clinicoCards);
app.use('/clinico/categorias',  clinicoCategories);
app.use('/clinico/modelos',     clinicoTemplates);
app.use('/clinico/condicoes',   clinicoDiagnoses);
app.use('/clinico/estatisticas', clinicoStats);

// Admin area (Sprint 6)
app.use('/admin/utilizadores', adminUtilizadores);
app.use('/clinico/cuidadores', clinicoCuidadores);

// Caregiver area (Sprint 3)
app.use('/cuidador/informacao', cuidadorInfo);

// Patient area (Sprint 4)
app.use('/clinico/doentes',  clinicoPacientes);
app.use('/cuidador/doentes', cuidadorDoentes);

// Account (self password change)
app.use('/conta', contaRoutes);

// Feedback (for testing)
const feedbackRoutes = require('./routes/feedback');
app.use('/', feedbackRoutes);

// Help / manual
const { requireLogin } = require('./middleware/auth');
app.get('/ajuda', requireLogin, (req, res) => {
  res.render('shared/help', { title: 'Ajuda — Manual de utilização' });
});

app.get('/referencias', requireLogin, (req, res) => {
  res.render('shared/references', { title: 'Referências Clínicas' });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    title:   'Página não encontrada',
    message: 'A página que procura não existe.',
    status:  404,
    backUrl: req.headers.referer || '/',
  });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).render('error', {
    title:   'Erro interno',
    message: isDev ? err.message : 'Ocorreu um erro inesperado. Por favor tente mais tarde.',
    status:  500,
    backUrl: req.headers.referer || '/',
  });
});

app.listen(config.port, () => {
  console.log(`CUIDAR a correr em http://localhost:${config.port}`);
});

module.exports = app;
