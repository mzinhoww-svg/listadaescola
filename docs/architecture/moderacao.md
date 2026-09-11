# Listada Escola — Moderação de contribuições (Prompt 11)

Fila + decisão segura de publicação (PRD RF-009, wireframes #19-20). Como
o Prompt 10, o schema já existia desde o Prompt 02: `approve_submission()`
/ `reject_submission()` / `request_submission_correction()` já eram
SECURITY DEFINER, admin-gated, e já escreviam em `audit_logs`. Este
prompt cobre o que faltava: a UI admin que chama essas funções, um quarto
RPC pra completar a cadeia de transição, e um guard de autorização real
que faltava nas três funções originais.

## Achado real: "impedir autor de aprovar própria submission" não existia

A instrução do prompt foi literal: "impedir autor de aprovar própria
submission". Conferindo o código de `approve_submission()`/
`reject_submission()`/`request_submission_correction()` (Prompt 02), os
três só checavam `is_admin()` -- nada impedia um admin que também é autor
de uma submissão (ex.: testou o próprio fluxo de contribuição, ou é
funcionário da escola) de decidir sobre a própria contribuição. O guard
foi adicionado nas três funções, não só em `approve` -- rejeitar ou pedir
correção na própria submissão é o mesmo conflito de interesse, só menos
óbvio de explorar que auto-aprovação. `mark_submission_under_review()`
(abaixo) não tem esse guard de propósito: é só "alguém está olhando
isso agora", não uma decisão.

Testado ao vivo: o mesmo usuário admin conseguiu marcar a própria
submissão como "em revisão" normalmente, mas tentar aprovar a própria
retornou o erro do banco (`you cannot review your own submission`)
exibido de forma limpa na UI.

## `mark_submission_under_review()` -- o RPC que faltava na cadeia

A cadeia de transição do PRD é `SUBMITTED -> UNDER_REVIEW ->
APPROVED/REJECTED/NEEDS_CORRECTION`, mas só existiam funções para o
segundo hop. Um admin já conseguia chegar em `UNDER_REVIEW` via UPDATE
direto (o trigger `guard_submission_status_transition` já libera
qualquer transição para admin), só que isso pulava o
`audit_logs` -- a única transição da cadeia inteira sem registro. Criada
como uma quarta função no mesmo padrão (SECURITY DEFINER, admin-gated,
grava em `audit_logs`) para fechar essa lacuna de auditoria (SEC-007).

Na UI, isso vira um botão explícito "Iniciar revisão" que precisa ser
clicado antes de Aprovar/Rejeitar/Pedir correção aparecerem -- torna
visível na fila quem já está sendo olhado (`UNDER_REVIEW`) vs. quem
ainda não foi tocado (`SUBMITTED`), em vez de aprovar/rejeitar direto de
`SUBMITTED` silenciosamente.

## Achado real, mais sério: `anon` conseguia executar as quatro funções via RPC

Descoberto ao configurar o grant da função nova. `advisor_fixes.sql`
(Prompt 02) já tinha um `revoke execute ... from anon` nas três funções
originais, com o comentário explícito "anon has no legitimate reason to
call them" -- mas isso nunca funcionou de verdade. Confirmado ao vivo via
`select proacl from pg_proc where proname = 'approve_submission'`: a ACL
mostrava `{=X/postgres,postgres=X/postgres,authenticated=X/postgres,...}`
-- o `=X/postgres` é o grant do pseudo-papel `PUBLIC`, que toda função
recebe automaticamente na criação. `anon` nunca teve um grant DIRETO
(só `authenticated`/`service_role` têm, via default privileges do
próprio projeto Supabase) -- seu acesso vinha inteiramente do PUBLIC.
Revogar de um papel que só tem o privilégio via PUBLIC não faz nada em
Postgres; é preciso revogar do PUBLIC diretamente. `get_advisors()`
sinalizava isso corretamente (`anon_security_definer_function_executable`,
WARN) desde antes deste prompt, mas o achado nunca tinha sido investigado
a fundo.

**Sem exploit real:** cada função já checa `is_admin()` como a primeira
linha, então uma chamada anônima sempre falhava com "only admins may...".
Mas não era o modelo de acesso pretendido. Corrigido para as quatro
funções de moderação (`revoke ... from public` + `grant ... to
authenticated` explícito, deixando a intenção legível no próprio
migration em vez de depender de um default privileges do projeto que não
está versionado). Confirmado depois via `pg_proc.proacl` (a entrada
`=X/postgres` some) e via `get_advisors()` (as quatro somem da lista de
`anon`, continuam -- corretamente -- na lista de `authenticated`, que é
o modelo de acesso intencional).

**Mesma lacuna existe em `is_admin`/`is_staff`/`is_school_manager`/
`is_store_manager`/`handle_new_user`/`guard_submission_status_transition`**
(Prompt 02/03, domínio de auth, não moderação) -- não alterado aqui pra
não expandir o escopo deste prompt. `is_admin` etc. são leituras booleanas
sem efeito colateral (chamar como anon só retorna `false`); `handle_new_user`/
`guard_submission_status_transition` são funções trigger-only que o
Postgres já recusa executar fora de um trigger, independente de grant.
Ou seja: real, mas sem exploit em nenhum dos dois grupos -- registrado
aqui para o Prompt 16 (auditoria de segurança) resolver de forma
abrangente, em vez de ser espalhado por prompts não relacionados.

## Fila: "prioridade" é ordem, não uma coluna fabricada

O prompt pede "fila por prioridade" mas não existe (nem foi criada) uma
coluna de prioridade manual -- `list_submissions` não tem nada parecido, e
inventar uma pontuação sem fonte real violaria o mesmo princípio de "nunca
fabricar" já aplicado a distância/rating em prompts anteriores. A fila
ordena por `created_at asc`: a submissão esperando há mais tempo aparece
primeiro. A UI é explícita sobre isso ("ordenada pelas mais antigas
primeiro... não a 'mais urgente'"), pra não sugerir uma noção de
prioridade que não existe de verdade.

## Anexo: signed URL, não link direto

O bucket `submissions` é privado (Prompt 02/10). A tela de detalhe gera
uma signed URL por anexo (`createSignedUrl`, 10 minutos) a cada carga da
página -- nunca persiste a URL, nunca expõe `storage_path` cru. Imagem
renderiza inline (`<img>`, com a razão do `eslint-disable` explicada no
comentário -- é uma URL assinada e de curta duração, não um asset público
otimizável pelo `next/image`); PDF vira link "Abrir PDF" em nova aba.

## Testes realizados

`list_submissions`/`school_suggestions`/`auth.users` estavam em 0 linhas
antes deste prompt (confirmado por query -- limpeza do Prompt 10 já tinha
zerado tudo). Dois usuários de teste criados via SQL direto (mesmo motivo
do Prompt 10: `/signup` real rejeita o domínio de e-mail de teste) -- um
promovido a `ADMIN`, outro comum -- e 4 submissões `SUBMITTED` reais
semeadas (uma com anexo real no bucket) cobrindo os quatro caminhos:
aprovar, rejeitar, pedir correção, e auto-revisão (mesmo usuário admin
como autor).

Fluxo completo testado ao vivo (Playwright): RBAC (usuário comum vê
"Acesso restrito" em `/admin/moderacao`); fila mostra as 4 submissões;
detalhe mostra documento original (PDF) e dados submetidos (itens, com
badge "opcional") corretamente; **Iniciar revisão → Aprovar** publica de
verdade -- confirmado via SQL que `school_lists`/`school_list_versions`
(status `PUBLISHED`)/`school_list_items` foram criados com os dados
corretos; **Iniciar revisão → Rejeitar** com motivo obrigatório; **Iniciar
revisão → Pedir correção** com notas obrigatórias; **guard de
auto-revisão** bloqueia decisão na própria submissão com erro visível na
UI; **round-trip real** -- o autor da submissão com pedido de correção
viu, ao voltar em `/enviar-lista` (tela construída no Prompt 10), o badge
"Precisa de correção" e as notas exatas escritas pelo admin, provando que
os dois prompts realmente se encaixam. 16/16 verificações passaram.
`audit_logs` conferido linha a linha: uma entrada por transição real
(`MARK_SUBMISSION_UNDER_REVIEW` sempre antes da decisão), nenhuma entrada
para a tentativa de auto-aprovação bloqueada (a exceção interrompe a
função antes do insert). Limpeza confirmada por query: todas as tabelas
envolvidas, incluindo `audit_logs` e o objeto real do bucket `submissions`
(removido via Storage API), voltaram a 0 linhas.

## Fora do escopo deste prompt

- Moderação de `school_suggestions` -- schema/RLS compartilham o mesmo
  enum de status de `list_submissions`, mas o texto deste prompt fala só
  em "cidade, escola, ano, série" (campos específicos de lista) e não
  existe nenhuma função `approve_school_suggestion()` equivalente.
  Natural para o Prompt 12 (Admin CRUD), que já cobre "Escolas: importar,
  visualizar, editar... verificar, ativar/inativar" de forma mais ampla.
- Dashboard admin (`/admin`, contagem de "Submissões pendentes" etc.) --
  ainda tem o `ScaffoldNotice` do Prompt 12, não tocado aqui.
- Correção do gap de `anon`-EXECUTE nas seis funções de auth/analytics
  fora do domínio de moderação -- ver seção acima, registrado para o
  Prompt 16.
