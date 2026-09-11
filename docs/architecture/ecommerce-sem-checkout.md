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

`price_hint` (nome já existente no schema) é tratado como o nome diz —
um indicativo, nunca exibido como preço final/garantido. Esta versão nem
chega a renderizar `price_hint` na UI (não fazia parte do pedido do
prompt); o campo já existe e está disponível para uma iteração futura.

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
