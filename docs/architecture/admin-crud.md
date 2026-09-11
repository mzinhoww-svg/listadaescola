# Listada Escola — Admin CRUD (Prompt 12)

CRUD administrativo para escolas, listas, papelarias, e-commerce e
catálogo (PRD RF-016, wireframes #21-23), mais a moderação de
`school_suggestions` explicitamente adiada do Prompt 11 (ver
`docs/architecture/moderacao.md`, "Fora do escopo deste prompt"). Ao
contrário dos Prompts 10/11, aqui a RLS já cobria tudo -- toda tabela
tocada já tinha uma policy `<tabela>_admin_all` (`for all to authenticated
using (is_admin()) with check (is_admin())`) desde o Prompt 02. O que
faltava era a UI, oito novas funções `SECURITY DEFINER` para
mutação-com-audit-log (só uma função pode escrever em `audit_logs` --
essa tabela não tem policy de INSERT para nenhum papel via API), e uma
coluna nova.

## Escopo: o que este prompt cobre e o que não cobre

A instrução do prompt é literal: "escolas, listas, papelarias, e-commerce
e catálogo". A seção 16 do PRD é mais ampla (inclui Usuários, Patrocínios,
Analytics) -- essas três ficam de fora aqui de propósito, cada uma já tem
prompt próprio na sequência numerada: Patrocínios é o Prompt 13
(`ranking-patrocinio`), Analytics é o Prompt 14 (`analytics-vendas`).
Usuários/permissões (`/admin/usuarios`) não tem prompt dedicado nem foi
pedido explicitamente aqui -- não implementado, para não inflar o escopo
sem pedido.

Dentro do que foi pedido, alguns sub-recursos também ficaram de fora,
com razão específica cada:

- **Escolas**: edita `school_profiles` (descrição, logo, site, Instagram,
  WhatsApp), `is_verified` e `schools.is_active`. Não edita nenhuma coluna
  INEP-controlada de `schools` (nome, endereço, etc.) -- só o importador
  toca essas (RN-002), e o formulário nem envia esses campos. Não cria
  escola do zero -- `schools.inep_code` é `not null unique`; toda escola
  vem do INEP (RN-001). "Importar" já existe como script (Prompt 04), não
  como upload na UI -- não pedido aqui e adicioná-lo seria bem mais escopo
  que "CRUD".
- **Listas**: só visualiza (todas as versões + itens) e arquiva/reativa
  (`school_lists.status`). Criar lista, nova versão ou editar item
  continua exclusivamente via `approve_submission()` -- o comentário
  original da migration (`lists_contributions.sql`) já é explícito que
  esse é o único caminho de escrita, e replicar esse caminho aqui
  duplicaria a lógica de moderação sem necessidade.
- **Papelarias/E-commerce/Catálogo**: CRUD completo (criar, editar,
  ativar/inativar) -- diferente de escolas/listas, não existe um
  "pipeline" externo alimentando essas tabelas, então o admin é o único
  jeito de popular/manter esses dados.
- **`school_suggestions` aprovada não vira `schools` automaticamente** --
  mesmo motivo do "não cria escola do zero" acima (sem `inep_code`
  válido). Aprovar só marca a sugestão como revisada; o comentário
  original da migration já dizia "an admin does that manually after
  reviewing" -- continua manual/fora de banda.

## Nova coluna + índice

`school_suggestions.rejection_reason` (text, nullable) -- não existia;
`list_submissions` tem `rejection_reason`/`correction_notes` separados do
texto do autor, `school_suggestions` só tinha `notes` (preenchido pelo
sugeridor). Reaproveitar `notes` para o motivo do admin sobrescreveria o
texto original do autor -- coluna nova, mesmo padrão de `list_submissions`.

`school_suggestions_status_idx` -- primeira query real filtrando por
`status` nessa tabela (a fila de moderação); mesmo padrão de
`list_submissions_status_idx`/`reviews_status_idx`.

## Nove funções novas, todas `SECURITY DEFINER`

