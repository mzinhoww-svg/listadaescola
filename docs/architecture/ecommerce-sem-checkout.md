# Listada Escola — E-commerce sem checkout (Prompt 08)

Conecta a lista escolar (Prompt 07) a parceiros externos de e-commerce
(PRD RF-010, wireframe A.7 "Comprar online"). Consulta sem login (PRD
princípio 1) — a seção de compra é visível para qualquer visitante, como
o resto da lista.

## Stitch

MCP `stitch` continua indisponível nesta sessão (verificado). Mesma
ressalva dos prompts anteriores.

## Regra absoluta respeitada: sem checkout, sem carrinho próprio

`ecommerce_partners.integration_type` tem três valores (`DEEP_LINK`,
`PAGE`, `CART`, já existentes desde o Prompt 02) e os três terminam
exatamente da mesma forma: um redirect para o **domínio do parceiro**. A
diferença entre eles é só qual URL o link aponta — um produto específico,
uma página de catálogo, ou a página de carrinho/adicionar-ao-carrinho do
parceiro. "Carrinho" aqui nunca significa um carrinho hospedado pelo
Listada; é sempre o carrinho da loja do parceiro, depois do redirect. Não
há nenhum estado de carrinho, pedido ou pagamento no lado do Listada —
`CommerceProvider.ctaFor()` só decide o texto do botão, nunca constrói
lógica de checkout.

## Modelo de oferta: por item da lista, não por lista inteira

`list_product_mappings` liga um `school_list_item` específico a um
`ecommerce_products` específico (que pertence a um `ecommerce_partners`).
Um mesmo item pode ter ofertas de vários parceiros (ex.: o mesmo caderno
disponível em duas lojas); um parceiro só aparece na seção "Comprar
online" pelos itens que ele realmente vende, nunca por toda a lista de
uma vez — o schema não modela "este parceiro vende a lista inteira", só
"este parceiro vende este item". A UI reflete isso: a seção agrupa por
item, cada item mostra os cartões dos parceiros que o vendem, e itens sem
nenhuma oferta simplesmente não aparecem na seção (nunca fabricar uma
oferta inexistente).

> **Superado na Onda 8** (ver seção no fim deste arquivo): o schema
> continua igual — ainda não existe "este parceiro vende a lista
> inteira" —, mas a UI passou a *agregar* a cobertura por parceiro em
> cima dos mesmos mapeamentos por item, e itens sem oferta nenhuma
> passaram a ser exibidos explicitamente em vez de sumirem.

`price_hint` (nome já existente no schema) é tratado como o nome diz —
um indicativo, nunca exibido como preço final/garantido. Esta versão nem
chega a renderizar `price_hint` na UI (não fazia parte do pedido do
prompt); o campo já existe e está disponível para uma iteração futura.

> **Superado na Onda 8:** `price_hint` passou a ser exibido, por item e
> somado por parceiro, sempre rotulado como estimativa do parceiro e
> nunca como preço final. Ver "Estimativa" na seção da Onda 8.

## `CommerceProvider` (`src/lib/commerce/provider.ts`)

Duas responsabilidades, nenhuma delas toca a URL real de destino:

1. `ctaFor(integrationType)` — texto/descrição do botão por tipo de
   integração ("Ver produto" / "Ver na loja" / "Adicionar ao carrinho").
2. `buildTrackedHref(...)` — monta o link para `/api/commerce/click`
   (nunca a URL do parceiro diretamente). Esse é o único lugar que sabe o
   formato da query string do endpoint de tracking.

## `/api/commerce/click` — redirect rastreado, à prova de open redirect

Route Handler (`src/app/api/commerce/click/route.ts`), não Server
Action: precisa ser um link `<a>` de verdade (funciona sem JS, pode abrir
em nova aba nativamente, não é pré-buscado pelo `next/link`).

Contrato de segurança (SEC-009): o link que a página gera carrega só
`product` (id de `ecommerce_products`) + `item`/`school`/`list` (para
atribuição do analytics) — **nunca uma URL**. O handler resolve o destino
real fazendo `select external_url from ecommerce_products where id =
:product and is_active and parceiro.is_active`, direto do banco. Um
chamador não tem como fazer este endpoint redirecionar para um lugar
arbitrário: o máximo que ele controla é *qual oferta ativa* real,
existente no banco, será usada. Testado manualmente (via `curl`, sem
seguir redirect): produto inativo, parceiro inativo, id inexistente, id
malformado (não-UUID, incluindo um valor tipo `javascript:...` no
parâmetro) e chamada sem parâmetro nenhum — todos os cinco casos caem no
fallback seguro (redirect para `/`), nunca vazam nem tentam usar a URL
real de um parceiro/produto que não deveria estar acessível.

