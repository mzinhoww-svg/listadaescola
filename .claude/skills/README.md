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
