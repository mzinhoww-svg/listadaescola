# Testes E2E (Prompt 17)

Suite Playwright cobrindo as jornadas principais do produto ponta-a-ponta,
contra um `next dev`/`next start` real e o projeto Supabase real
(`wfdejmokxrunupsekcmq`). Não há stack Supabase local nem CI neste
projeto (`docs/development/WORKFLOW.md`) — este documento é o runbook
real de como rodar a suite hoje.

## Por que não há `globalSetup`/service-role key

Os fixtures NÃO são criados pelo Playwright (`globalSetup`/`globalTeardown`
com uma service-role key). `SUPABASE_SERVICE_ROLE_KEY` não existe em
nenhum `.env.local` nem em `src/` (achado do Prompt 16,
`docs/security/final-audit.md`) e este projeto optou por manter assim —
adicionar a chave só para testes locais reintroduziria exatamente o
segredo que o audit confirmou ausente.

Em vez disso, o seed e o cleanup são dois scripts SQL, rodados
manualmente (ou pelo agente, via `mcp__Supabase__execute_sql`) fora do
Playwright:

- `supabase/tests/e2e-seed.sql`
- `supabase/tests/e2e-cleanup.sql`

Mesma disciplina seed → teste → cleanup já usada em todo teste ao vivo
deste projeto (RLS/IDOR do Prompt 02, autenticação do Prompt 03, etc.).

## Como rodar a suite

1. Rodar `supabase/tests/e2e-seed.sql` uma vez (SQL editor do Supabase ou
   `mcp__Supabase__execute_sql`). Ele:
   - cria 3 usuários (`e2e-p17-user@example.com`, `e2e-p17-user-b@example.com`,
     `e2e-p17-admin@example.com`, senha `E2ePr0mpt17!`, o terceiro
     promovido a `ADMIN`);
   - escolhe uma escola **real** e ativa de MT sem lista ainda (nunca
     fabrica uma — `schools` é master data do INEP, ver CLAUDE.md),
     determinística (`order by inep_code limit 1`, código INEP é
     permanente, então re-rodar o seed mais tarde escolhe a mesma escola);
   - publica uma lista/versão/itens para ela, mais um parceiro de
     e-commerce, produto, mapeamento produto↔item e uma papelaria —
     tudo prefixado `e2e-p17-` para o cleanup encontrar sem ambiguidade.
2. Copiar os ids retornados para `e2e/fixtures.ts` (`FIXTURE`) — já
   preenchido com os valores da run atual; só precisa ser atualizado se o
   seed for re-rodado do zero (ex. depois de um cleanup) e gerar ids
   novos.
3. Rodar `npm run dev` (ou `npm run build && npm run start`) num
   terminal.
4. Rodar `npm run test:e2e` (== `playwright test`) noutro.
5. Rodar `supabase/tests/e2e-cleanup.sql` para remover tudo que o seed E
   os próprios testes criaram ao vivo (submissions das jornadas 3/4 e da
   IDOR, mais a lista/versão real que a aprovação da jornada 4 publica
   além da que o seed inseriu direto). O script tem uma `select` de
   sanity-check antes dos deletes e uma de verificação (`remaining_*`,
   todas devem ser 0) no final.

`analytics_events` gerados pelos testes (`school_view`, `commerce_click`,
`whatsapp_click`, ...) **nunca são apagados** — mesma prática de todo
teste ao vivo deste projeto (contagens de evento são dado histórico
real); o cleanup só zera as FKs que apontariam para as linhas de teste
removidas.

### `PLAYWRIGHT_CHROMIUM_PATH` (opcional)

Sem essa variável, o Playwright resolve seu próprio browser gerenciado
normalmente (`npx playwright install`). Ela só precisa ser definida
quando a revisão de browser esperada pela versão instalada de
`@playwright/test` não bate com o que já existe em disco num ambiente
sandboxed com Chromium pré-instalado em um caminho fixo (o caso deste
ambiente de execução: `/opt/pw-browsers/chromium`) e baixar um novo não é
uma opção. `playwright.config.ts` só passa `launchOptions.executablePath`
quando a variável está definida — configuração portátil, sem caminho
hardcoded, para qualquer outro desenvolvedor/CI.

## As 5 specs

