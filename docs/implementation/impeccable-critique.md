# Critique — Listada Escola (`/impeccable critique`)

Data: 2026-09-13 · Branch: `feat/onda-1-document-critique` · Base: `c293161`
Autoridade de design: [`DESIGN.md`](../../DESIGN.md) + [`.impeccable/design.json`](../../.impeccable/design.json)
(gerados no passo anterior, `/impeccable document`).

Este documento é o **eixo de UX** da Onda 1. O passo anterior
([`impeccable-audit.md`](./impeccable-audit.md)) cobriu o eixo de *craft*
mecânico — contraste, line-length, superfícies de browser. Este cobre o que
o detector não vê: se a jornada funciona, se a tela é do produto ou de
qualquer produto, e onde a mãe com pressa desiste.

---

## 0. Método e o que foi realmente medido

O playbook do `critique` exige **duas avaliações isoladas**, sem contato
entre si, para que a concordância signifique alguma coisa:

| | Assessment A | Assessment B |
|---|---|---|
| Papel | Revisão de design (Nielsen, carga cognitiva, jornada, persona) | Detector `impeccable-engine 0.1.5` + evidência de browser |
| Método | Navegação real + leitura de código | `detect` em 7 URLs × 2 viewports, 2 rodadas cada, + sonda Playwright própria |
| Escopo | 6 telas renderizadas | `1280×800` e `390×844`, mais scan estático de `src/app src/components` |

Ambas rodaram contra um **build de produção servido localmente**, apontando
para o **projeto Supabase real** (`wfdejmokxrunupsekcmq`) — não contra
fixtures. Nenhuma supressão ativa: não existe `.impeccable/config.json`,
`ignoreRules`, `ignoreFiles` nem comentário `impeccable-disable` em `src/`.

### O fato que reenquadra todo o resto

O banco de produção, verificado no momento da escrita:

| tabela | linhas |
|---|---|
| `schools` | **2.722** |
| `school_lists` | **0** |
| `school_list_items` | **0** |
| `stores` | **0** |
| `reviews` | **0** |
| `list_submissions` | **0** |
| `ecommerce_partners` | 1 |
| `auth.users` | 2 (1 `ADMIN`, 1 `USER`) |

**O produto tem o lado da demanda e não tem o lado da oferta.** A jornada é
escola → lista → onde comprar, e ela termina no primeiro salto para 100%
dos visitantes de hoje. Isso não é um bug de código; é o estado pré-lançamento
legítimo. Mas é o estado que a interface precisa tratar bem, e hoje ela não
trata — é a origem da maioria dos P1/P2 abaixo.

---

## 1. Onde A e B concordam — confiança máxima

Quatro achados apareceram independentemente nos dois eixos. São os de menor
risco de serem opinião.

### 1.1 A tela de payoff não tem cobertura de avaliação

- **B:** `/listas/e2e-impeccable-lista-12a1bb8b` → HTTP 404. O que o detector
  mediu foi a página de erro (16.360 B), não uma lista. O achado
  `overused-font (92%)` atribuído a essa URL descreve a 404.
- **A:** reproduziu o markup de `src/app/(public)/listas/[slug]/page.tsx`
  *verbatim* num harness para conseguir avaliar a tela — sem escrever no banco.

**Consequência:** a página mais importante do produto foi avaliada por
reconstrução, não por observação. Qualquer conclusão sobre ela é mais fraca
que as demais. Para cobri-la de verdade é preciso semear ao menos uma linha
em `school_lists` + `school_list_items`.

### 1.2 `/enviar-lista` também não tem cobertura

`/enviar-lista` → HTTP 307 → `/auth/entrar?next=%2Fenviar-lista`. O detector
não tem sessão. O "zero achados" para `/enviar-lista` é, na prática, uma
segunda medição de `/auth/entrar` — **não é evidência de que o formulário
esteja limpo**. Todo o fluxo de contribuição está sem avaliação.

### 1.3 Os badges de 12px são apertados de verdade

- **B (medido):** 20 badges em `/escolas` com `py-0.5` = **2px** real contra
  limiar de 3,6px para texto de 12px, sobre `background: rgb(246,243,242)` —
  uma fronteira visível. Não entraram no relatório do detector só porque ele
  emite **um achado por regra por página** e reportou apenas o pior caso.
