-- Onda 6 -- Papelaria: do cadastro ao orçamento
-- (docs/product/roadmap-ondas.md §"Onda 6"; docs/product/store-self-service.md).
--
-- O que existia antes desta migration, medido ao vivo em produção:
--   * `stores`, `store_contacts`, `store_services`, `store_managers` com
--     RLS completa desde 20260910201200_rls_stores.sql;
--   * 1 linha em `stores` -- a fixture de QA `qa-teste-papelaria-cuiaba`
--     (src/lib/qa/fixtures.ts). Nenhuma papelaria real;
--   * 0 linhas em `store_managers`, 0 perfis com papel STORE_MANAGER;
--   * nenhuma policy de INSERT em `stores` para `authenticated` e nenhuma
--     de INSERT em `store_managers` fora de admin -- ou seja, nenhum
--     caminho de entrada para o dono de papelaria. `/para-papelarias` era
--     uma página institucional sem um único link de ação.
--
-- Esta migration abre esse caminho -- e abre pelo lado certo.
--
-- ---------------------------------------------------------------------
-- Decisão 1: o autocadastro NÃO cria `stores`.
--
-- A tentação óbvia era liberar INSERT em `stores` para `authenticated`
-- com `with check (not is_active)` -- "nasce invisível". Isso é pior do
-- que o buraco que fecha: qualquer conta autenticada passaria a poder
-- despejar linhas órfãs, sem dono e sem revisão, na tabela que alimenta
-- `nearby_stores`, o sitemap e o ranking, na esperança de que ninguém
-- repare quando uma delas for ativada por engano. A solicitação vive numa
-- tabela própria (`store_claims`), e a linha em `stores` só passa a
-- existir quando um admin aprova. O efeito visível para o público é
-- exatamente o pedido ("nasce invisível"), sem o passivo.
--
-- Reivindicação de papelaria já cadastrada usa a MESMA tabela e a MESMA
-- fila: `store_claims.store_id` preenchido em vez de NULL.
--
-- ---------------------------------------------------------------------
-- Decisão 2: a caixa de pedidos não guarda nada sobre o visitante.
--
-- `store_quote_requests` registra o handoff de WhatsApp no momento do
-- redirect (server-side, em `/api/store/whatsapp`) para que o gestor veja
-- "quantos pedidos, de quais listas/escolas, quando". Não há e-mail, nome,
-- telefone, IP nem user agent na tabela -- e não há `profile_id`, mesmo
-- quando o visitante está logado. A única coluna derivada do visitante é
-- `dedupe_hash`, um SHA-256 de (token opaco de sessão + papelaria + lista)
-- que existe só para não contar o mesmo clique duas vezes; é
-- unidirecional, some com a sessão do navegador e não identifica ninguém.
-- ---------------------------------------------------------------------

-- =====================================================================
-- 1. store_claims -- solicitação de cadastro ou de reivindicação
-- =====================================================================

