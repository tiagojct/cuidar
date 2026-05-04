# CUIDAR — Guia de Funcionalidades e Testes

## Visão Geral

O CUIDAR é uma aplicação web de apoio a cuidadores informais de doentes em cuidados paliativos.
Tem três perfis de utilizador com acessos distintos.

**Credenciais de desenvolvimento** (após `npm run seed`):

| Perfil | Email | Password |
|---|---|---|
| Administrador | admin@cuidar.local | admin123 |
| Clínico | clinico@cuidar.local | clinico123 |
| Cuidador | cuidador@cuidar.local | cuidador123 |

---

## Funcionalidades por Perfil

### Cuidador
- Ver lista de doentes associados
- Ver ficha de doente (diagnóstico, equipa clínica, medicação)
- Registar sintomas diários com escala 0–10 e bem-estar
- Ver histórico de registos com código de cores por gravidade
- Ver evolução em gráfico (7, 30, 90 dias ou tudo)
- Exportar relatório em PDF (via impressão)
- Enviar mensagem escrita à equipa clínica
- Consultar fichas de informação por categoria
- Pesquisar fichas de informação
- Marcar fichas de informação como úteis ou não
- Consultar página de referências clínicas
- Consultar ajuda

### Clínico
- Criar e gerir doentes (associar a cuidador, diagnóstico, medicação, contacto de equipa)
- Ver histórico de registos de cada doente (com alertas visuais)
- Responder a mensagens de cuidadores
- Criar e editar fichas de informação (editor Markdown com pré-visualização em tempo real)
- Gerir categorias de fichas
- Gerir diagnósticos e condições clínicas
- Criar modelos de sintomas por diagnóstico
- Ver estatísticas globais (total de doentes, registos, alertas)
- Exportar dados de doentes em CSV

### Administrador
- Criar, editar e activar/desactivar utilizadores (clínicos e cuidadores)
- Redefinir passwords de utilizadores

---

## Cenários de Teste

### 1. Login e Navegação

**T1.1 — Login correcto**
1. Abrir http://localhost:3000
2. Inserir email `admin@cuidar.local` e password `admin123`
3. Clicar "Entrar"
→ Redireccionado para `/admin/utilizadores`

**T1.2 — Login com credenciais erradas**
1. Inserir email válido mas password errada
→ Mensagem "Email ou palavra-passe incorrectos" sem indicar qual está errado

**T1.3 — Logout**
1. Clicar "Sair" em qualquer página
→ Redireccionado para `/login`; tentativa de voltar atrás no browser não acede a páginas autenticadas

**T1.4 — Acesso directo sem login**
1. Com sessão inactiva, tentar aceder a `/cuidador/doentes`
→ Redireccionado para `/login`

---

### 2. Fluxo do Cuidador — Registo de Sintomas

**T2.1 — Registar sintomas normais**
1. Login como `cuidador@cuidar.local`
2. Clicar no doente "Doente Demo"
3. Clicar "+ Registar sintomas"
4. Mover todos os sliders para valores baixos (0–3), bem-estar = 8
5. Clicar "Guardar registo"
→ Banner verde: "Registo guardado — situação estável"

**T2.2 — Registar sintomas com alerta moderado**
1. No formulário de registo, colocar pelo menos um sintoma ≥ 5, bem-estar ≤ 4
→ Banner amarelo: "mantenha vigilância"

**T2.3 — Registar sintomas com alerta de equipa**
1. Colocar bem-estar ≤ 3 ou algum sintoma ≥ 7
→ Banner laranja: "deve contactar a equipa clínica"
→ Mostra o contacto da equipa se configurado

**T2.4 — Registar sintomas urgentes**
1. Colocar bem-estar = 0 ou 1, ou qualquer sintoma = 10
→ Banner vermelho: "situação urgente. Contacte a equipa ou ligue 112"

**T2.5 — Duplo registo no mesmo dia**
1. Registar sintomas duas vezes no mesmo dia
→ Aviso "Já registou sintomas hoje" no formulário (não impede o registo)
→ Ambos os registos visíveis no histórico

**T2.6 — Visualizar evolução**
1. Com pelo menos 3 registos feitos, clicar "Ver evolução"
→ Gráfico de bem-estar e sintomas; botões de período (7/30/90 dias/tudo)

---

### 3. Fluxo do Cuidador — Informação

**T3.1 — Pesquisar fichas**
1. Ir a "Informação"
2. Pesquisar "dor"
→ Fichas com "dor" no título ou conteúdo aparecem

**T3.2 — Filtrar por categoria**
1. Seleccionar "Gestão de Sintomas" no filtro
→ Apenas fichas dessa categoria visíveis

**T3.3 — Ler ficha e marcar como útil**
1. Abrir a ficha "Controlo da Dor"
2. Clicar "Sim" em "Esta informação foi útil?"
→ Botão "Sim" fica destacado
3. Recarregar a página
→ Selecção mantida

**T3.4 — Imprimir ficha**
1. Abrir qualquer ficha
2. Clicar "Imprimir / Guardar PDF"
→ Diálogo de impressão abre; cabeçalho e botões de navegação não aparecem na impressão

---

### 4. Fluxo do Clínico — Doentes

