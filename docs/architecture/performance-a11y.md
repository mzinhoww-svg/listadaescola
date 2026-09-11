# Performance + acessibilidade (Prompt 18)

Auditoria em duas frentes (Core Web Vitals/dados/queries e teclado/labels/
contraste/mapa) feita por 5 agentes de pesquisa paralelos, cada um cobrindo
uma fatia sem sobreposição; achados sintetizados e corrigidos aqui. Só
achados verificados por leitura real de código (com file:line) viraram
correção — nada especulativo.

## Corrigido

### Performance

- **Índices faltando para `search_schools()`** — `favorites` só tinha
  índice em `(profile_id, target_type, target_id)` (profile_id como
  coluna líder não serve a query `where target_type = ... group by
  target_id` das CTEs `favs`/`lists`); `school_lists` não tinha índice em
  `status`. Ambos escaneados por completo em toda busca e todo load da
  home (`getFeaturedSchools` → `search_schools`). Migração
  `20260911210000_performance_audit_fixes.sql` adiciona
  `favorites_target_idx (target_type, target_id)` e
  `school_lists_status_idx (status)`.
- **Raio de proximidade nunca era limitado** — `search_schools()`/
  `nearby_schools()`/`nearby_stores()` já clampavam `p_limit`/`p_offset`
  (Prompt 16), mas nunca `p_radius_km`: com `p_radius_km` nulo, a
  cláusula `(v_point is null or p_radius_km is null or ... ST_DWithin(...))`
  colapsa para sempre-verdadeiro — uma busca geolocalizada sem raio
  explícito (o caso real de `/escolas` hoje, que nunca passa `radiusKm`)
  ordenava por distância **todas** as escolas ativas do estado antes de
  paginar. Violava literalmente o PRD §13 ("limitadas por raio **e**
  quantidade"). Mesma migração acima adiciona default+clamp
  (`greatest(1, least(coalesce(p_radius_km, default), max))` — 100/300km
  para escolas, 20/100km para papelarias, este último só fechando a
  mesma lacuna para chamada direta via RPC já que `getNearbyStores()` já
  usava `radiusKm=20` como default na app). Verificado ao vivo via SQL:
  contagem total sem geo = 2722; com geo e sem raio explícito, antes da
  correção seria igual (2722); depois, 1645; com raio absurdo (1000km),
  clampado a 300km → 2149. Todos < 2722, confirmando o filtro real.
- **Paginação ausente em 10 funções de listagem do admin** —
  `getAdminLists`, `getAdminStores`, `getAdminProducts`,
  `getAdminEcommerceProducts`, `getAdminEcommercePartners`,
  `getStoreSaleReports`, `getPartnerSaleReports`, `getAdminCampaigns`,
  `getModerationQueue`, `getSchoolSuggestionQueue` — nenhuma tinha
  `.range()`/`.limit()`; full table/embed scan que cresce sem limite.
  `getAdminSchools` já fazia isso certo (`.range()` + `count: "exact"` +
  paginação real na UI) — usado como referência. Aplicado um cap
  `.range(0, MAX_ROWS - 1)` (200, exceto parceiros e o público
  `getActiveStores` com 500) em cada função: fecha o risco de scan
  ilimitado agora; paginação real com navegação (como `getAdminSchools`)
  é o follow-up natural quando alguma dessas telas realmente precisar —
  ver "Adiado" abaixo para o porquê de não ter sido feito nesta mesma
  passada.
- **N chamadas de signed URL em vez de 1 batched** —
  `getSubmissionModerationDetail` (moderação) fazia um
  `storage.createSignedUrl()` por anexo em paralelo; trocado por um único
  `storage.createSignedUrls()` (plural), casado de volta por `path`.
- **`next.config.ts` sem `images.remotePatterns`** — nenhum uso real de
  `next/image` existe ainda (a URL pública do Storage só aparece em
  JSON-LD/OpenGraph hoje), mas a primeira vez que uma foto/logo for
  renderizada via `next/image`, o host do Supabase Storage seria
  rejeitado sem essa config. Adicionado por antecedência
  (`*.supabase.co` com wildcard, sem ler env var, para funcionar igual em
  qualquer projeto Supabase).
- **Botões abaixo do alvo de toque de 44px** — CTA principal
  "Pedir orçamento no WhatsApp" (`store-card.tsx`) e "Trocar localização"
  (`location-banner.tsx`) usavam `size="sm"` (36px); ambos voltaram ao
  `md` (44px) default.

### Acessibilidade

- **6 páginas sem `<h1>` nenhum** — as 5 páginas de auth (entrar, criar
  conta, recuperar senha, redefinir senha, verificar e-mail) e
  `/sugerir-escola` só tinham `CardTitle` (sempre `<h3>` hardcoded);
  `/enviar-lista` não tinha heading nenhum. `CardTitle` ganhou uma prop
  `as` (`h1`/`h2`/`h3`/`h4`, default `h3`) e os 6 pontos de entrada
  passaram a usar o nível correto.
- **9 páginas com salto h1→h3** (sem h2 no meio) — `/minha-conta`,
  `/admin`, `/admin/analytics`, e os 4 admin detail pages (moderação,
  listas, escolas, sugestões) iam direto de h1 para `CardTitle` h3;
  `/escolas` e `/escolas/[uf]/[cidade]` iam de h1 para a grade de
  `SchoolCard` (h3 via `CardTitle`). Dois padrões de correção conforme o
  caso: onde cada Card é uma seção de conteúdo real e distinta (páginas
  de detalhe admin), a própria `CardTitle` virou `as="h2"`; onde são
  várias tiles pequenas do mesmo tipo (grades de KPI/resultado), um h2
  (visível ou `sr-only`) foi inserido uma vez antes da grade, mantendo os
  cards como h3 (hierarquia correta sem "spam" de headings).
- **Contraste abaixo de AA** — `text-neutral-400` (~2.6:1, falha clara)
  usado como texto real (não decorativo) em 4 pontos (contagem de
  município, prefixo de tipo de contato x2, placeholder de input, estado
  "encerrada" de campanha); `text-neutral-500` (~4.7:1, na linha do
  limite) era o default de texto secundário em `CardDescription`,
  helper-text de `Input` e descrição de `EmptyState` — usado em dezenas
  de lugares por herança. Instâncias reais de texto (não ícones
  decorativos `aria-hidden`, não texto de controle desabilitado, ambos
  fora do escopo do 1.4.3) escurecidas para `neutral-600`.
- **Mensagens de erro não associadas ao campo** — `Input` já suporta
  `errorText` (liga `aria-describedby`/`aria-invalid`/`role="alert"` no
  campo certo), mas quase nenhum formulário real usava — todos rendiam
  um `<p role="alert">` genérico solto. `FormState` ganhou
  `fieldErrors?: Record<string, string>` e os 5 formulários de auth
  (login mantido genérico de propósito — ver nota de segurança abaixo;
  signup, redefinição de senha, recuperação de senha, reenvio de
  verificação) passaram a devolver e consumir erros por campo. Formulários
  do admin/wizard de contribuição ficaram de fora desta passada — ver
  "Adiado".
- **Skip link duplicado no admin** — `admin-shell.tsx` renderizava um
  segundo link "Pular para o conteúdo principal" idêntico ao do layout
  raiz (`src/app/layout.tsx`), que já cobre toda página incluindo as do
  admin. Removido o duplicado.
- **`SchoolPicker` sem anúncio de resultado** — busca de escola no
  wizard de contribuição não tinha `aria-live`; um usuário de leitor de
  tela que clica "Buscar" não sabia que resultados apareceram. Adicionado
  um anunciador `role="status" aria-live="polite"` visualmente oculto.
- **Menu mobile não devolvia foco** — fechar o menu do `Header` (Escape
  ou clicar num link) nunca devolvia foco ao botão que abriu — o foco
  cai onde o navegador decidir quando o elemento focado vira `hidden`
  (geralmente `<body>`), um usuário de teclado perde a referência.
  Corrigido com uma ref no botão de toggle + foco explícito ao fechar
  (Escape só refoca se o menu de fato estava aberto, para não roubar
  foco de um Escape não relacionado em outro lugar da página).

### Mapa / mobile

Auditoria confirmou que a regra "mapa nunca é o único mecanismo de
seleção/localização" já é respeitada em todos os fluxos existentes (busca
por texto/CEP, geolocalização e navegação por cidade sempre coexistem com
o mapa; erro de carregamento do mapa cai num `EmptyState` com "a busca
continua funcionando normalmente", nunca bloqueia o resultado) — nenhuma
correção necessária aqui, achado apenas confirmado.

## Adiado (decisão consciente, não esquecido)

- **Paginação real (com navegação) nas 10 telas de admin acima** — o cap
  `.range()` fecha o risco real (scan ilimitado), mas não dá UI de
  "próxima página". Construir isso para 10 telas nesta mesma passada
  (cada uma com filtros/layout próprios) tinha custo desproporcional ao
  resto do escopo deste prompt; o padrão de referência já existe
  (`getAdminSchools` + `admin/escolas/page.tsx`) para quando alguma
  destas realmente precisar.
- **`errorText` por campo nos formulários de admin/wizard** — o mecanismo
  (`Input.errorText`) já existe e está provado nos formulários de auth;
  estender para os formulários de CRUD do admin e do wizard de
  contribuição (`item-form.tsx` etc.) tocaria muitos `Server Action`s com
  formatos de erro próprios, cada um merecendo o mesmo cuidado que os de
  auth tiveram aqui.
- **ISR na página pública de papelaria** (`papelarias/[uf]/[cidade]/[slug]`)
  — tentado e **revertido** depois de verificação ao vivo. `export const
  revalidate` no modelo de cache "anterior" do Next.js 16 (sem a flag
  `cacheComponents`, que este projeto não usa) só afeta requisições via
  `fetch()` -- confirmado via `edge_logs` do Supabase que a query REST
  dentro de `getStoreBySlug()` continuava rodando a cada request mesmo
  com `revalidate = 3600` setado, ou seja, a mudança não fazia nada de
  verdade. O mecanismo correto é `unstable_cache()` envolvendo
  `getStoreBySlug()` com `tags`, mais um `revalidateTag()` adicionado em
  `upsertStoreAction` (`admin/store-actions.ts`) para a edição de um
  admin não ficar "presa" em cache por até 1h na página pública — trabalho
  real, com risco real de acerto na invalidação, não uma troca de uma
  linha. Ver `papelarias/[uf]/[cidade]/[slug]/page.tsx` para o comentário
  completo desta investigação.
- **SaveButton força renderização dinâmica em `escolas/.../[slug]` e
  `listas/[slug]`** — a chamada a `getCurrentUser()`/`isFavorited()` para
  o estado inicial do botão de favoritar arrasta a página inteira para
  fora de qualquer cache. Mesma classe de problema do item acima (exige
  reestruturar para isolar só esse pedaço como dinâmico, ex. Suspense) —
  não tentado nesta passada dado o aprendizado do item anterior sobre o
  quão fácil é uma correção de cache parecer certa e não fazer nada.

## Achados confirmados sem ação (compliant)

- MapLibre já é lazy-loaded (`next/dynamic`, `ssr:false`) e nunca entra
  no bundle de página sem mapa; CSS do maplibre-gl é bundlado, não CDN.
- Fontes via `next/font/google` (self-hosted, sem request bloqueante).
- Zero scripts/stylesheets de terceiros bloqueantes; único `<script>` é
  JSON-LD inline.
- Diálogos/drawers/sheets são 100% Radix (`@radix-ui/react-dialog`) —
  focus-trap/Escape/auto-focus corretos por padrão, nenhum overlay feito
  à mão encontrado.
- Foco visível nunca suprimido (`outline-none` sem substituto: zero
  ocorrências) — todo primitivo tem seu próprio anel de foco.
- Labels de formulário, `alt` de imagem, ícones decorativos
  (`aria-hidden`), landmarks semânticos e `lang="pt-BR"` já estavam
  corretos em toda a base antes desta auditoria.

## Metodologia

5 agentes de pesquisa paralelos, cada um limitado a uma fatia sem
sobreposição: (1) performance de renderização/bundle/imagens, (2)
performance de camada de dados/N+1/índices, (3) estrutura semântica
(headings/labels/alt), (4) teclado/foco/widgets/contraste/erros, (5)
mapa-nunca-único-mecanismo + mobile. Cada achado citado aqui foi
re-verificado por leitura direta do código (ou consulta SQL ao vivo, no
caso dos índices/raio) antes de virar correção — nenhum achado de agente
foi aplicado sem essa checagem.
