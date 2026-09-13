# CTA de "peça sua lista" na home + rascunho anônimo do wizard

Sub-projeto 1 de 3 na frente "melhorias para papelaria" (os outros dois —
lista como instrumento de compra, identidade visual da papelaria — ficam
para specs próprias, nessa ordem). Decidido via brainstorming +
grilling em sessão de 2026-09-13; ver histórico da conversa para o
raciocínio completo. Este documento é a referência autocontida.

## Contexto

Produção tem 2.722 escolas e, fora a fixture de QA (`qa-teste-*`,
`docs/operations/qa-fixtures.md`), **zero listas reais publicadas**
(`docs/implementation/impeccable-critique.md` §Anexo, contagem em
2026-09-12). Sem lista publicada não existe pedido de orçamento via
WhatsApp para papelaria nenhuma — o gargalo do produto não é a
qualidade da tela da papelaria, é a ausência do insumo que a alimenta.

O caminho para uma lista virar real já existe e funciona: `/enviar-lista`
→ moderação → `school_lists` publicada (Batch 5, Prompt 08). O problema
é de funil, não de mecanismo: quase ninguém chega a esse fluxo (achado
da crítica: alcançável de exatamente dois lugares no site público inteiro
— `(public)/page.tsx:98` e um link de texto em `como-funciona.tsx:52`).

## Decisão de escopo

Dentro da frente "gerar mais listas reais", este sub-projeto cobre:

1. Um CTA secundário na home linkando para o início do wizard.
2. Deixar o visitante anônimo avançar por escola → série/ano → itens
   sem conta, com o progresso guardado no navegador.
3. Pedir login/cadastro só no limite técnico real do fluxo (ver
   "Fronteira do login" abaixo), materializando o rascunho no banco
   nesse momento.
4. Analytics do funil novo.

**Fora de escopo, deliberadamente** (candidatos a sub-projetos
separados, não esquecidos):

- Capturar intenção quando a família acha a escola e não há lista
  ainda (o "beco sem saída" — resposta a uma pergunta diferente da
  crítica, §10.2). Foi comparado com esta abordagem no brainstorming
  inicial e esta venceu; aquele continua uma ideia válida para depois.
- Redesenho da tela de lista em si (`listas/[slug]/page.tsx`) como
  instrumento de compra — sub-projeto 2.
- Qualquer mudança na tela de itens *logada* além do necessário para
  reaproveitar sua UI no modo anônimo.

## Decisões (resumo)

| # | Decisão | Resposta |
|---|---|---|
| 1 | Onde o CTA aparece | Dentro do card de busca da home, abaixo de `HomeNameSearch` — link de texto, não botão primário (não compete com a busca) |
| 2 | Alcance da experiência anônima | Escola → etapa/série/ano → itens, sem conta |
| 3 | Fronteira do login | Imediatamente antes do anexo — **limite técnico real**, não só de produto (ver abaixo) |
| 4 | Onde vive o rascunho anônimo | `localStorage`, com expiração própria |
| 5 | Colisão com rascunho remoto (mesma escola/série/ano) | O rascunho local vence e sobrescreve; aviso simples na tela, não uma escolha bloqueante |
| 6 | Analytics | Evento novo no clique do CTA + evento na materialização bem-sucedida; documentado em `docs/architecture/analytics-events.md` |

### Por que a fronteira do login é ali, não em outro ponto

Não é uma preferência — é um limite real do Storage. O bucket
`submissions` (`supabase/migrations/20260910201800_storage.sql:87`)
tem RLS que exige `(storage.foldername(name))[1] = auth.uid()::text`:
o primeiro segmento do caminho do arquivo precisa ser o UUID de um
usuário autenticado de verdade. Não existe hoje (nem este sub-projeto
cria) uma convenção de pasta anônima, e abrir uma seria uma mudança de
política de segurança own its own, fora deste escopo. `POST
/api/contributions/attachments` já reforça isso no código
(`route.ts:29-33`, retorna 401 sem usuário). Como o wizard já visita
escola → série/ano → itens → anexo nessa ordem, o limite cai
naturalmente exatamente onde a etapa de itens termina.

## Arquitetura

### Fluxo de ponta a ponta

