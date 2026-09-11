# WORKFLOW — Estado operacional atual (Listada Escola)

Este arquivo é o snapshot prático de como o fluxo Git/PR/CI/merge realmente
funciona hoje neste repositório e neste ambiente de execução. As regras
completas/permanentes estão em `docs/development/automation-contract.md`;
este arquivo documenta o que é **real e verificado agora**, e é esperado
que seja atualizado conforme o projeto evolui (CI aparece, branch protection
é configurada, etc.).

## Branch atual

- Branch padrão do repositório: `claude/eager-galileo-d8hdtc`.
- Por quê: o repositório GitHub estava completamente vazio (zero commits)
  quando este projeto começou. O primeiro push (desta sessão) virou
  automaticamente o branch padrão — não existe `main` neste repositório.
- **Decisão:** por ora, `claude/eager-galileo-d8hdtc` continua sendo o
  branch padrão/"tronco" do projeto (equivalente ao papel que `main`
  teria). Não foi renomeado para `main` porque a configuração desta sessão
  designa especificamente esse nome de branch para o trabalho do agente, e
  renomear o branch remoto por baixo dessa configuração é uma operação que
  poderia quebrar o rastreamento/plumbing da sessão sem benefício real
  (o nome é só um rótulo — o fluxo branch de feature → PR → merge funciona
  igual independente de o tronco se chamar `main` ou
  `claude/eager-galileo-d8hdtc`). Renomear para `main` é uma opção válida a
  qualquer momento; é uma ação de baixo risco e reversível caso o usuário
  prefira.
- Branches de feature devem ser criadas a partir deste branch e ter PR
  aberta de volta para ele.

## Ferramentas verificadas neste ambiente

