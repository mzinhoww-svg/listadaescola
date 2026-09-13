-- Onda 7 -- Escola: perfil reivindicado (docs/product/roadmap-ondas.md
-- "Onda 7"; decisão de verificação registrada em
-- docs/product/school-claim.md).
--
-- O que estava faltando, e por quê esta migration existe:
--
--   (a) O papel SCHOOL_MANAGER existia no enum `user_role` desde o
--       Prompt 01 e `is_school_manager()` já era usado em 10 policies,
--       mas a ÚNICA forma de virar gestor era um admin inserir a linha
--       em `school_managers` na unha -- não havia caminho de
--       reivindicação. Em produção: 0 linhas em `school_managers`.
--   (b) Um gestor de escola não tinha como publicar a lista da própria
--       escola: `admin_publish_list` (20260913010000) exige `is_admin()`
--       e `approve_submission()` exige admin + guarda de auto-aprovação.
--
-- DECISÃO DE PRODUTO (reversível -- ver docs/product/school-claim.md):
-- reivindicação com REVISÃO HUMANA pelo admin. Não existe sinal
-- automático confiável de vínculo para a maioria das escolas públicas de
-- MT (não têm domínio próprio de e-mail), e inventar um seria fabricar
-- verificação. O reivindicante declara nome, cargo/vínculo, um contato
-- institucional e uma justificativa; o admin decide olhando isso lado a
-- lado com os dados INEP da escola.
--
-- Depois de aprovado, o gestor é tratado como fonte autoritativa da
-- própria escola: publica lista DIRETO (sem fila), mas com auditoria
-- completa e com o admin podendo arquivar. Ele NÃO ganha poder sobre
-- master data do INEP (nome, código INEP, endereço) -- `schools` continua
-- com escrita só de admin (`schools_admin_all`), e nada aqui muda isso.

-- ---------------------------------------------------------------------
-- 1. Tabela de reivindicação
-- ---------------------------------------------------------------------
--
-- Nome `school_claims` (e não `school_manager_requests`): "claim" é o que
-- a linha representa -- uma afirmação de vínculo que ainda não é verdade
-- verificada. O vínculo em si, depois de aprovado, continua morando em
-- `school_managers`; esta tabela é o pedido + o rastro da decisão.
--
-- Reusa o enum `submission_status` (mesma escolha de
-- `school_suggestions`) em vez de criar um enum novo de 3 valores: a fila
-- do admin já sabe renderizar esses rótulos, e só SUBMITTED/APPROVED/
-- REJECTED são usados aqui.
--
-- `claimant_name` é declarado e guardado separado de `profiles.full_name`
-- de propósito: o nome da conta pode ser apelido, e o que o admin precisa
-- avaliar é o nome que a pessoa afirma ter dentro da escola. Guardar a
-- declaração como ela foi feita é o que torna a decisão auditável depois.

create table public.school_claims (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  claimed_by uuid not null references public.profiles (id),
  claimant_name text not null,
  claimant_role text not null,
  institutional_contact text not null,
  justification text not null,
  status public.submission_status not null default 'SUBMITTED',
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint school_claims_claimant_name_len
    check (length(btrim(claimant_name)) between 2 and 200),
  constraint school_claims_claimant_role_len
    check (length(btrim(claimant_role)) between 2 and 200),
  constraint school_claims_institutional_contact_len
    check (length(btrim(institutional_contact)) between 5 and 200),
  constraint school_claims_justification_len
    check (length(btrim(justification)) between 20 and 1000),
  constraint school_claims_rejection_reason_len
    check (rejection_reason is null or length(btrim(rejection_reason)) between 1 and 1000)
);

comment on table public.school_claims is
  'Onda 7: pedido de reivindicação de perfil de escola, revisado por humano (admin). Nunca cria vínculo sozinha -- admin_approve_school_claim() é que insere em school_managers.';

-- Impede duas reivindicações PENDENTES da mesma pessoa para a mesma
-- escola. Índice único PARCIAL, não constraint: depois de decidida
-- (APPROVED/REJECTED) a pessoa pode pedir de novo -- uma rejeição por
-- dados insuficientes tem que ser corrigível, e um vínculo revogado pelo
-- admin tem que poder ser repedido. Uma unique cheia em
-- (school_id, claimed_by) trancaria os dois casos para sempre.
create unique index school_claims_pending_unique_idx
  on public.school_claims (school_id, claimed_by)
  where status = 'SUBMITTED';

