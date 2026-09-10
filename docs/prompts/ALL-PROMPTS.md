# Listada Escola — ALL PROMPTS v2

> Cada seção contém um único bloco copiável. Execute em ordem.

--- PROMPT 00 ---
# 00-auditoria-repositorio-stitch

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Auditoria inicial do repositório + Stitch

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: descobrir o estado real antes de implementar.

1. Detecte linguagem, framework, ORM/query builder, auth, frontend, Supabase, Vercel, CI, Docker e tooling.
2. Inspecione package.json, lockfile, app/src/pages, configs, env examples, migrations, testes e documentação.
3. Use o MCP Stitch para listar/localizar todos os designs do projeto.
4. Mapeie cada design para uma rota do PRD. Registre desktop/mobile, componentes, estados, textos, dependências e divergências.
5. Identifique qualquer tela de checkout/pagamento do Stitch e marque-a como FORA DO MVP.
6. Mapeie auth, RLS, Storage, server actions/route handlers e env vars.

Crie:
- docs/implementation/repository-audit.md
- docs/implementation/stitch-mapping.md

Não reescreva a aplicação nem altere banco nesta etapa.
```

--- PROMPT 01 ---
# 01-fundacao-design-system

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Fundação + design system

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: criar a base visual e estrutural reutilizável.

Use Stitch para extrair padrões de tipografia, cores, spacing, radius, sombras e componentes.

Crie/ajuste componentes reutilizáveis para Button, Input, Card, Badge, Drawer, BottomSheet, Modal, Table, Toast, EmptyState, LoadingState, Header e Footer.

Organize áreas pública, auth, conta, contribuição e admin.

Garanta acessibilidade: foco, teclado, labels, contraste e touch targets.

Não implementar lógica de negócio, checkout ou dados persistentes fictícios.
```

--- PROMPT 02 ---
# 02-supabase-rls-storage

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Supabase + migrations + RLS + Storage

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: banco seguro e reproduzível.

Implemente migrations do schema aprovado: enums, tabelas, FKs, constraints, índices, PostGIS, triggers e funções seguras.

RLS: toda tabela exposta deve ter policies explícitas para anon/authenticated/ownership/admin. Teste user A versus user B e privilege escalation.

Storage: assets públicos aprovados e bucket privado para submissions. Validar ownership, MIME, tamanho, path e delete.

Usuário não pode escrever diretamente em school_lists.

Atualize docs/security/rls.md e crie testes de RLS/IDOR.
```

--- PROMPT 03 ---
# 03-auth-rbac

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Auth + profiles + RBAC

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: autenticação SSR e autorização real.

Implemente entrar, criar conta, recuperação, redefinição, verificação e logout.

Papéis: USER, EDITOR, SCHOOL_MANAGER, STORE_MANAGER, ADMIN, SUPER_ADMIN.

Proteja /minha-conta, /enviar-lista, /sugerir-escola e /admin. Valide papel no servidor/banco.

Preserve retorno pós-login de forma segura e impeça open redirect.

Teste anon, user, manager e admin. Não adicionar login social sem requisito.
```

--- PROMPT 04 ---
# 04-inep-mt

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Importação INEP — Mato Grosso

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: importar a base fornecida de MT sem acoplar arquitetura ao estado.

Pipeline: CSV -> staging -> validação -> normalização -> merge. `inep_code` é único.

Validar o recorte conhecido: 2.722 escolas, 141 municípios, 2.246 públicas, 476 privadas e 1.178 sem lat/long. Se divergir, registrar.

Não falhar por telefone/coordenadas ausentes. Não excluir fisicamente escolas. Separar campos INEP dos editoriais.