`external_url`/`website` são colunas `not null`, mas nada garante em
banco que sejam sempre um `http(s)://` bem formado (só admin escreve, mas
não há `check` de formato) — por isso o handler faz
`new URL(...)`+checagem de protocolo antes de redirecionar, em vez de
confiar cegamente na coluna.

`commerce_click` é **aguardado** (não fire-and-forget como a maioria dos
outros eventos deste projeto) porque este é um Route Handler que termina
assim que devolve a resposta — diferente de uma página renderizada, não
há garantia de que o runtime segue vivo tempo suficiente pra terminar um
insert desacoplado depois do redirect já ter sido enviado. Confirmado ao
vivo: os dois cliques bem-sucedidos geraram exatamente duas linhas em
`analytics_events` (`school_id`, `partner_id`, `metadata` com
`ecommerceProductId`/`schoolListItemId`); os cinco cliques rejeitados não
geraram nenhuma.

## CTA deixa claro que o usuário sai do Listada

- Texto fixo acima da seção: "Você será redirecionado para o site do
  parceiro para continuar a compra — o Listada não processa pagamentos."
- Cada botão tem `target="_blank"` (abre em nova aba, a lista continua
  aberta), ícone `ExternalLink`, e `title` explícito mencionando que vai
  sair do Listada.
- `rel="nofollow noopener noreferrer"`: `nofollow` porque é um link de
  tracking, não uma página endossada; `noopener`/`noreferrer` por causa
  do `target="_blank"`.

## Sem N+1

Uma query só (`getOffersByListItemId`) traz as ofertas de **todos** os
itens da lista de uma vez (`list_product_mappings` embutido com
`ecommerce_products`/`ecommerce_partners` via PostgREST, filtrado por
`in (...)` nos ids dos itens), a mesma lógica de `getSchoolLists`/
`getListBySlug` dos Prompts 06/07. RLS (`list_product_mappings_select_published`,
`ecommerce_products_select_active`, `ecommerce_partners_select_active`,
já existentes desde o Prompt 02) filtra sozinha o que a query já não
filtrou explicitamente.

## Testes realizados

Todas as quatro tabelas (`ecommerce_partners`, `products`,
`ecommerce_products`, `list_product_mappings`) estavam em 0 linhas
globalmente antes deste prompt. Semeado via `execute_sql` (nunca
migration): uma lista/versão/itens real (mesmo padrão dos Prompts 06/07,
reaproveitando a escola MT ativa já usada no Prompt 07) + 4 parceiros
(um por integration_type, mais um inativo) + 4 produtos + 5
`ecommerce_products` (incluindo um marcado `is_active = false`) + 5
`list_product_mappings`, cobrindo: item com duas ofertas de parceiros
diferentes, item com uma oferta, item cuja única oferta é de um *produto*
inativo, item cuja única oferta é de um *parceiro* inativo, e item sem
oferta nenhuma.

Verificado ao vivo (Playwright + `curl` direto no endpoint, Chromium
global do ambiente): a seção "Comprar online" mostra exatamente as
ofertas ativas esperadas por item (nunca as inativas, nunca um item sem
oferta), rótulos de CTA corretos por `integration_type`, atributos de
link corretos (`target="_blank"`, `rel="nofollow noopener noreferrer"`),
os cinco casos de redirect inseguro tratados no endpoint (ver seção
acima), e `commerce_click` gravado corretamente só nos dois cliques
válidos. Limpeza confirmada por query: as quatro tabelas voltaram a 0
linhas (linhas de `analytics_events` geradas no teste foram mantidas,
desvinculadas de `partner_id`/`list_id` antes da remoção do parceiro/lista
de teste — mesmo cuidado do Prompt 07 para não violar FK nem perder
histórico de eventos legítimo).

## Fora do escopo deste prompt

- Papelarias locais + WhatsApp (RF-011/RF-012) — Prompt 09.
- Exibir `price_hint` na UI — campo já existe no schema, não fazia parte
  do pedido deste prompt.
- Admin CRUD de parceiros/produtos/mapeamentos — Prompt 12.
- Qualquer forma de checkout, pagamento, PIX, cartão, boleto ou carrinho
  próprio — permanece proibido (regra absoluta do projeto), e nada aqui
  se aproxima disso: toda "compra" termina saindo do Listada.