| Ferramenta | Disponível | Versão/observação |
|---|---|---|
| `git` | Sim | 2.43.0 |
| `gh` (GitHub CLI) | **Não** | Usar ferramentas MCP do GitHub (`mcp__github__*`) no lugar de todo comando `gh` do contrato. |
| `claude` (CLI) | Sim | 2.1.267 |
| `npm` | Sim | 10.9.7 |
| `pnpm` | Sim | 10.33.0 |
| `yarn` | Sim | 1.22.22 |
| `node` | Sim | v22.22.2 |
| `supabase` (CLI) | **Não** | Usar ferramentas MCP `mcp__Supabase__*` no lugar. |
| `docker` | Sim | 29.3.1 |
| `curl` | Sim | 8.5.0 |
| Acesso à API do GitHub | Sim, via MCP (`mcp__github__*`) | Autenticado; `get_me`/`list_branches`/`create_pull_request`/etc. testados e funcionando nesta sessão. |
| MCP Stitch | **Não** | Não aparece na lista de ferramentas/MCP disponíveis nesta sessão. Nenhuma chave foi fornecida para configurá-lo (corretamente, por segurança). Bloqueador real — ver `docs/implementation/stitch-mapping.md`. |
| `playwright` (verificação manual em navegador) | Sim, mas **não é dependência do projeto** | Instalado globalmente em `/opt/node22/lib/node_modules` — rodar script com `NODE_PATH=/opt/node22/lib/node_modules node script.js`; Chromium já em `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. |

**Next.js 16 — `middleware.ts` → `proxy.ts`:** a partir da v16 o Next.js
renomeou a convenção (`middleware`/`proxy.js` é o novo nome; a função
exportada também muda de `middleware` para `proxy` — `next build` avisa
com "The middleware file convention is deprecated" caso o nome antigo
seja usado). Confirmado nesta versão (16.3.4) desde o Prompt 03: o
arquivo já nasce como `src/proxy.ts` (função `proxy`), não
`src/middleware.ts`. Ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
para a referência completa se precisar consultar de novo.

## Como abrir e mergear uma PR aqui (mecânica real)

1. `git switch -c <tipo>/<slug>` a partir do branch padrão atual.
2. Implementar, rodar lint/typecheck/test/build localmente.
3. `git add`, `git commit`, `git push -u origin HEAD`.
4. Abrir PR com `mcp__github__create_pull_request` (base = `claude/eager-galileo-d8hdtc` por enquanto).
5. Validar localmente antes de tirar do rascunho; marcar pronta para review com `mcp__github__update_pull_request` (`draft: false`) quando estiver de fato pronta — uma PR em draft não é mergeada pelo auto-merge do GitHub mesmo com auto-merge solicitado.
6. Solicitar auto-merge com `mcp__github__enable_pr_auto_merge`. **Ver limitação abaixo — hoje isso provavelmente falha ou não trava nada de verdade.**
7. Acompanhar CI/review via `subscribe_pr_activity` (eventos chegam como wake da sessão) e `mcp__github__pull_request_read`/`get_check_run` para status pontual. Nunca declarar "merge concluído" sem confirmar o estado `merged` via API. **Antes de qualquer novo push numa branch de feature (ex.: um ajuste de docs pós-checks), reconfirmar com `pull_request_read` que a PR ainda está aberta** — o usuário pode mergear a qualquer momento, e um push depois do merge fica órfão na branch (não chega ao branch padrão; ver "Limitação real conhecida — deleção de branch remota pós-merge" abaixo para o caso real em que isso aconteceu).
8. Após merge confirmado: atualizar o branch padrão local (`git pull`), deletar o branch de feature local (`git branch -d`) e tentar deletar o remoto (`git push origin --delete`) — **essa última parte falha hoje com HTTP 403, ver seção de limitação abaixo; reportar e seguir em frente, não é bloqueador.**

## Limitação real conhecida — branch protection / auto-merge

**Não configurado, e não há ferramenta disponível nesta sessão para
configurar.** Dois pré-requisitos faltam para o auto-merge nativo do
GitHub funcionar como trava de verdade:

1. **"Allow auto-merge"** precisa estar habilitado nas configurações do
   repositório (Settings → General → Pull Requests).
2. **Branch protection / ruleset** no branch padrão (`claude/eager-galileo-d8hdtc`,
   ou `main` se for renomeado) exigindo PR antes de merge e, quando existir
   CI, required status checks.

**Confirmado na prática:** `mcp__github__enable_pr_auto_merge` foi chamado
na PR #1 (`feature/fundacao-design-system`) e retornou exatamente
`Auto-merge is not enabled for this repository. Enable it in repository
Settings → General → Pull Requests → Allow auto-merge.` — a limitação
acima não era hipotética. A PR ficou aberta, pronta para review, sem merge
declarado, e foi mergeada manualmente pelo usuário.

**Atualização (PR #2, re-testado de verdade):** `mcp__github__enable_pr_auto_merge`
foi chamado novamente na PR #2 (`feature/supabase-rls-storage`) e desta
vez **não** retornou o erro "Auto-merge is not enabled for this
repository" — confirma que "Allow auto-merge" está de fato habilitado nas
configurações do repositório, como o usuário reportou. Porém o retorno
real foi outro erro, igualmente informativo:

```text
The pull request is already in clean status (all checks passed).
Auto-merge only applies when checks are pending — you can merge directly.
```

Ou seja: sem nenhum required status check configurado no branch padrão
(branch protection/ruleset continua sem confirmação de estar configurado —
sem ferramenta disponível para o agente configurar isso), o GitHub não tem
nada pendente para esperar, então recusa "armar" o auto-merge e sugere
merge direto. Isso confirma na prática a limitação que já estava
documentada como hipótese: auto-merge nativo do GitHub só funciona como
trava real quando existem required status checks pendentes; sem eles, a
opção do repositório sozinha não basta.

**Decisão tomada:** o agente **não** chamou `merge_pull_request` para
contornar isso. Fazer isso seria exatamente a "decisão unilateral de
merge" proibida pelo `automation-contract.md` (seção "Regra de merge") —
o critério "checks limpos" aqui só é verdadeiro porque não há check
nenhum, não porque algo foi de fato validado por CI. A PR #2 ficou aberta,
marcada como pronta para review (`draft: false`), aguardando merge manual
do usuário — mesmo fluxo de fechamento que a PR #1. **Confirmado via API**
(`pull_request_read`): `merged: true`, `merged_by: mzinhoww-svg`,
`merged_at: 2026-09-10T21:04:05Z` — o usuário mergeou manualmente pela UI
do GitHub, poucos minutos depois de a PR ficar pronta para review.

**Armadilha real descoberta neste ciclo:** um commit de docs (`d575b97`,
o texto original desta seção "Vercel" abaixo) foi enviado para
`feature/supabase-rls-storage` **depois** de o usuário já ter mergeado a
PR naquele head anterior (`5859ac9`). Push para uma branch de feature cuja
PR acabou de mergear não reabre nem atualiza a PR — o commit fica órfão,
só existindo na branch remota, e nunca chega ao branch padrão. Esse
conteúdo teve que ser reconstituído e commitado diretamente em
`claude/eager-galileo-d8hdtc` (ver nota abaixo sobre o bloqueio de deleção
de branch). **Lição:** depois de qualquer push a uma branch de feature,
vale checar o estado real da PR (`pull_request_read`) antes de assumir que
ela ainda está aberta — especialmente quando há um intervalo entre o push
e o próximo passo do agente.

**Ainda pendente (inalterado):** branch protection / ruleset com required
status checks no branch padrão. Enquanto isso não existir, toda PR futura
provavelmente vai repetir esse mesmo resultado ("clean status, merge
directly") em vez de travar em CI de verdade — vale configurar isso assim
que houver um workflow de CI real (lint/typecheck/test/build) para servir
de required check.

O servidor MCP do GitHub conectado nesta sessão expõe
`mcp__github__enable_pr_auto_merge` / `disable_pr_auto_merge` (nível de PR),
mas **não expõe nenhuma ferramenta de branch protection, ruleset ou
configurações de repositório**. Isso foi verificado por busca nas
ferramentas disponíveis, não é suposição.

Enquanto isso não for configurado:
- `enable_pr_auto_merge` provavelmente falha ("fails gracefully if
  auto-merge is not enabled for the repository").
- Mesmo que não falhasse, sem required checks configurados não há gate
  real — um merge "automático" aconteceria quase imediato.

**Passos manuais para o usuário (únicos que resolvem isso hoje):**
1. GitHub → repositório → Settings → General → Pull Requests → marcar
   "Allow auto-merge".
2. GitHub → repositório → Settings → Branches (ou Rules → Rulesets) →
   criar regra para `claude/eager-galileo-d8hdtc` (ou `main`) exigindo pull
   request antes de merge; adicionar required status checks assim que
   existir um workflow de CI real (lint/typecheck/test/build).

Até isso ser feito, qualquer PR de feature deste projeto será aberta e
validada localmente (checks reais rodados manualmente pelo agente antes do
push), mas o merge final depende de confirmação real do GitHub — o agente
vai tentar `enable_pr_auto_merge` e reportar exatamente o que acontecer
(sucesso, falha, ou merge que já é possível de forma direta caso não haja
nenhuma proteção configurada).

**Superado em parte a partir de 2026-09-11 — ver "Merge direto
autorizado" logo abaixo:** o usuário configurou manualmente o ruleset que
faltava e autorizou o agente a mergear diretamente quando o GitHub não
tiver nada pendente para o auto-merge esperar. O registro acima (PR #1,
PR #2) continua válido como histórico de como o comportamento era antes
dessa configuração existir.

## Merge direto autorizado

**2026-09-11 — autorização explícita do usuário.** O padrão observado nas
PRs #1 e #2 (seção acima) se repetiu de forma consistente nas PRs
seguintes: sem required status check configurado, `enable_pr_auto_merge`
nunca tinha nada para esperar e sempre retornava "already in clean
status... merge directly", então todo merge final dependia do usuário
mergear manualmente pela UI do GitHub. O usuário perguntou "Como deixar
automatizar você mesmo fazer o Merge?". A primeira resposta, escolhida via
`AskUserQuestion`, foi "GitHub auto-merge + branch protection" — ou seja,
configurar um gate real no GitHub em vez do agente mergear por conta
própria. Nessa mesma janela o usuário configurou manualmente um ruleset
no branch padrão exigindo o check `Vercel` antes de merge (precisou de um
segundo ajuste — o erro inicial "This ruleset does not target any
resources and will not be applied" foi resolvido adicionando "Target
branches" com o nome exato do branch ao ruleset).

Pouco depois, o usuário deu uma instrução direta e explícita — "Merge a
PR #10" — contradizendo a escolha anterior. O agente honrou a instrução
pontual: mergeou a PR #10 diretamente via `mcp__github__merge_pull_request`
(`merge_method: "squash"`) — primeiro caso real de merge direto pelo
agente neste projeto — e confirmou via `pull_request_read` depois:
`merged: true`, commit squash `24e3f291f263220f8e76af80c4aa7f8517311392`,
`merged_at: 2026-09-11T11:55:43Z`. Ao fazer isso, o agente sinalizou
explicitamente a tensão com a regra então vigente no
`automation-contract.md` ("o agente nunca decide mergear, só o GitHub") e
perguntou se o usuário queria formalizar isso como política permanente.
A resposta:

> done, e u já faça isso sozinho daqui pra frente (sem precisar pedir a
> cada PR), e atualize o automation-contract.md pra formalizar isso

Isso substitui a escolha inicial ("GitHub auto-merge + branch protection"
sem merge direto do agente) por uma política combinada, formalizada em
`docs/development/automation-contract.md` (seção "Regra de merge"): o
auto-merge nativo continua sendo a primeira tentativa em toda PR (deixa o
GitHub travar em required status checks quando há algo pendente), mas
quando não há nada pendente ("already in clean status") o agente agora
chama `merge_pull_request` diretamente, sem perguntar a cada PR, desde
que confirme antes — com leitura fresca via API — que o status combinado
é `success`, `mergeable_state` é `clean` e não há review humano pendente.

**O que não mudou:** todas as proibições absolutas continuam valendo —
nunca merge com CI vermelho, nunca com conflito não resolvido, nunca
bypass/`--admin` de proteção de branch, sempre confirmar `merged: true`
via API antes de declarar sucesso. A mudança é só sobre quem aciona o
merge quando o GitHub já reporta tudo limpo; a chamada continua sujeita a
qualquer branch protection/ruleset real configurado no branch padrão — se
o required check não tiver passado de verdade, o próprio GitHub recusa o
merge.

**Sobre a configuração do ruleset — ainda não confirmada por API:** o
usuário reportou (durante a troca sobre o erro "This ruleset does not
target any resources") ter configurado manualmente um ruleset no branch
padrão exigindo o check `Vercel` antes de merge. Isso nunca foi
confirmado de forma independente por nenhuma ferramenta MCP — o servidor
MCP do GitHub conectado nesta sessão não expõe nenhuma tool de branch
protection/ruleset/repository-settings (mesma limitação já documentada na
seção acima). A única confirmação possível é comportamental: se uma PR
futura, com o check `Vercel` ainda em andamento no momento do
`enable_pr_auto_merge`, fizer o auto-merge realmente armar/esperar (em
vez de retornar "already in clean status" imediatamente), isso confirma o
ruleset ativo na prática. A PR #10 não serve como esse teste — o check já
estava verde quando o agente chamou `enable_pr_auto_merge`.

**Atualização (PR #11, segundo caso — ainda inconclusivo):** esta própria
PR (`docs/formalize-direct-merge-policy`, mudança só de documentação) foi
o primeiro teste real do fluxo formalizado acima. `enable_pr_auto_merge`
retornou de novo "already in clean status... merge directly" — o check
`Vercel` já tinha terminado (`success`, "Deployment has completed") antes
mesmo da chamada, provavelmente porque o build de um preview sem mudança
de código é rápido. O agente confirmou via leitura fresca da API (status
combinado `success`, `mergeable_state: clean`, `get_reviews` vazio, único
comentário era o do `vercel[bot]`) e chamou `merge_pull_request`
diretamente (`squash`, `expectedHeadSha` = head da PR). Confirmado depois
via `pull_request_read`: `merged: true`, `merged_by: mzinhoww-svg`,
`merged_at: 2026-09-11T12:07:36Z`, commit squash
`3792ad65d2109f626a8d0ec84abbb55d801cd7d4`. **Ainda não é a confirmação
comportamental do ruleset** (mesma situação da PR #10: o check já estava
verde antes da chamada) — só confirma que o fluxo de merge direto em si
funciona ponta a ponta. Achado extra: o branch remoto da PR #11 já não
existia mais no momento da tentativa de deleção pós-merge — ver
"Limitação real conhecida — deleção de branch remota pós-merge" abaixo,
seção "Atualização (PR #11, comportamento mudou)".

**Atualização (PR #12, confirmação comportamental real do ruleset):** a
própria PR que registrava o adendo acima (`docs/record-pr11-merge-outcome`,
#12) forneceu o teste que faltava. `enable_pr_auto_merge` chamado logo
após abrir a PR (antes do preview da Vercel terminar) **não** retornou
"already in clean status" desta vez — retornou um erro novo: `The pull
request is in unstable status (required checks are failing). Fix the
failing checks before enabling auto-merge.` Antes de assumir uma falha de
verdade, o agente conferiu `pull_request_read` (`get_status` e `get`):
o status do commit era `state: "pending"` (`context: "Vercel"`,
`description: "Vercel is deploying your app"`) — não `failure` — e
`mergeable_state: "unstable"`, que no GitHub significa "required status
check ainda não terminou", não necessariamente falhou. A mensagem de erro
da ferramenta MCP ("required checks are failing") é enganosa nesse caso:
o check só estava pendente, ainda rodando. **Esta é a primeira
confirmação comportamental real, nesta sessão, de que existe um required
status check de verdade bloqueando merge no branch padrão** — nas PRs
#10 e #11 o check já sempre estava verde antes da chamada de
`enable_pr_auto_merge`, o que deixava em aberto se isso era por não haver
gate nenhum ou só porque o check era rápido demais para pegar a tempo;
agora está confirmado que é a segunda opção, e que o gate existe e
funciona. Não fazia sentido chamar `enable_pr_auto_merge` de novo depois
disso (o SDK já recusou uma vez) — o próximo passo é aguardar o webhook
de CI (`subscribe_pr_activity`, já ativo nesta PR) confirmar sucesso do
check e então seguir direto para o merge verificado
(`merge_pull_request`), sem tentar re-armar o auto-merge.

## Limitação real conhecida — deleção de branch remota pós-merge

O passo 8 do fluxo acima ("deletar o branch de feature") **falha hoje via
`git push origin --delete <branch>`** neste ambiente: retorna `HTTP 403` +
`RPC failed` / `unexpected disconnect` (testado após o merge da PR #2,
tentativa repetida em `feature/supabase-rls-storage` e
`feature/fundacao-design-system`, ambos os merges já confirmados via API).
O servidor MCP do GitHub conectado não expõe nenhuma ferramenta de deleção
de branch/ref (só `create_branch`) — verificado por busca nas ferramentas
disponíveis. Não é um bloqueio de rede (`git push`/`git pull` normais
funcionam o resto da sessão inteira contra o mesmo host); o mais provável
é permissão insuficiente do credencial usado para esse tipo específico de
operação, ou uma proteção não documentada no lado do GitHub.

**Impacto:** nenhum — branches de feature já mergeadas e órfãs no remoto
não afetam nada funcionalmente, só ficam poluindo a lista de branches.
**Não é bloqueador para nenhum Prompt.** Se o usuário quiser, pode apagar
manualmente pela UI do GitHub (Branches → ícone de lixeira) a qualquer
momento; o agente vai continuar tentando deletar localmente (branch local,
que funciona via `git branch -d`) e reportando quando a deleção remota
falhar, sem insistir/repetir a tentativa (ver `/root/.ccr/README.md`:
"do not retry... report them instead").

**Atualização (PR #11, comportamento mudou):** depois do merge direto da
PR #11 (`docs/formalize-direct-merge-policy` → primeira PR mergeada sob a
nova regra formalizada em "Merge direto autorizado" acima), `git push
origin --delete docs/formalize-direct-merge-policy` retornou um erro
diferente do HTTP 403 histórico: `remote ref does not exist` — confirmado
via `git ls-remote --heads origin` que o branch remoto já não existia mais
antes mesmo da tentativa de deleção. Ou seja, o branch já tinha sido
deletado automaticamente pelo GitHub no momento do merge (provável opção
"Automatically delete head branches" do repositório, possivelmente
ativada pelo usuário na mesma janela em que configurou o ruleset). Isso
não invalida o achado original (HTTP 403 nas PRs #1/#2) — só indica que a
configuração do repositório mudou depois. **Continua sem ferramenta MCP
para deletar branch diretamente**, mas na prática, a partir daqui, pode
já não ser mais necessário tentar: vale checar com `git ls-remote
--heads origin <branch>` antes de tentar deletar, em vez de assumir que
vai falhar com 403.

## Vercel

- O repositório já estava conectado a um projeto Vercel
  (`mazinhoww-5476s-projects/listadaescola`) via o app/bot `vercel[bot]`
  **desde a PR #1** — isso já constava no corpo da própria PR #1
  ("achado anterior de 'sem projeto Vercel conectado' estava errado"), mas
  nunca tinha sido registrado aqui no WORKFLOW.md até agora (PR #2). Todo
  push a uma branch com PR aberta dispara deploy de preview automático —
  aparece como comentário do bot (criado e depois editado conforme o build
  avança: `DEPLOYED`/`Building`/`Ready`) mais um commit status
  `context: "Vercel"`.
- Confirmado de novo na PR #2: status `Vercel` → `success` ("Deployment
  has completed") para o commit `5859ac9`, preview em
  `https://listadaescola-git-feature-supab-ec8b95-mazinhoww-5476s-projects.vercel.app`.