- **A:** chegou ao mesmo ponto por outro caminho, notando que os chips
  dominam visualmente a lista de itens sem informar.

Origem: `src/components/ui/badge.tsx:7` — `px-2 py-0.5 text-xs`.

### 1.4 O mapa de `/escolas` desperdiça a coluna que ocupa

- **B (medido a 1280×800):** coluna esquerda 2.410px (301% do viewport),
  direita 320px (40%). `position: sticky; top: 16px` **está computado** — não
  é só a classe. Mas a partir de scroll ≈395px sobram **464px de coluna vazia**
  abaixo do mapa por ~2.015px de rolagem restante.
- **A:** "o mapa ocupa 320px numa coluna de 2.410px (13%)"; e no mobile ele
  está *depois* de 20 cards e da paginação, a ~5.000px de rolagem — onde não
  ajuda ninguém a decidir nada.

---

## 2. O que o detector pegou e a revisão não

### 2.1 Dois novos `line-length` de 121ch — regressão da própria Onda 1.2

| arquivo | linha | capacidade |
|---|---|---|
| `src/app/(public)/escolas/[uf]/[cidade]/[slug]/page.tsx` | 269 | 121ch |
| `src/app/(public)/escolas/[uf]/[cidade]/[slug]/page.tsx` | 317 | 121ch |

Na Onda 1.2 corrigi dois parágrafos com `max-w-[65ch]`
(`location-banner.tsx:36` e `listas/[slug]/page.tsx:184`) — B confirmou que
**ambos continuam corrigidos e nenhum reincidiu**. Estes são parágrafos
**diferentes**, no arquivo de perfil de escola, que nunca receberam `max-w`.
Corrigi o sintoma onde ele foi detectado, não a classe do problema.

B também mediu um terceiro pior que os dois, **não reportado pelo detector**:
`src/components/ui/footer.tsx:40` com **184ch** de capacidade (1.104px a 12px).

### 2.2 Três advisories estáticas em `global-error.tsx`

| linha | achado |
|---|---|
| 32 | `fontSize: 1.25rem` fora da rampa do `DESIGN.md` |
| 33 | cor `#525252` não documentada |
| 42 | cor `#d4d4d4` não documentada |

A rampa documentada (`DESIGN.md`, linhas 29–55) é 1.875 / 1.5 / 1.125 / 1 /
0.875rem — não há passo 1.25rem. As advisories estão **tecnicamente corretas**.
Atenuante real: `global-error.tsx` substitui o `<html>` inteiro quando o root
layout falha, então não pode depender do CSS do app — os valores precisam ser
literais. A correção honesta é usar literais que **coincidam** com os tokens,
não literais arbitrários.

---

## 3. O que a revisão pegou e o detector não

Nenhuma dessas é mensurável por regra. Todas foram confirmadas por mim no
código antes de entrar aqui.

### 3.1 O beco sem saída da escola sem lista

`src/app/(public)/escolas/[uf]/[cidade]/[slug]/page.tsx:270-274` instancia
`EmptyState` **sem `action`** — e o componente suporta o prop
(`src/components/ui/empty-state.tsx:10,36`). O mecanismo existe e não foi usado.

É o momento de maior intenção do produto inteiro: a mãe está com a lista de
papel na mão, acabou de confirmar que a escola é a certa. A resposta é
"volte depois", sem saída.

Pior: `/enviar-lista` é alcançável de **exatamente dois lugares em todo o site
público** — `(public)/page.tsx:98` e um link de texto em
`como-funciona/page.tsx:52`. Não está no header, não está no footer, e não
está aqui. Verificado por varredura.

Mesmo padrão, sem `action`, em mais três lugares:
`escolas/[uf]/[cidade]/[slug]/page.tsx:302-304`, `papelarias/page.tsx:39-43`,
`escolas/page.tsx:113-116`.

### 3.2 Busca por nome é rotulada como proximidade

`src/app/(public)/escolas/page.tsx:105` passa `hasLocation={hasLocation || hasQuery}`
e `:100` define `locationLabel` como `"${params.q}"` quando há query. Resultado
verificado ao vivo em `/escolas?q=Pompermayer`:

> **Mostrando resultados perto de "Pompermayer"**

Pompermayer não é um lugar. O banner mente sobre o critério — e proximidade é
justamente a promessa que o PRD proíbe fabricar (RN-009).

