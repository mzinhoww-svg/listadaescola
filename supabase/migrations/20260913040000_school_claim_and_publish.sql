-- Onda 7 -- Escola: perfil reivindicado
-- (docs/product/roadmap-ondas.md §"Onda 7"; docs/product/school-claim.md).
--
-- O que existia antes desta migration, medido ao vivo em produção:
--   * `school_managers` com RLS completa desde 20260910201000, e
--     `is_school_manager()` já usado em 10 policies -- mas **0 linhas** na
--     tabela e 0 perfis com papel SCHOOL_MANAGER. A única forma de virar
--     gestor era um admin inserir a linha na unha: não havia caminho de
--     reivindicação nenhum, e nenhuma rota do app para o papel;
--   * `admin_publish_list` (20260913010000) exige `is_admin()`, e
--     `approve_submission()` exige admin + guarda de auto-aprovação --
--     ou seja, o gestor de uma escola não tinha como publicar a lista da
--     própria escola por caminho algum;
--   * `/para-escolas` era uma página institucional cujo único link de
--     ação apontava para `/sugerir-escola` (o formulário de "escola que
--     não existe na base"), que não é o que uma escola já cadastrada
--     precisa.
--
-- ---------------------------------------------------------------------
-- DECISÃO DE PRODUTO (reversível -- ver docs/product/school-claim.md)
--
-- Como alguém prova que representa uma escola: **reivindicação com
-- revisão humana pelo admin**. E-mail em domínio da escola não serve para
-- a maioria das escolas públicas de MT (não têm domínio próprio), então
-- não existe sinal automático confiável -- e inventar um seria fabricar
-- verificação, que é a mesma família de erro que fabricar distância.
--
-- O reivindicante declara nome, cargo/vínculo, um contato institucional e
-- uma justificativa. O admin decide olhando isso lado a lado com os dados
-- INEP da escola (telefone e endereço oficiais, contatos e perfil
-- editorial já cadastrados).
--
-- Depois de aprovado, o gestor é tratado como fonte autoritativa da
-- própria escola: publica lista DIRETO, sem fila de moderação, mas com
-- auditoria completa e com o admin podendo arquivar depois. Ele **não**
-- ganha poder sobre master data do INEP -- nome, código INEP e endereço
-- oficial continuam com escrita só de admin (`schools_admin_all`), e nada
-- nesta migration muda isso.
-- ---------------------------------------------------------------------

-- =====================================================================
-- 1. school_claims -- a solicitação de vínculo
-- =====================================================================
--
-- Nome `school_claims` (e não `school_manager_requests`): "claim" é o que
-- a linha é -- uma afirmação de vínculo que ainda não é verdade
-- verificada. O vínculo em si continua morando em `school_managers`;
-- esta tabela é o pedido mais o rastro da decisão. Casa também com
-- `store_claims` (Onda 6, 20260913030000): mesma ideia, mesma forma.
--
-- Difere de `store_claims` num ponto: aqui `school_id` é NOT NULL. Não
-- existe "escola nova" por este caminho -- INEP é master data, e escola
-- que falta na base entra por `school_suggestions` (RF-008), que já
-- existe. Reivindicar é sempre reivindicar uma escola que já está lá.
--
-- `claimant_name` é guardado separado de `profiles.full_name` de
-- propósito: o nome da conta pode ser apelido, e o que o admin avalia é o
-- nome que a pessoa afirma ter dentro da escola. Guardar a declaração
-- como ela foi feita é o que torna a decisão auditável depois.

create table public.school_claims (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  claimed_by uuid not null references public.profiles (id) on delete cascade,

  claimant_name text not null,
  -- Cargo/vínculo declarado: "diretora", "secretária", "coordenadora
  -- pedagógica". Texto livre de propósito -- uma lista fechada de cargos
  -- erraria para escolas pequenas de MT, e o admin lê isso junto com a
  -- justificativa, não como chave de decisão automática.
  claimant_role text not null,
  -- Contato institucional (telefone ou e-mail DA ESCOLA, não da pessoa).
  -- É o material de conferência: o admin compara com `schools.phone`
  -- (INEP) e com `school_contacts`/`school_profiles`.
  institutional_contact text not null,
  justification text not null,

  -- Mesmo enum de school_suggestions/store_claims. Os outros estados
  -- (DRAFT, UNDER_REVIEW, NEEDS_CORRECTION, ARCHIVED) não têm fluxo aqui,
  -- e o CHECK os bloqueia em vez de deixá-los como estados fantasma.
  status public.submission_status not null default 'SUBMITTED',
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint school_claims_status_allowed
    check (status in ('SUBMITTED', 'APPROVED', 'REJECTED')),
  constraint school_claims_claimant_name_len
    check (length(btrim(claimant_name)) between 2 and 200),
  constraint school_claims_claimant_role_len
    check (length(btrim(claimant_role)) between 2 and 200),
  constraint school_claims_institutional_contact_len
    check (length(btrim(institutional_contact)) between 5 and 200),
  -- Piso de 20 caracteres: "sou o diretor" não é justificativa, é
  -- repetição do campo de cargo. O admin precisa de algo que dê para
  -- conferir.
  constraint school_claims_justification_len
    check (length(btrim(justification)) between 20 and 1000),
  constraint school_claims_rejection_reason_len
    check (rejection_reason is null or length(btrim(rejection_reason)) between 1 and 1000),
  -- Rejeitar sem dizer por quê não é rejeitar, é sumir com o pedido.
  constraint school_claims_rejected_needs_reason
    check (status <> 'REJECTED' or (rejection_reason is not null and btrim(rejection_reason) <> ''))
);

comment on table public.school_claims is
  'Onda 7: solicitação de "esta escola é minha", revisada por humano. Nunca cria vínculo sozinha -- approve_school_claim() é que insere em school_managers. RLS: INSERT/SELECT só do próprio solicitante (sem oráculo sobre reivindicações alheias), tudo mais só admin.';

comment on column public.school_claims.institutional_contact is
  'Contato DA ESCOLA (telefone/e-mail institucional), declarado pelo solicitante. É o material de conferência do admin contra schools.phone (INEP) e school_contacts -- não é canal de contato do sistema com a pessoa.';

create trigger set_school_claims_updated_at
  before update on public.school_claims
  for each row execute function public.set_updated_at();

-- Índices. Todo FK novo tem o seu (o advisor de performance cobra, e o
-- Postgres não indexa FK sozinho); nenhum deles é parcial -- índice
-- parcial não conta como cobertura de FK.
create index school_claims_school_idx on public.school_claims (school_id);
create index school_claims_claimed_by_idx on public.school_claims (claimed_by);
create index school_claims_reviewed_by_idx on public.school_claims (reviewed_by);
-- A fila do admin: filtra por status, ordena por created_at (mais antiga
-- primeiro, mesma convenção de getModerationQueue).
create index school_claims_queue_idx on public.school_claims (status, created_at);

-- Uma solicitação PENDENTE por (pessoa, escola). Índice único parcial, e
-- não constraint: depois de decidida a pessoa pode pedir de novo -- uma
-- rejeição por dados insuficientes tem que ser corrigível, e um vínculo
-- revogado pelo admin tem que poder ser repedido. Uma unique cheia em
-- (school_id, claimed_by) trancaria os dois casos para sempre.
create unique index school_claims_one_pending_per_school_idx
  on public.school_claims (school_id, claimed_by)
  where status = 'SUBMITTED';

alter table public.school_claims enable row level security;

-- O solicitante escreve uma vez e só. Sem UPDATE e sem DELETE para ele --
-- mesma escolha de school_suggestions e store_claims (single-shot,
-- imutável depois de enviada). O WITH CHECK fixa o estado inicial inteiro
-- para que ninguém nasça APROVADO chamando o PostgREST direto.
create policy "school_claims_insert_own" on public.school_claims
  for insert to authenticated
  with check (
    claimed_by = (select auth.uid())
    and status = 'SUBMITTED'::public.submission_status
    and rejection_reason is null
    and reviewed_by is null
    and reviewed_at is null
  );

-- Sem oráculo: a pessoa vê a própria solicitação e nada além. Não existe
-- (nem pode existir) leitura do tipo "esta escola já foi reivindicada?" --
-- seria exatamente o vazamento que este recorte impede.
create policy "school_claims_select_own" on public.school_claims
  for select to authenticated
  using (claimed_by = (select auth.uid()));

create policy "school_claims_admin_all" on public.school_claims
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Rate limit no banco, não só na Server Action: a policy de INSERT acima
-- é aberta para `authenticated`, então o PostgREST fala com esta tabela
-- direto. O índice parcial impede repetir a MESMA escola, mas nada
-- impediria reivindicar 2.722 escolas diferentes e afogar a fila do
-- moderador. Reusa a infraestrutura que já existe
-- (20260912000000_hardening_rn004_sec008_expand.sql) -- mesma tabela
-- `rate_limit_hits`, mesmas funções, chaveado por auth.uid() (nunca por
-- valor vindo do cliente).
create or replace function public.school_claims_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.check_rate_limit('school_claim_submit', 5, 60) then
    raise exception 'rate limit exceeded for school_claim_submit -- try again later';
  end if;
  perform public.record_rate_limit_hit('school_claim_submit');
  return new;
end;
$$;

create trigger school_claims_before_insert_trg
  before insert on public.school_claims
  for each row execute function public.school_claims_before_insert();

-- =====================================================================
-- 2. RPCs de moderação: aprovar / rejeitar a reivindicação
-- =====================================================================
--
-- Nomes espelham approve_school_suggestion/reject_school_suggestion
-- (20260911160000) e approve_store_claim/reject_store_claim
-- (20260913030000). Conteúdo espelha a guarda de auto-revisão de
-- 20260911150000_moderation_guards.sql -- aqui ela importa mais do que em
-- qualquer outro lugar do sistema: o pedido é literalmente "me dê poder
-- sobre esta escola", e um admin decidindo o próprio pedido é o caso de
-- conflito de interesse mais direto que existe neste schema.

create or replace function public.approve_school_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.school_claims;
  v_school public.schools;
  v_role public.user_role;
  v_promoted boolean := false;
begin
  if not public.is_admin() then
    raise exception 'only admins may review school claims';
  end if;

  select * into v_claim from public.school_claims where id = p_claim_id for update;
  if v_claim is null then
    raise exception 'school claim % not found', p_claim_id;
  end if;
  if v_claim.claimed_by = auth.uid() then
    raise exception 'you cannot review your own claim';
  end if;
  if v_claim.status <> 'SUBMITTED' then
    raise exception 'school claim % was already reviewed (%)', p_claim_id, v_claim.status;
  end if;

  select * into v_school from public.schools where id = v_claim.school_id;
  if v_school is null then
    raise exception 'school % referenced by claim % no longer exists', v_claim.school_id, p_claim_id;
  end if;
  if not v_school.is_active then
    raise exception 'school % is not active', v_claim.school_id;
  end if;

  -- O vínculo REAL. É esta linha -- não `profiles.role` -- que
  -- `is_school_manager()` lê, e portanto é ela que autoriza de fato.
  insert into public.school_managers (school_id, profile_id)
  values (v_claim.school_id, v_claim.claimed_by)
  on conflict (school_id, profile_id) do nothing;

  -- Promoção de papel: reusa admin_set_user_role() (Prompt 20 +
  -- 20260912000000), que já valida o papel, bloqueia autoalteração, tem
  -- rate limit embutido e grava ADMIN_SET_USER_ROLE no audit log. Só
  -- promove quem é 'USER': um EDITOR, um STORE_MANAGER ou um ADMIN que
  -- também dirija uma escola NÃO é rebaixado para SCHOOL_MANAGER -- papel
  -- é valor único, não conjunto. Como o vínculo acima é o que autoriza,
  -- não promover não tira nada de ninguém.
  select p.role into v_role from public.profiles p where p.id = v_claim.claimed_by;
  if v_role = 'USER' then
    perform public.admin_set_user_role(v_claim.claimed_by, 'SCHOOL_MANAGER');
    v_promoted := true;
  end if;

  update public.school_claims
  set status = 'APPROVED',
      rejection_reason = null,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_claim_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'APPROVE_SCHOOL_CLAIM', 'school_claims', p_claim_id,
    to_jsonb(v_claim),
    jsonb_build_object(
      'status', 'APPROVED',
      'school_id', v_claim.school_id,
      'profile_id', v_claim.claimed_by,
      'role_before', v_role,
      'role_promoted', v_promoted
    )
  );
