'use strict';

const express = require('express');
const db = require('../db');
const { requireLogin } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');

const router = express.Router();

router.get('/feedback', requireLogin, (req, res) => {
  res.render('shared/feedback', { 
    title: 'Enviar feedback',
    submitted: false 
  });
});

router.post('/feedback', requireLogin, (req, res) => {
  const { feedback_type, description, steps_to_reproduce, browser, expected_behavior, actual_behavior } = req.body;
  
  const errors = [];
  if (!feedback_type) errors.push('Selecione o tipo de feedback.');
  if (!description || !description.trim()) errors.push('A descrição é obrigatória.');
  
  if (errors.length) {
    errors.forEach(e => req.flash('error', e));
    return res.render('shared/feedback', { 
      title: 'Enviar feedback',
      submitted: false,
      formData: req.body
    });
  }

  const user = db.prepare('SELECT name, email, role FROM users WHERE id = ?').get(req.session.userId);
  
  const feedbackText = [
    `=== NOVO FEEDBACK DE ${user.role.toUpperCase()} ===`,
    `Utilizador: ${user.name} (${user.email})`,
    `Perfil: ${user.role}`,
    `Tipo: ${feedback_type}`,
    '',
    `DESCRIÇÃO:`,
    description,
    '',
    browser ? `Navegador: ${browser}` : '',
    steps_to_reproduce ? `\nPassos para reproduzir:\n${steps_to_reproduce}` : '',
    expected_behavior ? `\nComportamento esperado:\n${expected_behavior}` : '',
    actual_behavior ? `\nComportamento atual:\n${actual_behavior}` : '',
  ].filter(Boolean).join('\n');

  sendMail({
    to: 'tiagojacinto@med.up.pt',
    subject: `[CUIDAR FEEDBACK] ${feedback_type} - ${user.name}`,
    text: feedbackText,
  });

  db.prepare(`
    INSERT INTO caregiver_messages (patient_id, caregiver_id, message, is_urgent, created_at)
    VALUES (0, ?, ?, 0, datetime('now'))
  `).run(req.session.userId, `FEEDBACK: ${feedback_type} - ${description.substring(0, 500)}`);

  res.render('shared/feedback', { 
    title: 'Obrigado pelo feedback!',
    submitted: true 
  });
});

module.exports = router;