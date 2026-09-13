# Skills locais do projeto

## `impeccable/`

Código de terceiros **vendorizado**, não escrito neste projeto.

- Origem: https://github.com/pbakaus/impeccable — versão 4.3.1
- Autor: Paul Bakaus · Licença: Apache 2.0 (ver `impeccable/LICENSE`)
- Instalado em 2026-09-12 a pedido do responsável pelo projeto.

Está versionado aqui de propósito: o ambiente de execução dos agentes é
efêmero, então sem o commit a skill se perderia a cada sessão e teria de
ser reenviada manualmente.

Fornece 20 comandos de refinamento de interface (`critique`, `audit`,
`polish`, `layout`, `typeset`, `colorize`, `harden`, `document`, ...) para
a Onda 1 do roadmap — refinamento visual das telas do Stitch.

O princípio dela é compatível com a regra permanente deste projeto de
preservar trabalho existente: *"Refinement preserves; redesign replaces.
Refinement keeps the incumbent identity, behavior, copy, and everything
outside scope."*

Ela espera `PRODUCT.md` e `DESIGN.md` na raiz do projeto — nenhum dos dois
existe ainda; os comandos `init` e `document` os geram.

Para remover: `git rm -r .claude/skills/impeccable`.

## `seo-audit/`

Código de terceiros **vendorizado**, não escrito neste projeto.

- Origem: https://github.com/coreyhaines31/marketingskills (pasta `skills/seo-audit`)
- Autor: Corey Haines · Licença: MIT (ver LICENSE do repositório de origem)
- Instalado em 2026-09-13 a pedido do responsável pelo projeto, via
  `npx skills add https://github.com/coreyhaines31/marketingskills --skill seo-audit`.

Está versionado aqui pelo mesmo motivo do `impeccable/`: o ambiente de
execução dos agentes é efêmero, então sem o commit a skill se perderia a
cada sessão.

Fornece um framework de auditoria de SEO (crawlability/indexação, Core Web
Vitals, on-page, E-E-A-T, hreflang/i18n). Conteúdo é só Markdown/JSON —
sem scripts, sem chamadas de rede embutidas, sem pedido de credenciais.
Revisado antes da instalação (ver PR).

O conteúdo real fica em `.agents/skills/seo-audit/` (formato universal do
instalador, usado por várias ferramentas de agente); `.claude/skills/seo-audit`
é um symlink para lá. `skills-lock.json` na raiz do projeto rastreia a
origem e o hash do conteúdo instalado.

Para remover: apagar a entrada `seo-audit` de `skills-lock.json` e rodar
`git rm -r .agents/skills/seo-audit .claude/skills/seo-audit`.

## `moneyprinterturbo-video/`

Código de terceiros **vendorizado**, não escrito neste projeto.

- Origem: https://github.com/harry0703/MoneyPrinterTurbo (pasta `docs/skill`)
- Autor: harry0703 · Licença: MIT (ver LICENSE do repositório de origem)
- Instalado em 2026-09-13 a pedido do responsável pelo projeto, via
  `npx skills add https://github.com/harry0703/MoneyPrinterTurbo --skill moneyprinterturbo-video`.

Está versionado aqui pelo mesmo motivo dos demais: o ambiente de execução
dos agentes é efêmero, então sem o commit a skill se perderia a cada sessão.

Gera vídeos curtos (roteiro + TTS + footage de estoque + legendas + música)
via o projeto MoneyPrinterTurbo. Dois arquivos: `SKILL.md` (instruções) e
`mpt_agent.py` (instalador/orquestrador Python, ~28KB). Revisado
integralmente, linha a linha, antes da instalação — resumo:

- Nenhum código malicioso, ofuscado ou backdoor encontrado. Sem
  exfiltração: a única chamada de rede que carrega uma credencial é a
  validação da chave Pexels contra a própria API oficial da Pexels.
  Proteção ativa contra zip-slip na extração do projeto baixado. Sem
  `shell=True`/injeção de comando (argumentos passados como lista ao
  `subprocess`).
- **Ponto de atenção real:** o `SKILL.md` instrui o agente a **não pedir
  confirmação antes de instalar software de terceiros ou rodar comandos
  longos** — só pausa para credenciais ausentes ou confirmação explícita de
  cobrança (Seedance/OFox/Metaso MiniMax, pagos por clipe). É proposital
  (reduzir fricção), mas significa que, quando esta skill for de fato
  invocada, o agente vai instalar o `uv` (via `curl | sh`) e baixar/rodar o
  projeto MoneyPrinterTurbo completo (branch `main` do upstream, não fixado
  em commit) sem outra pausa de confirmação. Provável motivo do selo "High
  Risk" (avaliação "Gen") reportado pelo instalador `npx skills add` — ao
  lado de 2 alertas do Socket, consistentes com as capacidades esperadas de
  um instalador (acesso a rede e a subprocess), não com achado de código
  malicioso.
- Requer chaves de API reais para funcionar (LLM + Pexels no mínimo);
  provedores pagos por clipe exigem flag de confirmação explícita antes de
  cobrar — nunca adicionada silenciosamente pelo script.
- Escopo: só gera vídeo quando explicitamente invocada numa conversa futura
  (ex.: vídeo promocional da Listada Escola); não roda nada automaticamente
  e não interage com o restante deste repositório/produto.

Para remover: apagar a entrada `moneyprinterturbo-video` de
`skills-lock.json` e rodar `git rm -r .agents/skills/moneyprinterturbo-video
.claude/skills/moneyprinterturbo-video`.
