# Listada Escola — Wizard de contribuição de lista (Prompt 10)

Fluxo autenticado Escola → Ano/Série → Itens → Anexo → Revisão → Envio →
Confirmação (PRD RF-007, wireframes Grupo B). Único caminho de escrita em
`list_submissions`/`submission_items`/`submission_attachments`; nunca
escreve em `school_lists` (RN-003, RN-004) — isso só acontece via
`approve_submission()` (SECURITY DEFINER, Prompt 02), que é trabalho do
Prompt 11.

## Schema, RLS, storage e moderação já existiam — este prompt é só a
## camada de aplicação

Investigação inicial confirmou que o Prompt 02 já tinha construído tudo
que "contribuição" precisa em nível de banco: `list_submissions` /
`submission_items` / `submission_attachments` / `school_suggestions` com
RLS completo (ownership-scoped, editável só em `DRAFT`/`NEEDS_CORRECTION`
via `list_submissions_update_own_editable` + o trigger
`guard_submission_status_transition`), o bucket privado `submissions`
(10MB, `application/pdf`/`image/jpeg`/`image/png`, convenção de path
`{user_id}/{submission_id}/{arquivo}`), e até
`approve_submission()`/`reject_submission()`/`request_submission_correction()`
já eram funções reais. **Zero migrations novas neste prompt** — só
`src/lib/contributions/*`, componentes e rotas.

## "Ano/Série" é uma tela só, não duas — PRD decide, não o placeholder antigo

