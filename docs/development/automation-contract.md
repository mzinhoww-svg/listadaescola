# Contrato de Automação — Listada Escola

- **Origem:** adaptado de `docs/prompts/AUTOMATION-CONTRACT.md` (pacote de prompts fornecido em 2026-09-10).
- **Autoridade:** este documento é a autoridade operacional para Git/PR/CI/Vercel/merge. O PRD (`docs/product/PRD.md`) continua sendo a autoridade de produto, segurança e escopo. O Stitch continua sendo a referência visual.
- **Onde isso é carregado automaticamente:** a versão resumida destas regras está em `/CLAUDE.md`, que é lido automaticamente pelo Claude Code no início de cada sessão neste repositório. Este arquivo é a versão completa.

## Loop obrigatório

```text
ANALISAR
  ↓
CRIAR BRANCH
  ↓
IMPLEMENTAR
  ↓
TESTAR
  ↓
CORRIGIR FALHAS
  ↓
TESTAR NOVAMENTE
  ↓
REVISAR DIFF
  ↓
COMMIT
  ↓
PUSH
  ↓
CRIAR PR
  ↓
ATIVAR AUTO-MERGE (quando disponível) / AGUARDAR CHECKS
  ↓
FALHOU? → DIAGNOSTICAR → CORRIGIR → COMMIT → PUSH → CHECKS NOVAMENTE
  ↓ (não)
GITHUB EXECUTA O MERGE (nunca declarado sem confirmação real da API)
  ↓
ATUALIZAR BRANCH PADRÃO LOCALMENTE
  ↓
DELETAR BRANCH DE FEATURE
  ↓
WORKTREE LIMPO
```

Regras fixas:

- Nunca editar o branch padrão diretamente para mudanças não triviais. Sempre branch de trabalho → PR.
- Nunca usar `--no-verify` para esconder falha de hook/lint/commit.
- Nunca usar bypass de proteção de branch (`--admin` ou equivalente) para forçar merge.
- Nunca fazer merge com CI vermelho ou com conflito não resolvido.
- Nunca declarar "merge concluído" sem evidência real da API/ferramenta confirmando o estado `merged`.
- Se um bloqueio exigir configuração externa (permissão, credencial, config do GitHub) que a ferramenta disponível não permite alterar, reportar exatamente o bloqueio — nunca fingir que a etapa foi executada.

## Adaptação para este ambiente (importante — diverge do texto original do contrato)

O contrato original foi escrito assumindo a CLI `gh`. Neste ambiente de execução **`gh` não está instalado** (verificado: `command -v gh` → not found). O acesso ao GitHub é feito via ferramentas MCP. Equivalências:

| Comando `gh` do contrato original | Equivalente real neste ambiente |
|---|---|
| `git status --short --branch`, `git fetch`, `git switch -c`, `git add`, `git commit`, `git push` | Iguais — `git` está disponível normalmente. |
| `gh pr create --base main --head <branch> --title ... --body-file ...` | `mcp__github__create_pull_request` |
| `gh pr checks <pr-number> --watch` | Não há um "watch" bloqueante equivalente. Usar `subscribe_pr_activity` (recebe eventos de CI/review como wake da sessão) e/ou `mcp__github__pull_request_read` / `get_check_run` para consultar status pontualmente. |
| `gh pr merge <pr-number> --auto --squash --delete-branch` | `mcp__github__enable_pr_auto_merge` primeiro (deixa o GitHub mergear sozinho quando os required status checks configurados no branch padrão passarem); se retornar "already in clean status... merge directly" (nada pendente para o auto-merge esperar), `mcp__github__merge_pull_request` com `merge_method: "squash"` — ver "Regra de merge" abaixo para as condições exigidas antes dessa chamada. Deleção de branch pós-merge é feita via git normal (`push --delete` ou API), não é automática pela ferramenta. |
| `gh pr merge <pr-number> --admin` | **Não existe equivalente e não deve ser usado/buscado.** Proibido pelo próprio contrato. |

Não há CLI `supabase` instalada neste ambiente; operações de banco usam as ferramentas MCP `mcp__Supabase__*`.

## Regra de merge (auto-merge nativo do GitHub primeiro; merge direto autorizado como segunda etapa)

