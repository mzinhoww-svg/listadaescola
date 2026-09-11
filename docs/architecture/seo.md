# Listada Escola — SEO técnico (Prompt 15)

PRD §14 ("SEO técnico: URLs amigáveis, metadata, sitemap.xml, robots.txt,
JSON-LD apropriado quando aplicável"). Este prompt fecha as quatro peças —
metadata em toda página pública, `sitemap.xml`, `robots.txt`, JSON-LD — e,
como pré-requisito para as duas primeiras, duas famílias de rota novas que
`home-busca-resultados.md` (Prompt 06) já tinha adiado explicitamente para
cá: "construir `/escolas/[estado]` e `/escolas/[estado]/[cidade]` fica para
o Prompt 15".

## `metadataBase`: por que uma segunda função de site URL

`src/lib/auth/actions.ts` já tinha `getSiteUrl()` desde o Prompt 03 —
request-scoped, lê `x-forwarded-host` para os links de redirect de e-mail
do Supabase Auth baterem exatamente com o host da requisição (preview
deployments incluídos). `metadataBase` (root layout) e todo JSON-LD que
monta URL absoluta são avaliados **fora** de um request (o primeiro em
module scope, o segundo em qualquer página que pode ser alcançada por um
crawler sem sessão) — não têm `headers()` para ler.

`getSiteBaseUrl()` (`src/lib/seo/site-url.ts`) resolve isso com uma cadeia
de fallback só de env vars: `NEXT_PUBLIC_SITE_URL` → `VERCEL_URL` →
`http://localhost:3000`. Produção real depende de `NEXT_PUBLIC_SITE_URL`
estar configurada no ambiente Vercel (documentada, comentada, em
`.env.example`) — gap já sinalizado em `WORKFLOW.md`, não assumido como
resolvido.

## Rotas novas: `/escolas/[uf]`, `/escolas/[uf]/[cidade]`, `/papelarias`, `/papelarias/[uf]/[cidade]/[slug]`

Sem elas, `metadata`/JSON-LD por si só não bastam — motor de busca precisa
de uma URL indexável e estável por cidade/papelaria, não só de
`/escolas?municipality=...` (query string, nunca canonicalizado para se
indexar como conteúdo próprio). As quatro seguem o mesmo par de padrões já
usado por `/escolas/[uf]/[cidade]/[slug]` (escola) e `/listas/[slug]`
(Prompt 07):

- **Self-healing canonical**: a página resolve pelo identificador estável
  (slug da escola/papelaria) e, se o `uf`/`cidade` da URL não bater com o
  canônico calculado (`schoolHref`/`storeHref`), `redirect()` em vez de
  servir conteúdo em uma URL não-canônica. `storeHref()` (novo, em
  `src/lib/stores/store-profile.ts`) espelha exatamente `schoolHref()`
  (`src/components/schools/school-card.tsx`, Prompt 07).
- **`resolve_municipality_slug(p_uf, p_slug)`** e **`list_municipalities(p_uf)`**
  (novas RPCs, `supabase/migrations/20260911190000_seo.sql`, `SECURITY
  INVOKER`, grant a `anon`+`authenticated`) fazem o round-trip slug↔nome
  usando `public.slugify()` (já existe desde o Prompt 02) do lado do
  Postgres — necessário porque um filtro Postgrest não consegue aplicar a
  função JS `slugify()` para comparar contra `municipality` (texto livre,
  vindo do INEP, sem coluna de slug própria). `list_municipalities` já
  agrupa só sobre `schools` ativas — uma cidade sem escola ativa
  simplesmente não aparece, sem filtro extra do lado do TS.
- `/papelarias` (índice) e o detalhe de papelaria reaproveitam
  `getActiveStores`/`getStoreBySlug` (novos, mesmo arquivo) — mesmo padrão
  `React.cache()` de `getSchoolBySlug`/`getListBySlug`. O detalhe de
  papelaria só expõe `store_contacts` com `is_public = true` (a tabela
  também guarda contato interno-only; nunca vazar isso numa página
  pública/crawlable).

### CTA do WhatsApp sem contexto de lista

O detalhe de papelaria é alcançado direto (busca, link externo), sem
`school`/`list` no caminho — `/api/store/whatsapp` (Prompt 09) exigia os
dois para montar a mensagem "itemizada". Os dois parâmetros viraram
opcionais; sem eles, `buildGenericWhatsappMessage(storeName)` (novo, em
`src/lib/stores/whatsapp.ts`) gera uma mensagem genérica em vez de um
redirect para `/`. Quando `school`/`list` estão presentes o comportamento
é idêntico ao Prompt 09 — a mensagem itemizada ainda exige uma lista
`APPROVED`/`PUBLISHED` real com pelo menos um item.

## JSON-LD: extraído, não reimplementado por página

`jsonLdScript()` (novo, `src/lib/seo/json-ld.ts`) existia inline só na
página de escola desde o Prompt 07 (com o escape de `</script>` já
documentado ali — SEC-005). Extraído para módulo compartilhado no momento
em que uma segunda página (`/listas/[slug]`) precisou do mesmo escape,
agora usado por toda página que emite JSON-LD:

| Página | `@type` | Observação |
|---|---|---|
| Escola (`/escolas/[uf]/[cidade]/[slug]`) | `School` | ganhou `logo`/`image` (antes só endereço/geo) + `BreadcrumbList` novo |
| Lista (`/listas/[slug]`) | `ItemList` + `BreadcrumbList` | novos |
| Cidade (`/escolas/[uf]/[cidade]`) | `BreadcrumbList` | novo |
| Estado (`/escolas/[uf]`) | `BreadcrumbList` | novo |
| Papelaria (`/papelarias/[uf]/[cidade]/[slug]`) | `LocalBusiness` + `BreadcrumbList` | novo |

`LocalBusiness.telephone` só é emitido quando `normalizeWhatsappNumber()`
confirma um número válido — mesmo princípio "não fabricar" já aplicado a
distância (RN-009): nunca declarar um telefone que o próprio app recusaria
a usar para montar o link de WhatsApp.

## `sitemap.xml` e `robots.txt`

Convenção de Metadata Route baseada em arquivo do Next.js
(`src/app/sitemap.ts`/`src/app/robots.ts`) — servidos automaticamente em
`/sitemap.xml`/`/robots.txt`, sem Route Handler manual.

`src/lib/seo/sitemap-data.ts` (novo) faz as três queries em massa
(`getAllActiveSchoolEntries`/`getAllActiveStoreEntries`/
`getAllPublicListEntries`) que nenhuma outra parte do app precisava até
agora — todo o resto do código busca uma escola/lista/papelaria de cada
vez. Postgrest limita uma resposta a 1000 linhas (`db-max-rows` do
projeto) e `schools` sozinha tem ~2700 linhas ativas, então as três paginam
via `.range()` com um helper compartilhado (`fetchAllRows`) até uma página
curta sinalizar o fim, ordenando por `id` para paginação estável. Lista
soma a complicação extra de RN-006 (visibilidade pública exige
`school_lists.status = 'APPROVED'` **e** uma versão `PUBLISHED` **e**
escola ativa) via inner join a duas tabelas — uma lista com mais de uma
versão `PUBLISHED` pode repetir na resposta paginada, então o slug é
de-duplicado em memória (`Map`) depois.

Total atual: ~2867 URLs (2722 escolas + 141 municípios + 4 estáticas + 0
listas + 0 papelarias, ambas zeradas em produção hoje) — bem abaixo do
limite de 50.000 URLs por arquivo do Google, então um único `sitemap.ts`
basta; `generateSitemaps` (split em múltiplos arquivos) não é necessário
agora.

`robots.txt` bloqueia `/admin`, `/minha-conta`, `/enviar-lista`,
`/sugerir-escola`, `/auth` (toda área que exige sessão — RLS já impede
acesso a dado real, isso só evita indexar uma tela de redirect/login sem
conteúdo) e `/api` (endpoints de redirect/ação, nunca páginas). Referencia
o sitemap via o campo `sitemap` do retorno.

## Fora do escopo deste prompt

- Páginas institucionais aspiracionais da PRD (`/como-funciona`,
  `/para-escolas`, `/para-papelarias`, `/parceiros` — já linkadas no
  footer desde o scaffold, todas ainda sem conteúdo real): "SEO técnico"
  aqui significa metadata/sitemap/robots/JSON-LD sobre conteúdo que já
  existe, não escrever conteúdo institucional novo.
- Portal de autosserviço para lojista/parceiro editar o próprio perfil de
  papelaria — mesma decisão já registrada em `analytics-vendas.md`
  (Prompt 14); o detalhe de papelaria deste prompt é só leitura pública.
- Sitemap/robots cobrem apenas o escopo público MT já existente; nenhuma
  mudança de dado, RLS ou schema além das duas RPCs `SECURITY INVOKER`
  read-only.

## Teste ao vivo (build + SQL + Playwright), seed → teste → limpeza

`stores` estava vazia em produção (0 linhas, confirmado por query antes de
testar — mesmo estado que Prompt 09/14 já tinham deixado, nenhuma
papelaria real cadastrada ainda). Testado:

1. `npm run lint` / `npm run typecheck` / `npm run build` limpos; todas as
   rotas novas (`/papelarias`, `/papelarias/[uf]/[cidade]/[slug]`,
   `/sitemap.xml`, `/robots.txt`, `/escolas/[uf]`, `/escolas/[uf]/[cidade]`)
   aparecem no output do build.
2. `next dev` real: `/robots.txt` e `/sitemap.xml` respondem 200 com
   conteúdo correto (2867 URLs, incluindo as 141 cidades de MT via
   `list_municipalities`); `/escolas/mt`, `/escolas/mt/cuiaba` 200,
   `/escolas/mt/cidade-inexistente` 404.
3. 1 papelaria de teste inserida diretamente via SQL (`stores` +
   `store_contacts` + `store_services`, patrocinada, com todos os campos
   opcionais preenchidos) para exercitar o caminho cheio do detalhe: índice
   `/papelarias` mostra a papelaria agrupada por cidade; detalhe renderiza
   nome, endereço, badge PATROCINADA, horário, badges de entrega/retirada,
   mapa, serviços, contato público, JSON-LD `LocalBusiness`; redirect
   canônico confirmado (`/papelarias/mt/cidade-errada/<slug>` → 307 para o
   caminho correto); `/api/store/whatsapp?store=<id>` (sem `school`/`list`)
   redireciona para `wa.me` com a mensagem genérica; a papelaria nova
   aparece no `sitemap.xml` na consulta seguinte (nenhum cache
   impedindo).
4. Confirmado via Playwright (screenshot mobile do detalhe + desktop do
   índice) que a página renderiza sem erro de hidratação — os únicos erros
   de console são falha de fetch de tile do MapLibre
   (`tile.openstreetmap.org`), esperado neste sandbox sem acesso de rede
   de saída para esse host, mesma limitação que qualquer outra página com
   `<Map>` já tem (não é regressão deste prompt).
5. Limpeza: `store_contacts`/`store_services`/`stores` de teste apagados;
   `analytics_events.store_id` anulado antes (mesmo motivo de sempre —
   `NO ACTION` na FK, evento em si nunca apagado). Confirmado 0 linhas
   restantes; `/papelarias` volta a mostrar 0 papelarias, detalhe de teste
   volta a 404.

## `get_advisors` após as duas RPCs novas

Mesma baseline WARN pré-existente de todo prompt anterior (8
`anon_security_definer_function_executable` + 25
`authenticated_security_definer_function_executable`) — sem mudança.
`resolve_municipality_slug`/`list_municipalities` são `SECURITY INVOKER` e
não aparecem em nenhuma das duas listas, mesmo raciocínio já registrado em
`analytics-vendas.md` para as RPCs de leitura do Prompt 14. Nenhum achado
novo, de segurança ou performance; o backlog de performance pré-existente
(RLS `auth.<function>()` sem `select`, políticas permissivas múltiplas,
FKs sem índice) não foi tocado — é o escopo do Prompt 16, não deste.
