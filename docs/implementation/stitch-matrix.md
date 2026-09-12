# Matriz Stitch × PRD × implementação — Listada Escola

Confronto tela a tela entre o **export oficial do Stitch** (design system
"Caderno Vivo" + 25 telas em 4 fluxos) e o que existe hoje em `src/app/**`.
Cada linha foi verificada por leitura direta do `code.html` da tela e do
arquivo de rota correspondente — nenhuma linha foi preenchida por nome de
pasta ou suposição.

## 0. O export

- 32 pastas; **`code.html` é o conteúdo real de cada tela**. 22 dos 32
  `screen.png` são páginas HTML embrulhadas, não imagens — ignorados.
- `caderno_vivo/DESIGN.md` é o design system verdadeiro.
- O `design.md` da raiz descreve **outro produto** (salários por empresa).
  Errado, ignorado, nunca citado aqui.
- `mapa_de_navega_o_.../screen.png` é imagem real e é a fonte da estrutura
  de fluxos abaixo. Ressalva de contagem: o cabeçalho do Fluxo 1 diz "11
  Telas Integradas" (a legenda conta `01→09, 12, 13`), mas o painel do
  Fluxo 1 exibe **14 cards** — as telas 14, 19 e 21 aparecem na FASE C do
  Fluxo 1 e, ao mesmo tempo, são coloridas como "Operação Balcão" na
  legenda. Os quatro painéis somam 14 + 5 + 4 + 2 = **25 telas**, que é o
  número declarado no topo do mapa ("25 Telas Mapeadas").

| Fluxo | Telas |
|---|---|
| 1 — Jornada do Aluno & Família (mobile, 390px) | 01, 02, 03 (+03.1), 04, 05 / 06, 07, 08, 09 / 14, 19, 21, 12, 13 |
| 2 — Portal da Papelaria & Lojista (desktop, 1440px) | 10, 11, 16, 17, 18 |
| 3 — Balcão, Acesso & Suporte | 15, 20, 24, 25 |
| 4 — Portal da Escola (desktop, 1440px) | 22, 23 |

## 1. A regra de classificação

O Listada Escola **é um marketplace**: conecta famílias, escolas, listas,
materiais, papelarias e parceiros de e-commerce. O que o PRD proíbe de
forma absoluta é **checkout/pagamento próprio** — PIX, cartão, boleto,
gateway, payment intent, carrinho transacional próprio. E-commerce termina
em outbound + tracking; papelaria termina em WhatsApp + tracking.

**"Sem checkout próprio" não é "não é marketplace". "ROADMAP" não é
"apagar o conceito".** Nenhuma tela aqui é marcada como "nunca
implementar" — isso corrige explicitamente a coluna "Prioridade" de
`docs/implementation/stitch-final-gap.md` §3, que usou esse rótulo.

| Classificação | Significado |
|---|---|
| **MVP** | No escopo agora; deveria existir hoje. |
| **MVP ADAPTADO** | O conceito pertence ao MVP, em forma livre de pagamento (ex.: comparador vira "papelarias próximas → disponibilidade → orçamento por WhatsApp"; "cesta" vira checklist sem checkout). |
| **ROADMAP** | Visão futura legítima, corretamente não construída agora (exige checkout/pagamento/fulfillment próprio). O conceito e a arquitetura devem ser preservados. |

**Fidelidade** compara a implementação com a tela do Stitch *já restrita
ao que a classificação permite* — ou seja, para MVP ADAPTADO a comparação
é contra a versão sem pagamento, não contra o desenho transacional
completo. `MATCH` / `MINOR` / `SIGNIFICANT` / `MISSING` / `N/A` (N/A = tela
ROADMAP que corretamente não existe).

Fidelidade aqui é **estrutural/funcional**. A divergência visual é total e
vale para 100% das telas (Caderno Vivo nunca foi implementado: `#445371`
+ Plus Jakarta Sans vs. Tailwind `blue-600` + Geist) — já medida em
`docs/implementation/stitch-final-gap.md` §1 e não repetida linha a linha.