### 3.3 Telefone e WhatsApp são texto puro

`escolas/[uf]/[cidade]/[slug]/page.tsx:210-215` renderiza `{school.phone}` sem
`tel:`; `:235-240` renderiza `{profile.whatsapp}` sem `wa.me`. Num produto
mobile-first cujo canal local **é** o WhatsApp, a mãe vê o número e tem que
copiar à mão.

### 3.4 O enum cru vaza para a tela

`escolas/[uf]/[cidade]/[slug]/page.tsx:243`:
`<span>{contact.contact_type}:</span> {contact.value}` — imprime o valor do
enum do banco (`PHONE`, `EMAIL`…) sem mapa de rótulos.

### 3.5 Endereço duplicado em dado real do INEP

`:172-174` concatena `address` + `municipality` + `uf` sem deduplicar. Em dado
real de Comodoro isso produz:

> Vila Agro Vila Sao Jose, S/n Zona Rural. Distrito de Noroagro. 78310-000
> Comodoro - **Mt.** — **Comodoro, MT**

O `toDisplayCase` ainda transforma a UF embutida em "Mt.". INEP é master data
e não deve ser editado — a correção é de apresentação, não de dado.

### 3.6 O alvo primário do card tem 36px

`src/components/schools/school-card.tsx:66-73` — `py-2` + `text-sm` = 8+20+8 =
**36px**, repetido 20× por página a 390px. O `DESIGN.md` é explícito: "Alvo de
toque mínimo de 44px em qualquer elemento interativo visível em mobile — a
altura padrão de botão e input não é escolha estética."

Junto disso, o `CardContent` com `flex-1` empurra o `CardFooter`, produzindo
(medido) **60px de vazio num card de 207px** — 29% do card. Os dois problemas
têm a mesma correção: tornar o card inteiro o link e remover o footer.

### 3.7 O catálogo não diz quais escolas têm lista

`school-card.tsx:59-63` só renderiza `list_count` quando `> 0` — nunca o
inverso. `results-filters.tsx:29-73` oferece Tipo, Etapa, Avaliação mínima e
Ordenar por — **nenhum sobre lista**. Com 2.722 escolas e 0 listas, todos os
cards são idênticos, e a única forma de descobrir se a sua escola tem lista é
abrir o perfil. O filtro "Avaliação mínima" só pode retornar zero, já que
`reviews` está vazia.

### 3.8 Hambúrguer contra a regra explícita do design system

`src/components/ui/header.tsx:99-115` — botão `md:hidden` escondendo 4 links
curtos. O `DESIGN.md` diz: "Em mobile, os mesmos links empilham sem virar menu
sanduíche — são poucos, e esconder custaria mais do que mostrar." A
implementação do menu em si é cuidadosa (`aria-expanded`, `aria-controls`,
Escape devolvendo foco — `header.tsx:43-62`); a divergência é de decisão, não
de execução.

### 3.9 A home não mostra uma única escola

Verificado ao vivo: nem "Escolas em destaque" nem "Listas recentes" renderizam.
Ambas as seções são condicionais (`(public)/page.tsx:52` e `:68`) e ambas as
queries retornam `[]` — **por decisão deliberada e documentada** em
`src/lib/schools/home-queries.ts:5-11`: destaque é só patrocínio ou verificação
admin, "nunca uma amostra arbitrária vestida de curadoria".

A decisão de engenharia está certa. A consequência de produto é que a home de
um site com 2.722 escolas mostra zero escolas, sobram os saltos `mt-16` órfãos,
e a página termina em 987px no desktop com cara de inacabada. É o tipo de coisa
que só aparece quando alguém olha a tela — o detector não tem como saber que
uma seção *deveria* estar ali.

### 3.10 `/escolas` sem localização despeja 2.722 resultados alfabéticos

Página 1 de 137, composta de APAEs e associações de pais de 17 municípios
diferentes. `escolas/page.tsx:69-81` sempre executa a busca e `:110-131` sempre
renderiza a grade. Ironicamente o `LocationBanner` já sabe que falta localização
— abre em modo "changing" (`location-banner.tsx:25`) — e o dump acontece
embaixo do mesmo jeito.

---

## 4. Contradição entre A e B — resolvida por medição própria