end;
$$;

comment on function public.approve_school_claim(uuid) is
  'Onda 7: aprova uma reivindicação de escola -- cria o vínculo em school_managers, promove o perfil para SCHOOL_MANAGER apenas se ele ainda for USER (nunca rebaixa EDITOR/STORE_MANAGER/ADMIN) e grava auditoria. SECURITY DEFINER, exige is_admin() e proíbe auto-revisão.';

create or replace function public.reject_school_claim(p_claim_id uuid, p_reason text)
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
    raise exception 'school claim % not found', p_claim_id;
  end if;
  if v_claim.claimed_by = auth.uid() then
    raise exception 'you cannot review your own claim';
  end if;
  if v_claim.status <> 'SUBMITTED' then
    raise exception 'school claim % was already reviewed (%)', p_claim_id, v_claim.status;
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'a rejection reason is required';
  end if;

  update public.school_claims
  set status = 'REJECTED',
      rejection_reason = btrim(p_reason),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_claim_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'REJECT_SCHOOL_CLAIM', 'school_claims', p_claim_id,
    to_jsonb(v_claim),
    jsonb_build_object('status', 'REJECTED', 'rejection_reason', btrim(p_reason))
  );
end;
$$;

comment on function public.reject_school_claim(uuid, text) is
  'Onda 7: rejeita uma reivindicação de escola com motivo obrigatório -- o solicitante lê esse motivo e pode reenviar corrigido. SECURITY DEFINER, exige is_admin() e proíbe auto-revisão.';