## 2. Matriz principal

| Tela Stitch | Fluxo/Domínio | Classificação | Rota atual | Existe no código? | Fidelidade | Ação recomendada |
|---|---|---|---|---|---|---|
| **01** Home / Landing | F1-A Descoberta | MVP | `/` | SIM | MINOR | Hero + busca + "escolas em destaque" + CTA "Enviar lista" existem (`src/app/(public)/page.tsx`). Faltam o explicador de passos na home (hoje só em `/como-funciona`) e o reforço "você não precisa criar conta para pesquisar". |
| **02** Busca & Localização | F1-A | MVP | `/` (`HomeLocationSearch` → `LocationInput`); banner em `/escolas` | SIM (embutido) | MINOR | CEP, cidade e geolocalização os três existem (`src/components/location/location-input.tsx`). Stitch desenha tela cheia com mapa de cobertura; forma embutida é equivalente. Sem ação obrigatória. |
| **03** Resultados de Escolas | F1-A | MVP | `/escolas` | SIM | MINOR | `ResultsFilters` + `ResultsMap` + `PaginationControls`; card já traz patrocinada/verificada/nota/km/nº de listas (`src/components/schools/school-card.tsx`). Falta o sinal "N papelarias próximas" do card Stitch (§4.2). |
| **03.1** Filtros (bottom sheet) | F1-A | MVP | `/escolas` (`ResultsFilters`) | SIM (parcial) | SIGNIFICANT | Hoje 4 `<Select>` inline (tipo, etapa, avaliação mínima, ordenação). Faltam raio de distância, multi-seleção de etapas, "apenas com listas ativas" e "com papelarias parceiras". O primitivo `src/components/ui/bottom-sheet.tsx` já existe e não é usado aqui. |
| **04** Perfil da Escola | F1-A | MVP | `/escolas/[uf]/[cidade]/[slug]` | SIM | SIGNIFICANT | Sobre, Contato, Etapas, Séries e listas, Fotos, Avaliações estão todos lá. **Zero menção a papelaria no arquivo** (`grep -ci papelaria` = 0) — o bloco "Papelarias que atendem esta escola" do Stitch não existe (§4.2). |
| **05** Lista de Material | F1-A | MVP | `/listas/[slug]` | SIM | SIGNIFICANT | Itens + "Comprar online" + "Comprar local" existem, mas as duas saídas comerciais ficam no rodapé (linhas 172–206 de `src/app/(public)/listas/[slug]/page.tsx`). Faltam agrupamento por categoria, checklist "já tenho em casa" e exportar/compartilhar PDF. |
| **06** Comparador de Preços | F1-B | **MVP ADAPTADO** | `/listas/[slug]` → modal `NearbyStoresSheet` | SIM (forma reduzida) | SIGNIFICANT | Versão sem pagamento = "papelarias próximas → disponibilidade → orçamento no WhatsApp". Hoje é um botão que abre bottom sheet com cards + WhatsApp. Promover a etapa própria e nomeada; preço/estoque por loja não existe no schema (§4.4). |
| **07** Checkout da Cesta | F1-B | ROADMAP | — | NÃO (correto) | N/A | Preservar o conceito de "cesta" como **resumo/checklist de orçamento**, não como carrinho. Nenhum checkout próprio. |
| **08** Confirmação & PIX | F1-B | ROADMAP | — | NÃO (correto) | N/A | Pagamento próprio. Manter fora; não apagar do roteiro de produto. |
| **09** Rastreamento do Pedido | F1-B | ROADMAP | — | NÃO (correto) | N/A | Depende de pedido e fulfillment próprios. |
| **14** Envio de Lista (Foto/PDF) | F1-C | **MVP ADAPTADO** | `/enviar-lista`, `/enviar-lista/[id]/{itens,anexo,revisao,confirmacao}` | SIM (forma estruturada) | SIGNIFICANT | RF-007 implementado como wizard item a item; foto/PDF existe mas como **anexo de apoio à moderação** (`attachment-uploader.tsx`, PDF/JPG/PNG ≤10MB), não como entrada primária. Transcrição por IA + cotação em 2h = ROADMAP. |
| **19** Cotação Concluída | F1-C | ROADMAP | — | NÃO | N/A | Exige motor de cotação e OCR. `/enviar-lista/[id]/confirmacao` cobre "lista enviada para moderação", que é outro momento — não confundir os dois. |
| **21** Avaliação & Feedback | F1-C | **MVP ADAPTADO** | `/escolas/[uf]/[cidade]/[slug]` (`ReviewForm`) + `/admin/moderacao/avaliacoes` | SIM (escopo escola) | SIGNIFICANT | RF-014 completo, mas avalia **escola**. Avaliar a papelaria pós-retirada exige o conceito de pedido → ROADMAP. Cashback por foto: nunca no MVP. |
| **12** Minhas Cestas & Pedidos | F1-C | **MVP ADAPTADO** | `/minha-conta/listas`, `/minha-conta/listas-salvas`, `/minha-conta/escolas-salvas` | SIM (metade sem pedido) | SIGNIFICANT | A metade "minhas listas salvas + histórico de contribuições" existe; a metade "pedidos/PIX/reutilizar cesta" é ROADMAP. **`/minha-conta/listas-salvas` é órfã**: zero links no app (§4.6). |
| **13** Perfil & Dependentes | F1-C | **MVP ADAPTADO** | `/minha-conta/perfil` | SIM (sem dependentes) | SIGNIFICANT | Perfil hoje é nome + e-mail (`profile-form.tsx`). "Aluno/dependente" não existe como entidade no PRD nem no schema — é decisão de produto, não bug. |
| **10** Dashboard de Pedidos | F2 Papelaria | ROADMAP | — | NÃO | N/A | A tela desenhada é fila de pedidos/PIX/picking. Resíduo MVP ADAPTADO a preservar: o **shell "Portal do Lojista"** (a loja edita seu próprio perfil, horários, serviços e WhatsApp) — ver §5. |
| **11** Esteira de Picking & Bipagem | F2 | ROADMAP | — | NÃO (correto) | N/A | Operação física de separação com leitor de código de barras. |
| **16** Catálogo & Precificação | F2 | **MVP ADAPTADO** | — | NÃO | MISSING | "Esta papelaria atende esta lista e tem N dos M itens" é **informação, não pagamento**, e é o dado que falta para o marketplace (§4.4). Não existe tabela de produto/preço por papelaria. Margem, custo e sync com ERP Bling = ROADMAP. |
| **17** Convênios & Cashback | F2 | ROADMAP | — | NÃO (correto) | N/A | Cashback é carteira/movimentação financeira — adjacente a pagamento. |
| **18** Financeiro & Repasses | F2 | ROADMAP | — | NÃO (correto) | N/A | Conciliação, retenção e antecipação PIX. |
| **15** Scanner & Validador de Balcão | F3 Balcão | ROADMAP | — | NÃO (correto) | N/A | Valida um "Passe Rápido" de um pedido que não existe no MVP. |
| **20** Central de Notificações | F3 | ROADMAP | — | NÃO | N/A | Como desenhada (status de pedido, cashback, automação Z-API) é ROADMAP — o PRD §18 exclui automação WhatsApp Business API. Resíduo a preservar: avisar o autor quando a lista é aprovada / precisa de correção (hoje só vendo `/minha-conta/listas`). |
| **24** Onboarding & Autenticação multi-perfil | F3 | **MVP ADAPTADO** | `/auth/entrar`, `/auth/criar-conta` (+ 3 rotas de senha/verificação) | SIM (perfil único) | SIGNIFICANT | `login-form.tsx` é e-mail + senha, sem qualquer diferenciação de perfil. O seletor Família / Papelaria / Escola não custa pagamento e corresponde 1:1 aos papéis que já existem no RBAC (§5). OTP por WhatsApp, Google e Apple ID estão fora do PRD. |
| **25** Suporte & FAQ | F3 | **MVP ADAPTADO** | — | NÃO | MISSING | Não existe `/ajuda` nem `/suporte`; `grep` por FAQ/Suporte em `src/app` = 0. **Não está no sitemap do PRD (§6.1)** — portanto é proposta, não defeito. O conteúdo do FAQ do Stitch fala de cashback/Box/Passe Rápido, que são ROADMAP; o FAQ em si não. |
| **22** Portal da Escola — Cadastro & Homologação | F4 Escola | **MVP ADAPTADO** | equivalente admin-only: `/admin/listas`, `/admin/moderacao`, `/admin/moderacao/[id]` | PARCIAL (só admin) | SIGNIFICANT | A capacidade existe, mas só para ADMIN/SUPER_ADMIN. A coordenação da escola não tem tela nenhuma, apesar da RLS de `SCHOOL_MANAGER` estar completa (§5). |
| **23** Portal da Escola — Métricas de Adoção & Fundo APM | F4 | **MVP ADAPTADO** | equivalente admin-only: `/admin/analytics` | PARCIAL (só admin) | SIGNIFICANT | Taxa de adoção, economia às famílias e reúso são métricas sem pagamento e derivam de `analytics_events`, que já existe. **Fundo APM / repasse é ROADMAP** e deve ser separado do resto da tela. |