**T4.1 — Criar novo doente**
1. Login como `clinico@cuidar.local`
2. Ir a "Doentes" → "+ Novo doente"
3. Preencher: identificador pseudonimizado (ex. "P-001"), diagnóstico "Oncologia", associar ao cuidador de teste, contacto de equipa
4. Guardar
→ Doente aparece na lista

**T4.2 — Editar medicação**
1. Editar o doente criado em T4.1
2. Preencher o campo "Medicação habitual" com uma lista de medicamentos
3. Guardar
→ No perfil de doente (vista do cuidador), a secção "Medicação habitual" aparece

**T4.3 — Ver registos do doente**
1. Na lista de doentes, clicar no doente com registos
→ Histórico de registos com badges de cor; registos com alerta têm fundo colorido

**T4.4 — Responder a mensagem**
1. Como cuidador, enviar uma mensagem via "Colocar questão à equipa clínica"
2. Como clínico, ir ao doente → "Mensagens"
→ Mensagem visível; campo de resposta disponível

**T4.5 — Arquivar doente**
1. Na lista de doentes, clicar "Eliminar" num doente de teste
→ Pede confirmação ("Confirmar?"); após confirmação, doente removido

**T4.6 — Exportar CSV**
1. Na lista de doentes, clicar "Exportar CSV"
→ Ficheiro CSV descarregado com todos os doentes activos

---

### 5. Fluxo do Clínico — Fichas de Informação

**T5.1 — Criar nova ficha**
1. Ir a "Fichas" → "+ Nova ficha"
2. Preencher título, seleccionar categoria "Gestão de Sintomas", escrever conteúdo em Markdown
3. A pré-visualização actualiza em tempo real
4. Guardar
→ Ficha aparece na lista e está acessível pelo cuidador

**T5.2 — Editor Markdown — secções**
1. Criar ficha com o seguinte conteúdo:
```markdown
## O que é
Descrição do sintoma.

## O que fazer
- Passo 1
- Passo 2

## Sinais de alerta
**Urgente:** situação X
```
→ Pré-visualização mostra formatação correcta

**T5.3 — Associar a condições clínicas**
1. Ao criar/editar ficha, seleccionar "Oncologia" e "Geral" em "Condições"
→ Ficha aparece filtrada quando o cuidador de um doente oncológico pesquisa

---

### 6. Fluxo do Clínico — Modelos de Sintomas

**T6.1 — Criar modelo para diagnóstico**
1. Ir a "Modelos"
2. Seleccionar diagnóstico "Oncologia"
3. Adicionar sintoma: slug `fadiga`, label "Fadiga"
4. Guardar
→ Quando o cuidador regista sintomas de um doente oncológico, o slider "Fadiga" aparece

**T6.2 — Verificar modelo no formulário**
1. Como cuidador, ir ao registo de sintomas do doente demo (diagnóstico Oncologia)
→ Sliders para os sintomas do modelo de Oncologia

---

### 7. Fluxo do Administrador

**T7.1 — Criar novo clínico**
1. Login como `admin@cuidar.local`
2. Ir a "Utilizadores" → "+ Novo utilizador"
3. Preencher nome, email, password, perfil "Clínico"
→ Utilizador aparece na lista com badge "Activo"

**T7.2 — Desactivar utilizador**
1. Na lista de utilizadores, clicar "Editar" num utilizador
2. Desmarcar "Activo"
→ Utilizador com badge "Inactivo"; login com esse utilizador falha

**T7.3 — Criar cuidador**
1. Criar utilizador com perfil "Cuidador"
→ Cuidador visível na lista de cuidadores quando um clínico cria um novo doente

---

### 8. Segurança e Casos Limite

**T8.1 — Acesso cruzado de perfis**
1. Como cuidador, tentar aceder a `/clinico/doentes`
→ Erro 403 ou redireccionar

**T8.2 — Cuidador acede a doente de outro cuidador**
1. Saber o ID de um doente que não pertence ao cuidador
2. Tentar aceder a `/cuidador/doentes/{id}`
→ 404 ou redireccionar

**T8.3 — Rate limit no login**
1. Tentar login com credenciais erradas 16 vezes seguidas
→ Mensagem "Demasiadas tentativas de acesso. Aguarde 15 minutos"

**T8.4 — Botão de emergência**
1. Com qualquer sessão activa, verificar canto inferior direito
→ Botão "Em caso de urgência" visível em todas as páginas excepto login

---

### 9. Responsivo / Mobile

**T9.1 — Login em mobile**
1. Abrir em viewport 375px
→ Card de login apresentável, formulário usável

**T9.2 — Registo de sintomas em mobile**
1. Abrir formulário de sintomas em mobile
→ Sliders têm altura adequada ao toque; formulário scroll vertical

**T9.3 — Nav em mobile**
1. Nav com sessão de clínico (muitos items) em viewport estreito
→ Nav faz scroll horizontal sem quebrar; não aparece barra de scroll

---

## Notas para Preparação de Produção

- `SESSION_SECRET` obrigatório — gerar com `openssl rand -hex 32`
- `ADMIN_EMAIL` + `ADMIN_PASSWORD` criam o primeiro admin no arranque
- SMTP opcional — sem SMTP, alertas por email são desactivados silenciosamente
- Base de dados em `/data/cuidar.db` — montar volume Docker para persistência
- Todos os dados de doentes devem ser pseudonimizados (sem nome real — usar código "P-001", etc.)
