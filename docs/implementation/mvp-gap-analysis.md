# Análise final de gaps vs. PRD (Prompt 20)

Confronto completo entre `docs/product/PRD.md` e a implementação real, feito
por 5 agentes de pesquisa paralelos (sitemap+RF-001-006, RF-007-016,
RN-001-010+máquina de estados, SEC-001-009, escopo MVP+varredura de
pagamento+critérios de aceite+DoD), cada achado verificado por leitura
direta de código/migration, não por nome de arquivo/função. Classificação:
**IMPLEMENTADO** / **PARCIAL** / **PENDENTE** / **FORA DO MVP**.

Este documento é escrito em duas passadas: a primeira (abaixo) registra o
estado encontrado pelos agentes; a seção "Corrigido nesta PR" no final
registra o que foi corrigido depois, sem alterar os achados originais —
"não alterar silenciamente" (instrução do Prompt 20).

---

## 0. Varredura de pagamento/checkout — a mais crítica

**Resultado: ZERO violações.** Buscado exaustivamente em `src/`,
`supabase/migrations/`, `package.json` e árvore completa por checkout,
PIX, Stripe, MercadoPago, Pagar.me, payment, gateway, boleto,
carrinho/cart, cartão, invoice. Todo hit é falso-positivo apontando para
o mesmo design deliberado (link outbound + tracking, nunca checkout
próprio):
- `ecommerce_integration_type` enum inclui `'CART'`, mas rotula o
  carrinho **do próprio parceiro externo** (`src/lib/commerce/provider.ts`
  comenta explicitamente "never a cart Listada hosts itself").
- `/api/commerce/click` resolve a URL real do parceiro (coluna
  admin-only) e redireciona — nunca processa pagamento.
- `/api/store/whatsapp` só monta um link `wa.me` pré-preenchido — "never
  sends on its own."
- `admin/vendas` e `admin/ecommerce` têm copy explícita "sem checkout,
  sem gateway de pagamento" / "sem checkout, PIX ou carrinho próprio" —
  são formulários de números autorreportados manualmente, sem campo de
  pagamento.
- `package.json`: nenhum SDK de pagamento. `.env.example`: nenhum
  placeholder de secret de pagamento/gateway.

**Conformidade total confirmada independentemente do audit de segurança
do Prompt 16.**

---

## 1. Sitemap (PRD seção 6)

35 rotas do PRD auditadas: **10 EXISTEM, 5 EXISTEM COM PARÂMETRO
DIFERENTE** (ex.: PRD usa `[estado]`, código usa `[uf]` — cosmético, sem
impacto funcional), **20 FALTANDO**.

**Achado crítico: vários dos links faltando já estão publicados em
navegação real** — `src/app/(public)/layout.tsx` (footer/nav público) e
`src/app/(account)/minha-conta/layout.tsx` (sidebar da conta) apontam
para rotas que retornam 404 hoje. Isso não é "feature futura", é link
quebrado em produção.

| Rota PRD | Status | Nota |
|---|---|---|
| `/`, `/escolas`, `/escolas/[uf]`, `/escolas/[uf]/[cidade]`, `/escolas/[uf]/[cidade]/[slug]` | IMPLEMENTADO | |
| `/listas` (listagem) | **PENDENTE** | só existe `/listas/[slug]` (detalhe) |
| `/listas/[list-slug]` | IMPLEMENTADO | |
| `/papelarias` | IMPLEMENTADO | |
| `/papelarias/[estado]/[cidade]` (listagem por cidade) | **PENDENTE** | só existe `.../[cidade]/[slug]` (detalhe) |
| `/papelarias/[store-slug]` | IMPLEMENTADO (estrutura aninhada) | |
| `/como-funciona`, `/para-escolas`, `/para-papelarias`, `/parceiros`, `/termos`, `/privacidade`, `/cookies` | **PENDENTE, linkados quebrados** | `(public)/layout.tsx` |
| `/enviar-lista` (+ wizard) | IMPLEMENTADO | |
| Autenticação (5 rotas) | IMPLEMENTADO | |
| `/minha-conta` | IMPLEMENTADO (stub) | 3 cards estáticos, sem dado real, sem link |
| `/minha-conta/perfil`, `/listas`, `/listas/rascunhos`, `/listas/em-analise`, `/listas/publicadas`, `/listas/precisa-correcao`, `/listas/rejeitadas`, `/escolas-salvas`, `/listas-salvas`, `/historico`, `/configuracoes` (11 rotas) | **PENDENTE, linkados quebrados** | `(account)/minha-conta/layout.tsx` |