```
Home (anônimo)
  └─ "Não achou a lista da sua escola? Peça aqui"
       └─ NewSubmissionWizard (mesmo componente, novo modo "sem submissionId")
            ├─ Escolhe escola (SchoolPicker — searchSchoolsForWizardAction já é anônimo)
            ├─ Escolhe etapa/série/ano
            └─ Preenche itens (novo: grava em localStorage, não no banco)
                 └─ ao clicar "Avançar" pro anexo:
                      ├─ logado? materializa e segue direto
                      └─ anônimo? manda pro login/cadastro com next= de volta
                           ├─ login (mesma aba) → volta, localStorage intacto
                           └─ cadastro → confirmação de e-mail (pode abrir
                              aba nova) → volta, localStorage intacto
                                (é POR ISSO que é localStorage e não
                                sessionStorage — sessionStorage é por aba)
                           └─ materializeLocalDraftAction()
                                ├─ existe DRAFT remoto igual (mesma
                                │  escola+educationLevel+seriesName+
                                │  schoolYear)? sobrescreve os itens dele
                                │  e mostra aviso
                                └─ não existe? cria list_submissions (DRAFT)
                                   + school_list_items, mesma lógica de
                                   dedupe que startSubmissionAction já tem
                                     └─ limpa localStorage
                                        └─ segue pro anexo, fluxo atual
                                           inalterado a partir daqui
```

### Componentes e arquivos

**Novo — `src/lib/contributions/local-draft.ts`**
Funções puras (sem React, sem `"use client"` no módulo em si — só
manipula `localStorage`, que só existe no browser, então todo call site
precisa ser client-side):

```ts
interface LocalDraftItem { name: string; quantity: number; unit: string | null; brand: string | null; isRequired: boolean }
interface LocalDraft {
  school: SchoolSearchOption;
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  items: LocalDraftItem[];
  savedAt: string; // ISO timestamp
}

const STORAGE_KEY = "listada-rascunho-lista";
const EXPIRY_DAYS = 7; // a decidir no self-review; 7 é o chute inicial

function saveLocalDraft(draft: LocalDraft): void
function loadLocalDraft(): LocalDraft | null // retorna null se ausente, corrompido, ou expirado (e limpa nesse caso)
function clearLocalDraft(): void
```

Wrapper `try/catch` em toda leitura/escrita: `localStorage` pode lançar
em aba anônima com bloqueio de storage ou quota cheia. Falha aqui
**nunca** deve quebrar a tela — degrada para o comportamento de hoje
(sem rascunho local, pede login na hora de criar).

**Alterado — `src/components/contributions/new-submission-wizard.tsx`**
Ganha um terceiro estado interno (itens), condicional a um novo prop
`allowAnonymous?: boolean` (true só quando renderizado a partir da CTA
da home; o fluxo logado tradicional a partir de `/enviar-lista`
continua batendo direto em `startSubmissionAction` como hoje, sem
passar pelo rascunho local — não há necessidade dele para quem já tem
conta).

**Novo — `src/components/contributions/anonymous-items-step.tsx`**
Mesma UI visual de `item-form.tsx` (reaproveitar componentes de
apresentação), mas as ações de adicionar/remover item escrevem no
`local-draft` via `useState` + `useEffect` sincronizando com
`localStorage`, em vez de chamar `addSubmissionItemAction`/
`deleteSubmissionItemAction`.

**Novo — `src/lib/contributions/actions.ts` → `materializeLocalDraftAction`**
Server Action. Recebe o `LocalDraft` inteiro do cliente (via
`FormData` serializado ou argumento direto de Server Action — a decidir
na implementação, tanto faz para este spec). Requer usuário
autenticado (senão retorna erro — não deveria ser alcançável sem login,
mas nunca confiar no cliente). Passos:

1. Busca DRAFT existente para a mesma tupla
   `(school_id, education_level, series_name, school_year, submitted_by)`
   — mesma query que `startSubmissionAction` já faz.
2. Se existe: apaga os `submission_items` antigos, insere os novos do
   rascunho local. Se não existe: cria a `list_submissions` (status
   DRAFT) e insere os itens — uma transação, não duas chamadas
   separadas (evita ficar com submissão sem item se a segunda falhar).
3. Retorna o `submissionId` para o cliente seguir pro anexo.
4. Cliente limpa o `localStorage` só depois da confirmação de sucesso
   (nunca antes — um erro de rede não pode custar o rascunho).

