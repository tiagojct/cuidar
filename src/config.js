'use strict';

const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'cuidar-dev-secret-alterar-em-producao',
  dbPath: process.env.DB_PATH || path.join(__dirname, '../data/app.db'),
  smtp: {
    host:    process.env.SMTP_HOST || '',
    port:    parseInt(process.env.SMTP_PORT || '587', 10),
    secure:  process.env.SMTP_SECURE === 'true',
    user:    process.env.SMTP_USER || '',
    pass:    process.env.SMTP_PASS || '',
    from:    process.env.SMTP_FROM || 'CUIDAR <noreply@cuidar.local>',
  },
};

if (module.exports.sessionSecret === 'cuidar-dev-secret-alterar-em-producao') {
  console.warn('[CUIDAR] AVISO: SESSION_SECRET não definido. Use uma variável de ambiente em produção.');
}