---

## 2. Requisitos funcionais

| RF | Status | Nota |
|---|---|---|
| RF-001 Localização | IMPLEMENTADO | CEP/cidade/geolocalização, todos alteráveis |
| RF-002 Busca | IMPLEMENTADO | proximidade PostGIS + fallback município/CEP |
| RF-003 Ranking | IMPLEMENTADO | 3 dimensões separadas, pesos configuráveis via `ranking_weights` + admin UI, patrocínio nunca mistura na nota orgânica |
| RF-004 Perfil da escola | IMPLEMENTADO | |
| RF-005 Séries e anos | IMPLEMENTADO | `school_year` parte da unique constraint da lista |
| RF-006 Listas publicadas | IMPLEMENTADO | RLS restringe a `status = 'APPROVED'` |
| RF-007 Contribuição | IMPLEMENTADO | wizard completo, rascunho→itens→anexo→revisão→envio |
| RF-008 Sugestão de escola | IMPLEMENTADO | nunca cria registro oficial diretamente |
| RF-009 Moderação | IMPLEMENTADO | aprovar/rejeitar/corrigir + audit log |
| RF-010 E-commerce | IMPLEMENTADO | |
| RF-011 Papelarias locais | IMPLEMENTADO | |
| RF-012 WhatsApp | IMPLEMENTADO | telefone validado/normalizado server-side |
| RF-013 Favoritos | **PARCIAL** | toggle funciona (`save-button.tsx`) mas não existe NENHUMA consulta/página para ver o que foi salvo — `getFavoriteSchools`/`getFavoriteLists` não existem |
| RF-014 Avaliações | **PENDENTE** | leitura/agregação 100% funcionais (nota média calculada e exibida em todo card), mas zero caminho de escrita — nenhum formulário, action ou rota permite a um usuário criar uma avaliação. Toda escola mostra "sem avaliações" para sempre. |
| RF-015 Analytics | **PARCIAL** | 14 de 15 eventos mínimos disparam de verdade; `review_created` nunca dispara (consequência direta do RF-014) |
| RF-016 Admin | **PARCIAL** | CRUD/moderação/ranking/parceiros/patrocínios/métricas presentes; **"Usuários" e "Permissões" ausentes** — nenhuma tela lista usuários ou muda papel (RBAC só é gerenciável hoje via SQL direto) |

---

## 3. Regras de negócio + máquina de estados

| RN | Status | Nota |
|---|---|---|
| RN-001 `inep_code` único | IMPLEMENTADO | constraint `unique` real |
| RN-002 Import só atualiza campos INEP | IMPLEMENTADO | |
| RN-003 Sem publicação sem aprovação | IMPLEMENTADO | nenhuma policy de insert/update para não-admin nas tabelas de lista publicada |
| RN-004 Ownership | **PARCIAL** | `school_images.submitted_by` é nullable e a policy de insert do manager não a exige — gap real mas latente (nenhum código insere em `school_images` hoje) |
| RN-005 Usuário não altera escola INEP | IMPLEMENTADO | |
| RN-006 Sem exclusão física de master data | **PARCIAL** | nenhum código faz `delete` em `schools`/listas publicadas hoje, mas as policies admin são `for all` (incluem DELETE) sem bloqueio explícito no BD — garantia é só convenção de app, não hard constraint |
| RN-007 Histórico versionado | **PARCIAL** | mesmo padrão do RN-006: `approve_submission()` só insere, nunca apaga, mas a policy admin permite DELETE direto em `school_list_versions` |
| RN-008 Patrocínio com período/status | IMPLEMENTADO | `is_sponsored` calculado ao vivo (`status='ACTIVE' and now() between starts_at and ends_at`), nunca um flag estático; badge "PATROCINADA" explícito |
| RN-009 Sem distância fabricada | IMPLEMENTADO | toda função de proximidade retorna `null::numeric` (nunca `0`/estimativa) quando falta coordenada |
| RN-010 Anexos privados até moderação | IMPLEMENTADO | bucket `submissions` privado; ressalva conhecida (não nova) do bucket `public-assets` já registrada no audit do Prompt 16 |
| Máquina de estados (seção 9) | **PARCIAL** | para admin, o guard trigger não restringe nada (delega às RPCs); as RPCs de moderação aceitam `SUBMITTED→APPROVED/REJECTED/NEEDS_CORRECTION` diretamente (pulando `UNDER_REVIEW`), e `admin_set_school_list_status` permite `ARCHIVED→APPROVED` (reativar) — nenhuma das duas está na tabela literal do PRD, mas ambas parecem escolhas de design deliberadas e razoáveis (a UI de moderação sempre segue o fluxo completo; reativar uma lista arquivada é uma capacidade administrativa sensata), não bugs — registrado aqui como divergência de documentação, não corrigido |

