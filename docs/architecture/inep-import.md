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

## Qualidade observada no recorte MT

- 2.722 escolas
- 141 municípios
- 2.722 códigos INEP únicos
- 2.246 públicas
- 476 privadas
- 1.178 registros sem latitude/longitude
- 123 registros sem telefone

## Estratégia de expansão

A mesma pipeline deve aceitar `state_code` como parâmetro e reaproveitar o mesmo schema para GO, RO, MS e demais estados.
