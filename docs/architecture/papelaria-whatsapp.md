# Listada Escola — Papelarias próximas + WhatsApp (Prompt 09)

Transforma a lista escolar (Prompt 07) em uma solicitação de orçamento
local (PRD RF-011/RF-012, wireframes A.8-A.9). Consulta sem login (PRD
princípio 1); igual ao Prompt 08, esta é a metade "Comprar local" da
bifurcação "Comprar online | Comprar local" do fluxo principal (PRD
seção 5).

## Stitch

MCP `stitch` continua indisponível nesta sessão (verificado). Mesma
ressalva dos prompts anteriores — o placeholder de Drawer/BottomSheet já
existente em `dev/style-guide` (Prompt 01) antecipava literalmente este
prompt ("Papelarias próximas... ver Prompt 09"), reforçando que o nome
da feature já estava alinhado antes mesmo do Stitch entrar em jogo.

## Sem dado de avaliação para papelarias — "rating" omitido

A instrução do prompt pede para mostrar "rating" das papelarias, mas o
schema (`stores`/`store_contacts`/`store_services`/`store_managers`,
Prompt 02) nunca teve uma coluna de nota agregada, e `reviews` é
exclusivamente de escola (`reviews.school_id not null`, sem equivalente
para `store_id` — e o próprio PRD RF-014 fala só em "avaliar escola").
Sem fonte real de dado, mostrar um rating aqui seria fabricá-lo — mesmo
princípio já aplicado a `is_sponsored`/`avg_rating` de escola (Prompt 06)
e às listas recentes/destaques da Home. Rating de papelaria fica de fora
até existir uma fonte real (fora do escopo deste prompt).

## Distância é sempre até a escola, nunca até o visitante

Diferente da Home (Prompt 05/06), este fluxo nunca pergunta a localização
de quem está navegando — ele já está ancorado numa escola específica (a
da lista aberta). `nearby_stores()` (nova função PostGIS,
`supabase/migrations/20260911030000_nearby_stores.sql`) recebe as
coordenadas/município **da escola**, nunca do visitante, e a UI é
explícita sobre isso ("X km da escola", não "de você").

### `nearby_stores()` difere de `nearby_schools()` numa coisa importante

`nearby_schools()` trata coordenada e município como alternativas
mutuamente exclusivas (se a origem tem coordenada, só mostra escolas com
coordenada; senão, cai para município). Papelarias são cadastradas uma a
uma pelo admin (sem import em lote geocodificado como o INEP) — na
prática é esperado que algumas no mesmo município ainda não tenham
lat/long. Se `nearby_stores()` copiasse a mesma exclusão mútua, uma
papelaria real e ativa no município certo sumiria da lista só por faltar
geocodificação, mesmo com a escola tendo coordenada — quase inutilizando
a feature justamente no cenário mais provável de dado incompleto.

A função por isso **combina** as duas fontes quando a escola tem
coordenada: papelarias com localização entram no ranking real por
distância (PostGIS, `distance_km` calculado), papelarias sem localização
mas no mesmo município entram depois, com `distance_km` explicitamente
`NULL` (nunca fabricado) — nunca as duas fontes se misturam de forma que
pareça "distância real" o que não é. Confirmado com um caso de teste
específico (papelaria sem lat/long, escola com coordenada): antes da
correção, a papelaria simplesmente não aparecia; depois, aparece no fim
da lista sem badge de distância.

## Telefone: validado e normalizado só no servidor (RF-012)

`src/lib/stores/whatsapp.ts` — `normalizeWhatsappNumber()` aceita
qualquer formatação humana (`(66) 99999-1111`, `66988882222`, `+55 65...`)
e devolve dígitos no formato `55DDNNNNNNNNN` exigido pelo wa.me, ou
`null` quando não é um número brasileiro plausível (DDD fora de
11-99, quantidade de dígitos errada) — nunca um "melhor palpite".

Essa validação roda **duas vezes**, com objetivos diferentes:
1. Em `getNearbyStores()` (leitura), para decidir se o `StoreCard` mostra
   um botão de WhatsApp real ou o aviso "WhatsApp indisponível" — nunca
   um botão que levaria a um link quebrado.
2. Em `/api/store/whatsapp` (o redirect de verdade), porque a leitura
   acontece minutos antes do clique e o dado pode ter mudado — o
   endpoint nunca confia no que a página já mostrou, sempre relê e
   revalida a papelaria no momento do clique.

## `/api/store/whatsapp` — mesmo contrato de segurança do Prompt 08

Route Handler, não Server Action (mesmo motivo do
`/api/commerce/click`: precisa ser um link `<a>` de verdade). Recebe só
`store`/`school`/`list` (ids, nunca telefone nem texto de mensagem) e
resolve tudo no servidor: nome/telefone da papelaria, nome da escola,
série/ano/itens da versão publicada da lista — a mensagem final nunca
depende de nada que o cliente tenha enviado. `whatsapp_click` é
**aguardado**, mesma razão do Prompt 08 (o handler termina assim que
devolve o redirect, sem garantia de que um insert desacoplado sobrevive).