-- =====================================================================
-- 3. school_manager_publish_list -- a irmã de admin_publish_list
-- =====================================================================
--
-- Mesma assinatura, mesmo comportamento, MESMO laço de colisão de slug e
-- mesma criação de versão nova a cada publicação (RN-007) que
-- `admin_publish_list` (20260913010000) -- deliberadamente espelhada, não
-- reinventada. Duas diferenças, ambas de propósito:
--
--   1. Gate `is_school_manager(p_school_id)` em vez de `is_admin()`.
--      Nota: `is_school_manager()` já devolve true para admin
--      (20260910200900), então esta função é um superconjunto -- não há
--      caminho que o admin perca. O que ela adiciona é o gestor.
--   2. Ação de auditoria própria, SCHOOL_MANAGER_PUBLISH_LIST,
--      distinguível de ADMIN_PUBLISH_LIST e de APPROVE_SUBMISSION. Sem
--      isso o audit log não responderia "quem colocou esta lista no ar, a
--      equipe ou a escola?" -- exatamente a pergunta que a Onda 7 cria.
--
-- Não há guarda de auto-aprovação, pela mesma razão de
-- admin_publish_list: não existe terceiro, o gestor É a fonte. O que
-- substitui a moderação é a verificação humana que aconteceu ANTES (na
-- aprovação da reivindicação), mais o audit log, mais o poder do admin de
-- arquivar depois (admin_set_school_list_status).

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

  -- Mesma chave da unique constraint school_lists_school_id_education_
  -- level_series_name_school_y_key: publicar de novo reaproveita a lista e
  -- só acrescenta versão.
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
    -- Mesmo laço de colisão de admin_publish_list: duas séries de nomes
    -- diferentes podem gerar o mesmo slug depois do slugify (acento,
    -- pontuação), e approve_submission() estoura na unique nesse caso.
    while exists (select 1 from public.school_lists where slug = v_slug) loop
      v_suffix := v_suffix + 1;
      v_slug := v_slug_base || '-' || v_suffix::text;
    end loop;

    insert into public.school_lists (school_id, education_level, series_name, school_year, slug)
    values (p_school_id, btrim(p_education_level), btrim(p_series_name), p_school_year, v_slug)
    returning id into v_list_id;
  else
    -- Republicar uma lista arquivada a devolve ao ar, junto com a versão
    -- nova -- idêntico a admin_publish_list.
    update public.school_lists set status = 'APPROVED', updated_at = now() where id = v_list_id;
  end if;

  select coalesce(max(version_number), 0) + 1 into v_next_version
  from public.school_list_versions where school_list_id = v_list_id;

  -- submission_id fica null: não veio de contribuição de terceiro.
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
  'Onda 7: irmã de admin_publish_list para o gestor verificado publicar a lista da PRÓPRIA escola, sem passar pela fila de moderação. Gate is_school_manager(p_school_id); ação de auditoria própria (SCHOOL_MANAGER_PUBLISH_LIST). Republicar a mesma (escola, etapa, série, ano) cria versão nova, nunca sobrescreve (RN-007).';

