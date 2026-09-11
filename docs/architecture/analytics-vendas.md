# Listada Escola — Analytics + Vendas (Prompt 14)

Medir intenção e conversão sem pagamento próprio (RF-015). Duas partes:
completar a instrumentação de eventos que já existia desde o Prompt 06
(`analytics_events`/`record_analytics_event()`), e adicionar o domínio
comercial que a própria migration do Prompt 02 já previa: "Prompt 14
extends `analytics_events` with the commercial reporting tables (sales,
commissions)".

## O que já existia (Prompts 06-13) e não foi duplicado

- `analytics_events` + `record_analytics_event()` — 15 tipos de evento já
  no allowlist, 11 já com call site real (busca, localização, impressão,
  escola, lista, share, commerce click, whatsapp click, store view,
  favorites). `admin_analytics_event_counts`/`admin_analytics_top_schools`
  (novos, abaixo) leem essa mesma tabela — nenhuma tabela de evento nova.
- **Solicitação** de orçamento (papelaria) = evento `whatsapp_click`
  (Prompt 09, RF-011). **Cliques** de e-commerce = evento `commerce_click`
  (Prompt 08). Nenhum dos dois foi reimplementado aqui — as novas tabelas
  de venda (abaixo) começam exatamente onde esses eventos já terminam.

## Gap fechado: 3 tipos de evento reservados, zero call sites

`submission_started`/`submission_submitted`/`submission_approved` já
existiam no allowlist de `record_analytics_event()` desde o Prompt 06, mas
nenhum código nunca os chamava — a instrução deste prompt lista
"submissions" como uma das categorias de evento a cobrir, e a PRD (seção
15) já os listava como parte do conjunto obrigatório. Ligados em 5 pontos:

- `submission_started` — `startSubmissionAction` (`src/lib/contributions/actions.ts`),
  só no branch que cria um DRAFT novo (o branch que reaproveita um draft
  existente não é um "start" de verdade).
- `submission_submitted` — `submitSubmissionAction` (lista) e
  `submitSchoolSuggestionAction` (sugestão de escola).
- `submission_approved` — `approveSubmissionAction` (moderação de listas)
  e `approveSchoolSuggestionAction` (moderação de sugestões), depois da
  RPC de aprovação já ter tido sucesso.

`review_created` continua sem call site — não existe nenhuma feature de
criação de review no código (`reviews` só é lido, nunca escrito, em
`search_schools()`); criar essa feature não é o que este prompt pede.

## Tabelas novas: `store_sale_reports` / `partner_sale_reports`

Dois canais, dois formatos — papelaria tem um ciclo de vida com status
(`solicitação -> orçamento -> venda`), e-commerce é um log plano de
conversões reportadas. Ao contrário de `campaigns` (Prompt 13), cujo split
SCHOOL/STORE é o mesmo conceito simples (prioridade), aqui os dois canais
têm campos genuinamente diferentes — por isso duas tabelas, não uma
polimórfica.

- `store_sale_reports`: `store_id` (FK, obrigatório), `school_id`/`list_id`
  (FK, opcionais), `status` (`REQUESTED`/`QUOTED`/`CONVERTED`/`LOST`),
  `quoted_value`, `sale_value`, `notes`. Check constraint:
  `status <> 'CONVERTED' or sale_value is not null`.
- `partner_sale_reports`: `partner_id` (FK, obrigatório),
  `ecommerce_product_id`/`school_id`/`list_id` (FK, opcionais),
  `gross_value`, `commission_value` (check: `0 <= commission <= gross`).

"Ticket médio" e "conversão" (papelaria) nunca são colunas — são derivados
em `summarizeStoreSaleReports()` (`src/lib/admin/sales.ts`) a cada leitura,
mesmo princípio já aplicado a distância/avaliação/organic_score no resto
do projeto: nunca guardar um número redundante que pode ficar
dessincronizado do dado real.

### Por que autorreportado por admin, não autosserviço do parceiro/papelaria

Nem `ecommerce_partners` nem `stores` têm portal próprio hoje.
`STORE_MANAGER` é um papel real no enum `user_role`, e `store_managers` já
tem uma policy RLS de self-select ("ver as papelarias que eu administro")
— mas nenhuma rota da aplicação jamais checou esse papel (confirmado por
busca, zero call sites). Construir esse portal é uma feature própria sem
prompt dedicado em 00-20; o canal que existe hoje é admin entrando manualmente
o que o parceiro/papelaria informou por fora (WhatsApp, e-mail, telefone) —
mesmo raciocínio que `admin-crud.md` já aplicou ao CRUD de papelaria/e-commerce
no Prompt 12. `list_id`/`ecommerce_product_id` existem nas RPCs (para uso
futuro/entrada direta via SQL) mas os dois Drawers não os coletam — pickers
em cascata (loja/parceiro -> lista/produto) são complexidade real para um
campo não essencial a "houve venda, valor, comissão".

