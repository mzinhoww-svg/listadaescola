---
name: Listada Escola
description: Descoberta de escolas e listas de material escolar, do INEP à papelaria da esquina.
colors:
  paper: "#ffffff"
  paper-warm: "#fbf9f8"
  paper-crease: "#f6f3f2"
  slate-navy: "#5c6b8a"
  slate-navy-deep: "#4d5a75"
  slate-navy-ink: "#384764"
  periwinkle: "#96aaff"
  periwinkle-deep: "#4559a8"
  periwinkle-wash: "#ebefff"
  graphite: "#1b1c1c"
  graphite-soft: "#3a3a3a"
  pencil-gray: "#6e7076"
  ruled-line: "#e7e9ef"
  eraser-gray: "#9f9f9f"
  stationery-amber: "#f7b955"
  stationery-mint: "#7bdcb5"
  stationery-rose: "#f87171"
  alert-red: "#ba1a1a"
  alert-red-ink: "#93000a"
  alert-red-wash: "#ffdad6"
  whatsapp-green: "#25d366"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "2rem"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
    letterSpacing: "normal"
rounded:
  lg: "0.5rem"
  xl: "1rem"
  2xl: "1.5rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.slate-navy}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "0 1rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.slate-navy-deep}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite-soft}"
    rounded: "{rounded.lg}"
    padding: "0 1rem"
    height: "2.75rem"
  button-whatsapp:
    backgroundColor: "{colors.whatsapp-green}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    height: "2.75rem"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.lg}"
    height: "2.75rem"
    padding: "0 0.75rem"
  badge-neutral:
    backgroundColor: "{colors.paper-crease}"
    textColor: "{colors.graphite-soft}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.5rem"
  panel-soft:
    backgroundColor: "{colors.periwinkle-wash}"
    textColor: "{colors.graphite-soft}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 0.75rem"
---

# Design System: Listada Escola

## Overview

**Creative North Star: "Caderno Vivo"**

Um caderno escolar bem organizado, não um dashboard. O sistema recusa
deliberadamente duas estéticas vizinhas: a esterilidade do SaaS moderno e o
minimalismo frio de painel financeiro. No lugar delas, a materialidade
tangível de papelaria — papel levemente quente, linhas de pauta, cantos
arredondados de fichário, acentos de lápis de cor.

Quem usa isto é uma mãe no começo do ano letivo, com a lista da escola na mão
e pouco tempo. A densidade é calma e escaneável: listas de verificação
claras, divisores visíveis, resposta imediata a cada ação. Nada de brilho
supérfluo competindo com a tarefa. A marca vive na precisão dos detalhes —
o tom do papel, o raio do canto, a sombra que mal se vê — não em ornamento.

O produto atende três públicos no mesmo mundo visual: famílias procurando
material, escolas publicando listas, papelarias recebendo orçamentos. A
mesma calma serve aos três.

**Key Characteristics:**

- Papel levemente quente (`paper-warm`) como fundo, nunca branco puro de tela
- Azul-ardósia acadêmico como voz de ação, sem saturação de alerta
- Periwinkle como acento raro, reservado a destaque e progresso
- Tipografia em dois pesos: Plus Jakarta Sans com tracking negativo nos
  títulos, Inter no corpo
- Sombras que sugerem folha sobre folha, nunca elevação de card flutuante
- Alvos de toque generosos (44px) — a tela é usada de pé, no celular

## Colors

Uma paleta de azuis-ardósia suaves, realces periwinkle e brancos de papel. Os
papéis são estritamente contextuais para não cansar durante uma tarefa longa
de comparação.

### Primary

- **Azul-Ardósia** (`slate-navy`): a voz de ação. Botão primário, marcador de
  navegação ativa, título de seção com peso, ícone de estado importante. É a
  cor que o dedo procura.
- **Azul-Ardósia Fundo** (`slate-navy-deep`): estado hover e pressionado do
  primário. Escurece sem mudar de matiz — a transição não deve parecer troca
  de cor, e sim aprofundamento.
- **Azul-Ardósia Tinta** (`slate-navy-ink`): texto sobre superfícies claras
  quando o corpo precisa carregar hierarquia sem virar título.

### Secondary

- **Periwinkle** (`periwinkle`): acento interativo e de progresso. Medidor de
  lista completa, selo, ponto da marca no logotipo, seleção de texto.
- **Periwinkle Fundo** (`periwinkle-deep`): a mesma família em peso de texto,
  para link e rótulo sobre fundo claro.
- **Lavanda de Papel** (`periwinkle-wash`): painel de fundo, container de
  busca, faixa agrupadora. Existe para evitar o brilho duro do branco puro em
  blocos grandes.