-- Grants: a lição já cara deste projeto (20260911150100,
-- 20260911160100) -- `revoke ... from anon` é no-op, porque o grant real
-- é a EXECUTE implícita para PUBLIC na criação. Revoga de PUBLIC e
-- concede só a authenticated.
revoke execute on function public.approve_school_claim(uuid) from public;
revoke execute on function public.reject_school_claim(uuid, text) from public;
revoke execute on function public.school_manager_publish_list(uuid, text, text, int, jsonb) from public;

grant execute on function public.approve_school_claim(uuid) to authenticated;
grant execute on function public.reject_school_claim(uuid, text) to authenticated;
grant execute on function public.school_manager_publish_list(uuid, text, text, int, jsonb) to authenticated;

-- =====================================================================
-- 4. Policies que faltavam para a área do gestor existir de verdade
-- =====================================================================
--
-- Só o que falta -- nenhuma policy existente é reescrita. (Cada uma
-- soma uma ocorrência ao advisor `multiple_permissive_policies`,
-- categoria que docs/security/rls-review.md já documenta como
-- deliberadamente aceita neste schema.)

-- O gestor precisa enxergar a própria lista mesmo depois de o admin
-- arquivá-la -- senão ela some da área dele e ele republica achando que
-- nunca existiu. `school_lists_select_approved` é `to public` e só mostra
-- APPROVED.
create policy "school_lists_manager_select" on public.school_lists
  for select to authenticated
  using (public.is_school_manager(school_id));

