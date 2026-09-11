# Listada Escola — Mapas e Localização (Prompt 05)

Infraestrutura de mapa e localização usada pela busca (Prompt 06) e, mais
tarde, por papelarias próximas (Prompt 09). Este prompt entrega os
componentes reutilizáveis e a função de proximidade; as telas reais
(Home/Busca/Resultados) ficam para o Prompt 06 — a home ainda aponta para
esse prompt via `ScaffoldNotice`.

## Stitch

MCP `stitch` continua indisponível nesta sessão (verificado — não aparece
na lista de ferramentas). `MapProvider`/`LocationInput` foram construídos
sem referência visual do Stitch; conferir contra o Stitch assim que o MCP
estiver disponível, sem quebrar a API dos componentes se possível (mesma
ressalva já registrada em `design-system.md`).

## MapProvider (`src/components/map/`)

- `map-view.tsx` — implementação MapLibre real. `maplibre-gl` é importado
  dinamicamente dentro de um `useEffect` (nunca no escopo do módulo), então
  nada aqui toca DOM/WebGL durante SSR.
- `map.tsx` (`Map`, export público) — `next/dynamic(..., { ssr: false })`
  em cima de `map-view.tsx` (code-splitting: só carrega `maplibre-gl` em
  página que realmente mostra mapa) envolto em `MapErrorBoundary`.
- `map-error-boundary.tsx` — mapa é componente não crítico: qualquer falha
  (provider fora do ar, WebGL indisponível, erro de estilo/tile) cai num
  `EmptyState` ("Mapa indisponível") em vez de derrubar a página. Cobre
  tanto erro síncrono (import/constructor) quanto o evento `map.on('error',
  ...)` do MapLibre, que é como falhas de estilo/tile realmente chegam (não
  como exceção) — sem isso, um provider quebrado ficaria com um mapa em
  branco silencioso em vez de acionar o fallback. Testado de ponta a ponta
  apontando `NEXT_PUBLIC_MAP_STYLE_URL` para um host inexistente: fallback
  aparece e a busca (`LocationInput`) continua funcionando normalmente.

### Provider de tiles configurável (`src/lib/map/config.ts`)

- `NEXT_PUBLIC_MAP_STYLE_URL` — quando definida, substitui o estilo
  inteiro (ex.: uma `style.json` de um provider vetorial com chave, tipo
  MapTiler/Stadia/Protomaps).
- `NEXT_PUBLIC_MAP_TILE_URL_TEMPLATE` / `NEXT_PUBLIC_MAP_ATTRIBUTION` —
  sem a variável acima, controla o template XYZ e a atribuição do estilo
  raster default.
- Default sem nenhuma variável definida: raster do tile server público do
  OpenStreetMap, com atribuição OSM sempre visível
  (`AttributionControl`, canto inferior direito). É só o default
  zero-config — nunca uma dependência rígida, por isso é 100%
  substituível por env var sem tocar código, e o app nunca faz bulk
  download/prefetch de tiles (carrega só o que o viewport pede).
- Chave/token de um provider de tiles embutido em
  `NEXT_PUBLIC_MAP_STYLE_URL` é inerentemente client-exposed (o próprio
  browser pede a URL) — `NEXT_PUBLIC_*` é o prefixo certo aqui, diferente
  de segredo de geocoding (próxima seção).

## Geocoding (`src/lib/geocoding/`, server-only)

Nunca chamado do client diretamente — só via as duas Server Actions em
`resolve-location.ts`. Cadeia de resolução, sempre parando no primeiro
resultado utilizável e nunca fabricando coordenada (PRD RN-009):

1. **CEP** (`cep.ts`): 8 dígitos → BrasilAPI (`/api/cep/v2/{cep}`, às
   vezes já traz coordenada) → ViaCEP (endereço, sem coordenada) como
   fallback. Ambos gratuitos/sem chave.
2. **Cidade/bairro** (`municipality.ts`): texto livre comparado (sem
   acento/case) contra os municípios já conhecidos em `schools` (dado
   nosso, já confiável — zero chamada externa). Match exato primeiro,
   depois substring só se inequívoco (exatamente um candidato).
3. **Fallback final** (`nominatim.ts`): só quando (2) não encontra nada.
   Nominatim público da OSM, escopado a `countrycodes=br`, uma chamada por
   busca não resolvida (nunca em loop/bulk), com `User-Agent` próprio —
   dentro da política de "uso razoável" do serviço público.
4. **Localizar-me** (`resolveLocationByCoordsAction`): a coordenada do
   navegador já é a mais precisa possível — nunca é trocada por geocoding
   nenhum. A action só chama `nearby_schools()` com essa coordenada
   (limit 1) para anexar um rótulo amigável ("Perto de {município}");
   lat/lon retornados são sempre os originais do navegador.

Todo caminho que não encontra nada retorna `source: "unresolved"` (nunca
lança exceção, nunca inventa uf/município/coordenada) — testado com um
texto sem sentido (`XyzNaoExiste123`): Nominatim responde `[]`, a action
retorna `unresolved`, e `LocationInput` mostra um toast de erro em vez de
seguir com dado fabricado.

`GEOCODING_API_KEY` (`.env.example`) fica reservada para um futuro
provider OSM-derived com chave substituindo o Nominatim público — nenhuma
chamada atual depende dela. Quando/se for adicionada, o segredo nunca sai
de `src/lib/geocoding/*` (server-only; essas funções só são importadas por
`resolve-location.ts`, que é `"use server"`).

### Lista de municípios conhecidos é cacheada