### Neutral

- **Grafite** (`graphite`): títulos e texto de máxima hierarquia.
- **Grafite Suave** (`graphite-soft`): corpo de texto padrão. Escolhido por
  atingir contraste acessível tanto sobre `paper` quanto sobre
  `periwinkle-wash`, sem a dureza do preto absoluto.
- **Cinza-Lápis** (`pencil-gray`): texto secundário, legenda, metadado.
- **Linha de Pauta** (`ruled-line`): divisor, borda de card, separador de
  lista. É a linha do caderno.
- **Papel** (`paper`) e **Papel Quente** (`paper-warm`): superfície de card e
  fundo de página, nessa ordem. O fundo é sempre o mais quente dos dois.
- **Cinza-Borracha** (`eraser-gray`): exclusivamente ícone decorativo, estado
  desabilitado e passo inativo. **Nunca texto.**

### Named Rules

**A Regra do Acento Raro.** O periwinkle aparece em no máximo um elemento por
bloco visual. Ele marca progresso e destaque; se estiver em toda parte, não
marca nada.

**A Regra da Pauta.** Separação entre itens de uma mesma lista é sempre
`ruled-line` de 1px, nunca sombra e nunca espaço vazio sozinho. A lista é um
caderno pautado.

**A Regra do Contorno versus Texto.** `#75777e` é a cor de contorno do
sistema de origem e passa na régua de 3:1 aplicável a elementos não
textuais. Ela **não** serve para texto: sobre `paper` dá 4.47:1 e sobre
`paper-warm` 4.26:1, abaixo dos 4.5:1 que a AA exige. Texto secundário usa
`pencil-gray`, que é a mesma família escurecida até 4.95:1 e 4.72:1. Confundir
os dois já custou 13 violações de contraste em produção.

## Typography

**Display Font:** Plus Jakarta Sans (fallback: ui-sans-serif, system-ui)
**Body Font:** Inter (fallback: ui-sans-serif, system-ui)

**Character:** Plus Jakarta Sans traz geometria humanista e aceita tracking
negativo sem fechar demais — títulos ficam compactos e confiantes. Inter
carrega o corpo com legibilidade neutra em tamanho pequeno, que é onde a maior
parte do conteúdo real deste produto vive: nomes de escola, itens de lista,
endereços.

### Hierarchy

- **Display** (600, 1.875rem, tracking -0.02em): `h1` de página de conteúdo.
  Nome da escola, título da lista.
- **Headline** (600, 1.5rem): `h1` de página institucional e de catálogo.
- **Title** (600, 1.125rem): `h2` de seção dentro de uma página.
- **Body** (400, 1rem): texto corrido e conteúdo de card. Medida de 65–75ch.
- **Label** (500, 0.875rem): rótulo de formulário, texto de botão, metadado
  de card.

### Named Rules

**A Regra da Medida.** Todo parágrafo de texto corrido carrega limite de
medida (`max-w-[65ch]`). Um container largo não é licença para linha larga —
já produziu linhas de 153 caracteres em `/escolas`.

**A Regra dos Dois Pesos.** O sistema usa 400, 500 e 600. Não há 700 nem 300.
Hierarquia vem de tamanho e cor antes de peso.

## Layout

Container centralizado com largura máxima por tipo de página: `max-w-3xl` para
leitura (lista, institucional), `max-w-6xl` para catálogo com mapa. Padding
lateral de `1rem` em mobile e `1.5rem` a partir de `sm`.

Mobile-first sem exceção: o menor alvo é 390px de largura, e nenhuma tela pode
produzir rolagem horizontal nele. Grades sobem de uma para duas colunas em
`sm`, e o par resultado+mapa vira `1fr 380px` em `lg` — com o mapa em
`position: sticky` para acompanhar a rolagem da lista em vez de flutuar em
espaço morto.

Ritmo vertical: `1rem` entre elementos irmãos, `1.5rem` entre grupos,
`2.5rem` entre seções. Mais espaço acima de um título do que abaixo dele.

Alvo de toque mínimo de 44px (`2.75rem`) em qualquer elemento interativo
visível em mobile — a altura padrão de botão e input não é escolha estética.

## Elevation & Depth

O sistema é predominantemente plano. Profundidade vem de **camada tonal**
(papel quente no fundo, papel branco no card, lavanda no painel agrupador) e
de borda de 1px, não de sombra. A sombra existe, mas é discreta e sempre
descendente com desfoque largo — a sensação é de folha pousada sobre folha,
não de card flutuando em vidro.

### Shadow Vocabulary

- **Repouso** (`--shadow-sm`): card e superfície estática. Mal perceptível,
  por desenho.