-- Contatos: havia INSERT e UPDATE do gestor, mas nem SELECT (o público só
-- enxerga `is_public = true`, então um contato interno ficava invisível
-- para quem o criou) nem DELETE (dava para cadastrar um telefone errado e
-- nunca mais tirar).
create policy "school_contacts_manager_select" on public.school_contacts
  for select to authenticated
  using (public.is_school_manager(school_id));

create policy "school_contacts_manager_delete" on public.school_contacts
  for delete to authenticated
  using (public.is_school_manager(school_id));

-- Fotos: mesmo buraco. `school_images_select_approved` exige
-- `is_approved`, então a foto ficava invisível até para quem a enviou; e
-- não havia DELETE nenhum para o gestor.
create policy "school_images_manager_select" on public.school_images
  for select to authenticated
  using (public.is_school_manager(school_id));

create policy "school_images_manager_delete" on public.school_images
  for delete to authenticated
  using (public.is_school_manager(school_id));

-- =====================================================================
-- 5. Escalonamento de privilégio que a Onda 7 acorda
-- =====================================================================
--
-- Até hoje `school_managers` tinha ZERO linhas em produção, então as
-- policies de gestor eram código morto e o buraco abaixo era teórico. A
-- Onda 7 cria gestores de verdade -- ele deixa de ser teórico e tem que
-- fechar junto, senão a própria feature é o exploit.
--
-- `school_profiles_manager_update` (20260910201000) é
-- `using/with check (is_school_manager(school_id))` -- por LINHA, não por
-- coluna. Hoje isso deixa o gestor fazer
-- `update school_profiles set is_verified = true` na própria escola e
-- ganhar o selo "Verificada" que a página pública renderiza -- exatamente
-- o que o selo existe para NÃO deixar acontecer. Idem `is_sponsored`
-- (hoje sem leitor -- a página usa `is_entity_sponsored()` -- mas é campo
-- de monetização) e `updated_by` (atribuir a edição a outra pessoa).
--
-- RLS não tem WITH CHECK por coluna e não enxerga OLD, e um WITH CHECK
-- que relê a própria tabela numa subconsulta **não funciona**: testado ao
-- vivo neste projeto e o Postgres devolve `42P17: infinite recursion
-- detected in policy for relation "school_profiles"` (o truque de
-- `profiles_update_own` só não estoura porque `is_admin()` é SECURITY
-- DEFINER; uma subconsulta crua na mesma tabela estoura). A trava, então,
-- é um trigger BEFORE -- mesmo padrão e mesma escolha de "restaura em
-- silêncio em vez de recusar" de `stores_protect_admin_columns()`
-- (20260913030000, Onda 6): o gestor salva o que é dele e o resto
-- simplesmente não se move.
--
-- Escape hatch para `auth.uid() is null`: chamadas sem contexto de
-- request (service role, psql, migrations, o importador do INEP) não são
-- um usuário se autopromovendo -- e essas conexões já ignoram RLS de
-- qualquer forma. `admin_update_school` (SECURITY DEFINER) passa pelo
-- ramo do `is_admin()`, com auth.uid() intacto.

