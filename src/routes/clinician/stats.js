'use strict';

const express = require('express');
const db = require('../../db');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireRole('clinician', 'admin'));

router.get('/', (req, res) => {
  const counts = {
    cards:      db.prepare('SELECT COUNT(*) AS n FROM cards').get().n,
    categories: db.prepare('SELECT COUNT(*) AS n FROM categories').get().n,
    templates:  db.prepare('SELECT COUNT(*) AS n FROM symptom_templates').get().n,
    diagnoses:  db.prepare('SELECT COUNT(*) AS n FROM diagnoses').get().n,
    patients:   db.prepare('SELECT COUNT(*) AS n FROM patients').get().n,
    entries:    db.prepare('SELECT COUNT(*) AS n FROM symptom_entries').get().n,
    cardViews:  db.prepare('SELECT COUNT(*) AS n FROM card_views').get().n,
    users:      db.prepare('SELECT COUNT(*) AS n FROM users WHERE active = 1').get().n,
  };

  const cardsByCategory = db.prepare(`
    SELECT cat.name, COUNT(c.id) AS count
    FROM categories cat
    LEFT JOIN cards c ON c.category_id = cat.id
    GROUP BY cat.id
    ORDER BY cat.sort_order
  `).all();

  const recentCards = db.prepare(`
    SELECT c.id, c.title, c.updated_at, c.version, cat.name AS category_name, u.name AS author_name
    FROM cards c
    JOIN categories cat ON c.category_id = cat.id
    JOIN users u ON c.author_id = u.id
    ORDER BY c.updated_at DESC
    LIMIT 10
  `).all();

  res.render('clinician/stats', {
    title: 'Estatísticas',
    counts,
    cardsByCategory,
    recentCards,
  });
});

module.exports = router;
