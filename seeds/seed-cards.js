'use strict';
const { marked } = require('marked');
const db = require('../src/db');

const author = db.prepare(`SELECT id FROM users WHERE role IN ('admin','clinician') LIMIT 1`).get();
if (!author) {
  console.error('Nenhum utilizador admin/clinician encontrado. Execute seed-admin primeiro.');
  process.exit(1);
}

const categories = Object.fromEntries(
  db.prepare('SELECT name, id FROM categories').all().map(c => [c.name, c.id])
);

const cards = [
  {
    category: 'Gestão de Sintomas',
    title: 'Controlo da Dor',
    conditions: ['geral', 'oncologia'],
    tags: 'dor, analgesia, conforto',
    body: `## O que é a dor no contexto dos cuidados paliativos?

A dor é um dos sintomas mais frequentes em doentes com doenças graves. O seu controlo adequado é uma
prioridade e é totalmente possível na grande maioria dos casos.

## Como avaliar a intensidade da dor

Peça ao doente que classifique a dor numa escala de 0 a 10:

- **0** — Sem dor
- **1 a 3** — Dor ligeira
- **4 a 6** — Dor moderada
- **7 a 10** — Dor intensa

Registe o valor no diário de sintomas e comunique à equipa clínica sempre que a dor for superior a 4.

## Medidas não farmacológicas

- Posicionamento confortável na cama ou cadeira
- Aplicação de calor local (almofada térmica) em dores musculares
- Massagem suave nas zonas não dolorosas
- Distracção: música, conversas calmas, televisão com volume baixo
- Ambiente tranquilo com luz suave

## Quando contactar a equipa clínica

Contacte **imediatamente** se:

- A dor for súbita e muito intensa (≥ 8/10)
- O medicamento habitual não fizer efeito
- Surgirem sintomas novos associados à dor (falta de ar, febre)
`,
  },
  {
    category: 'Gestão de Sintomas',
    title: 'Falta de Ar (Dispneia)',
    conditions: ['insuficiencia-cardiaca', 'dpoc', 'oncologia'],
    tags: 'dispneia, respiração, oxigénio',
    body: `## O que é a dispneia?

A dispneia é a sensação subjectiva de dificuldade em respirar. Pode manifestar-se como falta de ar,
sensação de aperto no peito ou incapacidade de respirar fundo.

## O que fazer imediatamente

1. **Sentar o doente** — eleve a cabeceira da cama ou sente-o numa cadeira com os braços apoiados
2. **Abra uma janela** — o movimento de ar fresco na face reduz a sensação de falta de ar
3. **Fique calmo** — a ansiedade do cuidador agrava a sensação no doente
4. **Evite esforços** — ajude o doente nos movimentos básicos

## Posições que ajudam

- Sentado com tronco ligeiramente inclinado para a frente, apoiado nos braços
- Semi-deitado com a cabeceira elevada (ângulo de 45°)
- Deitado de lado com uma almofada entre os joelhos

## Quando ligar para a equipa

- Dispneia súbita intensa que não melhora em 10 minutos
- Lábios ou dedos azulados
- Confusão mental associada à falta de ar
- Febre com dificuldade respiratória
`,
  },
  {
    category: 'Cuidados Diários',
    title: 'Higiene e Conforto',
    conditions: ['geral'],
    tags: 'higiene, pele, banho, conforto',
    body: `## Princípios gerais

Os cuidados de higiene são momentos de proximidade e conforto. Adapte-os às capacidades e preferências
do doente, respeitando sempre a sua privacidade e dignidade.

## Banho na cama

Quando o doente não consegue deslocar-se à casa de banho:

1. Reúna o material antes de começar: toalhas, esponja, água tépida, sabão suave, creme hidratante
2. Mantenha o quarto quente (feche janelas e portas)
3. Descubra apenas a zona que está a lavar, cobrindo o resto
4. Comece pela face, depois tronco, membros superiores, genitais e por fim membros inferiores
5. Seque bem as zonas de dobras (axilas, virilhas, espaços interdigitais)
6. Aplique creme hidratante em todo o corpo

## Cuidados com a pele

- Inspecione diariamente as zonas de pressão: calcanhar, sacro, cotovelos, orelhas
- Vermelhidão persistente numa zona de pressão deve ser comunicada à equipa
- Mude a posição do doente a cada 2 horas se estiver acamado
- Use colchão anti-escaras se prescrito

## Cuidados com a boca

- Higiene oral 2 a 3 vezes por dia, mesmo sem dentes
- Use esponja humedecida se o doente não conseguir escovar
- Mantenha os lábios hidratados com vaselina
`,
  },
  {
    category: 'Apoio Emocional',
    title: 'Como Comunicar com o Doente',
    conditions: ['geral'],
    tags: 'comunicação, emoções, apoio, escuta',
    body: `## A importância da comunicação

Mesmo quando as palavras são difíceis, a presença, o toque e a escuta activa transmitem segurança
e amor. Não há respostas certas — há presença genuína.

## O que dizer (e o que não dizer)

**Frases que ajudam:**
- "Estou aqui contigo"
- "Podes falar sobre o que quiseres"
- "Não tens de estar bem — é normal sentir o que sentes"
- "Posso fazer algo por ti agora?"

**Frases a evitar:**
- "Sei como te sentes" (raramente é verdade)
- "Tens de ser forte" (pode inibir a expressão de sentimentos)
- "Tudo vai correr bem" (se não for verdade, pode destruir a confiança)

## Escuta activa

- Mantenha contacto visual sem ser intrusivo
- Não interrompa nem tente resolver — por vezes basta ouvir
- Valide os sentimentos: "É natural sentires isso"
- Respeite os silêncios — não os preencha compulsivamente

## Quando o doente não quer falar

Respeite. Pode sentar-se ao lado em silêncio, segurar a mão, ou simplesmente estar presente.
A companhia silenciosa tem tanto valor como a conversa.

## Cuide também de si

Cuidar de alguém com doença grave é emocionalmente exigente. Procure apoio de amigos, família
ou profissionais. Não é fraqueza — é necessidade.
`,
  },
  {
    category: 'Situações Urgentes',
    title: 'Quando Chamar Ajuda de Urgência',
    conditions: ['geral'],
    tags: 'urgência, emergência, 112, sinais de alarme',
    body: `## Ligue 112 imediatamente se observar

- **Paragem respiratória** — o doente deixou de respirar
- **Inconsciência súbita** — não responde, não acorda
- **Convulsões** prolongadas (mais de 5 minutos)
- **Hemorragia intensa** que não para com pressão directa
- **Dor no peito intensa e súbita** com suores frios
- **Dificuldade respiratória grave** que não melhora com as medidas habituais

## Ligue para a equipa clínica responsável se

- Dor não controlada pelos medicamentos prescritos (≥ 7/10)
- Febre alta (≥ 38.5°C) que não cede com antipirético
- Confusão mental súbita ou agitação intensa
- Queda com possível fractura ou lesão grave
- Vómitos repetidos que impedem a toma de medicação
- Qualquer situação que lhe cause preocupação séria

## Contactos importantes

Guarde estes números num local visível:

| Contacto | Número |
|---|---|
| Emergência | 112 |
| Equipa clínica | _____________ |
| Hospital de referência | _____________ |
| Farmácia de serviço | _____________ |

## Enquanto espera pelo socorro

1. Mantenha a calma e fique com o doente
2. Siga as instruções do operador do 112
3. Desbloqueie a porta de entrada para facilitar o acesso
4. Reúna a lista de medicação do doente
`,
  },
];

let created = 0;
for (const c of cards) {
  const catId = categories[c.category];
  if (!catId) { console.warn(`Categoria não encontrada: ${c.category}`); continue; }

  const existing = db.prepare('SELECT id FROM cards WHERE title = ? AND category_id = ?').get(c.title, catId);
  if (existing) { console.log(`Ficha já existe: ${c.title}`); continue; }

  const bodyHtml = marked.parse(c.body.trim());
  db.prepare(`
    INSERT INTO cards (category_id, title, body_markdown, body_html, tags, applicable_conditions, author_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(catId, c.title, c.body.trim(), bodyHtml, c.tags, JSON.stringify(c.conditions), author.id);
  console.log(`Ficha criada: ${c.title}`);
  created++;
}

console.log(`\n${created} ficha(s) de informação criada(s).`);
