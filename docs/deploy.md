# Deployment do CUIDAR

## Visão Geral

O CUIDAR pode ser implantado em qualquer servidor que suporte Node.js. Esta documentação cobre as opções mais comuns.

---

## Pergunta: Os dados de teste existem numa instalação limpa?

**Resposta**: **NÃO**. Numa instalação limpa:
- A base de dados SQLite é criada vazia
- Não existem utilizadores, doentes, fichas ou registos
- **Terá de criar os utilizadores manualmente**

Para ter dados de teste, tem duas opções:
1. Criar manualmente através da interface de admin
2. Executar o script de seed `scripts/seed.js` (se existir)

---

## Opção 1: Render.com (Recomendado - Gratuito)

### Passos

1. **Criar conta** em https://render.com

2. **Criar novo Web Service**:
   - Connect your GitHub repository
   - Select your CUIDAR repo
   - Build Command: `npm install`
   - Start Command: `node src/app.js`
   - Environment Variables:
     ```
     NODE_ENV=production
     SESSION_SECRET=<gerar-string-segura>
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=465
     SMTP_SECURE=true
     SMTP_USER=seu-email@gmail.com
     SMTP_PASS=sua-senha-app
     SMTP_FROM=CUIDAR <seu-email@gmail.com>
     ```

3. **Deploy** - o Render faz build automaticamente

### Configuração SMTP (Gmail)

1. Ativar 2-Factor Authentication na conta Google
2. Ir para Google Account → Security → App passwords
3. Criar nova password de app
4. Usar essa password no SMTP_PASS

---

## Opção 2: Railway (Recomendado - Pago por uso)

### Passos

1. Cri conta em https://railway.app
2. Connect GitHub repo
3. Create new project → "Deploy from GitHub"
4. Add environment variables same as Render
5. Deploy starts automatically

---

## Opção 3: VPS (DigitalOcean, Linode, Hetzner)

### Requisitos do Servidor

- Ubuntu 20.04+ ou similar
- Node.js 22+
- 512MB RAM mínimo
- Nginx como reverse proxy

### Passos

