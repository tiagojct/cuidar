# Manual de Testes para Estudantes de MSc

## Projeto CUIDAR - Sistema de Apoio a Cuidadores Informais

**Orientadora**: Prof. Tiago Jacinto  
**Email de contacto**: tiagojacinto@med.up.pt

---

## Objetivo

Este documento serve como guia para estudantes de MSc em Cuidados Paliativos testarem o sistema CUIDAR e reportarem bugs, sugestões efeedback de usabilidade.

## Credenciais de Teste

| Perfil | Email | Password |
|--------|-------|----------|
| Administrador | admin@cuidar.local | admin123 |
| Clínico/Enfermeiro | clinico@cuidar.local | clinico123 |
| Cuidador Informal | cuidador@cuidar.local | cuidador123 |

---

## Fluxos de Teste por Perfil

### Teste 1: Login e Redirecionamento

**Objetivo**: Verificar que o sistema redireciona corretamente após login.

**Passos**:
1. Aceder a `http://localhost:3000` (ou URL de produção)
2. Attemptar acesso sem login → deve redirecionar para /login
3. Fazer login com `admin@cuidar.local` / admin123 → deve ir para /admin/utilizadores
4. Fazer login com `clinico@cuidar.local` / clinico123 → deve ir para /clinico/fichas
5. Fazer login com `cuidador@cuidar.local` / cuidador123 → deve ir para /cuidador/doentes

**Resultado esperado**: Redirecionamento correto para cada perfil.

**Reportar como**: Bug se diferente, indicar qual perfil e o que aconteceu.

---

### Teste 2: Registo de Sintomas (Cuidador)

**Objetivo**: Verificar funcionalidade de registo de sintomas.

**Passos**:
1. Login como cuidador (cuidador@cuidar.local / cuidador123)
2. Na lista de doentes, selecionar o doente disponível
3. Clicar no botão "Registar sintomas"
4. Mover os sliders de 0-10 para diferentes valores:
   - Dor
   - Fadiga
   - Náusea
   - Dispneia
   - Obstipação
   - Insónia
   - Ansiedade
5. Indicar bem-estar geral (0-10)
6. Adicionar nota textual (opcional)
7. Clicar em "Guardar"
8. Verificar mensagem de sucesso
9. Verificar que o registo aparece no histórico

**Resultado esperado**: Registo guardado com sucesso, aparece no histórico.

**Reportar como**: Bug se não guardar, se valores não serem validados, ou se não aparecer no histórico.

---

### Teste 3: Histórico de Registos (Cuidador)

**Objetivo**: Verificar visualização do histórico.

**Passos**:
1. Após registar sintomas, ir para "Histórico"
2. Verificar que os registos aparecem com código de cores:
   - Verde: valores ≤ 3
   - Amarelo: valores 4-6
   - Vermelho: valores ≥ 7
3. Clicar num registo para ver detalhes

**Resultado esperado**: Código de cores correto, detalhes visíveis.

**Reportar como**: Bug se cores incorretas, se registos não aparecerem.

---

### Teste 4: Gráfico de Evolução (Cuidador)

**Objetivo**: Verificar gráfico de evolução de sintomas.

**Passos**:
1. Na página do doente, clicar em "Evolução"
2. Selecionar período: 7 dias, 30 dias, 90 dias, Tudo
3. Verificar que o gráfico渲染iza corretamente

**Resultado esperado**: Gráfico renderiza sem erros, dados corretos.

**Reportar como**: Bug se gráfico não aparecer, se dados incorretos.

---

### Teste 5: Mensagens à Equipa (Cuidador)

**Objetivo**: Verificar sistema de mensagens.

**Passos**:
1. Na página do doente, clicar em "Colocar questão"
2. Escrever uma mensagem no campo de texto
3. (Opcional) Marcar "Urgente"
4. Clicar em "Enviar"
5. Verificar mensagem de sucesso

**Resultado esperado**: Mensagem enviada com sucesso.

**Reportar como**: Bug se não enviar, se não aparecer mensagem de sucesso.

---

### Teste 6: Fichas de Informação (Cuidador)

**Objetivo**: Verificar acesso a fichas informativas.

**Passos**:
1. No menu do cuidador, clicar em "Informação"
2. Ver lista de fichas por categoria
3. Clicar numa ficha para ver conteúdo
4. Usar pesquisa para encontrar ficha específica
5. Marcar "Foi útil?" com Sim/Não

**Resultado esperado**: Fichas visíveis, pesquisa funciona, feedback pode ser dado.

