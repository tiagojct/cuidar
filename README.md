# CUIDAR

Aplicação de apoio a cuidadores informais em cuidados paliativos, desenvolvida no âmbito de um projeto de investigação da FMUP.

Permite o registo diário de sintomas, acesso a fichas informativas baseadas em evidência, e comunicação com a equipa clínica. Clínicos gerem doentes, cuidadores, conteúdos e recebem alertas por email.

## Funcionalidades

- **Cuidadores** — registo de sintomas com avaliação de gravidade, fichas informativas, mensagem à equipa
- **Clínicos** — gestão de doentes e cuidadores, editor de fichas e modelos, estatísticas, alertas configuráveis
- **Administradores** — gestão de utilizadores

## Instalação (Docker)

```sh
mkdir -p /opt/cuidar && cd /opt/cuidar

curl -o docker-compose.yml \
  https://raw.githubusercontent.com/tiagojct/cuidar/main/docker-compose.yml

cat > .env << 'EOF'
SESSION_SECRET=coloque-uma-chave-aleatoria-aqui
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme
EOF

docker compose up -d
```

A base de dados é criada automaticamente no primeiro arranque. O admin definido no `.env` é criado se não existir.

Para atualizar:

```sh
docker compose pull && docker compose up -d
```

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SESSION_SECRET` | ✅ | Chave secreta de sessão (`openssl rand -hex 32`) |
| `ADMIN_EMAIL` | — | Email do admin criado no primeiro arranque |
| `ADMIN_PASSWORD` | — | Password do admin |
| `ADMIN_NAME` | — | Nome do admin (padrão: `Administrador`) |
| `SMTP_HOST` | — | Servidor SMTP para alertas por email |
| `SMTP_PORT` | — | Porta SMTP (padrão: `587`) |
| `SMTP_USER` | — | Utilizador SMTP |
| `SMTP_PASS` | — | Password SMTP |
| `SMTP_FROM` | — | Endereço de origem dos emails |
| `PORT` | — | Porta da aplicação (padrão: `3000`) |

## Desenvolvimento

```sh
npm install
cp .env.example .env   # editar conforme necessário
npm run dev
```

Requer Node.js 22+.

## Stack

- Node.js + Express 4
- SQLite (`node:sqlite`)
- EJS + express-ejs-layouts
- Pico CSS v2

## Licença

Projeto de investigação — FMUP. Uso académico e não comercial.
