# RLS review focado (hardening pós-MVP)

Revisão dos advisors do Supabase (`get_advisors`, security + performance)
contra o projeto real (`wfdejmokxrunupsekcmq`), mais uma varredura de
sanidade em RLS/Storage. Não é uma reescrita — só o que teve benefício
claro para o MVP foi corrigido; o resto está documentado com o motivo de
ficar para depois. Complementa (não substitui) `docs/security/rls.md`
(Prompt 02) e a seção de RLS de `docs/security/final-audit.md` (Prompt
16), que seguem válidas.

## Achados de segurança (`get_advisors type=security`)

- **`rls_enabled_no_policy`** (INFO, 3): `auth_login_attempts`,
  `inep_import_staging`, `rate_limit_hits`. Todas de propósito — só
  funções `SECURITY DEFINER` tocam essas tabelas (mesmo padrão
  documentado em cada uma). Nada a corrigir.
- **`anon_security_definer_function_executable`** (WARN, 4):
  `check_login_rate_limit`, `record_login_attempt`,
  `record_analytics_event`, `search_schools`. Todas legitimamente
  pré-auth (login, analytics anônimo, busca pública). ACL confirmada ao
  vivo — sem grant a mais que o necessário.
- **`authenticated_security_definer_function_executable`** (WARN, 30):
  toda função administrativa/de moderação do projeto. Cada uma checada
  no corpo (não só pelo nome): todas são gated por `is_admin()`,
  escopadas por `auth.uid()`, ou tratam sessão ausente como caso de
  saída antecipada. `guard_submission_status_transition`,
  `handle_new_user` e `unique_slug` — que NÃO deveriam ser chamáveis por
  ninguém além do Postgres via trigger — foram confirmadas ausentes desta
  lista (ACL só tem `postgres`/`service_role`). Nada a corrigir.

## Achados de performance (`get_advisors type=performance`) e o que foi feito

### Corrigido nesta passada: `auth_rls_initplan` (WARN, 26 ocorrências)

`auth.uid()` usado direto (sem `(select ...)`) faz o Postgres reavaliar a
chamada uma vez **por linha** em vez de uma vez por consulta. Mudança
100% mecânica — mesma expressão, resultado idêntico linha a linha, zero
mudança de quem acessa o quê. Aplicado em
`supabase/migrations/20260912010000_rls_wrap_auth_uid_initplan.sql` via
`ALTER POLICY` (26 policies, 11 tabelas: `favorites`, `list_submissions`,
`profiles`, `reports`, `reviews`, `school_images`, `school_managers`,
`school_suggestions`, `store_managers`, `submission_attachments`,
`submission_items`).

**Verificação ao vivo, não só teórica:**
- `get_advisors(performance)` re-executado depois da migration: `auth_rls_initplan`
  não aparece mais na lista (confirmado, zero ocorrências restantes).
- `supabase/tests/rls_idor.sql` (26 asserções — a mesma suíte do Prompt
  02, cobrindo exatamente as tabelas tocadas: `list_submissions`,
  `submission_attachments`, `profiles`, mais os controles positivos de
  admin/school-manager/anon) rodado de novo, ao vivo, depois da migration:
  **26/26 passando**, nenhuma regressão.

### Deliberadamente adiado: `multiple_permissive_policies` (WARN, 54 ocorrências, ~25 tabelas)

Todo caso é o mesmo padrão: uma policy "dona/pública" (ex.:
`list_submissions_select_own`, `schools_select_active`) mais uma policy
`_admin_all` cobrindo a mesma ação para `authenticated`. Policies
permissivas se combinam por OR — analisado caso a caso (inclusive o único
caso com 3 policies na mesma ação, `reviews` SELECT): em todos, o
resultado já é exatamente a união de quem deveria ter acesso, nunca mais
amplo que isso. **Não há bug de autorização em nenhum dos 54.**

O ganho de mesclar essas policies é só de performance (uma policy a menos
avaliada por consulta) — e hoje esse custo é zero: todos os 54 achados
são especificamente `role authenticated` (nenhum afeta a navegação
anônima, que é o único tráfego real hoje) e as tabelas envolvidas têm 0
linhas em produção (`profiles`, `list_submissions`, `reviews`,
`favorites`, `stores`, etc. — ver `docs/implementation/mvp-gap-analysis.md`
e a validação de dados desta mesma auditoria). Mesclar as 25 tabelas
agora trocaria ~50 `drop policy`/`create policy` por um ganho que só
existe quando houver sessões autenticadas de verdade.

Padrão de correção fica documentado aqui para quando isso deixar de ser
verdade (ex.: `schools`, já com policy pública, mescla direto):

