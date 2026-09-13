-- Onda 3 -- a home vira captura de intenção.
--
-- Contexto medido em produção antes desta migration: 2.722 escolas ativas
-- em MT, 141 municípios e ZERO listas reais publicadas (a única linha de
-- `school_lists` é a fixture de QA `qa-teste-...`, ver src/lib/qa/
-- fixtures.ts). Ou seja: a pergunta que traz a mãe até o produto -- "qual
-- é a lista da escola do meu filho?" -- hoje não tem resposta para
-- praticamente toda escola, e até agora o produto não tinha onde guardar
-- a pergunta. Ela chegava, batia num "ainda sem lista" e ia embora sem
-- deixar rastro.
--
-- Esta tabela guarda exatamente isso e nada além: escola + e-mail. Sem
-- conta, sem senha, sem perfil -- exigir cadastro para dizer "me avisa"
-- é justamente a fricção que faz a intenção se perder.
--
-- ATENÇÃO: esta migration NÃO envia e-mail nenhum e não existe nenhum
-- código de envio associado a ela. O SMTP não está configurado neste
-- projeto e o disparo é escopo de outra onda. `notified_at` existe para
-- que esse envio futuro saiba o que já saiu; nasce sempre NULL e hoje
-- ninguém o escreve.
--
-- ---------------------------------------------------------------------
-- Segurança (CLAUDE.md, regra absoluta: RLS obrigatório em toda tabela
-- nova). Um e-mail avulso amarrado a uma escola é PII e diz mais do que
-- parece: onde a pessoa mora, onde o filho dela estuda. O modelo aqui é
-- WRITE-ONLY para o público:
--
--   * INSERT liberado para `anon` e `authenticated` -- é o recurso em si,
--     capturar sem obrigar a criar conta. O WITH CHECK fixa
--     `notified_at is null` para que ninguém consiga marcar um pedido
--     como "já avisado" chamando o PostgREST direto.
--   * SELECT: nenhuma policy para anon nem para authenticated. Só admin,
--     pela policy `_admin_all`. Deliberadamente não existe nem um
--     "o dono do e-mail pode ver o próprio pedido": sem conta não há como
--     provar posse do e-mail, e uma leitura filtrada por e-mail viraria
--     exatamente o oráculo que este bloqueio existe para impedir
--     ("fulano@x.com pediu aviso para a escola Y?").
--   * UPDATE/DELETE: idem, só admin.
--
-- Consequência prática, e é intencional: a própria Server Action que
-- grava (src/lib/notifications/list-notification-actions.ts) também não
-- consegue ler a tabela -- ela roda com a chave anon. Por isso o
-- tratamento de duplicata é feito pelo erro 23505 da constraint UNIQUE, e
-- não por um SELECT prévio, que seria impossível aqui e vazaria a
-- informação em qualquer lugar onde fosse possível.
-- ---------------------------------------------------------------------

create table public.list_notification_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,

  -- Validação também no banco, não só na Server Action: a Action é a
  -- única porta hoje, mas a policy de INSERT é aberta para anon, então
  -- qualquer cliente PostgREST fala com esta tabela direto. Formato
  -- mínimo e conservador (não tenta ser um validador de RFC 5322, que
  -- rejeitaria endereços válidos) + teto de 254 caracteres, o limite
  -- real de um endereço de e-mail.
  constraint list_notification_requests_email_format check (
    length(email) between 6 and 254
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
  ),

  -- Pedir duas vezes é o comportamento normal de quem não lembra se já
  -- pediu -- vira no-op, não erro nem linha duplicada. Também é o índice
  -- que cobre a FK `school_id` (Postgres não indexa FK sozinho, e o
  -- advisor de performance cobra isso): `school_id` é a coluna líder.
  constraint list_notification_requests_school_email_key unique (school_id, email)
);

comment on table public.list_notification_requests is
  'Onda 3: "me avise quando publicarem a lista desta escola". Captura sem cadastro (só e-mail). PII: write-only para anon/authenticated, leitura só admin. Não dispara e-mail -- notified_at é para o envio de uma onda futura.';

comment on column public.list_notification_requests.notified_at is
  'NULL = ainda não avisado. Escrito apenas pelo futuro processo de envio (que ainda não existe); a policy de INSERT pública exige NULL.';

alter table public.list_notification_requests enable row level security;

-- Captura pública: o único caminho de escrita para quem não é admin.
create policy "list_notification_requests_insert_public" on public.list_notification_requests
  for insert to anon, authenticated
  with check (notified_at is null);

-- Leitura e gestão: só admin. É esta policy -- e a ausência de qualquer
-- outra de SELECT -- que impede que um visitante liste os e-mails.
create policy "list_notification_requests_admin_all" on public.list_notification_requests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
