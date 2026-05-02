'use strict';

const nodemailer = require('nodemailer');
const config = require('../config');

let _transport = null;

function getTransport() {
  if (_transport) return _transport;
  if (!config.smtp.host) return null;
  _transport = nodemailer.createTransport({
    host:   config.smtp.host,
    port:   config.smtp.port,
    secure: config.smtp.secure,
    auth:   config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return _transport;
}

async function sendMail({ to, subject, text, html }) {
  const transport = getTransport();
  if (!transport || !to) return;
  try {
    await transport.sendMail({ from: config.smtp.from, to, subject, text, html });
  } catch (err) {
    console.error('[mailer]', err.message);
  }
}

module.exports = { sendMail };