create table public.store_claims (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,

  -- NULL = papelaria nova (o admin cria ao aprovar).
  -- Preenchido = reivindicação de uma papelaria que o admin já cadastrou.
  -- Depois de aprovada, esta coluna aponta para a `stores` resultante nos
  -- dois casos -- é o elo que liga a solicitação ao que ela virou.
  store_id uuid references public.stores (id) on delete cascade,

  store_name text not null,
  uf text not null default 'MT',
  municipality text not null,
  address text,

  -- Já normalizado (55 + DDD + número) por normalizeWhatsappNumber
  -- (src/lib/stores/whatsapp.ts) antes de chegar aqui. O CHECK abaixo é o
  -- backstop de banco -- a regra completa (DDD 11-99, 8 ou 9 dígitos) mora
  -- naquela função, que é a única implementação; isto só garante que
  -- nenhum caminho alternativo grave lixo.
  whatsapp text not null,

  opening_hours text,
  offers_delivery boolean not null default false,
  offers_pickup boolean not null default false,
  -- Serviços oferecidos, texto livre curto -- viram linhas em
  -- `store_services` na aprovação.
  services text[] not null default '{}',
  notes text,

  -- Mesmo enum de school_suggestions: a fila é a mesma ideia (SUBMITTED ->
  -- APPROVED/REJECTED). Os outros estados do enum (DRAFT, UNDER_REVIEW,
  -- NEEDS_CORRECTION, ARCHIVED) não têm fluxo aqui e o CHECK os bloqueia
  -- em vez de deixá-los como estados fantasma.
  status public.submission_status not null default 'SUBMITTED',
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint store_claims_status_allowed
    check (status in ('SUBMITTED', 'APPROVED', 'REJECTED')),
  constraint store_claims_store_name_len
    check (length(btrim(store_name)) between 2 and 200),
  constraint store_claims_municipality_len
    check (length(btrim(municipality)) between 2 and 120),
  constraint store_claims_uf_format
    check (uf ~ '^[A-Z]{2}$'),
  constraint store_claims_whatsapp_format
    check (whatsapp ~ '^55[1-9][0-9][0-9]{8,9}$'),
  constraint store_claims_address_len
    check (address is null or length(address) between 1 and 300),
  constraint store_claims_opening_hours_len
    check (opening_hours is null or length(opening_hours) between 1 and 200),
  constraint store_claims_notes_len
    check (notes is null or length(notes) between 1 and 1000),
  constraint store_claims_rejection_reason_len
    check (rejection_reason is null or length(rejection_reason) between 1 and 1000),
  -- CHECK não aceita subconsulta, então o teto de elementos fica aqui e o
  -- saneamento de cada elemento (trim, vazios, 60 chars) fica no trigger
  -- BEFORE INSERT abaixo -- que vale igualmente para uma chamada direta ao
  -- PostgREST, não só para a Server Action.
  constraint store_claims_services_bounded
    check (coalesce(array_length(services, 1), 0) <= 12),
  -- Rejeitar sem dizer por quê não é rejeitar, é sumir com o pedido.
  constraint store_claims_rejected_needs_reason
    check (status <> 'REJECTED' or (rejection_reason is not null and btrim(rejection_reason) <> '')),
  -- Aprovada sempre aponta para a papelaria resultante.
  constraint store_claims_approved_needs_store
    check (status <> 'APPROVED' or store_id is not null)
);

comment on table public.store_claims is
  'Onda 6: fila única de "quero cadastrar minha papelaria" e "esta papelaria é minha". O autocadastro NUNCA cria uma linha em stores -- a papelaria só passa a existir (ou a ficar ativa) quando um admin aprova, via approve_store_claim(). RLS: INSERT/SELECT só do próprio solicitante, tudo mais só admin.';

comment on column public.store_claims.store_id is
  'NULL enquanto a solicitação for de papelaria nova e ainda não aprovada. Preenchido desde o início numa reivindicação, e preenchido na aprovação em qualquer caso.';

comment on column public.store_claims.whatsapp is
  'Formato 55DDNNNNNNNNN, já normalizado por normalizeWhatsappNumber (src/lib/stores/whatsapp.ts). PRD RF-012: telefone validado/normalizado no servidor, nunca no cliente.';

create trigger set_store_claims_updated_at
  before update on public.store_claims
  for each row execute function public.set_updated_at();

-- Índices. Todo FK novo tem o seu (o advisor de performance cobra, e o
-- Postgres não indexa FK sozinho); nenhum deles é parcial de propósito --
-- um índice parcial não conta como cobertura de FK.
create index store_claims_requester_idx on public.store_claims (requester_id);
create index store_claims_store_idx on public.store_claims (store_id);
create index store_claims_reviewed_by_idx on public.store_claims (reviewed_by);
-- A fila do admin: filtra por status, ordena por created_at (mais antigo
-- primeiro, mesma convenção de getModerationQueue).
create index store_claims_queue_idx on public.store_claims (status, created_at);

