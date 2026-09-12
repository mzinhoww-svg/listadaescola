# Status de Automação/Proteção do Repositório GitHub

**Última verificação:** 2026-09-12, via ferramentas `mcp__github__*` nesta
sessão (repositório `mzinhoww-svg/listadaescola`). Este documento é um
**snapshot de auditoria**, consolidado a partir de (1) verificação ao vivo
via API nesta sessão e (2) o histórico já registrado em
`docs/development/WORKFLOW.md` e `docs/development/automation-contract.md`
— que continuam sendo as fontes de autoridade operacional; este arquivo
não os substitui, apenas reúne e atualiza o estado de automação/proteção
do GitHub especificamente, num único lugar. Deve ser atualizado sempre que
a configuração do GitHub mudar de forma observável (comportamento novo de
merge, novo workflow de CI, etc.) — mesma prática já seguida pelo
WORKFLOW.md.

**Escopo:** só automação/proteção a nível de repositório GitHub (branch
protection/ruleset, required checks, required review, auto-merge,
force-push, CI). Não cobre Vercel além do commit status que ele publica no
GitHub, nem Supabase.

## Como ler os status usados abaixo

Cada item é marcado com um destes três rótulos, para não confundir "sabemos"
com "confiamos no que foi dito":

- **CONFIRMADO (API/ferramenta)** — verificado nesta sessão por uma
  chamada real a uma ferramenta `mcp__github__*`, com a evidência citada.
- **REPORTADO PELO USUÁRIO, NÃO CONFIRMADO POR FERRAMENTA** — alguém
  (o usuário) descreveu a configuração, mas nenhuma ferramenta disponível
  neste ambiente consegue ler o objeto de configuração diretamente para
  confirmar o conteúdo exato; quando existe, evidência comportamental
  indireta é citada à parte.
- **NÃO VERIFICÁVEL / DESCONHECIDO** — nem reportado, nem confirmável com
  as ferramentas disponíveis; não deve ser assumido como verdadeiro nem
  como falso.

## Resumo executivo

