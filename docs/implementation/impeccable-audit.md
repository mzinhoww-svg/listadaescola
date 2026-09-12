# Auditoria impeccable — telas MVP

`/impeccable audit` sobre as telas MVP, executado em 2026-09-12 com a skill
impeccable 4.3.1 (`.claude/skills/impeccable/`).

## Como foi medido

O detector da skill escaneia **páginas renderizadas**, não só código. O scan
estático (`detect src/app src/components`) retornou **0 achados** — limpo, mas
cego para o que só existe depois do CSS aplicado. O que encontrou problema foi
o scan de URL.

Produção não pôde ser escaneada: o Chromium do ambiente não atravessa o proxy
de saída (`ERR_CONNECTION_RESET`). A app foi então construída e servida
localmente (`npm run build && npm start`) apontando para o **mesmo Supabase de
produção** — mesmo código, mesmos dados, sem proxy.

6 telas, 2 viewports numa rodada batched, como o playbook exige:
`/`, `/escolas`, perfil de escola, detalhe de lista, `/papelarias`,
`/auth/entrar` — em 1280x800 e 390x844.

## Resultado

| | Antes | Depois |
|---|---:|---:|
| Desktop (1280x800) | 24 | **9** |
| Mobile (390x844) | 22 | **9** |
| **Total** | **46** | **18** |

| Achado | Antes | Depois | Situação |
|---|---:|---:|---|
| Low contrast text | 13 | **0** | corrigido |
| Line length too long | 2 | **0** | corrigido |
| Overused font | 5 | 5 | falso positivo (ver abaixo) |
| Cramped padding | 3 | 3 | aberto, P3 |
| One column stretches first viewport | 1 | 1 | falso positivo verificado |
| Positioned child clipped | 1 | 1 | falso positivo (mapa) |

## Correções aplicadas

### 1. Contraste WCAG AA — `--color-neutral-500` (P1, sistêmico)

**Regressão minha.** Ao aplicar a paleta Caderno Vivo eu defini
`--color-neutral-500: #75777e`. Contra os dois fundos do produto:

| Fundo | Contraste | AA exige |
|---|---:|---:|
| `#ffffff` (cards) | 4.47:1 | 4.5:1 |
| `#fbf9f8` (papel) | 4.26:1 | 4.5:1 |

Falhava nos dois, por pouco. E este token é o **mais usado do projeto depois
do 900: 87 ocorrências**, o que fez o problema aparecer em todas as telas
medidas. O Prompt 18 havia corrigido contraste contra a paleta *anterior*; a
troca de tokens o reintroduziu.

Corrigido para `#6e7076`, escurecendo 3% de luminosidade e preservando o
matiz: **4.95:1 no branco, 4.72:1 no papel**. A correção é no token, não nas
87 chamadas.

**`--color-neutral-400` (#9f9f9f, 2.65:1) NÃO foi alterado.** O detector não o
sinalizou, e a verificação confirmou por quê: as 18 ocorrências são todas
ícones `aria-hidden`, estados `disabled` ou passos inativos do wizard —
nenhum texto real. Alterá-lo seria escurecer decoração sem ganho de
acessibilidade.

### 2. Medida de leitura (P2)

Duas linhas passavam de 100 caracteres; o craft floor pede 65–75ch.

- `/escolas` — ~153 chars/linha, no parágrafo do `LocationBanner`
- detalhe da lista — ~103 chars/linha, no parágrafo de "Onde comprar"

Ambos receberam `max-w-[65ch]`.

### 3. Superfícies do navegador (craft floor)

Seleção de texto, caret e barra de rolagem vinham com o default do navegador —
um azul de sistema que não pertence a nenhum design system. Agora puxam da
paleta: seleção em periwinkle (`--color-secondary-300`, o mesmo acento do ponto
da marca) com texto em `neutral-900`, caret em `primary-600`, rolagem fina em
`neutral-300`.

O craft floor chama isto de "the cheapest signal that a page was built rather
than assembled, and the one models skip most reliably".

## Falsos positivos verificados

**Overused font (5x).** O detector sinaliza Inter como saturada demais para
ser distintiva. Mas a fonte é **decisão do brief**: o design system Caderno
Vivo do export oficial do Stitch especifica Inter (corpo) + Plus Jakarta Sans
(display). A própria skill resolve o conflito: *"The brief wins. Honor pinned
aesthetics, eras, materials, fonts, and palettes even when they conflict with
a saturated-pattern warning. Redirecting a clear brief toward your taste is
failure."* Não alterado, e não deve ser sem decisão de marca.

**One column stretches the first viewport (1x).** O detector mede alturas
brutas e acusa a coluna de resultados de `/escolas` correndo 320% da viewport
contra um irmão de 40%. Mas a coluna do mapa **já tem** `lg:sticky lg:top-4
lg:h-fit` — ela acompanha a rolagem e não fica em espaço morto, que é
exatamente o dano que a regra descreve. `position: sticky` não é considerado
na medição.

**Positioned child clipped (1x, mobile).** O container do MapLibre tem
`overflow-hidden` e um filho posicionado. É o comportamento correto de um
mapa: os controles são posicionados **dentro** da moldura de propósito.

## Aberto

**Cramped padding (3x, P3).** Containers com 0px de padding vertical em `/`,
`/escolas` e no detalhe da lista. Não perseguido nesta rodada — o playbook
limita a uma rodada de confirmação e manda parar de polir. Candidato a
`/impeccable layout`.

## Validação

| Verificação | Resultado |
|---|---|
| `npm run lint` | 0 erros (94 warnings pré-existentes) |
| `npm run typecheck` | limpo |
| `npm run build` | compilado, 38 páginas |
| Detector, 2 viewports | 46 -> 18 achados |
| Overflow horizontal @390px | **0 de 12 rotas** |
| Overflow horizontal @1280px (telas com mapa) | 0 de 2 |

### E2E: não executado, deliberadamente

A suíte (`e2e/*.spec.ts`, 16 testes) depende do seed `e2e-p17-*`, e a
verificação confirmou **0 registros** dele no banco. Rodá-la exigiria semear
**produção** com usuários, lista, papelaria e parceiro fictícios.

Produção já carrega um conjunto de fixtures `e2e-impeccable-*` criado por
outra sessão, e o responsável optou por mantê-lo. Adicionar uma segunda
camada de dado de teste ao banco público seria agravar isso. As mudanças desta
rodada são de CSS e de uma classe utilitária em dois parágrafos — não tocam
seletor, texto nem comportamento que os specs asseguram.

Para rodar o E2E com segurança é preciso um projeto Supabase separado para
testes, ou executar seed e cleanup na mesma janela (`supabase/tests/e2e-seed.sql`
e `e2e-cleanup.sql`).

## Próximos comandos sugeridos

1. **[P3] `/impeccable layout`** — os 3 casos de padding vertical zerado.
2. **[P2] `/impeccable critique`** — esta rodada foi `audit` (técnico,
   mensurável). O `critique` faz a revisão de UX com pontuação heurística, que
   é o outro eixo e ainda não foi feito.
3. **[P2] `/impeccable document`** — gerar o `DESIGN.md`, hoje ausente. O
   carregador de contexto classificou isso como lacuna de documentação
   (`EXISTING_VISUAL_SYSTEM`), não como projeto sem design system.
