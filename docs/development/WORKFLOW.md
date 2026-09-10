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
acima não é hipotética. A PR ficou aberta, pronta para review, sem merge
declarado.

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
