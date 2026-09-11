# Listada Escola — Home, Busca e Resultados (Prompt 06)

Primeira jornada pública real (PRD RF-001 a RF-003), construída sobre a
infraestrutura do Prompt 05 (`MapProvider`, `LocationInput`,
`nearby_schools()`). Consulta sem login (PRD princípio 1) — nada aqui
exige autenticação.

## Stitch

MCP `stitch` continua indisponível nesta sessão (verificado). Home/
Busca/Resultados foram implementadas sem referência visual do Stitch;
conferir contra o Stitch assim que o MCP estiver disponível, sem quebrar
a API dos componentes se possível (mesma ressalva de `design-system.md`
e `mapas-localizacao.md`).

## Fluxo e roteamento

```text
/ (Home)
  hero + LocationInput (CEP/cidade/localizar-me) + busca por nome
  → onResolved / submit navega para /escolas com querystring
/escolas (Resultados)
  Server Component, searchParams = estado inteiro da busca (uf, lat,
  lon, municipality, cep, q, type, level, rating, sort, page, label)
  → compartilhável/indexável (PRD princípio 8), nunca precisa de client
    state para funcionar
```

Não existe rota `/busca` separada: "confirmação de localização, mapa e
estados de erro" (wireframe A.2 do PRD) vive dentro de `/escolas` como o
`LocationBanner` — mostra a localização atual com opção de trocar, ou (se
nada foi resolvido) abre o `LocationInput` direto como prompt/estado de
erro. O PRD não lista `/busca` como URL própria (seção 6.1), só
`/escolas`.

`/escolas/[uf]/[cidade]/[slug]` e `/listas/[slug]` são placeholders
(`ScaffoldNotice`) apontando para o Prompt 07 — mesmo padrão dos
placeholders do Prompt 01/03, criados agora porque os cards de resultado
precisam de um destino real (`schoolHref()`), mas o conteúdo de verdade é
escopo do próximo prompt.

## search_schools() (SQL)

Migration `20260911020000_search_schools.sql`. Estende `nearby_schools()`
(Prompt 05, deixada intocada — outros chamadores como
`resolveLocationByCoordsAction` continuam usando a versão simples) com o
que Resultados precisa:

- **Filtros**: `p_school_type` (Pública/Privada), `p_education_level`
  (etapa), `p_min_rating`, `p_name_query` (busca por nome — quando
  presente, ignora localização por completo: buscar "Colégio X" não deve
  ficar restrito a um município que o usuário nunca digitou).
- **Ordenação** (`p_sort`): `relevance` (default), `proximity`,
  `popularity`, `rating`.
- **Paginação**: `p_limit`/`p_offset`, `total_count` via
  `count(*) over ()` na mesma query.

### Ranking: relevância nunca inclui patrocínio (RF-003, RN-008)

