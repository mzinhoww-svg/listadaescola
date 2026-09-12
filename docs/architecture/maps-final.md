# Mapas — verificação final (hardening pós-MVP)

Confirma, com evidência concreta (arquivo:linha), cada garantia da seção
"Não usar Google Maps" / "Nunca fabricar distância" do CLAUDE.md e do PRD
(RN-009), no estado real do código após o Prompt 20. Não é uma proposta —
é uma auditoria do que já está implementado. Nenhuma mudança de código
foi feita para este documento; é puramente uma verificação.

## 1. Abstração MapProvider → MapLibre → OSM(-derived)

- `src/components/map/map.tsx` faz lazy-import de `MapView`
  (`src/components/map/map-view.tsx`) dentro de um error boundary — o mapa
  nunca é crítico: "map is a non-critical component per Prompt 05 ('se
  falhar, busca continua funcional')" (`map-view.tsx:26-30`).
- `MapView` usa `maplibre-gl` (biblioteca open-source, não Google Maps)
  importada dinamicamente dentro de um `useEffect` — nunca toca DOM/WebGL
  durante SSR (`map-view.tsx:32-33,46`).
- `src/lib/map/config.ts` define `getMapTileConfig()`/`buildMapStyle()`:
  o provedor de tiles é 100% configurável por variável de ambiente
  (`NEXT_PUBLIC_MAP_STYLE_URL` para um style vetorial completo — ex.:
  MapTiler/Stadia/Protomaps, todos OSM-derived — ou
  `NEXT_PUBLIC_MAP_TILE_URL_TEMPLATE`/`NEXT_PUBLIC_MAP_ATTRIBUTION` para
  trocar só o XYZ raster) sem tocar código (`config.ts:1-15,30-37`). O
  tile server público do OSM é apenas o default zero-config
  (`DEFAULT_TILE_URL_TEMPLATE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"`,
  `config.ts:17`), nunca uma dependência rígida.

**Confirmado:** existe uma abstração real de provider, não um
acoplamento direto a um serviço específico.

## 2. Nenhuma dependência de Google Maps

- `package.json`: nenhuma dependência `@googlemaps/*`, `google-map-react`
  ou correlata.
- Nenhuma referência a `maps.googleapis.com`, `AIzaSy` (padrão de chave
  Google) ou `google.maps.*` em `src/` (grep completo, zero ocorrências).
- Geocoding (`src/lib/geocoding`, Prompt 05) é server-only e usa um
  provider desacoplado da camada de mapa (mapa e geocoding são
  módulos independentes) — não auditado a fundo de novo aqui porque já
  foi objeto de verificação dedicada no Prompt 05 e não mudou desde
  então; o ponto relevante para este documento é que ele também não usa
  Google.

**Confirmado.**

## 3. PostGIS calcula distância — nunca fabricada

Ponto mais sensível da regra (RN-009: "Nunca fabricar distância"). Duas
RPCs computam proximidade, ambas com a mesma garantia:

**`nearby_schools()`** (`supabase/migrations/20260911010000_nearby_schools.sql`):
cadeia de fallback explícita no próprio comentário da função (linhas 1-6,
107-108): coordenadas conhecidas → `ST_Distance`/`ST_DWithin` (PostGIS,
linhas 50-66); sem coordenadas → município exato (linhas 67-78, `null::numeric
as distance_km`); sem município → prefixo de 5 dígitos do CEP (linhas
79-91, idem `null`); sem nada → listagem simples por UF (linhas 92-103,
idem `null`). **`distance_km` é `NULL` em todo caminho de fallback, nunca
um valor inventado** — é literalmente o texto do comentário da função
(linha 4 e linha 108).

**`search_schools()`** (última versão em
`supabase/migrations/20260911210000_performance_audit_fixes.sql:99-111`,
a RPC realmente usada pela busca pública via
`src/lib/schools/search-schools.ts:49`): mesma garantia, um nível mais
granular — `distance_km` é calculado **por linha** via
`case when v_point is not null and s.location is not null then round(ST_Distance(...)/1000, 2) else null end`
(linhas 108-111). Isso cobre o caso em que a busca tem coordenadas do
visitante mas uma escola específica no resultado não tem `location`
própria: essa escola individual recebe `distance_km = null`, mesmo que
outras escolas no mesmo resultado tenham distância real calculada. Nunca
há um valor de distância aproximado/estimado/interpolado para preencher
esse `null`.

