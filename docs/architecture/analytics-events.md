# Analytics de Produto — Catálogo de Eventos

Data: 2026-09-13 · Branch: `claude/friendly-gates-49swcq` · Base: `463a7c2`

Autoridade: PRD [`docs/product/PRD.md`](../product/PRD.md) §15 ("Analytics de
produto", RF-015) define os 15 tipos de evento como "eventos mínimos" (piso,
não teto) e a lista de KPIs que devem alimentar. Este documento não propõe
nada novo — cataloga, com evidência de código (`arquivo:linha`), o que os 15
eventos originais fazem **hoje**, quem os dispara, com quais campos, e o que
na lista de KPIs da PRD já está implementado versus ainda não.

Um 16º evento, `home_list_request_click`, foi adicionado em 2026-09-13
(Tier 2 do roadmap ICPs, sub-projeto papelaria #1 — CTA da home +
rascunho anônimo) e está documentado em §4.16. Um 17º evento, `page_view`,
foi adicionado no mesmo dia (Tier 4 - D4 do roadmap ICPs — dashboard sem
nenhum sinal de visita nas páginas que não têm evento dedicado) e está
documentado em §4.17. Ambos são os únicos eventos do catálogo sem lastro
direto na lista de "eventos mínimos" da PRD §15 — adicionados
deliberadamente acima do piso, não substituindo nenhum dos 15.

## Sumário

