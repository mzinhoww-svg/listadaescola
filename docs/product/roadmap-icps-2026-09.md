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
| **Habilitar `SCHOOL_MANAGER`?** | O papel existe por inteiro no RLS/schema (`school_managers`, `is_school_manager()`, policies em `school_profiles`/`school_images`/Storage) mas **zero superfície de produto** — nenhuma rota, tela, ou gate de app-layer usa o papel além de um admin atribuí-lo a alguém. | Três auditorias anteriores (`docs/security/final-audit.md`, `docs/implementation/stitch-matrix.md`, `docs/implementation/post-mvp-hardening-report.md`) já documentaram isso e recomendaram **não construir a UI sem antes atualizar a PRD** — que já trata a funcionalidade como condicional ("quando a funcionalidade estiver habilitada", PRD §4.3). |

**Decidido em 2026-09-13: SIM, habilitar.** Autorização explícita do
dono do produto — esta linha é o registro dessa decisão, atualizando a
condição da PRD §4.3.

**Atualização, mesmo dia:** ao desenhar este sub-projeto no Tier 4,
encontrei a sessão paralela da Onda 2 já com um backend completo pra
isso aplicado direto no Postgres compartilhado ("Onda 7 -- Escola:
perfil reivindicado", migration `school_claim_and_publish`, ainda sem
arquivo em nenhum branch git no momento em que verifiquei): tabela
`school_claims` (reivindicação "esta escola é minha", com
nome/papel/contato institucional/justificativa, revisada por admin),
`approve_school_claim()`/`reject_school_claim()` (aprovação promove a
`SCHOOL_MANAGER` só se ainda for `USER`, nunca rebaixa papel mais
forte, grava auditoria), `school_manager_publish_list()` (gestor
publica a lista da própria escola direto, sem fila de moderação -- não
estava no escopo que eu tinha desenhado), e gatilhos
`*_protect_admin_columns` que travam `is_verified`/`is_sponsored`/
`approved_by` no nível de coluna (RLS só trava linha) contra qualquer
UPDATE de não-admin -- mais robusto que a disciplina só-na-Server-Action
que eu tinha planejado.

Decisão: não construí o portal de autoatendimento do gestor
(`/minha-escola`) -- reconstruir por cima de um backend mais completo e
já testado seria retrabalho, e um segundo desenho divergente (o meu
partia de atribuição só-pelo-admin, sem reivindicação self-service)
arriscava duas UX incompatíveis pro mesmo papel. Mantive só o que é
complementar e não conflita: em `/admin/escolas/[id]`, uma seção
"Gestores da escola" pra atribuição direta pelo admin (sem passar pela
fila de reivindicação -- útil quando o admin já sabe quem deveria
gerenciar) -- grava na mesma tabela `school_managers` que
`approve_school_claim()` usa, então não há conflito de dado, só duas
portas pro mesmo cômodo. Uma policy que eu ia criar
(`school_contacts_manager_select`) já veio nessa mesma migration deles
-- descartei a minha antes de aplicar (erro `already exists` no
`apply_migration` foi o que revelou a sobreposição).

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
| CTA na home + wizard anônimo até o limite do Storage | Papelaria (sub-projeto 1 de "gerar mais listas reais") | **Feito em 2026-09-13.** A PR #39 (Onda 3, mesma sessão paralela) redesenhou a home no mesmo intervalo -- busca unificada (`HomeSearch`), sem "escolas em destaque", `ListNotificationForm` pra quem prefere esperar. Reconciliado por merge: os dois CTAs coexistem no mesmo card (busca → notificação passiva → contribuir agora), papéis diferentes, nenhuma duplicação. Ver D3 abaixo pra `list_notification_requests`. |

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
| C7 | ~~Backlog P1/P3/P6/P7/P12 da crítica original~~ (empty states sem ação, sem filtro "com lista publicada", rótulo de proximidade errado, telefone como texto puro, menu mobile do header contradizendo o `DESIGN.md`). | Pais | **Feito em 2026-09-13 por outra sessão paralela** (`session_018dpJRsVgtysxT6o6pWqVTY`), PR #36 "Onda 2 completa — os 13 itens do backlog do critique", já mergeado em `claude/eager-galileo-d8hdtc` e trazido pra esta branch via merge. Os 5 itens citados (P1, P3, P6, P7, P12) estão cobertos — conferido lendo o diff, não só a descrição da PR. |

