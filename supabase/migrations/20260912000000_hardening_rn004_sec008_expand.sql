-- Post-MVP hardening pass (não um dos 20 prompts numerados -- correção
-- pontual sobre gaps já identificados em docs/implementation/
-- mvp-gap-analysis.md e docs/security/final-audit.md).

-- ---------------------------------------------------------------------
-- RN-004: school_images.submitted_by nullable sem justificativa real.
-- Levantamento: zero linhas na tabela em produção (confirmado ao vivo),
-- zero código em src/ insere nessa tabela hoje (só leitura, em
-- school-profile.ts e na página de perfil da escola) -- mesmo achado já
-- registrado como PARCIAL no gap-analysis do Prompt 20. Diferente de
-- `approved_by` (NULL é um estado real e esperado: "ainda não aprovada"),
-- não existe fluxo legítimo em que uma foto de escola exista sem que
-- alguém a tenha enviado -- toda outra tabela de conteúdo gerado por
-- usuário neste schema (list_submissions.submitted_by,
-- submission_attachments.uploaded_by, school_suggestions.suggested_by,
-- reviews.profile_id, reports.reported_by) já é `not null`. Corrigido
-- aqui: coluna vira NOT NULL (seguro -- tabela vazia, sem linha
-- existente para violar a constraint) e a policy de INSERT do manager
-- passa a exigir `submitted_by = auth.uid()`, fechando preventivamente a
-- possibilidade de um manager atribuir o upload a outro perfil, antes
-- mesmo de existir qualquer UI de upload de manager.
-- ---------------------------------------------------------------------

alter table public.school_images alter column submitted_by set not null;

drop policy "school_images_manager_write" on public.school_images;
create policy "school_images_manager_write" on public.school_images
  for insert to authenticated
  with check (public.is_school_manager(school_id) and submitted_by = auth.uid());

-- ---------------------------------------------------------------------
-- SEC-008 (continuação): o rate limiting anterior (Prompt 20) só cobria
-- login. Este prompt de hardening pede proteção nas superfícies
-- realmente sensíveis -- não em tudo. Critério aplicado (custo/risco/
-- frequência aceitável), por superfície:
--
--   - Submissão de lista (INSERT em list_submissions): alta prioridade
--     no prompt. Risco real -- conteúdo livre chegando à fila de
--     moderação sem limite, custo de tempo de moderador. Frequência
--     legítima é baixa (poucos envios por sessão de um contribuidor
--     real).
--   - Criação de avaliação: alta prioridade no prompt. Mesmo risco de
--     spam entrando na fila de moderação, mitigado parcialmente pelo
--     unique(school_id, profile_id) mas não entre escolas diferentes.
--   - Upload de anexo: é o único ponto do produto com custo externo
--     direto e real (armazenamento/banda do Supabase Storage) -- listado
--     explicitamente como alvo de alta prioridade no prompt
--     ("endpoints que possam gerar custo externo").
--   - Troca de papel de usuário (admin_set_user_role): o endpoint
--     administrativo mais sensível do sistema (escalonamento de
--     privilégio) -- limite embutido na própria função, não só na
--     Server Action, para não poder ser contornado chamando a RPC
--     direto via PostgREST.
--
-- Deliberadamente NÃO limitado nesta passada (documentado, não
-- esquecido): busca pública (search_schools já tem clamp de p_limit<=100
-- desde o Prompt 16/18, e não gera custo por chamada nem fila de
-- moderação) e analytics (mesma razão -- sem custo por evento, sem fila).
-- O próprio prompt classifica essas duas como prioridade média, não
-- alta, e pede explicitamente para não aplicar rate limiting "cego" onde
-- o risco não justifica.
--
-- Mecanismo: extensão do padrão já usado para login (auth_login_attempts
-- -- Postgres puro, sem serviço novo), generalizado para qualquer ação
-- autenticada. `auth_login_attempts` continua intocada (login é pré-auth,
-- precisa de anon; as ações abaixo já exigem sessão, então usam
-- auth.uid() como identificador, nunca um valor vindo do cliente --
-- fecha por design a possibilidade de um usuário se passar por outro).
-- ---------------------------------------------------------------------

create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  action text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_hits_lookup_idx on public.rate_limit_hits (action, identifier, created_at desc);

alter table public.rate_limit_hits enable row level security;
-- Sem nenhuma policy, de propósito -- mesma razão de auth_login_attempts:
-- só as duas funções SECURITY DEFINER abaixo tocam a tabela.

create or replace function public.check_rate_limit(p_action text, p_max_hits int, p_window_minutes int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent int;
begin
  if auth.uid() is null then
    return false;
  end if;

  select count(*) into v_recent
  from public.rate_limit_hits
  where action = p_action
    and identifier = auth.uid()::text
    and created_at > now() - (p_window_minutes || ' minutes')::interval;

  return v_recent < p_max_hits;
end;
$$;

create or replace function public.record_rate_limit_hit(p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.rate_limit_hits (action, identifier) values (p_action, auth.uid()::text);

  -- Housekeeping best-effort, mesmo padrão de record_login_attempt.
  delete from public.rate_limit_hits
  where action = p_action and identifier = auth.uid()::text and created_at < now() - interval '1 day';
end;
$$;

-- admin_set_user_role ganha o limite embutido na própria função (não só
-- na Server Action) -- 20 trocas de papel por admin por hora. `create or
-- replace` preserva a assinatura e o comportamento existente (guarda de
-- autoalteração, validação de papel, audit log) definidos no Prompt 20;
-- só a checagem de limite é nova, logo após a checagem de admin.
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.profiles;
begin
  if not public.is_admin() then
    raise exception 'only admins may change user roles';
  end if;
  if not public.check_rate_limit('admin_set_user_role', 20, 60) then
    raise exception 'rate limit exceeded for admin_set_user_role -- try again later';
  end if;
  if p_role not in ('USER', 'EDITOR', 'SCHOOL_MANAGER', 'STORE_MANAGER', 'ADMIN', 'SUPER_ADMIN') then
    raise exception 'invalid role %', p_role;
  end if;
  if p_user_id = auth.uid() then
    raise exception 'you cannot change your own role';
  end if;

  select * into v_before from public.profiles where id = p_user_id for update;
  if v_before is null then
    raise exception 'user % not found', p_user_id;
  end if;

  update public.profiles set role = p_role::public.user_role where id = p_user_id;
  perform public.record_rate_limit_hit('admin_set_user_role');

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'ADMIN_SET_USER_ROLE', 'profiles', p_user_id, to_jsonb(v_before), jsonb_build_object('role', p_role));
end;
$$;

-- Grants: mesma lição de sempre neste projeto -- revoke ... from anon é
-- no-op (o grant real é a PUBLIC implícita da criação da função);
-- revogar de PUBLIC e conceder só a authenticated (nenhuma das duas
-- funções novas precisa de anon -- ambas retornam cedo se auth.uid() é
-- null).
revoke execute on function public.check_rate_limit(text, int, int) from public;
revoke execute on function public.record_rate_limit_hit(text) from public;

grant execute on function public.check_rate_limit(text, int, int) to authenticated;
grant execute on function public.record_rate_limit_hit(text) to authenticated;