### RPCs

`admin_upsert_store_sale_report`/`admin_upsert_partner_sale_report` —
mesmo padrão upsert-por-id-opcional de `admin_upsert_store`/
`admin_upsert_ecommerce_product` (Prompt 12): `p_id` nulo cria, não-nulo
atualiza. `SECURITY DEFINER`, `is_admin()`-gated, audit-logged. Grants
corretos desde o commit inicial (`revoke ... from public` + `revoke ...
from anon` + `grant ... to authenticated`) — verificado via
`pg_proc.proacl` logo após aplicar a migration, sem `anon=` em nenhuma das
quatro funções novas (a `alter default privileges` corretiva do Prompt 12
está segurando para funções novas, mas verificado de novo em vez de
assumido, mesma disciplina do achado daquele prompt).

## RPCs de leitura: `admin_analytics_event_counts` / `admin_analytics_top_schools`

`SECURITY INVOKER`, não `DEFINER` — ao contrário das RPCs de mutação acima
(e ao contrário de `search_schools()`, que precisa de `DEFINER` porque
`campaigns` não tem policy de SELECT pública), admin já tem SELECT direto
legítimo em `analytics_events` via `analytics_events_admin_read`. Rodar
como invoker significa que um caller não-admin é bloqueado duas vezes: o
`is_admin()` explícito na função e a RLS por baixo — least privilege, sem
motivo para bypassar RLS quando não há RLS para bypassar.

Toda referência de coluna dentro das duas funções é qualificada com o
alias da tabela (`ae.`/`s.`) deliberadamente — `RETURNS TABLE(event_type
text, ...)`/`RETURNS TABLE(school_id uuid, ...)` cria variáveis implícitas
com esses nomes, escopo a função inteira; uma referência não-qualificada
seria ambígua exatamente como o bug já documentado em `search_schools()`
(Prompt 06, recorrente no Prompt 13). Evitado por construção desta vez, em
vez de descoberto depois em runtime.

Taxas derivadas (`computeApprovalRate`/`computeListOpenRate` em
`src/lib/admin/analytics.ts`) são calculadas em TS a partir das contagens
brutas, não em SQL — mesmo motivo do ticket médio acima.

### Fora do escopo deste prompt

- **CTR patrocinado** (uma das métricas da seção 15 da PRD): calcular de
  verdade exigiria marcar `sponsored: boolean` no metadata de
  `school_impression`/`school_view` no momento do evento (não só o
  `school_id`, que pode ter mudado de status de patrocínio depois) — sem
  isso, misturar períodos patrocinados/não-patrocinados seria fabricar
  dado. Instrumentação adicional, não coberta aqui.
- **Portal do lojista/parceiro** — ver seção acima.
- Favoritos como sinal de demanda em `admin_analytics_top_schools` —
  fica só em `school_view` para manter a função simples e dentro de uma
  única tabela com RLS já verificada; ver comentário na própria função.

## UI admin: `/admin/analytics` e `/admin/vendas`

