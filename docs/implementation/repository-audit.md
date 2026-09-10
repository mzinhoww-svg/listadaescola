# Auditoria Inicial do Repositório — Listada Escola

- **Data:** 2026-09-10
- **Branch:** `claude/eager-galileo-d8hdtc`
- **Repositório:** `mzinhoww-svg/listadaescola`
- **Escopo do prompt:** Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel, escopo inicial Mato Grosso.

## Resumo executivo

**O repositório está vazio.** Não há um único commit, em nenhuma branch, no
histórico do projeto. Não existe código de aplicação, não existe
`package.json`, não existe diretório `supabase/`, e nenhum dos documentos
obrigatórios listados no prompt (`docs/product/PRD.md`, `docs/product/*`,
`docs/architecture/`, `docs/security/`) existe no repositório.

Isso significa que **nenhuma das seis etapas de descoberta pedidas no
prompt** (detectar stack, inspecionar arquivos de projeto, listar designs no
Stitch, mapear designs a rotas do PRD, marcar telas de checkout, mapear
auth/RLS/Storage) pode ser executada sobre conteúdo real — porque não há
stack, não há PRD e não há rotas para mapear. Este documento registra o
estado real encontrado, como ele foi verificado, e o que falta para que uma
auditoria de fato aconteça.

Nenhum código foi escrito e nenhum banco de dados foi alterado nesta etapa,
em conformidade com a instrução do prompt — não havia, de toda forma, nada
para alterar.

## Metodologia de verificação

O estado vazio foi confirmado por dois caminhos independentes, para excluir
erro de configuração local:

1. **Git local:**
   - `git status` → branch `claude/eager-galileo-d8hdtc`, "No commits yet".
   - `git log --oneline -15` → erro "does not have any commits yet".
   - `git remote -v` → aponta para `https://github.com/mzinhoww-svg/listadaescola`.
   - `git fetch origin` → não retorna nenhuma ref remota.
   - `git branch -r` → vazio.
   - `git remote show origin` → `HEAD branch: (unknown)` (não há branch padrão porque não há conteúdo).
   - `ls -la` na raiz do working directory → apenas `.git`, nenhum outro arquivo.

2. **GitHub API (independente do git local):**
   - `list_branches` no repositório → `[]` (zero branches).
   - `list_issues` (estado aberto) → `totalCount: 0`.
   - `list_pull_requests` (todos os estados) → `[]`.
   - `list_repos` da conta conectada → confirma que `mzinhoww-svg/listadaescola`
     é o **único** repositório disponível nesta sessão (não há um repositório
     irmão/alternativo com o conteúdo real do projeto que possa ter sido
     confundido com este).

Conclusão: não é um problema de fetch incompleto ou de branch errada — o
repositório GitHub em si não tem nenhum commit em nenhuma branch.

## Achados por área de inspeção (conforme pedido no prompt)

| Área pedida | Status | Evidência |
|---|---|---|
| Linguagem/framework | **Ausente** | Nenhum `package.json`, `tsconfig.json`, `next.config.*` ou arquivo-fonte de qualquer linguagem existe. |
| ORM/query builder | **Ausente** | Nenhuma dependência declarada em lugar nenhum (não há lockfile). |
| Auth | **Ausente** | Nenhum código de autenticação, middleware ou configuração de provider. |
| Frontend (app/src/pages) | **Ausente** | Nenhum diretório `app/`, `src/`, ou `pages/`. |
| Supabase | **Ausente** | Nenhum diretório `supabase/`, nenhum `supabase/config.toml`, nenhuma migration. |
| Vercel | **Parcial** | Nenhum `vercel.json` versionado, mas os metadados do repositório no GitHub têm `homepage = https://listadaescola.vercel.app` — ou seja, existe (ou existiu) um projeto Vercel com esse nome associado ao repo. A URL responde **404** no momento desta auditoria: o nome do projeto está reservado, mas não há nenhum deploy bem-sucedido nele (consistente com não haver código para implantar). |
| CI | **Ausente** | Nenhum `.github/workflows/`. |
| Docker | **Ausente** | Nenhum `Dockerfile` ou `docker-compose*`. |
| Tooling (lint/test/format) | **Ausente** | Nenhum ESLint/Prettier/Vitest/Jest/Playwright config. |
| `package.json` + lockfile | **Ausente** | Confirmado por listagem de diretório. |
| Env examples (`.env.example` etc.) | **Ausente** | Nenhum arquivo de exemplo de variáveis de ambiente. |
| Migrations | **Ausente** | Não há diretório `supabase/migrations`. |
| Testes | **Ausente** | Nenhum arquivo de teste. |
| `docs/product/PRD.md` | **Ausente** | Não encontrado; `docs/` não existe até esta auditoria criá-lo. |
| `docs/product/*` (demais docs de produto) | **Ausente** | Idem. |
| `docs/architecture/` | **Ausente** | Idem. |
| `docs/security/` | **Ausente** | Idem. |
| `supabase/*` | **Ausente** | Idem. |

