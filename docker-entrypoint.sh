#!/bin/sh
set -e

echo "[CUIDAR] A inicializar base de dados..."
node --experimental-sqlite seeds/production-setup.js

echo "[CUIDAR] A iniciar aplicação..."
exec node --experimental-sqlite src/app.js
