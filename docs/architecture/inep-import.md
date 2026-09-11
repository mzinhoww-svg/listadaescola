# Listada Escola — INEP Import (MT)

## Fonte

Arquivo fornecido pelo projeto:
`lista_escolas_com_cep (1) (1).csv`

A importação deve começar pelo estado `MT` e ser incremental por `inep_code`.

## Mapeamento

| CSV | Banco |
|---|---|
| `código_inep` | `schools.inep_code` |
| `escola` | `schools.name` |
| `uf` | `schools.uf` |
| `município` | `schools.municipality` |
| `localização` | `schools.location_type` |
| `localidade_diferenciada` | `schools.differentiated_location` |
| `categoria_administrativa` | `schools.school_type` |
| `endereço` | `schools.address` |
| `telefone` | `schools.phone` |
| `dependência_administrativa` | `schools.administrative_dependency` |
| `categoria_escola_privada` | `schools.private_school_category` |
| `conveniada_poder_público` | `schools.public_power_agreement` |
| `regulamentação_pelo_conselho_de_educação` | `schools.education_council_regulation` |
| `porte_da_escola` | `schools.school_size` |
| `etapas_e_modalidade_de_ensino_oferecidas` | `schools.education_offerings` |
| `outras_ofertas_educacionais` | `schools.other_education_offerings` |
| `restrição_de_atendimento` | `schools.attendance_restriction` |
| `latitude` | `schools.latitude` |
| `longitude` | `schools.longitude` |
| `cep` | `schools.cep` |
| `fonte_cep` | origem registrável no processo de importação; não substituir `source` |

## Regras

1. Filtrar `uf = MT` no primeiro carregamento.
2. Normalizar `código_inep` como texto com 8 dígitos.
3. Normalizar CEP para formato `#####-###` antes da gravação, preservando a informação original no staging.
4. Converter latitude/longitude vazias para `NULL`.
5. `school_type`: `Pública` → `PUBLIC`; `Privada` → `PRIVATE`.
6. `inep_code` é a chave de upsert.
7. Uma nova importação não deve apagar escola fisicamente.
8. Mudanças devem ser aplicadas apenas aos campos controlados pela origem INEP.
9. Dados editoriais do Listada nunca devem ser sobrescritos pelo importador.
10. Registros sem coordenadas permanecem válidos e serão localizáveis por CEP/município.

## Implementação

Pipeline em três estágios, cada um implementado uma única vez e reaproveitado
por estado (parâmetro `state_code`, nunca hardcoded):

1. **CSV -> staging** (`scripts/import-inep.ts`, fora do banco — Postgres não
   lê arquivo local arbitrário). Faz parsing RFC4180 (`csv-parse/sync`, para
   não quebrar em campos com vírgula embutida, ex. `endereço`), filtra por
   `--state`, limpa o staging daquele estado (`delete ... where raw_uf = ...`)
   e insere em lotes de 500 linhas. Todas as colunas ficam como `text` cru —
   nenhuma validação/normalização acontece nesta etapa.
2. **Staging** (`inep_import_staging`, migration
   `20260910202000_inep_import_pipeline.sql`): espelho raw/untyped do CSV.
   RLS habilitado com zero policies (SEC-001) — apenas a service role
   grava/lê; nunca exposto a `anon`/`authenticated`. Recarregado por
   truncate-and-reload (delete por `raw_uf`) a cada execução, não é
   apensado.
3. **Validação + normalização + merge** (`merge_inep_staging(p_state_code,
   p_lat_min, p_lat_max, p_lon_min, p_lon_max)`, mesma migration): uma única
   função SQL, revisável e re-executável isoladamente (via `execute_sql` ou
   qualquer chamador futuro, sem depender do script de CSV). Descarta linhas
   com `raw_school_type` fora de `Pública`/`Privada` ou `código_inep` vazio,
   normaliza os demais campos e faz upsert em `schools` por `inep_code`
   (chave de conflito). O guard `where (...) is distinct from (...)` no
   `on conflict do update` compara apenas colunas de origem INEP — nunca
   toca `is_active`, `school_profiles` ou qualquer outro campo editorial —
   e faz com que uma reexecução sem mudança real na origem seja um no-op
   verdadeiro (nem sequer grava `updated_at`). `slug` é gerado uma vez no
   insert e nunca recalculado (URLs estáveis). Revoked de `public`/`anon`/
   `authenticated`; só é chamável pela service role.

