-- Hardening pós-MVP: corrige o advisor `auth_rls_initplan` (WARN, 26
-- ocorrências) em todas as policies afetadas. `auth.uid()` é STABLE e não
-- depende de nenhuma coluna da linha -- sem o `(select ...)`, o Postgres
-- reavalia a chamada uma vez por linha em vez de uma vez por consulta
-- (InitPlan). `(select auth.uid())` é o padrão que o próprio projeto já
-- usa em toda policy escrita depois da inicial (ex.:
-- profiles_update_own's WITH CHECK já teria pego essa forma se tivesse
-- sido escrita hoje) -- estas 26 são as que sobraram do template
-- original, antes desse padrão existir.
--
-- Mudança puramente mecânica: mesma expressão, resultado idêntico linha a
-- linha, zero mudança de quem pode ver/escrever o quê. Verificado nos
-- comentários de cada bloco abaixo (texto exato de `qual`/`with_check`
-- lido ao vivo via pg_policies antes de escrever esta migration, para
-- garantir que nenhuma condição fosse alterada por engano). `ALTER
-- POLICY` (não drop+create) preserva a policy em si -- só troca a
-- expressão de USING/WITH CHECK; `TO authenticated` é omitido em todas
-- porque nenhuma tem seus roles alterados.
--
-- Não inclui as ocorrências de `multiple_permissive_policies` (54,
-- também WARN) -- ver docs/security/rls-review.md para por que essa
-- outra categoria foi deliberadamente deixada fora desta passada.

alter policy "favorites_select_own" on public.favorites
  using (profile_id = (select auth.uid()));

alter policy "favorites_insert_own" on public.favorites
  with check (profile_id = (select auth.uid()));

alter policy "favorites_delete_own" on public.favorites
  using (profile_id = (select auth.uid()));

alter policy "list_submissions_select_own" on public.list_submissions
  using (submitted_by = (select auth.uid()));

alter policy "list_submissions_insert_own" on public.list_submissions
  with check (submitted_by = (select auth.uid()) and status = 'DRAFT'::public.submission_status);

alter policy "list_submissions_update_own_editable" on public.list_submissions
  using (
    submitted_by = (select auth.uid())
    and status = any (array['DRAFT'::public.submission_status, 'NEEDS_CORRECTION'::public.submission_status])
  )
  with check (submitted_by = (select auth.uid()));

alter policy "list_submissions_delete_own_draft" on public.list_submissions
  using (submitted_by = (select auth.uid()) and status = 'DRAFT'::public.submission_status);

alter policy "profiles_select_own" on public.profiles
  using (id = (select auth.uid()));

alter policy "profiles_update_own" on public.profiles
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = (select p.role from public.profiles p where p.id = (select auth.uid()))
  );

alter policy "reports_select_own" on public.reports
  using (reported_by = (select auth.uid()));

alter policy "reports_insert_own" on public.reports
  with check (reported_by = (select auth.uid()));

alter policy "reviews_select_own" on public.reviews
  using (profile_id = (select auth.uid()));

alter policy "reviews_insert_own_pending" on public.reviews
  with check (profile_id = (select auth.uid()) and status = 'PENDING'::public.review_status);

alter policy "reviews_update_own_pending" on public.reviews
  using (profile_id = (select auth.uid()) and status = 'PENDING'::public.review_status)
  with check (profile_id = (select auth.uid()) and status = 'PENDING'::public.review_status);

alter policy "school_images_manager_write" on public.school_images
  with check (public.is_school_manager(school_id) and submitted_by = (select auth.uid()));

alter policy "school_managers_select_own" on public.school_managers
  using (profile_id = (select auth.uid()));

alter policy "school_suggestions_select_own" on public.school_suggestions
  using (suggested_by = (select auth.uid()));

alter policy "school_suggestions_insert_own" on public.school_suggestions
  with check (suggested_by = (select auth.uid()));

alter policy "store_managers_select_own" on public.store_managers
  using (profile_id = (select auth.uid()));

alter policy "submission_attachments_select_own" on public.submission_attachments
  using (exists (
    select 1 from public.list_submissions s
    where s.id = submission_attachments.submission_id and s.submitted_by = (select auth.uid())
  ));

alter policy "submission_attachments_insert_own_editable" on public.submission_attachments
  with check (
    uploaded_by = (select auth.uid())
    and exists (
      select 1 from public.list_submissions s
      where s.id = submission_attachments.submission_id
        and s.submitted_by = (select auth.uid())
        and s.status = any (array['DRAFT'::public.submission_status, 'NEEDS_CORRECTION'::public.submission_status])
    )
  );

alter policy "submission_attachments_delete_own_editable" on public.submission_attachments
  using (exists (
    select 1 from public.list_submissions s
    where s.id = submission_attachments.submission_id
      and s.submitted_by = (select auth.uid())
      and s.status = any (array['DRAFT'::public.submission_status, 'NEEDS_CORRECTION'::public.submission_status])
  ));

alter policy "submission_items_select_own" on public.submission_items
  using (exists (
    select 1 from public.list_submissions s
    where s.id = submission_items.submission_id and s.submitted_by = (select auth.uid())
  ));

alter policy "submission_items_write_own_editable" on public.submission_items
  with check (exists (
    select 1 from public.list_submissions s
    where s.id = submission_items.submission_id
      and s.submitted_by = (select auth.uid())
      and s.status = any (array['DRAFT'::public.submission_status, 'NEEDS_CORRECTION'::public.submission_status])
  ));

alter policy "submission_items_update_own_editable" on public.submission_items
  using (exists (
    select 1 from public.list_submissions s
    where s.id = submission_items.submission_id
      and s.submitted_by = (select auth.uid())
      and s.status = any (array['DRAFT'::public.submission_status, 'NEEDS_CORRECTION'::public.submission_status])
  ))
  with check (exists (
    select 1 from public.list_submissions s
    where s.id = submission_items.submission_id
      and s.submitted_by = (select auth.uid())
      and s.status = any (array['DRAFT'::public.submission_status, 'NEEDS_CORRECTION'::public.submission_status])
  ));

alter policy "submission_items_delete_own_editable" on public.submission_items
  using (exists (
    select 1 from public.list_submissions s
    where s.id = submission_items.submission_id
      and s.submitted_by = (select auth.uid())
      and s.status = any (array['DRAFT'::public.submission_status, 'NEEDS_CORRECTION'::public.submission_status])
  ));