**Assessment A reportou uma falha de contraste:** badge `info` medindo
**3,36:1** com 12px, atribuída ao mapeamento `--color-info-*` → sky do Tailwind.

**Assessment B reportou zero achados de contraste** em ambos os viewports.

Como as duas não podem estar certas e eu ia publicar o resultado, medi eu mesmo,
por dois caminhos independentes:

**Aritmética dos tokens.** `--color-info-50` = `sky-50` = `oklch(97.7% 0.013 236.62)`
= `#f0f9ff`; `--color-info-700` = `sky-700` = `oklch(50% 0.134 242.749)` = `#0069a8`.
Luminância relativa → **5,49:1**. Passa AA com folga.

**Auditoria de browser.** Varredura de todo nó de texto em **9 URLs × 2
viewports**, compondo alpha da cadeia de ancestrais e aplicando o limiar
correto por tamanho/peso (4,5:1 normal, 3:1 large). Resultado: **zero
violações**. Amostras dos badges reais: "Privada" `neutral` = 8,44:1;
"Rejeitada" `danger` = 7,24:1.

**Veredito: Assessment A está errada nesse ponto.** Não há falha de contraste
no produto. A observação *lateral* de A continua válida e vale registrar: o
`info` é sky do Tailwind, uma cor **fora da paleta Caderno Vivo**, usada num
dos chips mais visíveis — problema de coerência de marca, não de acessibilidade.

---

## 5. Falsos positivos registrados

### FP-1 — `overused-font` (5 ocorrências × 2 viewports)

O detector sinaliza Inter e Plus Jakarta Sans como "não mais distintivas". Mas
**o brief vence**: `src/app/layout.tsx:7-8` documenta o par como herdado do
export oficial do Stitch, e `DESIGN.md` o normatiza. Trocar a tipografia para
satisfazer uma heurística de novidade seria substituir a autoridade de design
pela opinião do linter. Registrado como FP permanente.

### FP-2 — `cramped-padding` nos botões (3 × 2 viewports)

O padrão sinalizado é altura fixa + centralização por flexbox
(`src/components/ui/button.tsx:29-32`). Um botão `h-12` com texto de 16px tem
16px de folga acima e abaixo do glifo; o detector só lê a propriedade `padding`,
que é 0. A prova está no próprio design system que o detector carregou —
`DESIGN.md:73-74`: `.ds-btn-primary { height: 2.75rem; padding: 0 1rem; }`.
Ele está reclamando de conformidade.

**Ressalva que não é FP:** os 20 badges de 12px com 2px reais (§1.3) são
apertados de verdade e ficam de fora deste FP.

### FP-3 — `first-viewport-column-overflow` — **parcial**

O `sticky` está aplicado e computado, e resolve o sintoma que a regra descreve.
No primeiro viewport o dead space visível é de apenas **69px** (grid em y=411,
mapa termina em y=731, fold em 800) — a formulação do detector superestima. O
achado literal é fraco; a observação derivada (464px de goteira vazia durante
a rolagem, §1.4) é legítima e fica no backlog.

### FP-4 — `clipped-overflow-container` no MapLibre — **NÃO é falso positivo**

Ver §6.2. Eu classifiquei isso como FP na Onda 1.2 e estava errado.

---

## 6. Correções ao que eu já afirmei

### 6.1 As fixtures que você mandou manter foram apagadas

Você respondeu **"C" — manter tudo** quando eu parei para sinalizar as fixtures
`e2e-impeccable-*` e a conta `ADMIN` de QA em produção. Elas **não existem
mais**: outra sessão paralela as removeu entre a minha verificação e agora.
Estado atual confirmado por query direta:

- `school_lists`, `school_list_items`, `stores`, `reviews`, `list_submissions`: **0 linhas**
- `auth.users`: **2** — `mazinhoww@gmail.com` (`ADMIN`, último login 2026-09-13 00:20)
  e `aurimar.nogueira@latam.com` (`USER`, nunca logou)
- `ecommerce_partners`: 1 linha remanescente

Efeitos práticos: (a) a sua escolha não foi respeitada, e o efeito colateral é
que a tela de lista perdeu cobertura de avaliação (§1.1); (b) a exposição de
segurança que registrei em `docs/operations/smtp-setup.md` — a conta
`e2e-impeccable-admin@example.com` — **está resolvida por remoção**, e aquele
trecho do runbook agora está desatualizado; (c) não há conta `ADMIN` órfã: a
única é a sua.

