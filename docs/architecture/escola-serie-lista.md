# Listada Escola — Perfil da escola, série/ano e lista (Prompt 07)

Substitui os placeholders de `/escolas/[uf]/[cidade]/[slug]` e
`/listas/[slug]` criados no Prompt 06 pela implementação real (PRD
RF-004 a RF-006, RF-013, wireframes A.4 a A.6). Consulta sem login (PRD
princípio 1); "salvar" exige login (princípio 2).

## Stitch

MCP `stitch` continua indisponível nesta sessão (verificado via
`ToolSearch` antes de implementar). Mesma ressalva de
`design-system.md`/`mapas-localizacao.md`/`home-busca-resultados.md`:
conferir contra o Stitch assim que o MCP estiver disponível.

## Etapa, série e ano letivo são conceitos distintos

A instrução do prompt ("manter etapa, série e ano letivo como conceitos
distintos") já está refletida no modelo de dados desde o Prompt 02 — este
prompt só implementa a UI que respeita essa separação:

- **Etapa** (`school_education_levels`): dado INEP normalizado (backfill
  do Prompt 06). Sempre real quando a escola tem `education_offerings`.
- **Série** (`school_series`): estrutural — quais séries a escola oferece,
  independente de ano letivo. Escrita só por School Manager/admin (RLS
  `school_series_manager_write`); nenhuma automação popula isso ainda —
  hoje está em 0 linhas globalmente, e continuará assim até existir uma UI
  de manager (fora do escopo deste prompt).
- **Ano letivo + lista** (`school_lists.school_year`): uma lista só existe
  para um ano letivo específico. `school_lists` é independente de
  `school_series` no schema (ver `docs/product/PRD.md` seção 10 — são
  filhos irmãos de `schools`, não pai/filho entre si).

Consequência prática: uma série pode estar cadastrada em `school_series`
sem nenhuma lista publicada ainda (mostrado como "Ainda sem lista
publicada para esta série" — nunca omitido, nunca fabricado), e uma lista
pode existir em `school_lists` para uma série que ainda não foi
formalmente cadastrada em `school_series` (a série aparece mesmo assim,
descoberta a partir da própria lista). `groupEtapasSeriesListas()`
(`src/lib/schools/school-profile.ts`) faz a união dos dois conjuntos por
etapa → série, nunca depende de só um dos dois.

## Perfil da escola (`/escolas/[uf]/[cidade]/[slug]`)

Uma única query (`getSchoolBySlug`) traz `schools` + `school_profiles` +
`school_contacts` + `school_images` + `school_education_levels` +
`school_series` via embedding do PostgREST (FKs já existentes) — não há
N+1 entre essas seis tabelas. Uma segunda query traz `school_lists`
(`getSchoolLists`). RLS já filtra cada tabela embutida para sua regra
pública (escola ativa, contato público, imagem aprovada) — os filtros
explícitos no código (`is_active`, `status = 'APPROVED'`) documentam a
intenção, não substituem RLS.

Seções, todas condicionalmente renderizadas (nunca fabricadas quando
vazias, mesmo princípio de `home-busca-resultados.md` para
destaques/listas recentes):

- Cabeçalho: nome, badges (pública/privada sempre; verificada/patrocinada
  só se `school_profiles` existir e tiver a flag true — hoje sempre
  ausente/false numa escola real, nunca inventado).
- Mapa (`Map` do Prompt 05) — só se `latitude`/`longitude` existirem;
  componente não crítico, como documentado em `mapas-localizacao.md`.
- Sobre — só se `school_profiles.description` existir.
- Contato — telefone/endereço (INEP) + website/instagram/whatsapp
  (`school_profiles`) + linhas extras de `school_contacts`; mensagem
  honesta "Nenhum contato público informado ainda" quando não há nada.
- Etapas de ensino — sempre que `school_education_levels` tiver linhas.
- Séries e listas escolares — a seleção de série/ano do PRD (wireframe
  A.5), ver seção acima. `EmptyState` só quando não há etapa alguma.
- Fotos — grid simples (`<img>`, não `next/image`: `public-assets` é um
  host dinâmico do Supabase Storage e o projeto não tem
  `images.remotePatterns` configurado; revisitar se a galeria crescer o
  suficiente para justificar otimização) — só se `school_images` tiver
  linhas aprovadas.

SEO: `generateMetadata` (title/description/canonical/OpenGraph) e um
`School` JSON-LD (schema.org) com endereço e coordenadas quando existirem.
`getSchoolBySlug`/`getListBySlug` usam `React.cache()` para que
`generateMetadata` e a página não dupliquem a consulta ao Supabase.

**Canonicalização de URL:** `schools.slug` é globalmente único (não
`(uf, cidade, slug)`); os segmentos `uf`/`cidade` na URL existem só por
legibilidade/SEO. A página resolve por `slug` e, se `uf`/`cidade` não
baterem com os valores reais da escola, faz `redirect()` para a URL
canônica (`schoolHref()`) em vez de servir a mesma escola em duas URLs
diferentes.

## Lista escolar (`/listas/[slug]`)

Duas queries, sem N+1: `school_lists` (join `schools!inner` para
breadcrumb) por slug, depois `school_list_versions` (join
`school_list_items` embutido) filtrado por `school_list_id` +
`status = 'PUBLISHED'`, ordenado por `version_number desc`, `limit(1)`.

**Por que `order by version_number desc` e não só `status = 'PUBLISHED'`
com `limit(1)`:** `approve_submission()` (Prompt 02,
`moderation_functions.sql`) nunca arquiva a versão anterior ao publicar
uma nova — cada aprovação só insere uma versão nova com
`version_number` maior, sempre `status = 'PUBLISHED'` por default. Ou
seja, é possível (e no fluxo de moderação normal, esperado ao longo do
tempo) existir mais de uma linha `PUBLISHED` para a mesma lista. RN-007
exige que a versão antiga não seja apagada — mas "a versão pública atual"
para exibição é sempre a de maior `version_number`. Verificado
manualmente: uma lista semeada com v1 (3 itens, `PUBLISHED`) e v2 (5
itens, `PUBLISHED`, mais recente) mostra corretamente os 5 itens de v2,
nunca uma mistura. Isso é uma característica preexistente de
`approve_submission()` (Prompt 02/09), não alterada aqui — só consumida
corretamente.

A lista só é pública quando **ambas** as condições valem:
`school_lists.status = 'APPROVED'` (RLS `school_lists_select_approved`)
e existe uma `school_list_versions` com `status = 'PUBLISHED'` (RLS
`school_list_versions_select_published`). Falta qualquer uma →
`getListBySlug` retorna `null` → `notFound()` (nunca uma página "lista
existe mas está vazia").

Itens renderizados como lista de cartões (não `Table`): mobile-first,
evita o `overflow-x-auto` que uma tabela densa exigiria em telas
estreitas. Cada item mostra quantidade (só quando > 1), unidade, marca,
badge obrigatório/opcional e observação — todos condicionais, sem
fabricar texto quando o campo é nulo.

## Salvar (favoritos, PRD RF-013)

`favorites` (Prompt 02) não tinha nenhuma UI até este prompt.
`toggleFavoriteAction` (`src/lib/favorites/actions.ts`, Server Action) é o
único caminho de escrita: reconfirma `auth.uid()` no servidor (nunca
confia no `isAuthenticated` que a página já calculou por SSR) e retorna
`{error: "not_authenticated"}` de forma limpa em vez de deixar a RLS
rejeitar sem contexto — a RLS (`favorites_insert_own`/`select_own`/
`delete_own`, todas `profile_id = auth.uid()`) continua sendo a barreira
real (SEC-002/SEC-003).

`<SaveButton>` (`src/components/favorites/save-button.tsx`) é compartilhado
entre escola (`target_type='SCHOOL'`) e lista (`target_type='LIST'`) — o
enum `favorite_target_type` já cobria os dois desde o Prompt 02. Visitante
anônimo nunca vê um botão que falha silenciosamente: recebe um link real
para `/auth/entrar?next=<url atual>`, que devolve exatamente a esta página
após login (padrão já usado em `requireUser`/login pages do Prompt 03).
`favorite_added` é registrado só quando a linha é efetivamente criada (não
a cada toggle).

Testado ao vivo (usuário de teste real via `signInWithPassword`, mesmo
padrão de seed de `WORKFLOW.md`): favoritar escola, recarregar a página
(confirma leitura real do banco via `isFavorited`, não só estado do
cliente), desfavoritar, e o mesmo ciclo completo para lista — os quatro
passos persistem corretamente entre reloads.

## Compartilhar (lista)

`<ShareButton>` (`src/components/lists/share-button.tsx`): Web Share API
nativa quando disponível (mobile), `navigator.clipboard.writeText` como
fallback (desktop) com toast de confirmação. `list_share` é registrado na
intenção do toque, não na conclusão — a share sheet nativa não dá sinal
confiável de "o usuário realmente enviou", e mesmo um compartilhamento
cancelado ainda é um sinal de engajamento válido para os KPIs de RF-015.

## Analytics (RF-015)

`school_view` (perfil), `list_view` (lista) e `list_share`
(compartilhar) — os três já estavam no allowlist de
`record_analytics_event()` desde o Prompt 06 (nenhuma migration nova
precisou ser criada). Todos best-effort via `recordAnalyticsEvent`
(nunca bloqueiam nem falham a página). Verificado ao vivo via
`analytics_events` que os três tipos foram gravados corretamente durante
os testes manuais.

## Testes realizados

Todas as tabelas relevantes (`school_series`, `school_contacts`,
`school_images`, `school_list_items`, `favorites`, etc.) estavam em 0
linhas globalmente antes deste prompt — igual ao já documentado em
`home-busca-resultados.md`. Sem dado real para exercitar o fluxo
completo, foi seguido o mesmo padrão de "semear, testar, limpar" já usado
para usuários de teste no Prompt 03:

1. Semeados via `execute_sql` (nunca via migration — dado, não schema):
   `school_profiles`/`school_contacts`/`school_series` (3 séries: uma com
   duas listas em anos diferentes, uma sem lista, uma etapa EJA inteira
   sem lista) + `school_lists`/`school_list_versions` (incluindo o caso de
   duas versões `PUBLISHED` da mesma lista, ver seção acima) +
   `school_list_items` numa escola MT real e ativa.
2. Um usuário de teste com login real (`auth.users` com
   `encrypted_password`/`email_confirmed_at`/tokens como `''`, não
   `NULL` — receita documentada em `WORKFLOW.md`).
3. Verificado via Playwright (Chromium global do ambiente): navegação
   anônima completa (perfil, badges, mapa, contato, etapas, seleção
   série/ano, 404 para slug inexistente, redirect de canonicalização),
   resolução correta da versão mais recente da lista, e o ciclo completo
   de favoritar/desfavoritar + compartilhar autenticado.
4. Limpeza: linhas semeadas removidas; `analytics_events` geradas durante
   o teste foram mantidas (são eventos reais, só `analytics`-internos,
   nunca expostos publicamente) mas desvinculadas do usuário/lista de
   teste antes de apagá-los (evita violar FK sem apagar histórico de
   eventos legítimo). Confirmado por query: todas as tabelas voltaram a 0
   linhas.

**Armadilha de teste encontrada (não é bug de produto):** medir
`document.body.textContent()`/`.click()` com waits curtos demais gerou
falsos negativos em duas frentes — (a) o payload RSC de hidratação do
Next.js (`<script>` de streaming) duplica o texto de cada item no HTML
bruto, então contar ocorrências de uma string no `textContent` da
`<body>` conta a versão visível *e* a serializada; usar um seletor
escopado (`li:has-text(...)`) ou `innerText` evita isso. (b) o redirect
de um Server Action (`signInAction`) é uma transição client-side do
Next.js, não uma navegação de browser tradicional — `waitForLoadState /
"load"` não é o sinal certo para esperar por ela; `waitForURL(alvo)` é.
Mesma categoria de "falso negativo de teste" já documentada para o mapa
em `home-busca-resultados.md`.

## Fora do escopo deste prompt

- UI de School Manager para popular `school_series` diretamente (hoje só
  é alcançável via `is_school_manager()`, sem tela) — próximo prompt que
  tratar da área de gestão de escola.
- `approve_submission()` nunca arquivar versões supersedidas — este
  prompt consome o dado corretamente (sempre a maior `version_number`),
  mas não altera essa função; revisitar se/quando o prompt de moderação
  precisar de uma "versão atual" explícita em vez de inferida.
- `next/image` para `school_images` — mantido `<img>` por enquanto (ver
  seção "Perfil da escola" acima).
- E-commerce/parceiros na página de lista — Prompt 08.
