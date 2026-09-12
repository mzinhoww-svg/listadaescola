# Bootstrap do primeiro admin

Como promover o primeiro `ADMIN`/`SUPER_ADMIN` do zero. Não existe (e não
deveria existir) nenhum caminho de auto-promoção pela aplicação — este
documento é o runbook operacional para o único momento em que uma
operação de banco privilegiada, fora da app, é necessária e correta.

## Por que isso não pode ser feito pela aplicação

- Todo usuário novo nasce com `role = 'USER'`
  (`supabase/migrations/20260910200100_profiles.sql:7`, aplicado pelo
  trigger `handle_new_user()` no signup).
- A policy `profiles_update_own` deixa o próprio usuário atualizar seu
  perfil, mas o `WITH CHECK` re-lê o `role` já armazenado e exige que
  permaneça igual — uma tentativa de UPDATE que mude o próprio `role`
  falha por RLS, não por validação de aplicação
  (`supabase/migrations/20260910201000_rls_profiles_schools.sql:22-28`,
  já coberto por `docs/security/rls.md` teste #4).
- A única RPC que troca papel de usuário,
  `admin_set_user_role(p_user_id, p_role)`, exige `is_admin()` verdadeiro
  para o *chamador* antes de fazer qualquer coisa
  (`supabase/migrations/20260912000000_hardening_rn004_sec008_expand.sql:140-141`) —
  e `is_admin()` é `role in ('ADMIN','SUPER_ADMIN')` do próprio perfil
  (`supabase/migrations/20260910200900_rls_helper_functions.sql:18-21`).

Ou seja: **por design**, ninguém consegue virar admin sem que um admin já
exista. Isso é o comportamento correto (RLS não pode ter uma exceção
"a primeira vez vale" embutida sem abrir uma brecha permanente) — o
bootstrap do primeiro admin é, de propósito, uma operação manual fora da
RLS, feita uma única vez por quem já tem acesso privilegiado ao projeto
Supabase (SQL Editor do dashboard, ou a connection string/service role,
nunca a chave publishable/anon).

## Estado atual (confirmado nesta auditoria, 2026-09-12)

`select count(*) from public.profiles` = 0. `select count(*) from
public.profiles where role in ('ADMIN','SUPER_ADMIN')` = 0. **Nenhum
usuário jamais se cadastrou em produção** — isso não é um bug, é uma
lacuna de dado operacional (nenhum dado foi inventado para "preencher"
isso; ver `docs/implementation/post-mvp-hardening-report.md`, seção
"Dados operacionais necessários"). Este runbook só é executável depois
que a pessoa que vai administrar o site tiver criado uma conta normal
pelo fluxo público de cadastro (`/auth/criar-conta`).

## Pré-requisito

1. A pessoa que será admin já se cadastrou normalmente pelo site
   (`/auth/criar-conta`) e confirmou o e-mail. Isso cria a linha em
   `auth.users` e, via trigger, a linha correspondente em
   `public.profiles` com `role = 'USER'`.
2. Quem executa este runbook tem acesso ao SQL Editor do projeto Supabase
   (`wfdejmokxrunupsekcmq`) ou à `mcp__Supabase__execute_sql` — ambos
   rodam com privilégio suficiente para ignorar RLS. **Nunca** faça isso
   com a chave publishable/anon (não seria suficiente de qualquer forma —
   RLS bloquearia).

## SQL seguro (idempotente, escopado por e-mail — nunca por "o usuário mais recente")

```sql
-- 1) Confirmar que é exatamente a pessoa certa antes de promover.
select id, email, created_at
from auth.users
where email = '<email-da-pessoa@dominio-real>';

-- 2) Promover (troque '<uuid-do-passo-1>' pelo id retornado acima).
--    ADMIN é suficiente para toda operação administrativa hoje
--    (moderação, CRUD, papéis de outros usuários). Reserve SUPER_ADMIN
--    (mesmo poder efetivo hoje -- nenhuma rotina do produto distingue os
--    dois além de ambos passarem em is_admin()) para o responsável final
--    pelo projeto, caso queira uma distinção futura.
update public.profiles
set role = 'ADMIN'
where id = '<uuid-do-passo-1>';
```

Escopar por `email` (não por "última linha inserida" ou LIMIT 1) evita
promover a pessoa errada caso mais de um cadastro exista quando este
runbook for executado.

## Verificação

```sql
select p.id, u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.role in ('ADMIN', 'SUPER_ADMIN');
```

Confirme visualmente que a linha retornada é a pessoa esperada antes de
considerar o bootstrap concluído. Em seguida, a própria pessoa deve
conseguir: logar normalmente, acessar `/admin` (o layout
`src/app/(admin)/admin/layout.tsx` já faz o gate por role — nada extra a
configurar) e ver a UI de administração real, não a tela "Acesso
restrito".

## Rollback

Se a promoção foi um engano (pessoa errada, ou precisa ser desfeita por
qualquer motivo):

```sql
update public.profiles set role = 'USER' where id = '<uuid>';
```

Isso não apaga nada — apenas reverte o papel. `audit_logs` não registra
esta operação específica (ela não passa por `admin_set_user_role`, é uma
alteração direta de banco) — por isso o passo de verificação acima é
importante: não há trilha de auditoria automática do próprio bootstrap.
Promoções *subsequentes* feitas pelo admin já promovido, via
`/admin/usuarios` (RF-016) usando `admin_set_user_role`, **são**
auditadas normalmente em `audit_logs` (`ADMIN_SET_USER_ROLE`).

## Depois do primeiro admin

Todo próximo admin deve ser promovido pelo primeiro admin através da UI
real (`/admin/usuarios`), nunca por este runbook de novo — este documento
existe exclusivamente para o problema do "primeiro admin", que é o único
caso em que a app não tem como se auto-bootstrapar por design.

## Nunca fazer

- Nunca colar aqui, em qualquer commit, ou em qualquer log a service role
  key ou a connection string do Postgres — este documento descreve o
  procedimento, não as credenciais para executá-lo.
- Nunca promover por `limit 1 order by created_at desc` ou qualquer
  heurística que não confirme a identidade exata pelo e-mail esperado.
- Nunca reintroduzir um caminho de auto-promoção na aplicação (endpoint,
  RPC, variável de ambiente "primeiro usuário vira admin", etc.) para
  "facilitar" isso — o gap é meramente operacional (uma query manual, uma
  vez), não um problema de produto a ser resolvido com código.