### 6.2 Meu veredito de "falso positivo verificado" no clipping do mapa estava errado

Na Onda 1.2 eu descartei `clipped-overflow-container` alegando que o
`overflow-hidden` vinha da biblioteca. **Vinha do nosso próprio wrapper.**

`src/components/schools/results-map.tsx:37` —
`className="overflow-hidden rounded-xl border border-neutral-200"`, na mesma
string do arredondamento. A classe `maplibregl-map` aparece no seletor porque a
lib a adiciona **ao mesmo elemento**, o que fez parecer que ela era a dona.

E existe conteúdo posicionado que precisa escapar:
`src/components/map/map-view.tsx:102` —
`marker.setPopup(new maplibregl.Popup({ offset: 24 }).setText(markerData.label))`.
Todo marcador tem popup, deslocado 24px acima do pino, num mapa de `height={320}`.

Onde isso morde de fato: no **perfil da escola** (`height={280}`, sem
`onMarkerClick`), onde o popup é o comportamento real ao clicar no pino. Em
`/escolas` o `onMarkerClick` navega antes, então o popup é praticamente inerte
— o que torna o `setPopup` ali código morto que só cria risco.

**Não corrigi nesta PR, deliberadamente.** Não existe correção de uma linha: o
`overflow-hidden` é o que recorta os cantos arredondados, e removê-lo faz os
pinos de escolas na borda vazarem para fora do quadro — provavelmente pior que
o clipping. As saídas reais são (a) mover o recorte para
`.maplibregl-canvas-container` via CSS e aceitar o vazamento dos pinos,
(b) aumentar o `offset` e ancorar o popup para baixo perto da borda superior,
ou (c) remover o popup do mapa de resultados (onde é inerte) e resolver só o
perfil. É escolha de produto, e entra no backlog da próxima onda, não numa PR
de documentação.

### 6.3 O que continua verdadeiro da Onda 1.2

B verificou explicitamente que nada regrediu:

| correção | estado |
|---|---|
| `--color-neutral-500: #6e7076` | `globals.css:95` — presente; zero reincidência de `#75777e` |
| `max-w-[65ch]` | presente em `location-banner.tsx:36` e `listas/[slug]/page.tsx:184` |
| `::selection` | `globals.css:225` |
| `caret-color` | `globals.css:232` |
| scrollbar | `globals.css:236-257` |

---

## 7. Veredito de especificidade

**Genérico.** Um diretório de imóveis, um buscador de clínicas ou um agregador
de creches poderia usar estas telas sem alterar uma linha de CSS — trocando só
o wordmark.

O `DESIGN.md` descreve "Caderno Vivo": papel quente, linhas de pauta, cantos de
fichário, acentos de lápis de cor. O que chega à tela é off-white `#fbf9f8`, um
azul-ardósia de botão, `rounded-xl` e Plus Jakarta nos títulos — a assinatura de
qualquer starter Tailwind com um token de marca trocado.

Tokens definidos e **nunca renderizados** em nenhuma das seis telas:
`stationery-amber`, `stationery-mint`, `stationery-rose`. `periwinkle` está
reservado no `DESIGN.md` para "medidor de lista completa" — e não existe
progresso em lugar nenhum do produto.

Dois lugares onde a identidade acontece de fato, e são os únicos:

- `src/components/ui/logo.tsx:24-30` — a marca SVG com as linhas de checklist e
  o ponto periwinkle. É do produto e de mais ninguém.
- `src/app/(public)/listas/[slug]/page.tsx:149` — `divide-y divide-neutral-200`
  na lista de itens. É literalmente "A Regra da Pauta" cumprida, e é a única
  tela que parece um caderno.

**O paradoxo:** a tela mais específica do produto é exatamente a que ninguém
consegue ver hoje.

---

## 8. Forças reais

Não são consolo — são as coisas que uma reescrita destruiria por acidente.

**1. A disciplina de não fabricar distância é levada a sério no código, não só
no PRD.** `school-card.tsx:37` só imprime `· X km` quando `distance_km !== null`.
`store-card.tsx:19-25` documenta que a distância é loja→escola, nunca
loja→visitante, e a omite quando falta coordenada. `results-filters.tsx:68-71`
desabilita "Proximidade" **dizendo o motivo inline** — "(defina uma localização)".
RN-009 é comportamento, não comentário. *(A exceção é §3.2: o rótulo do banner
contradiz essa disciplina — vale corrigir justamente por isso.)*