- É só um **commit status informativo** hoje, não um required check —
  branch protection continua não configurada (ver seção acima), então o
  status `Vercel` não bloqueia nada. Se/quando branch protection for
  configurada, vale considerar exigir esse status junto com CI de
  lint/typecheck/test/build.
- O comentário do `vercel[bot]` na PR é atualizado in-place a cada novo
  push (mesmo comentário, conteúdo editado) — não precisa de resposta, é
  só status automático.
- Ferramentas MCP `mcp__Vercel__*` estão disponíveis nesta sessão
  (`get_project_deployment_protection`, `get_web_analytics`, etc.) mas
  ainda não foram usadas/necessárias — a integração até agora é 100%
  automática via GitHub App, sem intervenção do agente.

## Supabase

- **Projeto:** `listada-escola`, ref `wfdejmokxrunupsekcmq`, região
  `sa-east-1`, organização `mzinhoww-gmailcom's projects`. Criado no
  Prompt 02 — a org já tinha outros projetos (`the-loyalty`, `wedding`,
  etc.) não relacionados a este; nunca assumir que um projeto Supabase
  existente é "o" projeto deste repo sem confirmar o nome.
- Plano free tem **limite de 2 projetos ativos simultâneos** por
  organização — bateu nesse limite ao criar o projeto e ao tentar reativar
  um projeto pausado existente; precisou que o usuário pausasse outro
  projeto primeiro. Ter isso em mente se um Prompt futuro precisar de outro
  projeto Supabase (branch de preview, staging, etc.).
