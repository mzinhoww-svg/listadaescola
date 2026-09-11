# Design System — Fundação (Prompt 01)

- **Status:** provisório. Não existe referência do Stitch nesta sessão
  (MCP `stitch` indisponível — ver `docs/implementation/stitch-mapping.md`).
  Tudo aqui deve ser conferido/ajustado contra o Stitch assim que o MCP
  estiver disponível, sem quebrar a API dos componentes se possível.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 (config CSS-first
via `@theme`, sem `tailwind.config.js`). Primitivas de acessibilidade via
Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-toast`); variantes via
`class-variance-authority`; ícones via `lucide-react`; `cn()` (clsx +
tailwind-merge) em `src/lib/utils.ts`.

## Tokens (`src/app/globals.css`)

Cores semânticas (`primary`, `neutral`, `success`, `warning`, `danger`,
`info`, `sponsored`) são aliases da paleta padrão do Tailwind (blue/slate/
emerald/amber/red/sky/amber respectivamente) — nunca usar `bg-blue-600`
direto em componentes de produto, sempre `bg-primary-600`. `whatsapp` é a
única cor de marca externa fixa, uso exclusivo no CTA de orçamento via
WhatsApp (Prompt 09) — nunca como cor de ação genérica.

Convenções (comentadas em `globals.css`): raio `rounded-lg` (controles) /
`rounded-xl` (cards) / `rounded-2xl` (sheets/modal); sombra `shadow-sm`
(repouso) / `shadow-md` (flutuante) / `shadow-lg` (overlay); touch target
mínimo 44px (`h-11`/`size-11`) em qualquer alvo interativo mobile. Dark
mode não foi implementado — fora do escopo pedido nesta etapa.

## Componentes (`src/components/ui/`)

| Componente | Base | Observação |
|---|---|---|
| `Button` | própria + `Slot` (asChild) | variantes primary/secondary/outline/ghost/danger; `loading` |
| `Input` | própria | label obrigatório, `helperText`/`errorText`, aria-describedby |
| `Select` | própria (`<select>` nativo) | label obrigatório; acessível por padrão, sem dependência extra (Prompt 06) |
| `Card` | própria | `CardHeader/Title/Description/Content/Footer` |
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