**Novo — `src/components/home/home-list-request-cta.tsx`**
Link de texto (`font-medium text-primary-700 hover:underline`, mesmo
padrão de `/para-escolas`), dentro do card de busca existente
(`page.tsx`), abaixo de `<HomeNameSearch />`. Não é `Button variant="whatsapp"`
nem nenhuma cor de marca reservada — é navegação, não uma
CTA de orçamento.

### O que NÃO muda

- `startSubmissionAction`, `/enviar-lista/[id]/itens` (a versão logada
  server-backed), `/anexo`, `/revisao`, `/confirmacao` — inalterados.
  Quem chega em `/enviar-lista` já logado continua no fluxo de hoje,
  sem tocar em `local-draft.ts` nunca.
- RLS, schema de `list_submissions`/`submission_items` — nenhuma coluna
  nova. `materializeLocalDraftAction` só chama os mesmos inserts que já
  existem.
- Middleware (`src/lib/supabase/proxy.ts`): `/enviar-lista` continua na
  lista `PROTECTED_PREFIXES` — mas só a partir do momento em que
  materializamos (a página pública que hospeda a CTA + wizard-modo-
  anônimo não é `/enviar-lista`, é a própria home; a rota protegida só
  entra em jogo quando o fluxo tenta ir para o anexo de verdade).

## Tratamento de erros e casos de borda

| Caso | Comportamento |
|---|---|
| `localStorage` indisponível | Degrada: sem rascunho, pede login na hora de tentar avançar pro anexo (comportamento de hoje) |
| Rascunho expirado (> 7 dias) | Ignorado silenciosamente, wizard começa do zero — sem aviso de expiração que ninguém pediu |
| Materialização falha (rede, RLS, etc.) | Erro visível, rascunho local **preservado** (só limpa em sucesso confirmado) |
| Itens vazios ao tentar avançar pro anexo | Mesma validação que o fluxo logado já tem hoje |
| Colisão com DRAFT remoto existente | Sobrescreve + banner não bloqueante: "Atualizamos seu rascunho anterior desta lista com o que você acabou de preencher" |
| Usuário abre a home em duas abas e preenche em ambas | Não tratado neste sub-projeto — `localStorage` é compartilhado entre abas da mesma origem, então a segunda aba sobrescreve a primeira ao salvar. Ficar ciente; não é um caso comum o bastante para justificar lock/merge agora |

## Analytics

Dois eventos novos (nomes provisórios, alinhar com a convenção que sair
de `docs/architecture/analytics-events.md`):

- `home_list_request_click` — clique no CTA da home. Sem `schoolId`
  (ainda não escolheu nenhuma).
- `submission_started` já existe e é gravado quando
  `materializeLocalDraftAction` cria a linha de verdade — **reaproveitar**,
  não duplicar, mas confirmar que o campo/metadata distingue "veio do
  fluxo anônimo" de "veio do fluxo logado direto" (útil para medir a
  taxa de conversão anônimo → lista real). Provavelmente um campo em
  `metadata: { source: "home_anonymous" | "direct" }`.

Requer migration nova estendendo a whitelist de `record_analytics_event`
(`supabase/migrations/20260911020000_search_schools.sql:211-218`) — a
mesma disciplina de nunca editar uma migration já aplicada, então é um
arquivo novo.

## Testes

- Unitário: `local-draft.ts` (save/load/clear/expiração, incluindo
  `localStorage` lançando exceção).
- E2E: fluxo completo anônimo → cadastro → materialização → anexo,
  cobrindo o caso de colisão com DRAFT remoto.
- Manual: cadastro real via UI (não só login) para confirmar que o
  rascunho sobrevive à aba nova da confirmação de e-mail — é o caso que
  motivou escolher `localStorage` em vez de `sessionStorage`, então
  precisa ser verificado de verdade, não só assumido.

## Auto-revisão

- Nenhum "TBD" pendente. O único número arbitrário é `EXPIRY_DAYS = 7`
  — sinalizado como chute inicial, ajustável sem redesenho.
- Escopo consistente com a ordem de sub-projetos combinada
  (`docs/product/PRD.md` RF-008/RN-008 não muda: sugestão/contribuição
  continua indo por moderação antes de virar conteúdo público — este
  sub-projeto só adia o momento de *criar* o rascunho, nunca pula a
  moderação).
- Ambiguidade que resolvi na escrita: o formato exato de transporte do
  `LocalDraft` para `materializeLocalDraftAction` (FormData serializado
  vs. argumento direto) fica para a implementação decidir — não muda o
  design, é detalhe de wiring.
