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
    title: 'Náuseas e Vómitos',
    conditions: ['oncologia', 'geral'],
    tags: 'náuseas, vómitos, enjoo, alimentação',
    body: `## O que são e por que acontecem

As náuseas e os vómitos são sintomas frequentes em doentes com doenças graves. Podem ser causados
pela própria doença, pelos medicamentos (especialmente analgésicos opioides), por obstipação ou
pela ansiedade. Raramente são perigosos, mas causam muito desconforto.

## O que fazer imediatamente

- **Mantenha a calma** — a ansiedade agrava as náuseas
- **Posicione o doente semi-sentado** — evite que fique completamente deitado após comer
- **Ar fresco** — abra uma janela ou use um pequeno ventilador apontado à face
- **Aromas fortes** — afaste comidas com cheiros intensos; prefira alimentos frios ou à temperatura ambiente
- **Pequenas refeições frequentes** — 5 a 6 pequenas refeições em vez de 3 refeições grandes
- **Hidratação aos goles** — ofereça líquidos frescos (água, chá frio, sumo diluído) em pequenas quantidades

## Alimentos que geralmente toleram melhor

- Bolachas de água e sal, tostas, arroz branco
- Iogurte simples, puré de batata
- Caldo de vegetais ou frango (morno ou frio)
- Evite: fritos, gordurosos, com cheiro forte, muito doces

## Sinais de alerta — quando agir

| Situação | O que fazer |
|---|---|
| Náusea ligeira que cede com repouso | Continue a vigiar; ofereça líquidos |
| Vómitos repetidos (mais de 2×) | Suspenda alimentação temporariamente; contacte a equipa |
| Vómito com sangue ou aspecto de "borra de café" | Ligue 112 imediatamente |
| Impossibilidade de tomar medicação oral | Contacte a equipa clínica com urgência |

## Quando contactar a equipa clínica

- Vómitos que impedem a ingestão de medicamentos
- Náuseas intensas que não melhoram com as medidas acima
- Sinais de desidratação: boca seca, urina escura, confusão
`,
  },
  {
    category: 'Gestão de Sintomas',
    title: 'Obstipação',
    conditions: ['oncologia', 'geral', 'insuficiencia-renal'],
    tags: 'obstipação, intestino, laxante, opioide',
    body: `## O que é e por que acontece

A obstipação (intestino preso) é muito comum em cuidados paliativos — afecta cerca de 40% dos
doentes. As principais causas são os analgésicos opioides (que abrandam o intestino), a imobilidade,
a desidratação e a diminuição da ingestão alimentar.

**Importante:** Se o doente toma opioides, a obstipação é quase sempre esperada e deve ser
prevenida desde o início.

## O que fazer

### Medidas gerais
- **Hidratação** — encoraje a ingestão de líquidos (água, sumos de fruta, especialmente ameixa)
- **Actividade física** — mesmo pequenos movimentos ou transferências para a cadeira ajudam
- **Privacidade e posição** — sempre que possível, use a sanita em vez da arrastadeira; os pés apoiados
  num pequeno banco (posição de cócoras) facilita a evacuação
- **Horário regular** — tente depois das refeições, quando o reflexo intestinal é mais activo

### Alimentos que ajudam
- Ameixas e sumo de ameixa, laranjas, kiwi
- Legumes e cereais integrais (se tolerados)
- Azeite: uma colher de sopa em jejum pode ajudar

## Sinais de alerta

| Situação | O que fazer |
|---|---|
| Sem evacuação há 2–3 dias | Aplique medidas acima; informe a equipa se não melhorar |
| Sem evacuação há mais de 3 dias com dor abdominal | Contacte a equipa clínica |
| Abdómen muito distendido ou dor intensa | Contacte a equipa com urgência |
| Vómitos com cheiro fecal | Ligue 112 imediatamente |

## Quando contactar a equipa clínica

- Mais de 3 dias sem evacuação apesar das medidas
- Dor ou desconforto abdominal intenso
- Náuseas ou vómitos associados à obstipação
- O doente não consegue tomar os laxantes prescritos
`,
  },
  {
    category: 'Gestão de Sintomas',
    title: 'Confusão e Agitação (Delirium)',
    conditions: ['geral'],
    tags: 'delirium, confusão, agitação, desorientação',
    body: `## O que é

O delirium é uma alteração aguda do estado mental — a pessoa fica confusa, desorientada, pode
não reconhecer familiares, ver ou ouvir coisas que não existem, ou ficar muito agitada. Em doentes
com doenças graves em fase avançada, é muito comum, especialmente nas últimas horas ou dias de vida.

Pode ser causado por: infecção, desidratação, medicamentos, dor não controlada, insuficiência de
órgãos ou pela progressão da doença.

**Mantenha a calma.** A sua serenidade é o melhor apoio que pode dar ao doente.

## O que fazer imediatamente

1. **Fique presente e fale com voz calma** — identifique-se: "Sou eu, o/a [nome], estou aqui contigo"
2. **Reduza estímulos** — desligue a televisão, diminua a luz se for intensa, afaste ruídos
3. **Oriente gentilmente** — diga a data, o local, o que está a acontecer; não discuta nem corrija de forma confrontacional
4. **Ilumine o espaço a noite** — uma luz de presença reduz a confusão nocturna
5. **Objectos familiares** — fotografias, cobertores favoritos criam conforto
6. **Não restrinja fisicamente** — pode aumentar a agitação e causar lesões

## O que NÃO fazer

- Não discuta nem contradiga o doente sobre o que ele "vê" ou acredita
- Não deixe o doente sozinho se estiver muito agitado e puder cair
- Não administre medicamentos não prescritos sem indicação médica

## Sinais de alerta

| Situação | O que fazer |
|---|---|
| Confusão ligeira, sem agitação | Vigie; aplique as medidas acima; informe a equipa |
| Agitação intensa com risco de queda ou autolesão | Contacte a equipa clínica com urgência |
| Perda súbita de consciência | Ligue 112 |
| Febre alta associada à confusão | Contacte a equipa clínica |

## Quando contactar a equipa clínica

- Confusão de início súbito (nas últimas horas)
- Agitação que não acalma com as medidas acima
- Suspeita de causa tratável: febre, retenção urinária, dor intensa
- Qualquer dúvida sobre a segurança do doente
`,
  },
  {
    category: 'Gestão de Sintomas',
    title: 'Fadiga e Cansaço',
    conditions: ['geral'],
    tags: 'fadiga, cansaço, energia, repouso, actividade',
    body: `## O que é a fadiga em cuidados paliativos

A fadiga relacionada com a doença é diferente do cansaço normal: não melhora completamente
com o repouso, pode ser física, mental ou emocional, e é muito frequente — afecta a maioria
dos doentes com doenças avançadas.

Não é "preguiça" — é um sintoma real causado pela doença, pelos tratamentos ou pelo esforço
do próprio organismo a tentar adaptar-se.

## O que fazer

### Gerir a energia
- **Identifique os melhores momentos do dia** — geralmente pela manhã; planeie actividades importantes para essas alturas
- **Alternância trabalho–repouso** — pequenas pausas antes de ficar exausto são mais eficazes do que repouso prolongado
- **Simplifique as tarefas** — adapte as actividades de higiene e refeições para que exijam menos esforço
- **Elimine o que não é essencial** — ajude o doente a priorizar o que lhe traz mais significado

### Nutrição e hidratação
- Refeições pequenas e nutritivas, ricas em proteína (ovos, leguminosas, peixe)
- Hidratação adequada ao longo do dia

### Conforto emocional
- A fadiga piora com ansiedade e tristeza; momentos de conversa, música suave ou presença silenciosa ajudam
- Valide o cansaço: "É normal sentires isso — o teu corpo está a fazer um esforço enorme"

## O que NÃO fazer

- Não force actividade física intensa
- Não insista em refeições completas quando o apetite é muito baixo
- Não minimize o sintoma ("é só cansaço, passa")

## Sinais de alerta

| Situação | O que fazer |
|---|---|
| Fadiga habitual, estável | Continue as medidas acima |
| Fadiga muito intensa de início súbito | Informe a equipa clínica |
| Fadiga com falta de ar em repouso | Contacte a equipa com urgência |
| Confusão ou sonolência excessiva | Contacte a equipa clínica |

## Quando contactar a equipa clínica

- Fadiga muito intensa de início súbito (pode indicar anemia, infecção ou outra causa tratável)
- O doente não consegue sair da cama nem fazer actividades mínimas
- Fadiga associada a outros sintomas novos
`,
  },
  {
    category: 'Gestão de Sintomas',
    title: 'Dor Irruptiva',
    conditions: ['oncologia'],
    tags: 'dor irruptiva, breakthrough pain, dor episódica, opioide',
    body: `## O que é a dor irruptiva

A dor irruptiva (também chamada dor episódica ou "breakthrough pain") é uma crise de dor intensa
e súbita que surge mesmo quando a dor de fundo está controlada com medicação regular.

Ocorre em cerca de 80–90% dos doentes oncológicos. É geralmente de início rápido (em minutos),
intensidade moderada a severa, e duração de 15 a 30 minutos.

## Tipos mais comuns

- **Incidental** — desencadeada por uma actividade: mudar de posição, tossir, higiene
- **Espontânea** — surge sem causa identificável
- **De fim de dose** — ocorre antes da hora da próxima toma de medicação regular

## O que fazer durante uma crise

1. **Ajude o doente a adoptar a posição mais confortável** — normalmente a que ele pede
2. **Administre a medicação de resgate prescrita** — a equipa clínica terá prescrito um medicamento específico para estas crises; administre conforme indicado
3. **Fique presente** — a presença calma reduz a ansiedade que amplifica a dor
4. **Distracção suave** — música, conversa tranquila
5. **Aplique calor local** se prescrito e se a dor for muscular/óssea

**Registe sempre:** hora de início, intensidade (0–10), duração, o que a desencadeou e se a medicação de resgate fez efeito.

## O que NÃO fazer

- Não administre medicação extra além do prescrito como resgate
- Não espere que a dor passe sozinha se for muito intensa — use a medicação de resgate

## Sinais de alerta

| Situação | O que fazer |
|---|---|
| Crise que cede com medicação de resgate em 30 minutos | Registe e informe a equipa na próxima consulta |
| Crises muito frequentes (> 4 por dia) | Contacte a equipa para ajuste da medicação regular |
| Crise que não cede com medicação de resgate | Contacte a equipa clínica com urgência |
| Dor intensa com outros sintomas novos (febre, dificuldade respiratória) | Contacte a equipa ou 112 |

## Quando contactar a equipa clínica

- Crises muito frequentes que perturbam o sono ou as actividades
- Medicação de resgate sem efeito ou com efeitos secundários
- Dúvidas sobre como ou quando administrar a medicação de resgate
`,
  },
  {
    category: 'Cuidados Diários',
    title: 'Alimentação e Hidratação em Fim de Vida',
    conditions: ['geral'],
    tags: 'alimentação, hidratação, apetite, nutrição, fim de vida',
    body: `## Por que o apetite diminui no fim de vida

A diminuição do apetite e da sede é uma resposta natural e esperada quando o corpo se aproxima
do fim de vida. Não é sinal de abandono nem de sofrimento — é parte do processo natural.

O corpo, nesta fase, não tem capacidade de usar os nutrientes e a comida forçada pode causar
desconforto (náuseas, distensão, tosse).

## O que pode fazer

### Se o doente ainda come alguma coisa
- **Respeite as preferências** — ofereça o que ele gosta, mesmo que "não seja saudável"
- **Porções pequenas** — duas colheres já são uma refeição nesta fase
- **Apresentação cuidada** — pratos atractivos, ao nível dos olhos do doente
- **Horários flexíveis** — coma quando ele tem apetite, não por obrigação
- **Texturas adaptadas** — purés, iogurtes, batidos, gelatinas se tiver dificuldade em mastigar

### Cuidados com a boca (mesmo sem comer)
- **Higiene oral frequente** — a boca resseca com a diminuição da ingestão; use esponja húmida
- **Hidratação dos lábios** — vaselina ou creme próprio
- **Gelo partido ou cubos de gelo** — pequenos cubos na boca refrescam sem forçar ingestão
- **Sprays bucais** — disponíveis em farmácias para a sensação de boca seca

### Hidratação
- Não é necessário beber grandes quantidades; pequenos goles frequentes chegam
- A sede, quando existe, é aliviada pela higiene oral e pequenas quantidades de líquido

## O que NÃO fazer

- Não force a alimentação — pode causar sofrimento e aspiração (engasgamento)
- Não se sinta culpado pela diminuição do apetite — não é falha sua nem do doente
- Não insista em suplementos ou sondas sem indicação médica

## Quando falar com a equipa clínica

- O doente engasga-se frequentemente ao comer ou beber
- Preocupações sobre hidratação artificial (soro) ou sonda
- Dúvidas sobre o que é normal nesta fase
- Se a família estiver em conflito sobre a alimentação do doente
`,
  },
  {
    category: 'Situações Urgentes',
    title: 'Estertores (Respiração Ruidosa)',
    conditions: ['geral'],
    tags: 'estertores, respiração ruidosa, agonia, secreções, fim de vida',
    body: `## O que são os estertores

Os estertores são um ruído respiratório — um "ronco" ou "gorgolejo" — que surge habitualmente
nas últimas horas ou dias de vida. É causado pelo acúmulo de secreções na garganta e nas vias
aéreas, porque o doente já não tem força para tossir ou engolir.

**Este ruído é mais perturbador para quem está a ouvir do que para o doente.**
Os doentes nesta fase estão geralmente inconscientes ou com muito baixo nível de consciência
e não sentem desconforto pelo ruído em si.

## O que fazer

### Para o doente
- **Mude a posição** — deite-o de lado (decúbito lateral); esta posição drena naturalmente as secreções
- **Elevação ligeira da cabeceira** — ângulo de 15–30° pode ajudar
- **Não tente aspirar as secreções** — aspiração manual é geralmente ineficaz e pode causar agitação
- **Boca seca** — aplique higiene oral suave com esponja húmida

### Para a família
- **Explique o que está a acontecer** — "Este ruído é das secreções; ele não está a sofrer com isso"
- **Presença** — segurar a mão, falar suavemente; o doente pode ainda ouvir
- **Cuide de si** — estes momentos são emocionalmente intensos; aceite apoio

## O que NÃO fazer

- Não aspire as secreções sem indicação médica
- Não force líquidos ou medicamentos orais nesta fase

## Quando contactar a equipa clínica

- Se o doente mostrar sinais de desconforto ou agitação associados ao ruído
- Se a família estiver muito angustiada e precisar de suporte
- Se existir medicação prescrita para diminuir as secreções e tiver dúvidas sobre como administrar
- **Nota:** A equipa pode prescrever medicação (por exemplo, butilescopolamina ou atropina) que reduz
  a produção de secreções — pergunte se ainda não foi prescrita
`,
  },
  {
    category: 'Cuidados Diários',
    title: 'Cuidados à Pele e Prevenção de Úlceras de Pressão',
    conditions: ['geral'],
    tags: 'pele, úlceras de pressão, escaras, posicionamento, higiene',
    body: `## Por que a pele fica vulnerável

Em doentes acamados ou com mobilidade muito reduzida, a pressão constante sobre as zonas
de apoio diminui a circulação, o que pode causar lesões — as chamadas úlceras de pressão
(ou escaras). A pele também fica mais frágil com a desnutrição, desidratação e a própria doença.

**Prevenção é muito mais fácil do que tratamento.**

## Zonas de maior risco

Inspecione diariamente estas zonas:
- **Sacro** (parte baixa das costas) — a mais afectada
- **Calcanhares**
- **Cotovelos**
- **Omoplatas** (omoplatas)
- **Orelhas e occipital** (nuca) — em doentes que ficam muito na mesma posição
- **Tornozelos**

## O que fazer

### Posicionamento
- **Mude a posição a cada 2 horas** se o doente estiver acamado
- Use **almofadas** entre os joelhos e entre os tornozelos quando está de lado
- Mantenha os **calcanhares elevados** com uma almofada sob as pernas (não directamente sob o calcanhar)
- Se possível, **colchão anti-escaras** (fale com a equipa sobre indicação)

### Higiene e pele
- Lave a pele com água tépida e sabão suave; seque bem, especialmente nas dobras (axilas, virilhas, zona genital)
- **Hidrate** a pele seca com creme neutro; aplique após cada higiene
- **Zonas de pressão** — aplique creme barreira (vaselina, ou creme específico) nas zonas de risco
- Mantenha a cama **limpa, seca e sem rugas** — friccionar activa causa lesões

### Roupa e lençóis
- Prefira roupas e lençóis de algodão macio
- Evite dobras e costuras directamente sobre zonas de apoio

## Sinais de alerta — quando agir

| Situação | O que fazer |
|---|---|
| Vermelhidão que desaparece ao pressionar (dedo) | Reposicione; aumente a frequência de mudança de posição |
| Vermelhidão que **não** desaparece ao pressionar | Contacte a equipa clínica |
| Pele aberta, ferida, ou úlcera visível | Contacte a equipa — pode precisar de penso específico |
| Odor ou secreção numa ferida | Contacte a equipa clínica |

## Quando contactar a equipa clínica

- Qualquer zona vermelha persistente (mais de 30 minutos depois de mudar de posição)
- Feridas abertas ou úlceras — necessitam de penso especializado
- Dúvidas sobre o tipo de colchão ou superfície de apoio adequada
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

console.log(`\n${created} ficha(s) criada(s).`);