-- FKs e filtro de fila (mesma convenção de 20260911210000_performance_
-- audit_fixes.sql: todo FK novo nasce indexado).
create index school_claims_school_id_idx on public.school_claims (school_id);
create index school_claims_claimed_by_idx on public.school_claims (claimed_by);
create index school_claims_reviewed_by_idx on public.school_claims (reviewed_by);
-- A fila do admin filtra por status e ordena pelas mais antigas primeiro
-- (mesma convenção de getModerationQueue/getSchoolSuggestionQueue).
create index school_claims_queue_idx on public.school_claims (status, created_at);

alter table public.school_claims enable row level security;

-- Sem oráculo: quem não é admin só enxerga a própria reivindicação.
-- Nada aqui permite descobrir se OUTRA pessoa reivindicou uma escola --
-- nem a existência do pedido, nem o nome de quem pediu.
create policy "school_claims_select_own" on public.school_claims
  for select to authenticated
  using (claimed_by = (select auth.uid()));

-- INSERT preso ao próprio uid e ao estado inicial: ninguém entra na fila
-- já aprovado, nem se auto-atribui um revisor. (`(select auth.uid())` é o
-- padrão do projeto desde 20260912010000 -- InitPlan, não por estilo.)
create policy "school_claims_insert_own" on public.school_claims
  for insert to authenticated
  with check (
    claimed_by = (select auth.uid())
    and status = 'SUBMITTED'::public.submission_status
    and rejection_reason is null
    and reviewed_by is null
    and reviewed_at is null
  );

-- Deliberadamente SEM policy de UPDATE/DELETE para o dono: o pedido é
-- disparo único e imutável depois de enviado, igual a
-- `school_suggestions`. Quem decide é o admin, pelas RPCs abaixo.
create policy "school_claims_admin_all" on public.school_claims
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 2. Decisão do admin: aprovar / rejeitar
-- ---------------------------------------------------------------------
--
-- Espelha approve_school_suggestion/reject_school_suggestion
-- (20260911160000_admin_crud.sql) na forma, e a guarda de auto-revisão de
-- 20260911150000_moderation_guards.sql no conteúdo: um admin que
-- reivindica uma escola NÃO decide o próprio pedido. Aqui isso importa
-- mais que em qualquer outro lugar do sistema -- o pedido é justamente
-- "me dê poder sobre esta escola".

create or replace function public.admin_approve_school_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.school_claims;
  v_role public.user_role;
  v_promoted boolean := false;
begin
  if not public.is_admin() then
    raise exception 'only admins may review school claims';
  end if;

  select * into v_claim from public.school_claims where id = p_claim_id for update;
  if v_claim is null then
    raise exception 'claim % not found', p_claim_id;
  end if;
  if v_claim.claimed_by = auth.uid() then
    raise exception 'you cannot review your own claim';
  end if;
  if v_claim.status <> 'SUBMITTED' then
    raise exception 'claim % is not awaiting review (status=%)', p_claim_id, v_claim.status;
  end if;

  -- O vínculo REAL. É esta linha -- não `profiles.role` -- que
  -- `is_school_manager()` lê, e portanto é ela que autoriza de fato.
  insert into public.school_managers (school_id, profile_id)
  values (v_claim.school_id, v_claim.claimed_by)
  on conflict (school_id, profile_id) do nothing;

  -- Promoção de papel: reusa admin_set_user_role() em vez de um UPDATE
  -- direto em profiles -- ela já valida o papel, bloqueia autoalteração,
  -- aplica rate limit e grava ADMIN_SET_USER_ROLE no audit log
  -- (20260912000000_hardening_rn004_sec008_expand.sql).
  --
  -- SÓ promove quem está em 'USER'. Chamar isso para um EDITOR, um
  -- STORE_MANAGER ou (pior) um ADMIN seria REBAIXAR a pessoa: o papel é
  -- um valor único, não um conjunto. Como o vínculo já foi gravado acima
  -- e é ele que autoriza, não promover não tira nada de ninguém -- só
  -- deixa `profiles.role` como estava.
  select role into v_role from public.profiles where id = v_claim.claimed_by for update;
  if v_role = 'USER' then
    perform public.admin_set_user_role(v_claim.claimed_by, 'SCHOOL_MANAGER');
    v_promoted := true;
  end if;

  update public.school_claims
  set status = 'APPROVED', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_claim_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'APPROVE_SCHOOL_CLAIM', 'school_claims', p_claim_id,
    to_jsonb(v_claim),
    jsonb_build_object(
      'status', 'APPROVED',
      'school_id', v_claim.school_id,
      'profile_id', v_claim.claimed_by,
      'role_promoted', v_promoted,
      'role_before', v_role
    )
  );
