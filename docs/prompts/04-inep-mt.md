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
