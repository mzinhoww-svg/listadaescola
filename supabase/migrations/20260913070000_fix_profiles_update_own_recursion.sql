-- Bug em produção: qualquer usuário não-admin salvando o próprio nome em
-- /minha-conta/perfil recebia HTTP 500.
--
--   PATCH /rest/v1/profiles  { full_name: "..." }
--   -> 42P17 infinite recursion detected in policy for relation "profiles"
--
-- Achado pelo agente da Onda 6 enquanto testava outra coisa, e reproduzido
-- aqui de forma independente antes de mexer (update simulado com
-- `set local role authenticated` + claims de um profile role='USER').
--
-- A causa é o WITH CHECK de `profiles_update_own`, escrito em
-- 20260912010000_rls_wrap_auth_uid_initplan.sql:
--
--   with check (
--     id = (select auth.uid())
--     and role = (select p.role from profiles p where p.id = (select auth.uid()))
--   )
--
-- A intenção está certa e continua valendo: o usuário não pode escalar o
-- próprio papel num self-update. O mecanismo é que não pode ser esse --
-- uma policy de `profiles` que faz SELECT em `profiles` fecha um ciclo, e
-- o Postgres aborta em vez de resolver.
--
-- Por que só agora: um ADMIN nunca viu o bug. As policies são permissivas
-- e combinam por OR, então `profiles_admin_all` (is_admin(), que é
-- SECURITY DEFINER e não recursa) satisfazia o WITH CHECK antes de o ramo
-- recursivo importar. Só o usuário comum -- exatamente quem usa
-- /minha-conta/perfil -- caía nele.
--
-- A correção troca a subconsulta inline por um helper SECURITY DEFINER,
-- que é como `is_admin()` já resolve o mesmo problema desde
-- 20260910200900_rls_helper_functions.sql. Nada é afrouxado: trocar o
-- próprio `role` continua bloqueado, agora com 42501 em vez de 500.
--
-- Varredura feita junto: esta era a ÚNICA policy auto-referente do schema
-- (checado em pg_policy contra o nome da própria relação).

create or replace function public.current_profile_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $function$
  select role from public.profiles where id = auth.uid();
$function$;

comment on function public.current_profile_role() is
  'Papel do usuário autenticado, lido com SECURITY DEFINER para poder ser usado DENTRO de uma policy da própria tabela profiles sem fechar ciclo de RLS (42P17). Mesmo padrão de is_admin().';

revoke execute on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to authenticated;

alter policy "profiles_update_own" on public.profiles
  with check (
    id = (select auth.uid())
    and role = public.current_profile_role()
  );