- `mcp__Supabase__apply_migration` para DDL (schema, RLS, storage — tudo
  que deve virar arquivo em `supabase/migrations/`); `execute_sql` para
  tudo que não é migration (testes, queries de verificação, seed
  pontual). `apply_migration` valida referências a tabelas na criação de
  função `language sql` — funções que referenciam tabelas criadas
  depois precisam ficar em uma migration posterior (ver
  `20260910200900_rls_helper_functions.sql`, separado do resto dos
  helpers por esse motivo exato).
- **`get_advisors(type: security)` cacheia** — depois de uma correção
  (revogar EXECUTE, etc.), ele pode continuar reportando o estado antigo
  por um tempo. Não confiar nele para confirmar uma correção que acabou de
  ser aplicada; verificar direto via SQL
  (`information_schema.routine_privileges`, `pg_roles`, etc.) quando a
  confirmação imediata importa.
- Testar RLS de verdade (não só escrever as policies e assumir que
  funcionam) exige simular usuários: inserir linhas mínimas em
  `auth.users` (só `id`, `email`, `raw_user_meta_data` — o resto tem
  default), depois `set local role authenticated;` +
  `select set_config('request.jwt.claims', json_build_object('sub',
  '<uuid>', 'role','authenticated')::text, true);` para virar aquele
  usuário dentro da transação. Ver `supabase/tests/rls_idor.sql` para o
  padrão completo, incluindo a armadilha de USING-passa-mas-WITH-CHECK-falha
  (gera exceção, não 0 linhas).