end;
$$;

comment on function public.admin_approve_school_claim(uuid) is
  'Onda 7: aprova uma reivindicação de escola -- cria o vínculo em school_managers, promove o perfil para SCHOOL_MANAGER apenas se ele ainda for USER (nunca rebaixa EDITOR/STORE_MANAGER/ADMIN) e grava auditoria. SECURITY DEFINER, exige is_admin() e proíbe auto-revisão.';

create or replace function public.admin_reject_school_claim(p_claim_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.school_claims;
begin
  if not public.is_admin() then
    raise exception 'only admins may review school claims';
  end if;

  select * into v_claim from public.school_claims where id = p_claim_id for update;
  if v_claim is null then
    raise exception 'claim % not found', p_claim_id;
  end if;
  if v_claim.claimed_by = auth.uid() then
    raise exception 'you cannot review your own claim';
  end if;
  if v_claim.status <> 'SUBMITTED' then
    raise exception 'claim % is not awaiting review (status=%)', p_claim_id, v_claim.status;
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'a rejection reason is required';
  end if;

  update public.school_claims
  set status = 'REJECTED', rejection_reason = btrim(p_reason), reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_claim_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'REJECT_SCHOOL_CLAIM', 'school_claims', p_claim_id,
    to_jsonb(v_claim),
    jsonb_build_object('status', 'REJECTED', 'rejection_reason', btrim(p_reason))
  );
end;
$$;

comment on function public.admin_reject_school_claim(uuid, text) is
  'Onda 7: rejeita uma reivindicação de escola com motivo obrigatório (o requerente lê esse motivo). SECURITY DEFINER, exige is_admin() e proíbe auto-revisão.';

-- ---------------------------------------------------------------------
-- 3. Publicação de lista pelo gestor da escola
-- ---------------------------------------------------------------------
--
-- Irmã de `admin_publish_list` (20260913010000). Mesma assinatura, mesmo
-- comportamento, MESMO laço de colisão de slug e mesma criação de versão
-- nova a cada publicação (RN-007) -- deliberadamente espelhada, não
-- reinventada. Duas diferenças, ambas de propósito:
--
--   1. O gate é `is_school_manager(p_school_id)` em vez de `is_admin()`.
--      Nota: `is_school_manager()` já devolve true para admin
--      (20260910200900_rls_helper_functions.sql), então esta função é um
--      superconjunto -- não há caminho que o admin perca.
--   2. A ação de auditoria tem nome próprio, SCHOOL_MANAGER_PUBLISH_LIST,
--      distinguível de ADMIN_PUBLISH_LIST e de APPROVE_SUBMISSION. Sem
--      isso, o audit log não conseguiria responder "quem colocou esta
--      lista no ar, a equipe ou a escola?" -- que é exatamente a pergunta
--      que a Onda 7 cria.
--
-- Não há guarda de auto-aprovação aqui, pela mesma razão de
-- admin_publish_list: não existe terceiro. O gestor É a fonte. O que
-- substitui a moderação é a verificação humana que aconteceu ANTES, na
-- aprovação da reivindicação, mais o audit log e o poder do admin de
-- arquivar a lista depois (admin_set_school_list_status).

