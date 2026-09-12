# Vercel — status real de deployment

Investigação feita em 2026-09-12, nesta sessão, com evidência direta
(chamada de ferramenta ou `curl`) para cada afirmação — nada abaixo foi
inferido do que outro documento já dizia sem reconferir o que dava para
reconferir. **Resumo em uma frase:** existe, sim, um projeto Vercel real
conectado a este repositório (confirmado por uma URL gerada pela própria
Vercel, não por suposição), mas as ferramentas `mcp__Vercel__*` desta
sessão continuam autenticadas num time diferente do que hospeda esse
projeto — então **qual domínio serve produção hoje, e por que a URL que o
usuário visitou deu 404, não pode ser respondido a partir daqui**; isso
exige olhar o dashboard da Vercel diretamente (seção 5 abaixo tem o
roteiro exato).

## Convenção de rótulo usada neste documento

Este projeto já tem um precedente para "achado onde a ferramenta foi
tentada de verdade e o acesso é insuficiente, e aqui está exatamente o que
falta": `docs/implementation/stitch-final-gap.md` usa
**Status do MCP:** `STITCH_UNAVAILABLE`. Este documento segue o mesmo
padrão para a Vercel — cada um dos 5 pontos abaixo recebe um destes três
rótulos:

- **CONFIRMADO** — evidência direta desta sessão (saída de ferramenta ou
  `curl`), citada.
- **NÃO VERIFICÁVEL A PARTIR DESTE AMBIENTE** (`VERCEL_UNVERIFIED`) — a
  pergunta tem resposta, mas nenhuma ferramenta disponível nesta sessão
  chega até ela; a seção diz exatamente qual ferramenta/acesso faltaria.
- **DESCONHECIDO** — nunca foi estabelecido por ninguém, em nenhuma sessão
  anterior deste projeto; não é um bloqueio de ferramenta, é uma lacuna
  real de informação.

## 1. Existe um projeto Vercel real conectado a este repositório?

**CONFIRMADO — sim.**

Duas evidências independentes, ambas obtidas agora, ao vivo:

- **Metadado do próprio GitHub** (`mcp__github__search_repositories`,
  query `repo:mzinhoww-svg/listadaescola`, chamado nesta sessão):
  `"homepage": "https://listadaescola.vercel.app"`. Um repositório sem
  integração Vercel não tem esse campo preenchido sozinho.
- **Status de commit gerado pela própria Vercel** — `pull_request_read`
  (`get_status`) na PR #23 (a última PR mergeada, head
  `360eb9803...`, mergeada `2026-09-11T21:56:33Z`) retornou:

  ```json
  {
    "state": "success",
    "context": "Vercel",
    "description": "Deployment has completed",
    "target_url": "https://vercel.com/mazinhoww-5476s-projects/listadaescola/HW7hSxkDacA89VJFp39aQmqFcbpN"
  }
  ```

  Esse `target_url` não foi digitado por nenhum agente — é a própria
  Vercel quem gera essa URL ao postar o status no GitHub. Ela nomeia, com
  certeza, o **time** (`mazinhoww-5476s-projects`) e o **projeto**
  (`listadaescola`) que efetivamente builda este repositório. É a
  confirmação mais forte possível a partir daqui de que o projeto é real,
  está ativo, e builda com sucesso a cada push — sem precisar de acesso ao
  dashboard.