## Autenticação (Supabase Auth)

Implementado no Prompt 03 (`@supabase/ssr`, `src/lib/auth/*`,
`src/proxy.ts`) — ver `docs/security/rls.md`, seção "RBAC de aplicação",
para o desenho completo. Aqui só as armadilhas reais descobertas.

- **Seed de usuário de teste para login real exige colunas de token
  vazias, não NULL.** `supabase/tests/rls_idor.sql` insere `auth.users`
  só com `(id, email, raw_user_meta_data)` — suficiente para simular papel
  via `set_config` dentro de uma transação com RLS, mas insuficiente para
  autenticar de verdade via `signInWithPassword`/`/auth/v1/token`: o
  GoTrue quebra com `"error finding user: sql: Scan error on column
  index 3, name \"confirmation_token\": converting NULL to string is
  unsupported"` (confirmado via `query_logs` no source `auth_logs`).
  Motivo: o driver Go do GoTrue escaneia `confirmation_token`,
  `recovery_token`, `email_change`, `email_change_token_new`,
  `email_change_token_current`, `phone_change`, `phone_change_token` e
  `reauthentication_token` como string não-anulável. Para seed de usuário
  com login real, definir essas colunas como `''` (string vazia) —
  também precisa de `encrypted_password` via
  `extensions.crypt('senha', extensions.gen_salt('bf'))` (pgcrypto já
  instalado neste projeto) e `email_confirmed_at = now()`.
