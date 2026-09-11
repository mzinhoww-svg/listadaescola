# Listada Escola — RLS / Security Model

## Objetivo

RLS é a camada primária de isolamento no Supabase. O frontend nunca é considerado autoridade para permissões.

## Status

**Implementado e testado** contra um banco real (projeto Supabase
`listada-escola`, ref `wfdejmokxrunupsekcmq`, região `sa-east-1`) em
2026-09-10, via `supabase/migrations/*.sql`. As 10 verificações obrigatórias
desta página (seção "Testes de segurança obrigatórios") mais 16
verificações adicionais (controles positivos e isolamento de
`storage.objects`) foram executadas e passaram — ver
`supabase/tests/rls_idor.sql` para o script completo e reproduzível
(roda inteiro dentro de uma transação com `ROLLBACK`, não deixa dado de
teste no banco).

## Princípios

- Toda tabela pública tem RLS habilitado — todas as tabelas do schema `public` têm (34 atualmente; a contagem de "29" de quando este documento foi escrito ficou desatualizada por várias prompts desde então que adicionaram tabelas).
- Leitura pública é explicitamente limitada a registros ativos/publicados.
- Escrita do usuário é limitada ao próprio ownership.
- Ações administrativas usam `is_admin()`/`is_staff()` ou funções equivalentes e nunca dependem de esconder UI.
- Dados privados de submissão e anexos ficam inacessíveis a usuários não autorizados.
- Analytics e audit log não são gravados diretamente por clientes; usar server-side ou funções seguras.

## Divergência importante do rascunho original: `school_lists`

O rascunho original desta matriz listava `manager` para INSERT/UPDATE em
`school_lists`/`school_list_versions`/`school_list_items`. A instrução do
Prompt 02 foi mais específica e restritiva — **"usuário não pode escrever
diretamente em school_lists"**, sem qualificar "usuário comum" vs.
"manager". A implementação segue essa instrução literalmente: **nenhum
papel autenticado tem policy de INSERT/UPDATE nessas três tabelas**, nem
mesmo School Manager. O único caminho de escrita é a função
`approve_submission()` (`SECURITY DEFINER`, verifica `is_admin()`
internamente), chamada durante a moderação. Isso é estritamente mais
seguro que o rascunho original e consistente com RN-003 do PRD ("Contribuições
de usuários não podem tornar conteúdo público sem aprovação").

## Matriz (estado implementado)

| Tabela | Anon SELECT | Auth SELECT | Auth INSERT | Auth UPDATE | Admin |
|---|---|---|---|---|---|
| schools | ativos | ativos | não | não | **full, sem DELETE** |
| school_profiles | ativos | ativos | manager | manager | full |
| school_contacts | públicos+ativos | públicos+ativos | manager | manager | full |
| school_images | aprovadas | aprovadas | manager | manager | full |
| school_education_levels | ativos | ativos | manager | não | full |
| school_series | ativos | ativos | manager | não | full |
| school_managers | não | próprio | não | não | full |
| school_suggestions | não | próprias | próprias | não | full |
| school_lists | aprovadas | aprovadas | **não (só via função)** | **não (só via função)** | **full, sem DELETE** |
| school_list_versions | publicados | publicados | **não (só via função)** | **não (só via função)** | **full, sem DELETE** |
| school_list_items | publicados | publicados | **não (só via função)** | **não (só via função)** | **full, sem DELETE** |
| list_submissions | não | próprias | próprias (só DRAFT) | próprias (DRAFT/NEEDS_CORRECTION) | full |
| submission_items | não | próprios | próprios (submission editável) | próprios (submission editável) | full |
| submission_attachments | não | próprios | próprios (submission editável) | — (sem update; delete próprio) | full |
| profiles | não | próprio | trigger | próprio (role travado) | full |
| favorites | não | próprias | próprias | — | full |
| reviews | aprovadas | aprovadas/próprias | próprias (PENDING) | próprias (enquanto PENDING) | full |
| reports | não | próprias | próprias | não | full |
| stores | ativas | ativas | não | manager | full |
| store_contacts | públicos+ativas | públicos+ativas | manager | manager | full |
| store_services | ativas | ativas | manager | — (delete próprio) | full |
| store_managers | não | próprio | não | não | full |
| products | públicos | públicos | não | não | full |
| ecommerce_partners | ativos | ativos | não | não | full |
| ecommerce_products | ativos (+ partner ativo) | ativos (+ partner ativo) | não | não | full |
| list_product_mappings | publicados | publicados | não | não | full |
| campaigns | não | não | não | não | full |
| analytics_events | não | não | server (bypassa RLS) | não | **read** (não full) |
| audit_logs | não | não | trigger/função | não | **read** (não full) |
| auth_login_attempts | não | não | função (inclusive anon) | não | **nenhum** (nem admin) |

`manager` = `is_school_manager(school_id)` ou `is_store_manager(store_id)`
(ambas fazem `OR is_admin()` internamente). Onde a coluna diz "— (delete
próprio)", existe só policy de DELETE além de SELECT/INSERT, não UPDATE —
essas ações são naturalmente add/remove, não edição in-place.