`admin_update_school`, `admin_upsert_store`, `admin_upsert_ecommerce_partner`,
`admin_upsert_product`, `admin_upsert_ecommerce_product`,
`admin_set_school_list_status`, `approve_school_suggestion`,
`reject_school_suggestion` -- todas: `is_admin()` primeiro, validação
mínima de payload (campos obrigatórios não-vazios, lat/long em range,
preço não-negativo), a mutação, e um `insert into audit_logs` com
`before`/`after`. Os quatro `upsert` fazem criar-ou-editar no mesmo RPC
(`p_..._id` nulo = criar) para não duplicar em dois RPCs por entidade.

Nono: `unique_slug(base, tabela, exclude_id)` -- helper interno (nunca
chamado pelo client) que gera um slug único reaproveitando `slugify()` do
Prompt 02, usado por `admin_upsert_store`/`admin_upsert_ecommerce_partner`
na criação. Slug é definido só na criação e nunca muda no update, mesmo
que o nome mude -- evita quebrar link público existente.

## Achado real: `anon`/`authenticated` ganham EXECUTE por default privilege do projeto, não só por PUBLIC

Ao verificar o grant das nove funções novas (mesmo hábito criado no
Prompt 11: nunca confiar que `revoke ... from anon` funcionou, sempre
conferir `pg_proc.proacl`), a primeira tentativa (`revoke ... from
public` + `grant ... to authenticated`, exatamente a correção do Prompt
11) **não bastou** -- `anon` continuava com EXECUTE direto. Diferente do
achado do Prompt 11 (`anon` só tinha acesso via PUBLIC), dessa vez
`pg_default_acl` mostrou uma entrada real:

```sql
select * from pg_default_acl where defaclnamespace = 'public'::regnamespace;
-- defaclobjtype = 'f' (functions), role postgres:
-- postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres
```

Ou seja, o projeto Supabase tinha (em algum momento entre o Prompt 11 e
este) passado a conceder EXECUTE em toda função nova ao `anon` via
`ALTER DEFAULT PRIVILEGES`, não só via o grant implícito ao PUBLIC -- um
grant direto, independente, que `revoke ... from public` não toca.
Confirmado comparando `proacl` das funções do Prompt 11 (sem entrada
`anon=`, criadas antes desse default existir) com as deste prompt (com
`anon=`, criadas depois). Corrigido em duas camadas:

1. `revoke execute on function <cada uma> from anon` -- corrige as nove
   funções já criadas (mudança de default privilege não é retroativa).
2. `alter default privileges for role postgres in schema public revoke
   execute on functions from anon` -- corrige a causa raiz, pra Prompt 13
   em diante não precisar lembrar desse passo extra a cada função nova.

Um terceiro ajuste: `unique_slug` também tinha `authenticated=X` via o
mesmo default (deveria ser 100% interna) -- `get_advisors()` confirmou via
`authenticated_security_definer_function_executable`; revogado também.

**Sem exploit real** (mesmo padrão de todos os achados de grant
anteriores) -- cada função checa `is_admin()` como primeiro statement, um
`anon`/não-admin sempre falha antes de qualquer leitura/escrita.
Confirmado antes/depois via `get_advisors(security)`: WARN de
`anon_security_definer_function_executable` continua nas mesmas 7
entradas pré-existentes (6 já documentadas como deferidas ao Prompt 16 +
`record_analytics_event`, que é aberto a `anon` de propósito), sem
nenhuma das nove funções deste prompt na lista.

## Dashboard: só contagens reais

`/admin` trocou o `ScaffoldNotice` por seis cards reais (escolas ativas,
listas publicadas, submissões pendentes, sugestões pendentes, papelarias
ativas, parceiros ativos) -- todos `count(*)` direto. Visitas, buscas,
cliques e conversão (também pedidos pela seção 16 do PRD) ficam de fora --
dependem de agregação de `analytics_events`, explicitamente "Prompt 14
(analytics-vendas)"; mostrar um número ali seria fabricar dado, mesmo
princípio já aplicado a distância/avaliação em prompts anteriores.

