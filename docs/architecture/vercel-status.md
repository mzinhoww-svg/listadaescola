# Vercel — status real de deployment

**Atualizado em 2026-09-12 13:50Z.** A causa-raiz diagnosticada nas
seções 1–2 foi **corrigida pelo usuário** (Production Branch trocada para
`claude/eager-galileo-d8hdtc`, Opção A) e a Vercel **produziu o primeiro
deployment real de Production deste projeto**, com sucesso. O 404 original
está resolvido *na sua causa*.

Mas o site **ainda não é público**, por dois bloqueios **novos e
diferentes** do original — ambos verificados ao vivo, ambos do lado da
Vercel, nenhum deles no código.

**Resumo em uma frase:** o deployment de Production existe e buildou com
sucesso, mas está atrás de Vercel Authentication (SSO) e o escopo
Production está **sem nenhuma variável de ambiente** — então uma pessoa
externa não consegue abrir o site e, se conseguisse, toda request falharia.

> As seções 1–7 abaixo são o **registro do diagnóstico original** e
> continuam corretas como história. Onde foram superadas pelos fatos, a
> seção "Estado atual" logo abaixo prevalece.

## Estado atual (2026-09-12 13:50Z) — VERIFICADO AO VIVO

### O que foi corrigido ✅

A API de deployments do GitHub mostra um deployment de Production **novo**,
no commit de merge da PR #26:

```
id:              6410282331
environment:     Production
ref/sha:         10a2e3e1  (merge da PR #26 na branch padrão)
created_at:      2026-09-12T13:44:21Z
state:           success            <- buildou com sucesso
environment_url: https://listadaescola-35lluyfxr-mazinhoww-5476s-projects.vercel.app
```

Antes desta correção, o único deployment `Production` em 60 era o deploy de
importação do repositório vazio (seção 1). Agora há um deployment de
Production **real, do código real, verde**. A troca da Production Branch
funcionou exatamente como previsto na Opção A (seção 6).

### Bloqueio 1 — Vercel Authentication está ligada ❌

Sondagem ao vivo dos três hostnames do projeto:

| URL | Resposta | Leitura |
|---|---|---|
| `listadaescola.vercel.app` | `404` + `x-vercel-error: NOT_FOUND` | alias curto **não atribuído** a este projeto |
| `listadaescola-mazinhoww-5476s-projects.vercel.app` | `302` → `vercel.com/sso-api` | existe, mas **atrás de SSO** |
| `listadaescola-35lluyfxr-…vercel.app` (deployment) | `302` → `vercel.com/sso-api` | existe, mas **atrás de SSO** |

O `302` para `vercel.com/sso-api` com cookie `_vercel_sso_nonce` é Vercel
Authentication. O hostname que **serve** o projeto hoje é o longo
(`listadaescola-mazinhoww-5476s-projects.vercel.app`), e ele está
protegido: **uma pessoa externa não consegue abrir o site**.

O alias curto `listadaescola.vercel.app` responde `404 NOT_FOUND` — 404 da
plataforma, não da aplicação. Ou seja: esse hostname não está atribuído a
este projeto (nome `.vercel.app` é global e único; provavelmente já estava
tomado quando o projeto foi criado). **A URL pública correta a testar e a
divulgar não é essa** — é a longa, ou um domínio customizado.

### Bloqueio 2 — escopo Production sem variáveis de ambiente ❌