**`auth_login_attempts` (SEC-008, Prompt 20)**: sem nenhuma policy (RLS
habilitado, zero policies) -- só `check_login_rate_limit`/
`record_login_attempt` (`SECURITY DEFINER`) tocam a tabela, e essas duas
são a única exceção deste projeto a "só `authenticated`": precisam
funcionar para `anon` porque o rate limit de login roda antes da
autenticação.

**RN-006/RN-007 (Prompt 20)**: `schools`/`school_lists`/
`school_list_versions`/`school_list_items` são master/histórico
versionado e não devem ser fisicamente excluídos (status/inativação em
vez disso). A policy `for all` original de admin incluía DELETE por
padrão; `20260911220000_gap_fixes_prompt20.sql` a substitui por policies
explícitas de SELECT/INSERT/UPDATE (sem DELETE) nessas 4 tabelas —
nenhuma outra capacidade de admin muda.

## Funções de segurança (`supabase/migrations/20260910200900_rls_helper_functions.sql`)

- `is_admin()`, `is_staff()`, `is_school_manager(uuid)`, `is_store_manager(uuid)` — `SECURITY DEFINER`, `search_path` fixo, usadas dentro das policies acima.
- `EXECUTE` nessas 4 funções está **revogado de `PUBLIC`** (ver correção abaixo) e **mantido para `authenticated`** (as policies `to authenticated` precisam poder chamá-las — revogar quebraria RLS, já que o chamador precisa de `EXECUTE` independente de `SECURITY DEFINER`).
- `handle_new_user()` e `guard_submission_status_transition()` são só-trigger: `EXECUTE` revogado de `PUBLIC`, sem grant para nenhum papel — nunca chamadas diretamente, só disparadas por trigger (que não depende do grant do papel que fez o DML).
- `approve_submission(uuid)`, `reject_submission(uuid, text)`, `request_submission_correction(uuid, text)` são a superfície de RPC de moderação: `EXECUTE` revogado de `PUBLIC`, mantido para `authenticated` (é assim que o admin chama via RPC; a função barra não-admin internamente com `is_admin()`).
- Verificado via `get_advisors(security)` + consulta direta a `information_schema.routine_privileges` (o advisor cacheia e não refletiu a mudança na mesma sessão — a consulta direta é que confirmou o estado real).

**Correção (Prompt 16):** a afirmação original acima ("revogado de `anon`") era
**incorreta** e ficou sem efeito real por 13 prompts — `revoke execute ... from
anon` (`20260910201900_advisor_fixes.sql`) é um no-op quando o único acesso do
papel vem da concessão implícita a `PUBLIC` que toda function ganha ao ser
criada (Postgres nunca registrou `anon` como grantee direto; só `PUBLIC` em
si podia ser revogado). `is_admin()`/`is_staff()`/`is_school_manager()`/
`is_store_manager()`/`handle_new_user()`/`guard_submission_status_transition()`
continuaram chamáveis via `/rest/v1/rpc/...` só com a `apikey` pública — sem
sessão — até `20260911200000_security_audit_fixes.sql` revogar de `PUBLIC` de
verdade (mesmo padrão já usado em `moderation_guards_fix_public_grant.sql`/
`admin_crud_fix_anon_grant.sql`, que corrigiram o mesmo no-op para as funções
de moderação e admin — essas quatro helper functions e as duas trigger-only
tinham ficado de fora até então). Não era um achado explorável (as quatro
primeiras só leem `auth.uid()` do próprio chamador — `null` para `anon`,
sempre `false`; as duas trigger-only recusam execução fora de contexto de
trigger, independente de grant) — ver `docs/security/final-audit.md` para o
achado completo.

## `guard_submission_status_transition` (trigger em `list_submissions`)

RLS sozinha não consegue expressar "só admin pode setar este valor
específico" numa mesma coluna que o dono também pode escrever. Este
trigger fecha essa lacuna: usuário comum só pode mover
`DRAFT`/`NEEDS_CORRECTION` → `SUBMITTED`; qualquer outra transição de
status exige `is_admin()` (usado pelas funções de moderação).

## Testes de segurança obrigatórios

Todos executados em `supabase/tests/rls_idor.sql` contra o banco real:

1. Usuário A não lê submission B. ✅
2. Usuário A não altera submission B. ✅
3. Usuário A não exclui submission B. ✅
4. Usuário comum não altera role de profile. ✅ (gera erro de RLS, não falha silenciosa — ver nota no arquivo de teste)
5. Usuário comum não aprova lista. ✅ (`approve_submission` levanta exceção para não-admin)
6. Usuário comum não altera campanha. ✅
7. Usuário comum não altera escola INEP. ✅
8. Usuário comum não acessa attachment privado de outro usuário. ✅ (tabela `submission_attachments` e `storage.objects`)
9. School Manager A não altera school B. ✅
10. Store Manager A não altera store B. ✅

## Storage

Dois buckets (`supabase/migrations/20260910201800_storage.sql`):

