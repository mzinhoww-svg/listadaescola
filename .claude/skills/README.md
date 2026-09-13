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