| Arquivo | Jornada |
|---|---|
| `01-busca-escola-lista-parceiro.spec.ts` | Anônimo: busca → escola → lista → oferta de parceiro (redirect `/api/commerce/click` verificado server-side). |
| `02-lista-papelaria-whatsapp.spec.ts` | Anônimo: lista → papelarias próximas → WhatsApp (`/api/store/whatsapp`, mensagem contém nome da escola). |
| `03-contribuicao-submit.spec.ts` | Anônimo → login (com retorno via `?next=`) → wizard completo (escola → série/ano → itens → anexo → revisão) → confirmação. |
| `04-admin-moderacao-publicacao.spec.ts` | Usuário cria submissão própria → admin inicia revisão → aprova e publica → série nova fica visível na página pública da escola. |
| `05-security.spec.ts` | IDOR (própria submissão vs. de outro usuário; lista não publicada → 404), RBAC (anônimo redirecionado, autenticado não-admin vê "Acesso restrito"), open redirect (`?next=` externo sempre cai em fallback seguro), estado vazio de busca, validação de upload (tipo/tamanho/anônimo), fallback de redirecionamento externo com parâmetro inválido. |

`05-security.spec.ts` é a cobertura direta do princípio do CLAUDE.md
"nunca confiar no frontend para autorização" — cada caso ataca o gate do
lado do servidor diretamente (URL/request direto), a maioria sem nenhum
botão a esconder no frontend para começar.

## Fixtures compartilhados (`e2e/fixtures.ts`)

`workers: 1` / `fullyParallel: false` em `playwright.config.ts` é
deliberado: os fixtures são um dataset pequeno e compartilhado (uma
escola real, uma lista, uma papelaria, dois usuários comuns + um admin),
não isolado por teste — correção e determinismo importam mais que tempo
de execução aqui, e não há CI para paralelizar entre máquinas de qualquer
forma.

Helpers principais:
- `loginAs` / `logout` — login real via form + Server Action (nunca um
  atalho de cookie); `loginAs` preserva um `?next=` já presente na URL
  em vez de descartá-lo com uma navegação nova.
- `startDraftSubmission` — percorre o wizard até o step "itens" e
  retorna o id da submissão nova (extraído da URL), para que outros
  helpers/specs possam continuar o fluxo ou (no teste de IDOR) entregar
  esse id a um usuário diferente.
- `addWizardItem` — usa `getByRole("textbox", { name: "Item" })`, não
  `getByLabel("Item")`: o nome acessível "Item" também dá match por
  substring no checkbox "Item obrigatório" (mesma classe de bug de
  colisão de label já documentada em `docs/architecture/analytics-vendas.md`).
- `submitWizard` — itens → anexo (pulado) → revisão → envio, termina na
  confirmação.

## Achado real corrigido durante este prompt: upload grande derrubava a rota

Um upload acima do limite do próprio app (10MB, `MAX_ATTACHMENT_SIZE_BYTES`
em `src/lib/contributions/constants.ts`) não caía no `400` esperado
("O arquivo deve ter no máximo 10MB.") — derrubava a rota com um `500`.
Causa raiz: o cap de tamanho de corpo de requisição em nível de
plataforma do Next.js (`experimental.proxyClientMaxBodySize`, ~10MB por
padrão) truncava o multipart **antes** de `request.formData()` rodar
dentro do route handler, corrompendo a estrutura e lançando exceção não
tratada — nunca chegava na checagem de tamanho da própria rota.
Corrigido em `next.config.ts` com
`experimental.proxyClientMaxBodySize: "11mb"`, só um pouco acima do
limite real do app: o cap de 10MB continua sendo aplicado de verdade
(pela própria rota e pelo `file_size_limit` nativo do bucket de Storage,
`supabase/migrations/20260910201800_storage.sql`) — essa mudança só
impede o cap da plataforma de disparar primeiro e transformar um erro de
validação limpo numa exceção não tratada. Correção real de app,
confirmada pelos testes `upload:` de `05-security.spec.ts`, não um
workaround de teste.

## Limitações conhecidas

- Sem CI: a suite roda manualmente (ou orquestrada pelo agente) contra um
  servidor local + o Supabase real, nunca automaticamente num pipeline.
  Quando um workflow de CI real existir para este projeto, portar este
  fluxo (seed → `test:e2e` → cleanup) para lá é o próximo passo natural —
  precisaria de uma forma seed/cleanup que não dependa de
  `mcp__Supabase__execute_sql` (única via disponível hoje).
- E-mail (recuperação de senha, verificação) não é exercitado nesta
  suite: o rate limit de envio do free tier do Supabase já é apertado
  (`docs/development/WORKFLOW.md`, seção Autenticação) e os 3 usuários de
  fixture já nascem com `email_confirmed_at` preenchido via seed SQL,
  sem passar pelo fluxo de e-mail real.
- Os ids em `e2e/fixtures.ts` ficam desatualizados se o cleanup rodar e o
  seed for re-executado do zero (novos `gen_random_uuid()` para
  usuários/lista/loja) — a escola em si permanece a mesma (pick
  determinístico por `inep_code`), mas os demais ids precisam ser
  recolhidos do retorno do seed e colados de volta no arquivo.