Comando reproduzível (task "Criar comando reproduzível"):

```bash
npm run import:inep -- --csv path/to/dataset.csv --state MT \
  --lat-min -19.0 --lat-max -6.5 --lon-min -62.5 --lon-max -49.0
```

Requer `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente
(`inep_import_staging` só aceita a service role — nunca rodar com a anon
key). Os limites de bounding box são opcionais; sem eles,
`merge_inep_staging()` usa a caixa do Brasil inteiro (menos precisa para
desambiguar coordenadas corrompidas — ver seção seguinte).

## Correção de latitude/longitude corrompidas

Bug real encontrado no export de origem: `latitude`/`longitude` chegam sem
ponto decimal, com o inteiro resultante reagrupado por milhar. Exemplo real
de MT (`raw_latitude` de `EMCARLOS POMPERMAYER`, código `51000016`):

```
"-1.342.655.851"   (deveria ser -13,42655851)
```

`inep_reconstruct_coordinate(raw, candidate_int_digits, lo, hi)` reverte
isso removendo todos os separadores e testando, em ordem, cada quantidade
candidata de dígitos inteiros — reinserindo o ponto decimal naquela posição
e aceitando o primeiro resultado que cai dentro de `[lo, hi]`. Longitude no
Brasil sempre tem 2 dígitos inteiros (`array[2]`); latitude tem 1 ou 2
(`array[2, 1]`, tenta 2 primeiro). Nunca adivinha nem fabrica: se nenhum
candidato cair no intervalo (ou o valor de origem for vazio/nulo), o
resultado é `NULL` — a escola permanece válida e localizável por
CEP/município (PRD RN-004), nunca é descartada por isso.

## Qualidade observada no recorte MT

- 2.722 escolas
- 141 municípios
- 2.722 códigos INEP únicos
- 2.246 públicas
- 476 privadas
- 1.178 registros sem latitude/longitude
- 123 registros sem telefone

Números conferidos de duas formas independentes: (1) contagem direta em
`public.schools` após o merge real e (2) parsing do CSV nacional bruto
(181.065 linhas, todos os estados) filtrado por `uf = MT` fora do banco,
usando a mesma lógica de mapeamento do `scripts/import-inep.ts`. As duas
fontes batem exatamente com os números acima, incluindo 2.246
públicas/476 privadas e zero `código_inep` duplicado.

## Teste de idempotência

`merge_inep_staging()` foi testado com três execuções sobre os dados reais
de MT:

1. **Primeira execução**: `inserted: 2722, updated: 0, unchanged: 0`,
   `schools_missing_coordinates: 1178` — bate com o recorte observado.
2. **Segunda execução, staging inalterado**: `inserted: 0, updated: 0,
   unchanged: 2722` — reexecutar sem mudança na origem é um no-op
   verdadeiro, não apenas "sem duplicar linhas".
3. **Preservação de campo editorial**: `is_active` de uma escola real foi
   alterado manualmente para `false`; rodar o merge de novo não tocou nem
   `is_active` nem `updated_at` daquela linha (confirmado por reconsulta
   direta) — o guard `is distinct from` do upsert de fato exclui colunas
   editoriais da comparação. Valor restaurado para `true` ao final do
   teste.

## Estratégia de expansão

A mesma pipeline deve aceitar `state_code` como parâmetro e reaproveitar o mesmo schema para GO, RO, MS e demais estados.

Para importar um novo estado, basta rodar o mesmo comando reproduzível
(ver "Implementação") trocando `--csv`, `--state` e a bounding box:

```bash
npm run import:inep -- --csv path/to/dataset.csv --state GO \
  --lat-min -19.5 --lat-max -12.4 --lon-min -53.3 --lon-max -45.9
```

Nenhuma mudança de schema, função ou script é necessária — `state_code` e
os limites de coordenada já são parâmetros desde a primeira versão da
pipeline. A bounding box é opcional (default cobre o Brasil inteiro) mas
recomendada por estado para desambiguar melhor coordenadas corrompidas
(ver "Correção de latitude/longitude corrompidas").
