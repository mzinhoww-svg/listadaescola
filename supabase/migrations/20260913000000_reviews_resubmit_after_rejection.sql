-- Roadmap Tier 1 / B1 (docs/product/roadmap-icps-2026-09.md): avaliação
-- rejeitada era um beco sem saída permanente. unique(school_id,
-- profile_id) bloqueia uma segunda linha, e reviews_update_own_pending
-- só permitia UPDATE enquanto status = 'PENDING' -- uma vez REJECTED, o
-- próprio autor não conseguia mais tocar naquela linha via RLS, e a
-- tabela nem tinha coluna para guardar o motivo da rejeição.

alter table public.reviews add column rejection_reason text;

-- Autor pode reenviar depois de REJECTED (reseta pra PENDING, mesma
-- linha) -- mas continua sem poder tocar numa APPROVED (moderação já
-- publicou; permitir edição ali seria burlar a moderação sem passar de
-- novo por ela, diferente do caso REJECTED onde o conteúdo nunca ficou
-- público). O autor nunca pode se auto-aprovar: WITH CHECK continua
-- fixando status = 'PENDING'.
drop policy "reviews_update_own_pending" on public.reviews;

create policy "reviews_update_own_pending_or_rejected" on public.reviews
  for update to authenticated
  using ((select auth.uid()) = profile_id and status in ('PENDING', 'REJECTED'))
  with check ((select auth.uid()) = profile_id and status = 'PENDING');

comment on policy "reviews_update_own_pending_or_rejected" on public.reviews is
  'Autor edita enquanto PENDING, ou reenvia depois de REJECTED (reseta a mesma linha pra PENDING). APPROVED continua imutável pelo autor -- editar review já pública sem nova moderação seria burlar a moderação.';

-- Assinatura muda (uuid) -> (uuid, text): CREATE OR REPLACE não troca
-- parâmetros de uma função existente, precisa dropar a versão antiga
-- primeiro (mesmo motivo já documentado na reescrita de search_schools).
drop function if exists public.admin_reject_review(uuid);

create function public.admin_reject_review(p_review_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.reviews;
begin
  if not public.is_admin() then
    raise exception 'only admins may reject reviews';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'rejection reason is required';
  end if;

  select * into v_before from public.reviews where id = p_review_id for update;
  if v_before is null then
    raise exception 'review % not found', p_review_id;
  end if;
  if v_before.profile_id = auth.uid() then
    raise exception 'you cannot review your own review';
  end if;
  if v_before.status <> 'PENDING' then
    raise exception 'review % is not awaiting moderation (status=%)', p_review_id, v_before.status;
  end if;

  update public.reviews set status = 'REJECTED', moderated_by = auth.uid(), rejection_reason = trim(p_reason)
  where id = p_review_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'ADMIN_REJECT_REVIEW', 'reviews', p_review_id, to_jsonb(v_before), jsonb_build_object('status', 'REJECTED', 'rejection_reason', trim(p_reason)));
end;
$$;

revoke execute on function public.admin_reject_review(uuid, text) from public;
grant execute on function public.admin_reject_review(uuid, text) to authenticated;