Duas páginas novas (nav em `admin-shell.tsx`), separadas da dashboard
principal — mesma decisão já tomada para `/admin/patrocinios` no Prompt 13:
PRD seção 17 trata "Analytics" como tela própria (item #25), não uma seção
da dashboard. `getDashboardStats()` (Prompt 12) tinha um comentário
"Prompt 14 (analytics-vendas)" apontando para este exato trabalho — o
comentário foi atualizado para apontar para a página nova em vez de para
um prompt futuro.

## Achado maior deste prompt: `<form>` aninhado em `SchoolPicker`

`SchoolPicker` (`src/components/contributions/school-picker.tsx`, Prompt
10) sempre teve seu próprio `<form onSubmit={handleSearch}>` para o campo
de busca. No uso original (`new-submission-wizard.tsx`), ele só é
renderizado fora de qualquer form — a etapa 1 do wizard é
`{!school ? <SchoolPicker/> : <form>...</form>}`, nunca os dois ao mesmo
tempo. Neste prompt, os dois Drawers de venda (`store-sale-report-form-drawer.tsx`,
`partner-sale-report-form-drawer.tsx`) precisavam do picker de escola como
**um campo entre outros**, dentro do mesmo `<form>` do Drawer — nunca
testado antes porque nunca tinha acontecido.

`<form>` dentro de `<form>` é HTML inválido, mas React constrói via
`document.createElement`/`appendChild`, não parsing de string — o
navegador não impede a inserção. Confirmado ao vivo via Playwright
(`framenavigated`/`request` tracing, não só suspeita): clicar "Buscar"
disparava uma submissão nativa de verdade (`GET /admin/vendas?`, navegação
de página completa), não só o bubbling do evento sintético do React —
`event.preventDefault()`/`event.stopPropagation()` no formulário interno
não bastavam, o comportamento nativo do navegador para formulários
aninhados (por baixo do parser, indefinido pela spec) ignorava os dois.

Corrigido na raiz, em `SchoolPicker` em si (não só nos dois Drawers): a
busca deixou de usar `<form onSubmit>` + `<button type="submit">` e passou
a usar um `<div>` + `<button type="button" onClick={runSearch}>` +
`onKeyDown` no input para Enter continuar funcionando. Sem elemento
`<form>` nenhum, não há nada para aninhar — zero risco de regressão para o
uso original (não-aninhado) no wizard, e qualquer composição futura de
`SchoolPicker` dentro de outro form também fica segura por construção.

## `useDrawerFormAction` nos dois Drawers novos — testado ao vivo, não só reutilizado

Os dois Drawers (`StoreSaleReportFormDrawer`/`PartnerSaleReportFormDrawer`)
usam `useDrawerFormAction` desde o commit inicial (não é um retrofit como
os 4 Drawers do Prompt 12 no Prompt 13). Ainda assim, testado ao vivo
repetindo exatamente o padrão que expôs o bug original: submeter com erro
de validação (`CONVERTED` sem `sale_value`; comissão maior que valor
bruto), **sem fechar o Drawer**, corrigir o campo e submeter de novo no
mesmo mount — sucesso confirmado nas duas vezes, via Playwright real
(`next build && next start`, não `next dev`).

## Teste ao vivo (Playwright + SQL), seed → teste → limpeza

`stores`/`ecommerce_partners` estavam vazias no banco real no início deste
prompt — todo teste de papelaria/parceiro dos Prompts 08/09/12 tinha sido
seedado e limpo, sem dado persistente (diferente de `schools`, que vem do
import INEP real). Fluxo completo testado com 2 contas reais
(`prompt14-e2e-admin@example.com`/`prompt14-e2e-user@example.com`, senha
via `extensions.crypt`, colunas de token vazias — mesmo padrão de
`WORKFLOW.md`) + 1 papelaria + 1 parceiro de teste:

1. Criar/editar registro de venda de papelaria (com o ciclo erro→correção→reenvio acima).
2. Criar/editar registro de venda de parceiro (mesmo ciclo).
3. `/admin/analytics` carrega sem erro, mostra números reais.
4. Fluxo `enviar-lista` completo (escola → série/ano → itens → anexo →
   revisão → envio) como usuário comum, gerando `submission_started` +
   `submission_submitted`.
5. `sugerir-escola` completo, gerando `submission_submitted` (kind
   `school_suggestion`).
6. Moderação como admin: `Iniciar revisão` → `Aprovar e publicar` (lista) e
   `Aprovar sugestão` (sugestão), gerando `submission_approved` x2.
7. Verificado via SQL: `analytics_events` com os 3 tipos de evento novos
   presentes e corretos; `store_sale_reports`/`partner_sale_reports` com
   os valores esperados após cada edição.
8. Limpeza completa: `school_lists`/`school_list_versions`/`school_list_items`
   criados pela aprovação, `list_submissions`/`submission_items`,
   `school_suggestions`, os dois registros de venda, a papelaria e o
   parceiro de teste, `audit_logs` dos dois usuários de teste, os dois
   `profiles`/`auth.users`. `analytics_events` gerados pelo teste **não**
   foram apagados (mesma prática já estabelecida nos prompts anteriores —
   contagens de evento são histórico de uso real acumulado, não dado de
   teste a limpar); só o `profile_id` das linhas que apontavam para as
   contas de teste foi anulado antes de apagar os `profiles`, para não
   violar a FK — o mesmo estado que um evento anônimo já tem legitimamente.
   Confirmado 0 linhas restantes em toda tabela tocada, dados reais de MT
   intactos.

## `get_advisors(security)` após a migration

Mesma baseline de WARN pré-existente (8 `anon_security_definer_function_executable`
+ 25 `authenticated_security_definer_function_executable`, incluindo agora
as 2 RPCs de mutação novas na lista `authenticated` — esperado, mesmo
padrão de todo `admin_*`). As 2 RPCs de leitura (`SECURITY INVOKER`) não
aparecem em nenhuma das duas listas — o linter só olha para
`SECURITY DEFINER`, então a escolha de invoker as tira do escopo do
achado por completo, não só reduz a severidade.