**Reportar como**: Bug se fichas não carregarem, se pesquisa não funcionar.

---

### Teste 7: Criação de Doente (Clínico)

**Objetivo**: Verificar gestão de doentes.

**Passos**:
1. Login como clínico (clinico@cuidar.local / clinico123)
2. Ir para "Doentes" → "Novo doente"
3. Preencher:
   - Identificador (ex: P-001)
   - Cuidador (selecionar existente)
   - Diagnóstico principal
   - Contacto da equipa (email)
4. Guardar
5. Verificar que aparece na lista

**Resultado esperado**: Doente criado e visível na lista.

**Reportar como**: Bug se não criar, se dados não persistirem.

---

### Teste 8: Editor de Fichas (Clínico)

**Objetivo**: Verificar criação/edição de fichas.

**Passos**:
1. Login como clínico
2. Ir para "Fichas" → "Nova ficha"
3. Preencher:
   - Título
   - Categoria
   - Condições aplicáveis (selecionar múltiplas)
   - Tags
   - Conteúdo (usar Markdown)
4. Clicar em "Pré-visualizar" para ver resultado
5. Guardar

**Resultado esperado**: Ficha criada, preview funciona.

**Reportar como**: Bug se não guardar, se preview não funcionar, se Markdown não renderizar.

---

### Teste 9: Resposta a Mensagens (Clínico)

**Objetivo**: Verificar comunicação bidirecional.

**Passos**:
1. Clínico: Ver mensagens na página do doente
2. Ler mensagem enviada pelo cuidador
3. Clicar em "Responder"
4. Escrever resposta
5. Enviar

**Resultado esperado**: Resposta guardada e visível para o cuidador.

**Reportar como**: Bug se resposta não for guardada.

---

### Teste 10: Gestão de Utilizadores (Admin)

**Objetivo**: Verificar painel de administração.

**Passos**:
1. Login como admin (admin@cuidar.local / admin123)
2. Ver lista de utilizadores
3. Criar novo utilizador:
   - Nome completo
   - Email
   - Password (mínimo 8 caracteres)
   - Perfil (admin/clinico/cuidador)
4. Guardar
5. Testar login com novo utilizador

**Resultado esperado**: Utilizador criado, pode fazer login.

**Reportar como**: Bug se criação falhar, se login não funcionar.

---

## Verificações de Interface

### Acessibilidade

1. **Navegação por teclado**: Tentar navegar apenas com Tab e Enter
2. **Contraste**: Verificar que texto é legível
3. **Focus states**: Verificar que elementos em foco são visíveis

### Responsividade

1. Testar em размер do ecrã pequeno (mobile)
2. Testar em tamanho médio (tablet)
3. Verificar que menus colapsam corretamente

---

## Como Reportar

### Via Sistema de Feedback

1. Clicar no link "Feedback" no menu
2. Preencher formulário:
   - Tipo: Bug / Sugestão / Melhoria / Dúvida
   - Descrição detalhada
   - Passos para reproduzir (se bug)
   - Browser utilizado
3. Enviar

### Via Email

Enviar email para tiagojacinto@med.up.pt com:
- Screenshots do problema
- Passos para reproduzir
- Browser e sistema operativo

---

## Tabela de Reporte

| # | Funcionalidade | Status | Observações |
|---|----------------|--------|-------------|
| 1 | Login/Logout | | |
| 2 | Registo sintomas | | |
| 3 | Histórico | | |
| 4 | Gráfico evolução | | |
| 5 | Mensagens | | |
| 6 | Fichas informação | | |
| 7 | Criar doente | | |
| 8 | Editor fichas | | |
| 9 | Responder mensagens | | |
| 10 | Adminutilizadores | | |

---

## Perguntas de Usabilidade

Após testar, responder:

1. **Navegação**: Conseguiu encontrar o que procurava facilmente? ⭐⭐⭐⭐⭐
2. **Clareza**: As labels e botões são claros? ⭐⭐⭐⭐⭐
3. **Velocidade**: A aplicação responde depressa? ⭐⭐⭐⭐⭐
4. **Confiança**: Sentiu-se seguro ao usar o sistema? ⭐⭐⭐⭐⭐
5. **Sugestão**: O que mudaria?

---

## Notas

- Este é um protótipo em desenvolvimento
- Algumas funcionalidades podem ter bugs
- O objetivo é identificar áreas que beneficiariam de AI no futuro
- Todas as sugestões são bem-vindas!

**Obrigado pela participação!**