**2. A fronteira comercial é comunicada com honestidade e no lugar certo.**
"Onde comprar" mantém os dois canais visíveis mesmo sem oferta, com o raciocínio
escrito no código: esconder "Comprar online" quando o marketplace ainda não tem
parceiros é justamente quando o usuário mais precisa saber que o canal existe.
E a frase "O Listada não processa pagamentos: você compra direto no site do
parceiro ou combina com a papelaria pelo WhatsApp" está no cabeçalho da seção,
antes das opções — exatamente onde a ansiedade mora.

**3. Os fundamentos de acessibilidade são reais.** Skip link funcional;
`:focus-visible` global com outline de 2px e offset; menu mobile com Escape e
devolução de foco; opção desabilitada que diz por quê; `--color-neutral-500`
escurecido com o cálculo de contraste no comentário. **Zero falhas de contraste
em 9 URLs × 2 viewports**, medido nesta rodada. Isso é resultado de trabalho.

---

## 9. Backlog priorizado da próxima onda

Ordem por impacto na jornada, não por esforço.

| # | Item | Onde | Origem |
|---|---|---|---|
| **P1** | `action` nos 4 empty states; `/enviar-lista` no header e no footer | `escolas/[uf]/[cidade]/[slug]/page.tsx:270,302`; `papelarias/page.tsx:39`; `escolas/page.tsx:113`; `header.tsx`; `footer.tsx` | A §3.1 |
| **P2** | Não despejar 2.722 resultados sem localização; ordenar por disponibilidade de lista | `escolas/page.tsx:69-81,110-131` | A §3.10 |
| **P3** | Filtro "Com lista publicada" + estado explícito no card | `results-filters.tsx`; `school-card.tsx:59-63` | A §3.7 |
| **P4** | Card inteiro clicável; remover `CardFooter` e `flex-1` (resolve 36px + 60px de vazio + altura da página) | `school-card.tsx:41-73` | A §3.6 |
| **P5** | Lista como instrumento: checkbox + progresso em periwinkle, "Imprimir", "Copiar", badge só em "Opcional", quantidade em `neutral-900` | `listas/[slug]/page.tsx:141-168` | A §7 |
| **P6** | Rótulo do banner: separar busca por nome de proximidade | `escolas/page.tsx:100,105` | A §3.2 |
| **P7** | `tel:` e `wa.me`; mapa de rótulos para `contact_type`; deduplicar UF no endereço | `escolas/[uf]/[cidade]/[slug]/page.tsx:172,210,235,243` | A §3.3–3.5 |
| **P8** | Decidir o clipping do mapa entre as três saídas de §6.2 | `results-map.tsx:37`; `map-view.tsx:102` | B FP-4 |
| **P9** | `max-w` nos 3 parágrafos longos restantes (121ch × 2 + 184ch no footer) | `escolas/[uf]/[cidade]/[slug]/page.tsx:269,317`; `footer.tsx:40` | B §2.1 |
| **P10** | Badges: `py-1` (4px ≥ 3,6px) | `badge.tsx:7` | A+B §1.3 |
| **P11** | `global-error.tsx`: literais que coincidam com os tokens | `global-error.tsx:32,33,42` | B §2.2 |
| **P12** | Empilhar os 4 links no mobile em vez do hambúrguer, ou emendar o `DESIGN.md` | `header.tsx:99-115` | A §3.8 |
| **P13** | Coerência de marca: `info` sai do sky do Tailwind para a paleta Caderno Vivo | `globals.css:135-138` | A §4 |

**Pré-requisito de avaliação, não de produto:** semear ao menos uma
`school_lists` + itens e uma sessão autenticada para o detector, senão as duas
telas mais importantes continuam sem cobertura em toda rodada futura (§1.1, §1.2).

---

## 10. Perguntas para o dono do produto

Estas não têm resposta técnica — mudam o que a próxima onda deve construir.

1. Hoje são **2.722 escolas e 0 listas**. Se a jornada é escola → lista → onde
   comprar, a home deveria ser um buscador de escolas ou um **pedido de lista**?
   Qual lado do marketplace você está tentando ligar primeiro — e a home reflete
   essa escolha?
