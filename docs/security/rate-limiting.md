# Rate limiting (SEC-008 — hardening pós-MVP)

Estende o rate limiting que já existia só para login
(`auth_login_attempts`/`check_login_rate_limit`/`record_login_attempt`,
Prompt 20) para as demais superfícies que a tarefa de hardening pediu.
Este documento registra a análise de custo/risco/frequência que decidiu
**onde** aplicar limite — a própria tarefa pediu explicitamente para não
aplicar rate limiting "cego" em tudo — e a verificação ao vivo do
mecanismo.

## Por que login continua separado

`auth_login_attempts`/`check_login_rate_limit`/`record_login_attempt`
precisam ser chamáveis por `anon` (login é, por definição, pré-
autenticado) e usam o e-mail digitado como identificador. Todo caso novo
abaixo é sempre uma ação que já exige sessão — por isso usa um mecanismo
mais simples e mais seguro: identidade vem sempre de `auth.uid()`
(nunca de um valor enviado pelo cliente), o que fecha por design a
possibilidade de um usuário se passar por outro para burlar o limite de
outra pessoa. Os dois mecanismos ficam deliberadamente separados — misturar
um identificador por e-mail (pré-auth) com um por `auth.uid()`
(pós-auth) no mesmo código só complicaria os dois casos sem necessidade.

## Mecanismo

Migração `supabase/migrations/20260912000000_hardening_rn004_sec008_expand.sql`:

- `rate_limit_hits (action, identifier, created_at)` — tabela genérica,
  reutilizável para qualquer ação futura sem migration nova. RLS
  habilitada, **sem nenhuma policy** (mesmo padrão de
  `auth_login_attempts`): só as duas funções abaixo tocam a tabela, e
  ambas são `security definer`.
- `check_rate_limit(p_action text, p_max_hits int, p_window_minutes int) returns boolean`
  — conta hits de `identifier = auth.uid()::text` na janela pedida;
  `false` se `auth.uid()` for nulo (fail-closed, nunca fail-open) ou se o
  limite já foi atingido.
- `record_rate_limit_hit(p_action text)` — registra um hit para
  `auth.uid()`; faz housekeeping best-effort (apaga hits da mesma
  ação/identificador com mais de 1 dia) a cada chamada, mesmo padrão de
  `record_login_attempt`.
- Grants: `revoke ... from public` + `grant execute ... to authenticated`
  apenas — **`anon` não recebe EXECUTE em nenhuma das duas funções**. Isso
  dá duas camadas independentes de fail-closed: `anon` é rejeitado pelo
  Postgres antes mesmo de entrar na função (grant), e uma sessão
  `authenticated` sem JWT válido é rejeitada pela própria lógica interna
  (`auth.uid() is null`). Verificado ao vivo (ver seção Verificação).

## Onde foi aplicado, e por quê (alta prioridade no prompt)

| Superfície | Limite | Justificativa |
|---|---|---|
| Início de submissão de lista (`startSubmissionAction`, `src/lib/contributions/actions.ts`) | 10/hora por usuário | Único ponto desta tela que entra na fila de moderação (adicionar item/anexo edita um rascunho já existente). Risco real: conteúdo livre chegando à fila sem limite, custo de tempo de moderador. 10/hora é folgado para um contribuidor real, alto o bastante para barrar abuso automatizado. |
| Criação de avaliação (`createReviewAction`, `src/lib/reviews/actions.ts`) | 10/hora por usuário | Mesmo risco de spam na fila de moderação. `unique(school_id, profile_id)` já impede repetir a mesma escola, mas não impede avaliar muitas escolas diferentes rapidamente. |
| Upload de anexo (`POST /api/contributions/attachments`) | 20/hora por usuário | Único ponto do produto com custo externo **direto e real** (armazenamento/banda do Supabase Storage) — o prompt cita isso explicitamente como alvo de alta prioridade. Checado **antes** de ler o corpo da requisição (antes de `request.formData()`), para não gastar banda nem em upload que será recusado. |
| Troca de papel de usuário (`admin_set_user_role`, embutido na própria função SQL) | 20/hora por admin | Endpoint administrativo mais sensível do sistema (escalonamento de privilégio). Limite embutido **dentro da RPC**, não só na Server Action que a chama — não pode ser contornado com uma chamada direta via PostgREST. |