---

# Onda 8 — Comércio com profundidade

Atualiza (não substitui) o que está acima. A fronteira não se moveu:
e-commerce continua terminando em `/api/commerce/click` (link externo +
tracking), papelaria continua terminando em `wa.me`. **Nenhum checkout,
carrinho próprio, reserva, pedido ou pagamento existe ou passou a
existir.** O que mudou é o que a família consegue *decidir* antes de sair
daqui.

## O problema que a Onda 8 resolve

A seção "Comprar online" era um agrupamento por item: uma lista de 18
itens virava 18 decisões independentes, e a pergunta que a mãe realmente
faz — *"qual loja resolve a maior parte da minha lista?"* — não tinha
resposta em lugar nenhum da tela. Pior: item sem oferta nenhuma
simplesmente não aparecia, então a seção dava a impressão de que a lista
estava resolvida quando não estava.

## Cobertura agregada por parceiro

`src/lib/commerce/coverage.ts` (`buildListCommerceCoverage`) é uma função
**pura**: recebe os itens da lista e o mapa item → ofertas que
`getOffersByListItemId` já traz numa query só, e agrega por parceiro.
Não faz acesso a banco e não amplia visibilidade nenhuma — só conta o que
a RLS já deixou passar.

Quando o mesmo parceiro tem mais de um produto mapeado no mesmo item
(`list_product_mappings` permite), vence a oferta **mais barata com
preço**; sem nenhuma com preço, a primeira.

### Ordem dos parceiros