Isso é consistente com o histórico já registrado em
`docs/development/WORKFLOW.md` (bot `vercel[bot]` comentando desde a PR
#1) — não é um achado novo, é a mesma coisa reconfirmada de forma
independente, agora.

**Atenção a um detalhe fácil de confundir:** o time que hospeda o projeto
real se chama `mazinhoww-5476s-projects` (com "a" depois do "m" —
"m-a-zinhoww"). O time ao qual esta sessão *tem* acesso se chama
`mzinhoww-gmailcoms-projects` (sem esse "a" — "m-zinhoww"). Os dois nomes
diferem em uma única letra; qualquer busca manual no futuro deve conferir
a grafia com cuidado.

## 2. O domínio/URL de produção real é conhecido com certeza?

**Não — e a resposta honesta é "temos dois fatos concretos e diferentes,
nenhum dos dois é comprovadamente 'a' URL de produção".** Seguindo a
instrução de não escolher um dos dois e chamá-lo de "o" domínio:

### Fato A — `https://listadaescola.vercel.app`

**CONFIRMADO (o comportamento atual, via `curl`, repetido duas vezes
nesta sessão, minutos de diferença):**

```
HTTP/2 404
server: Vercel
x-vercel-error: NOT_FOUND
```

O header `x-vercel-error: NOT_FOUND` (e `server: Vercel`) é a assinatura
de um 404 **da própria plataforma Vercel** — "este hostname não tem
nenhum deployment associado agora" — não um erro de aplicação, não um
crash de código. Esta é exatamente a URL que o usuário relatou ter
visitado e visto um erro; o `curl` reproduz esse erro exato, então
sabemos com certeza o que o usuário viu e por quê, tecnicamente.

Esta é também a mesma URL do campo `homepage` do GitHub (achado 1, acima)
— e um projeto literalmente chamado `listadaescola` só ganha o subdomínio
`listadaescola.vercel.app` (sem sufixo/número) na Vercel se esse nome
estivesse livre no momento da criação do projeto. Isso é evidência
circunstancial forte (não uma prova) de que este **era** o domínio padrão
originalmente atribuído a este mesmo projeto — não o nome de uma conta
Vercel de terceiros não relacionada. Mas se o hostname 404a hoje porque o
domínio foi removido do projeto, porque a branch de produção nunca gerou
um deployment promovido, ou por outro motivo — **isso é
`VERCEL_UNVERIFIED`**: só o dashboard (Project Settings → Domains, ou
Deployments filtrado por "Production") mostra o histórico de aliases
desse projeto. `mcp__Vercel__get_project_deployment_protection` (a única
ferramenta desta sessão que chega perto de configuração de projeto) não
lê domains — só password/SSO/Trusted IPs.

### Fato B — a URL de preview registrada no WORKFLOW.md (PR #2)

**CONFIRMADO (via `curl`, agora):** a URL
`https://listadaescola-git-feature-supab-ec8b95-mazinhoww-5476s-projects.vercel.app`
— registrada em `docs/development/WORKFLOW.md` como o preview da PR #2,
em 2026-09-11 — hoje responde:

```
HTTP/2 302
location: https://vercel.com/sso-api?url=https%3A%2F%2Flistadaescola-git-feature-supab-ec8b95-mazinhoww-5476s-projects.vercel.app%2F&nonce=...
set-cookie: _vercel_sso_nonce=...; Secure; HttpOnly; SameSite=Lax
x-robots-tag: noindex
server: Vercel
```

Isso é o padrão documentado da Vercel para **Deployment Protection**
(Vercel Authentication / SSO) — não um 404, não um crash. Mas isto é uma
URL de **preview** de uma branch de feature específica (o padrão
`<projeto>-git-<branch>-<time>.vercel.app` é como a Vercel nomeia preview
deployments por branch), não um domínio de produção. Prova que o projeto
`mazinhoww-5476s-projects/listadaescola` está vivo e gera deployments de
verdade — não prova nada sobre o que serve produção.

### Conclusão desta seção

Nenhuma das duas URLs pode ser chamada honestamente de "a" URL de
produção deste projeto. **DESCONHECIDO** qual domínio está de fato
configurado como Production Domain no projeto real — isso nunca foi
estabelecido em nenhuma sessão anterior deste projeto (não aparece em
`producao.md` nem em `WORKFLOW.md`), e não é um caso de ferramenta
insuficiente, é uma lacuna de informação genuína até o usuário confirmar
no dashboard.

## 3. Deployment Protection (senha/SSO/Vercel Authentication) está ativado? É deliberado ou um bloqueio acidental?

**Que existe proteção ativa em pelo menos um deployment: CONFIRMADO**
(fato B da seção 2 — o 302 para `vercel.com/sso-api` só acontece com
Deployment Protection ligado). **Se essa proteção também cobre Produção,
e se foi uma escolha deliberada: `VERCEL_UNVERIFIED`.**

Para mostrar exatamente que ferramenta resolveria isso (e confirmar que a
ferramenta em si funciona, não está quebrada), tentei
`mcp__Vercel__get_project_deployment_protection` nos dois times:

- **Contra o projeto real** (`projectId: "listadaescola"`,
  `teamId: "mazinhoww-5476s-projects"`):

  ```
  Failed to fetch project: 403 Forbidden
  ```

  Isso é a prova direta, de dentro da própria chamada, de que a
  credencial Vercel desta sessão não tem autorização para esse time —
  não um erro de digitação de projeto/time (ver o `target_url` da seção 1,
  que confirma a grafia exata dos dois).

- **Contra um projeto do time que esta sessão *tem* acesso** (`theloyal`,
  não relacionado a este repositório — usado só como controle, para
  provar que a ferramenta funciona normalmente quando o projeto está no
  escopo certo):

  ```json
  {
    "projectName": "theloyal",
    "passwordProtection": { "enabled": false, "deploymentType": null },
    "ssoProtection": { "enabled": true, "deploymentType": "all_except_custom_domains" },
    "trustedIps": { "enabled": false, "deploymentType": null, "addresses": [], "protectionMode": null }
  }
  ```

  Isto **não é o valor do projeto `listadaescola`** — é de um projeto
  completamente diferente, citado aqui só para (a) provar que o 403 acima
  é uma fronteira real de autorização, não a ferramenta quebrada, e (b)
  mostrar exatamente o formato do dado que o dashboard real exibiria
  (`ssoProtection.enabled` + `deploymentType`, com opções como
  `"all_except_custom_domains"`) — para o usuário saber o que procurar.

**Por que isso importa de verdade:** se a proteção do projeto real
estiver com `deploymentType` equivalente a "todos os deployments"
(incluindo produção), isso **explicaria** usuários reais vendo um bloqueio
de login/SSO em vez do site — um cenário bem mais grave que um 404. Se
estiver limitada a preview (o padrão mais comum, e o que o exemplo do
`theloyal` acima ilustra com `all_except_custom_domains`), é
provavelmente intencional e inofensivo para usuários reais. **As duas
situações produzem sintomas diferentes dos observados até agora** (nem o
Fato A nem o Fato B da seção 2 são, sozinhos, prova de qual cenário é
real para produção) — só o dashboard resolve isso.

## 4. Preview e Production estão configurados separadamente? O check "Vercel" do branch protection está de fato conectado a este repositório?

**Preview: CONFIRMADO que existe e funciona.** Todo push a uma branch com
PR aberta dispara deployment automático (comentário do `vercel[bot]` +
commit status `context: "Vercel"`) — já documentado extensivamente em
`WORKFLOW.md` e reconfirmado agora, ao vivo, pelo `get_status` da PR #23
citado na seção 1.

**Production como ambiente configurado à parte, com deployments próprios
bem-sucedidos: `VERCEL_UNVERIFIED`.** A mesma fronteira de acesso (403,
seção 3) bloqueia ler o histórico de deployments de Production do projeto
real, suas env vars, ou qual branch está marcada como "Production Branch"
nas configurações do projeto. Não há como confirmar daqui se essa branch
corresponde de fato à branch padrão real deste repositório
(`claude/eager-galileo-d8hdtc`) — uma divergência aqui (por exemplo, a
Vercel esperando `main`, que não existe neste repositório) seria o tipo
de causa-raiz que explicaria produção nunca ter sido gerada, e é
plausível o bastante para valer a pena checar primeiro.

**O required status check "Vercel" no branch padrão:** o usuário relatou
(registrado em `WORKFLOW.md`, "Merge direto autorizado") ter configurado
manualmente um ruleset exigindo esse check. Isso nunca foi confirmado por
leitura direta de API nesta sessão nem em nenhuma anterior — nenhuma
ferramenta `mcp__github__*` disponível expõe branch protection/ruleset
(confirmado por ausência na lista de ferramentas, mesmo achado já
registrado em `WORKFLOW.md`). A única confirmação que existe é
**comportamental**, de uma sessão anterior (PR #12, já documentada em
`WORKFLOW.md`): `enable_pr_auto_merge`, chamado com o check `Vercel`
ainda `pending`, recusou com "required checks are failing" em vez do
"already in clean status" default — evidência real de que existe um gate
de verdade, mesmo sem confirmação direta via API do ruleset em si. Não
repeti esse teste nesta sessão (exigiria uma PR nova com o check ainda em
andamento no momento certo); cito-o aqui como o que já foi estabelecido,
não como algo reconfirmado agora.

Vale registrar também: **este repositório não tem nenhum workflow de
GitHub Actions** (`find .github` não retornou nenhum arquivo; nenhum
`.yml`/`.yaml` de CI existe fora de `node_modules`). Ou seja, hoje o
único check possível de qualquer tipo no branch padrão é esse "Vercel"
— não existe lint/typecheck/test/build automatizado como required check
independente. Se o ruleset realmente exige só "Vercel", um PR passa a
gate de "buildou com sucesso na Vercel", não de "passou lint/teste" — os
dois já são rodados manualmente pelo agente antes do push (ver
`WORKFLOW.md`), mas não são um gate automático hoje.

**Sem `vercel.json` no repositório** (confirmado — arquivo não existe na
raiz) e sem nenhum script de build customizado em `package.json` (só
`next build`/`next start` padrão) — a Vercel está usando 100% detecção
automática de projeto Next.js, nada de configuração explícita de
build/output para revisar aqui. Também confirmado: `.vercel/project.json`
**não** está presente no repositório (nem deveria estar — `.gitignore`
lista `.vercel` corretamente, linha 42) e não há nenhum arquivo desse tipo
commitado por engano em nenhum lugar do histórico verificado nesta
sessão — nada a sinalizar aqui do lado de secrets/config vazada.

## 5. O que o usuário precisa checar/fazer no dashboard da Vercel

Este é o output mais útil desta seção, já que nada abaixo é verificável a
partir daqui. Time e projeto reais, confirmados na seção 1:
**`mazinhoww-5476s-projects` → `listadaescola`**.

1. **Project Settings → Domains.** Ver a lista de domínios atualmente
   associados ao ambiente de Production. Confirmar se
   `listadaescola.vercel.app` aparece ali (e por que não estaria
   servindo, se aparecer) ou se foi removido/substituído por um domínio
   próprio. Se a intenção é usar um domínio customizado, `.env.example`
   já documenta `listadaescola.com.br` como valor de exemplo para
   `NEXT_PUBLIC_SITE_URL` — mas isso é só um exemplo no código, **não**
   evidência de que esse domínio foi de fato registrado, apontado via DNS
   ou adicionado ao projeto na Vercel.
2. **Project Settings → Git → Production Branch.** Confirmar que o branch
   marcado como Production na Vercel é o branch padrão real deste
   repositório, `claude/eager-galileo-d8hdtc` (não `main` — este
   repositório não tem `main`, ver `WORKFLOW.md`). Uma divergência aqui
   significa que merges no branch padrão nunca geram um deployment de
   Production de verdade, só previews — candidato forte a causa-raiz.
3. **Project Settings → Deployment Protection.** Ver o escopo atual
   (Standard Protection / Only Preview Deployments / All Deployments) e
   se Vercel Authentication ou senha está ativo. Se cobrir Production e
   isso não for intencional, restringir a preview apenas (ou usar
   Protection Bypass for Automation, se necessário automatizar algo). Se
   for intencional, tudo certo — só não é possível confirmar qual dos
   dois é o caso a partir desta sessão.
4. **Deployments (aba), filtrando por Production.** Ver se já existe
   algum deployment de Production com status `Ready`, ou se todos que
   aparecem lá são `Error`/`Canceled` — isso sozinho já diria se produção
   algum dia funcionou.
5. **Project Settings → Environment Variables**, aba Production **e**
   Preview separadamente. Confirmar `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (já sinalizado como bloqueio em
   `docs/architecture/producao.md`) e, se um domínio próprio for
   configurado no item 1, `NEXT_PUBLIC_SITE_URL` também.
6. **GitHub → Settings → Rules/Branch protection** (não é Vercel, mas
   fecha o ciclo): reconfirmar visualmente que o ruleset citado em
   `WORKFLOW.md` de fato aponta para `claude/eager-galileo-d8hdtc` e
   exige o check `Vercel` — nenhuma ferramenta MCP desta sessão consegue
   ler isso, então esta é literalmente a única forma de confirmar.

Depois de checar o item 1 (e 2, se o item 1 não explicar sozinho), a URL
de produção real deste projeto vai ficar conhecida com certeza — o que
hoje é o maior buraco deste documento (seção 2). Vale atualizar este
arquivo com o resultado assim que isso acontecer.