- **`public-assets`** (público): logos/fotos de escola e papelaria aprovados. `file_size_limit` 5MB, `allowed_mime_types` restrito a `image/jpeg|png|webp` (enforced nativamente pelo Storage, não via RLS). Caminho `{schools|stores}/{entity_id}/arquivo` — INSERT/UPDATE/DELETE exigem `is_school_manager`/`is_store_manager` do `entity_id` no caminho, ou admin.
- **`submissions`** (privado): anexos de contribuição. `file_size_limit` 10MB, `allowed_mime_types` restrito a `application/pdf|image/jpeg|png`. Caminho `{user_id}/{submission_id}/arquivo` — ownership é a própria comparação de string do primeiro segmento do caminho com `auth.uid()`. Admin tem policy de SELECT separada (só leitura, para moderação) — nunca upload/delete em nome do usuário.

Testado (teste 08b): usuário A não vê o `storage.objects` de um anexo
privado do usuário B.

## RBAC de aplicação (Prompt 03 — auth, profiles e RBAC)

Camada complementar à RLS, não um substituto dela: RLS continua sendo a
autoridade final mesmo que a camada de aplicação tenha um bug.

- **Sessão SSR:** `@supabase/ssr`, cookies via `src/lib/supabase/server.ts`
  (Server Components/Actions/Route Handlers) e `src/lib/supabase/proxy.ts`
  (`updateSession`, chamado pelo `src/proxy.ts` — convenção `proxy`, não
  `middleware`, ver seção correspondente em WORKFLOW.md). Sempre
  `getUser()`, nunca `getSession()`, nos pontos de decisão de acesso —
  `getSession()` só decodifica o JWT local, `getUser()` revalida contra o
  servidor de Auth.
- **Gate de rota:** `src/proxy.ts` roda em toda request, refaz o cookie de
  sessão e redireciona visitante anônimo para `/auth/entrar?next=...` em
  `/minha-conta`, `/enviar-lista`, `/sugerir-escola` e `/admin`. Isso é só
  o gate "está logado?" — é rápido e roda no edge, sem acesso a papel.
- **Gate de papel:** cada layout server-side desses grupos chama
  `requireUser()`/`requireRole()` (`src/lib/auth/session.ts`) como segunda
  camada (defesa em profundidade — funciona mesmo se o matcher do proxy
  tiver algum bug) e, no caso de `/admin`, lê `profiles.role` de verdade no
  banco (nunca confia em claim de JWT — o Supabase não inclui papel
  customizado no token por padrão aqui). Papéis permitidos em `/admin`:
  `ADMIN`, `SUPER_ADMIN` (`ADMIN_ROLES` em `src/lib/auth/roles.ts`, espelha
  `is_admin()`). Usuário autenticado sem papel suficiente vê uma tela de
  "Acesso restrito" (não é redirecionado de volta ao login — já está
  autenticado, redirecionar de novo para login seria confuso).
- **Redirect seguro (`next`):** `src/lib/safe-redirect.ts` — só aceita
  caminho relativo de único `/`; rejeita `//host`, `/\host`, `scheme://` e
  qualquer coisa cuja origem resolvida difira da própria app. Usado no
  proxy, no formulário de login e no callback de e-mail.
- **Testado ao vivo** (Playwright + 3 usuários seedados diretamente via
  SQL com senha real via `pgcrypto`, depois removidos): anônimo bloqueado
  nas 4 áreas; usuário comum acessa conta/contribuição mas recebe "Acesso
  restrito" em `/admin`; `SCHOOL_MANAGER` tratado igual a usuário comum
  para esse fim (não escala para admin); `ADMIN` acessa tudo; logout
  revoga acesso imediatamente; senha errada mostra erro genérico (sem
  enumeração); `next` malicioso (`https://evil.com`, `//evil.com`) é
  ignorado e cai no fallback. 17/17 verificações passaram — ver PR do
  Prompt 03 para o script.
- **Armadilha para reproduzir isso no futuro:** inserir usuário direto via
  SQL (como em `supabase/tests/rls_idor.sql`) é suficiente para simular
  papel em teste de RLS, mas **não é suficiente para login real** —
  colunas de token do GoTrue (`confirmation_token`, `recovery_token`,
  `email_change*`, `phone_change*`, `reauthentication_token`) precisam ser
  `''` (string vazia), não `NULL`, ou o GoTrue quebra com "converting NULL
  to string is unsupported" ao tentar autenticar. Ver WORKFLOW.md, seção
  "Autenticação (Supabase Auth)", para o restante das armadilhas
  descobertas (domínio de e-mail de teste, rate limit de envio).

## Secrets

- Browser: somente variáveis `NEXT_PUBLIC_*` que sejam realmente publicáveis. Ver `.env.example`.
- Server: Supabase secret/service key, geocoding secrets e outras credenciais privadas.
- Não usar defaults de segredo no repositório.

## XSS

Campos livres são tratados como texto. Quando rich text for necessário, sanitização deve ocorrer antes de persistência/renderização e os testes devem cobrir `script`, `javascript:` e atributos perigosos. (Ainda não há renderização de rich text implementada — nenhuma tela existe ainda.)
