# README

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


# Listada Escola — Prompts Claude Code + Stitch MCP

Execute um arquivo por vez, em ordem numérica.

## MCP Stitch

O MCP deve estar configurado no ambiente do Claude Code. Use uma variável segura, nunca a chave diretamente no repositório:

```bash
export STITCH_API_KEY='SUA_CHAVE_NOVA'
claude mcp add stitch --transport http --header "X-Goog-Api-Key: ${STITCH_API_KEY}" https://stitch.googleapis.com/mcp
```

A chave anteriormente compartilhada deve ser revogada/rotacionada.

## Regra do projeto

O Stitch é referência visual. O PRD é autoridade funcional, de segurança e de escopo.

O MVP NÃO tem checkout, PIX, cartão, boleto, gateway, payment intent, carrinho próprio ou processamento de pagamento.

E-commerce: redirecionamento para parceiro + tracking.
Papelaria: mensagem WhatsApp pré-preenchida + tracking.

Mapa: MapLibre + provider configurável + OSM/OSM-derived quando apropriado. PostGIS calcula proximidade. Não usar Google Maps.
```