Como nenhuma dessas áreas tem conteúdo, os itens "mapear auth, RLS, Storage,
server actions/route handlers e env vars" (etapa 6 do prompt) e "mapear cada
design a uma rota do PRD" (etapa 4) não têm nada para serem mapeados contra.
Não há RLS porque não há banco; não há rotas porque não há aplicação; não há
PRD para definir as rotas em primeiro lugar.

## Stitch MCP

O prompt presume que o MCP `stitch` "já deve estar configurado no ambiente
do Claude Code". **Não está.** A lista de ferramentas/MCP disponíveis nesta
sessão foi conferida integralmente e não inclui nenhuma ferramenta com nome
`stitch` — os servidores MCP efetivamente disponíveis nesta sessão são:
Beehiiv, Canva, Gmail, Google Calendar, Google Drive, Granola, HubSpot,
Lovable, Miro, Pipedrive, Realoficial, Supabase, Tactiq, Tavily, Vercel,
GitHub e higghsfield (mais BREVO/Replit, que exigem autenticação e não
foram usados). Nenhum deles é o Stitch.

Servidores MCP são carregados na inicialização do ambiente da sessão, não
podem ser anexados dinamicamente executando um comando de CLI durante a
conversa. Por isso, **o comando `claude mcp add stitch ...` enviado na
mensagem não foi executado** — mesmo que fosse executado, ele não tornaria
as ferramentas do Stitch disponíveis nesta sessão em andamento.

### Nota de segurança — chave de API exposta

A mensagem do usuário incluiu, em texto puro, uma chave de API real para o
endpoint do Stitch (`X-Goog-Api-Key`). Isso é sensível e a chave **não foi
usada, executada ou gravada em nenhum arquivo deste repositório**, em linha
com a regra do próprio prompt ("Nunca grave a chave no código, Git,
documentação, `.env.example` ou bundle").

Recomendação: trate essa chave como comprometida (ela já está em texto
puro num histórico de conversa) e **revogue/rotacione-a** no console onde
foi emitida assim que possível. Para configurar o MCP Stitch no futuro,
defina `STITCH_API_KEY` como variável de ambiente/segredo na plataforma
(nunca colada em um prompt de tarefa) e configure o servidor MCP a nível de
ambiente da sessão, não por comando ad-hoc dentro de uma conversa.

## O que falta para uma auditoria real

Para que as etapas 1–6 do prompt possam ser executadas com conteúdo real:

1. O código-fonte da aplicação (Next.js/TypeScript) precisa existir no
   repositório, ou
2. Este é de fato um projeto novo do zero, e as etapas de detecção de stack
   não se aplicam ainda — o próximo passo seria criar o PRD e a arquitetura
   antes de haver algo para auditar.
3. `docs/product/PRD.md` (e demais docs de produto/arquitetura/segurança)
   precisam existir para que haja rotas contra as quais mapear telas do
   Stitch.
4. O MCP `stitch` precisa estar configurado a nível de ambiente (com a
   chave rotacionada e armazenada como segredo, não em texto de prompt)
   para que os designs possam ser listados e inspecionados.

## Branch padrão e Pull Request

Como o repositório não tinha nenhum commit antes desta sessão, ele também
não tinha uma branch padrão definida (`git remote show origin` retornava
`HEAD branch: (unknown)`). Ao empurrar `claude/eager-galileo-d8hdtc` como o
primeiro push do repositório, o GitHub automaticamente definiu essa branch
como a **branch padrão** do repositório (confirmado via API:
`default_branch: "claude/eager-galileo-d8hdtc"`).

Por isso, **nenhum Pull Request foi aberto** — não existe outra branch para
usar como base de comparação; abrir um PR da branch contra ela mesma não é
possível nem faz sentido. As alterações desta etapa estão diretamente no que
hoje é a branch padrão do repositório.

Isso é uma decisão estrutural que cabe ao usuário revisar: se o nome de
branch padrão pretendido para o projeto é `main` (convenção mais comum), é
necessário renomear esta branch ou criar `main` explicitamente e ajustar o
padrão do repositório — isso não foi feito automaticamente aqui por ser uma
mudança estrutural do projeto, não uma auditoria.

## Testes / lint / build

Não aplicável — não há código, `package.json` ou scripts para rodar.

## Arquivos alterados nesta etapa

- `docs/implementation/repository-audit.md` (novo — este arquivo)
- `docs/implementation/stitch-mapping.md` (novo)

Nenhum código de aplicação e nenhum schema de banco foram tocados.
