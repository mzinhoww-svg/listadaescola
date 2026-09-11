# Vercel + produção (Prompt 19)

Este documento cobre o que foi corrigido/verificado no código para
robustez em produção, e o que **não pode ser verificado ou configurado a
partir deste ambiente** (acesso à Vercel/Supabase deste projeto é só via
git + MCP; não há acesso ao dashboard de nenhum dos dois). Ver
`docs/development/WORKFLOW.md` para o estado operacional mais amplo
(branch, ferramentas, limitações conhecidas).

## Corrigido

- **Env vars sem validação de runtime** — os 3 pontos que criam um
  client Supabase (`src/lib/supabase/public.ts`, `server.ts`, `proxy.ts`)
  liam `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` com `!`
  (non-null assertion) -- zero segurança em runtime. Uma env var faltando
  ou um projeto Supabase errado linkado na Vercel faria essas duas
  variáveis chegarem como `undefined`, e o erro apareceria de forma
  confusa, fundo dentro do SDK, em **toda** requisição (`proxy.ts` roda
  como middleware). Extraído para `getSupabaseEnv()`
  (`src/lib/supabase/env.ts`): falha alto e claro, nomeando exatamente
  qual variável falta e onde configurar (Vercel ou `.env.local`).
- **Sem error boundary nenhum** — nenhum `error.tsx`/`global-error.tsx`
  existia; um erro não tratado em qualquer página caía na tela de erro
  genérica do Next.js. Adicionados `src/app/error.tsx` (cobre qualquer
  segmento abaixo da raiz, no estilo visual do resto do app) e
  `src/app/global-error.tsx` (cobre um erro na própria raiz --
  deliberadamente com HTML/CSS inline, sem depender do design system, já
  que se a raiz quebrou, depender de mais coisa do app para renderizar o
  erro é arriscado).
- **404 em inglês** — a rota inexistente caía no 404 default do Next.js
  ("This page could not be found.", texto do próprio framework), única
  string em inglês visível a um usuário real neste app 100% em
  português. Adicionado `src/app/not-found.tsx` com o mesmo padrão visual
  de `error.tsx`. O teste `05-security.spec.ts` (Prompt 17) que checava
  literalmente essa string do 404 default foi atualizado.
- **`X-Powered-By: Next.js` exposto** — confirmado via curl antes da
  correção. `poweredByHeader: false` em `next.config.ts` -- não tem valor
  nenhum para um visitante real, só facilita reconhecimento de stack por
  um atacante.

## Verificado (com evidência, não só "parece certo")

- **Build de produção limpo**: `npm run build` sem erros, com todas as
  correções acima aplicadas.
- **SSR real**: `next start` + curl em produção local -- `/`, `/escolas`,
  `/escolas?q=...` (exercita `createPublicClient` → `getSupabaseEnv`),
  `/minha-conta` (exercita `createClient` cookie-based + `proxy.ts`'s
  `updateSession`, ambos também via `getSupabaseEnv`) -- todos
  respondendo corretamente (200 com dados reais, ou 307 para o redirect
  de rota protegida esperado) depois da troca do `!` pela validação
  explícita. Confirma que a refatoração não quebrou nenhum client
  Supabase real.
- **404 customizado**: `/rota-que-nao-existe`, `/listas/slug-invalido` --
  ambos 404 real com "Página não encontrada" (não mais o texto em
  inglês do Next.js).
- **`X-Powered-By` ausente**: confirmado via curl depois da correção.
- **Route Handlers** (`/api/commerce/click`, `/api/store/whatsapp`,
  `/api/contributions/attachments`) -- lidos os 3 por completo: nenhum
  deixa uma exceção do Supabase vazar sem tratamento, nenhum status
  code/mensagem revela detalhe interno, todo redirecionamento cai em
  fallback seguro (`/`) em vez de fabricar destino (já auditado a fundo
  no Prompt 16/17 -- releitura aqui só confirmou que nada regrediu).