create or replace function public.school_manager_publish_list(
  p_school_id uuid,
  p_education_level text,
  p_series_name text,
  p_school_year int,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school public.schools;
  v_list_id uuid;
  v_version_id uuid;
  v_next_version int;
  v_slug text;
  v_slug_base text;
  v_suffix int := 1;
  v_item_count int;
begin
  if not public.is_school_manager(p_school_id) then
    raise exception 'only this school''s managers may publish its lists';
  end if;

  select * into v_school from public.schools where id = p_school_id;
  if v_school is null then
    raise exception 'school % not found', p_school_id;
  end if;
  if not v_school.is_active then
    raise exception 'school % is not active', p_school_id;
  end if;

  if p_education_level is null or btrim(p_education_level) = '' then
    raise exception 'education_level is required';
  end if;
  if p_series_name is null or btrim(p_series_name) = '' then
    raise exception 'series_name is required';
  end if;
  if p_school_year is null or p_school_year < 2000 or p_school_year > 2100 then
    raise exception 'school_year % is out of range', p_school_year;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items must be a json array';
  end if;
  select count(*) into v_item_count from jsonb_array_elements(p_items);
  if v_item_count = 0 then
    raise exception 'a list needs at least one item';
  end if;

  select id into v_list_id
  from public.school_lists
  where school_id = p_school_id
    and education_level = btrim(p_education_level)
    and series_name = btrim(p_series_name)
    and school_year = p_school_year;

  if v_list_id is null then
    v_slug_base := public.slugify(
      coalesce(v_school.slug, p_school_id::text)
      || '-' || p_school_year::text
      || '-' || btrim(p_series_name)
    );
    v_slug := v_slug_base;
    while exists (select 1 from public.school_lists where slug = v_slug) loop
      v_suffix := v_suffix + 1;
      v_slug := v_slug_base || '-' || v_suffix::text;
    end loop;

    insert into public.school_lists (school_id, education_level, series_name, school_year, slug)
    values (p_school_id, btrim(p_education_level), btrim(p_series_name), p_school_year, v_slug)
    returning id into v_list_id;
  else
    update public.school_lists set status = 'APPROVED', updated_at = now() where id = v_list_id;
  end if;

  select coalesce(max(version_number), 0) + 1 into v_next_version
  from public.school_list_versions where school_list_id = v_list_id;

  insert into public.school_list_versions (school_list_id, version_number, status, submission_id, published_by)
  values (v_list_id, v_next_version, 'PUBLISHED', null, auth.uid())
  returning id into v_version_id;

  insert into public.school_list_items
    (school_list_version_id, name, quantity, unit, brand, is_required, notes, sort_order)
  select
    v_version_id,
    btrim(item.value ->> 'name'),
    greatest(1, coalesce((item.value ->> 'quantity')::int, 1)),
    nullif(btrim(coalesce(item.value ->> 'unit', '')), ''),
    nullif(btrim(coalesce(item.value ->> 'brand', '')), ''),
    coalesce((item.value ->> 'is_required')::boolean, true),
    nullif(btrim(coalesce(item.value ->> 'notes', '')), ''),
    (item.ordinality - 1)::int
  from jsonb_array_elements(p_items) with ordinality as item(value, ordinality)
  where btrim(coalesce(item.value ->> 'name', '')) <> '';

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'SCHOOL_MANAGER_PUBLISH_LIST', 'school_lists', v_list_id,
    null,
    jsonb_build_object(
      'school_list_version_id', v_version_id,
      'version_number', v_next_version,
      'school_id', p_school_id,
      'education_level', btrim(p_education_level),
      'series_name', btrim(p_series_name),
      'school_year', p_school_year,
      'item_count', v_item_count
    )
  );

  return v_version_id;
end;
$$;

comment on function public.school_manager_publish_list(uuid, text, text, int, jsonb) is
  'Onda 7: irmã de admin_publish_list para o gestor verificado publicar a lista da PRÓPRIA escola, sem fila de moderação. Gate is_school_manager(p_school_id); ação de auditoria própria (SCHOOL_MANAGER_PUBLISH_LIST). Republicar a mesma (escola, etapa, série, ano) cria versão nova, nunca sobrescreve (RN-007).';

revoke execute on function public.admin_approve_school_claim(uuid) from public;
revoke execute on function public.admin_reject_school_claim(uuid, text) from public;
revoke execute on function public.school_manager_publish_list(uuid, text, text, int, jsonb) from public;

