# Roadmap de melhorias por ICP — setembro de 2026

Consolida o brainstorming (skills `brainstorming` + `grilling` +
`ui-ux-pro-max`) feito em 2026-09-13 sobre os quatro perfis de usuário do
produto: papelaria, pais, escolas, administrador. Não substitui a PRD —
é um plano de execução em cima dela, com o que já foi decidido e o que
ainda depende de uma decisão do dono do produto.

Documentos-fonte desta consolidação:

- [`docs/superpowers/specs/2026-09-13-cta-home-rascunho-anonimo-design.md`](../superpowers/specs/2026-09-13-cta-home-rascunho-anonimo-design.md) — spec completa, sub-projeto papelaria #1.
- [`docs/architecture/analytics-events.md`](../architecture/analytics-events.md) — catálogo dos 15 eventos existentes.
- [`docs/implementation/impeccable-critique.md`](../implementation/impeccable-critique.md) — auditoria de UX (Onda 1.2), backlog P1-P13.
- Pesquisa desta sessão para pais/escolas/administrador: sem documento próprio ainda — as citações de código abaixo vêm direto dessa pesquisa (arquivo:linha conferido, não é uma alegação nova sem lastro).

## Como ler a classificação

Mesma régua da skill `brainstorming`: **Spike** (pergunta de viabilidade,
sem código que fica), **Bounded** (mudança em fluxo que já existe, cabe
num design de algumas frases, sem spec formal), **Arquitetural** (novo
subsistema, ou mexe em como componentes se relacionam — precisa do
processo completo: perguntas → abordagens → design → spec própria).

## 0. Decisão de produto — bloqueia antes de agendar

| Item | O que é | Por quê está aqui, não numa fila |
|---|---|---|
| **Habilitar `SCHOOL_MANAGER`?** | O papel existe por inteiro no RLS/schema (`school_managers`, `is_school_manager()`, policies em `school_profiles`/`school_images`/Storage) mas **zero superfície de produto** — nenhuma rota, tela, ou gate de app-layer usa o papel além de um admin atribuí-lo a alguém. | Três auditorias anteriores (`docs/security/final-audit.md`, `docs/implementation/stitch-matrix.md`, `docs/implementation/post-mvp-hardening-report.md`) já documentaram isso e recomendaram **não construir a UI sem antes atualizar a PRD** — que já trata a funcionalidade como condicional ("quando a funcionalidade estiver habilitada", PRD §4.3). Construir um portal da escola agora seria decidir escopo de produto por conta própria, o que as regras absolutas deste projeto proíbem. |

**Se a resposta for sim**, isso vira um sub-projeto Arquitetural de porte
comparável ao papelaria #1 (login/claim de uma escola real, o que um
gestor pode editar vs. o que continua INEP-only, como provar que a
pessoa realmente representa a escola) — processo completo, spec própria,
só depois de uma resposta explícita aqui.
**Se a resposta for não** (ou "ainda não"), o item sai do roadmap ativo
e fica só registrado aqui.

## 1. Bugs reais — corrigir antes de qualquer melhoria nova

Não são "approach a discutir": são defeitos already-shipped afetando
usuário hoje. Bounded, sem ambiguidade de design.

| # | Item | ICP | Evidência |
|---|---|---|---|
| B1 | Avaliação rejeitada é beco sem saída **permanente** — `unique(school_id, profile_id)` em `reviews` + RLS que só permite `UPDATE` enquanto `PENDING` significa que o usuário nunca mais pode avaliar aquela escola. A tabela nem tem coluna de motivo de rejeição. | Pais | `reviews/queries.ts:44-48` (comentário do próprio código reconhece o problema, cita "gap doc" que não existe de fato); `community.sql:12-23,22` |
| B2 | Favorito cujo alvo (escola/lista) foi despublicado some silenciosamente da lista — contagem parece certa, item some sem explicação. | Pais | `favorites/queries.ts:95-108` (`getFavoriteLists`) |
| B3 | `/admin/catalogo` e `/admin/ecommerce`: erros crus do Postgres sem tradução (mesma classe de bug já corrigida em vendas/campanhas/ranking no Batch 6, só que nestes dois arquivos específicos ficou de fora). | Administrador | `catalog-actions.ts:34,65`, `ecommerce-actions.ts:38` — nenhum importa `translateAdminDbError` |
| B4 | Checkboxes "Ativo/Ativa" em `ecommerce-partner-form-drawer.tsx`, `ecommerce-product-form-drawer.tsx`, `store-form-drawer.tsx` sem `accent-primary-600` nem anel de foco — inconsistente com `school-edit-form.tsx`, já corrigido lá. | Administrador | linhas 53/95/57·61·65 respectivamente |
| B5 | Menu mobile do admin shell sem backdrop, sem focus trap, sem Escape — mesma classe do P0 já corrigido no shell (overflow), só que este aspecto específico ficou de fora. | Administrador | `admin-shell.tsx:94-101` |

## 2. Sub-projeto já speced — pronto para implementar

| Item | ICP | Status |
|---|---|---|
| CTA na home + wizard anônimo até o limite do Storage | Papelaria (sub-projeto 1 de "gerar mais listas reais") | **Spec aprovada**, aguardando início da Fase 1 (ver plano de implementação já apresentado) |