O placeholder criado no Prompt 03 dizia "Etapa 1 de 6 · Escola → Ano →
Série → Itens → Anexo → Revisão" (6 nomes). Mas o wireframe oficial (PRD
seção 17, Grupo B) lista **"12. Ano/série"** como uma tela única, não duas
separadas (#11 Escola, #12 Ano/série, #13 Itens, #14 Upload, #15 Revisão,
#16 Confirmação). Como o texto do meu próprio placeholder era só um
rascunho de uma sessão anterior — não uma fonte de autoridade — segui o
PRD: 5 etapas nomeadas (`WizardSteps`) + confirmação como estado terminal
fora da contagem.

## Por que a linha DRAFT só existe a partir da Série (não antes)

Escola/Ano/Série ficam em estado local de um Client Component
(`NewSubmissionWizard`) até o usuário confirmar a série — só nesse ponto
`startSubmissionAction` faz o primeiro `insert` em `list_submissions`
(reaproveitando um rascunho existente com a mesma
escola/etapa/série/ano, se houver, em vez de duplicar). A partir daí, a
"autosave" pedida pelo prompt é literal: cada item adicionado, cada
anexo enviado, é uma escrita real no banco na hora, não um rascunho local
que precisa ser salvo depois. Isso também é por que não existe perda de
estado no fluxo "anônimo → login → volta pro wizard": o layout do grupo
de rotas já chama `requireUser("/enviar-lista")` (Prompt 03), e o
middleware (`src/proxy.ts` — Next.js 16 renomeou `middleware.ts` para
`proxy.ts`) já preserva o path completo (`next=`) para qualquer rota
aninhada `/enviar-lista/[id]/...`, sem precisar de nenhum código novo
aqui.

## IDOR e estado editável: cada etapa se defende sozinha

`getOwnSubmissionDetail(id)` (React.cache) filtra por
`submitted_by = auth.uid()` explicitamente — não depende só da RLS para
essa garantia ficar legível no código (SEC-002). O layout
`enviar-lista/[id]/layout.tsx` só resolve existência/ownership (redireciona
pra `/enviar-lista` se não achar ou não for dono — mesmo resultado pros
dois casos, nunca distinguível de fora). Cada etapa (`itens`/`anexo`/
`revisao`) faz sua própria checagem de status editável e redireciona pra
`confirmacao` se não for mais `DRAFT`/`NEEDS_CORRECTION` — `confirmacao`
em si nunca tem essa restrição (precisa ficar acessível em qualquer
status pra servir de tela de "status da contribuição", wireframe #17).
Toda Server Action (`add`/`update`/`delete` de item, anexo, `submit`)
revalida ownership + status editável de novo no servidor antes de
escrever — nunca confia que a UI já filtrou isso (SEC-003).

## Upload de anexo: por que NÃO é direto do browser pro Storage

A RLS do bucket `submissions` (`submissions_owner_insert`) foi desenhada
claramente pensando em upload direto do browser (path `{auth.uid()}/...`,
sem depender de join nenhum). Foi a primeira tentativa de implementação
aqui: um client Supabase novo (`@supabase/ssr`'s `createBrowserClient`)
chamando `storage.from('submissions').upload()` direto do
`AttachmentUploader`.

**Bug real encontrado em teste** (não só neste ambiente de sandbox — ver
nota abaixo): `supabase.auth.getUser()` chamado no browser nunca
resolvia — nem erro, nem timeout, só ficava pendente pra sempre,
travando o botão em "Enviando...". Rastreado até um anti-padrão
documentado do próprio Supabase: `createBrowserClient()` cria uma
instância nova de `GoTrueClient` a cada chamada, e múltiplas instâncias
no mesmo browser context competem pelo mesmo mutex baseado em Web Locks
usado pra coordenar refresh de token — a segunda chamada trava esperando
um lock que a primeira nunca solta de verdade. Corrigido primeiro como
singleton (`let client` em nível de módulo) — melhorou mas não resolveu
sozinho, porque a causa real neste ambiente específico é mais profunda:
chamadas HTTPS diretas do processo do browser (Playwright/Chromium) pra
`*.supabase.co` nunca completavam (request saía, nunca voltava resposta),
mesmo com proxy explícito configurado no `chromium.launch()` — o sandbox
de execução deste ambiente aparentemente só permite tráfego de saída
mediado pelas próprias ferramentas do agente, não conexões arbitrárias
iniciadas por um processo de browser automatizado.

**Decisão:** em vez de insistir num client Supabase no browser (que
ficaria sem cobertura de teste neste ambiente, e adiciona uma classe
inteira de bug — múltiplas instâncias de `GoTrueClient` — que mais
nenhum lugar do projeto tem), o upload passou a ser um Route Handler
(`POST /api/contributions/attachments`, `src/app/api/contributions/attachments/route.ts`):
o browser manda o arquivo como `FormData` pro próprio servidor Next.js
(que já é comprovadamente confiável pra falar com o Supabase — toda
Server Action do projeto depende disso), o handler revalida ownership +
status editável + MIME + tamanho, sobe pro Storage com o client
server-side, insere a linha de `submission_attachments`, e limpa o objeto
do Storage se a linha falhar depois. Sem cliente Supabase novo no
browser (`src/lib/supabase/browser.ts` foi criado e depois removido nesta
mesma sessão). Route Handler (não Server Action) porque Server Actions
têm um limite de corpo de 1MB por padrão no Next.js — Route Handlers não
têm esse teto artificial, só o limite real do bucket (10MB).

**Limitação conhecida, não resolvida aqui:** rotear o arquivo pelo
próprio servidor consome memória/tempo de execução da function e pode
esbarrar em limites de payload da plataforma de deploy (Vercel) pra
arquivos grandes — não confirmado se afeta os 10MB permitidos pelo bucket
neste projeto especificamente. Se isso virar problema real em produção, a
alternativa é gerar uma signed upload URL no servidor
(`createSignedUploadUrl()`) e o browser fazer um `PUT` cru pra ela (sem
precisar de nenhum SDK Supabase no cliente) — mas essa alternativa não
pôde ser testada neste ambiente pela mesma limitação de rede descrita
acima, então fica registrada aqui como possível trabalho futuro (Prompt
19 — Vercel produção), não implementada especulativamente.

## Sugerir escola: formulário único, não wizard

`school_suggestions` usa o mesmo enum `submission_status` de
`list_submissions`, mas **não tem policy de UPDATE/DELETE pro dono** —
só `select_own`/`insert_own`/`admin_all`. Ou seja: ao contrário de lista,
sugestão de escola é inerentemente "envie uma vez, não edite depois", sem
necessidade de rascunho/autosave. Por isso `/sugerir-escola` é um
formulário único (Dados/Endereço/Contato agrupados numa tela mobile-first
só), não um wizard de múltiplas telas como o placeholder original sugeria
— a fonte real dessa decisão é a ausência de RLS de edição, não uma
escolha estética.

## O que "obrigatório" significa em cada lugar (evitar confusão)

O prompt pede "Itens com nome, quantidade, unidade, marca, obrigatório e
observação" — "obrigatório" aí é a coluna `is_required` de **cada item**
(ex.: "caderno é obrigatório, lápis de cor é opcional"), não upload de
anexo obrigatório pra enviar a lista inteira. Anexo continua opcional
(nem todo mundo tem foto/PDF da lista oficial em mãos); a única validação
de conteúdo mínimo pra `submitSubmissionAction` permitir `SUBMITTED` é
ter pelo menos 1 item.

## Testes realizados

`list_submissions`/`submission_items`/`submission_attachments`/
`school_suggestions`/`auth.users` estavam todos em 0 linhas antes deste
prompt (confirmado por query). Usuário de teste criado **direto via SQL**
(`insert into auth.users` com `extensions.crypt()`/`extensions.gen_salt('bf')`
pra senha, id legível seguindo o padrão já usado em prompts anteriores),
não pelo formulário real de cadastro — o Supabase Auth rejeita o domínio
de e-mail de teste (`@listadaescola-test.com`) com `email_address_invalid`
no `/signup` real (confirmado via `query_logs`), então inserir direto é o
único jeito de criar uma conta de teste utilizável sem depender de e-mail
de verdade; o trigger `handle_new_user()` (Prompt 03) cria a linha de
`profiles` automaticamente, então login pela UI real funciona normalmente
depois.

Fluxo completo testado ao vivo (Playwright, contra uma escola real de MT
do import INEP): busca de escola → seleção → etapa de ensino/série/ano →
adicionar 2 itens (um obrigatório, um opcional) → sair e voltar pra
`/enviar-lista` confirmando que o rascunho aparece em "Continuar envio"
com o item já salvo (autosave real, não simulado) → continuar → upload de
anexo real (PNG mínimo válido) → revisão mostrando os 2 itens + o anexo
corretamente → enviar → confirmação "Lista enviada!". Também testado:
visitar a etapa de itens de um envio já `SUBMITTED` redireciona pra
confirmação (não permite reeditar); IDOR (id de envio inexistente
redireciona pra `/enviar-lista`, mesmo destino de "não existe" — sem
diferenciar de "existe mas não é seu"); segundo rascunho criado e
descartado (`discardDraftAction`, some da lista de retomada); sugestão de
escola enviada com sucesso. 19/19 verificações passaram na rodada final.
Limpeza confirmada por query: todas as tabelas envolvidas voltaram a 0
linhas, incluindo os 3 objetos reais do bucket `submissions` (removidos
via Storage API — `delete` direto em `storage.objects` é bloqueado por um
trigger `protect_delete()` do próprio Supabase, "Use the Storage API
instead").

## Fora do escopo deste prompt

- Moderação (aprovar/rejeitar/pedir correção) — Prompt 11. As funções já
  existem desde o Prompt 02; só falta a UI admin que as chama.
- Autocomplete de série a partir de `school_series` existente — não
  pedido pelo prompt, mantido como input de texto livre (uma série pode
  não existir ainda em `school_series`, ver `docs/architecture/escola-serie-lista.md`).
  Simples, sem essa camada extra de sugestão.
- Signed upload URL direto pro Storage — ver seção acima.
