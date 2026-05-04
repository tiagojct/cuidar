# Instalação e Deploy

## Pré-requisitos

- Docker Engine 24+
- Docker Compose v2+
- Servidor Linux (Ubuntu 22.04 LTS recomendado)

---

## Deploy com Docker (recomendado)

### 1. Copiar ficheiros para o servidor

```bash
scp -r cuidar/ utilizador@servidor:/opt/cuidar
```

Ou clonar directamente no servidor:
```bash
git clone <repositório> /opt/cuidar
cd /opt/cuidar
```

### 2. Configurar variáveis de ambiente

```bash
# Gerar SESSION_SECRET seguro
openssl rand -hex 32

# Criar ficheiro .env (NÃO incluir no git)
cat > /opt/cuidar/.env << 'EOF'
SESSION_SECRET=<resultado do openssl acima>
SMTP_HOST=smtp.hospital.pt
SMTP_PORT=587
SMTP_USER=cuidar@hospital.pt
SMTP_PASS=palavra-passe-smtp
SMTP_FROM=CUIDAR <cuidar@hospital.pt>
EOF
```

!!! danger "Segurança"
    Nunca coloque o ficheiro `.env` em controlo de versões. Contém segredos.

### 3. Iniciar a aplicação

```bash
cd /opt/cuidar
docker compose up -d
```

Verificar estado:
```bash
docker compose ps
docker compose logs -f
```

### 4. Criar utilizador administrador inicial

```bash
docker compose exec cuidar node seeds/seed-admin.js
```

Credenciais padrão: `admin@cuidar.local` / `admin123` — **alterar imediatamente**.

### 5. Popular base de dados com dados iniciais

```bash
docker compose exec cuidar node seeds/seed-categories.js
docker compose exec cuidar node seeds/seed-diagnoses.js
docker compose exec cuidar node seeds/seed-cards.js
docker compose exec cuidar node seeds/seed-cards-extended.js
docker compose exec cuidar node seeds/seed-templates-extended.js
```

---

## Configurar HTTPS (nginx como proxy reverso)

```nginx
# /etc/nginx/sites-available/cuidar
server {
    listen 80;
    server_name cuidar.hospital.pt;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cuidar.hospital.pt;

    ssl_certificate     /etc/letsencrypt/live/cuidar.hospital.pt/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cuidar.hospital.pt/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

```bash
certbot --nginx -d cuidar.hospital.pt
nginx -t && systemctl reload nginx
```

---

## Actualizações

```bash
cd /opt/cuidar
git pull
docker compose build --no-cache
docker compose up -d
```

As migrações de base de dados correm automaticamente no arranque.

---

## Backup da base de dados

```bash
# Backup manual
docker compose exec cuidar sh -c \
  "sqlite3 /data/cuidar.db '.backup /data/cuidar-$(date +%Y%m%d).db'"

# Copiar para máquina local
docker cp cuidar_cuidar_1:/data/cuidar-$(date +%Y%m%d).db ./backups/
```

Recomendado: cron diário com `rsync` para destino remoto.

---

## Variáveis de ambiente disponíveis

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SESSION_SECRET` | **Sim** | Segredo para sessões (min. 32 chars aleatórios) |
| `DB_PATH` | Não | Caminho para ficheiro SQLite (padrão: `/data/cuidar.db`) |
| `PORT` | Não | Porta HTTP (padrão: `3000`) |
| `SMTP_HOST` | Não | Servidor SMTP para alertas por email |
| `SMTP_PORT` | Não | Porta SMTP (padrão: `587`) |
| `SMTP_SECURE` | Não | `true` para TLS directo (porta 465) |
| `SMTP_USER` | Não | Utilizador SMTP |
| `SMTP_PASS` | Não | Palavra-passe SMTP |
| `SMTP_FROM` | Não | Endereço de origem dos emails |

---

## Resolução de problemas

**App não arranca:**
```bash
docker compose logs cuidar
```

**Base de dados bloqueada:**
O SQLite com WAL mode suporta leituras concorrentes. Se aparecer `SQLITE_BUSY`, verifique que não há dois processos a escrever simultaneamente.

**Sessões a expirar demasiado cedo:**
O `SESSION_SECRET` não pode mudar entre reinícios — se mudar, todas as sessões activas ficam inválidas.