Testado via `curl` (sem seguir redirect): papelaria ativa com telefone
válido → redireciona para `wa.me/<numero>` com a mensagem completa e
corretamente codificada (escola, série, ano, todos os itens com
quantidade/unidade, pergunta de preço/entrega); papelaria com telefone
inválido, papelaria inativa, id inexistente, id malformado e chamada sem
parâmetro nenhum → os cinco caem no fallback seguro (`/`). "Abrir
WhatsApp; não enviar automaticamente" é uma propriedade inerente do
wa.me (ele só pré-preenche a tela de composição do WhatsApp; quem decide
enviar é sempre a pessoa) — nada extra precisou ser construído para
satisfazer isso.

## Drawer no desktop, BottomSheet no mobile — uma raiz só

`Drawer`/`BottomSheet`/`Modal` (Prompt 01) são wrappers finos sobre o
mesmo `DialogRoot`/`DialogTrigger` do Radix
(`dialog-primitives.tsx`), cada um chamando `DialogRoot` por conta
própria. `NearbyStoresSheet` inicialmente usava esses wrappers
diretamente, trocando `<Drawer>` por `<BottomSheet>` conforme
`useMediaQuery("(min-width: 640px)")` (mesmo breakpoint `sm` usado no
resto do projeto).

**Bug real encontrado em teste, não só teórico:** como
`useMediaQuery` usa `useSyncExternalStore` com um snapshot de servidor
fixo (`false`), o valor de `isDesktop` muda de `false` para `true` (em
telas ≥640px) assim que a hidratação sincroniza com o `matchMedia` real.
Como cada wrapper tem seu próprio `DialogRoot`, essa transição troca qual
componente está montado — se o clique no gatilho acontecer bem nessa
janela, o React desmonta o `DialogRoot` que acabara de abrir e monta um
novo (fechado), e o clique se perde silenciosamente. Reproduzido
consistentemente em teste automatizado (Playwright, 1 falha a cada
poucas execuções, sempre no mesmo padrão: o diálogo simplesmente não
abre). Corrigido usando o `DialogRoot`/`DialogTrigger` compartilhado
diretamente (nunca trocado) e alternando só o componente de conteúdo
(`DrawerContent` vs `BottomSheetContent`) conforme o viewport — a raiz do
diálogo nunca é desmontada, então não existe mais essa janela de corrida.
Confirmado com 3 execuções consecutivas limpas (20/20) depois da correção.

## Sem N+1

Dados buscados sob demanda (ao abrir o sheet, via Server Action
`getNearbyStoresForSchoolAction`), não eagerly com a página da lista: uma
query para resolver a localização da escola, uma chamada a
`nearby_stores()` (que já traz tudo: nome, endereço, telefone, horário,
entrega/retirada, distância) — nenhuma consulta adicional por papelaria
exibida.

## Analytics (RF-015)

`store_view` (um por papelaria exibida quando o sheet abre, mesmo padrão
de `school_impression`) e `whatsapp_click` (no clique, com atribuição de
escola/lista/parceiro) — os dois já estavam no allowlist de
`record_analytics_event()` desde o Prompt 06, nenhuma migration nova
precisou ser criada para analytics.

## Testes realizados

`stores`/`store_contacts`/`store_services`/`store_managers`/`reviews`
estavam em 0 linhas globalmente antes deste prompt. Semeados via
`execute_sql` (nunca migration): a mesma lista de teste reaproveitada dos
Prompts 07/08 (escola MT real) + 4 papelarias cobrindo cada caso-limite —
com coordenada e telefone válido, sem coordenada mas mesmo município
(telefone válido), com coordenada mas telefone inválido, e inativa.
Verificado ao vivo (Playwright, viewports desktop e mobile, mais `curl`
direto no endpoint): as 3 papelarias ativas aparecem (a inativa nunca),
distância real vs. `null` no fallback de município exatamente como
esperado, aviso "WhatsApp indisponível" só na papelaria de telefone
inválido, badges de entrega/retirada e horário corretos, variante correta
do diálogo por viewport, e o próprio bug do `DialogRoot` duplicado (ver
seção acima) só apareceu porque o teste rodou o fluxo do zero múltiplas
vezes seguidas — não teria sido pego por uma única passada manual.
Limpeza confirmada por query: todas as tabelas envolvidas voltaram a 0
linhas; eventos de analytics do teste mantidos mas desvinculados da
lista/papelarias de teste antes da remoção.

## Fora do escopo deste prompt

- Páginas de diretório `/papelarias`, `/papelarias/[estado]/[cidade]`,
  `/papelarias/[store-slug]` (PRD seção 6.1) — a instrução específica
  deste prompt pede só o drawer/bottom-sheet a partir da lista, não um
  diretório navegável independente.
- Avaliação/rating de papelaria — ver seção acima.
- Admin CRUD de papelarias/managers — Prompt 12.
- WhatsApp Business API, checkout ou pagamento — permanece proibido
  (regra absoluta do projeto); wa.me só abre a composição, nunca envia
  nem processa nada.