Não existe dimensão de patrocínio aqui, e isso é deliberado:
`campaign_entity_type` só modela `SCHOOL` e `STORE`
(`20260910200700_monetization.sql`), então nenhum parceiro de e-commerce
pode ser patrocinado hoje. Inventar posição paga seria exatamente o
"mascarar patrocínio" que a RF-003 proíbe. A ordem é determinística e
declarada na própria tela ("Ordenadas por quantos itens desta lista cada
loja cobre. Nenhuma posição aqui é paga."):

1. cobre mais itens **desta** lista;
2. mais dessa cobertura com preço informado;
3. nome (pt-BR) como desempate estável.

Papelarias mantêm a regra que já tinham: a ordem vem de
`nearby_stores()` (grupo de proximidade → distância → nome) e nada no
código novo reordena isso.

## Estimativa: a regra "nunca fabricar", aplicada a dinheiro

`estimatedTotal` soma `ecommerce_products.price_hint` **só** dos itens
cobertos que têm preço. Três disciplinas, todas visíveis na tela:

- **Não multiplica pela quantidade da lista.** `price_hint` não diz nada
  sobre a embalagem que o parceiro vende; "4 × price_hint" seria um
  número que o dado não sustenta. O texto diz isso literalmente: "preço
  por unidade, sem multiplicar pela quantidade da lista".
- **Diz o denominador.** Quantos itens entraram na conta e quantos itens
  cobertos ficaram de fora por não ter preço.
- **Cala quando não sabe.** Se nenhum item coberto tem preço,
  `estimatedTotal` é `null` e a UI não mostra número nenhum — nunca
  R$ 0,00, que leria como "de graça". Mesma disciplina de RN-009 para
  distância.

E o rótulo nunca é um total a pagar: "Estimativa do parceiro" + "Não é
preço final nem cobrança do Listada: você compra no site do parceiro."

## Itens que ninguém cobre

`uncoveredItems` passa a ser exibido explicitamente ("4 itens sem oferta
de nenhuma loja parceira"), com o motivo prático: comprando online você
não resolve a lista inteira, estes precisam da papelaria. Antes esses
itens sumiam em silêncio.

A visão item a item (`Comparar loja a loja, item por item`) continua
existindo, agora recolhida e **só quando há 2+ parceiros** — com um
parceiro só ela repetiria o conteúdo do cartão dele. Dentro dela as
ofertas de cada item passaram a sair ordenadas por preço crescente
(`sortOffersForComparison`), com as sem preço no fim; antes saíam na
ordem em que o PostgREST devolvia as linhas.

## Comparar orçamentos de papelaria

`src/components/stores/compare-quotes-panel.tsx`. É o comportamento real
do mercado brasileiro: mandar a mesma lista para duas ou três papelarias
e comparar o que voltar. O painel vive dentro da gaveta "Papelarias
próximas" e só aparece com uma lista em contexto e 2+ lojas com WhatsApp
válido.

Dois passos: selecionar as papelarias, depois abrir **uma conversa de
cada vez** — cada linha é um `<a>` de verdade para
`/api/store/whatsapp`, o mesmo endpoint rastreado de sempre, com a mesma
mensagem itemizada que `buildWhatsappMessage` já montava. Um clique real
por loja também é a única forma de não esbarrar no bloqueio de popup ao
tentar abrir várias abas de uma vez. O painel marca quais já foram
abertas ("2 de 3 conversas abertas"); ele nunca envia nada — o wa.me só
pré-preenche a tela de composição do WhatsApp.

`buildStoreQuoteHref` (`src/lib/stores/quote-link.ts`) passa a ser a
fonte única do formato desse link — o gêmeo de
`CommerceProvider.buildTrackedHref` do lado da papelaria. `StoreCard`
usa o mesmo helper. Continua sem construir `wa.me` no cliente: o telefone
só é resolvido, validado e normalizado dentro do Route Handler (RF-012).

## Analytics

`20260913050000_commerce_depth.sql` acrescenta dois tipos ao allowlist de
`record_analytics_event()` (a PRD chama sua lista da seção 15 de "eventos
mínimos", então acrescentar é aditivo). Nada mais muda no banco.

- `commerce_coverage_impression` — um por parceiro exibido no bloco de
  cobertura, com `partner_id` e metadata
  `{coveredItems, totalItems, pricedItems, estimatedTotal}`. Mesmo papel
  de `school_impression`: é o denominador que faltava para transformar
  `commerce_click` em CTR por parceiro — o "relatório que fecha o laço
  com o parceiro" que a Onda 8 pede.
- `whatsapp_compare_started` — a família decidiu comparar, e contra
  quantas lojas. Cada conversa aberta continua gerando seu próprio
  `whatsapp_click`.

O Server Action que grava o segundo
(`src/lib/stores/compare-actions.ts`) não lê nem devolve nada: valida o
formato dos ids, limita a 10 lojas, e a única coisa que consegue fazer é
gravar um evento que qualquer visitante já provoca abrindo uma página.

## Testes realizados

Servidor `next dev` isolado (cópia do projeto no scratchpad, porta 3100)
para não derrubar nem sobrescrever o `.next` do servidor que outra sessão
mantinha na 3000. Chromium real, viewports 390px e 1280px.

1. **Estado vazio** (o estado de produção hoje: 0 mapeamentos): "Comprar
   online" mostra a mensagem de ausência e aponta para a papelaria. Sem
   erro de console, sem rolagem horizontal.
2. **Estado cheio**, semeado temporariamente: 3 parceiros (7, 4 e 2 itens
   cobertos de 11), um deles sem nenhum `price_hint`. Conferido na tela:
   ordem por cobertura, estimativa R$ 107,60 (5 de 7 itens, 2 sem preço
   declarados no texto) e R$ 123,30, o terceiro parceiro **sem número
   nenhum**, 2 itens sem oferta listados, comparação item a item ordenada
   por preço, `commerce_click` redirecionando 307 para a URL do parceiro.
3. **Filtro de inativos**: parceiro inativo e produto inativo sumiram da
   tela na hora, e a contagem de itens sem cobertura subiu de 2 para 4.
   Com um parceiro só, a comparação item a item some (seria redundante).
4. **Comparar papelarias**: 3 papelarias semeadas, seleção → fila →
   3 links `/api/store/whatsapp?store=…&school=…&list=…` com
   `target="_blank"` e `rel="nofollow noopener noreferrer"`.
5. **Analytics**: 9 `commerce_coverage_impression` (3 parceiros × 3
   carregamentos) com a metadata correta, incluindo `estimatedTotal:
   null` no parceiro sem preço, e 1 `whatsapp_compare_started` com
   `storeCount: 3`.
6. **Sem rolagem horizontal** em 390px em todos os estados, inclusive com
   um item de nome muito longo virando chip na lista de "sem oferta".

Limpeza confirmada por query: parceiros, produtos, ofertas, mapeamentos e
papelarias de teste de volta a zero; base de volta ao baseline (1
parceiro e 1 papelaria pré-existentes, 0 mapeamentos). Os
`analytics_events` gerados pelo teste foram **removidos**, não apenas
desvinculados: os dois tipos novos nasceram neste teste, não havia
histórico legítimo a preservar, e deixá-los inflaria o painel do admin
com tráfego que nunca existiu.
