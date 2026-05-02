'use strict';

const express = require('express');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
const db = require('../../db');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireRole('clinician', 'admin'));

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseConditions(raw) {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function sanitizeQuery(q) {
  return q.trim().split(/\s+/)
    .map(w => w.replace(/["'*^(){}[\]]/g, '').trim())
    .filter(w => w.length > 0)
    .map(w => `"${w}"*`)
    .join(' AND ');
}

function cardListQuery() {
  return db.prepare(`
    SELECT c.id, c.title, c.tags, c.applicable_conditions, c.version,
           c.updated_at, cat.name AS category_name, u.name AS author_name
    FROM cards c
    JOIN categories cat ON c.category_id = cat.id
    JOIN users u ON c.author_id = u.id
  `);
}

// ── List cards ────────────────────────────────────────────────────────────────

const CARDS_PAGE_SIZE = 50;

router.get('/', (req, res) => {
  const { categoria, q } = req.query;
  const page    = Math.max(1, parseInt(req.query.pagina) || 1);
  const offset  = (page - 1) * CARDS_PAGE_SIZE;
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();

  let cards = [], totalCount = 0;
  const cardCols = `c.id, c.title, c.tags, c.applicable_conditions, c.version,
    c.updated_at, cat.name AS category_name, u.name AS author_name
    FROM cards c JOIN categories cat ON c.category_id = cat.id JOIN users u ON c.author_id = u.id`;

  if (q && q.trim()) {
    const ftsQ = sanitizeQuery(q);
    try {
      cards = db.prepare(`SELECT ${cardCols}
        JOIN cards_fts f ON f.rowid = c.id WHERE cards_fts MATCH ?
        ORDER BY rank LIMIT ? OFFSET ?`).all(ftsQ || '""', CARDS_PAGE_SIZE, offset);
      totalCount = db.prepare(`SELECT COUNT(*) AS n FROM cards_fts f
        JOIN cards c ON f.rowid = c.id WHERE cards_fts MATCH ?`).get(ftsQ || '""').n;
    } catch {
      const like = `%${q.trim()}%`;
      cards = db.prepare(`SELECT ${cardCols}
        WHERE c.title LIKE ? OR c.body_markdown LIKE ? OR c.tags LIKE ?
        ORDER BY c.title LIMIT ? OFFSET ?`).all(like, like, like, CARDS_PAGE_SIZE, offset);
      totalCount = db.prepare(`SELECT COUNT(*) AS n FROM cards c
        WHERE c.title LIKE ? OR c.body_markdown LIKE ? OR c.tags LIKE ?`).get(like, like, like).n;
    }
  } else if (categoria) {
    cards = db.prepare(`SELECT ${cardCols} WHERE c.category_id = ?
      ORDER BY c.title LIMIT ? OFFSET ?`).all(Number(categoria), CARDS_PAGE_SIZE, offset);
    totalCount = db.prepare(`SELECT COUNT(*) AS n FROM cards WHERE category_id = ?`).get(Number(categoria)).n;
  } else {
    cards = db.prepare(`SELECT ${cardCols} ORDER BY cat.sort_order, c.title LIMIT ? OFFSET ?`)
      .all(CARDS_PAGE_SIZE, offset);
    totalCount = db.prepare(`SELECT COUNT(*) AS n FROM cards`).get().n;
  }

  const totalPages = Math.ceil(totalCount / CARDS_PAGE_SIZE);
  res.render('clinician/cards-list', {
    title: 'Fichas de informação',
    cards, categories,
    activeCategory: categoria ? Number(categoria) : null,
    searchQuery: q || '',
    page, totalPages, totalCount,
  });
});

// ── New card form ─────────────────────────────────────────────────────────────

router.get('/nova', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  const diagnoses  = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();

  res.render('clinician/card-editor', {
    title:              'Nova ficha',
    card:               null,
    categories,
    diagnoses,
    selectedConditions: ['geral'],
    allCards:           [],
    relatedIds:         [],
    action:             '/clinico/fichas',
    submitLabel:        'Criar ficha',
  });
});

// ── Create card ───────────────────────────────────────────────────────────────

router.post('/', (req, res) => {
  const { title, category_id, body_markdown, tags } = req.body;
  const applicable_conditions = parseConditions(req.body.applicable_conditions);

  const errors = [];
  if (!title || !title.trim())         errors.push('O título é obrigatório.');
  if (!category_id)                    errors.push('A categoria é obrigatória.');
  if (!body_markdown || !body_markdown.trim()) errors.push('O conteúdo é obrigatório.');

  if (errors.length) {
    errors.forEach(e => req.flash('error', e));
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
    const diagnoses  = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();
    return res.render('clinician/card-editor', {
      title: 'Nova ficha', card: req.body, categories, diagnoses,
      selectedConditions: applicable_conditions, allCards: [], relatedIds: [],
      action: '/clinico/fichas', submitLabel: 'Criar ficha',
    });
  }

  const validCondSlugs = new Set(db.prepare('SELECT slug FROM diagnoses').all().map(d => d.slug));
  const conditionsFiltered = applicable_conditions.filter(s => validCondSlugs.has(s));
  const conditionsSafe = conditionsFiltered.length > 0 ? conditionsFiltered : ['geral'];

  const bodyHtml = sanitizeHtml(marked.parse(body_markdown.trim()), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'details', 'summary']),
  });
  const result   = db.prepare(`
    INSERT INTO cards (category_id, title, body_markdown, body_html, tags, applicable_conditions, author_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(category_id), title.trim(), body_markdown.trim(), bodyHtml,
    (tags || '').trim(), JSON.stringify(conditionsSafe),
    res.locals.user.id,
  );

  req.flash('success', 'Ficha criada com sucesso.');
  res.redirect(`/clinico/fichas/${Number(result.lastInsertRowid)}`);
});

// ── View card ─────────────────────────────────────────────────────────────────

router.get('/:id(\\d+)', (req, res) => {
  const card = db.prepare(`
    SELECT c.*, cat.name AS category_name, u.name AS author_name
    FROM cards c
    JOIN categories cat ON c.category_id = cat.id
    JOIN users u ON c.author_id = u.id
    WHERE c.id = ?
  `).get(Number(req.params.id));

  if (!card) {
    req.flash('error', 'Ficha não encontrada.');
    return res.redirect('/clinico/fichas');
  }

  const relatedCards = db.prepare(`
    SELECT c.id, c.title FROM related_cards rc
    JOIN cards c ON rc.related_card_id = c.id
    WHERE rc.card_id = ?
  `).all(Number(req.params.id));

  const conditionSlugs = JSON.parse(card.applicable_conditions || '[]');
  const diagRows = conditionSlugs.length > 0
    ? db.prepare(`SELECT name, slug FROM diagnoses WHERE slug IN (${conditionSlugs.map(() => '?').join(',')})`)
        .all(...conditionSlugs)
    : [];
  const conditionLabels = Object.fromEntries(diagRows.map(r => [r.slug, r.name]));

  res.render('clinician/card-view', {
    title: card.title,
    card,
    relatedCards,
    conditions: conditionSlugs,
    conditionLabels,
    tags: (card.tags || '').split(',').map(t => t.trim()).filter(Boolean),
  });
});

// ── Edit card form ────────────────────────────────────────────────────────────

router.get('/:id(\\d+)/editar', (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(Number(req.params.id));
  if (!card) {
    req.flash('error', 'Ficha não encontrada.');
    return res.redirect('/clinico/fichas');
  }

  const categories  = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  const diagnoses   = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();
  const allCards    = db.prepare('SELECT id, title FROM cards WHERE id != ? ORDER BY title').all(card.id);
  const relatedIds  = db.prepare('SELECT related_card_id FROM related_cards WHERE card_id = ?')
    .all(card.id).map(r => r.related_card_id);

  res.render('clinician/card-editor', {
    title:              `Editar — ${card.title}`,
    card,
    categories,
    diagnoses,
    selectedConditions: JSON.parse(card.applicable_conditions || '[]'),
    allCards,
    relatedIds,
    action:             `/clinico/fichas/${card.id}/editar`,
    submitLabel:        'Guardar alterações',
  });
});

// ── Update card ───────────────────────────────────────────────────────────────

router.post('/:id(\\d+)/editar', (req, res) => {
  const id       = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  if (!existing) {
    req.flash('error', 'Ficha não encontrada.');
    return res.redirect('/clinico/fichas');
  }

  const { title, category_id, body_markdown, tags } = req.body;
  const applicable_conditions = parseConditions(req.body.applicable_conditions);

  const errors = [];
  if (!title || !title.trim())         errors.push('O título é obrigatório.');
  if (!category_id)                    errors.push('A categoria é obrigatória.');
  if (!body_markdown || !body_markdown.trim()) errors.push('O conteúdo é obrigatório.');

  if (errors.length) {
    errors.forEach(e => req.flash('error', e));
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
    const diagnoses  = db.prepare('SELECT * FROM diagnoses ORDER BY sort_order').all();
    const allCards   = db.prepare('SELECT id, title FROM cards WHERE id != ? ORDER BY title').all(id);
    const relatedIds = [].concat(req.body.related_cards || []).map(Number).filter(Boolean);
    return res.render('clinician/card-editor', {
      title: `Editar — ${title || existing.title}`,
      card: { ...existing, ...req.body, id },
      categories, diagnoses,
      selectedConditions: applicable_conditions,
      allCards, relatedIds,
      action: `/clinico/fichas/${id}/editar`, submitLabel: 'Guardar alterações',
    });
  }

  const validCondSlugsE = new Set(db.prepare('SELECT slug FROM diagnoses').all().map(d => d.slug));
  const conditionsFilteredE = applicable_conditions.filter(s => validCondSlugsE.has(s));
  const conditionsSafeE = conditionsFilteredE.length > 0 ? conditionsFilteredE : ['geral'];

  const bodyHtml = sanitizeHtml(marked.parse(body_markdown.trim()), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'details', 'summary']),
  });

  const relatedRaw = req.body.related_cards;
  const relatedIds = [].concat(relatedRaw || []).map(Number).filter(n => n && n !== id);

  db.exec('BEGIN');
  try {
    db.prepare(`
      UPDATE cards
      SET category_id = ?, title = ?, body_markdown = ?, body_html = ?,
          tags = ?, applicable_conditions = ?, version = version + 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      Number(category_id), title.trim(), body_markdown.trim(), bodyHtml,
      (tags || '').trim(), JSON.stringify(conditionsSafeE), id,
    );

    db.prepare('DELETE FROM related_cards WHERE card_id = ?').run(id);
    const insertRel = db.prepare('INSERT OR IGNORE INTO related_cards (card_id, related_card_id) VALUES (?, ?)');
    relatedIds.forEach(rid => insertRel.run(id, rid));

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  req.flash('success', 'Ficha actualizada com sucesso.');
  res.redirect(`/clinico/fichas/${id}`);
});

// ── Delete card ───────────────────────────────────────────────────────────────

router.post('/:id(\\d+)/eliminar', (req, res) => {
  const id       = Number(req.params.id);
  const existing = db.prepare('SELECT title FROM cards WHERE id = ?').get(id);
  if (!existing) {
    req.flash('error', 'Ficha não encontrada.');
    return res.redirect('/clinico/fichas');
  }

  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM related_cards WHERE card_id = ? OR related_card_id = ?').run(id, id);
    db.prepare('DELETE FROM card_views WHERE card_id = ?').run(id);
    db.prepare('DELETE FROM cards WHERE id = ?').run(id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  req.flash('success', `Ficha "${existing.title}" eliminada.`);
  res.redirect('/clinico/fichas');
});

module.exports = router;