`relevance_score` é só sinal orgânico — proximidade (peso 0.5, neutro
0.5 sem coordenada, nunca fabrica distância), disponibilidade de listas
(peso 0.3), verificação (peso 0.1), volume de avaliações (peso 0.1).
`is_sponsored`/`sponsor_priority` são colunas separadas: desempatam a
*posição* (sponsored sempre primeiro, per "posição... explicitamente
sinalizado") mas nunca entram na conta de relevância/avaliação exibida —
uma escola patrocinada mostra sua nota orgânica real, sem alteração
("pagamento não altera a nota orgânica da escola"). Pesos são um ponto de
partida razoável, não final — RF-003 pede algoritmo configurável no
admin, isso é o Prompt 13.

Armadilha real encontrada e corrigida durante o desenvolvimento: dentro
de uma função `plpgsql` com `returns table(distance_km numeric, ...)`,
esses nomes de coluna viram variáveis implícitas no escopo da função —
uma referência não-qualificada a `distance_km` (ou `list_count`,
`is_verified`, `review_count`, `avg_rating`) dentro de uma CTE que também
produz uma coluna de mesmo nome é ambígua e não compila. Corrigido
qualificando toda referência com o alias da CTE (`combined.distance_km`,
etc.) — comentado no próprio SQL para o próximo desenvolvedor não cair na
mesma armadilha.

### Backfill: school_education_levels

Descoberto durante a implementação: o import do Prompt 04 só gravou
`schools.education_offerings` como texto cru (ex.: "Educação Infantil,
Ensino Fundamental"); `school_education_levels` (schema do Prompt 02,
índice `school_education_levels_school_id_idx` parado desde então) nunca
foi populada. Sem isso, o filtro de etapa bateria zero escolas sempre.
Migration `20260911020100_backfill_school_education_levels.sql`
normaliza o mesmo dado já importado (não fabrica nada novo) — confirmado
exatamente 5 valores distintos nas 2.722 escolas de MT (Ensino
Fundamental 1946, Educação Infantil 1598, Ensino Médio 687, Educação de
Jovens Adultos 358, Educação Profissional 69), idempotente
(`on conflict do nothing`).

## Analytics (RF-015)

`record_analytics_event()` (mesma migration): único caminho de escrita
em `analytics_events`, que não tem nenhuma policy de insert para
`anon`/`authenticated` (só admin lê, desde o Prompt 02) — `SECURITY
DEFINER`, valida `event_type` contra a lista exata da seção 15 do PRD,
rejeita qualquer outro valor. Isso soma ao grupo de funções `SECURITY
DEFINER` já sinalizado pelo advisor (`approve_submission` e afins,
Prompt 02/03) — é intencional aqui pelo mesmo motivo: input validado,
efeito estreito (um insert), precisa funcionar sem login.

Onde cada evento é de fato registrado — o ponto que resolve a localização
ou renderiza o resultado, não um lugar genérico:

- `location_search` / `location_detected`: dentro de
  `resolveLocationByTextAction`/`resolveLocationByCoordsAction`
  (`src/lib/geocoding/resolve-location.ts`, Prompt 05 — atualizado agora)
  no momento exato da resolução, não em `/escolas`.
- `school_search`: uma vez por render de `/escolas`, com os parâmetros da
  busca em `metadata`.
- `school_impression`: uma por escola de fato renderizada na página
  (`recordSchoolImpressions`, um insert por linha, disparado em paralelo).

Best-effort sempre: `recordAnalyticsEvent` nunca lança para o chamador
(`try/catch` interno, loga e segue) — analytics nunca pode quebrar a
página que a originou. `session_id` (correlação entre buscas anônimas)
não foi implementado agora — coluna já existe e é nullable, mas construir
a lógica de cookie/visitante é trabalho do Prompt 14 (dedicado a
analytics), fora do escopo desta jornada.

## Destaques e listas recentes: sem fabricar dado

`getFeaturedSchools()`/`getRecentLists()` (`src/lib/schools/
home-queries.ts`) são queries reais — a primeira só retorna escola com
`is_sponsored` ou `is_verified` de verdade, a segunda só lista com versão
`PUBLISHED`. Neste dataset (`school_profiles` e `school_lists` com **0
linhas** — confirmado via `execute_sql`, nenhum conteúdo editorial ainda
existe), as duas retornam `[]`, e a Home simplesmente **não renderiza
essas seções** em vez de mostrar um "sem destaques ainda" ou, pior, uma
amostra arbitrária disfarçada de curadoria. Vai aparecer sozinho assim
que Prompt 11/12/13 (moderação, admin, patrocínio) gerarem conteúdo real.

## Performance: Home é ISR, Resultados é sempre dinâmica

`/` declara `export const revalidate = 300` — sem isso, `next build`
gerava a Home como página 100% estática (as queries de destaques/listas
rodam em build time, ficando presas até o próximo deploy). Com ISR de 5
minutos, mantém o benefício de CDN/SEO da página estática mas atualiza
periodicamente. `/escolas` já nasce dinâmica (Next.js detecta o uso de
`searchParams` automaticamente) — cada combinação de filtro é uma URL
renderizada no servidor, nunca client-only.

## Testado

- SQL (`execute_sql`, dados reais de MT): `p_school_type` bate exatamente
  2.246/476 (público/privado); busca por nome ("CORACAO DE JESUS") = 8,
  ignora `p_municipality` quando presente; paginação (`p_limit`/
  `p_offset`) troca a primeira linha entre páginas; `campaigns`/`reviews`
  vazios confirmados (0 linhas cada) — `is_sponsored=false`/`avg_rating=0`
  em todo resultado é o valor honesto, não um bug; `p_min_rating=4`
  exclui tudo (correto, dado que não há avaliação real ainda); `anon`
  chama a função com o mesmo resultado da conexão privilegiada (RLS
  aplicada de verdade); `record_analytics_event` grava como `anon` mas
  `anon` não consegue ler de volta (policy admin-only intacta); tipo de
  evento inválido é rejeitado com exceção clara.
- Manual via Playwright (Chromium headless, desktop 1280px e mobile
  375px): Home → busca por CEP/cidade → navega para `/escolas` com
  querystring correta; filtro de tipo/ordenação atualiza a URL e os
  resultados; paginação avança para uma página com resultados diferentes;
  busca por nome da escola navega e filtra corretamente; card de
  resultado linka para o placeholder de escola com a URL
  `/escolas/{uf}/{município-slug}/{slug}` correta; `/escolas` sem nenhum
  parâmetro mostra o prompt de localização **e** ainda lista escolas
  (nunca bloqueia a busca); zero erro de console de lógica de aplicação
  em qualquer cenário.
- **Observação de ambiente, não bug de código**: durante testes
  repetidos nesta sessão, o tile server público da OSM parou de responder
  (zero tiles carregados) — inclusive na página `/dev/style-guide` do
  Prompt 05, código inalterado e já validado antes. Confirma na prática o
  motivo de `docs/architecture/mapas-localizacao.md` tratar o provider
  público como default substituível, não dependência rígida: mesmo com
  0 tiles, a página continuou 100% funcional (busca, filtros, cards,
  paginação, marcadores) — o design não-crítico do mapa se comportou
  exatamente como o esperado sob uma falha real, não só simulada.

## Pendências conhecidas (fora de escopo deste prompt)

- Página de escola/lista de verdade — Prompt 07.
- `/escolas/[estado]` e `/escolas/[estado]/[cidade]` como landing pages
  de SEO indexáveis (título/description/canonical/OG/JSON-LD) — Prompt
  15; hoje `/escolas` cobre a mesma função via querystring, funcional mas
  não otimizada para SEO de cidade/estado.
- `session_id`/correlação de sessão anônima em analytics — Prompt 14.
- SEC-008 (rate limiting) nas Server Actions públicas — mesma pendência
  já registrada no Prompt 05, ainda não endereçada, ainda Prompt 16.
- Pesos do algoritmo de relevância configuráveis no admin — Prompt 13.