## 3. Resumo por fluxo

26 linhas = 25 telas + a sub-tela 03.1 (o próprio mapa a trata como
"Bottom Sheet 03.1" dentro da tela 03).

| Fluxo | MVP | MVP ADAPTADO | ROADMAP | Total |
|---|---|---|---|---|
| 1 — Aluno & Família | 6 (01, 02, 03, 03.1, 04, 05) | 5 (06, 14, 21, 12, 13) | 4 (07, 08, 09, 19) | 15 |
| 2 — Papelaria & Lojista | 0 | 1 (16) | 4 (10, 11, 17, 18) | 5 |
| 3 — Balcão, Acesso & Suporte | 0 | 2 (24, 25) | 2 (15, 20) | 4 |
| 4 — Portal da Escola | 0 | 2 (22, 23) | 0 | 2 |
| **Total** | **6** | **10** | **10** | **26** |

Leitura: **16 das 26 telas (62%) são MVP ou MVP ADAPTADO** — ou seja, a
maior parte do Stitch *não* depende de checkout. A decisão histórica de
tratar o Stitch como "quase tudo fora do MVP" era conservadora demais: o
que está fora é o **motor de pagamento e fulfillment**, não o marketplace.

Cobertura real hoje: 52 `page.tsx` + 4 `route.ts` em `src/app`
(`find src/app -name page.tsx` / `-name route.ts`). As 6 telas MVP todas
existem; das 10 MVP ADAPTADO, 6 existem em forma reduzida, 2 existem só
como equivalente admin-only (22, 23) e 2 não existem (16, 25).

