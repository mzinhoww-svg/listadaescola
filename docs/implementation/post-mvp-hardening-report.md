# Relatório de hardening pós-MVP

**Branch:** `feature/post-mvp-hardening` (a partir de `claude/eager-galileo-d8hdtc`).
**Data:** 2026-09-12. **Escopo:** verificação + correção pontual, não uma
nova rodada de features (os 20 prompts + gaps do Prompt 20 já estão
implementados e mergeados). Nenhuma tabela/tela recriada, nenhum design
substituído, nenhuma feature nova implementada fora do que já existia —
todo item abaixo é ou uma correção de um gap real encontrado, ou a
confirmação de que algo já estava correto.

## 1. Estado geral

O produto está funcionalmente completo em relação ao PRD e aos 20 prompts
planejados. Esta passada de hardening auditou segurança (RLS, IDOR, XSS,
secrets, rate limiting), consistência de schema (RN-004), qualidade de
teste (regressões reais, não só manuais), e status operacional real
(Vercel, GitHub, dados de produção) — sem inventar nada que não pudesse
ser verificado. **O maior achado da passada inteira não é uma
vulnerabilidade: é que o produto nunca recebeu um usuário real
(`profiles` = 0 linhas, `admin_count` = 0)** — ver seção 6.

## 2. Corrigido