```sql
-- exemplo -- schools, ação SELECT (mesmo padrão para os outros 24 casos)
drop policy "schools_select_active" on public.schools;
drop policy "schools_admin_select" on public.schools;
create policy "schools_select_active_or_admin" on public.schools
  for select to public
  using (is_active or public.is_admin());
-- seguro: is_admin() é false para anon (lê auth.uid(), nulo pré-auth),
-- então a policy mesclada colapsa exatamente para "is_active" no caso
-- anônimo -- nenhum acesso novo é aberto.
```

Tabelas na mesma situação (todas com o par owner/public + `_admin_all`,
todas 0 ou baixíssima cardinalidade hoje): `ecommerce_partners`,
`ecommerce_products`, `favorites`, `list_product_mappings`,
`list_submissions`, `products`, `profiles`, `reports`, `reviews`,
`school_contacts`, `school_education_levels`, `school_images`,
`school_list_items`, `school_list_versions`, `school_lists`,
`school_managers`, `school_profiles`, `school_series`,
`school_suggestions`, `schools`, `store_contacts`, `store_managers`,
`store_services`, `stores`, `submission_attachments`,
`submission_items`. Revisitar quando `profiles` deixar de ter 0 linhas
(primeiro sinal real de tráfego autenticado).

### Não acionável agora: `unindexed_foreign_keys` (INFO, 26) e `unused_index` (INFO, 12)

- As 26 FKs sem índice são todas em tabelas administrativas/de auditoria
  de baixíssimo volume esperado (`audit_logs`, `campaigns`,
  `partner_sale_reports`, `reports`, `reviews.moderated_by`, etc.) — sem
  caminho de leitura anônima ou de alto tráfego passando por elas hoje.
- Os 12 índices "não usados" são artefato de um banco pré-lançamento (0
  cadastros): `stores_name_trgm` está corretamente criado (confirmado via
  `pg_indexes`) e simplesmente não tem uso porque `stores` está vazia;
  `school_lists_status_idx` e `rate_limit_hits_lookup_idx` foram
  adicionados nas duas migrations de performance/hardening mais recentes
  deste próprio projeto, para padrões de consulta que só existirão com
  dado real. **Não remover nenhum destes.**

## Varredura de sanidade (RLS habilitada + Storage)

- **RLS habilitada em todas as 35 tabelas `public`** (`pg_class.relrowsecurity`),
  confirmado ao vivo — não só nas 17 citadas na tarefa. Nenhuma com
  `relforcerowsecurity` (esperado — é o que permite as funções agregadoras
  `SECURITY DEFINER`, como `search_schools()`, lerem através de RLS com
  seus próprios filtros internos).
- **Nenhuma tabela exposta ao PostgREST com RLS habilitada e zero
  policies para um papel que precisa de acesso.** As 3 tabelas
  zero-policy (`auth_login_attempts`, `rate_limit_hits`,
  `inep_import_staging`) são as mesmas do achado de segurança acima —
  intencionais.
- **Bucket `submissions` (privado):** sem policy de SELECT pública;
  acesso via `(storage.foldername(name))[1] = auth.uid()::text`
  (dono) + `is_admin()` (SELECT). Confirmado privado de verdade, não só
  por convenção de nome.
- **Bucket `public-assets` (público de propósito):** `SELECT` é
  realmente público (`bucket_id = 'public-assets'`, sem outro filtro) —
  este é o Achado 4 já registrado em `docs/security/final-audit.md`
  (ausência de gate por aprovação no nível do arquivo), não um achado
  novo. Continua dormant: `school_managers`/`store_managers` seguem com 0
  linhas e não existe UI de upload de manager em `src/` — corrigir esse
  gate agora, sem nenhuma feature real para testar contra, seria
  construir uma validação às cegas. Escritas (`insert/update/delete`) já
  são corretamente restritas a `is_admin()`/`is_school_manager(...)`/
  `is_store_manager(...)` escopado pelo id da entidade no caminho — sem
  IDOR de escrita entre entidades.

## Conclusão

`docs/security/rls.md`/`final-audit.md` seguem precisos — nenhum dos dois
ficou desatualizado pelas 7 funções `SECURITY DEFINER` adicionadas desde o
Prompt 16 (todas com o mesmo padrão de least-privilege já documentado).
Uma correção real e segura foi aplicada (`auth_rls_initplan`, 26
policies, verificada ao vivo com zero regressão); uma categoria inteira de
achado (`multiple_permissive_policies`) foi analisada uma a uma,
confirmada sem risco de segurança, e deliberadamente adiada com o padrão
de correção já pronto para quando o volume de dado justificar; o resto
dos achados são ruído esperado de um banco pré-lançamento.