**Atualizado em 2026-09-11, a pedido explícito do usuário** (ver
`docs/development/WORKFLOW.md`, seção "Merge direto autorizado", para o
histórico completo da decisão). Substitui a regra original ("o agente
nunca decide mergear, só o GitHub") deste mesmo documento — aquela regra
existia porque não havia nenhum gate real configurado; agora existe.

1. Depois de abrir a PR e validar localmente (lint/typecheck/test/build), o agente solicita auto-merge via `mcp__github__enable_pr_auto_merge`.
2. Se o GitHub tiver algo pendente para esperar (required status check ainda rodando), o auto-merge nativo dispara sozinho quando esse check passar — o agente não precisa fazer mais nada além de acompanhar.
3. Se a chamada retornar "already in clean status... merge directly" (nada pendente — o caso mais comum neste repositório, já que o único check é o build do Vercel, normalmente rápido), o agente confirma, com uma leitura fresca via API imediatamente antes de mergear, que:
   - o status combinado da PR é `success` (Vercel verde);
   - `mergeable_state` é `clean` (sem conflito);
   - não há comentário de review humano pendente/não endereçado.
   Se as três condições valerem, o agente chama `mcp__github__merge_pull_request` (`merge_method: "squash"`, mesmo método já usado em todas as PRs deste projeto) diretamente — sem perguntar de novo a cada PR. Isso não é bypass: a chamada de merge continua sujeita a qualquer branch protection/ruleset configurado no branch padrão (se o required status check não tiver passado de verdade, o próprio GitHub recusa o merge).
4. O agente nunca reporta "merge concluído" sem checar o estado real (`merged: true`) via `pull_request_read` depois — continua proibido declarar sucesso só pela resposta da própria chamada de merge.
5. Continuam absolutas as proibições já existentes: nunca mergear com CI vermelho, nunca mergear com conflito não resolvido, nunca usar `--admin`/bypass de proteção de branch para forçar um merge que o GitHub recusaria de outra forma, nunca pular a confirmação via API.

**Sobre branch protection/required status checks:** o usuário configurou manualmente um ruleset no branch padrão (`claude/eager-galileo-d8hdtc`) exigindo o check `Vercel` antes de merge — nenhuma ferramenta MCP disponível nesta sessão permite ler ou configurar isso diretamente (não há tool de branch protection/ruleset/repository-settings no servidor MCP do GitHub conectado), então essa configuração nunca foi verificada por uma chamada de API, só reportada pelo usuário. O comportamento observado nas próximas PRs (auto-merge realmente esperando o check em vez de retornar "already in clean status" imediatamente) é a confirmação prática — ver WORKFLOW.md para o registro de cada caso real.

## Requisitos mínimos de PR

Toda PR deve ter:

```text
## O que foi alterado
## Motivo
## Arquivos principais
## Testes executados
## Segurança
## Impacto
## Checklist
- [ ] lint
- [ ] typecheck
- [ ] tests
- [ ] build
- [ ] security checks
- [ ] Vercel Preview
```

## Revisão de diff antes de solicitar auto-merge

Antes de pedir auto-merge, revisar `git diff` (branch padrão...HEAD) procurando: código desnecessário, secrets, debug/logs esquecidos, dependências não usadas, alterações fora do escopo, migrations, RLS, endpoints, autorização. Nunca solicitar auto-merge de uma alteração que viole o PRD.

## Security gates (antes de todo merge)

- **RLS:** toda tabela nova exposta precisa ter RLS habilitado com policies explícitas.
- **IDOR:** todo acesso por ID (path/query/body) precisa validar ownership/RBAC no servidor.
- **RBAC:** nenhuma operação administrativa protegida só pelo frontend.
- **Secrets:** nenhuma chave privada no client, no bundle, no git, na documentação ou em logs.
- **XSS:** nenhum input de usuário renderizado como HTML sem sanitização.
- **Storage:** uploads privados continuam privados (RLS/policies de bucket).

## Regra comercial do MVP (absoluta)

Proibido, salvo instrução posterior explícita: checkout, PIX, cartão, boleto, gateway (Stripe, Mercado Pago, etc.), payment intent, carrinho próprio, processamento de pagamento, pedido interno, confirmação de pagamento.

```text
LISTA → E-COMMERCE → REDIRECT EXTERNO → TRACKING
LISTA → PAPELARIA → WHATSAPP → TRACKING
```

## Regra Stitch

Para toda tarefa de UI: localizar a tela no MCP Stitch → inspecionar composição/hierarquia/componentes/textos/responsividade/estados → reproduzir fielmente, adaptando ao sistema de componentes existente → o PRD prevalece se o Stitch tiver algo incompatível com o PRD. Nunca inventar um design completamente diferente sem necessidade, e nunca implementar checkout/pagamento que porventura apareça em uma tela do Stitch.

**Status atual:** o MCP `stitch` não está configurado nesta sessão (confirmado — não aparece na lista de ferramentas/MCP disponíveis). Qualquer trabalho de UI feito enquanto isso for verdade deve ser explicitamente marcado como provisório/pendente de conferência contra o Stitch assim que o MCP estiver disponível.

## Regra INEP

```text
INEP → SCHOOL MASTER → LISTADA CONTENT → COMMUNITY CONTRIBUTION → MODERATION → PUBLICATION
```

Usuário comum não edita dados oficiais nem duplica escola existente; pode sugerir escola e contribuir com listas.

## Regra de dados geográficos

Não usar Google Maps. `MapProvider` → MapLibre → OSM/OSM-derived tiles. PostGIS calcula distância. Sem lat/long: fallback por CEP/município, nunca fabricar distância.

## Não modificar indiscriminadamente

Antes de alterar qualquer arquivo: verificar conteúdo atual, preservar trabalho existente, entender dependências, evitar reescritas desnecessárias e duplicação. Antes de qualquer migration: checar migrations existentes, preservar histórico, nunca editar uma migration já aplicada em produção para "corrigir" histórico.