Isto era a previsão da seção 4 ("build verde não prova produção
configurada") e se confirmou. Com o escopo Production vazio, o efeito **não
é degradação parcial — é indisponibilidade total**:

`src/lib/supabase/env.ts` lança erro explícito quando
`NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` faltam, e
esse módulo é lido por `src/lib/supabase/proxy.ts`, que roda no middleware
**em toda request**. Logo: toda rota, inclusive as estáticas de navegação,
falha. O build passou verde mesmo assim, exatamente como a seção 4 previu.

### Variáveis a configurar (lista exata, auditada em `src/`)

| Variável | Necessidade | Onde é usada |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **obrigatória** | `src/lib/supabase/env.ts` (toda request) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **obrigatória** | `src/lib/supabase/env.ts` (toda request) |
| `NEXT_PUBLIC_SITE_URL` | recomendada | `src/lib/seo/site-url.ts`, `src/lib/auth/actions.ts` — sem ela, canonical/JSON-LD/OG caem para `VERCEL_URL` (a URL feia de deployment) |
| `NEXT_PUBLIC_MAP_STYLE_URL` | opcional | `src/lib/map/config.ts` (tem default) |
| `NEXT_PUBLIC_MAP_TILE_URL_TEMPLATE` | opcional | `src/lib/map/config.ts` (default OSM) |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | opcional | `src/lib/map/config.ts` (tem default) |
| `SUPABASE_SERVICE_ROLE_KEY` | **NÃO ADICIONAR** | zero referências em `src/` — confirmado por `grep -rn SERVICE_ROLE src/`. Adicioná-la só colocaria um segredo de bypass total de RLS num ambiente que não o usa. |

### Fronteira de acesso — reconfirmada com evidência nova

Com o slug do time agora visível na URL do deployment
(`mazinhoww-5476s-projects`), repeti as chamadas:

- `list_teams` → **um único** time: `mzinhoww-gmailcoms-projects`
  (`team_SOZVnHod91BcrmLMYmdmvB8k`, hobby).
- `list_projects` nesse time → 7 projetos (`theloyal`, `teste`,
  `milhasbot-modern`, `mentormatch`, `cia-do-visto-landing`,
  `v0-resenha-fc-interface`, `v0-latam-pass-global-account`).
  **`listadaescola` não está entre eles.**
- `list_projects` / `get_project_deployment_protection` no time real
  (`mazinhoww-5476s-projects`) → **403 Forbidden**.
- `web_fetch_vercel_url` e `get_access_to_vercel_url` nas URLs protegidas →
  `Unable to create shareable URL` (mesma fronteira).

Conclusão: esta sessão **não consegue** desligar a proteção, adicionar
variáveis, atribuir domínio, nem furar o SSO para smoke-testar por dentro.

### O que falta, exatamente (dashboard da Vercel, time `mazinhoww-5476s-projects`)

1. **Settings → Environment Variables**, escopo **Production**: adicionar
   `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (e, recomendado, `NEXT_PUBLIC_SITE_URL`). **Não** adicionar
   `SUPABASE_SERVICE_ROLE_KEY`.
2. **Settings → Deployment Protection**: desligar "Require Log In", ou
   mudar para um modo que deixe o domínio de produção público.
3. **Redeploy** — variáveis `NEXT_PUBLIC_*` são embutidas no bundle em
   build time; adicioná-las **não** afeta o deployment já existente.
   É obrigatório redeployar depois de configurá-las.
4. Testar **`https://listadaescola-mazinhoww-5476s-projects.vercel.app`**
   (não o alias curto, que não é deste projeto).

## 1. A causa-raiz (CONFIRMADA)

A API de deployments do GitHub (`/repos/mzinhoww-svg/listadaescola/deployments`,
histórico completo de 60 deployments, consultada ao vivo) mostra:

| Ambiente | Quantidade | `production_environment` |
|---|---:|---|
| `Preview` | 59 | `false` |
| `Production` | 1 | `false` |
| **Total** | **60** | **nenhum `true`** |

O **único** deployment marcado `Production` é o primeiro de todos:

```
id:              6379307432
ref/sha:         0764d93baae752690055162630e7997a0aad8902
created_at:      2026-09-10T19:18:10Z
state:           success
environment_url: https://listadaescola-insn92qrc-mazinhoww-5476s-projects.vercel.app
```

`0764d93` é literalmente o **primeiro commit** da branch padrão
(`docs: record initial repository audit (empty repository)`) — ou seja, o
*deploy de importação* que a Vercel faz uma única vez ao conectar o
projeto ao repositório.

Cruzando com o histórico registrado em
`docs/implementation/repository-audit.md` (commit `bb57ed1`): **o projeto
Vercel foi criado enquanto o repositório ainda estava vazio**, sem nenhuma
branch padrão definida (`git remote show origin` retornava
`HEAD branch: (unknown)`). Nesse cenário a Vercel assume `main` como
Production Branch. A branch padrão só passou a existir depois, quando
`claude/eager-galileo-d8hdtc` foi empurrada — e o GitHub a definiu como
padrão automaticamente.

**Consequência:** como `main` nunca existiu neste repositório, nenhum push
jamais correspondeu à Production Branch. Todos os 59 deployments seguintes
— inclusive o merge da PR #24 na branch padrão (`4421ce7`, deployment
criado 2026-09-12T02:37:44Z) — foram **Preview**.

Sem deployment de Production, o alias de produção
(`listadaescola.vercel.app`) nunca foi atribuído. Daí o 404.

## 2. Evidência do 404 (CONFIRMADA, via `curl`)

```
HTTP/2 404
server: Vercel
x-vercel-error: NOT_FOUND
```

