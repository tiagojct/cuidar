# CUIDAR - Sistema de Apoio a Cuidadores Informais

## Apresentação do Projeto

**CUIDAR** é uma aplicação web desenvolvida no âmbito de um projeto de investigação da Faculty of Medicine of the University of Porto (FMUP) para apoiar cuidadores informais de doentes em cuidados paliativos.

### Objetivos do Projeto

1. **Permitir o registo diário de sintomas** pelos cuidadores informais
2. **Fornecer fichas informativas** baseadas em evidência científica
3. **Facilitar a comunicação** entre cuidadores e equipa clínica
4. **Apoiar a tomada de decisão** através de alertas e visualizações

---

## Funcionalidades por Perfil

### 👤 Cuidador Informal

| Funcionalidade | Descrição |
|----------------|-----------|
| Lista de doentes | Ver os doentes associados ao cuidador |
| Perfil do doente | Ver diagnóstico, medicação e contacto da equipa clínica |
| Registo de sintomas | Registar sintomas diários com escala 0-10 e bem-estar geral |
| Histórico de registos | Visualizar registos anteriores com código de cores por gravidade |
| Gráfico de evolução | Ver evolução em gráfico (7, 30, 90 dias ou tudo) |
| Relatório PDF | Exportar relatório via impressão do navegador |
| Mensagens à equipa | Enviar mensagens escritas à equipa clínica |
| Fichas de informação | Consultar e pesquisar fichas por categoria |
| Marcar fichas úteis | Indicar se uma ficha foi útil |
| Referências clínicas | Consultar página de referências |
| Ajuda | Consultar manual de utilização |

### 👨‍⚕️ Profissional de Saúde (Clínico)

| Funcionalidade | Descrição |
|----------------|-----------|
| Gestão de doentes | Criar, editar, arquivar e eliminar doentes |
| Associa cuidador | Associar doente a um cuidador informal |
| Registo de diagnósticos | Definir diagnóstico principal e secundários |
| Contacto da equipa | Configurar contacto de equipa clínica por doente |
| Histórico de registos | Ver registos de sintomas de cada doente |
| Alertas visuais | Ver alertas destacados por gravidade |
| Responder a mensagens | Responder a mensagens dos cuidadores |
| Editor de fichas | Criar e editar fichas de informação (Markdown) |
| Pré-visualização | Ver preview em tempo real ao editar |
| Gerir categorias | Criar e editar categorias de fichas |
| Condições clínicas | Gerir diagnósticos/condições |
| Modelos de sintomas | Criar modelos de sintomas por diagnóstico |
| Estatísticas | Ver estatísticas globais |
| Exportar CSV | Exportar dados de doentes |

### ⚙️ Administrador

| Funcionalidade | Descrição |
|----------------|-----------|
| Lista de utilizadores | Ver todos os utilizadores do sistema |
| Criar utilizadores | Criar novos clínicos ou cuidadores |
| Editar utilizadores | Editar dados de utilizadores existentes |
| Activar/Desactivar | Activar ou desactivar contas de utilizadores |
| Redefinir passwords | Alterar passwords de utilizadores |

---

## Características Técnicas

### Stack Tecnológico

- **Backend**: Node.js 22+ com Express 4
- **Base de Dados**: SQLite com WAL mode
- **Views**: EJS com express-ejs-layouts
- **Estilos**: Pico CSS v2 (minimalista, acessível)
- **Autenticação**: Sessões com CSRF tokens
- **Segurança**: Rate limiting, sanitização de HTML

### Medidas de Segurança

- ✅ CSRF Protection em todos os formulários
- ✅ Rate limiting no login (15 tentativas/15min)
- ✅ Rate limiting na mudança de password
- ✅ Sanitização de HTML (marked + sanitize-html)
- ✅ Headers de segurança (X-Content-Type, X-Frame, Referrer-Policy)
- ✅ Passwords hashed com bcrypt (12 rounds)
- ✅ Validação de sessões (utilizador activo verificado)
- ✅ SESSION_SECRET obrigatório em produção

### Interface

- **Design minimalista** focado na usabilidade
- **Responsivo** - funciona em desktop e mobile
- **Acessível** - compatível com leitores de ecrã
- **Barra de emergência** - disponível em todas as páginas autenticadas
- **Feedback claro** - mensagens de sucesso/erro visíveis

---

## Fluxos de Utilização

### Fluxo 1: Registo de Sintomas (Cuidador)

```
1. Login → Dashboard de doentes
2. Selecionar doente → Ver perfil
3. Clicar "Registar sintomas"
4. Preencher sliders de sintomas (0-10)
5. Indicar bem-estar geral (0-10)
6. Adicionar notas (opcional)
7. Guardar → Verificação de gravidade
8. Se alerta → Notificação à equipa clínica
```

### Fluxo 2: Gestão de Doente (Clínico)

```
1. Login → Lista de doentes
2. Clicar "Novo doente"
3. Preencher identificador pseudonimizado (ex: P-001)
4. Seleccionar cuidador existente ou criar novo
5. Seleccionar diagnóstico principal
6. Configurar contacto da equipa (email)
7. Guardar → Doente criado
```

### Fluxo 3: Comunicação (Cuidador → Clínico)

```
1. No perfil do doente → "Colocar questão"
2. Escrever mensagem
3. (Opcional) Marcar como urgente
4. Enviar → Email enviado à equipa
5. Clínico responde na área de mensagens
```

---

## Estrutura da Base de Dados

### Tabelas Principais

- **users** - Utilizadores (admin, clinician, caregiver)
- **patients** - Doentes associados a cuidadores
- **symptom_entries** - Registos de sintomas
- **symptom_templates** - Modelos de sintomas por diagnóstico
- **cards** - Fichas de informação
- **categories** - Categorias de fichas
- **diagnoses** - Condições clínicas
- **caregiver_messages** - Mensagens entre cuidador e clínico
- **card_feedback** - Feedback sobre fichas
- **patient_audit_log** - Registo de alterações em doentes
- **sessions** - Sessões de utilizadores

---

## Future Work - Potencial para IA

Esta versão foi desenvolvida **sem recurso a AI**, como pedido. Identificam-se áreas que poderiam beneficiar de AI no futuro:

1. **Análise de padrões** - Detectar padrões nos registos de sintomas
2. **Predição de alertas** - Antecipar agravamento baseado em histórico
3. **Recomendações de fichas** - Sugerir fichas relevantes automaticamente
4. **Chatbot de apoio** - Responder a dúvidas frequentes
5. **Tradução automática** - Traduzir fichas para outras línguas
6. **Análise de sentimento** - Detectar stress do cuidador nas notas
7. **Resumo de evolução** - Gerar resumos automáticos de evolução

---

## Informações de Contacto

- **Email de suporte**: tiagojacinto@med.up.pt
- **Versão**: 0.1.0
- **Licença**: Projeto de investigação FMUP - Uso académico