-- RLS: campaigns (admin-only, full stop), analytics_events + audit_logs
-- (no anon/authenticated policy at all -- writes happen via service_role,
-- which bypasses RLS by design, or SECURITY DEFINER functions; admin gets
-- read-only per docs/security/rls.md, not full write access via the API).

alter table public.campaigns enable row level security;
alter table public.analytics_events enable row level security;
alter table public.audit_logs enable row level security;

create policy "campaigns_admin_all" on public.campaigns
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "analytics_events_admin_read" on public.analytics_events
  for select to authenticated
  using (public.is_admin());

create policy "audit_logs_admin_read" on public.audit_logs
  for select to authenticated
  using (public.is_admin());