## 4. O que o Stitch revela que o MVP não expressa hoje

Nada nesta seção exige checkout. São lacunas de **como a jornada de
marketplace é apresentada**, todas verificadas no código.

**4.1 "Onde comprar" não é uma etapa — é um rodapé condicional.**
Em `src/app/(public)/listas/[slug]/page.tsx` a página renderiza o cabeçalho,
"Itens da lista" (linha 142) e só depois duas seções: "Comprar online"
(linha 174, **envolvida em `{itemsWithOffers.length > 0 && ...}`** na linha
172 — some inteira se nenhum item tiver oferta mapeada) e "Comprar local"
(linha 201), que é um botão abrindo um modal. No Stitch, "Comparar cotações
em 3 papelarias locais" é CTA fixo no **topo** da tela 05, logo abaixo do
resumo, e leva a uma tela própria (06). Hoje, numa lista de 18 itens no
celular, a saída comercial está depois de 18 cards.

**4.2 O perfil da escola nunca menciona papelarias.**
`grep -ci papelaria src/app/(public)/escolas/[uf]/[cidade]/[slug]/page.tsx`
retorna **0**. E `NearbyStoresSheet` é importado em **exatamente um** arquivo
do app inteiro (`listas/[slug]/page.tsx:15`). No Stitch, a tela 04 tem o
bloco "Papelarias que atendem o Colégio Modelo" e os cards da tela 03 dizem
"9 papelarias próximas com orçamentos instantâneos". Consequência prática: o
visitante só descobre que o produto tem lado-loja se abrir uma lista
específica e rolar até o fim dela.