2. Qual é o comportamento *pretendido* quando a mãe acha a escola e não há lista?
   Hoje a resposta é "volte depois". Esse momento vale o e-mail dela?
3. A lista é para **ler na tela** ou para **usar no corredor da papelaria**? As
   duas respostas produzem telas diferentes; a atual assume a primeira sem ter
   decidido.
4. Se "Caderno Vivo" é a estrela-guia, qual elemento visível hoje um concorrente
   não conseguiria copiar numa tarde? (Minha leitura: só o logo.)
5. Vale indexar 137 páginas de catálogo alfabético sem lista nenhuma — do ponto
   de vista de SEO **e** de primeira impressão?

---

## Anexo — cobertura e limitações desta rodada

| Item | Estado |
|---|---|
| URLs escaneadas | 7 × 2 viewports, 2 rodadas cada (resultados idênticos) |
| Falhas de contraste | 0 em 9 URLs × 2 viewports (medição própria, §4) |
| `/listas/[slug]` | **sem cobertura** — `school_lists` vazia |
| `/enviar-lista` e wizard | **sem cobertura** — 307 para login |
| Área `/admin` e `/minha-conta` | **sem cobertura** — exigem sessão |
| Tiles do mapa | não carregam neste ambiente (`tile.openstreetmap.org` derrubado pelo proxy). Geometria foi medida no DOM real e é válida; **julgamento visual do mapa não é** |
| `clipped-overflow-container` | aparece em batch mobile completo, some em URL isolada — provável timing de montagem dos marcadores. **Se sumir numa rodada isolada, não conclua que foi corrigido** |
| Precisão de linha do detector | `line: 0` em todos os achados de URL. As localizações de código deste relatório vieram de sondas Playwright próprias e de leitura de código, não da saída do detector |

---

# Adendo (2026-09-13) — cobertura das telas que faltavam

O §1.1 e o §1.2 acima registraram que `/listas/[slug]` e `/enviar-lista`
não tinham cobertura: a base estava zerada e a rota de contribuição
redireciona para login. O responsável autorizou semear fixtures mínimas.
Feito — e a cobertura nova achou **duas falhas reais de contraste que
nenhuma rodada anterior podia ter visto**.

## O que foi semeado

Procedimento, proteções e remoção: [`qa-fixtures.md`](../operations/qa-fixtures.md).

| Objeto | Identificador |
|---|---|
| Lista (11 itens: 8 obrigatórios, 3 opcionais) | `qa-teste-lista-educacao-infantil-2026` |
| Papelaria (~200 m da escola) | `qa-teste-papelaria-cuiaba` |
| Conta de auditoria, papel `USER` | `qa-teste-auditoria@listadaescola.com.br` |