```bash
# 1. Conectar ao servidor
ssh usuario@servidor

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Criar diretório
sudo mkdir -p /var/www/cuidar
cd /var/www/cuidar

# 4. Clonar repositório
git clone https://github.com/seu-repo/cuidar.git .

# 5. Instalar dependências
npm install --production

# 6. Criar ficheiro .env
cat > .env << EOF
NODE_ENV=production
SESSION_SECRET=$(openssl rand -hex 32)
PORT=3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM=CUIDAR <seu-email@gmail.com>
EOF

# 7. Criar serviço systemd
sudo cat > /etc/systemd/system/cuidar.service << EOF
[Unit]
Description=CUIDAR Web Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/cuidar
ExecStart=/usr/bin/node src/app.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 8. Ativar serviço
sudo systemctl daemon-reload
sudo systemctl enable cuidar
sudo systemctl start cuidar

# 9. Configurar Nginx
sudo apt install nginx
sudo cat > /etc/nginx/sites-available/cuidar << EOF
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/cuidar /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Opção 5: Docker + Nginx + Cloudflare (Recomendado para produção)

Combina Docker (aplicação isolada) com Nginx (proxy reverso) e Cloudflare (DNS + SSL).

### Requisitos

- Docker e Docker Compose instalados
- Nginx instalado
- Cloudflare DNS configurado para o seu domínio

### 1. Clonar e configurar

```bash
git clone https://github.com/tiagojct/esep-cuidar /opt/cuidar
cd /opt/cuidar
```

### 2. Criar .env

```bash
cat > .env << 'EOF'
SESSION_SECRET=$(openssl rand -hex 32)
ADMIN_EMAIL=admin@cuidar.tiagojct.eu
ADMIN_PASSWORD=<escolha-uma-palavra-passe-segura>
ADMIN_NAME=Administrador
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=tiagojacinto@gmail.com
SMTP_PASS=<senha-app-gmail>
SMTP_FROM=CUIDAR <tiagojacinto@med.up.pt>
EOF
```

### 3. Iniciar Docker

```bash
docker compose up -d
# Verificar: curl http://localhost:3000/health
```

### 4. Configurar Nginx

```bash
cat > /etc/nginx/sites-available/cuidar << 'EOF'
server {
    listen 80;
    server_name cuidar.tiagojct.eu;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/cuidar /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 5. Cloudflare DNS

- Adicionar registo A: cuidar → IP do servidor
- Ativar proxy (laranja) para SSL automático

### 6. Verificar

```bash
curl https://cuidar.tiagojct.eu/health
```

---

### Dockerfile (já existente no projeto)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "src/app.js"]
```

### Build e Run

```bash
# Build
docker build -t cuidar .

# Run
docker run -d \
  --name cuidar \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e SESSION_SECRET=suasecret \
  -e SMTP_HOST=smtp.gmail.com \
  -e SMTP_PORT=465 \
  -e SMTP_USER=email@gmail.com \
  -e SMTP_PASS=senha \
  -e SMTP_FROM=CUIDAR \
  --restart unless-stopped \
  cuidar
```

### Docker Compose (recomendado)

```yaml
version: '3'
services:
  cuidar:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SESSION_SECRET=${SESSION_SECRET}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_SECURE=${SMTP_SECURE}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SMTP_FROM=${SMTP_FROM}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

Criar ficheiro `.env`:
```
SESSION_SECRET=gerar-string-segura-aqui
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=seu-email@gmail.com
SMTP_PASS=senha-app
SMTP_FROM=CUIDAR <seu-email@gmail.com>
```

Run:
```bash
docker-compose up -d
```

---

## Configuração Pós-Instalação

### Criar Administrador Inicial

1. Aceder à interface de admin
2. Ir para /admin/utilizadores
3. Clicar "Novo utilizador"
4. Criar utilizador com perfil "Administrador"
5. Definir email e password

### Criar Utilizadores de Teste

Para replicar os dados de teste originais, criar manualmente:

| Perfil | Email | Password |
|--------|-------|----------|
| Admin | admin@cuidar.local | admin123 |
| Clínico | clinico@cuidar.local | clinico123 |
| Cuidador | cuidador@cuidar.local | cuidador123 |

### Verificar Funcionalidades

1. Fazer login com admin
2. Criar clínico
3. Criar cuidador
4. Clínico cria doente e associa cuidador
5. Cuidador regista sintomas
6. Testar fluxo completo

---

## Manutenção

### Backup

```bash
# SQLite
cp data/cuidar.db data/cuidar-$(date +%Y%m%d).db

# Docker
docker exec cuidar-container sqlite3 /app/data/cuidar.db ".backup /backup/$(date +%Y%m%d).db"
```

### Atualizar

```bash
# Sem Docker
git pull
npm install
pm2 restart cuidar  # ou systemctl restart cuidar

# Com Docker
git pull
docker-compose up -d --build
```

### Logs

```bash
# Docker
docker logs -f cuidar

# systemd
journalctl -u cuidar -f
```

---

## Variáveis de Ambiente Obrigatórias

| Variável | Descrição | Exemplo |
|----------|------------|---------|
| NODE_ENV | Ambiente | production |
| SESSION_SECRET | Chave de segurança (32+ chars) | abc123... |
| PORT | Porta (opcional, padrão 3000) | 3000 |

### Variáveis Opcionais (SMTP)

| Variável | Descrição | Exemplo |
|----------|------------|---------|
| SMTP_HOST | Servidor SMTP | smtp.gmail.com |
| SMTP_PORT | Porta SMTP | 465 |
| SMTP_SECURE | SSL/TLS | true |
| SMTP_USER | Username SMTP | email@gmail.com |
| SMTP_PASS | Password SMTP | xxx |
| SMTP_FROM | From address | CUIDAR <email@gmail.com> |

---

## FAQ

### "SESSION_SECRET is required in production"

Precisa definir a variável de ambiente `SESSION_SECRET` com um valor seguro.

### Como fazer backup?

O ficheiro SQLite está em `data/cuidar.db`. Faire copy regularmente.

### Posso usar HTTPS?

Sim, com Nginx (proxy) ou atrás de um load balancer com TLS.

### Onde está a base de dados?

Em produção: `./data/cuidar.db` (criado automaticamente)

### Posso migrar dados?

Sim, basta copiar o ficheiro `cuidar.db` entre ambientes.

---

## Suporte

Para problemas de deployment:
- Email: tiagojacinto@med.up.pt
- Verificar logs da aplicação
- Verificar variáveis de ambiente