**4.3 `/papelarias` é um diretório desconectado da jornada.**
`/papelarias`, `/papelarias/[uf]/[cidade]` e `/papelarias/[uf]/[cidade]/[slug]`
existem e funcionam (WhatsApp, mapa, serviços, contato). Mas: nenhuma página
de escola ou de lista linka para elas, e nenhuma página de papelaria linka de
volta para as escolas/listas que ela atende. Os dois lados do marketplace
existem e não se referenciam.

**4.4 Não existe nenhum sinal de disponibilidade local.**
As tabelas de loja são `stores`, `store_contacts`, `store_services`,
`store_managers`, `store_sale_reports` — **nenhuma coluna de produto, preço
ou estoque** (`supabase/migrations/20260910200300_stores.sql`). Preço só
existe como `products.price_hint` e no catálogo de e-commerce
(`20260910200400_catalog_commerce.sql:36`). Dizer "esta papelaria tem 14 dos
18 itens desta lista" é informação, não checkout, e é exatamente o dado que
separa "diretório de listas" de "marketplace" na percepção do usuário. Hoje
o comparador (tela 06) não tem como existir nem na versão sem pagamento
porque o dado não está modelado.

**4.5 A lista é estática; o Stitch trata o reúso como bandeira do produto.**
O "já tenho em casa" aparece nas telas 05, 19 e 25, e a tela 23 chega a medir
"Reúso & Consciência: 34,2% — mais de 1.840 itens reaproveitados". Em
`/listas/[slug]` a lista é somente-leitura, sem marcação por item nem
acumulação de economia. É funcionalidade nova (o PRD RF-006 só exige exibir a
lista), mas é o gancho de valor mais repetido do design.

**4.6 Favoritar uma lista leva a uma página que ninguém alcança.**
`src/app/(account)/minha-conta/listas-salvas/page.tsx` existe e funciona, mas
`grep -rn "listas-salvas" src` retorna **zero links** — a sidebar da conta
(`(account)/minha-conta/layout.tsx:5-10`) tem só Perfil, Minhas listas,
Escolas salvas e Configurações. RF-013 está implementado e invisível para
metade dos casos.

**4.7 A home não conta a jornada.**
O explicador em passos existe, mas em `/como-funciona` (5 `<h2>` numerados).
A home tem hero + busca + destaques + CTA de contribuição. O Stitch coloca
"Como funciona em 4 passos" e os três blocos de impacto (pais, papelarias,
instituições) na própria landing — é onde a proposta de marketplace é
comunicada.

**4.8 Nenhum dos três perfis aparece no acesso.**
`src/components/auth/login-form.tsx` tem exatamente dois campos: e-mail e
senha. Um gestor de escola ou de papelaria que receba o papel via
`/admin/usuarios` entra na mesma tela genérica e chega no mesmo lugar que
qualquer visitante (§5).

## 5. Os dois portais de gestor (Fluxos 2 e 4) e os papéis mortos

O Fluxo 2 (telas 10, 11, 16, 17, 18) e o Fluxo 4 (telas 22, 23) são,
literalmente, as UIs para as quais os papéis `STORE_MANAGER` e
`SCHOOL_MANAGER` foram criados. A infraestrutura está inteira e sem
consumidor:

| Camada | Evidência |
|---|---|
| Enum de papel | `supabase/migrations/20260910200000_extensions_enums_helpers.sql:12` — `user_role` inclui `SCHOOL_MANAGER` e `STORE_MANAGER`. |
| Tabelas de vínculo | `school_managers` (`20260910200200_schools.sql:104`), `store_managers` (`20260910200300_stores.sql:49`). |
| Helpers de RLS | `is_school_manager()` e `is_store_manager()` (`20260910200900_rls_helper_functions.sql:37,50`). |
| Policies escola | `20260910201000_rls_profiles_schools.sql` usa `is_school_manager()` em ~10 policies de insert/update sobre `school_profiles`, `school_images`, `school_education_levels`, `school_series`. |
| Policies papelaria | `20260910201200_rls_stores.sql` usa `is_store_manager()` em `stores`, `store_contacts`, `store_services`. |
| Storage | `20260910201800_storage.sql:37` autoriza upload no bucket pela mesma função. |
| Testes | `supabase/tests/rls_idor.sql:38-39` e `rls_idor_hardening_extra.sql:41-42` criam usuários com esses papéis e testam as policies. |
| **UI** | **Nenhuma.** Os únicos usos em TS/TSX são rótulos de dropdown: `src/app/(admin)/admin/usuarios/page.tsx:15-16` e `src/components/admin/user-role-form.tsx:15-16`. |
| Portão de acesso | `src/lib/auth/roles.ts:8` — `ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"]`. `requireRole` nunca deixa um manager entrar em `/admin`. |

O próprio schema já registra isso: `20260911180000_analytics_vendas.sql:16`
comenta que `STORE_MANAGER` "é um papel real de RBAC" sem conta
self-service — por isso `store_sale_reports` é preenchido manualmente por
admin.

**Situação concreta:** um admin consegue atribuir "Gestor de escola" ou
"Gestor de papelaria" pela UI de `/admin/usuarios`, o banco passa a
autorizar aquele usuário a editar sua escola/loja — e o usuário não tem
**nenhuma tela** onde exercer isso. A RLS foi escrita para um consumidor
que nunca chegou.

**O que é aproveitável sem tocar em pagamento:**

- *Portal da Escola (SCHOOL_MANAGER)* — tela 22 quase inteira: a coordenação
  cadastra/homologa a lista da série, que hoje só um ADMIN faz em
  `/admin/listas` e `/admin/moderacao`. Da tela 23, as métricas de adoção,
  economia e reúso derivam de `analytics_events`, que já existe; o **Fundo
  APM e o repasse são ROADMAP** e devem ser separados do resto da tela.
- *Portal do Lojista (STORE_MANAGER)* — o shell das telas 10/16 sem a fila de
  pedidos: a papelaria edita o próprio perfil, horários, serviços e WhatsApp
  (hoje só `/admin/papelarias`), e declara quais listas/itens atende (tela 16,
  §4.4). Fila de pedidos, picking, margem, convênio/cashback e financeiro são
  ROADMAP.

Isso **não é um gap do PRD** — o PRD nunca definiu esses portais como
entregável do MVP (as personas 4.3 e 4.4 dizem "quando a funcionalidade
estiver habilitada"). É uma oportunidade identificada pelo design, com a
camada de segurança já pronta e testada.

## 6. Método e limites

- Base de cada tela: `code.html`. Nenhuma conclusão tirada de nome de pasta.
- Cada "Existe no código?" foi verificado abrindo a rota correspondente em
  `src/app/**`; onde não abri, a linha diz explicitamente "não existe".
- Não foi feita nenhuma alteração em código, CSS ou componente nesta tarefa.
- Este documento trata de **estrutura e escopo**. A lacuna visual (tokens
  Caderno Vivo) está em `docs/implementation/stitch-final-gap.md` §1 e
  continua válida.
- Este documento **substitui a classificação** de
  `docs/implementation/stitch-final-gap.md` §3, que rotulava telas como
  "FORA DO MVP — nunca implementar". Os achados factuais daquele documento
  seguem válidos; o critério de classificação é o desta matriz.
- `docs/implementation/stitch-mapping.md` (Prompt 00) segue bloqueado e
  histórico: descreve a ausência do MCP `stitch`, não o export.