`getKnownMunicipalities` usa `unstable_cache` (revalidate 3600s) para não
buscar as ~2.7 mil linhas de `schools.municipality` a cada busca por
texto. Usa `src/lib/supabase/public.ts` (cliente anon sem cookie) em vez
do client de `server.ts`, porque `unstable_cache` proíbe chamar
`cookies()` dentro da função cacheada — e essa leitura não depende de
quem está perguntando (dado já público via `schools_select_active`).

## Proximidade — `nearby_schools()` (SQL)

Migration `20260911010000_nearby_schools.sql`. Mesmo padrão de
reutilização por estado do `merge_inep_staging()`
(`docs/architecture/inep-import.md`): `p_uf` com default `'MT'`, mas
sempre parametrizável.

Prioridade de resolução dentro da função (a primeira condição que bate
decide o modo, nunca combina):

1. `p_lat`/`p_lon` presentes → ordena por `location <-> ponto` (KNN via o
   índice GIST `schools_location_gix`, Prompt 02), `distance_km` real
   (`ST_Distance`), respeita `p_radius_km` quando informado.
2. Senão, `p_municipality` presente → filtra por município exato
   (case-insensitive), ordena por nome, `distance_km` sempre `NULL`.
3. Senão, `p_cep` presente → filtra por prefixo de 5 dígitos do CEP da
   própria escola, ordena por nome, `distance_km` sempre `NULL`.
4. Senão → lista simples do `uf`, ordenada por nome, `distance_km` sempre
   `NULL`.

Sempre `is_active = true`. `SECURITY INVOKER` (padrão do Postgres, deixado
explícito) — não faz nada que a policy `schools_select_active` já não
libere para `anon`/`authenticated`, então não precisa (nem deveria) rodar
com privilégio elevado. `search_path` fixado incluindo `extensions`
(schema onde vivem as funções/operadores do PostGIS usados aqui —
`ST_Distance`, `ST_DWithin`, o operador `<->`), mesmo padrão do
`function_search_path_mutable` corrigido no Prompt 04. `EXECUTE` fica no
default do Postgres (liberado para `public`, o que inclui `anon`/
`authenticated`) em vez de revogado, porque diferente das funções
internas do INEP, esta é uma leitura pública por design.

### Testado (via `execute_sql`, dados reais de MT)

- Coordenada real (centro de Cuiabá): retorna escolas de Cuiabá ordenadas
  por distância crescente (0.24 km a 0.58 km nas 5 mais próximas).
- `p_radius_km = 1`: 12 escolas dentro do raio vs. centenas fora dele —
  filtro de raio confirmado.
- `p_municipality = 'cuiabá'` (minúsculo): 384 escolas, `distance_km`
  sempre `NULL` em todas — nunca fabrica distância no fallback.
- `p_cep = '78048-000'`: 13 escolas cujo CEP share o mesmo prefixo de 5
  dígitos.
- Sem nenhum parâmetro além de `p_uf`: 2.722 linhas — bate exatamente com
  o total ativo de MT.
- Município inexistente (`'CidadeQueNaoExiste'`): 0 linhas — confirma que
  o match não é frouxo/parcial demais.
- Escola inativa: 0 linhas de inativa aparecem em qualquer chamada —
  filtro `is_active` confirmado.
- Chamada com `set local role anon`: funciona idêntico à conexão
  privilegiada — RLS realmente se aplica (não é `SECURITY DEFINER`
  escondendo o comportamento).

## Verificação manual (Playwright, `/dev/style-guide`)

Nova seção "Mapas e localização" na vitrine (mesmo padrão do Prompt 01:
prova de que o componente funciona antes de existir uma tela de produto
usando ele). Verificado em Chromium headless, desktop (1280px) e mobile
(375px), zero erro de console em todos os cenários:

- Mapa renderiza (canvas presente) nos dois viewports; atribuição OSM
  visível ("© OpenStreetMap contributors").
- CEP real (`78005-000`) resolve para Cuiabá/MT com coordenada real via
  BrasilAPI.
- Texto de cidade (`Cuiabá`) resolve via município conhecido, sem
  coordenada (fallback correto, não fabrica).
- "Usar minha localização" (permissão de geolocalização concedida e
  coordenada simulada via Playwright) preserva a coordenada original do
  navegador e anexa o rótulo "Perto de Cuiabá" via `nearby_schools()`.
- Texto sem sentido mostra toast de erro ("Não encontramos essa
  localização") em vez de seguir com dado fabricado.
- Provider de mapa quebrado (`NEXT_PUBLIC_MAP_STYLE_URL` apontando para
  host inexistente): fallback "Mapa indisponível" aparece e a busca por
  texto continua funcionando normalmente — confirma "mapa é componente
  não crítico" de ponta a ponta, não só na leitura do código.

## Pendências conhecidas (fora de escopo deste prompt)

- **SEC-008 (rate limiting)**: as Server Actions de geocoding são
  públicas (consulta sem login) e chamam serviços externos (BrasilAPI/
  ViaCEP/Nominatim) por requisição — não há rate limiting de
  edge/servidor ainda (nenhuma infra de KV/Redis existe no projeto até
  este prompt). Deixado para o Prompt 16 (auditoria de segurança), que é
  o prompt dedicado a isso; até lá, o volume esperado (MVP de um único
  estado) e o cache de municípios conhecidos mantêm o risco baixo, mas
  isso não substitui um rate limit real antes de tráfego de produção
  maior.
- **`nearby_schools()` é só para `schools`.** Papelarias (`stores`, já
  com `location geography` + GIST desde o Prompt 02) vão precisar da
  mesma lógica de fallback quando o Prompt 09 implementar papelarias
  próximas — reaproveitar o mesmo padrão, não necessariamente a mesma
  função.