## 3. Lacunas de padrão repetido — Bounded, esforço baixo/médio

Mesma forma de solução se repete em lugares diferentes — vale
resolver como um grupo, não um de cada vez isolado.

| # | Item | ICP | Evidência |
|---|---|---|---|
| C1 | "Minhas avaliações" não existe como página central — só dá pra ver o status de uma avaliação revisitando a escola. | Pais | Nav em `minha-conta/layout.tsx:5-11` não tem essa entrada |
| C2 | "Minhas sugestões" não existe — mesma falta de C1, mas para `/sugerir-escola`: quem sugere uma escola nunca sabe se foi aceita, rejeitada, ou nem vista. | Pais | Só existe o lado admin (`lib/admin/school-suggestions.ts`); nenhum `getOwnSuggestions()` |
| C3 | Páginas de salvos (`escolas-salvas`/`listas-salvas`) não reaproveitam `SchoolCard`/`SaveButton` e não têm como desfavoritar ali mesmo. | Pais | Cards montados à mão nas duas páginas |
| C4 | `/admin/vendas`: sem ação de excluir um relatório errado (só editar); cap de 200 linhas sem indicador de truncamento. | Administrador | `sales-actions.ts` só exporta os 2 upserts; `sales.ts:34,73,97` |
| C5 | `audit_logs` é gravado em 32 pontos (9 migrations) e nunca lido por nenhuma tela admin — write-only. | Administrador | `grep audit_logs` em `src/` só bate no arquivo de tipos gerado |
| C6 | Admin não vê o próprio nome/papel em lugar nenhum da shell, apesar de poder promover outros a Admin/Super Admin. | Administrador | `admin-shell.tsx` recebe só `children`; `layout.tsx:34` |
| C7 | Backlog P1/P3/P6/P7/P12 da crítica original (empty states sem ação, sem filtro "com lista publicada", rótulo de proximidade errado, telefone como texto puro, menu mobile do header contradizendo o `DESIGN.md`) — ainda todos abertos, reconfirmados nesta pesquisa. | Pais | `docs/implementation/impeccable-critique.md` §9, itens reconferidos contra o código atual desta sessão |

## 4. Sub-projetos arquiteturais — cada um com processo completo próprio

| # | Item | ICP | Observação |
|---|---|---|---|
| D1 | Lista como instrumento de compra (checkbox por item, imprimir, copiar, obrigatório/opcional mais claro) | Papelaria (sub-projeto 2) **= Pais P5** | **É o mesmo item por duas lentes diferentes** — `listas/[slug]/page.tsx` é a tela central tanto de "virar a lista útil pra comprar" quanto do backlog de pais. Fazer uma vez, não duas. |
| D2 | Identidade visual da papelaria (tokens `stationery-*` hoje nunca renderizados) | Papelaria (sub-projeto 3) | Mais leve que D1/D3 — pode entrar como Bounded se o escopo ficar restrito a estilo de componentes existentes, sem tela nova |
| D3 | Notificações (avisar quando uma lista aguardada é publicada, quando uma avaliação/sugestão é decidida) | Pais | **Não existe nenhuma infraestrutura hoje** — nem stub, nem provedor de e-mail integrado para isso. É o item de maior esforço da lista: exige decidir canal (e-mail? push?), gatilhos, preferências, e provavelmente resolve C1/C2 "de graça" se bem desenhado (a notificação IS a resposta a "e agora, o que houve com minha avaliação/sugestão?") |
| D4 | Dashboard mostrar "visitas" | Administrador | Não é falta de card — é ausência arquitetural: não existe tipo de evento de pageview no catálogo de 15. Instrumentar isso tocaria toda página pública, não só o admin. |

## Ordem recomendada

Raciocínio: bugs reais primeiro (têm usuário sofrendo agora, custo
baixo, zero ambiguidade) → o que já está pronto pra sair do papel →
lacunas repetidas de baixo esforço → arquiteturais, com D1 subindo de
prioridade por já valer por dois ICPs ao mesmo tempo.

1. **Tier 0** — decisão SCHOOL_MANAGER (não bloqueia o resto, mas quanto antes souber, antes esse item sai ou entra do roadmap de verdade)
2. **Tier 1** — B1-B5 (bugs)
3. **Tier 2** — CTA home + rascunho anônimo, Fase 1-7 (já speced)
4. **Tier 3** — C1-C7, agrupados (C1+C2 juntos por serem a mesma forma; C4-C6 juntos por serem todos admin/vendas-adjacentes; C7 é continuação de trabalho já em andamento)
5. **Tier 4** — D1 (papelaria #2 = pais P5) → D2 (papelaria #3) → D3 (notificações) → D4 (visitas), nessa ordem por alavancagem decrescente e por D3/D4 precisarem de mais decisões próprias antes de desenhar

## Próximos passos

Este documento é o mapa — nenhum item aqui está implementado só por
estar listado. Meu plano é seguir a ordem acima, mas cada item do Tier
3 em diante ainda passa pelo mesmo processo que o papelaria #1 passou
antes de eu tocar em código (bounded: pergunta + design curto no chat;
arquitetural: brainstorm → grilling → design → spec). Tier 0 e Tier 1
não esperam nada disso — são decisão e bugs, respectivamente.