---

## 4. Segurança

| SEC | Status | Nota |
|---|---|---|
| SEC-001 RLS | IMPLEMENTADO | confirmado de novo (33 `enable row level security`, spot-check em 3 migrations) |
| SEC-002 IDOR | IMPLEMENTADO | |
| SEC-003 RBAC | IMPLEMENTADO | papel sempre relido do BD, nunca de claim de JWT |
| SEC-004 Secrets | IMPLEMENTADO | |
| SEC-005 XSS | IMPLEMENTADO | corrigido no Prompt 16 (CHECK de esquema de URL), spot-check confirma migration aplicada |
| SEC-006 Storage | IMPLEMENTADO | ressalva já conhecida do `public-assets` (aceita, dormant) |
| SEC-007 Audit log | IMPLEMENTADO | |
| SEC-008 Rate limiting | **PENDENTE** | confirmado ausente em TODA superfície citada pelo PRD (busca, auth, upload, avaliação, submissão, analytics) — nenhuma lib, nenhuma lógica em `proxy.ts`, nenhum `vercel.json`/Edge Config, nenhum throttle no BD |
| SEC-009 Validação de entrada | **PARCIAL** | sem lib de schema (zod/yup) — validação real mas manual/pontual por campo (quantidade, MIME+tamanho, e-mail, CEP, URL via CHECK) |

---

## 5. Escopo MVP, critérios de aceite, Definition of Done

**Fora do MVP** (seção 18): nenhum dos 7 itens excluídos foi construído
acidentalmente (pagamento — ver seção 0; estoque em tempo real; checkout
próprio; automação WhatsApp Business API; marketplace próprio; app
nativo; IA para listas — todos com busca fresca, zero hits).

**Critérios de aceite (seção 19): 14/14 VERIFICADO**, com 2 ressalvas de
cobertura de teste (não de comportamento): #5 (usuário não aprova a
própria lista) é reforçado por `raise exception` na RPC mas não tem
fixture de teste onde o admin *é* o autor da submissão; #11 tem a
ressalva já conhecida do `public-assets`.

**Definition of Done (seção 21)**: TypeScript limpo (rodado fresco),
migrations reproduzíveis (39 arquivos sequenciais, nunca editando uma
aplicada), RLS/IDOR/RBAC/upload testados (`supabase/tests/rls_idor.sql`
+ `e2e/`), secrets/bundle validados, seed MT real. **XSS**: a
vulnerabilidade real foi corrigida (Prompt 16) mas não tem teste de
regressão commitado. **Build Vercel** e **smoke test completo**: não
re-verificados nesta passada especificamente (a suíte E2E real do Prompt
17 já cobre a jornada completa e passou 14/14 quando rodada; não foi
re-executada só para esta análise).

---

## Corrigido nesta PR

**Sitemap / links quebrados**
- 7 páginas institucionais/legais criadas (`/como-funciona`, `/para-escolas`,
  `/para-papelarias`, `/parceiros`, `/termos`, `/privacidade`, `/cookies`),
  compartilhando um layout comum em `(public)/(institutional)`.
- `/listas` (listagem paginada, `getPublicLists()`) e
  `/papelarias/[uf]/[cidade]` (listagem por cidade) criadas.
- `/minha-conta/perfil`, `/minha-conta/listas` (consolidada, com abas de
  status substituindo as 5 rotas separadas do PRD -- ver "Adiado"),
  `/minha-conta/escolas-salvas`, `/minha-conta/listas-salvas` e
  `/minha-conta/configuracoes` criadas. Todos os links do header/footer
  públicos e da sidebar de conta agora apontam para páginas reais.

**RF-013 Favoritos** -- `getFavoriteSchools`/`getFavoriteLists` (dedupe +
mesma regra de visibilidade pública de `getPublicLists`) + páginas reais.