create or replace function public.school_profiles_protect_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_verified := false;
    new.is_sponsored := false;
    new.updated_by := (select auth.uid());
    return new;
  end if;

  new.is_verified := old.is_verified;
  new.is_sponsored := old.is_sponsored;
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

comment on function public.school_profiles_protect_admin_columns() is
  'Onda 7: RLS trava linhas, não colunas. Impede que o gestor de escola escreva is_verified (o selo "Verificada" da página pública) e is_sponsored da própria escola pelo INSERT/UPDATE que school_profiles_manager_write/_update permitem, e força updated_by a ser ele mesmo. Admin e chamadas sem sessão (service role/migrations/importador INEP) passam intactas.';

-- Nome escolhido para ordenar depois de `set_school_profiles_updated_at`
-- (triggers BEFORE do mesmo evento disparam em ordem alfabética): o
-- updated_at é calculado antes, esta restauração é a última palavra.
create trigger school_profiles_protect_admin_columns_trg
  before insert or update on public.school_profiles
  for each row execute function public.school_profiles_protect_admin_columns();

-- Mesma classe de problema em `school_images`, um degrau abaixo:
--
--   * `approved_by`: o gestor podia gravar o id de um admin qualquer e
--     fabricar um revisor que nunca revisou;
--   * `is_approved` no UPDATE: sem trava, admin esconde a foto e o gestor
--     desesconde -- moderação em loop.
--
-- No INSERT `is_approved` fica LIVRE de propósito: o gestor verificado é
-- a fonte da própria foto, e é isso que "moderação mais leve depois de
-- aprovado" quer dizer. O admin continua podendo esconder depois
-- (school_images_admin_all), e a partir daí o gestor não reverte.
-- `submitted_by = auth.uid()` (RN-004, 20260912000000) continua sendo
-- garantido pela policy, não aqui.

create or replace function public.school_images_protect_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.approved_by := null;
    return new;
  end if;

  new.is_approved := old.is_approved;
  new.approved_by := old.approved_by;
  return new;
end;
$$;

comment on function public.school_images_protect_admin_columns() is
  'Onda 7: impede que o gestor de escola fabrique approved_by (um revisor que nunca revisou) ou reverta um is_approved=false posto pelo admin. is_approved no INSERT fica livre -- o gestor verificado é a fonte da própria foto.';

create trigger school_images_protect_admin_columns_trg
  before insert or update on public.school_images
  for each row execute function public.school_images_protect_admin_columns();