`x-vercel-error: NOT_FOUND` é o 404 **da plataforma** ("nenhum deployment
neste hostname"), não um erro da aplicação nem um crash de build — o
sintoma exato de um alias de produção sem deployment associado, e bate com
o relato original do usuário.

`https://listadaescola.com.br` **não resolve** (falha de conexão/DNS): não
há domínio customizado ativo hoje. O valor em `.env.example` é apenas um
exemplo de `NEXT_PUBLIC_SITE_URL`, não um domínio registrado.

## 3. Deployment Protection (CONFIRMADA ativa, escopo não determinado)

O único deployment de Production existente responde:

```
HTTP/2 302
location: https://vercel.com/sso-api?url=...&nonce=...
x-robots-tag: noindex
```

Isso é Vercel Authentication (SSO) protegendo *deployment URLs*. **Não
determina** se o *domínio* de produção também ficaria protegido: na
configuração padrão ("Standard Protection") os domínios de produção ficam
públicos e só previews/deployment URLs são protegidos. Qual opção está
ativa neste projeto é **`VERCEL_UNVERIFIED`** (seção 5) e precisa ser
conferida no dashboard junto com a correção da Production Branch.

## 4. Build verde **não** prova produção configurada (achado importante)

Teste feito no commit exato da branch padrão (`4421ce7`):

| Cenário | Resultado |
|---|---|
| `npm run build` **com** as variáveis Supabase | ✅ sucesso (60 rotas) |
| `npm run build` **sem** nenhuma variável Supabase | ✅ **também sucesso** |

O build do Next.js **não falha** se
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` estiverem
ausentes — todas as páginas de dados são dinâmicas (`ƒ`), então a falha só
apareceria **em runtime**, a cada request. Portanto o check `Vercel` verde
nas PRs **não é evidência** de que o ambiente Production tem as variáveis
configuradas; isso exige conferência explícita no dashboard.

## 5. Escopo de acesso desta sessão (`VERCEL_UNVERIFIED`)

As ferramentas `mcp__Vercel__*` estão autenticadas em **outro time**,
confirmado ao vivo por `get_git_deployment_context`:

- Time acessível: `mzinhoww-gmailcom's projects`
  (`team_SOZVnHod91BcrmLMYmdmvB8k`, plano hobby) — 5 projetos
  (`theloyal`, `teste`, `milhasbot-modern`, `mentormatch`,
  `cia-do-visto-landing`). **Nenhum é o `listadaescola`.**
- Time real do projeto: `mazinhoww-5476s-projects`
  (`team_MoJXSA9BrfGBDuTQBF8DtxgG`), projeto `listadaescola`
  (`prj_CceFoD78kHL8RsSpuQEx7qvHTGQl`) — IDs extraídos do payload que o
  próprio `vercel[bot]` publica nos comentários de PR.

Chamar `get_project_deployment_protection` com os **IDs exatos** do projeto
real retorna `403 Forbidden` — não é erro de nome/slug, é fronteira real de
autorização. Esta sessão **não consegue** ler nem alterar Production
Branch, Environment Variables, Domains, Deployment Protection, nem
disparar redeploy de produção.

Atenção à grafia: o time real é `m**a**zinhoww-5476s-projects`; o acessível
é `mzinhoww-gmailcoms-projects`. Diferem por uma letra.

## 6. O que resolve (duas opções)

### Opção A — corrigir a Production Branch (recomendada)

Dashboard → **Project Settings → Git → Production Branch**: trocar `main`
por `claude/eager-galileo-d8hdtc`. Depois **Deployments → Redeploy** no
commit mais recente, promovendo a Production.

Vantagem: mantém uma única branch canônica; todo merge futuro na branch
padrão publica produção automaticamente, sem divergência.

### Opção B — criar a branch `main`

Criar `main` apontando para o HEAD da branch padrão faz a Vercel publicar
Production imediatamente, sem tocar em configuração:

```bash
git push origin origin/claude/eager-galileo-d8hdtc:refs/heads/main
```

Desvantagem: passam a existir duas branches; todo merge futuro precisaria
atualizar `main` também, ou a produção congela. Só vale se a intenção for
adotar `main` como branch canônica (e então mudar também a branch padrão do
repositório).

### Em ambos os casos, conferir depois

1. **Settings → Environment Variables → aba Production**:
   `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` precisam
   existir **no escopo Production** (ver seção 4 — build verde não garante
   isso). Opcionalmente `NEXT_PUBLIC_SITE_URL`.
   `SUPABASE_SERVICE_ROLE_KEY` **não** é usada por nenhum código em `src/`
   — não adicione.
2. **Settings → Deployment Protection**: se estiver em "All Deployments", o
   domínio de produção também fica atrás de SSO e o site não é público.
   Para site público, usar "Standard Protection" ou desativar.
3. Testar `https://listadaescola.vercel.app` — deve responder 200.

## 7. O que já está comprovadamente pronto do lado da aplicação

- `lint`, `typecheck` e `build` passam no commit exato da branch padrão
  (`4421ce7`).
- O Supabase de produção responde corretamente ao caminho público: uma
  chamada REST com a **anon key** retorna `HTTP 200` com escolas reais
  (2722 escolas ativas de MT). O caminho que a aplicação usa em produção
  está funcional.
- Variáveis realmente usadas pelo código (`grep process.env` em `src/` +
  `next.config.ts`): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_MAP_STYLE_URL`, `NEXT_PUBLIC_MAP_TILE_URL_TEMPLATE`,
  `NEXT_PUBLIC_MAP_ATTRIBUTION`, `VERCEL_URL` (injetada pela Vercel). As
  três de mapa têm default embutido e são opcionais.

**CODE READY sim; PRODUCTION READY ainda não.**

Atualização de 2026-09-12 13:50Z: a promoção a Production **já aconteceu**
(deployment `6410282331`, `state: success`). O que falta agora são os dois
bloqueios da seção "Estado atual": variáveis de ambiente no escopo
Production e Deployment Protection ligada. Ambos exigem acesso ao time
`mazinhoww-5476s-projects`, que esta sessão não tem (403 reconfirmado).