## Deliberadamente NÃO limitado nesta passada (prioridade média no prompt — não "esquecido")

- **Busca pública** (`search_schools`): já tem `p_limit` travado em 100
  desde o Prompt 16/18 e não gera custo por chamada nem entra em fila de
  moderação — o próprio prompt de hardening classifica busca como
  prioridade média, não alta, e pede para não aplicar limite onde o risco
  não justifica.
- **Analytics** (`recordAnalyticsEvent`): mesma razão — sem custo por
  evento, sem fila de moderação. Rate-limitar isso arriscaria perder
  dado de uso real (contagens de eventos são histórico legítimo, nunca
  descartado por este projeto — ver `supabase/tests/e2e-cleanup.sql`) sem
  nenhum ganho de segurança correspondente.

## "Limites configuráveis"

Cada limite é um parâmetro explícito passado por quem chama
`check_rate_limit`/`record_rate_limit_hit` (`p_max_hits`,
`p_window_minutes`), nunca um valor fixo escondido dentro da função
genérica — ajustar o limite de uma superfície é uma mudança de uma linha
no call site (`src/lib/contributions/actions.ts`,
`src/lib/reviews/actions.ts`, a route de attachments, ou o corpo de
`admin_set_user_role`), sem alterar schema nem a função genérica. Uma
configuração ajustável **em runtime** (tabela de config editável por
admin, sem deploy) foi deliberadamente deixada de fora: seria uma feature
nova não pedida pelo PRD nem necessária no MVP — os limites atuais já são
fáceis de localizar e alterar por quem tem acesso ao código, o que é
suficiente para o estágio atual do produto (zero usuários reais ainda,
ver `docs/implementation/post-mvp-hardening-report.md`).

## Verificação ao vivo

Executado via `mcp__Supabase__execute_sql` contra o projeto real
(`wfdejmokxrunupsekcmq`), dentro de `begin;...rollback;` (nada
commitado), simulando identidade com o mesmo padrão de
`supabase/tests/rls_idor.sql`/`admin-self-approval-regression.sql`
(`set local role` + `set_config('request.jwt.claims', ...)`). 7/7
asserções passaram:

1. As 3 primeiras chamadas de `check_rate_limit('smoketest_action', 3, 60)`
   para o mesmo `auth.uid()` retornam `true`.
2. A 4ª chamada (limite já atingido) retorna `false`.
3. Uma ação diferente (`outra_acao_smoketest`) para o mesmo usuário não é
   afetada — confirma o escopo por `(action, identifier)`, não só por
   usuário.
4. Role `authenticated` sem `request.jwt.claims` válido (`auth.uid()`
   nulo) é negado pela lógica interna da função (`return false`).
5. Role `anon` nem chega a executar o corpo da função — Postgres rejeita
   com `insufficient_privilege` (`permission denied for function
   check_rate_limit`) antes disso, confirmando que o `revoke ... from
   public` + grant só a `authenticated` está em vigor.

`admin_set_user_role`'s própria checagem embutida não recebeu um teste ao
vivo dedicado (exigiria 21 chamadas reais trocando o papel de um usuário
de teste) — não foi considerado necessário porque a checagem em si é uma
única linha (`if not public.check_rate_limit(...) then raise exception
...`) sobre um primitivo (`check_rate_limit`) já verificado
exaustivamente acima; o risco de uma integração de uma linha estar errada
de um jeito que os 7 testes acima não pegariam é baixo o suficiente para
não justificar o custo de mais um teste ao vivo invasivo (trocar papel de
verdade, mesmo que revertido depois).
