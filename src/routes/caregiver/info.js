'use strict';

const express = require('express');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
const db = require('../../db');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireRole('caregiver', 'clinician', 'admin'));

function sanitizeFts(q) {
  return q.trim().split(/\s+/)
    .map(w => w.replace(/["'*^(){}[\]]/g, '').trim())
    .filter(w => w.length > 0)
    .map(w => `"${w}"*`)
    .join(' AND ');
}

function parseConditions(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return raw ? [raw] : [];
  }
}

// GET /cuidador/informacao
router.get('/', (req, res) => {
  const q           = (req.query.q || '').trim();
  const categoriaId = parseInt(req.query.categoria) || null;
  const condicao    = (req.query.condicao || '').trim();

  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  const diagnoses  = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();

  let cards;

  if (q) {
    let useIds = null;
    try {
      useIds = db.prepare(`
        SELECT c.id FROM cards_fts
        JOIN cards c ON c.id = cards_fts.rowid
        WHERE cards_fts MATCH ? ORDER BY rank
      `).all(sanitizeFts(q)).map(r => r.id);
    } catch { /* FTS syntax error → fall through to LIKE */ }

    if (useIds !== null) {
      if (useIds.length === 0) {
        cards = [];
      } else {
        const ph = useIds.map(() => '?').join(',');
        let sql = `
          SELECT c.id, c.title, c.tags, c.applicable_conditions,
                 cat.name AS category_name, cat.id AS category_id
          FROM cards c JOIN categories cat ON c.category_id = cat.id
          WHERE c.id IN (${ph})`;
        const params = [...useIds];
        if (categoriaId) { sql += ' AND c.category_id = ?'; params.push(categoriaId); }
        sql += ' ORDER BY c.title';
        cards = db.prepare(sql).all(...params);
      }
    } else {
      const like = `%${q}%`;
      let sql = `
        SELECT c.id, c.title, c.tags, c.applicable_conditions,
               cat.name AS category_name, cat.id AS category_id
        FROM cards c JOIN categories cat ON c.category_id = cat.id
        WHERE (c.title LIKE ? OR c.tags LIKE ?)`;
      const params = [like, like];
      if (categoriaId) { sql += ' AND c.category_id = ?'; params.push(categoriaId); }
      sql += ' ORDER BY c.title';
      cards = db.prepare(sql).all(...params);
    }
  } else {
    let sql = `
      SELECT c.id, c.title, c.tags, c.applicable_conditions,
             cat.name AS category_name, cat.id AS category_id
      FROM cards c JOIN categories cat ON c.category_id = cat.id
      WHERE 1=1`;
    const params = [];
    if (categoriaId) { sql += ' AND c.category_id = ?'; params.push(categoriaId); }
    sql += ' ORDER BY cat.sort_order, c.title';
    cards = db.prepare(sql).all(...params);
  }

  if (condicao) {
    cards = cards.filter(c => parseConditions(c.applicable_conditions).includes(condicao));
  }

  const viewedIds = new Set(
    db.prepare('SELECT DISTINCT card_id FROM card_views WHERE caregiver_id = ?')
      .all(req.session.userId).map(r => r.card_id)
  );

  res.render('caregiver/info-list', {
    title: 'Informação para cuidadores',
    cards,
    categories,
    diagnoses,
    viewedIds,
    searchQuery: q,
    activeCategory: categoriaId,
    activeCondition: condicao,
  });
});

// GET /cuidador/informacao/urgencias — shortcut to emergency cards
router.get('/urgencias', (req, res) => {
  const cat = db.prepare(
    `SELECT id FROM categories WHERE name LIKE '%urgente%' ORDER BY sort_order DESC LIMIT 1`
  ).get();
  res.redirect(cat ? `/cuidador/informacao?categoria=${cat.id}` : '/cuidador/informacao');
});

// GET /cuidador/informacao/:id — view a card and log it
router.get('/:id(\\d+)', (req, res) => {
  const card = db.prepare(`
    SELECT c.*, cat.name AS category_name
    FROM cards c JOIN categories cat ON c.category_id = cat.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!card) {
    return res.status(404).render('error', {
      title: 'Não encontrado',
      message: 'Esta ficha de informação não existe.',
    });
  }

  db.prepare(
    `INSERT INTO card_views (card_id, caregiver_id, viewed_at) VALUES (?, ?, datetime('now'))`
  ).run(card.id, req.session.userId);

  const bodyHtml   = sanitizeHtml(marked.parse((card.body_markdown || '').trim()), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'details', 'summary']),
  });
  const conditionSlugs = parseConditions(card.applicable_conditions);
  const tags           = (card.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  const diagRows = conditionSlugs.length > 0
    ? db.prepare(`SELECT name, slug FROM diagnoses WHERE slug IN (${conditionSlugs.map(() => '?').join(',')})`)
        .all(...conditionSlugs)
    : [];
  const conditionLabels = Object.fromEntries(diagRows.map(r => [r.slug, r.name]));

  const related = db.prepare(`
    SELECT c2.id, c2.title, cat.name AS category_name
    FROM related_cards rc
    JOIN cards c2 ON c2.id = rc.related_card_id
    JOIN categories cat ON cat.id = c2.category_id
    WHERE rc.card_id = ?
  `).all(card.id);

  const feedbackRow = db.prepare(
    'SELECT helpful FROM card_feedback WHERE card_id = ? AND caregiver_id = ?'
  ).get(card.id, req.session.userId);
  const myFeedback = feedbackRow ? feedbackRow.helpful : null;

  res.render('caregiver/info-card', {
    title: card.title,
    card,
    bodyHtml,
    conditions: conditionSlugs,
    conditionLabels,
    tags,
    related,
    myFeedback,
  });
});

// POST /:id/feedback — save helpfulness rating
router.post('/:id(\\d+)/feedback', (req, res) => {
  const cardId  = parseInt(req.params.id);
  const helpful = req.body.helpful === '0' ? 0 : 1;

  const card = db.prepare('SELECT id FROM cards WHERE id = ?').get(cardId);
  if (!card) return res.redirect('/cuidador/informacao');

  db.prepare(`
    INSERT OR REPLACE INTO card_feedback (card_id, caregiver_id, helpful)
    VALUES (?, ?, ?)
  `).run(cardId, req.session.userId, helpful);

  res.redirect(`/cuidador/informacao/${cardId}`);
});

module.exports = router;