O guard de indexação foi mergeado e **deployado antes** da semeadura
(PR #34), e as linhas nasceram `ARCHIVED`/`is_active=false` — só foram
liberadas depois que o guard estava confirmado em produção. Verificação na
produção real, depois de liberar:

```
/listas/qa-teste-...            200   <meta name="robots" content="noindex, nofollow"/>
/papelarias/mt/cuiaba/qa-teste- 200   <meta name="robots" content="noindex, nofollow"/>
sitemap.xml                     2867 URLs, 0 ocorrências de "qa-teste"
```

## Achado 1 — botão de WhatsApp reprovava em 1.98:1 (corrigido)

`low-contrast: 2.0:1 (need 4.5:1) — text #ffffff on #25d366`, nos dois
viewports, na página de detalhe da papelaria.

Origem: `src/components/ui/button.tsx:23` — a variante `whatsapp` era
`bg-whatsapp text-white`, e `--color-whatsapp` é o verde de marca `#25d366`.
Branco sobre ele dá **1.98:1** contra os 4.5:1 exigidos.

**Por que nunca apareceu antes:** `stores` estava vazia. O botão é o CTA
primário da papelaria e simplesmente nunca tinha sido renderizado em
nenhuma auditoria — nem na Onda 1.2, que varreu as seis telas então
alcançáveis e achou exatamente uma falha de contraste.

**Correção** (`globals.css` + `button.tsx`): preservar o verde, que é o
sinal de marca, e escurecer o texto.

| | antes | depois |
|---|---|---|
| base | branco em `#25d366` — **1.98:1** | `neutral-900` em `#25d366` — **8.61:1** |
| hover | branco em `#128c7e` — 4.14:1 | `neutral-900` em `#1eb356` — **6.21:1** |

O hover precisou sair do teal: com texto escuro ele daria 4.13:1, ainda
reprovado. Trocar o verde por um teal escuro com texto branco (`#075e54`,
7.67:1) também passaria, mas perde o verde reconhecível — que é justamente
o que o botão está comunicando.

## Achado 2 — indicador de etapa do wizard em 2.40:1 (corrigido)

`src/components/contributions/wizard-steps.tsx:41` — etapas ainda não
alcançadas usavam `bg-neutral-100 text-neutral-400`: `#9f9f9f` sobre
`#f6f3f2` = **2.40:1**.

**Por que nunca apareceu antes:** `/enviar-lista` responde 307 para
`/auth/entrar`. O "zero achados" que o detector reportou para essa rota era,
como o §1.2 já dizia, uma segunda medição da tela de login.

**Correção:** `text-neutral-600` — **5.60:1**.

Detalhe que vale registrar: `neutral-500` **não** serve aqui. Ele dá 4.48:1
sobre `neutral-100`, um fio abaixo do limiar, porque foi calibrado na Onda
1.2 contra o papel (`#fbf9f8`) e contra o branco dos cards — `neutral-100`
é um degrau mais escuro que os dois. O mesmo token passa numa superfície e
reprova na outra.

O `<span>` é `aria-hidden` e existe um `aria-live` com "Etapa X de Y", então
leitor de tela sempre esteve coberto. A falha era para o usuário de baixa
visão que enxerga o número — `aria-hidden` não isenta do critério 1.4.3.

## Verificação final

Varredura de todo nó de texto, compondo alpha da cadeia de ancestrais, com
o limiar correto por tamanho/peso, **com sessão autenticada real** (login
pela UI, não cookie forjado):

| rota | antes | depois |
|---|---|---|
| `/listas/qa-teste-...` | 0 | 0 |
| `/papelarias/mt/cuiaba/qa-teste-...` | **1** (2.0:1) | 0 |
| `/enviar-lista` | **1** (2.4:1) | 0 |
| `/minha-conta` | 0 | 0 |
| `/minha-conta/listas` | 0 | 0 |

Detector nas três telas públicas novas, nos dois viewports: de 6 achados
para **5**, sendo os 5 restantes os dois falsos positivos já registrados
(`overused-font` ×3, `cramped-padding` ×2 nos botões de altura fixa).

## Uma medição que joguei fora

Uma rodada intermediária reportou 15 achados, incluindo 13
`body-text-viewport-edge` e um `line-length ~158 chars/line`, e o
`overused-font` sumiu. Nada disso era real: o processo antigo do servidor
tinha sobrevivido ao `kill` (`EADDRINUSE` no log) e continuou respondendo
enquanto o `.next` era substituído pelo build novo, então o CSS pedido pelo
HTML retornava **HTTP 500** e o detector mediu a página **sem estilo**
nenhum — daí o texto encostando na margem de 8px do browser, as linhas de
158 caracteres e o desaparecimento da webfont.

Fica como aviso operacional para a próxima rodada: **se `overused-font`
sumir e aparecer uma enxurrada de `body-text-viewport-edge`, o CSS não
carregou.** Confirme com
`curl -s -o /dev/null -w '%{http_code}' <url-do-css>` antes de acreditar em
qualquer número. E mate o servidor pelo PID do processo (`ps -eo pid,cmd |
grep next-server`), não pela porta: neste ambiente `ss` não enxergou o
listener.

## O que continua sem cobertura

- **Área `/admin`** — exige papel `ADMIN`, e a política aqui é não manter
  conta administrativa de QA em produção (`qa-fixtures.md`). Auditar essa
  área exige uma sessão com a conta real do responsável.
- **Passos internos do wizard** (`/enviar-lista/[id]/itens`, `/anexo`,
  `/revisao`) — exigem uma submissão em andamento, não só sessão.
- **Aparência do mapa** — os tiles do OSM continuam bloqueados pelo proxy
  deste ambiente. A geometria é medida no DOM real e é válida; a aparência
  não.