O client (`search-schools.ts`) apenas repassa `p_lat`/`p_lon`/
`p_municipality`/`p_cep` recebidos do usuário para a RPC — nenhuma lógica
de distância existe no lado do Next.js; todo o cálculo é PostGIS, no
banco.

**Confirmado, nos dois pontos de entrada reais (não apenas um).**

## 4. Provider substituível

Já coberto no item 1 — `NEXT_PUBLIC_MAP_STYLE_URL`/
`NEXT_PUBLIC_MAP_TILE_URL_TEMPLATE`/`NEXT_PUBLIC_MAP_ATTRIBUTION` trocam o
provider de tiles sem alteração de código. **Confirmado.**

## 5. Atribuição OSM

`map-view.tsx:65`: `map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right")`
— controle de atribuição real do MapLibre, adicionado manualmente (o mapa
é criado com `attributionControl: false` na linha 55 justamente para não
duplicar, e o controle correto é adicionado explicitamente logo depois).
O texto de atribuição default (`config.ts:18-19`) credita
`OpenStreetMap contributors` com link para `openstreetmap.org/copyright`,
como a licença ODbL exige. Quando um style customizado substitui o
default (`NEXT_PUBLIC_MAP_STYLE_URL`), a atribuição vem embutida no
próprio style vetorial do provider (comportamento padrão do MapLibre) —
não é responsabilidade deste código.

**Confirmado.** (Verificação anterior desta mesma auditoria já havia
cogitado isso como possível gap ao olhar só o header do site — o header
de fato não tem esse controle, mas não precisa: a atribuição correta
pertence ao mapa em si, não ao header, e está presente exatamente ali.)

## 6. Sem download em massa de tiles

Nenhum script/job no repositório baixa ou faz cache de tiles em massa
(nenhuma referência a mbtiles, tile pre-seeding, ou storage de tiles em
`supabase/migrations`, `scripts/` ou `src/`). Os tiles são carregados sob
demanda pelo próprio MapLibre no navegador do visitante, diretamente do
provider configurado — nunca proxied ou cacheados pelo backend deste
projeto.

**Confirmado.**

## 7. Mapa nunca é obrigatório para buscar escola

- A busca (`search_schools`) aceita nome, UF, município, CEP e
  filtros — nenhum desses depende do componente de mapa carregar.
- O mapa é renderizado dentro de um error boundary dedicado
  (`map-view.tsx:26-30,120-122`): uma falha de inicialização (provider
  fora do ar, erro de estilo, bloqueio de rede a tiles) nunca derruba a
  página nem a busca — vira um estado de fallback local (comentário:
  "the map is a non-critical component... failures here must never take
  down the page that embeds it").
- Nos fallbacks de `nearby_schools`/`search_schools` (item 3), a busca
  continua retornando resultados completos (nome, endereço, tipo, etc.)
  mesmo com `distance_km = null` — a ausência de coordenada nunca produz
  erro nem lista vazia por si só.

**Confirmado.**

## 8. Escolas sem coordenadas nunca recebem distância fabricada

Já demonstrado no item 3 com as duas RPCs — reafirmado aqui como item
próprio porque é a garantia mais crítica do RN-009: o `case`/`if` que
decide `distance_km` sempre tem `s.location is null` (ou equivalente) no
lado do `else`/fallback que produz `null`, nunca um valor default,
estimado, ou herdado de outra escola.

**Confirmado.**

## Conclusão

Todas as 8 garantias da seção de mapas do CLAUDE.md/PRD estão
implementadas e verificadas no código real, com citação de arquivo e
linha. Nenhuma correção foi necessária neste item da tarefa de
hardening — este documento existe para registrar a verificação em si,
não para propor mudança.