- **RN-004 — `school_images.submitted_by` nullable sem justificativa.**
  Levantamento: 0 linhas na tabela em produção, 0 código em `src/`
  insere nela hoje. Diferente de `approved_by` (NULL = "ainda não
  aprovada", um estado real), não existe fluxo legítimo de uma foto sem
  autor. Corrigido em
  `supabase/migrations/20260912000000_hardening_rn004_sec008_expand.sql`:
  coluna virou `NOT NULL` (seguro, tabela vazia) e a policy de INSERT do
  manager agora exige `submitted_by = auth.uid()`. **Testado ao vivo**
  duas vezes em `supabase/tests/rls_idor_hardening_extra.sql` (testes
  24-26): manager não insere para escola alheia, não pode atribuir o
  upload a outro usuário nem para a própria escola, e o caminho correto
  (a própria escola, o próprio id) funciona.

- **SEC-008 — rate limiting além do login.** O limite anterior (Prompt
  20) só cobria login. Adicionado, na mesma migração: tabela genérica
  `rate_limit_hits` + funções `check_rate_limit`/`record_rate_limit_hit`
  (identidade sempre `auth.uid()`, nunca um valor do cliente). Aplicado
  em 4 superfícies, com critério de custo/risco/frequência documentado
  em `docs/security/rate-limiting.md` (não "cego" — busca e analytics
  foram deliberadamente deixados de fora, conforme a própria tarefa
  pediu): início de submissão de lista (10/h), criação de avaliação
  (10/h), upload de anexo (20/h — único ponto com custo externo direto),
  troca de papel de usuário via `admin_set_user_role` (20/h, embutido na
  própria RPC). **Testado ao vivo**: 7/7 asserções (permite dentro do
  limite, bloqueia acima, escopo por ação, fail-closed para sessão
  inválida, `anon` rejeitado a nível de GRANT).

- **`auth_rls_initplan` (advisor de performance, 26 ocorrências).**
  `auth.uid()` usado sem `(select ...)` em 26 policies fazia o Postgres
  reavaliar a chamada por linha, não por consulta. Corrigido via `ALTER
  POLICY` em `supabase/migrations/20260912010000_rls_wrap_auth_uid_initplan.sql`
  — mudança mecânica, mesma expressão, resultado idêntico. **Verificado
  ao vivo**: advisor não mostra mais o achado; `supabase/tests/rls_idor.sql`
  (26 testes, suíte original do Prompt 02) re-executada depois da
  migration — 26/26 passando, zero regressão.

- **Dado de teste órfão em produção.** Uma linha em `school_lists`
  (`...-e2e-prompt17-moderacao`, aprovada, 0 versões) sobrevivia a todo
  `e2e-cleanup.sql` porque seu marcador de E2E estava como sufixo, não
  prefixo (o script casa só `slug like 'e2e-p17-lista-%'`). Encontrada ao
  validar contagens reais de produção (seção 6), removida com segurança
  (0 versões/itens dependentes, confirmado antes de apagar).

- **Teste de regressão real: admin não aprova a própria lista.** Gap já
  identificado no Prompt 20 (comportamento correto, mas sem teste
  automatizado). `supabase/tests/admin-self-approval-regression.sql`,
  5/5 passando ao vivo: admin não aprova/rejeita/pede correção na própria
  submissão; aprova normalmente a de outro usuário; a assinatura da RPC
  não aceita nenhum "user_id"/"actor" do chamador (fecha por design a
  possibilidade de contornar enviando outro id no corpo).

- **Teste de regressão real: XSS em texto livre.** `e2e/06-xss-regressao.spec.ts`,
  2 testes E2E completos (Playwright, navegador real) — payload
  `<script>` em comentário de avaliação (ponta a ponta: envio → fila de
  moderação → aprovação → página pública da escola) e payload `<img
  onerror>` em nome de item de lista (rascunho → moderação → lista
  pública). Ambos confirmam: nunca renderiza como HTML executável, nunca
  dispara `alert()` (listener de `dialog` registrado), aparece só como
  texto literal. **16/16 specs do Playwright passando** (as 14
  pré-existentes + as 2 novas), suíte completa rodada ao vivo contra o
  Supabase real.

## 3. Confirmado como correto (investigado, sem correção necessária)

- **Stitch.** MCP nunca esteve disponível em nenhuma sessão (confirmado
  de novo via `ToolSearch`). O usuário forneceu um export real (zip) como
  substituto — comparado tela a tela em `docs/implementation/stitch-final-gap.md`.
  Achado estrutural: os mockups descrevem um marketplace transacional
  completo (checkout, PIX, cashback, picking de estoque, portais de
  papelaria/escola) que o PRD **proíbe explicitamente** para o MVP — ou
  seja, cada uma dessas telas nunca implementadas é a regra "PRD governa,
  Stitch é só referência visual" funcionando corretamente, não um gap.
  Real gap de design (paleta/tipografia "Caderno Vivo" do Stitch vs. o
  provisório em `globals.css`) é notado mas fica fora de escopo — mudança
  visual ampla não é o que esta tarefa pediu.
- **Mapas.** As 8 garantias do CLAUDE.md/PRD (MapLibre, sem Google Maps,
  PostGIS calcula distância, nunca fabricada, provider configurável,
  atribuição OSM, sem download em massa de tiles, mapa nunca obrigatório,
  escola sem coordenada nunca ganha distância fabricada) — todas
  verificadas com citação de arquivo:linha em `docs/architecture/maps-final.md`.
- **Commerce/payment.** Varredura completa por checkout/PIX/cartão/boleto/
  gateway/carrinho/`payment_intent` — nenhuma implementação real
  encontrada. E-commerce termina em clique + tracking + redirect externo;
  papelaria termina em WhatsApp + tracking. Confirmado por três
  verificações independentes ao longo do projeto (Prompt 16, Prompt 20,
  esta auditoria).
- **Secrets.** Varredura completa (repo, `.env*`, workflows, docs,
  scripts, `public/`, bundle, histórico do git) — nenhum achado. A chave
  Stitch colada em texto puro na própria tarefa desta sessão foi tratada
  como comprometida, nunca usada/gravada (ver `docs/implementation/stitch-final-gap.md`).
- **RLS.** `docs/security/rls-review.md` — advisors de segurança sem
  achado real (funções `SECURITY DEFINER` corretamente restritas);
  `multiple_permissive_policies` (54 ocorrências) analisadas uma a uma,
  confirmadas sem risco de autorização (união de acesso nunca mais ampla
  que o pretendido), deliberadamente adiadas (custo zero hoje, 0 sessões
  autenticadas reais) com o padrão de correção já documentado para quando
  isso deixar de ser verdade.
- **IDOR.** Auditoria completa de toda superfície com ID (Server
  Actions, Route Handlers, RPCs, policies RLS) — sem gap novo. Cobertura
  de teste estendida (`rls_idor_hardening_extra.sql`, 15 novas
  asserções) para os 4 cenários exigidos: User A não lê/altera recurso de
  User B (`reviews`, além de `list_submissions` já coberto); usuário comum
  não lê recurso admin (`audit_logs`); Store Manager não escreve em loja
  alheia (`store_contacts`/`store_services`/Storage); School Manager não
  escreve em escola alheia (`school_contacts`/`school_images`/Storage) —
  todos 15/15 passando ao vivo.
- **Bucket `public-assets` (Storage).** Escritas corretamente escopadas
  por entidade (`is_school_manager`/`is_store_manager` no path) — sem
  IDOR cruzado, agora com teste dedicado. A ausência de gate de aprovação
  no SELECT (Achado 4 do `final-audit.md`) é reconfirmada, continua
  dormant (0 linhas em `school_managers`/`store_managers`, nenhuma UI de
  manager existe).

## 4. Ainda pendente (adiado deliberadamente, não esquecido)

- **`multiple_permissive_policies`** (54 ocorrências, ~25 tabelas) —
  custo zero hoje, padrão de correção pronto em `rls-review.md`,
  revisitar quando `profiles` deixar de ter 0 linhas.
- **`unindexed_foreign_keys`** (26) e **`unused_index`** (12) — cosmético
  num banco pré-lançamento; nenhum índice deve ser removido agora (dois
  deles foram criados nesta mesma leva de hardening, para uso futuro).
- **Gate de aprovação no bucket `public-assets`** (Achado 4) — dormant,
  sem UI de manager para testar contra; construir agora seria validar às
  cegas.
- **RBAC morto** (`SCHOOL_MANAGER`/`STORE_MANAGER` com RLS completa, zero
  UI) — já documentado desde o Prompt 16; os mockups do Stitch mostram de
  onde essas roles vieram (portais de gestor nunca especificados como
  entregável do MVP no PRD).
- **Gap de design system** (Caderno Vivo vs. provisório em `globals.css`)
  — real, mas fora do escopo de correção automática desta tarefa.

## 5. Bloqueios externos

- **Vercel — `VERCEL_UNVERIFIED`.** Existe um projeto Vercel real
  conectado a este repositório (confirmado via `target_url` gerado pela
  própria Vercel num commit status, time `mazinhoww-5476s-projects`) —
  mas as ferramentas `mcp__Vercel__*` desta sessão só têm acesso a um
  time diferente e não relacionado
  (`mzinhoww-gmailcoms-projects`). Por isso: qual domínio serve produção
  hoje, e por que `listadaescola.vercel.app` retorna 404 para o usuário,
  **não pode ser respondido a partir desta sessão**. Detalhe completo,
  incluindo o roteiro exato do que checar no dashboard (Domains,
  Production Branch, Deployment Protection, Environment Variables), em
  `docs/architecture/vercel-status.md`.
- **GitHub — conteúdo exato do ruleset não verificável.** Nenhuma
  ferramenta `mcp__github__*` disponível lê branch protection/ruleset
  diretamente (confirmado por enumeração completa do namespace de
  ferramentas, não só busca semântica). Confirmado via API que **existe**
  alguma proteção ativa no branch padrão (`list_branches` →
  `claude/eager-galileo-d8hdtc` = `protected: true`); o conteúdo exato
  (required check `Vercel`, se há aprovação obrigatória, bypass list,
  bloqueio de force-push) segue como relato do usuário ou evidência
  comportamental indireta, nunca uma leitura direta. Detalhe completo em
  `docs/development/github-automation-status.md`.
- **Stitch MCP** — nunca disponível em nenhuma sessão deste projeto,
  incluindo esta.

## 6. Dados operacionais necessários (não é bug de código)

Contagens reais, verificadas ao vivo nesta sessão (Supabase, projeto
`wfdejmokxrunupsekcmq`), sem nenhum dado fictício inserido:

| Tabela | Linhas |
|---|---:|
| `schools` (INEP, master data) | 2722 |
| `analytics_events` | 782 |
| `profiles` | **0** |
| `list_submissions`, `reviews`, `favorites`, `stores`, `school_suggestions`, `reports`, `campaigns`, `audit_logs`, `school_images`, `school_managers`, `store_managers`, `ecommerce_partners`, `ecommerce_products`, `partner_sale_reports`, `store_sale_reports` | **0** (todas) |

**Nenhum usuário jamais se cadastrou em produção.** Consequência direta:
`admin_count = 0` — não existe absolutamente ninguém com acesso
administrativo hoje. `docs/operations/bootstrap-admin.md` documenta o
procedimento seguro (SQL direto via dashboard/service role, nunca pela
aplicação — é assim por design, ver o documento) para quando a primeira
pessoa real se cadastrar e precisar virar admin.

## 7. Riscos

- **Operacional, não técnico:** o produto está pronto para receber dados
  reais, mas ninguém pode administrá-lo até o bootstrap manual do
  primeiro admin acontecer — se isso for esquecido no lançamento, a fila
  de moderação (submissões, avaliações, sugestões de escola) fica
  represada sem ninguém para aprovar.
- **Visibilidade em produção incerta:** enquanto o status Vercel
  permanecer `VERCEL_UNVERIFIED`, não há garantia de que o site está
  realmente acessível para um visitante real na URL que ele tentaria
  (a origem do relato que motivou parte desta investigação).
- **Gate de CI real ausente:** não existe GitHub Actions rodando
  lint/typecheck/teste automaticamente — hoje isso depende inteiramente
  da disciplina do agente antes de cada push (documentado, mas é um
  processo, não uma garantia automática).
- **Risco de segurança residual:** nenhum encontrado nesta auditoria além
  do já documentado e aceito (Achado 4, dormant).

## 8. Próximos passos recomendados

1. **Resolver o status Vercel** — usuário confere o dashboard seguindo o
   roteiro de `docs/architecture/vercel-status.md` (Domains → Production
   Branch → Deployment Protection, nessa ordem de prioridade).
2. **Confirmar o ruleset do GitHub visualmente** (Settings → Rules) —
   roteiro em `docs/development/github-automation-status.md`, seção (g).
3. **Assim que a primeira pessoa real se cadastrar**, executar
   `docs/operations/bootstrap-admin.md` para promovê-la a admin.
4. **Revisitar `multiple_permissive_policies`** quando `profiles` deixar
   de ter 0 linhas (primeiro sinal real de tráfego autenticado) — padrão
   de correção já pronto em `docs/security/rls-review.md`.
5. **Não implementar** UI de `SCHOOL_MANAGER`/`STORE_MANAGER`, gate de
   aprovação no bucket público, ou qualquer forma de checkout/pagamento a
   menos que o PRD seja explicitamente atualizado para pedir isso — todos
   três são gaps conhecidos e deliberados, não pendências esquecidas.
6. Quando um workflow real de CI (GitHub Actions) for adicionado,
   incluir explicitamente lint/typecheck/teste como required status
   checks — hoje só o build da Vercel é um gate automático.