- **Domínio `.local` é rejeitado pelo GoTrue em fluxos que enviam e-mail
  de verdade.** `signUp`/`resetPasswordForEmail` para um e-mail
  `algo@test.local` **novo** retornam `400 email_address_invalid`
  ("Email address ... is invalid") — mas isso só é checado no caminho que
  de fato tentaria enviar e-mail; um usuário já existente/confirmado
  reenviando signup (comportamento anti-enumeração do próprio GoTrue) não
  passa por essa validação e responde como sucesso normalmente. Ou seja:
  seed direto via SQL (bypassa GoTrue) aceita qualquer domínio; testar o
  fluxo real de signup/recovery ponta-a-ponta com um e-mail **novo**
  exige um domínio com formato realista (evitar `.local`/`.test`).
- **Rate limit de envio de e-mail é baixo por padrão no free tier.**
  Bateu em `429 over_email_send_rate_limit` depois de poucas chamadas
  reais de signup/recovery em sequência curta durante a verificação deste
  prompt. Não fica óbvio no client (o SDK só retorna `error`, sem detalhe
  visível na UI) — só apareceu via `query_logs` (`source: auth_logs`).
  Relevante para Prompt 17 (testes e2e) e Prompt 19 (produção): testar o
  fluxo de e-mail repetidamente exige espaçar as tentativas, e produção
  provavelmente vai precisar de SMTP customizado (Settings → Auth → SMTP)
  para não esbarrar nesse limite com usuários reais.