## 4. Sub-projetos arquiteturais — cada um com processo completo próprio

| # | Item | ICP | Observação |
|---|---|---|---|
| D1 | ~~Lista como instrumento de compra~~ (checkbox por item, imprimir, copiar, obrigatório/opcional mais claro) | Papelaria (sub-projeto 2) **= Pais P5** | **Feito** — mesma PR #36 da Onda 2 (P5 "a lista virou instrumento"): checkbox por item com `useSyncExternalStore`+`localStorage`, medidor de progresso em periwinkle, Imprimir, Copiar lista, badge só na exceção. `src/components/lists/list-checklist.tsx`. Confirma a hipótese deste roadmap de que era o mesmo item por duas lentes. |
| D2 | ~~Identidade visual da papelaria~~ (tokens `stationery-*` hoje nunca renderizados) | Papelaria (sub-projeto 3) | **Feito, com escopo honesto.** `stationery-mint` agora colore os badges de Entrega/Retirada (`StoreCard` + perfil da papelaria) -- era o único dos três com sinal real (`stores.offers_delivery/offers_pickup`). `amber` ("item verificado") e `rose` ("economia") continuam sem uso deliberadamente: não existe `stores.is_verified` nem comparação de preço entre ofertas hoje -- um badge ali seria fabricar uma alegação que o produto não sustenta (RN-009), não um detalhe visual esquecido. |
| D3 | ~~Avisar quando uma lista aguardada é publicada~~ · Avisar quando uma avaliação/sugestão é decidida | Pais | **Metade feita, metade ainda aberta.** A sessão da Onda 2 publicou Onda 3/4/5 (PR #39, `feat/onda-4-admin-listas`) enquanto o Tier 2 deste roadmap estava em implementação -- trazido por merge. `list_notification_requests` (migration `20260913020000`) + `ListNotificationForm`/`requestListNotificationAction` cobrem exatamente a primeira metade: e-mail sem conta, capturado quando a busca por nome não encontra lista. Só a captura -- **nenhum envio real ainda** (SMTP não configurado, mesmo bloqueador de `docs/operations/smtp-setup.md`; a tabela existe pra quando houver o que disparar). A segunda metade (avisar sobre decisão de avaliação/sugestão) **continua sem nenhuma infraestrutura** -- não teria pra quem enviar sem conta, então é um problema diferente do primeiro (exige e-mail transacional de verdade, não só captura). |
| D4 | ~~Dashboard mostrar "visitas"~~ (não era falta de card — era ausência arquitetural: não existia tipo de evento de pageview no catálogo de 15) | Administrador | **Feito, com escopo honesto.** 17º evento, `page_view` (migration `20260913051500_page_view_event.sql`, `recordPageView()` em `record-event.ts`), instrumentado nas 7 páginas públicas dinâmicas que não tinham nenhum evento próprio: home, `escolas/[uf]`, `escolas/[uf]/[cidade]`, `listas`, `papelarias`, `papelarias/[uf]/[cidade]`, `papelarias/[uf]/[cidade]/[slug]`. As 7 páginas institucionais estáticas (como-funciona, para-escolas, para-papelarias, parceiros, privacidade, cookies, termos) ficaram deliberadamente de fora -- nenhuma tem `dynamic = "force-dynamic"` hoje, e forçar isso só pra contar visita é custo de performance real sem retorno claro (nenhuma delas tem CTA/decisão de produto que dependa de saber quantas visitas recebe). `EVENT_LABEL` em `/admin/analytics` ganhou os rótulos de `page_view` e do `home_list_request_click` do Tier 2 (faltavam os dois). Sem card dedicado de "visitas" na dashboard -- a tabela genérica "Eventos por tipo" já mostra a contagem automaticamente, e um card "Total de visitas" exigiria somar `page_view` com os eventos de view dedicados (`school_view`/`list_view`) sem dobrar contagem, o que é uma métrica derivada nova, não uma exposição do que já existe (documentado em `docs/architecture/analytics-events.md` §4.17). |

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