| Item | Status | Evidência-chave |
|---|---|---|
| Existe alguma proteção ativa no branch padrão | **CONFIRMADO (API)** | `list_branches`: `claude/eager-galileo-d8hdtc` → `protected: true`; 9 branches de feature amostradas → todas `protected: false` |
| Conteúdo exato do ruleset (quais regras, quais exceções) | **NÃO VERIFICÁVEL** | Nenhuma ferramenta MCP neste servidor lê branch protection/ruleset (ver "Metodologia") |
| Required status check `Vercel` especificamente | **REPORTADO PELO USUÁRIO** + evidência comportamental histórica (PR #12) | Sem leitura direta da regra; ver seção (b) |
| Required PR review (aprovação humana obrigatória) | Não observado em nenhuma PR real | `get_reviews` vazio em PR mergeada; único collaborator do repo é o próprio autor/admin |
| Auto-merge nativo do GitHub (`enable_pr_auto_merge`) | **CONFIRMADO disponível e em uso** | Habilitado a nível de repo desde a PR #2; usado em toda PR deste projeto |
| Merge direto pelo agente (`merge_pull_request`) | **CONFIRMADO disponível e em uso**, sob política autorizada em 2026-09-11 | Usado com sucesso nas PRs #10–#23 (amostra reconfirmada: #12, #23) |
| Bloqueio de force-push no branch padrão | **NÃO VERIFICÁVEL / DESCONHECIDO** | Nenhuma ferramenta lê a regra; nenhum evento real observado; nenhum teste foi feito de propósito (ver seção (e)) |
| CI real via GitHub Actions (lint/test/build), separado da Vercel | **CONFIRMADO ausente** | `actions_list` → `total_count: 0`; sem `.github/workflows` em lugar nenhum |
| `CODEOWNERS` | **CONFIRMADO ausente** | Não existe em nenhum lugar do repositório (local e via API) |
| Template de PR (`.github/PULL_REQUEST_TEMPLATE` ou `pull_request_template.md`) | **CONFIRMADO ausente** | Não existe `.github/` no repositório |

## Metodologia — o que foi verificado nesta sessão e como

Ferramentas usadas: `mcp__github__list_branches`, `mcp__github__search_repositories`,
`mcp__github__get_file_contents`, `mcp__github__actions_list`,
`mcp__github__list_pull_requests`, `mcp__github__pull_request_read`
(métodos `get`, `get_status`, `get_reviews`, `get_check_runs`),
`mcp__github__list_repository_collaborators`, `mcp__github__get_me`; mais
`git` local (`git ls-tree` contra `origin/claude/eager-galileo-d8hdtc`) para
checar arquivos independentemente da API.

**Confirmação de que não existe ferramenta de branch protection/ruleset:**
feita de duas formas, não só uma suposição:

1. Busca semântica via `ToolSearch` com os termos "branch protection
   ruleset repository rules settings" — não retornou nenhuma ferramenta
   `mcp__github__*` de proteção/ruleset (retornou ferramentas de outros
   servidores MCP — Vercel deployment protection, Supabase branches — e
   ferramentas do GitHub sem relação, como `create_repository`,
   `list_repository_collaborators`, `update_pull_request_branch`).
2. Enumeração completa: todo o namespace `mcp__github__*` disponível nesta
   sessão foi listado (pela própria plataforma, como ferramentas
   "deferred") e revisado por inteiro. A lista completa:

   ```text
   PRs/reviews:     create_pull_request, list_pull_requests, pull_request_read,
                     pull_request_review_write, update_pull_request,
                     update_pull_request_branch, add_comment_to_pending_review,
                     add_reply_to_pull_request_comment, resolve_review_thread,
                     unresolve_review_thread, request_copilot_review,
                     search_pull_requests, enable_pr_auto_merge,
                     disable_pr_auto_merge, merge_pull_request
   Branches/commits: create_branch, list_branches, list_commits, get_commit,
                     get_tag, list_tags, search_commits
   Actions/checks:   actions_list, actions_get, actions_run_trigger,
                     get_check_run, get_job_logs, run_secret_scanning
   Arquivos:         get_file_contents, create_or_update_file, delete_file,
                     push_files, search_code
   Repo/pessoas:     search_repositories, create_repository, fork_repository,
                     list_repository_collaborators, get_teams,
                     get_team_members, get_me, search_users
   Issues/releases:  issue_read, issue_write, sub_issue_write, list_issues,
                     list_issue_fields, list_issue_types, search_issues,
                     add_issue_comment, get_label, list_releases,
                     get_latest_release, get_release_by_tag
   Eventos:          subscribe_pr_activity, unsubscribe_pr_activity
   ```

   Nenhum item se chama (ou, pela descrição, faz) algo como "get branch
   protection", "get/list ruleset" ou "get repository settings". O mais
   próximo é `list_branches`, que devolve só o booleano `protected` por
   branch (usado abaixo), e `search_repositories`, que devolve o objeto de
   repositório do endpoint de busca — que tem `default_branch`,
   `permissions`, `visibility` etc., mas **não** inclui os campos que o
   endpoint completo `GET /repos/{owner}/{repo}` normalmente traria para
   configuração de merge (`allow_auto_merge`, `delete_branch_on_merge`) —
   ou seja, mesmo o objeto de repositório "mais completo" alcançável por
   uma ferramenta aqui não cobre essas configurações. **Confirma-se: esta
   é uma limitação real do conjunto de ferramentas exposto por este
   servidor MCP, não uma suposição.**

   Vale registrar uma distinção importante: `search_repositories` mostra
   `"permissions":{"admin":true,...}` para a identidade autenticada
   (`mzinhoww-svg`, dono do repositório) — ou seja, **a credencial em si
   tem permissão de admin no repositório**. A limitação não é de
   permissão do token; é que a ferramenta para ler branch
   protection/ruleset simplesmente não existe no servidor MCP conectado,
   independente do nível de acesso de quem chama.

## (a) Branch protection / ruleset

**Existência de alguma proteção: CONFIRMADO via API**, nesta sessão —
achado novo, além do que já constava em WORKFLOW.md (que só tinha
evidência comportamental indireta). `mcp__github__list_branches` devolve
um campo `protected` por branch, e o resultado foi:

| Branch | `protected` |
|---|---|
| `claude/eager-galileo-d8hdtc` (padrão) | **`true`** |
| `feature/auth-rbac` | `false` |
| `feature/ecommerce-sem-checkout` | `false` |
| `feature/escola-serie-lista` | `false` |
| `feature/fundacao-design-system` | `false` |
| `feature/home-busca-resultados` | `false` |
| `feature/inep-import-mt` | `false` |
| `feature/mapas-localizacao` | `false` |
| `feature/supabase-rls-storage` | `false` |
| `fix/home-force-dynamic` | `false` |

Isso confirma, de forma independente do relato do usuário, que existe
**algum** mecanismo de proteção (branch protection clássica ou um
ruleset) mirando especificamente o branch padrão e nenhum outro — não é
um efeito colateral genérico do repositório. Este campo, segundo o
comportamento documentado da API do GitHub, reflete tanto proteção
clássica quanto rulesets com enforcement ativo; não dá para saber, só por
ele, qual dos dois mecanismos está em uso, nem o conteúdo das regras.

**Conteúdo exato do ruleset: NÃO VERIFICÁVEL.** Nenhuma ferramenta lê o
objeto de ruleset/branch protection (ver "Metodologia"). Continua valendo
o que WORKFLOW.md e automation-contract.md já registravam: o usuário
reportou ter configurado manualmente, em 2026-09-11, um ruleset no branch
padrão exigindo o check `Vercel` antes de merge (precisou de um ajuste
para adicionar "Target branches" explicitamente). **Isso nunca foi lido
diretamente por nenhuma ferramenta — nem antes, nem nesta verificação.**

## (b) Required status check — `Vercel`

**NÃO VERIFICÁVEL diretamente** (mesma limitação de ferramenta). O que
existe é evidência comportamental, dividida em duas camadas:

**Histórica (já registrada em WORKFLOW.md, não re-derivada nesta sessão):**
na PR #12, `enable_pr_auto_merge` foi chamado enquanto o commit ainda
tinha o status `Vercel` em `pending` (`"Vercel is deploying your app"`) e
retornou `The pull request is in unstable status (required checks are
failing). Fix the failing checks before enabling auto-merge.` —
`pull_request_read(get_status)` no momento mostrava `state: pending` (não
`failure`) e `mergeable_state: unstable`. Isso ficou registrado como a
primeira confirmação comportamental de um required check de verdade
bloqueando merge — nas PRs #10 e #11 o check `Vercel` já estava sempre
verde antes da chamada, o que não permitia distinguir "não há gate" de
"o gate existe mas o check é rápido demais para pegar em andamento". Esse
evento não foi reproduzido nesta sessão (a PR #12 já está fechada/mergeada
— reproduzir exigiria abrir uma PR nova e tentar pegar o build da Vercel
em andamento, fora do escopo de uma auditoria somente-leitura).

**Fresca (reconfirmada nesta sessão, em PRs diferentes):**
`pull_request_read(get_status)` em duas PRs já fechadas (#23 e #12) mostra,
nos dois casos, **exatamente um único status context no commit head:
`Vercel`** (`state: success`, `"Deployment has completed"`). Nenhum outro
context de commit status apareceu em nenhuma das duas. Isso é consistente
com "`Vercel` é o único check que existe neste repositório hoje" — o que
por si só não prova que ele está marcado como *required* no ruleset, mas
elimina a hipótese de haver outro check candidato que o usuário pudesse
ter querido dizer.

**O que continua sem confirmação:** o nome exato configurado na lista de
required checks do ruleset (presumivelmente `Vercel`, mas não lido
diretamente), se "require branches to be up to date before merging" está
ligado, e se há uma lista de bypass que isenta o dono do repositório dessa
regra.

## (c) Required PR review

**NÃO VERIFICÁVEL diretamente** (mesma limitação). Diferente do required
status check, aqui a evidência comportamental **pesa contra** existir uma
regra de aprovação obrigatória sendo de fato aplicada:

- `pull_request_read(get_reviews)` na PR #23 (mergeada, `merged: true`,
  `merged_by: mzinhoww-svg`) devolveu `[]` — **zero reviews formais** de
  qualquer tipo (approve/comment/request-changes).
- `list_repository_collaborators` devolve **um único collaborator**:
  `mzinhoww-svg`, `role_name: admin`. Não há segunda conta humana com
  acesso de escrita ao repositório.

Ou seja: toda PR deste projeto foi aberta e mergeada pela mesma e única
identidade, sem nenhuma aprovação registrada, e não haveria sequer quem
desse essa aprovação além do próprio autor. Isso não prova
definitivamente a ausência de uma regra de "required approving review" no
ruleset — o GitHub permite configurar uma lista de bypass que isenta
administradores do repositório dessa exigência, o que produziria
exatamente este comportamento mesmo com a regra ligada. **Não há como
distinguir, com as ferramentas disponíveis, entre "a regra não existe" e
"a regra existe mas o admin está na lista de bypass".** O status honesto
é: **nenhuma exigência de review humano é observada na prática**, sem
confirmação de qual das duas configurações produz esse resultado.

## (d) Auto-merge — o que as ferramentas realmente permitem

Duas ferramentas MCP distintas cobrem isso, com comportamento
bem-documentado por suas próprias descrições e já validado na prática por
este projeto:

**`mcp__github__enable_pr_auto_merge`** — descrição da própria ferramenta:
*"Enable auto-merge for a pull request. The PR will merge automatically
once all required checks pass and approvals are met. Fails gracefully if
auto-merge is not enabled for the repository or if the PR is already
mergeable (clean status)."* Ou seja, por design, essa ferramenta só
"arma" uma espera — quem decide quando e se o merge acontece continua
sendo o GitHub, aplicando as regras reais do branch padrão (sejam quais
forem). Existe também `mcp__github__disable_pr_auto_merge` (não usada até
hoje neste projeto, por não ter sido necessária).

**`mcp__github__merge_pull_request`** — merge direto e imediato
(`merge_method`: `merge`/`squash`/`rebase`, mais `expectedHeadSha` para
concorrência otimista). A descrição da ferramenta é mínima; pelo
comportamento observado, é um passthrough fino para a API de merge do
GitHub — não faz nenhuma validação própria de required checks ou
reviews. Isso significa que **quem realmente barra um merge indevido é o
próprio GitHub no lado do servidor**, não a ferramenta MCP nem uma
verificação feita pelo agente antes de chamar — o agente faz sua própria
checagem (`pull_request_read` fresco: status combinado, `mergeable_state`,
reviews pendentes) como camada de disciplina/documentação, mas a garantia
real contra um merge indevido é a proteção de branch do lado do GitHub,
se e quando ela realmente reprovar a chamada.

**Como este projeto já usa essas duas ferramentas (política vigente,
fora de questionamento aqui):** conforme
`docs/development/automation-contract.md` ("Regra de merge",
atualizada em 2026-09-11 por autorização explícita do usuário) e
`docs/development/WORKFLOW.md` ("Merge direto autorizado") —
`enable_pr_auto_merge` é sempre tentado primeiro; quando devolve
"already in clean status", o agente lê o estado fresco via API
(status combinado `success`, `mergeable_state: clean`, sem review
pendente) e chama `merge_pull_request` diretamente, sem perguntar a cada
PR. Reconfirmado nesta sessão, de forma independente, em duas PRs
amostradas:

| PR | `merged` | `merged_by` | `merged_at` | Status no commit head |
|---|---|---|---|---|
| #12 | `true` | `mzinhoww-svg` | 2026-09-11T12:12:15Z | `Vercel` → `success` (único context) |
| #23 | `true` | `mzinhoww-svg` | 2026-09-11T21:56:33Z | `Vercel` → `success` (único context) |

Ambas batem com o padrão documentado em WORKFLOW.md para as PRs #10–#22.
**`allow_auto_merge` a nível de repositório em si** (a opção "Allow
auto-merge" em Settings → General → Pull Requests) continua sem
confirmação por leitura direta de configuração (o objeto devolvido por
`search_repositories` não traz esse campo — ver "Metodologia"); a
evidência de que está ligada é 100% comportamental (deixou de retornar o
erro "Auto-merge is not enabled for this repository" a partir da PR #2 e
nunca mais retornou desde então).

## (e) Force-push protection

**NÃO VERIFICÁVEL / DESCONHECIDO** — categoria diferente das anteriores,
porque aqui nem sequer há um relato do usuário para se apoiar. Nenhum dos
dois textos-fonte (`WORKFLOW.md`, `automation-contract.md`) registra que
o usuário tenha configurado ou mencionado especificamente "block force
pushes"; o único relato do usuário é sobre o required status check
`Vercel`. Bloqueio de force-push é, tecnicamente, uma regra independente
dentro de um ruleset do GitHub (não vem ligada automaticamente só por
existir uma regra de required status check).

Não há:
- Ferramenta que leia essa configuração (mesma limitação geral).
- Nenhum evento real observado no histórico do projeto que a exercite
  (diferente do caso `Vercel`, que foi "testado" organicamente pelo timing
  de uma PR real — aqui não houve nenhuma tentativa de force-push contra
  o branch padrão em nenhuma PR até agora).
- Um teste deliberado feito nesta auditoria — e não deveria haver: tentar
  um force-push real contra `claude/eager-galileo-d8hdtc` só para
  documentar o resultado seria uma ação arriscada/destrutiva contra um
  branch compartilhado, incompatível com o caráter somente-leitura desta
  tarefa e com as proibições absolutas já em vigor no projeto (nunca usar
  bypass de proteção de branch, nunca ações destrutivas não solicitadas).

Status honesto: **desconhecido, sem tentar adivinhar** — nem confirmado
ligado, nem confirmado desligado.

## (f) CI real via GitHub Actions (separado da Vercel)

**CONFIRMADO ausente**, por três verificações independentes nesta sessão:

1. `mcp__github__actions_list(method: list_workflows)` →
   `{"total_count": 0}`. Zero workflows do GitHub Actions registrados
   neste repositório.
2. `git ls-tree -r origin/claude/eager-galileo-d8hdtc --name-only | grep
   '^\.github'` → nenhum resultado. Não existe diretório `.github` no
   branch padrão.
3. `mcp__github__get_file_contents(path: ".github")` contra a API ao vivo
   → erro "path does not point to a file or directory, or the file does
   not exist in the repository". Confirma o item 2 de forma independente
   do clone local.

**O que isso significa na prática:** todo o sinal de "CI" que existe hoje
neste repositório vem inteiramente da integração Vercel (GitHub App) —
o commit status `Vercel` e um check run trivial chamado
`Vercel Preview Comments` (observado via `get_check_runs` na PR #12;
também só relacionado ao comentário automático do bot, não a testes).
**A Vercel roda o build de produção do Next.js**, então um erro de build
derruba o check `Vercel` — mas **não roda** `npm run lint`,
`tsc --noEmit`/typecheck isolado, testes unitários, nem a suíte e2e
Playwright (`e2e/`) como parte desse check. Esses passos, hoje, só
acontecem manualmente, executados pelo agente antes do push, conforme
documentado em `automation-contract.md` ("Requisitos mínimos de PR" e o
checklist de PR) — não há gate automático do lado do GitHub para nenhum
deles. Se um agente futuro pular esse passo local, nada no GitHub detecta.

**Achados relacionados, mesma verificação:**
- **`CODEOWNERS`: confirmado ausente.** Buscado em todo o repositório
  local (excluindo `node_modules`), na árvore do branch padrão via
  `git ls-tree`, e ao vivo via
  `mcp__github__get_file_contents(path: "CODEOWNERS")` → mesmo erro de
  "não existe". Não há dono de código por caminho definido — nem que
  houvesse uma regra de required review por CODEOWNERS no ruleset, ela
  não teria efeito hoje, porque não há arquivo para ela ler.
- **Template de PR: confirmado ausente.** Sem `.github/PULL_REQUEST_TEMPLATE/`
  nem `pull_request_template.md` na raiz — consequência direta de não
  existir `.github/` nenhum. O formato de PR descrito em
  `automation-contract.md` ("Requisitos mínimos de PR") é seguido por
  disciplina do agente ao escrever o corpo da PR, não por um template que
  o GitHub pré-preenche ou por um campo obrigatório.

## (g) Checklist para confirmação humana completa

O que esta sessão **não consegue** confirmar por falta de ferramenta, e
que só um humano com acesso à UI/Settings do GitHub resolve:

1. **Settings → Rules → Rulesets** (ou **Settings → Branches**, se for
   proteção clássica) em `claude/eager-galileo-d8hdtc`: abrir o ruleset
   real e conferir, regra por regra — required status checks (nome exato
   do context, ex. `Vercel`; "require branches to be up to date"),
   required pull request reviews (ligado/desligado, número mínimo de
   aprovações, dismiss de review antiga em novo commit, required review
   de CODEOWNERS — hoje irrelevante por não existir o arquivo), block
   force pushes, restrict deletions, required linear history, e
   principalmente **a bypass list** (quem/quais papéis podem pular todas
   as regras acima — isso decide se o dono/admin único do repo está
   isento de tudo).
2. **Settings → General → Pull Requests**: confirmar visualmente que
   "Allow auto-merge" está marcado (comportamento observado é 100%
   consistente com isso desde a PR #2, mas só a UI mostra o estado real
   do checkbox) e o estado de "Automatically delete head branches"
   (comportamento mudou entre a PR #2 e a PR #11 de um jeito consistente
   com essa opção ter sido ligada nesse intervalo — ver WORKFLOW.md,
   seção "deleção de branch remota pós-merge").
3. **Settings → Collaborators and teams**: confirmar que não há outro
   collaborator/team além de `mzinhoww-svg` (é o que `list_repository_collaborators`
   mostra hoje) — relevante porque uma regra futura de required review só
   faz sentido operacional se existir uma segunda pessoa real para
   aprovar.
4. **Settings → Actions → General**: confirmar que Actions não está
   desabilitado a nível de repositório/organização — irrelevante hoje
   (zero workflows existem), mas importante no dia em que um workflow de
   CI real for adicionado, para não descobrir depois que ele nunca rodou.
5. Quando um workflow de CI real (lint/typecheck/test/build) for
   adicionado em `.github/workflows/`, **adicioná-lo explicitamente à
   lista de required status checks do ruleset** — hoje, mesmo que o
   ruleset exija `Vercel`, isso não cobre lint/testes/typecheck, só o
   build de produção da Vercel.

## Referências

- `docs/development/WORKFLOW.md` — histórico completo, PR a PR, de como
  auto-merge/merge direto se comportaram na prática (PRs #1, #2, #10,
  #11, #12).
- `docs/development/automation-contract.md` — regra de merge vigente
  (seção "Regra de merge") e adaptação do contrato original de `gh` CLI
  para ferramentas MCP.
- `/CLAUDE.md` — resumo do fluxo Git/PR/CI/merge lido automaticamente no
  início de cada sessão.