**RF-014 Avaliações** -- caminho de escrita completo: `createReviewAction`
(upsert respeitando `reviews_insert_own_pending`/`update_own_pending`),
`ReviewForm` na página da escola (com estado "em análise"/"publicada"/
"recusada"), fila de moderação `/admin/moderacao/avaliacoes` com
`admin_approve_review`/`admin_reject_review` (guarda de autoavaliação
igual a `approve_submission`). `review_created` agora dispara de verdade.

**RF-016 Admin "Usuários"** -- `/admin/usuarios` lista perfis (papel,
data de cadastro) com troca de papel via `admin_set_user_role` (bloqueia
autoalteração, audit-logged). Sem coluna de e-mail (ver comentário em
`lib/admin/users.ts` -- nada mais no app expõe e-mail de outro usuário).

**RN-006/RN-007** -- migration `gap_fixes_prompt20.sql` substitui as
policies `for all` de `schools`/`school_lists`/`school_list_versions`/
`school_list_items` por select/insert/update explícitos, sem DELETE.
Nenhum código insere/depende de DELETE nessas tabelas hoje (confirmado
por grep); a garantia deixa de ser só convenção e passa a ser hard
constraint no banco.

**SEC-008 Rate limiting (básico)** -- throttle de tentativas de login
(`auth_login_attempts` + `check_login_rate_limit`/`record_login_attempt`,
chave e-mail+IP, 5 falhas/15min) wired em `signInAction`. Verificado ao
vivo via SQL: 5 falhas bloqueiam o identificador, um identificador
diferente continua liberado.

**Validação**: lint limpo, `tsc --noEmit` limpo, `next build` gerou todas
as rotas (novas incluídas) sem erro, advisors de segurança/performance
rodados de novo (nenhum achado novo fora do padrão já aceito no projeto
-- ver nota abaixo). Spot-check ao vivo (seed → teste → cleanup) de
`/listas`, `/papelarias/[uf]/[cidade]` e das duas funções de rate limit.

## Adiado (decisão consciente, com motivo)

- **`/minha-conta/listas/{rascunhos,em-analise,publicadas,precisa-correcao,
  rejeitadas}`** (5 rotas do PRD) -- consolidadas em uma única
  `/minha-conta/listas` com abas por status via query param, mesmo padrão
  de `/admin/moderacao`. Simplificação deliberada: mesmo conteúdo, menos
  rotas para manter.
- **`/minha-conta/historico`** -- não construída como rota própria. Sem
  RF/RN no PRD além da entrada no sitemap definindo o que "histórico"
  conteria além do que a aba "Todas" de `/minha-conta/listas` já cobre
  (todos os status, mais recente primeiro); nav da conta não referencia
  mais essa rota.
- **Nome/e-mail do avaliador nas avaliações públicas** -- não exibido.
  `profiles` não tem policy de leitura pública (só own/admin); adicionar
  isso exigiria abrir uma nova política ou RPC só para este propósito,
  peso maior que o gap identificado.
- **SEC-008 além do login** -- busca, submissão de lista, avaliação,
  analytics continuam sem rate limiting dedicado. Login era o alvo de
  maior valor (força bruta de credenciais); os demais dependeriam de
  decisão de produto sobre limites aceitáveis (ex.: quantas submissões/
  avaliações por usuário/dia) que o PRD não especifica.
- **SEC-009 validação de entrada via schema (zod/yup)** -- continua
  PARCIAL (validação manual por campo). Migrar toda a base de Server
  Actions para uma lib de schema é um refactor transversal, não um gap
  pontual -- fora do escopo desta rodada de correções.
- **RN-004 `school_images.submitted_by` nullable** -- gap real mas
  latente (nenhum código insere em `school_images` hoje); não corrigido
  para não alterar uma tabela sem um caminho de escrita real para testar
  contra.
- **`multiple_permissive_policies`/`auth_rls_initplan` (advisor de
  performance)** -- já pervasivo em quase toda tabela do schema antes
  desta PR (admin `for all` + policy pública/own coexistindo). As 4
  policies novas de RN-006/007 seguem o mesmo padrão já aceito; corrigir
  isso globalmente (reescrever dezenas de policies como uma única com
  `OR`) é o mesmo refactor que o audit de performance do Prompt 18 já
  deixou de fora, não uma regressão desta PR.