- **Server Actions**: já cobertas ponta-a-ponta pela suíte E2E real do
  Prompt 17 (login, wizard de contribuição, moderação) contra o Supabase
  real -- nenhuma mudança deste prompt toca a lógica de negócio dessas
  actions, só a camada de criação do client Supabase que todas
  compartilham (verificado acima).
- **Uploads**: validação de tipo/tamanho/autenticação já teve teste E2E
  real no Prompt 17 (incluindo o achado real do
  `proxyClientMaxBodySize`), sem mudança nesta passada.
- **Mapas**: já auditados a fundo no Prompt 18 (lazy-load, fallback com
  `MapErrorBoundary`, nunca único mecanismo de seleção). Sem achado novo
  de "risco específico da Vercel" aqui -- MapLibre busca os tiles OSM
  direto do navegador do visitante para o provider configurado, nunca
  através do servidor da Vercel, então não há uma camada extra
  específica da Vercel para validar além do que já foi confirmado.
- **Secrets server-only**: `SUPABASE_SERVICE_ROLE_KEY` continua ausente
  de todo código client-side e de `.env.local` (achado já confirmado no
  audit de segurança do Prompt 16, sem mudança aqui -- `getSupabaseEnv()`
  só lida com a URL e a anon key, que já são publicáveis por design).

## Bloqueado -- exige acesso ao dashboard (Vercel e/ou Supabase)

Nenhuma ferramenta MCP disponível nesta sessão lê ou escreve nenhum dos
itens abaixo (confirmado por busca nas ferramentas `mcp__Vercel__*`
disponíveis -- só protection/pause/analytics de projeto, nada de env
vars/domains; e nos `mcp__Supabase__*` -- nada de Auth URL config). Isso
não é uma suposição: cada um já apareceu como bloqueio real e reportado
em algum ponto anterior deste projeto (ver `docs/development/WORKFLOW.md`).

- **Confirmar quais env vars estão de fato setadas no projeto Vercel
  real** (`mazinhoww-5476s-projects/listadaescola`) -- as ferramentas
  Vercel MCP desta sessão estão autenticadas num time diferente do que
  hospeda este projeto (confirmado ao tentar `get_git_deployment_context`
  nesta mesma sessão), então nem a leitura é possível daqui. O usuário
  precisa confirmar manualmente (Vercel → Project Settings → Environment
  Variables) que `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`
  estão setadas para Production **e** Preview.
- **`NEXT_PUBLIC_SITE_URL`** -- sem ela, `metadataBase`/canonical/JSON-LD
  caem no fallback `VERCEL_URL` (preview) ou `localhost` (ver
  `.env.example` e `src/app/layout.tsx`). Funciona sem configurar nada,
  mas produção com domínio próprio precisa desta variável setada de
  verdade na Vercel para essas URLs resolverem para o domínio real, não
  o de preview.
- **Supabase Auth → URL Configuration → Redirect URLs** -- qualquer
  domínio de produção/preview real precisa estar na allow-list para
  `emailRedirectTo`/`resetPasswordForEmail` funcionarem fora de
  localhost (mesmo bloqueio já documentado no Prompt 03, sem mudança:
  nenhuma tool MCP configura isso).
- **SMTP customizado do Supabase Auth** -- o rate limit de e-mail do
  free tier é baixo (já confirmado batendo nele durante testes ao vivo
  do Prompt 03); produção com usuários reais provavelmente precisa de um
  provedor de SMTP próprio (Supabase Dashboard → Auth → SMTP Settings).
- **Ruleset/branch protection do branch padrão** -- exigindo o check
  `Vercel` antes de merge, configurado manualmente pelo usuário (ver
  automation-contract.md/WORKFLOW.md); continua sem ferramenta MCP para
  ler/confirmar essa configuração via API.

## Não adicionado (fora de escopo por instrução explícita)

Nenhum serviço pago novo foi adicionado (Sentry, LogRocket, um CDN de
imagem, etc.) -- instrução explícita do prompt ("não adicionar serviços
pagos desnecessários"). Logging de erro hoje é `console.error` dentro dos
error boundaries, capturado pelos logs de função nativos da Vercel; isso
é suficiente para o estágio atual do projeto e não exige custo adicional.