Criar comando reproduzível e docs/architecture/inep-import.md. Testar idempotência.
```

--- PROMPT 05 ---
# 05-mapas-localizacao

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Mapas open-source + localização + PostGIS

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: localização sem Google Maps.

Criar MapProvider e implementação MapLibre. Provider de tiles deve ser configurável e substituível.

Aceitar CEP, cidade, bairro e localizar-me. PostGIS calcula proximidade. Sem coordenada, fallback por CEP/município sem inventar distância.

Exibir atribuição OSM quando aplicável. Não usar o servidor público de tiles OSM como dependência rígida, nem fazer bulk download/prefetch.

Mapa é componente não crítico: se falhar, busca continua funcional. Segredos de geocoding são server-only.
```

--- PROMPT 06 ---
# 06-home-busca-resultados

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Home + busca + resultados

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: implementar a primeira jornada pública usando Stitch como referência.

Home: hero, busca por CEP/cidade/escola, localizar-me, destaques, listas recentes, enviar lista.

Busca: confirmação de localização, mapa e estados de erro.

Resultados: filtros por tipo, distância, etapa, avaliação; ordenação por relevância, proximidade, popularidade e avaliação; cards; mapa; paginação.

Separar visualmente relevância, rating e patrocínio. Exibir PATROCINADA.

Registrar busca, localização e school impression. Não exigir login para consulta.
```

--- PROMPT 07 ---
# 07-escola-serie-lista

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Perfil da escola + séries + lista

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: implementar perfil público, seleção de série/ano e lista.

Perfil: dados INEP, editorial aprovado, contatos, mapa, etapas, séries e listas.

Série/ano: manter etapa, série e ano letivo como conceitos distintos.

Lista: versão publicada, itens, quantidade, unidade, marca, obrigatório/opcional, observação, salvar e compartilhar. Apenas APPROVED é público.

Registrar school_view, list_view e list_share. Evitar N+1.
```

--- PROMPT 08 ---
# 08-commerce-sem-checkout

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# E-commerce — outbound sem checkout

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: conectar usuários a parceiros externos.

Criar CommerceProvider e cards de parceiro com logo, nome, integração e CTA.

Antes do redirect registrar commerce_click, escola, lista, parceiro e atribuição. Validar destino server-side e impedir open redirect.

NÃO IMPLEMENTAR checkout, PIX, cartão, boleto, gateway, payment intent, pedido ou carrinho próprio.

CTA deve deixar claro que o usuário sairá do Listada.
```

--- PROMPT 09 ---
# 09-papelaria-whatsapp

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Papelarias + WhatsApp

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: transformar lista em solicitação de orçamento local.

Usar Stitch para drawer desktop e bottom sheet mobile. Mostrar papelarias próximas, distância apenas quando disponível, rating, horário, entrega/retirada e WhatsApp.

Gerar mensagem com escola, série, ano, itens, quantidades e perguntas de preço/disponibilidade. Normalizar e validar telefone server-side.

Abrir WhatsApp; não enviar automaticamente. Registrar store_view e whatsapp_click.

Não implementar WhatsApp Business API, checkout ou pagamento.
```

--- PROMPT 10 ---
# 10-contribuicao-lista

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Wizard de contribuição de lista

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: implementar o fluxo autenticado Escola -> Ano -> Série -> Itens -> Anexo -> Revisão -> Envio -> Confirmação.

Anon deve ir ao login e retornar com segurança ao wizard. Autosave de draft. Ownership obrigatório.

Selecionar escola INEP; se não encontrar, sugerir nova escola. Itens com nome, quantidade, unidade, marca, obrigatório e observação.

Upload PDF/JPG/PNG em bucket privado, com validação de MIME/tamanho/extensão.

Criar/alterar list_submissions, nunca school_lists. Estados DRAFT/SUBMITTED.
```

--- PROMPT 11 ---
# 11-moderacao

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Moderação de contribuições

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: criar fila e decisão segura de publicação.

Fila com status, cidade, escola, ano, série, data e prioridade.

Detalhe em duas colunas: documento original e dados submetidos.

Transições válidas: SUBMITTED -> UNDER_REVIEW -> APPROVED/NEEDS_CORRECTION/REJECTED.

Validar auth, RBAC, state transition e impedir autor de aprovar própria submission. Gerar audit log para cada ação.
```