- **Flutuante** (`--shadow-md`): dropdown, toast, popover.
- **Overlay** (`--shadow-lg`): modal, drawer, bottom sheet.

### Named Rules

**A Regra da Folha Pousada.** Toda sombra tem deslocamento vertical e
desfoque largo. Halo colorido sem deslocamento é decoração, e não pertence a
este mundo.

## Shapes

Cantos arredondados generosos, na linguagem de fichário e etiqueta: `lg`
(0.5rem) para controles — botão, input, select; `xl` (1rem) para card e painel;
`2xl` (1.5rem) para superfície grande e bottom sheet; `full` para selo e chip.

Bordas são sempre 1px em `ruled-line`. Não há borda colorida grossa, e não há
borda lateral de acento — o destaque vem de fundo tonal, não de faixa.

## Components

### Buttons

- **Shape:** canto arredondado suave (`lg`), altura fixa de 44px.
- **Primary:** fundo azul-ardósia, texto em papel. É o único botão com fundo
  sólido de marca por bloco.
- **Hover / Focus:** hover aprofunda para `slate-navy-deep`; foco desenha
  contorno de 2px em azul-ardósia com deslocamento de 2px, herdado do
  `:focus-visible` global.
- **Outline:** fundo papel, borda `ruled-line`, texto grafite. Ação
  secundária que ainda é ação.
- **Ghost:** sem fundo nem borda. Ação terciária, tipicamente cancelar.
- **WhatsApp:** verde da plataforma. É o único caso em que uma cor externa
  entra no sistema, porque o reconhecimento do canal vale mais que a
  coerência cromática.

### Cards

- **Corner Style:** `xl`.
- **Background:** papel branco sobre fundo de papel quente.
- **Shadow Strategy:** repouso apenas; ver Elevation & Depth.
- **Border:** 1px `ruled-line`, sempre presente. A borda faz o trabalho que a
  sombra não faz.
- **Internal Padding:** `1rem`.

### Inputs / Fields

- **Style:** fundo papel, borda `ruled-line`, canto `lg`, altura 44px.
- **Focus:** contorno de 2px em azul-ardósia com offset; o caret também é
  azul-ardósia.
- **Error:** borda e texto de apoio em `alert-red`, com a mensagem associada
  ao campo por `aria-describedby` — nunca só cor.
- **Disabled:** fundo `paper-warm`, texto `eraser-gray`.

### Navigation

Header de papel branco com borda inferior `ruled-line`. Logotipo à esquerda
(marca + wordmark bicolor), links em label. Item ativo em azul-ardósia. Em
mobile, os mesmos links empilham sem virar menu sanduíche — são poucos, e
esconder custaria mais do que mostrar.

### Empty States

Ícone em `eraser-gray`, título em title, descrição em body sobre
`periwinkle-wash`. O texto sempre diz **o que aparecerá ali quando houver
conteúdo**, nunca só "nada encontrado".

### Named Rules

**A Regra do Estado Honesto.** Estado vazio nomeia o que virá: "Assim que uma
papelaria for cadastrada, ela aparece aqui." Um marketplace sem parceiros
ainda precisa explicar que o canal existe.

## Do's and Don'ts

### Do:

- **Do** usar `paper-warm` como fundo de página e `paper` como superfície de
  card. Essa é a camada tonal que substitui sombra.
- **Do** limitar todo parágrafo corrido a 65–75ch.
- **Do** usar `pencil-gray` para texto secundário e `eraser-gray` apenas para
  ícone decorativo e estado desabilitado.
- **Do** manter 44px de altura em qualquer controle tocável.
- **Do** puxar as superfícies do navegador — seleção, caret, barra de rolagem
  — para a paleta. É o detalhe mais barato que separa página construída de
  página montada.
- **Do** manter o mapa em `sticky` quando ele acompanha uma lista longa.

### Don't:

- **Don't** usar `eraser-gray` (`#9f9f9f`) em texto: 2.65:1, reprova AA por
  larga margem.
- **Don't** usar a cor de contorno `#75777e` em texto. Ver **A Regra do
  Contorno versus Texto**.
- **Don't** trocar Inter ou Plus Jakarta Sans por serem "fontes saturadas".
  A dupla é decisão do design system de origem; detector automático que
  sinaliza isso está opinando sobre o brief, e o brief vence.
- **Don't** introduzir borda lateral colorida acima de 1px em card, item de
  lista ou alerta.
- **Don't** usar sombra para separar itens de uma mesma lista — isso é
  trabalho da linha de pauta.
- **Don't** usar branco puro como fundo de página. O papel é quente.
- **Don't** inventar peso 300 ou 700. O sistema tem três pesos.
