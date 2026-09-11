# Listada Escola — Ranking + Patrocínio (Prompt 13)

Separar `organic_score`, `rating_score` e `sponsored_priority` (RF-003,
RN-008, wireframe #24), com pesos do ranking orgânico configuráveis no
backend/admin — nunca em React. O schema de patrocínio (`campaigns`) já
existia inteiro desde o Prompt 02, deliberadamente deixado intocado pelos
Prompts 10-12 com o comentário "Prompt 13's job" — este prompt é a
primeira vez que ele é realmente usado.

## Três dimensões, três colunas separadas — nunca misturadas

`search_schools()` (Prompt 06) já seguia o princípio central do RF-003
("pagamento não altera a nota orgânica da escola"): sinal orgânico
(`relevance_score`) e sinal de patrocínio (`is_sponsored`/
`sponsor_priority`) já eram colunas separadas, patrocínio só desempatava
*posição*, nunca entrava na nota. O que faltava era literal: os nomes
`organic_score`/`rating_score`/`sponsored_priority` do texto do prompt
não existiam como identificadores reais (a PRD usa "Relevância
orgânica"/"Avaliação"/"Patrocínio", termos diferentes dos do prompt) —
e a PRD, mais especificamente, separa "Relevância orgânica" de
"Avaliação" como dois bullets distintos do RF-003, confirmando que
`rating_score` nunca deveria ser um componente de `organic_score`.

Renomeado: `relevance_score` → `organic_score`, `sponsor_priority` →
`sponsored_priority` (zero consumidores em TS antes da migration —
`SchoolResult` é derivado direto do tipo de retorno do RPC, confirmado
por `tsc --noEmit` limpo após regenerar os tipos). Novo: `rating_score`
= `avg_rating / 5`, arredondado, mesmo intervalo ~0-1 de `organic_score`
— `avg_rating` continua existindo sem alteração (é o valor de exibição
em estrelas que `SchoolCard` já usa).

## organic_score: de 4 fatores hardcoded para 5 fatores com peso configurável

Fórmula anterior (Prompt 06): proximidade (peso 0.5) + listas aprovadas
(0.3) + verificação (0.1) + volume de avaliações (0.1) — constantes
fixas no PL/pgSQL, `favorite_count` já calculado na query mas nunca
usado na nota.

Fórmula nova, mapeando os cinco fatores literais do prompt ("distância,
popularidade, listas aprovadas, completude e qualidade"):

| Fator | Cálculo | Peso padrão |
|---|---|---|
| Distância | `1/(1+distance_km)`, neutro 0.5 sem coordenada (nunca fabrica distância, RN-009) | 0.35 |
| Popularidade | `min(review_count + favorite_count, 15) / 15` — combinação nova, `favorite_count` finalmente usado | 0.25 |
| Listas aprovadas | `min(list_count, 5) / 5` (igual ao anterior) | 0.20 |
| Completude | fração de `school_profiles` preenchido (description/logo_url/website/instagram/whatsapp, 0 a 5 campos) | 0.10 |
| Qualidade | `is_verified` (igual ao anterior, renomeado conceitualmente) | 0.10 |

"Popularidade" e "listas aprovadas" deliberadamente não se sobrepõem —
popularidade é avaliações+favoritos, listas é uma contagem separada
(uma escola é útil mesmo com poucas avaliações se já tem listas reais,
o objeto central do produto).

## Pesos: tabela singleton, nunca em React

`ranking_weights` — uma linha fixa (`id boolean primary key default
true` + `check (id)`, o truque padrão de Postgres para "no máximo uma
linha, sempre"), sem policy de leitura pública (só admin via
`ranking_weights_admin_all`; `search_schools()` lê como `SECURITY
DEFINER`, então nunca depende dessa policy). `admin_update_ranking_weights()`
valida soma ≈ 1.0 (tolerância de 0.01) e cada peso ≥ 0, audita em
`audit_logs`. React nunca lê nem calcula peso algum — só envia os 5
números que o admin digitou; o RPC valida e a query usa.

## Achado real: `campaigns` era invisível para usuários reais

`search_schools()` era `SECURITY INVOKER`; `campaigns` só tem
`campaigns_admin_all` (nenhuma policy pública). Com campanhas reais
(diferente do Prompt 06, que testou com `campaigns` vazia — "anon
recebe o mesmo resultado da conexão privilegiada" só era verdade porque
não havia nada pra RLS esconder), um visitante comum nunca veria
`is_sponsored=true`, mesmo com uma campanha ativa de verdade: a RLS do
`campaigns` filtraria a CTE de patrocínio pra zero linhas antes mesmo de
chegar no `is_sponsored`.

Corrigido trocando para `SECURITY DEFINER` — só os dois campos
derivados (`is_sponsored` boolean, `sponsored_priority` int) saem da
função; a tabela `campaigns` crua nunca é exposta a ninguém que não seja
admin. Confirmado ao vivo com `set local role anon` + uma campanha real:
antes do fix seria `false`/`0` sempre; depois, `is_sponsored=true`
corretamente visível como `anon` de verdade — e o `organic_score`/
`rating_score` da escola patrocinada continuam idênticos, byte a byte,
ao valor sem patrocínio (confirmado comparando a mesma query antes/depois
de inserir a campanha).

## Dois bugs reais de SQL, achados só ao rodar de verdade

1. **`id` ambíguo**: `search_schools()` tem `id uuid` no `RETURNS TABLE`,
   que vira variável PL/pgSQL implícita em todo o corpo da função — a
   mesma armadilha já documentada no comentário do Prompt 06 para
   `distance_km`/`list_count`/etc., desta vez pegando a linha nova
   `where id = true` (deveria ser `ranking_weights.id`). Só falha em
   tempo de chamada, não em `CREATE FUNCTION` — só apareceu ao rodar
   `search_schools()` de verdade via `execute_sql`.
2. **`max(uuid)` não existe**: Postgres nunca registrou um agregado
   MAX/MIN pra `uuid` (tem operador de comparação pra índice btree, mas
   nenhum agregado por cima). `admin_create_campaign()` usava
   `select count(*), max(id) into ...` pra achar "o id, se só um nome
   bateu" — corrigido separando em duas consultas (conta primeiro,
   valida, só então busca o id com `limit 1`, sem agregado nenhum).

Ambos corrigidos em migrations de follow-up (nunca editando a já
aplicada), mesmo padrão de todo achado anterior nesta sequência.

## Achado real, o mais sério: forms em Drawer nunca reenviavam depois de um erro

Testando "criar campanha com nome inexistente → ver erro → corrigir o
nome → reenviar" pela primeira vez nesta sequência de prompts (nenhum
teste anterior, incluindo o do Prompt 12, tinha exercido esse caminho
específico de "falhar uma vez, corrigir, reenviar sem fechar o
formulário"), o segundo envio simplesmente não fazia nada — sem erro
novo, sem sucesso, zero requisição de rede. Confirmado com instrumentação
de rede real (clique real E `form.requestSubmit()` programático,
contra `next dev` e `next build && next start`, eliminando timing/HMR
como causa): um `<form action={formAction}>` ligado a `useActionState`
só dispara a Server Action **uma vez** por montagem, quando o formulário
vive dentro do Portal de um Drawer/Modal (Radix Dialog) — a segunda
tentativa no mesmo formulário montado (erro ou sucesso) nunca gera uma
nova requisição, nem por clique real nem por chamada programática.

Isso não é específico de `CampaignFormDrawer` — é o mesmo padrão
(`useActionState` + `action={formAction}` + `SubmitButton` dentro de um
`Drawer`) usado nos quatro formulários de criar/editar do Prompt 12
(`StoreFormDrawer`, `EcommercePartnerFormDrawer`, `ProductFormDrawer`,
`EcommerceProductFormDrawer`) — nenhum deles tinha sido testado nesse
caminho específico (só criar-com-sucesso-na-primeira-tentativa), então o
mesmo bug ficou sem ser descoberto até agora. Corrigido nos cinco:
`src/hooks/use-drawer-form-action.ts` (novo hook compartilhado) substitui
`useActionState`+`action=` por um `onSubmit` comum que chama a Server
Action diretamente via `useTransition`, sem depender do React re-ligar o
`action` nativo entre renders — funciona de forma confiável em toda
tentativa, confirmado corrigindo o problema nos cinco formulários.
`useCloseOnActionSuccess` (Prompt 12) ficou sem nenhum consumidor depois
da migração e foi removido.

## Admin: `/admin/patrocinios`

Item de nav já existia (placeholder desde o Prompt 03). Duas seções:

- **Campanhas**: criar (tipo + nome exato da escola/papelaria, resolvido
  server-side por `ilike` exato — sem autocomplete, o admin copia o nome
  da tela de Escolas/Papelarias; erro claro se não achar ou achar mais de
  uma) + período + prioridade; status via botões contextuais (Ativar
  agora/Retomar/Pausar/Encerrar) — sem edição de data/prioridade depois
  de criada, mesmo espírito "fechar e abrir de novo" das listas
  arquivadas (Prompt 12): um erro de data vira uma campanha pausada +
  uma nova, não uma edição silenciosa de um registro já ativo.
- **Pesos do ranking orgânico**: os cinco números, validados no servidor.

## Testes realizados

`campaigns`/`ranking_weights` (exceto a linha singleton seed)/
`audit_logs`/`auth.users de teste` em 0 antes deste prompt. Um admin de
teste (mesmo motivo dos prompts anteriores: `/signup` real rejeita o
domínio de e-mail de teste).

Verificado direto por SQL antes de qualquer UI: fórmula do `organic_score`
bate o cálculo manual esperado (0.175 = 0.5 neutro × peso 0.35 de
distância, sem nenhum outro sinal, numa escola sem reviews/listas/perfil);
patrocínio muda só a posição (`is_sponsored`/`sponsored_priority`),
`organic_score`/`rating_score` idênticos antes/depois; `anon` real (via
`set local role anon`) vê `is_sponsored=true` corretamente.

Playwright + SQL, ao vivo, contra `next build && next start` (não
`next dev`, pra eliminar Fast Refresh como variável depois do achado do
Drawer): RBAC; pesos com soma inválida rejeitados com erro claro; pesos
válidos persistem após reload; criar campanha com nome inexistente
mostra erro; **corrigir o nome e reenviar no mesmo Drawer agora funciona**
(a verificação real do achado principal); campanha nova nasce "Agendada";
ativar/pausar/encerrar mudam o status e o `audit_logs` corresponde;
**escola patrocinada aparece em primeiro nos resultados reais de
`/escolas`** (ordem de cards confirmada, não só a presença do badge) e o
badge PATROCINADA (`SchoolCard`, já existente desde o Prompt 06) aparece
pra um visitante anônimo de verdade, sem nenhuma mudança de UI pública
necessária. 15/15 verificações passaram. Limpeza confirmada por query:
todas as tabelas de teste voltaram a 0, pesos restaurados ao padrão de
lançamento, nenhuma das duas escolas reais usadas no teste teve
`is_active`/dado próprio alterado.

## Fora do escopo deste prompt

- Ranking/patrocínio de papelarias (`nearby_stores()`, Prompt 09) — sem
  nenhuma pontuação de relevância hoje (só ordena por distância), e o
  texto deste prompt não menciona papelarias. `campaigns.entity_type`
  já suporta `STORE` e a página `/admin/patrocinios` já permite criar
  campanha pra papelaria — só falta `nearby_stores()`/`StoreCard`
  consumirem isso, deixado para quando houver pedido explícito.
- `school_profiles.is_sponsored`/`stores.is_sponsored` (colunas booleanas
  diretas, distintas de `campaigns`) continuam não lidas por nenhuma
  query real — mesmo estado de antes deste prompt, não decidido aqui.
- "Performance" de campanhas (cliques/impressões por patrocínio, PRD
  seção 16) depende de agregação de `analytics_events` — Prompt 14.
- Autocomplete de entidade no formulário de campanha — nome exato via
  busca `ilike` é suficiente pro volume esperado, mas é uma limitação
  real de UX se o catálogo de escolas/papelarias crescer muito.