-- Uma solicitação pendente por (solicitante, alvo). Reenviar o mesmo
-- pedido enquanto o primeiro está na fila é ruído para o moderador, não
-- informação nova. O COALESCE dá ao caso "papelaria nova" (store_id NULL)
-- uma chave própria -- sem ele, NULL nunca colide consigo mesmo em UNIQUE
-- e o usuário poderia empilhar N pedidos de papelaria nova.
create unique index store_claims_one_pending_per_target_idx
  on public.store_claims (requester_id, coalesce(store_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'SUBMITTED';

alter table public.store_claims enable row level security;

-- O solicitante escreve uma vez e só. Sem UPDATE e sem DELETE para ele --
-- mesma escolha de school_suggestions (single-shot, imutável depois de
-- enviada): editar depois de enviada é reabrir a decisão do moderador sem
-- que ele saiba. O WITH CHECK fixa o estado inicial inteiro para que
-- ninguém consiga nascer APROVADO chamando o PostgREST direto.
create policy "store_claims_insert_own" on public.store_claims
  for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'SUBMITTED'::public.submission_status
    and rejection_reason is null
    and reviewed_by is null
    and reviewed_at is null
  );

-- Sem oráculo: o usuário vê a própria solicitação e nada além. Não existe
-- (nem pode existir) uma leitura do tipo "esta papelaria já foi
-- reivindicada?" -- seria exatamente o vazamento que este recorte impede.
create policy "store_claims_select_own" on public.store_claims
  for select to authenticated
  using (requester_id = (select auth.uid()));

create policy "store_claims_admin_all" on public.store_claims
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Rate limiting e saneamento no INSERT, no banco e não só na Server
-- Action: a policy acima é aberta para `authenticated`, então o PostgREST
-- fala com esta tabela direto. O limite reusa a infraestrutura que já
-- existe (20260912000000_hardening_rn004_sec008_expand.sql) em vez de
-- inventar outra -- mesma tabela `rate_limit_hits`, mesmas funções,
-- chaveado por auth.uid() (nunca por um valor vindo do cliente).
create or replace function public.store_claims_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Sem sessão não há nada a limitar, e sair antes importa: `anon` não tem
  -- EXECUTE em check_rate_limit, e um BEFORE trigger roda ANTES do WITH
  -- CHECK da policy -- sem esta saída, a tentativa anônima morria com
  -- "permission denied for function check_rate_limit" (observado ao vivo
  -- via HTTPS) em vez do 42501 limpo da RLS, que é a resposta correta e a
  -- que não nomeia o mecanismo interno.
  if (select auth.uid()) is null then
    return new;
  end if;

  if not public.check_rate_limit('store_claim_submit', 5, 60) then
    raise exception 'rate limit exceeded for store_claim_submit -- try again later';
  end if;

  -- Saneamento de `services`: o que um CHECK não consegue expressar.
  new.services := coalesce(
    (
      select array_agg(v)
      from (
        select distinct left(btrim(s), 60) as v
        from unnest(new.services) as s
        where btrim(s) <> ''
        limit 12
      ) cleaned
    ),
    '{}'::text[]
  );

  perform public.record_rate_limit_hit('store_claim_submit');
  return new;
end;
$$;

create trigger store_claims_before_insert_trg
  before insert on public.store_claims
  for each row execute function public.store_claims_before_insert();

-- =====================================================================
-- 2. store_quote_requests -- a caixa de pedidos do gestor
-- =====================================================================

create table public.store_quote_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,

  -- Nullable: o botão de WhatsApp também existe na página avulsa da
  -- papelaria (Prompt 15), sem contexto de escola/lista. `on delete set
  -- null` para que apagar uma escola não apague o histórico de pedidos do
  -- gestor -- mesma escolha de store_sale_reports.
  school_id uuid references public.schools (id) on delete set null,
  school_list_id uuid references public.school_lists (id) on delete set null,

  -- SHA-256 de (token opaco de sessão | papelaria | lista). Unidirecional
  -- e sem valor fora deste uso: serve exclusivamente para não contar duas
  -- vezes o mesmo visitante clicando de novo no mesmo botão em poucos
  -- minutos. Não é PII e não permite recuperar o token.
  dedupe_hash text not null,

  created_at timestamptz not null default now(),

  constraint store_quote_requests_dedupe_hash_format check (dedupe_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.store_quote_requests is
  'Onda 6: um pedido de orçamento = um handoff de WhatsApp registrado server-side no redirect (/api/store/whatsapp). Sem PII do visitante -- sem e-mail, telefone, IP, user agent ou profile_id, mesmo quando ele está logado. Escrita SÓ por record_store_quote_request() (SECURITY DEFINER); não existe policy de INSERT.';

comment on column public.store_quote_requests.dedupe_hash is
  'SHA-256(token de sessão | store_id | school_list_id). Unidirecional, sem PII, existe só para a janela de deduplicação de 30 minutos.';

create index store_quote_requests_store_created_idx
  on public.store_quote_requests (store_id, created_at desc);
create index store_quote_requests_school_idx on public.store_quote_requests (school_id);
create index store_quote_requests_list_idx on public.store_quote_requests (school_list_id);
create index store_quote_requests_dedupe_idx
  on public.store_quote_requests (dedupe_hash, created_at desc);

alter table public.store_quote_requests enable row level security;

-- Uma policy só, de leitura. `is_store_manager()` já retorna true para
-- admin (ver 20260910200900_rls_helper_functions.sql), então "gestor da
-- papelaria OU admin" é exatamente esta expressão -- uma segunda policy
-- `_admin_all` seria redundante e ainda somaria uma ocorrência ao advisor
-- `multiple_permissive_policies`.
--
-- Não há policy de INSERT, UPDATE ou DELETE para ninguém, nem para admin:
-- a única escrita é record_store_quote_request() (SECURITY DEFINER). Um
-- número de pedidos que qualquer cliente pudesse escrever direto não seria
-- um número -- seria um campo de texto.
create policy "store_quote_requests_select_manager" on public.store_quote_requests
  for select to authenticated
  using (public.is_store_manager(store_id));

-- ...e o gestor não lê nem o hash. RLS recorta LINHAS; a promessa "sem PII
-- do visitante" é sobre COLUNAS, então quem a garante aqui é o GRANT.
-- `dedupe_hash` não é PII (é SHA-256 de um token aleatório que morre com a
-- sessão do navegador), mas dentro de uma sessão ele é estável: exposto na
-- tela do gestor viraria um "visitante único" pseudônimo que ninguém
-- pediu. Só a RPC SECURITY DEFINER (que roda como a dona da tabela)
-- precisa lê-lo.
--
-- Tem que ser REVOKE da tabela inteira e depois GRANT coluna a coluna:
-- `revoke select (dedupe_hash)` sozinho é no-op contra o grant de tabela
-- que o Supabase já concedeu a anon/authenticated -- testado ao vivo, o
-- hash continuava vindo em `select=*`. `anon` perde o SELECT por completo
-- (não tinha policy nenhuma aqui de qualquer forma).
--
-- Duas consequências para lembrar:
--   1. `select=*` nesta tabela passa a falhar para authenticated -- toda
--      query lista as colunas, como src/lib/stores/manager.ts já faz.
--   2. Coluna nova nasce INVISÍVEL até ganhar GRANT explícito. É o lado
--      certo para errar, mas é preciso lembrar de conceder.
revoke select on public.store_quote_requests from anon, authenticated;
grant select (id, store_id, school_id, school_list_id, created_at)
  on public.store_quote_requests to authenticated;

-- =====================================================================
-- 3. RPC: registrar o pedido de orçamento a partir do redirect
-- =====================================================================

create or replace function public.record_store_quote_request(
  p_store_id uuid,
  p_school_id uuid default null,
  p_school_list_id uuid default null,
  p_session_token text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_store_hits int;
begin
  -- Best-effort, igual a record_analytics_event: nunca derruba o redirect
  -- do visitante. Todo caminho de recusa retorna false, não exceção.
  if p_store_id is null then
    return false;
  end if;

  if not exists (select 1 from public.stores s where s.id = p_store_id and s.is_active) then
    return false;
  end if;

  -- Teto por papelaria, reusando `rate_limit_hits` (mesma tabela e mesmo
  -- formato do rate limiting existente). O visitante aqui é anônimo, então
  -- check_rate_limit() -- que chaveia por auth.uid() -- não serve: a chave
  -- possível é a própria papelaria. Isso não impede inflação artesanal
  -- (quem troca de sessão troca de hash), mas limita o estrago a 120
  -- pedidos/hora por papelaria, o que é ordens de grandeza acima do uso
  -- real e ordens de grandeza abaixo do que faria o número parecer outro.
  select count(*) into v_store_hits
  from public.rate_limit_hits
  where action = 'store_quote_request'
    and identifier = p_store_id::text
    and created_at > now() - interval '1 hour';

  if v_store_hits >= 120 then
    return false;
  end if;

  -- Sem token (cookie bloqueado) não há como deduplicar: um valor
  -- aleatório garante hash único em vez de agrupar visitantes diferentes
  -- sob a mesma chave -- errar para o lado de contar a mais é melhor do
  -- que descartar o pedido de quem não aceita cookie.
  v_hash := encode(
    extensions.digest(
      coalesce(nullif(btrim(p_session_token), ''), gen_random_uuid()::text)
      || '|' || p_store_id::text
      || '|' || coalesce(p_school_list_id::text, ''),
      'sha256'
    ),
    'hex'
  );

  if exists (
    select 1 from public.store_quote_requests q
    where q.dedupe_hash = v_hash
      and q.created_at > now() - interval '30 minutes'
  ) then
    return false;
  end if;

  insert into public.store_quote_requests (store_id, school_id, school_list_id, dedupe_hash)
  values (
    p_store_id,
    (select s.id from public.schools s where s.id = p_school_id),
    (select l.id from public.school_lists l where l.id = p_school_list_id),
    v_hash
  );

  insert into public.rate_limit_hits (action, identifier) values ('store_quote_request', p_store_id::text);
  -- Housekeeping best-effort, mesmo padrão de record_rate_limit_hit.
  delete from public.rate_limit_hits
  where action = 'store_quote_request'
    and identifier = p_store_id::text
    and created_at < now() - interval '1 day';

  return true;
end;
$$;

comment on function public.record_store_quote_request(uuid, uuid, uuid, text) is
  'Onda 6: registra um handoff de WhatsApp como pedido de orçamento. Única porta de escrita de store_quote_requests. Sem PII -- recebe um token opaco de sessão e guarda só o SHA-256 dele combinado com papelaria e lista. Deduplica em janela de 30 min e limita a 120 pedidos/hora por papelaria. Retorna false (nunca exceção) em qualquer recusa.';

-- O visitante do redirect é anônimo (a rota usa createPublicClient, sem
-- cookie), então `anon` precisa do grant. `revoke from public` primeiro --
-- o grant implícito de PUBLIC na criação é o que realmente abre a função.
revoke execute on function public.record_store_quote_request(uuid, uuid, uuid, text) from public;
grant execute on function public.record_store_quote_request(uuid, uuid, uuid, text) to anon, authenticated;

-- =====================================================================
-- 4. RPCs de moderação: aprovar / rejeitar solicitação
-- =====================================================================

create or replace function public.approve_store_claim(p_claim_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.store_claims;
  v_store public.stores;
  v_store_id uuid;
  v_slug text;
  v_role public.user_role;
  v_promoted boolean := false;
  v_created boolean := false;
begin
  if not public.is_admin() then
    raise exception 'only admins may review store claims';
  end if;

  select * into v_claim from public.store_claims where id = p_claim_id for update;
  if v_claim is null then
    raise exception 'store claim % not found', p_claim_id;
  end if;
  if v_claim.status <> 'SUBMITTED' then
    raise exception 'store claim % was already reviewed (%)', p_claim_id, v_claim.status;
  end if;

  if v_claim.store_id is null then
    -- Papelaria nova: é AQUI, e só aqui, que ela passa a existir. Nasce
    -- ativa porque a aprovação do admin é exatamente o ato de torná-la
    -- visível -- o "nasce invisível" do autocadastro é a ausência da
    -- linha, não uma linha escondida.
    v_slug := public.unique_slug(v_claim.store_name || '-' || v_claim.municipality, 'stores');
    insert into public.stores (
      name, slug, uf, municipality, address, whatsapp, opening_hours,
      offers_delivery, offers_pickup, is_active
    )
    values (
      btrim(v_claim.store_name), v_slug, v_claim.uf, btrim(v_claim.municipality),
      v_claim.address, v_claim.whatsapp, v_claim.opening_hours,
      v_claim.offers_delivery, v_claim.offers_pickup, true
    )
    returning id into v_store_id;
    v_created := true;

    insert into public.store_services (store_id, service)
    select v_store_id, btrim(s)
    from unnest(v_claim.services) as s
    where btrim(s) <> ''
    on conflict (store_id, service) do nothing;
  else
    -- Reivindicação: os dados curados pelo admin permanecem como estão.
    -- Aprovar dá a posse, não reescreve o cadastro com o que o
    -- solicitante digitou -- ele passa a poder editar pela área do gestor,
    -- sob RLS, e isso fica registrado como edição dele.
    select * into v_store from public.stores where id = v_claim.store_id for update;
    if v_store is null then
      raise exception 'store % referenced by claim % no longer exists', v_claim.store_id, p_claim_id;
    end if;
    v_store_id := v_store.id;
    if not v_store.is_active then
      update public.stores set is_active = true where id = v_store_id;
    end if;
  end if;

  insert into public.store_managers (store_id, profile_id)
  values (v_store_id, v_claim.requester_id)
  on conflict (store_id, profile_id) do nothing;

  -- Promoção de papel: reusa admin_set_user_role() (Prompt 20 +
  -- 20260912000000), que já valida o papel, guarda auditoria própria e
  -- tem rate limit embutido. Só promove quem é 'USER': um EDITOR, um
  -- SCHOOL_MANAGER ou um ADMIN que também tenha papelaria NÃO é rebaixado
  -- para STORE_MANAGER -- o papel de admin vale mais do que este fluxo, e
  -- quem já é STORE_MANAGER não precisa de nada. A autorização real sobre
  -- a papelaria é a linha em store_managers acima (is_store_manager), não
  -- o papel; o papel serve para a navegação e para o guard de rota.
  select p.role into v_role from public.profiles p where p.id = v_claim.requester_id;
  if v_role = 'USER' then
    perform public.admin_set_user_role(v_claim.requester_id, 'STORE_MANAGER');
    v_promoted := true;
  end if;

  update public.store_claims
  set status = 'APPROVED',
      store_id = v_store_id,
      rejection_reason = null,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_claim_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'APPROVE_STORE_CLAIM', 'store_claims', p_claim_id,
    to_jsonb(v_claim),
    jsonb_build_object(
      'store_id', v_store_id,
      'requester_id', v_claim.requester_id,
      'created_store', v_created,
      'role_promoted', v_promoted
    )
  );

  return v_store_id;
end;
$$;

comment on function public.approve_store_claim(uuid) is
  'Onda 6: aprova uma solicitação de papelaria. Cria a stores (papelaria nova, já ativa) ou reativa a existente sem sobrescrever os dados curados (reivindicação), vincula o solicitante em store_managers, promove o perfil para STORE_MANAGER via admin_set_user_role() apenas quando ele ainda é USER, e grava auditoria. SECURITY DEFINER, exige is_admin().';

create or replace function public.reject_store_claim(p_claim_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.store_claims;
begin
  if not public.is_admin() then
    raise exception 'only admins may review store claims';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'a rejection reason is required';
  end if;

  select * into v_claim from public.store_claims where id = p_claim_id for update;
  if v_claim is null then
    raise exception 'store claim % not found', p_claim_id;
  end if;
  if v_claim.status <> 'SUBMITTED' then
    raise exception 'store claim % was already reviewed (%)', p_claim_id, v_claim.status;
  end if;

  update public.store_claims
  set status = 'REJECTED',
      rejection_reason = btrim(p_reason),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_claim_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'REJECT_STORE_CLAIM', 'store_claims', p_claim_id,
    to_jsonb(v_claim),
    jsonb_build_object('reason', btrim(p_reason))
  );
end;
$$;

comment on function public.reject_store_claim(uuid, text) is
  'Onda 6: rejeita uma solicitação de papelaria. Motivo obrigatório (o CHECK da tabela também exige). SECURITY DEFINER, exige is_admin().';

revoke execute on function public.approve_store_claim(uuid) from public;
revoke execute on function public.reject_store_claim(uuid, text) from public;
grant execute on function public.approve_store_claim(uuid) to authenticated;
grant execute on function public.reject_store_claim(uuid, text) to authenticated;

-- =====================================================================
-- 5. O que o gestor pode ver e mudar na própria papelaria
-- =====================================================================

-- Antes desta migration, um gestor tinha UPDATE em `stores`
-- (stores_manager_update) mas SELECT só pela policy pública
-- `stores_select_active`. Consequência: se um admin desativasse a
-- papelaria, o gestor perderia a leitura do próprio cadastro e a área do
-- gestor renderizaria vazio enquanto o UPDATE continuava permitido -- um
-- formulário que salva o que não consegue mostrar. Estas duas policies
-- fecham isso. (Somam duas ocorrências ao advisor
-- `multiple_permissive_policies`, categoria que docs/security/rls-review.md
-- já documenta como deliberadamente aceita neste schema.)
create policy "stores_manager_select" on public.stores
  for select to authenticated
  using (public.is_store_manager(id));

create policy "store_services_manager_select" on public.store_services
  for select to authenticated
  using (public.is_store_manager(store_id));

-- `stores_manager_update` (20260910201200) é `using/with check
-- (is_store_manager(id))` -- por linha, não por coluna. Isso significa que
-- hoje um gestor pode escrever QUALQUER coluna da própria papelaria,
-- inclusive `is_sponsored` (peso de ranking, vendido comercialmente),
-- `is_active` (reverter uma desativação do admin) e `slug`/`uf` (mudar a
-- URL pública e o recorte geográfico). RLS não tem WITH CHECK por coluna e
-- não enxerga OLD, então a trava é um trigger BEFORE UPDATE: colunas
-- administrativas são restauradas silenciosamente para quem não é admin,
-- em vez de a escrita ser recusada -- o gestor salva o que é dele e o
-- resto simplesmente não se move.
--
-- Escape hatch para `auth.uid() is null`: chamadas sem contexto de request
-- (service role, psql, migrations, jobs) não são um usuário se
-- autopromovendo. `anon` nunca chega aqui -- não tem policy de UPDATE em
-- stores.
create or replace function public.stores_protect_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;
  new.is_active := old.is_active;
  new.is_sponsored := old.is_sponsored;
  new.slug := old.slug;
  new.uf := old.uf;
  return new;
end;
$$;

comment on function public.stores_protect_admin_columns() is
  'Onda 6: RLS trava linhas, não colunas. Impede que o gestor de papelaria escreva is_active, is_sponsored, slug e uf da própria loja pelo UPDATE que stores_manager_update permite. Admin e chamadas sem sessão (service role/migrations) passam intactas.';

-- Nome escolhido para ordenar depois de `set_stores_updated_at` (triggers
-- BEFORE de mesmo evento disparam em ordem alfabética): o updated_at é
-- calculado antes, esta restauração é a última palavra.
create trigger stores_protect_admin_columns_trg
  before update on public.stores
  for each row execute function public.stores_protect_admin_columns();

-- Toda função criada no schema `public` ganha EXECUTE para PUBLIC, e o
-- PostgREST publica o schema inteiro -- então uma função de trigger nasce
-- também como um endpoint `/rest/v1/rpc/...`. Chamá-la direto falha
-- ("trigger functions can only be called as triggers"), mas o advisor de
-- segurança a lista corretamente como SECURITY DEFINER executável por
-- `anon` (verificado ao vivo depois de aplicar esta migration), e uma
-- função de trigger não tem por que ter porta de entrada nenhuma. Revogar
-- aqui não afeta o disparo: o Postgres checa a permissão de EXECUTE no
-- CREATE TRIGGER, não a cada linha.
-- `from public` sozinho não basta: o Supabase mantém um ALTER DEFAULT
-- PRIVILEGES que concede EXECUTE em toda função nova do schema `public`
-- diretamente a anon/authenticated/service_role, e esses grants explícitos
-- sobrevivem ao revoke de PUBLIC (verificado em pg_proc.proacl depois de
-- aplicar). `service_role` fica -- é a chave de backend confiável.
revoke execute on function public.stores_protect_admin_columns() from public, anon, authenticated;
revoke execute on function public.store_claims_before_insert() from public, anon, authenticated;
