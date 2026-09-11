# Listada Escola

Plataforma de descoberta de escolas e listas escolares. Stack alvo:
Next.js + TypeScript + Supabase/PostgreSQL/PostGIS + Vercel. Escopo
inicial: Mato Grosso (MT).

## Leia primeiro

1. `docs/product/PRD.md` — autoridade de produto, segurança e escopo.
2. `docs/architecture/*` e `docs/security/*` — arquitetura, modelo de
   dados, RLS.
3. `docs/development/automation-contract.md` — regras permanentes de
   Git/PR/CI/merge (resumidas abaixo).
4. `docs/development/WORKFLOW.md` — estado real/atual do fluxo (branch,
   ferramentas disponíveis, limitações conhecidas). Consulte antes de
   assumir que algo (CI, branch protection, Stitch) já está configurado.
5. `docs/prompts/` — pacote de prompts numerados (00–20) que definem o
   roteiro de implementação, um de cada vez, em ordem.

## Regras absolutas (não negociáveis, valem para toda tarefa)

- PRD governa regra funcional, segurança e escopo. Stitch (quando
  disponível) governa referência visual — nunca o contrário.
- Mobile-first, desktop refinado.
- Nunca confiar no frontend para autorização. RLS + ownership + RBAC +
  Storage privado são obrigatórios em toda tabela/endpoint novo.
- INEP é master data. Usuário comum não edita escola INEP diretamente;
  contribuições entram por `list_submissions`/sugestão e passam por
  moderação antes de virar conteúdo público.
- Nunca fabricar distância. PostGIS calcula proximidade; sem
  lat/long, fallback por CEP/município.
- Não usar Google Maps. MapLibre + provider configurável + OSM/OSM-derived.
- **Proibido implementar checkout, PIX, cartão, boleto, gateway, payment
  intent, carrinho próprio ou processamento de pagamento**, salvo
  instrução posterior explícita. E-commerce termina em outbound/deep
  link + tracking. Papelaria termina em WhatsApp + tracking.
- Antes de alterar qualquer arquivo: entender o conteúdo atual e as
  dependências, preservar trabalho existente, evitar reescrita/duplicação
  desnecessária. Antes de qualquer migration: checar migrations
  existentes, nunca editar uma já aplicada em produção.

## Fluxo Git/PR/CI (resumo — ver automation-contract.md para completo)

Nunca editar o branch padrão diretamente para mudanças não triviais →
branch de trabalho → implementar → testar → corrigir → revisar diff →
commit → push → abrir PR → solicitar auto-merge nativo do GitHub
(`mcp__github__enable_pr_auto_merge`). Se houver required status check
pendente, o GitHub mergeia sozinho quando ele passar. Se a chamada
retornar "already in clean status" (nada pendente), o agente confirma via
API (status combinado `success`, `mergeable_state` `clean`, sem review
pendente) e então chama `mcp__github__merge_pull_request`
(`merge_method: "squash"`) diretamente, sem perguntar a cada PR —
autorização explícita do usuário em 2026-09-11, ver
`docs/development/automation-contract.md` ("Regra de merge") e
`docs/development/WORKFLOW.md` ("Merge direto autorizado") para as
condições completas e o histórico. Continuam absolutas: nunca declarar
merge concluído sem confirmação real da API (`merged: true`), nunca usar
`--no-verify` ou bypass de proteção de branch, nunca merge com CI
vermelho ou conflito não resolvido.

Este ambiente não tem `gh` nem `supabase` CLI — use as ferramentas MCP
(`mcp__github__*`, `mcp__Supabase__*`). Branch padrão atual é
`claude/eager-galileo-d8hdtc` (não existe `main` ainda — ver WORKFLOW.md).
O usuário configurou manualmente um ruleset no branch padrão exigindo o
check `Vercel` antes de merge (reportado pelo usuário; nenhuma ferramenta
MCP disponível permite ler/configurar branch protection diretamente para
confirmar via API — ver WORKFLOW.md).

## Stitch MCP

Trate como indisponível até que apareça de fato na lista de
ferramentas/MCP de uma sessão (não assuma que está configurado só porque
um prompt diz que deveria estar). Nunca peça, aceite ou grave uma
`STITCH_API_KEY` em código, Git, documentação, `.env.example`, bundle ou
logs — configuração de MCP com segredo é feita a nível de ambiente, nunca
colada em uma mensagem de tarefa. Qualquer chave que já tenha aparecido em
texto puro numa conversa deve ser tratada como comprometida e nunca
reutilizada.