grant execute on function public.admin_approve_school_claim(uuid) to authenticated;
grant execute on function public.admin_reject_school_claim(uuid, text) to authenticated;
grant execute on function public.school_manager_publish_list(uuid, text, text, int, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Policies que faltavam para a área do gestor existir de verdade
-- ---------------------------------------------------------------------
--
-- Só o que falta. Nada de RLS existente é reescrito aqui, exceto os dois
-- casos da seção 5 (que são correção de escalonamento, não refatoração).

-- O gestor precisa enxergar a própria lista mesmo depois de o admin
-- arquivá-la -- senão a lista some da área dele e ele republica achando
-- que nunca existiu. `school_lists_select_approved` é `to public` e só
-- mostra APPROVED.
create policy "school_lists_manager_select" on public.school_lists
  for select to authenticated
  using (public.is_school_manager(school_id));

-- Contatos: já havia INSERT e UPDATE do gestor, mas nem SELECT (o
-- público só enxerga `is_public = true`, então um contato interno ficava
-- invisível para quem o criou) nem DELETE (dava para adicionar um
-- telefone errado e nunca mais tirar).
create policy "school_contacts_manager_select" on public.school_contacts
  for select to authenticated
  using (public.is_school_manager(school_id));

create policy "school_contacts_manager_delete" on public.school_contacts
  for delete to authenticated
  using (public.is_school_manager(school_id));

-- Fotos: mesmo buraco. `school_images_select_approved` exige
-- `is_approved`, então uma foto ainda não aprovada era invisível até para
-- quem enviou; e não havia DELETE nenhum para o gestor.
create policy "school_images_manager_select" on public.school_images
  for select to authenticated
  using (public.is_school_manager(school_id));

create policy "school_images_manager_delete" on public.school_images
  for delete to authenticated
  using (public.is_school_manager(school_id));

-- ---------------------------------------------------------------------
-- 5. Escalonamento de privilégio que a Onda 7 acorda (correção obrigatória)
-- ---------------------------------------------------------------------
--
-- Até hoje `school_managers` tinha ZERO linhas em produção, então as
-- policies de gestor eram código morto e este buraco era teórico. A
-- Onda 7 cria gestores de verdade -- então ele deixa de ser teórico e
-- tem que fechar junto.
--
-- `school_profiles_manager_update` (20260910201000) tinha
-- `with check (public.is_school_manager(school_id))` e mais nada: um
-- gestor podia dar `update school_profiles set is_verified = true` na
-- própria escola e ganhar o selo "Verificada" que a página pública
-- renderiza -- exatamente o tipo de coisa que o selo existe para NÃO
-- deixar acontecer. Idem `is_sponsored` (hoje sem leitor -- a página usa
-- `is_entity_sponsored()` -- mas é campo de monetização, não de
-- conteúdo).
--
-- A correção usa o mesmo truque de `profiles_update_own`: o WITH CHECK
-- relê o valor ATUALMENTE gravado (a subquery enxerga o snapshot
-- anterior ao UPDATE), então qualquer tentativa de mudar aquele campo
-- falha. Admin não é afetado: `school_profiles_admin_all` é permissiva e
-- é OR'd com esta, e o caminho real do admin
-- (`admin_update_school`, SECURITY DEFINER) nem passa por RLS.
--
-- Precedente para tocar em policy já aplicada por drop+create numa
-- migration nova: 20260912000000_hardening_rn004_sec008_expand.sql fez
-- exatamente isso com `school_images_manager_write` (RN-004).

drop policy "school_profiles_manager_write" on public.school_profiles;
create policy "school_profiles_manager_write" on public.school_profiles
  for insert to authenticated
  with check (
    public.is_school_manager(school_id)
    and is_verified = false
    and is_sponsored = false
    and (updated_by is null or updated_by = (select auth.uid()))
  );

drop policy "school_profiles_manager_update" on public.school_profiles;
create policy "school_profiles_manager_update" on public.school_profiles
  for update to authenticated
  using (public.is_school_manager(school_id))
  with check (
    public.is_school_manager(school_id)
    and is_verified = (
      select sp.is_verified from public.school_profiles sp where sp.school_id = school_profiles.school_id
    )
    and is_sponsored = (
      select sp.is_sponsored from public.school_profiles sp where sp.school_id = school_profiles.school_id
    )
    and (updated_by is null or updated_by = (select auth.uid()))
  );

-- Mesma classe de problema em `school_images`, um degrau abaixo:
--
--   - `approved_by`: o gestor podia gravar o id de um admin qualquer e
--     fabricar um revisor que nunca revisou. Agora o campo tem que ficar
--     como está (não `is null`, que quebraria o gestor editar a legenda
--     de uma foto depois de o admin aprová-la).
--   - `is_approved` no UPDATE: sem isso, admin esconde a foto e o gestor
--     desesconde -- moderação em loop. No INSERT o campo fica livre de
--     propósito: o gestor verificado É a fonte da própria foto, e é isso
--     que "moderação mais leve depois de aprovado" quer dizer (o admin
--     continua podendo esconder depois, via school_images_admin_all).
--
-- `submitted_by = auth.uid()` da RN-004 é preservado, só reescrito com
-- `(select auth.uid())` para não reintroduzir o InitPlan que
-- 20260912010000 removeu do resto do schema.

drop policy "school_images_manager_write" on public.school_images;
create policy "school_images_manager_write" on public.school_images
  for insert to authenticated
  with check (
    public.is_school_manager(school_id)
    and submitted_by = (select auth.uid())
    and approved_by is null
  );

drop policy "school_images_manager_update" on public.school_images;
create policy "school_images_manager_update" on public.school_images
  for update to authenticated
  using (public.is_school_manager(school_id))
  with check (
    public.is_school_manager(school_id)
    and is_approved = (select si.is_approved from public.school_images si where si.id = school_images.id)
    and approved_by is not distinct from (
      select si.approved_by from public.school_images si where si.id = school_images.id
    )
  );
