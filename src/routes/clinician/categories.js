'use strict';

const express = require('express');
const db = require('../../db');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireRole('clinician', 'admin'));

router.get('/', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*, COUNT(cards.id) AS card_count
    FROM categories c
    LEFT JOIN cards ON cards.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order
  `).all();

  const editId = req.query.editar ? Number(req.query.editar) : null;

  res.render('clinician/categories', {
    title: 'Categorias',
    categories,
    editId,
  });
});

router.post('/', (req, res) => {
  const { name, sort_order } = req.body;

  if (!name || !name.trim()) {
    req.flash('error', 'O nome da categoria é obrigatório.');
    return res.redirect('/clinico/categorias');
  }

  db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run(
    name.trim(),
    Number(sort_order) || 0,
  );

  req.flash('success', 'Categoria criada.');
  res.redirect('/clinico/categorias');
});

router.post('/:id(\\d+)/editar', (req, res) => {
  const id = Number(req.params.id);
  const { name, sort_order } = req.body;

  if (!name || !name.trim()) {
    req.flash('error', 'O nome da categoria é obrigatório.');
    return res.redirect('/clinico/categorias');
  }

  db.prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?').run(
    name.trim(),
    Number(sort_order) || 0,
    id,
  );

  req.flash('success', 'Categoria actualizada.');
  res.redirect('/clinico/categorias');
});

router.post('/:id(\\d+)/eliminar', (req, res) => {
  const id = Number(req.params.id);
  const count = db.prepare('SELECT COUNT(*) AS n FROM cards WHERE category_id = ?').get(id).n;

  if (count > 0) {
    req.flash('error', `Esta categoria tem ${count} ficha(s). Mova-as ou elimine-as antes de apagar a categoria.`);
    return res.redirect('/clinico/categorias');
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  req.flash('success', 'Categoria eliminada.');
  res.redirect('/clinico/categorias');
});

module.exports = router;