--- PROMPT 12 ---
# 12-admin-crud

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Admin de escolas, listas e parceiros

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: CRUD administrativo para escolas, listas, papelarias, e-commerce e catálogo.

Dados INEP devem ser identificados como fonte oficial. Dados editoriais separados. Listas versionadas. Parceiros ativos/inativos.

Toda mutação deve validar auth + RBAC + payload + audit log. IDs arbitrários devem respeitar autorização.

Não incluir pagamentos.
```

--- PROMPT 13 ---
# 13-ranking-patrocinio

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Ranking + relevância + patrocínio

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: implementar ranking transparente.

Separar organic_score, rating_score e sponsored_priority.

Organic pode considerar distância, popularidade, listas aprovadas, completude e qualidade. Patrocínio usa campanha, entidade, período e prioridade.

Mostrar PATROCINADA. Não alterar rating por patrocínio. Pesos configuráveis no backend/admin, não em React.
```

--- PROMPT 14 ---
# 14-analytics-vendas

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Analytics + acompanhamento de vendas

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: medir intenção e conversão sem pagamento próprio.

Eventos: busca, localização, impressão, escola, lista, share, commerce click, whatsapp click, store view, favorites e submissions.

Estruturar venda reportada, valor bruto, comissão, parceiro, escola, lista e data. Papelaria: solicitação, orçamento, valor, venda reportada, ticket e conversão. E-commerce: cliques, conversões reportadas, valor e comissão.

Não criar orders/payments/checkout. Minimizar PII.
```

--- PROMPT 15 ---
# 15-seo

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# SEO técnico

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: indexar somente conteúdo público útil.

Implementar title, description, canonical, Open Graph, JSON-LD quando adequado, sitemap e robots.

Indexar estado, cidade, escola, lista publicada e papelaria ativa. Bloquear admin, conta, draft e submission.

Preservar URLs do PRD e evitar duplicidades.
```

--- PROMPT 16 ---
# 16-auditoria-seguranca

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Auditoria final de segurança

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: auditar código inteiro nas cinco categorias do padrão definido.

1. Banco sem trava: RLS, ownership, filtros, RPCs, agregações e exports.
2. Permissão no navegador: cruzar gates do frontend com backend.
3. IDOR: percorrer todos os route handlers/server actions e IDs de path/query/body.
4. Secrets: source, env, docs, CI, Docker, git history disponível e bundle.
5. XSS: innerHTML, dangerouslySetInnerHTML, markdown, URLs, eval/Function e HTML em emails.

Somente achados verificados. Para cada um: arquivo, linha, trecho, exploração, condição e severidade. Registrar também o que está correto. Criar docs/security/final-audit.md.
```

--- PROMPT 17 ---
# 17-testes-e2e

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Testes E2E + segurança

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: provar as jornadas principais.

Fluxos: busca -> escola -> lista -> parceiro; lista -> papelaria -> WhatsApp; anon -> login -> contribuição -> submit; admin -> moderação -> publicação.

Testar IDOR, RBAC, open redirect, upload, estados de erro e redirecionamento externo.

Esconder botão nunca substitui autorização de backend.
```

--- PROMPT 18 ---
# 18-performance-a11y

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Performance + acessibilidade

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: revisar experiência real em mobile e desktop.

Verificar Core Web Vitals, JS, imagens, cache, queries, N+1, PostGIS e paginação.

Verificar teclado, foco, labels, headings, contraste, alt text, dialogs, drawers e mensagens de erro.

Mapa não pode ser o único mecanismo de seleção/localização.
```

--- PROMPT 19 ---
# 19-vercel-producao

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Vercel + produção

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: preparar local, preview e produção.

Validar env vars, build, logs, error boundaries e smoke checks. Garantir secrets server-only.

Validar SSR, Server Actions/Route Handlers, Supabase, uploads e mapas em Vercel.

Não adicionar serviços pagos desnecessários.
```

--- PROMPT 20 ---
# 20-gap-final