1. [Formato de um evento (`analytics_events`)](#1-formato-de-um-evento-analytics_events)
2. [Caminho de escrita](#2-caminho-de-escrita)
3. [Visão geral dos 17 eventos](#3-visão-geral-dos-17-eventos)
4. [Detalhamento por evento](#4-detalhamento-por-evento)
5. [Eventos → KPIs da PRD §15](#5-eventos--kpis-da-prd-15)
6. [Lacunas e observações conhecidas](#6-lacunas-e-observações-conhecidas)

---

## 1. Formato de um evento (`analytics_events`)

Tabela criada em
[`supabase/migrations/20260910200800_analytics_audit.sql:9-20`](../../supabase/migrations/20260910200800_analytics_audit.sql);
tipos confirmados em
[`src/lib/supabase/database.types.ts:22-96`](../../src/lib/supabase/database.types.ts)
(Row/Insert/Update concordam com a DDL).

| Coluna | Tipo | Nulo? | Default | Observação |
|---|---|---|---|---|
| `id` | `uuid` | não | `gen_random_uuid()` | PK |
| `event_type` | `text` | não | — | **Sem enum nem `check` no banco** — é `text` livre. A única validação é dentro de `record_analytics_event()` (§2), não uma constraint da tabela. |
| `profile_id` | `uuid` | sim | — | FK → `profiles(id)`. `NULL` = evento anônimo ("consulta sem login") — comportamento esperado, não um dado faltando. |
| `session_id` | `text` | sim | — | FK lógica nenhuma (é texto livre, não uuid). **Nunca é escrito por nenhum caminho de código hoje** — sempre `NULL` na prática. Ver §2 e §6.1. |
| `school_id` | `uuid` | sim | — | FK → `schools(id)` |
| `store_id` | `uuid` | sim | — | FK → `stores(id)` |
| `list_id` | `uuid` | sim | — | FK → `school_lists(id)` |
| `partner_id` | `uuid` | sim | — | FK → `ecommerce_partners(id)` |
| `metadata` | `jsonb` | não | `'{}'::jsonb` | Shape varia por `event_type` — documentado evento a evento em §4, nunca um schema único |
| `created_at` | `timestamptz` | não | `now()` | |

Índices
([`20260910201700_indexes.sql:60-62`](../../supabase/migrations/20260910201700_indexes.sql)):
`(event_type, created_at desc)`, `(school_id) where school_id is not null`,
`(store_id) where store_id is not null`. Não existe índice em `list_id`,
`partner_id`, `profile_id` nem `session_id`.

RLS
([`20260910201500_rls_campaigns_analytics_audit.sql:7,15-17`](../../supabase/migrations/20260910201500_rls_campaigns_analytics_audit.sql)):
RLS habilitado, **zero policy de insert/update/delete** para `anon`/
`authenticated` — a única forma de gravar pela API é a função
`record_analytics_event()` (`security definer`, §2). Existe exatamente uma
policy, só leitura: `analytics_events_admin_read`, `for select to
authenticated using (public.is_admin())`. Nenhum usuário comum, autenticado
ou não, consegue ler a tabela pela API — só admin, só `SELECT`.

## 2. Caminho de escrita

### 2.1 `record_analytics_event()` (SQL)

[`supabase/migrations/20260911020000_search_schools.sql:196-234`](../../supabase/migrations/20260911020000_search_schools.sql).
`security definer` porque a tabela não tem policy própria para
`anon`/`authenticated` (comentário da própria migration, linha 191-195).
Assinatura:

```sql
record_analytics_event(
  p_event_type text,
  p_school_id uuid default null,
  p_store_id uuid default null,
  p_list_id uuid default null,
  p_partner_id uuid default null,
  p_session_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
```

Guarda de validação — `raise exception 'invalid event_type: %'`
se `p_event_type` não for exatamente um dos 17 (os 15 originais definidos em
`20260911020000_search_schools.sql:211-218`, mais `home_list_request_click`
acrescentado por
[`20260913040000_home_list_request.sql`](../../supabase/migrations/20260913040000_home_list_request.sql)
e `page_view` acrescentado por
[`20260913051500_page_view_event.sql`](../../supabase/migrations/20260913051500_page_view_event.sql)
— ambos via `create or replace function` sobre a mesma assinatura, só a
lista de valores aceitos muda):

```
location_search, location_detected, school_search, school_impression,
school_view, list_view, list_share, commerce_click, whatsapp_click,
store_view, favorite_added, review_created, submission_started,
submission_submitted, submission_approved, home_list_request_click,
page_view
```

`profile_id` do insert vem de `auth.uid()` resolvido **dentro da função**
(linha 224) — nunca de um parâmetro que o chamador possa forjar. `grant
execute` só para `anon, authenticated` (linhas 233-234); `revoke ... from
public` antes.

### 2.2 `recordAnalyticsEvent()` / `recordSchoolImpressions()` (TypeScript)

[`src/lib/analytics/record-event.ts`](../../src/lib/analytics/record-event.ts)
é o **único** call site de `record_analytics_event` no repositório — confirmado
por busca: a RPC só aparece aqui, na migration que a define, e no arquivo de
tipos gerado (nenhum outro `.rpc("record_analytics_event", ...)` em
`src/`). `AnalyticsEventType` (linhas 6-21) é a mesma união fechada de 15
literais da guarda SQL acima, checada em compile-time pelo TypeScript.

```ts
export async function recordAnalyticsEvent(input: RecordAnalyticsEventInput): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("record_analytics_event", {
      p_event_type: input.eventType,
      p_school_id: input.schoolId,
      p_store_id: input.storeId,
      p_list_id: input.listId,
      p_partner_id: input.partnerId,
      p_metadata: (input.metadata ?? {}) as Json,
    });
    if (error) throw error;
  } catch (err) {
    console.error("recordAnalyticsEvent failed", input.eventType, err);
  }
}
```

([linhas 46-61](../../src/lib/analytics/record-event.ts#L46-L61)) — try/catch
próprio: um erro é logado (`console.error`) e **engolido**, nunca propagado.
Nenhuma página, Server Action ou Route Handler que chama isto pode falhar por
causa de analytics — é o motivo de quase todo call site em §4 usar `void
recordAnalyticsEvent(...)` (fire-and-forget) em vez de `await`; as duas
exceções que usam `await` (`commerce_click`, `whatsapp_click`) têm razão
própria documentada em cada arquivo (§4.8, §4.9), não é inconsistência.

`recordSchoolImpressions()` (linhas 64-68) é um wrapper fino: um
`recordAnalyticsEvent({ eventType: "school_impression", schoolId, metadata })`
por `schoolId`, disparados juntos via `Promise.all` — "batched" no sentido de
uma única leva de chamadas concorrentes, não uma única linha/statement SQL;
o mesmo objeto `metadata` é reaproveitado para cada escola do lote (não leva
a posição/rank individual da escola no resultado).

### 2.3 `session_id` nunca é populado

`recordAnalyticsEvent()` **não inclui `p_session_id`** no objeto passado a
`.rpc(...)` acima — mesmo a função SQL aceitando o parâmetro opcionalmente
(`p_session_id text default null`, e confirmado também no tipo gerado,
`database.types.ts:1913`, `p_session_id?: string`). Busca em todo `src/` por
`session_id`/`sessionId` retorna só três hits, nenhum deles uma escrita: o
comentário do próprio `record-event.ts` (linhas 42-44, reproduzido em §6.1) e
as duas ocorrências do tipo gerado. **Toda linha de `analytics_events`
gravada pelo código atual tem `session_id = NULL`.** Ver §6.1 para o estado
desse gap.

---

## 3. Visão geral dos 17 eventos

| Evento | Camada | Dispara quando (resumo) | Campos populados | KPI PRD §15 |
|---|---|---|---|---|
| [`location_search`](#41-location_search) | Server Action | Busca de localização por texto (CEP/cidade/bairro) resolvida | metadata `{query, uf, source}` | buscas por localização |
| [`location_detected`](#42-location_detected) | Server Action | "Localizar-me" com coordenada válida do navegador | metadata `{municipality}` | buscas por localização |
| [`school_search`](#43-school_search) | Server Component (render) | Toda renderização de `/escolas` (qualquer filtro/página) | metadata `{q, uf, sort, page, resultCount}` | escolas vistas por busca (denominador) |
| [`school_impression`](#44-school_impression) | Server Component (render), via helper | Uma vez por escola exibida na página de resultados, se houver ≥1 resultado | `schoolId` (um por escola) + metadata `{page, sort}` | escolas vistas por busca (numerador) |
| [`school_view`](#45-school_view) | Server Component (render) | Toda renderização do perfil da escola (após redirect de URL canônica) | `schoolId` | escolas/listas com maior demanda; denominador de taxa de abertura de lista |
| [`list_view`](#46-list_view) | Server Component (render) | Toda renderização da página de lista | `schoolId`, `listId` | numerador de taxa de abertura de lista |
| [`list_share`](#47-list_share) | Server Action ← Client Component | Clique em "Compartilhar" (intenção, não conclusão) | `schoolId`, `listId` | nenhum literal na PRD |
| [`commerce_click`](#48-commerce_click) | Route Handler (link `<a>` puro) | Redirecionamento validado para oferta de parceiro ativo | `schoolId`?, `listId`?, `partnerId` + metadata `{ecommerceProductId, schoolListItemId}` | clique em e-commerce |
| [`whatsapp_click`](#49-whatsapp_click) | Route Handler (link `<a>` puro) | Redirecionamento validado para `wa.me` de papelaria ativa | `schoolId`?, `listId`?, `storeId` — **sem metadata** | clique em WhatsApp |
| [`store_view`](#410-store_view) | Server Action ← Client Component | Uma vez por papelaria retornada, ao abrir o sheet "Comprar local" | `schoolId`, `storeId` (um por papelaria), `listId`? | nenhum literal na PRD |
| [`favorite_added`](#411-favorite_added) | Server Action ← Client Component | Só ao **adicionar** favorito (nunca ao remover) | `schoolId` XOR `listId` | nenhum literal na PRD (excluído de "maior demanda" por design) |
| [`review_created`](#412-review_created) | Server Action ← Client Component | Só na 1ª avaliação nova de uma escola por usuário (não em reenvio/edição) | `schoolId` | nenhum literal na PRD |
| [`submission_started`](#413-submission_started) | Server Action ← Client Component | Só ao criar um DRAFT novo (não ao retomar um rascunho existente) | `schoolId` + metadata `{submissionId}` | entrada do funil de "listas submetidas"/"taxa de aprovação" |
| [`submission_submitted`](#414-submission_submitted) | Server Action ← Client Component (2 call sites) | Envio de lista completo **ou** envio de sugestão de escola | Lista: `schoolId` + `{submissionId}`. Sugestão: sem `schoolId` + `{kind: "school_suggestion"}` | listas submetidas; denominador de taxa de aprovação |
| [`submission_approved`](#415-submission_approved) | Server Action ← Client Component (2 call sites) | Aprovação de lista **ou** de sugestão, pós-RPC de aprovação | Lista: `schoolId` + `{submissionId}`. Sugestão: sem `schoolId` + `{kind, suggestionId}` | numerador de taxa de aprovação |
| [`home_list_request_click`](#416-home_list_request_click) | Client Component (evento de UI puro) | Clique no CTA "Não achou a lista da sua escola? Peça aqui", na home | sem `schoolId` (ainda não escolheu escola) — sem metadata | nenhum literal na PRD (evento novo, acima do piso de 15) |
| [`page_view`](#417-page_view) | Server Component (render) | Renderização de uma das 7 páginas públicas dinâmicas sem evento dedicado (home + 6 páginas de listagem/perfil de papelaria) | sem `schoolId`/`storeId`/`listId`/`partnerId` — `metadata: {path}` | nenhum literal na PRD (evento novo, acima do piso de 15) |

---

## 4. Detalhamento por evento

Ordem: a mesma da lista "Eventos mínimos" da PRD §15 e da guarda SQL (§2.1) —
as duas concordam exatamente.

### 4.1 `location_search`

- **Arquivo:** [`src/lib/geocoding/resolve-location.ts:41-62`](../../src/lib/geocoding/resolve-location.ts#L41-L62), função `resolveLocationByTextAction` (`"use server"`, linha 1).
- **Camada:** Server Action, chamada pelo Client Component `src/components/location/location-input.tsx` (`"use client"`).
- **Dispara quando:** toda chamada com `rawInput` não-vazio (após `.trim()`), depois de resolver o texto como CEP (`resolveCep`) ou como município/bairro conhecido (`matchMunicipality`, com fallback a `searchPlace`/Nominatim) — dispara **independente de a resolução ter tido sucesso**.
- **Não dispara quando:** `input` vazio após trim (linha 46, retorna antes do evento).
- **Campos:** sem `schoolId`/`storeId`/`listId`/`partnerId`. `metadata: { query: input, uf, source: resolved.source }`.
- **`source` possíveis aqui:** `"cep" | "municipality" | "nominatim" | "unresolved"` — nunca `"coords"` (esse valor só existe no fluxo de `location_detected`, §4.2); união completa em [`src/lib/geocoding/types.ts:1`](../../src/lib/geocoding/types.ts#L1).
- **KPI:** "buscas por localização".

### 4.2 `location_detected`

- **Arquivo:** [`src/lib/geocoding/resolve-location.ts:71-94`](../../src/lib/geocoding/resolve-location.ts#L71-L94), função `resolveLocationByCoordsAction`.
- **Camada:** Server Action, mesmo `location-input.tsx` cliente, acionada pelo botão "Localizar-me" (geolocalização do navegador).
- **Dispara quando:** `lat`/`lon` recebidos são ambos `Number.isFinite`, depois de consultar `nearby_schools()` para um rótulo de município best-effort.
- **Não dispara quando:** `lat`/`lon` não-finitos (linhas 72-74, retorna `unresolvedLocation` antes do evento).
- **Campos:** sem `schoolId`/`storeId`/`listId`/`partnerId`. `metadata: { municipality: nearest?.municipality ?? null }` — `null` quando `nearby_schools()` não encontra nada perto, não quando a geolocalização falhou (esse caso nem chega ao evento).
- **KPI:** "buscas por localização" — mesma observação de §5: nada no código soma este evento com `location_search` num único número: no `/admin/analytics` eles aparecem como duas linhas separadas ("Buscas por localização" / "Localização detectada automaticamente", `EVENT_LABEL` em [`src/app/(admin)/admin/analytics/page.tsx:13-14`](<../../src/app/(admin)/admin/analytics/page.tsx#L13-L14>)).

### 4.3 `school_search`

- **Arquivo:** [`src/app/(public)/escolas/page.tsx:85-88`](<../../src/app/(public)/escolas/page.tsx#L85-L88>), componente `EscolasPage` (Server Component assíncrono, sem `"use client"`).
- **Camada:** dispara na renderização do servidor, automaticamente a cada request — nenhum handler de clique dedicado; navegar para `/escolas` com qualquer combinação de `searchParams` já dispara.
- **Dispara quando:** sempre, uma vez por render, depois de `searchSchools()` resolver — inclusive resultado vazio.
- **Campos:** sem `schoolId`/`storeId`/`listId`/`partnerId`. `metadata: { q: params.q ?? null, uf, sort, page: result.page, resultCount: result.schools.length }`.
- **KPI:** denominador conceitual de "escolas vistas por busca" (ver `school_impression` e §5 — nenhuma razão é de fato calculada em código hoje).

### 4.4 `school_impression`

- **Arquivo do disparo:** mesmo render de `/escolas`, [`src/app/(public)/escolas/page.tsx:89-94`](<../../src/app/(public)/escolas/page.tsx#L89-L94>). **Helper:** `recordSchoolImpressions()`, [`src/lib/analytics/record-event.ts:64-68`](../../src/lib/analytics/record-event.ts#L64-L68) — único chamador confirmado por busca em `src/`.
- **Camada:** mesmo Server Component de `school_search`, mesma requisição.
- **Dispara quando:** `if (result.schools.length > 0)` (linha 89) — um evento por escola da página atual de resultados.
- **Não dispara quando:** busca sem nenhum resultado (0 impressões, mas `school_search` já disparou para essa mesma requisição).
- **Campos:** `schoolId` = id de cada escola (um evento por id); `metadata: { page: result.page, sort }` — o **mesmo** objeto para todas as escolas do lote (não inclui a posição/rank da escola dentro da página).
- **KPI:** numerador conceitual de "escolas vistas por busca" (ver §5).

### 4.5 `school_view`

- **Arquivo:** [`src/app/(public)/escolas/[uf]/[cidade]/[slug]/page.tsx:81`](<../../src/app/(public)/escolas/[uf]/[cidade]/[slug]/page.tsx#L81>), componente `SchoolPage`.
- **Camada:** Server Component, dispara na renderização por navegação.
- **Dispara quando:** toda renderização da página de perfil de uma escola existente, **depois** da checagem de URL canônica.
- **Não dispara quando:** `school` não encontrado (`notFound()`, linha 59, antes do evento) — nem quando a URL requisitada não bate com o caminho canônico da escola (`redirect(canonicalPath)`, linhas 62-64, também antes do evento; só a requisição final, já na URL canônica, chega à linha 81).
- **Campos:** `schoolId` apenas. **Sem `metadata`** (a chamada não passa a chave `metadata` — nem `{}` explícito).
- **KPI:** alimenta diretamente "escolas ... com maior demanda" — `admin_analytics_top_schools` filtra estritamente `event_type = 'school_view'` ([`supabase/migrations/20260911180000_analytics_vendas.sql:299-306`](../../supabase/migrations/20260911180000_analytics_vendas.sql#L299-L306), especificamente linha 303). Também é o denominador real de "taxa de abertura de lista" (`computeListOpenRate`, §5).

### 4.6 `list_view`

- **Arquivo:** [`src/app/(public)/listas/[slug]/page.tsx:62`](<../../src/app/(public)/listas/[slug]/page.tsx#L62>), componente `ListPage`.
- **Camada:** Server Component, dispara na renderização por navegação.
- **Dispara quando:** toda renderização de uma lista existente.
- **Não dispara quando:** `list` não encontrada (`notFound()`, linha 51, antes do evento).
- **Campos:** `schoolId` (`list.school.id`) e `listId` (`list.id`). Sem `metadata`.
- **KPI:** numerador de "taxa de abertura de lista" (`computeListOpenRate = list_view / school_view`,
  [`src/lib/admin/analytics.ts:60-64`](../../src/lib/admin/analytics.ts#L60-L64)) — implementada e
  exibida em `/admin/analytics`. A própria UI admin avisa
  ([`src/app/(admin)/admin/analytics/page.tsx:121-126`](<../../src/app/(admin)/admin/analytics/page.tsx#L121-L126>))
  que essa razão pode passar de 1,00: uma lista pode ser aberta por link
  direto/compartilhado sem passar pela página da escola.

### 4.7 `list_share`

- **Arquivo:** [`src/components/lists/share-button.tsx:29`](../../src/components/lists/share-button.tsx#L29), componente `ShareButton` (`"use client"`, linha 1).
- **Camada:** puramente client-triggered — clique real de botão, sem nenhum server render envolvido no disparo em si (a Server Action que grava o evento roda no servidor, mas quem decide disparar é o `onClick` no cliente).
- **Dispara quando:** no clique de "Compartilhar", **antes** de saber se `navigator.share()` teve sucesso, foi cancelado, ou caiu no fallback de clipboard — decisão deliberada, documentada no próprio componente (linhas 17-23): "recorded on intent (the tap), not on completion ... a cancelled share is still a meaningful engagement signal".
- **Campos:** `schoolId`, `listId` (props obrigatórias do componente). Sem `metadata`.
- **KPI:** nenhuma linha da lista de 9 KPIs da PRD §15 menciona compartilhamento — não mapeado.

### 4.8 `commerce_click`

- **Arquivo:** [`src/app/api/commerce/click/route.ts:69-75`](../../src/app/api/commerce/click/route.ts#L69-L75), `GET` Route Handler.
- **Camada:** Route Handler puro, acionado por um `<a href="/api/commerce/click?...">` **sem** `"use client"` em
  [`src/components/commerce/partner-offer-button.tsx`](../../src/components/commerce/partner-offer-button.tsx)
  — o comentário do componente (linhas 14-19) é explícito: link simples, não `next/link`, "must work with JS disabled". O evento em si não depende de nenhum handler React.
- **Dispara quando:** `product` (query param) é um UUID válido **e** existe um `ecommerce_products` ativo com `ecommerce_partners` ativo para esse id **e** `external_url` resolve para um destino `http(s)` confiável (`parseTrustedExternalUrl`). Qualquer uma dessas três checagens falhando redireciona para `/` **sem** disparar o evento (linhas 45-47, 60-62, 65-67) — o evento representa um redirecionamento de saída de fato validado, não uma tentativa de clique qualquer.
- **Campos:** `schoolId`/`listId` — cada um **independentemente opcional**, validados por UUID a partir da query string; ausência ou valor inválido em qualquer um deles não bloqueia o redirecionamento, só omite o campo. `partnerId` = `offer.ecommerce_partners.id`, resolvido no servidor a partir do JOIN — nunca vem da query string do chamador. `metadata: { ecommerceProductId: offer.id, schoolListItemId: isUuid(itemId) ? itemId : null }`.
- **`await`ado, não fire-and-forget** — única exceção junto com `whatsapp_click` (§4.9) ao padrão `void recordAnalyticsEvent(...)` do resto do catálogo. Razão documentada nas próprias linhas 32-36: um Route Handler termina a execução no instante em que devolve a resposta de redirect, então um insert "solto" arrisca nunca terminar de fato.
- **KPI:** "clique em e-commerce" — contagem crua exposta como card próprio em `/admin/analytics` ([linhas 80-87](<../../src/app/(admin)/admin/analytics/page.tsx#L80-L87>)).

### 4.9 `whatsapp_click`

- **Arquivo:** [`src/app/api/store/whatsapp/route.ts:90-95`](../../src/app/api/store/whatsapp/route.ts#L90-L95), `GET` Route Handler.
- **Camada:** Route Handler puro, mesmo padrão de link simples sem `"use client"` — `<a href="/api/store/whatsapp?...">` em [`src/components/stores/store-card.tsx:78`](../../src/components/stores/store-card.tsx#L78).
- **Dispara quando:** `store` é UUID válido **e** a papelaria existe e está `is_active` **e** o telefone normaliza com sucesso (`normalizeWhatsappNumber`) **e**, se houver contexto de lista, `school`/`list` também são válidos, a escola e uma lista `APPROVED` existem, e há uma versão `PUBLISHED` da lista com ao menos 1 item.
- **Diferença de validação vs. `commerce_click`:** aqui `school`/`list` são tratados **como par**, não independentemente — `hasListContext = schoolIdParam !== null || listIdParam !== null` (linha 37); se qualquer um dos dois estiver presente, **os dois** precisam ser UUID válidos ou a requisição inteira redireciona para `/` sem disparar o evento (linha 39). Não existe o caso "só `school`, sem `list`" chegando ao evento.
- **Campos:** `schoolId`/`listId` (opcionais, como par — ver acima), `storeId` (sempre, obrigatório e já validado antes). **Sem `metadata`** — diferente de `commerce_click`, não há equivalente a `ecommerceProductId`/`schoolListItemId`; não dá para saber, só pela linha do evento, se o clique carregava a lista itemizada ou caiu no fallback de mensagem genérica (`buildGenericWhatsappMessage`).
- **`await`ado**, mesma razão de `commerce_click` (comentário linhas 28-30).
- **KPI:** "clique em WhatsApp" — card próprio em `/admin/analytics` ([linhas 88-95](<../../src/app/(admin)/admin/analytics/page.tsx#L88-L95>)).

### 4.10 `store_view`

- **Arquivo:** [`src/lib/stores/actions.ts:30-34`](../../src/lib/stores/actions.ts#L30-L34), função `getNearbyStoresForSchoolAction` (`"use server"`).
- **Camada:** Server Action, chamada por `src/components/stores/nearby-stores-sheet.tsx` (`"use client"`) quando o bottom sheet "Comprar local" abre — comentário próprio (linhas 7-12): buscado sob demanda, não no carregamento da página, "ties `store_view` to an actual view instead of every page load".
- **Dispara quando:** uma vez **por papelaria retornada** por `getNearbyStores()`, todas de uma vez via `Promise.all`. Se a busca não retorna nenhuma papelaria, `Promise.all([])` não dispara nada.
- **Nuance de nome:** apesar do sufixo `_view` (singular), o comportamento é o de uma impressão em lote — igual a `school_impression` — e não a visualização de uma página própria de uma papelaria específica (nenhum call site aqui corresponde a "o usuário abriu a página desta papelaria"). Estruturalmente é o mesmo padrão de `recordSchoolImpressions`, só que com o `Promise.all` inline em vez de passar por um helper compartilhado.
- **Campos:** `schoolId` (sempre), `storeId` (um por papelaria do lote), `listId` (opcional — presente só quando o sheet abre a partir da página de lista, [`src/app/(public)/listas/[slug]/page.tsx:231`](<../../src/app/(public)/listas/[slug]/page.tsx#L231>); ausente quando abre a partir da página da escola, [`.../[slug]/page.tsx:319`](<../../src/app/(public)/escolas/[uf]/[cidade]/[slug]/page.tsx#L319>)). Sem `partnerId`/`metadata`.
- **KPI:** nenhuma linha da PRD §15 nomeia isso — não mapeado.

### 4.11 `favorite_added`

- **Arquivo:** [`src/lib/favorites/actions.ts:55-59`](../../src/lib/favorites/actions.ts#L55-L59), função `toggleFavoriteAction`.
- **Camada:** Server Action, chamada por `src/components/favorites/save-button.tsx` (`"use client"`) no clique.
- **Dispara quando:** só no branch que **insere** um favorito novo (linhas 50-59).
- **Não dispara quando:** usuário não autenticado (retorna antes de qualquer branch); e, mais notável, no branch de **remoção** de um favorito existente (linhas 43-48) — desfavoritar nunca gera evento algum. Assimetria deliberada, coerente com o nome do evento (`_added`, não `_toggled`).
- **Campos:** `schoolId` **XOR** `listId` — nunca os dois juntos, depende de `targetType` (`"SCHOOL"` vs. `"LIST"`). Sem `storeId`/`partnerId`/`metadata`.
- **KPI:** nenhuma linha da PRD §15 nomeia isso. O candidato conceitual mais próximo, "escolas/listas com maior demanda", **exclui explicitamente** favoritos por design — `docs/architecture/analytics-vendas.md` (linhas 125-127) documenta a decisão: "Favoritos como sinal de demanda em `admin_analytics_top_schools` -- fica só em `school_view` para manter a função simples".

### 4.12 `review_created`

- **Arquivo:** [`src/lib/reviews/actions.ts:80-83`](../../src/lib/reviews/actions.ts#L80-L83), função `createReviewAction`.
- **Camada:** Server Action, chamada por `src/components/reviews/review-form.tsx` (`"use client"`, via `useActionState`).
- **Dispara quando:** só no branch `!existing` (linha 80) — ou seja, só na **primeira** avaliação de uma escola por um usuário. Depende também de: usuário autenticado (linha 40); `check_rate_limit("review_create", 10/60min)` permitir (linhas 46-53, retorna erro antes do insert se estourar); nota inteira 1-5; comentário ≤1000 caracteres; e, se já existir uma review não-`PENDING` para o par (escola, usuário), a função retorna erro antes de chegar ao insert (linhas 63-65).
- **Não dispara quando:** reenvio/edição de uma review ainda `PENDING` (isso é um `UPDATE`, não gera um novo evento).
- **Campos:** `schoolId` apenas. Sem `storeId`/`listId`/`partnerId`/`metadata`.
- **Momento do disparo:** na **submissão** (`status: "PENDING"`), não na aprovação — diferente do par `submission_submitted`/`submission_approved`, não existe um `review_approved` entre os 15 eventos; a review só aparece publicamente depois de moderada (`getApprovedReviews`, usado em [`.../[slug]/page.tsx:69`](<../../src/app/(public)/escolas/[uf]/[cidade]/[slug]/page.tsx#L69>)), mas o evento não acompanha essa segunda etapa.
- **KPI:** nenhuma linha da PRD §15 nomeia isso.

### 4.13 `submission_started`

Dois call sites desde 2026-09-13 (Tier 2 do roadmap ICPs) — mesmo padrão de
`metadata` diferenciando a origem que `submission_submitted`/
`submission_approved` já usam para `kind` (§4.14/§4.15), aqui com `source`.

**Site A — wizard logado (`/enviar-lista`)** ·
[`src/lib/contributions/actions.ts:159`](../../src/lib/contributions/actions.ts#L159),
função `startSubmissionAction` (passo 1 do wizard).
- **Camada:** Server Action, chamada por `src/components/contributions/new-submission-wizard.tsx` (`"use client"`, via `useActionState`).
- **Dispara quando:** só no branch que **cria** uma linha `list_submissions` nova em `DRAFT`.
- **Não dispara quando:** existe um rascunho editável para a mesma combinação exata de escola/etapa/série/ano — esse branch dá `redirect()` direto para o rascunho existente e nunca chega ao evento; comentário do próprio código é explícito: "Only the freshly-created-draft path counts as 'started' ... resuming a draft isn't a new start". Também não dispara se `check_rate_limit("submission_start", 10/60min)` bloquear ou se usuário não autenticado.
- **Campos:** `schoolId` (escola escolhida no passo 1). `metadata: { submissionId: created.id }` — **sem** `source`. Sem `storeId`/`listId`/`partnerId`.

**Site B — rascunho anônimo materializado (CTA da home)** ·
[`src/lib/contributions/actions.ts`](../../src/lib/contributions/actions.ts),
função `materializeLocalDraftAction`, chamada diretamente (sem
`useActionState`/`<form>`) por `continueLocalDraft()`
([`src/lib/contributions/continue-local-draft.ts`](../../src/lib/contributions/continue-local-draft.ts)),
por sua vez chamada por `AnonymousItemsStep` (clique em "Continuar" já
autenticado) e por `HomeListRequestCta` (auto-retomada ao voltar do
login/cadastro com um rascunho local pendente).
- **Dispara quando:** só quando `materialize_local_draft` (RPC) **cria**
  uma `list_submissions` nova — mesmo critério do Site A, "colidir" com um
  DRAFT/NEEDS_CORRECTION remoto existente para a mesma tupla
  escola/etapa/série/ano não conta como início (`data.collided === true`
  pula o evento e o `record_rate_limit_hit`, mesma disciplina do Site A).
- **Não dispara quando:** validação client-side falha antes de chamar a
  RPC, a RPC lança exceção (ex.: usuário não autenticado — nunca deveria
  ser alcançável, mas a Server Action nunca confia só no cliente), ou
  `check_rate_limit` bloqueia.
- **Campos:** `schoolId`. `metadata: { submissionId: data.submission_id, source: "home_anonymous" }` — o campo `source` é o que distingue este site do Site A num consumidor lendo `analytics_events` cru (mesma técnica de `metadata->>'kind'` do §4.14, mas aqui só um dos dois sites populares um campo extra em vez de os dois usarem valores diferentes da mesma chave).
- **KPI:** não é uma linha própria da PRD §15 em nenhum dos dois sites, mas é a ponta larga do funil que alimenta "listas submetidas"/"taxa de aprovação" (iniciado → enviado → aprovado) — nenhum KPI dedicado a "taxa de conclusão do wizard" existe hoje, nem um que meça conversão anônimo → lista real especificamente (ver §4.16).

### 4.14 `submission_submitted`

Dois call sites, dois fluxos diferentes que compartilham o mesmo
`event_type` — distinguíveis só pelo **shape do `metadata`**, não por um
campo dedicado.

**Site A — envio de lista** ·
[`src/lib/contributions/actions.ts:271-275`](../../src/lib/contributions/actions.ts#L271-L275),
função `submitSubmissionAction`, chamada por
`src/components/contributions/submit-review-form.tsx` (`"use client"`, via
`useActionState`).
- Dispara depois que `requireOwnEditableSubmission` autoriza, existe ao
  menos 1 item (`if (!count) return {error...}`, linha 263) e o `UPDATE` de
  `status` para `"SUBMITTED"` tem sucesso.
- Campos: `schoolId = gate.submission.school_id` (lido do banco, não da
  requisição). `metadata: { submissionId }` — **sem** chave `kind`.

**Site B — sugestão de escola** ·
[`src/lib/contributions/school-suggestion-actions.ts:58`](../../src/lib/contributions/school-suggestion-actions.ts#L58),
função `submitSchoolSuggestionAction`, chamada por
`src/components/contributions/suggest-school-form.tsx` (`"use client"`, via
`useActionState`) — fluxo separado `sugerir-escola`, para propor uma escola
que ainda não existe no INEP.
- Dispara depois que o `insert` em `school_suggestions` tem sucesso.
- Campos: **sem** `schoolId` (não existe escola ainda — o comentário do
  próprio arquivo, linhas 16-20, é explícito: "PRD RF-008: never creates an
  `schools` row directly"). `metadata: { kind: "school_suggestion" }` — sem
  `submissionId`.

Um consumidor lendo `analytics_events` cru precisa inspecionar
`metadata->>'kind'` (ou `school_id is null`) para separar os dois fluxos —
não há um segundo `event_type` nem um campo estruturado dedicado a isso.

- **KPI:** "listas submetidas" — mas o card "Listas submetidas" em
  `/admin/analytics`
  ([linha 98](<../../src/app/(admin)/admin/analytics/page.tsx#L98>)) soma o
  `event_type` inteiro, **os dois sites juntos**, então o número inclui
  sugestões de escola, não só listas — ver §6.3. Também é o denominador de
  "taxa de aprovação" (`computeApprovalRate`, §5), com a mesma mistura.

### 4.15 `submission_approved`

Dois call sites, mesmo padrão de `metadata.kind` do evento anterior — ambos
exigem admin (`requireAdmin`).

**Site A — aprovação de lista (moderação)** ·
[`src/lib/moderation/actions.ts:48-52`](../../src/lib/moderation/actions.ts#L48-L52),
função `approveSubmissionAction`, chamada por
`src/components/moderation/review-actions.tsx` (`"use client"`, via
`useActionState`).
- Dispara depois que a RPC `approve_submission` tem sucesso; o `school_id`
  é buscado de novo com um `SELECT` dedicado logo em seguida (linhas 43-47)
  só para este evento.
- Campos: `schoolId = approved?.school_id`. `metadata: { submissionId }`.

**Site B — aprovação de sugestão de escola** ·
[`src/lib/admin/school-suggestion-actions.ts:30-33`](../../src/lib/admin/school-suggestion-actions.ts#L30-L33),
função `approveSchoolSuggestionAction`, chamada por
`src/components/admin/suggestion-actions.tsx` (`"use client"`, via
`useActionState`).
- Dispara depois que a RPC `approve_school_suggestion` tem sucesso.
- Campos: **sem** `schoolId` — aprovar uma sugestão não cria a linha em
  `schools` automaticamente (mesmo comentário RF-008 citado em §4.14); o
  registro real fica para um admin criar manualmente depois, então não há
  `school_id` disponível neste momento. `metadata: { kind:
  "school_suggestion", suggestionId }`.

- **KPI:** numerador de "taxa de aprovação" — mesma mistura lista/sugestão
  do denominador (§4.14), já que `computeApprovalRate` (§5) usa a contagem
  crua do `event_type` inteiro dos dois lados.

### 4.16 `home_list_request_click`

- **Arquivo:** [`src/components/home/home-list-request-cta.tsx`](../../src/components/home/home-list-request-cta.tsx), dentro do `onClick` do botão de texto "Não achou a lista da sua escola? Peça aqui".
- **Camada:** Client Component puro — chama `recordAnalyticsEvent` diretamente do handler de clique (Server Action importada e invocada como função, sem `useActionState`/`<form>`; mesma técnica usada por `materializeLocalDraftAction`/`continueLocalDraft`, §4.13 tem o padrão equivalente via `useActionState` para comparação). Não é uma renderização de servidor como a maioria dos outros 15 — é o único evento deste catálogo disparado só por interação de UI sem nenhuma escrita/leitura de dados associada.
- **Dispara quando:** todo clique no CTA, incondicionalmente — o clique também revela o wizard (`allowAnonymous`) na mesma função, mas o evento não depende do resultado dessa revelação.
- **Não dispara quando:** nunca condicionalmente — não há branch de erro/validação antes do disparo (é o primeiro passo do funil, não há o que validar ainda).
- **Campos:** sem `schoolId`/`storeId`/`listId`/`partnerId` (o visitante ainda não escolheu escola). Sem `metadata` — nada além do clique em si para registrar neste ponto.
- **Best-effort, fogo-e-esquece:** `void recordAnalyticsEvent(...)` — mesma disciplina de "nunca bloqueia a tela" documentada em `record-event.ts` (§2.2), aqui ainda mais literal: o clique já navega/revela a UI no mesmo tick, independente do resultado da chamada.
- **KPI:** nenhum literal na PRD §15 (evento adicionado depois, acima do piso de 15 — ver nota da introdução). Junto com `submission_started` (metadata `source: "home_anonymous"`, adicionado na mesma mudança — ver §4.13), forma o funil novo "clicou no CTA → começou o rascunho anônimo → materializou → enviou", sem KPI dedicado ainda em `/admin/analytics`.

### 4.17 `page_view`

- **Arquivo:** [`src/lib/analytics/record-event.ts:78-80`](../../src/lib/analytics/record-event.ts#L78-L80), função `recordPageView(path)` — chamada direto de 7 Server Components (nenhum Client Component envolvido): [`src/app/(public)/page.tsx`](<../../src/app/(public)/page.tsx>) (`/`), [`escolas/[uf]/page.tsx`](<../../src/app/(public)/escolas/[uf]/page.tsx>), [`escolas/[uf]/[cidade]/page.tsx`](<../../src/app/(public)/escolas/[uf]/[cidade]/page.tsx>), [`listas/page.tsx`](<../../src/app/(public)/listas/page.tsx>) (`/listas`), [`papelarias/page.tsx`](<../../src/app/(public)/papelarias/page.tsx>) (`/papelarias`), [`papelarias/[uf]/[cidade]/page.tsx`](<../../src/app/(public)/papelarias/[uf]/[cidade]/page.tsx>) e [`papelarias/[uf]/[cidade]/[slug]/page.tsx`](<../../src/app/(public)/papelarias/[uf]/[cidade]/[slug]/page.tsx>).
- **Camada:** Server Component (render), mesmo padrão de `school_search`/`school_view`/`list_view` — dispara na resposta ao request, sem handler de clique.
- **Dispara quando:** toda renderização bem-sucedida de uma dessas 7 páginas — nas páginas com `notFound()`/`redirect()` (município sem escola/papelaria, papelaria inexistente, URL não-canônica), o evento fica **depois** desses `return`/`throw` no código, então uma 404 ou um redirect não geram `page_view`.
- **Não dispara em:** as outras ~10 páginas públicas — 3 já têm evento dedicado mais específico (`school_search`+`school_impression` em `/escolas`, `school_view` no perfil da escola, `list_view` na lista) e não ganharam `page_view` também (seria duplicar a mesma renderização com dois eventos); as 7 páginas institucionais estáticas (`como-funciona`, `para-escolas`, `para-papelarias`, `parceiros`, `privacidade`, `cookies`, `termos`) ficaram de fora deliberadamente — nenhuma delas tem `dynamic = "force-dynamic"` hoje, e forçá-las a renderizar por request só para contar visita é um custo de performance/infra real sem justificativa clara (decisão registrada no roadmap ICPs, Tier 4 - D4).
- **Campos:** sem `schoolId`/`storeId`/`listId`/`partnerId`. `metadata: { path }`, com `path` já resolvido pelo próprio Server Component (ex.: `` `/escolas/${uf.toLowerCase()}` ``, `` `/papelarias/${uf.toLowerCase()}/${cidade}/${slug}` ``) — nunca a URL bruta do request (sem query string, sem host).
- **Distinção de `store_view` (§4.10):** os dois podem parecer sobrepostos na página de perfil de papelaria, mas medem coisas diferentes — `store_view` é uma impressão da papelaria dentro do sheet "Comprar local" **de uma página de escola**; `page_view` aqui é a visita direta à própria página da papelaria. Uma papelaria pode acumular `store_view` sem nunca ter um `page_view` (só apareceu em sheets, ninguém clicou), e vice-versa (tráfego direto/orgânico para a página, sem passar pela escola).
- **Best-effort, fogo-e-esquece:** `void recordPageView(path)` — mesma disciplina de `recordAnalyticsEvent` (§2.2), nunca bloqueia nem falha o render da página.
- **KPI:** nenhum literal na PRD §15 (evento novo, acima do piso de 15 — ver nota da introdução). Rótulo em `/admin/analytics` é deliberadamente "Visitas a páginas sem evento próprio" (não "Total de visitas") — somar `page_view` aos outros eventos de render para chegar a um número de "visitas do site" exigiria somar tipos com semânticas diferentes (uma `school_view` já é uma visita; contá-la de novo como `page_view` também seria dobrar a contagem), o que este evento deliberadamente não faz.

---

## 5. Eventos → KPIs da PRD §15

KPIs, citados literalmente de
[`docs/product/PRD.md:481-489`](../product/PRD.md#L481-L489):

```
- buscas por localização;
- escolas vistas por busca;
- taxa de abertura de lista;
- clique em e-commerce;
- clique em WhatsApp;
- listas submetidas;
- taxa de aprovação;
- escolas/listas com maior demanda;
- CTR patrocinado.
```

| KPI (PRD) | Evento(s) | Implementado onde | Observação |
|---|---|---|---|
| buscas por localização | `location_search`, `location_detected` | Duas linhas separadas em `/admin/analytics` (contagem crua) | Nada no código soma os dois num único número — a PRD fala de um KPI, o admin mostra dois |
| escolas vistas por busca | `school_search`, `school_impression` | Duas linhas separadas em `/admin/analytics` (contagem crua) | **Sem razão calculada** — só existem `computeApprovalRate`/`computeListOpenRate` em `src/lib/admin/analytics.ts`; nada divide impressões por buscas |
| taxa de abertura de lista | `school_view` (denominador), `list_view` (numerador) | `computeListOpenRate()`, [`src/lib/admin/analytics.ts:60-64`](../../src/lib/admin/analytics.ts#L60-L64) | Implementado; pode passar de 1,00 por design (link direto/compartilhado) |
| clique em e-commerce | `commerce_click` | Card próprio em `/admin/analytics` (contagem crua) | Implementado |
| clique em WhatsApp | `whatsapp_click` | Card próprio em `/admin/analytics` (contagem crua) | Implementado |
| listas submetidas | `submission_submitted` (2 sites) | Card "Listas submetidas", [`.../admin/analytics/page.tsx:98`](<../../src/app/(admin)/admin/analytics/page.tsx#L98>) | **Mistura lista + sugestão de escola** — mesmo `event_type`, sem filtro por `metadata.kind`. A tabela de detalhe da mesma página já rotula isso com mais honestidade ("Envios/sugestões enviados", linha 26) — dois rótulos diferentes para o mesmo número na mesma tela (§6.3) |
| taxa de aprovação | `submission_submitted`/`submission_approved` (2 sites cada) | `computeApprovalRate()`, [`src/lib/admin/analytics.ts:54-58`](../../src/lib/admin/analytics.ts#L54-L58) | Implementado; mesma mistura lista/sugestão do KPI anterior |
| escolas/listas com maior demanda | `school_view` só | `admin_analytics_top_schools`, filtro `event_type = 'school_view'` ([`20260911180000_analytics_vendas.sql:303`](../../supabase/migrations/20260911180000_analytics_vendas.sql#L303)) | Só cobre **escolas** — não existe ranking equivalente para **listas** (`list_view` nunca é agregado dessa forma). `favorite_added` deliberadamente fora (§4.11) |
| CTR patrocinado | nenhum | não implementado | Nenhum evento carrega uma flag de patrocínio no momento do disparo — `school_impression.metadata` é só `{page, sort}` (§4.4) e `school_view` não tem `metadata` nenhum (§4.5). Confirmado também em prosa: `docs/architecture/analytics-vendas.md` linhas 118-123 documenta isso como fora de escopo do Prompt 14 |

Eventos que não alimentam nenhuma das 9 linhas acima, hoje: `list_share`,
`store_view`, `favorite_added`, `review_created`, `submission_started`
(este último é só a ponta larga do funil, sem KPI de "taxa de conclusão do
wizard" dedicado), `home_list_request_click` (§4.16) e `page_view` (§4.17)
-- os dois últimos são eventos novos acima do piso de 15, sem KPI na PRD
por definição, já que a PRD é anterior a eles.

---

## 6. Lacunas e observações conhecidas

### 6.1 `session_id` nunca é populado

Comentário do próprio código,
[`src/lib/analytics/record-event.ts:42-44`](../../src/lib/analytics/record-event.ts#L42-L44):

> `session_id` correlation across anonymous visits isn't implemented yet --
> deferred to Prompt 14 (dedicated analytics prompt), out of scope for the
> home/busca/resultados journey this records events for.

Prompt 14 **já rodou** — é exatamente
[`docs/architecture/analytics-vendas.md`](./analytics-vendas.md) (RF-015,
mesma numeração usada nos prompts deste repo, ver
[`docs/prompts/14-analytics-vendas.md`](../prompts/14-analytics-vendas.md))
— e o próprio documento desse prompt (lido por completo para este catálogo)
não menciona `session_id` uma vez sequer; o escopo dele foi as 5 novas
call sites de `submission_*` (§4.13-4.15), as tabelas de venda, e as duas
RPCs de leitura de §5, não a correlação de sessão. Os prompts 15-20
(`docs/prompts/15-seo.md` a `20-gap-final.md`) também não mencionam o
termo. **Não há hoje nenhum prompt numerado ainda-não-executado apontado
como dono deste gap** — o comentário que promete "Prompt 14" ficou
desatualizado assim que aquele prompt fechou sem tocar nisso.

Efeito prático: não é possível hoje reconstruir a jornada de um visitante
anônimo através de múltiplos eventos (`location_search` →
`school_search` → `school_impression` → `school_view` → `list_view` →
`whatsapp_click`, por exemplo) — cada linha em `analytics_events` é
independente; a única correlação possível é por `profile_id` (só para
usuários autenticados) ou por proximidade de `created_at`, o que não é
confiável em tráfego concorrente.

### 6.2 `review_created` tem call site real — `analytics-vendas.md` está desatualizado neste ponto

O próprio `docs/architecture/analytics-vendas.md` (linhas 39-41, escrito no
Prompt 14) afirma: "`review_created` continua sem call site -- não existe
nenhuma feature de criação de review no código". Isso **não é mais verdade
hoje** — `src/lib/reviews/actions.ts:81` (§4.12) chama
`recordAnalyticsEvent({ eventType: "review_created", schoolId })` de
verdade, dentro de um fluxo completo de avaliação
(`review-form.tsx`/`createReviewAction`/RLS
`reviews_insert_own_pending`/moderação). A feature de reviews foi
implementada em algum momento depois do Prompt 14 sem que aquele documento
fosse atualizado para refletir isso. Este catálogo (§4.12) reflete o
estado atual, verificado por leitura direta do código-fonte — não confie na
frase antiga de `analytics-vendas.md` nesse ponto específico.

### 6.3 Mesmo `event_type`, dois significados — `submission_submitted` e `submission_approved`

Detalhado em §4.14/§4.15: cada um desses dois `event_type` tem dois call
sites (lista vs. sugestão de escola) com `metadata` de shape diferente e
sem um campo estruturado comum para distinguir os dois além da presença de
`kind`. Isso já causa uma inconsistência visível na própria UI admin: em
[`src/app/(admin)/admin/analytics/page.tsx`](<../../src/app/(admin)/admin/analytics/page.tsx>),
o card de KPI na linha 98 rotula a contagem crua de `submission_submitted`
como **"Listas submetidas"**, enquanto a tabela de detalhamento por evento
mais abaixo, na mesma página, rotula o mesmo `event_type` (linha 26) como
**"Envios/sugestões enviados"** — dois rótulos diferentes para o mesmo
número, um implicando "só listas" e o outro reconhecendo a mistura.

### 6.4 `store_view` funciona como impressão em lote, não como "visualização" de uma entidade

Ver §4.10. O nome sugere uma página própria de papelaria sendo vista; o
comportamento real é "N papelarias foram mostradas quando o sheet abriu" —
mesma semântica de `school_impression`, implementada com o `Promise.all`
direto em vez de passar pelo helper `recordSchoolImpressions`.

### 6.5 `whatsapp_click` não carrega `metadata` — assimetria com `commerce_click`

Ver §4.9. Os dois eventos de clique de saída (e-commerce vs. papelaria) têm
shapes de campo diferentes: `commerce_click` grava `ecommerceProductId`/
`schoolListItemId` em `metadata`; `whatsapp_click` não grava `metadata`
nenhum, então não dá para diferenciar depois, só pelo evento, um clique com
lista itemizada de um clique com mensagem genérica de orçamento.

### 6.6 `event_type` não tem constraint no banco — só validação em PL/pgSQL

Ver §1 e §2.1. A coluna é `text` livre; nada no `create table` impede um
`INSERT` direto (via `service_role`, que ignora RLS por definição) de
gravar um `event_type` fora da lista de 15. A única barreira é o `if ...
not in (...) then raise exception` dentro de `record_analytics_event()` —
suficiente para todo o caminho de escrita usado pela aplicação hoje
(§2.2 confirma que essa função é o único chamador da RPC em `src/`), mas
não é uma garantia de banco de dados.

### 6.7 Analytics não é rate-limited — decisão deliberada, não descuido

[`docs/security/rate-limiting.md:64-68`](../security/rate-limiting.md#L64-L68)
documenta explicitamente que `recordAnalyticsEvent` foi deixado de fora dos
limites de taxa desta passada de hardening: "sem custo por evento, sem
fila de moderação. Rate-limitar isso arriscaria perder dado de uso real
... sem nenhum ganho de segurança correspondente." Dois dos 15 eventos
(`review_created`, `submission_started`) acabam com proteção indireta
porque a **ação de negócio** que os dispara tem rate limit próprio
(`check_rate_limit("review_create", ...)`/`check_rate_limit(
"submission_start", ...)`) — não porque o sistema de analytics em si limita
algo.

### 6.8 Nenhum evento reservado ficou sem call site

Todos os 15 tipos da guarda SQL (§2.1) têm pelo menos um call site real e
verificado neste catálogo — diferente do estado do Prompt 14
(`analytics-vendas.md` linhas 22-37), quando três tipos
(`submission_started`/`submission_submitted`/`submission_approved`)
estavam na allowlist havia tempo sem nenhum código chamando-os. Esse gap já
foi fechado; o único resquício documental é a frase específica sobre
`review_created` corrigida em §6.2.