## Testes realizados

Todas as tabelas envolvidas estavam em 0 linhas antes deste prompt
(confirmado por query). Dois usuários de teste criados via SQL direto
(mesmo motivo dos prompts anteriores: `/signup` real rejeita o domínio de
e-mail de teste) -- um ADMIN, um comum. Semeados: 3 `school_suggestions`
(uma para aprovar, uma do próprio admin para testar o guard de
auto-revisão, uma para rejeitar) e 1 lista publicada real (ligada a uma
escola MT real do import do Prompt 04, não uma escola fabricada).

Fluxo completo testado ao vivo (Playwright + SQL): RBAC (usuário comum vê
"Acesso restrito" em `/admin/escolas`); dashboard sem o placeholder antigo
e com contagem real; busca de escola por nome; edição de perfil editorial
persistindo após reload; **ida e volta completa de ativar/inativar escola**
(ativa → inativa → ativa, cada uma confirmada por reload); arquivar e
reativar lista (**achado real**: o formulário não mostrava a mensagem de
sucesso do `useActionState` -- só o componente de status, ao contrário de
todo outro formulário do admin -- corrigido); criar papelaria e editar
(desativar); criar parceiro de e-commerce; criar produto e oferta de
parceiro com preço exibido corretamente; fila de sugestões mostrando as 3
sementes; **guard de auto-revisão bloqueia** o admin aprovando a própria
sugestão, erro visível na UI; aprovar sugestão de outro usuário; rejeitar
sugestão com motivo, motivo exibido no detalhe. 23/23 verificações
passaram (22 na rodada principal + 1 na rodada de confirmação do fix de
mensagem de sucesso).

`audit_logs` conferido linha a linha: 14 entradas, uma por mutação real
(3× ADMIN_UPDATE_SCHOOL, 4× ADMIN_SET_LIST_STATUS, 1× cada
ADMIN_CREATE/UPDATE_STORE, ADMIN_CREATE_ECOMMERCE_PARTNER,
ADMIN_CREATE_PRODUCT, ADMIN_CREATE_ECOMMERCE_PRODUCT,
APPROVE_SCHOOL_SUGGESTION, REJECT_SCHOOL_SUGGESTION) -- nenhuma entrada
para a tentativa de auto-revisão bloqueada, mesmo comportamento do Prompt
11. Limpeza confirmada por query: todas as tabelas de teste voltaram a 0
linhas, a escola real usada no teste voltou exatamente ao estado original
(`is_active = true`, zero linhas em `school_profiles`), nenhum profile
órfão.

## Refatoração pequena: `requireAdmin` compartilhado

`src/lib/moderation/actions.ts` tinha sua própria cópia privada de
`requireAdmin()` (criada no Prompt 11, antes de existir um segundo
consumidor). Extraída para `src/lib/admin/guard.ts` -- comportamento
idêntico, só realocada -- porque este prompt adiciona seis novos módulos
de Server Actions que precisariam da mesma checagem; manter a cópia local
duplicaria a mesma lógica seis vezes a mais.

## Fora do escopo deste prompt

- `/admin/usuarios`, `/admin/configuracoes`, `/admin/avaliacoes`
  (moderação de reviews) -- sem prompt dedicado na sequência, não pedido
  explicitamente na instrução deste prompt.
- `/admin/patrocinios` -- Prompt 13.
- Analytics do dashboard (visitas/buscas/cliques/conversão) -- Prompt 14.
- `is_sponsored` em `school_profiles`/`stores` -- colunas existem mas não
  são lidas por `search_schools()` (que usa `campaigns` direto); não
  tocadas aqui para não colidir com o que o Prompt 13 for decidir sobre
  esse sinal.
- `is_staff`/`is_school_manager`/`is_store_manager`/`handle_new_user`/
  `guard_submission_status_transition` continuam com o mesmo gap de PUBLIC
  grant documentado no Prompt 11 -- ainda deferido ao Prompt 16.