```text
## CONTRATO OPERACIONAL OBRIGATÓRIO — GIT/PR/CI/VERCEL

Trabalhe de forma autônoma neste prompt:

- Não editar `main` diretamente.
- Criar branch de trabalho.
- Implementar.
- Rodar checks.
- Corrigir falhas e repetir os checks.
- Fazer revisão do diff.
- Commitar.
- Push.
- Criar PR no GitHub automaticamente.
- Esperar CI/checks/preview Vercel.
- Corrigir automaticamente toda falha que puder ser corrigida pelo agente.
- Atualizar a PR com as correções.
- Fazer merge automático somente após todos os critérios de aceite + CI + segurança passarem.
- Após merge, limpar branch e confirmar `main` atualizado.
- Não declarar merge concluído sem evidência real do comando/API.

Comandos preferidos, adaptando à stack real:

```bash
git status --short --branch
git fetch origin
git switch -c <tipo>/<slug>
# implementar
git diff --check
# lint/typecheck/test/build
# corrigir e repetir se necessário
git add -A
git commit -m "<conventional commit>"
git push -u origin HEAD

gh pr create --base main --head <branch> --title "<title>" --body-file <arquivo>
gh pr checks <pr-number> --watch
# se checks falharem: corrigir -> commit -> push -> repetir

gh pr merge <pr-number> --merge --delete-branch

git switch main
git pull --ff-only origin main
git branch -D <branch> 2>/dev/null || true
git status --short --branch
```

Não force merge com checks vermelhos. Não use `--admin`/bypass de proteção de branch para contornar CI.


# Revisão final contra PRD + Stitch

CONTEXTO OBRIGATÓRIO
Projeto: Listada Escola. Stack alvo: Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo inicial: Mato Grosso.

DOCUMENTAÇÃO OBRIGATÓRIA
Antes de alterar código, leia docs/product/PRD.md, docs/product/* relevante, docs/architecture/*, docs/security/* e supabase/*.

STITCH MCP — OBRIGATÓRIO
O MCP `stitch` já deve estar configurado no ambiente do Claude Code. Antes de implementar qualquer tela, use o MCP para localizar o design correspondente, inspecionar composição, hierarquia, componentes, textos, responsividade e estados. Reproduza o design no código sem copiar código cegamente.
Configuração esperada no ambiente seguro: `export STITCH_API_KEY="SUA_CHAVE_NOVA"` e `claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp`. Nunca grave a chave no código, Git, documentação, `.env.example` ou bundle.

REGRAS ABSOLUTAS
- PRD governa regra funcional, segurança e escopo. Stitch governa referência visual.
- Mobile-first e desktop refinado.
- Nunca confiar no frontend para autorização.
- RLS + ownership + RBAC + Storage privado são obrigatórios.
- INEP é master data; contribuições entram por submission e passam por moderação.
- Nunca fabricar distância. PostGIS calcula proximidade.
- Não usar Google Maps. Usar MapLibre + provider configurável + OSM/OSM-derived quando aplicável.
- Não implementar checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.
- E-commerce termina em outbound/deep link + tracking. Papelaria termina em WhatsApp + tracking.

PADRÃO DE ENCERRAMENTO
Execute testes relevantes, lint/typecheck/build quando aplicável, revise o diff e atualize documentação. Informe arquivos alterados, testes, problemas e decisões. Não inicie o próximo prompt automaticamente.


---

## INSTRUÇÃO ESPECÍFICA

Objetivo: confrontar toda a implementação com PRD, Stitch mapping, migrations e segurança.

Classificar cada requisito como IMPLEMENTADO, PARCIAL, PENDENTE ou FORA DO MVP.

Verificar: MT/INEP, submissões moderadas, login para contribuição, RLS, Storage, PostGIS, MapLibre, outbound commerce, WhatsApp e analytics comercial.

Procurar qualquer checkout/PIX/cartão/gateway/carrinho próprio introduzido indevidamente e marcar como falha de escopo.

Criar docs/implementation/mvp-gap-analysis.md. Não alterar silenciosamente.
```

