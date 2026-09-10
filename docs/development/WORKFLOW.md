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

## Como abrir e mergear uma PR aqui (mecânica real)

1. `git switch -c <tipo>/<slug>` a partir do branch padrão atual.
2. Implementar, rodar lint/typecheck/test/build localmente.
3. `git add`, `git commit`, `git push -u origin HEAD`.
4. Abrir PR com `mcp__github__create_pull_request` (base = `claude/eager-galileo-d8hdtc` por enquanto).
5. Validar localmente antes de tirar do rascunho; marcar pronta para review com `mcp__github__update_pull_request` (`draft: false`) quando estiver de fato pronta — uma PR em draft não é mergeada pelo auto-merge do GitHub mesmo com auto-merge solicitado.
6. Solicitar auto-merge com `mcp__github__enable_pr_auto_merge`. **Ver limitação abaixo — hoje isso provavelmente falha ou não trava nada de verdade.**
7. Acompanhar CI/review via `subscribe_pr_activity` (eventos chegam como wake da sessão) e `mcp__github__pull_request_read`/`get_check_run` para status pontual. Nunca declarar "merge concluído" sem confirmar o estado `merged` via API.
8. Após merge confirmado: atualizar o branch padrão local, deletar o branch de feature, confirmar worktree limpo.

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
do usuário — mesmo fluxo de fechamento que a PR #1.

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

## Vercel

- **Descoberto na PR #2** (não configurado por esta sessão): o repositório
  GitHub já está conectado a um projeto Vercel
  (`mazinhoww-5476s-projects/listadaescola`) via o app/bot `vercel[bot]`.
  Todo push a uma branch com PR aberta dispara deploy de preview
  automático — evento chega como comentário do bot (criado e depois
  editado conforme o build avança: `DEPLOYED`/`Building`/`Ready`) mais um
  commit status `context: "Vercel"`.
  Confirmado no PR #2: status `Vercel` → `success` ("Deployment has
  completed") para o commit `5859ac9`, preview em
  `https://listadaescola-git-feature-supab-ec8b95-mazinhoww-5476s-projects.vercel.app`.
- Isso é só um **commit status informativo** hoje, não um required check —
  branch protection continua não configurada (ver seção acima), então o
  status `Vercel` não bloqueia nada. Se/quando branch protection for
  configurada, vale considerar exigir esse status junto com CI de
  lint/typecheck/test/build.
- O comentário do `vercel[bot]` na PR é atualizado in-place a cada novo
  push (mesmo comentário, conteúdo editado) — não precisa de resposta,
  é só status automático.
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
