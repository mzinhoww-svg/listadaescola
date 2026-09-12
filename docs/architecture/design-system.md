# Design System — "Caderno Vivo" (Prompt 01, tokens reais desde #26)

- **Status:** real, não mais provisório. Os tokens abaixo vêm do export
  oficial do Stitch (`caderno_vivo/DESIGN.md` + os `code.html` das 25
  telas), aplicados em `src/app/globals.css` pela PR #26 ("Design system
  real do Stitch"). Ver `docs/implementation/stitch-final-gap.md` §1 e
  `docs/implementation/stitch-matrix.md` para o histórico completo
  (divergência medida, depois fechada). Este arquivo descreve a API/
  convenção de uso dos tokens; `globals.css` é a fonte exata dos valores.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 (config CSS-first
via `@theme`, sem `tailwind.config.js`). Primitivas de acessibilidade via
Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-toast`); variantes via
`class-variance-authority`; ícones via `lucide-react`; `cn()` (clsx +
tailwind-merge) em `src/lib/utils.ts`.

## Tokens (`src/app/globals.css`)

Cores semânticas (`primary`, `secondary`, `neutral`, `success`, `warning`,
`danger`, `info`, `sponsored`) — nunca usar uma cor crua do Tailwind
(`bg-blue-600`, `bg-slate-200`) direto em componente de produto, sempre o
alias semântico (`bg-primary-600`). As escalas numeradas (`-50`..`-900`)
são as mesmas de antes — só os valores mudaram — então nenhum componente
precisou ser reescrito para a identidade real chegar ao app inteiro.

- **`primary`** — azul-ardósia suave ("soft slate-navy"): `600 = #5c6b8a`
  (botão primário), `700 = #4d5a75` (hover), `800 = #445371`. Ação/marca
  principal.
- **`secondary`** — periwinkle (`300 = #96aaff`): acento interativo —
  badges, indicador de progresso (ex.: checklist do wizard de
  contribuição), realces e glow de foco de input. Escala nova, não existia
  nos tokens provisórios.
- **`neutral`** — superfícies e texto sobre papel, não cinza puro de SaaS:
  `50 = #fbf9f8` (canvas quente), `200 = #e7e9ef` ("paper-crease border",
  usada em todo card/header), `800 = #3a3a3a` (texto principal),
  `900 = #1b1c1c`.
- **`paper` / `surface-soft` / `border-subtle`** — superfícies nomeadas:
  `paper` (`#ffffff`) para cards sobre o canvas quente; `surface-soft`
  (`#ebefff`, o mesmo tom de `primary-50`) para banners/agrupamentos de
  busca; `border-subtle` = `neutral-200`.
- **`stationery-{amber,mint,rose}`** — acentos de papelaria (DESIGN.md
  "Named Accents"): preenchimento de badge para disponibilidade/item
  verificado/economia — nunca cor de texto corrido.
- **`danger`** usa os valores exatos do DESIGN.md (`#ba1a1a` / `#ffdad6` /
  `#93000a`), não o vermelho padrão do Tailwind.
- **`whatsapp`** continua a única cor de marca externa fixa, uso exclusivo
  no CTA de orçamento via WhatsApp (Prompt 09) — nunca como cor de ação
  genérica.

Tipografia: **Plus Jakarta Sans** (`--font-display`, tracking `-0.02em`)
em todos os headings (`h1`–`h6`, ver regra global em `globals.css`);
**Inter** (`--font-sans`) no corpo e em dados densos — substituem Geist,
usado só na fase provisória. Carregadas via `next/font/google` em
`src/app/layout.tsx` (`jakarta`/`inter`/`geistMono`, este último mantido
só para `--font-mono`).

Convenções (comentadas em `globals.css`): raio `rounded-lg` (controles,
0.5rem) / `rounded-xl` (cards, 1rem) / `rounded-2xl` (sheets/modal,
1.5rem); sombra `shadow-sm`/`shadow-md`/`shadow-lg` — agora difusas e de
baixo contraste ("physical sheet-of-paper layering" do DESIGN.md), nunca
drop shadows duras; touch target mínimo 44px (`h-11`/`size-11`) em
qualquer alvo interativo mobile. Dark mode não foi implementado — fora do
escopo pedido nesta etapa.

## Componentes (`src/components/ui/`)

| Componente | Base | Observação |
|---|---|---|
| `Button` | própria + `Slot` (asChild) | variantes primary/secondary/outline/ghost/danger; `loading` |
| `Input` | própria | label obrigatório, `helperText`/`errorText`, aria-describedby |
| `Select` | própria (`<select>` nativo) | label obrigatório; acessível por padrão, sem dependência extra (Prompt 06) |
| `Card` | própria | `CardHeader/Title/Description/Content/Footer`; `CardTitle` aceita `as` (`h1`–`h4`, default `h3`) para hierarquia de heading correta por contexto (Prompt 18) |
| `Badge` | própria | variantes por estado (`success`/`warning`/... /`sponsored`) |
| `Modal` | Radix Dialog | diálogo central, foco preso, Escape/overlay fecham |
| `Drawer` | Radix Dialog | painel lateral — mesma base do Modal, posição diferente |
| `BottomSheet` | Radix Dialog | painel inferior mobile — mesma base do Modal |
| `Table` | própria | wrapper `overflow-x-auto`, `TableCaption` (sr-only por padrão) |
| `Toast` + `useToast` | Radix Toast | store a nível de módulo — `toast()` funciona fora de componentes |
| `EmptyState` | própria | ícone + título + descrição + ação opcional |
| `LoadingState` + `Skeleton` | própria | spinner com `role="status"`; skeleton para layout conhecido |
| `Header` | própria | logo + nav + menu mobile acessível (aria-expanded/controls) |
| `Footer` | própria | colunas de links + copyright |

`Modal`/`Drawer`/`BottomSheet` compartilham a mesma plumbing acessível via
`src/components/ui/dialog-primitives.tsx` (Radix Dialog) — só mudam
posicionamento/CSS do `Content`.

## Áreas / route groups (`src/app/`)

`(public)`, `(auth)/auth`, `(account)/minha-conta`,
`(contribution)/enviar-lista`, `(admin)/admin` — cada uma com seu próprio
`layout.tsx` (shell/nav própria), todas sob um único root layout
(`src/app/layout.tsx`, com `lang="pt-BR"`, skip-link e `Toaster` montado).
Cada página placeholder criada nesta etapa está marcada com
`<ScaffoldNotice promptRef="..." />` apontando para o prompt que a
implementa de verdade — remover o notice junto com o placeholder.

## Vitrine

`/dev/style-guide` (fora dos route groups de produto, `robots: noindex`)
mostra todos os 13 componentes e suas variantes/estados, incluindo
interações de Modal/Drawer/BottomSheet/Toast. Use-a para conferência visual
rápida sem precisar navegar o produto.

## Acessibilidade aplicada

Foco visível consistente (`:focus-visible` global + utilitário em cada
componente interativo); todo overlay (Modal/Drawer/BottomSheet) tem foco
preso e fecha com Escape (via Radix); todo Input tem `label` associado e
erro anunciado via `role="alert"`; menu mobile do Header/Admin usa
`aria-expanded`/`aria-controls`; touch targets ≥44px. Verificado
manualmente em Chromium headless (desktop 1280px e mobile 375px, 6 rotas)
sem erros de console — não substitui um audit de acessibilidade formal
(Prompt 18).