- **Redirect URLs / Site URL do Supabase Auth — sem ferramenta MCP para
  configurar.** `emailRedirectTo`/`redirectTo` (usados em `signUp`,
  `resetPasswordForEmail`, `resend`) só funcionam de verdade se a URL
  usada estiver na allow-list de "Redirect URLs" do projeto (Dashboard →
  Authentication → URL Configuration) — confirmado via
  `mcp__Supabase__search_docs`. Nenhuma ferramenta `mcp__Supabase__*`
  disponível nesta sessão lê ou escreve essa configuração (só
  `get_project_url`/`get_advisors`/`search_docs`/gestão de
  projeto/branch/edge function). `http://localhost:3000` costuma vir
  pré-configurado por padrão em projeto novo; qualquer domínio de
  produção/preview real (Vercel) **precisa ser adicionado manualmente**
  antes de link de confirmação/recuperação funcionar fora do localhost.
  Mesma categoria de bloqueio que "Allow auto-merge" do GitHub — reportar,
  não simular que está resolvido.
- Verificado ao vivo com `npm run dev` + Playwright (`chromium` global do
  ambiente, via `NODE_PATH=/opt/node22/lib/node_modules`, já que
  `playwright` não é dependência do projeto) contra o projeto Supabase
  real — 3 usuários seedados (USER/SCHOOL_MANAGER/ADMIN), testados e
  removidos ao final (nenhum dado de teste ficou no projeto). Ver PR do
  Prompt 03 para os scripts e resultado completo.

## Rollback

- PR com problema antes do merge: corrigir na mesma branch (commit novo) ou
  fechar a PR sem merge.
- Merge que precisa ser desfeito: usar revert (`git revert` do commit de
  merge) via nova PR — nunca reescrever histórico do branch padrão
  compartilhado (`push --force`) sem pedido explícito do usuário.
- Migration aplicada incorretamente: nova migration corretiva; nunca editar
  uma migration já aplicada em produção.

## Política de bloqueio

Se uma etapa não puder ser executada com as ferramentas disponíveis
(credencial ausente, permissão insuficiente, configuração que só existe na
UI do GitHub/Vercel/Supabase), reportar exatamente: comando/ferramenta
tentada, erro retornado, o que falta, e se a mudança necessária é dentro ou
fora do repositório. Nunca alegar que uma etapa foi concluída quando não
foi.
