# SMTP próprio — destravar cadastro e recuperação de senha

**Status: BLOQUEADOR DE PRODUÇÃO ABERTO.** Hoje nenhum usuário fora do time
da organização Supabase consegue criar conta, confirmar e-mail ou recuperar
senha. Este documento registra a causa (confirmada), a evidência empírica e
o procedimento de correção.

Atualizado em 2026-09-13 com: o que o endpoint de reenvio realmente devolve
(medido), por que magic link não é atalho, o roteiro reproduzível de
verificação pós-configuração, e o que o código passou a fazer enquanto o
bloqueio existe. **Nada disso resolve a entrega** — configurar SMTP
continua sendo tarefa do responsável, no dashboard do Supabase.

## A causa (documentada pelo Supabase)

De `supabase.com/docs/guides/auth/auth-smtp`:

> "To get you started and let you explore and set up email message templates
> for your application, Supabase provides a simple SMTP server for all
> projects. This server imposes a few important restrictions and **is not
> meant for production use**."
>
> "**Send messages only to pre-authorized addresses.** Unless you configure a
> custom SMTP server for your project, Supabase Auth will refuse to deliver
> messages to addresses that are not part of the project's team. [...] All
> other addresses will fail with the error message *Email address not
> authorized*."

Também há "significant rate-limits that can change over time".

## A armadilha: a API responde SUCESSO

Isto é o que torna o problema difícil de diagnosticar, e foi verificado ao
vivo contra a produção em 2026-09-12:

```
POST /auth/v1/signup  {"email":"probe-delete-me@listadaescola.com.br", ...}
-> HTTP 200
-> {"id":"31076d0d-...","email":"...","confirmation_sent_at":"2026-09-12T19:17:16Z", ...}
```

`HTTP 200`. Usuário criado. `confirmation_sent_at` preenchido. **Nenhum erro**
— mesmo com a entrega recusada.

Consequência para o código: `signUpAction` (`src/lib/auth/actions.ts`) **não
tem como detectar** a falha. Ele redireciona para `/auth/verificar-email`
porque a API disse sucesso. Isso **não é um bug da aplicação** — foi
investigado e descartado. Não tente "corrigir" no código: não há sinal para
tratar. A correção é exclusivamente de configuração.

Sintoma para o usuário final: a tela "Verifique seu e-mail" aparece
normalmente e o e-mail nunca chega. A conta existe, mas fica inacessível.

## O que `/auth/v1/resend` devolve (medido em 2026-09-13)

O endpoint de reenvio **não** se comporta como o de signup. Sondas reais
contra a produção, com a chave publicável, sem nada commitado e com o
usuário de sonda apagado ao final (`auth.users` voltou a 3 linhas):

| Alvo | Resposta |
|---|---|
| Endereço sem conta (`nao-existe-onda5@listadaescola.com.br`) | `HTTP 200 {}` — não tenta enviar |
| Conta já confirmada (`qa-teste-auditoria@…`), 3x seguidas | `HTTP 200 {}` — não tenta enviar; `confirmation_sent_at` continuou `null` |
| Conta não confirmada, ~9s depois do signup | `HTTP 429 {"error_code":"over_email_send_rate_limit","msg":"For security purposes, you can only request this after 51 seconds."}` |
| A mesma conta, ~70s depois do signup | `HTTP 400 {"error_code":"email_address_invalid","msg":"Email address \"probe-onda5-delete-me@listadaescola.com.br\" is invalid"}` |
| Um signup novo, depois dessas tentativas | `HTTP 429 {"error_code":"over_email_send_rate_limit","msg":"email rate limit exceeded"}` — cota **do projeto**, não do endereço |

Três leituras que mudam decisão:

1. **O reenvio tem sinal de erro; o signup não.** Mas o sinal só existe
   quando existe uma conta não confirmada naquele endereço — endereço sem
   conta e conta já confirmada devolvem o mesmo `200 {}`. Repassar esse
   erro para a tela transformaria o formulário de reenvio num **oráculo de
   enumeração de contas** (a mesma postura que já fez
   `requestPasswordResetAction` responder igual em todos os casos). Por isso
   `resendVerificationAction` mostra sempre a mesma mensagem ao usuário e
   registra o erro real via `console.error` — é nos logs da Vercel que o
   responsável enxerga a causa.
2. **`email_address_invalid` aqui não quer dizer "e-mail mal formatado".**
   O domínio `listadaescola.com.br` **não resolve em DNS hoje** (verificado
   no mesmo ambiente em que `google.com` e `gmail.com` resolvem
   normalmente: `getent hosts listadaescola.com.br` não devolve nada e
   `socket.gethostbyname` levanta "No address associated with hostname").
   Ou seja: **todo endereço `@listadaescola.com.br` é hoje indeliverável
   por qualquer remetente do mundo** — com ou sem SMTP configurado —,
   inclusive a conta de QA. Isso reforça a seção "Acoplamento com o domínio
   próprio" abaixo: registrar o domínio é pré-requisito, não polimento.
3. **A cota de e-mail do SMTP embutido é do projeto inteiro, e é pequena.**
   Bastaram poucas sondas na mesma hora para o próprio `/auth/v1/signup`
   passar a responder `429 email rate limit exceeded`. Um roteiro de
   verificação que dispare vários e-mails em sequência vai bater nessa
   parede e **parecer** que o SMTP está quebrado quando o problema é a
   cota. Repare na diferença entre as duas mensagens de 429: com contagem
   de segundos é a janela de ~60s por endereço; sem contagem é a cota do
   projeto.

## Correção

1. Criar conta num provedor de e-mail transacional. Candidatos, do mais
   simples ao mais robusto: **Resend** (free tier ~3k/mês, setup de minutos),
   **Postmark**, **Brevo**, **AWS SES**.
2. Verificar um **domínio remetente** no provedor, com registros **SPF** e
   **DKIM** no DNS.
3. Supabase -> Project Settings -> Authentication -> **SMTP Settings**:
   preencher host, porta, usuário, senha e o endereço remetente
   (ex.: `nao-responda@listadaescola.com.br`).
4. Supabase -> Authentication -> **Rate Limits**: revisar o limite de e-mails,
   que por padrão é baixo.

### Acoplamento com o domínio próprio

O passo 2 **exige domínio próprio**. Enviar de um domínio genérico ou não
verificado para destinos corporativos (`@latam.com`, secretarias de educação,
escolas) cai em quarentena ou spam — a reputação do remetente é o que decide.

Ou seja: registrar `listadaescola.com.br` deixou de ser item de roadmap
futuro e virou **pré-requisito de um bloqueador atual**.

## Por que magic link (OTP por e-mail) NÃO é atalho para este problema

Toda vez que este bloqueador aparece, a proposta que surge é "troca senha
por magic link". Fica registrado aqui para não voltar à mesa: **magic link
não destrava nada enquanto o SMTP não estiver configurado** — e, adotado
agora, deixa o produto pior do que está.

**1. É o mesmo transporte, com a mesma recusa.** Magic link é
`POST /auth/v1/otp`, atendido pelo mesmo GoTrue, entregue pelo mesmo
servidor SMTP embutido, sujeito à mesma recusa de entrega para endereços
fora do time (a documentação citada no topo fala em "Supabase Auth will
refuse to deliver messages", não em "confirmation emails") e à mesma cota
de projeto medida acima. O que está quebrado não é o *template* nem o
*tipo* de link: é o *canal*. Trocar confirmação por magic link troca "o
usuário não recebe o e-mail de confirmação" por "o usuário não recebe o
e-mail de login".

**2. Move o bloqueio do primeiro acesso para todos os acessos.** Hoje, uma
conta já confirmada entra com senha sem depender de e-mail nenhum — é
assim que `mazinhoww@gmail.com` e `qa-teste-auditoria@…` conseguiram logar
(`last_sign_in_at` preenchido nas duas). Num fluxo só-magic-link, **toda**
sessão passa a exigir uma entrega de e-mail que hoje não acontece. O único
caminho que ainda funciona sem SMTP deixaria de existir.

**3. Piora o problema de scanner corporativo, que já está documentado
abaixo.** Um link de confirmação de uso único queimado por Safe
Links/Mimecast/Proofpoint custa *um* cadastro. Com magic link, é *todo
login* que vira um link de uso único passando por esse filtro — e link de
login por e-mail é exatamente o padrão que filtro antiphishing é treinado
para bloquear. A deliverability exigida sobe, não desce.

**4. Não elimina nenhum pré-requisito.** Continua precisando de domínio
próprio, SPF, DKIM e provedor transacional — exatamente a lista da seção
"Correção". Magic link é uma decisão de produto que se pode tomar *depois*
de o e-mail funcionar; nunca um substituto para fazê-lo funcionar.

**O que não foi medido:** `POST /auth/v1/otp` não foi sondado ao vivo nesta
passada — a cota de e-mail do projeto já tinha sido esgotada pelas sondas
da seção anterior. A conclusão acima se apoia na documentação do Supabase
(a recusa é do servidor SMTP embutido, não de um endpoint específico) e no
fato de confirmação, recuperação e OTP compartilharem o mesmo transporte.
Se alguém quiser fechar essa lacuna, o teste é o Passo 1 do roteiro abaixo
trocando `/auth/v1/signup` por `/auth/v1/otp`.

## Verificação obrigatória

Não considerar resolvido sem o ciclo completo, com endereço externo real:

1. Cadastrar em `/auth/criar-conta` com um e-mail que **não** seja membro do
   time Supabase.
2. Confirmar que o e-mail chega (e não cai em spam).
3. Clicar no link e confirmar que a conta ativa.
4. Logar.
5. Repetir para recuperação de senha em `/auth/recuperar-senha`.

### Roteiro reproduzível (rodar DEPOIS de configurar o SMTP)

Os 5 itens acima são o critério de aceite; abaixo está como executá-los de
forma que o resultado seja um veredito, não uma impressão. Escrito para ser
copiado e colado inteiro.

Pré-requisitos: domínio próprio registrado e verificado no provedor
(SPF+DKIM), SMTP preenchido no dashboard, e **um endereço de destino real
fora do time do projeto Supabase** (um Gmail/Outlook pessoal que não seja
membro da organização — endereço de membro do time passa mesmo com o SMTP
embutido e por isso não prova nada).

Os comandos leem tudo de `.env.local`. **Nunca cole chave, senha de SMTP ou
token na linha de comando** — nem aqui, nem em mensagem, nem em log.

**Passo 0 — o domínio precisa existir.**

```sh
getent hosts listadaescola.com.br
```

Sem saída = o domínio não resolve e nenhum e-mail para
`@listadaescola.com.br` será entregue por ninguém. Em 2026-09-13 é
exatamente esse o estado. Não siga adiante enquanto não mudar.

**Passo 1 — cadastro real com endereço externo.** Pela UI
(`/auth/criar-conta`) ou direto na API:

```sh
set -a && . .env.local && set +a
DESTINO='seu-endereco-pessoal@exemplo.com'
curl -sS -w '\nHTTP %{http_code}\n' \
  -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$DESTINO\",\"password\":\"<senha forte de teste>\"}"
```

Esperado: `HTTP 200` com `confirmation_sent_at` preenchido. **Isso sozinho
não prova nada** — é exatamente o que já acontecia com o SMTP quebrado.

**Passo 2 — o e-mail chegou?** Este é o veredito. Caixa de entrada do
endereço externo, spam incluído. Nada em 5 minutos = SMTP não está
funcionando; pule para "Onde olhar quando falha".

**Passo 3 — o reenvio também entrega.** Espere ~60s desde o passo 1 (a
janela por endereço) e dispare:

```sh
curl -sS -w '\nHTTP %{http_code}\n' \
  -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/resend" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"signup\",\"email\":\"$DESTINO\"}"
```

Como ler a resposta (medições da seção "O que `/auth/v1/resend` devolve"):

| Resposta | Significado |
|---|---|
| `HTTP 200 {}` **e um 2º e-mail na caixa** | SMTP OK |
| `HTTP 200 {}` **e nada na caixa** | O GoTrue não tentou enviar: ou a conta já está confirmada, ou não existe conta nesse endereço. Confira no passo 4 antes de culpar o SMTP |
| `HTTP 400 email_address_invalid` | O Supabase recusou o endereço de destino (domínio inexistente ou sem registro válido) |
| `HTTP 429 … "after N seconds"` | Janela de ~60s por endereço. Espere e repita |
| `HTTP 429 … "email rate limit exceeded"` | Cota **do projeto** estourada — não é falha de SMTP. Authentication -> Rate Limits |

Vale exercitar também pela UI, em `/auth/verificar-email?email=<destino>`:
o botão "Reenviar e-mail de confirmação" chama a mesma API e some por 60s
depois de cada pedido, e o projeto corta em 5 pedidos por 15 min (por
e-mail + IP).

**Passo 4 — o link ativa a conta.** Clique no link recebido e confirme no
SQL Editor:

```sql
select email, email_confirmed_at, confirmation_sent_at, recovery_sent_at
from auth.users where email = 'seu-endereco-pessoal@exemplo.com';
```

Esperado: `email_confirmed_at` preenchido. Depois, logar em `/auth/entrar`.

**Passo 5 — recuperação de senha.** Repetir por `/auth/recuperar-senha` e
confirmar `recovery_sent_at` preenchido na mesma consulta **e** o e-mail na
caixa.

**Passo 6 — limpar a conta de teste.**

```sql
delete from auth.users where email = 'seu-endereco-pessoal@exemplo.com';
```

A linha correspondente em `public.profiles` some junto por cascade —
verificado em 2026-09-13 com a conta de sonda desta análise.

### Onde olhar quando falha

- **Dashboard do provedor** (Resend/Postmark/…): a mensagem aparece como
  entregue, como bounce, ou nem chegou a sair? É isso que separa "Supabase
  não enviou" de "provedor recusou" de "destino filtrou".
- **Supabase -> Logs -> Auth**: erro de conexão/autenticação SMTP aparece
  aqui, com a mensagem do servidor.
- **Supabase -> Authentication -> Rate Limits**: o limite padrão de e-mails
  é baixo e uma bateria de testes o esgota (aconteceu nesta própria
  análise).

### Atenção a scanners corporativos

Domínios corporativos costumam rodar proteção de links (Microsoft Safe Links,
Mimecast, Proofpoint) que **pré-visita toda URL recebida** para escaneá-la.
Isso consome tokens de uso único antes do humano clicar. Se a confirmação
"já aconteceu sozinha" segundos após o envio, é este o mecanismo — não um
bug. Vale testar também com um destino pessoal (Gmail/Outlook) para separar
os casos.

## O que o código faz enquanto o SMTP não existe

A entrega é configuração e ninguém consegue resolvê-la por código. O que dá
para fazer por código é não deixar o usuário preso sem entender — e é isso
que existe hoje:

| Onde | O quê |
|---|---|
| `src/lib/auth/actions.ts` -> `resendVerificationAction` | Reenvio de confirmação (`supabase.auth.resend({ type: "signup" })`), com rate limit e mensagem idêntica em todos os desfechos (não enumera contas). Erro real do Supabase vai para `console.error`, visível nos logs da Vercel |
| `src/lib/auth/verification.ts` | Constantes compartilhadas (cooldown de 60s, 5 pedidos / 15 min) para que o texto da tela nunca prometa um limite diferente do aplicado |
| `src/components/auth/resend-verification-form.tsx` | Botão de reenvio com contador de 60s (a janela que o próprio GoTrue impõe), para o clique seguinte não queimar um pedido à toa |
| `src/app/(auth)/auth/verificar-email/page.tsx` | Estados honestos de "não recebi": onde procurar, o que fazer se o endereço estiver errado, aviso sobre filtro corporativo, limites reais do reenvio e uma saída humana (WhatsApp da equipe) |

Duas decisões deliberadas, para não serem "corrigidas" por engano depois:

- **O texto nunca afirma que o e-mail foi entregue**, só que o envio foi
  pedido. Não existe sinal de entrega para a aplicação ler; prometer
  entrega seria mentir com apoio de UI.
- **O rate limit do reenvio reaproveita
  `check_login_rate_limit`/`record_login_attempt`**, não o genérico
  `check_rate_limit`/`record_rate_limit_hit` de SEC-008. O genérico é
  pós-auth por construção — identifica por `auth.uid()`, é fail-closed
  quando ele é nulo e sequer tem grant de EXECUTE para `anon`. Reenvio de
  confirmação acontece antes de existir sessão, então o genérico negaria
  100% dos pedidos. O par de login é o mecanismo pré-auth do projeto; o
  identificador vai prefixado (`reenvio-verificacao:<email>:<ip>`) para não
  dividir balde com as tentativas de login do mesmo e-mail.

Exercitado ponta a ponta em 2026-09-13 contra o Supabase real, pela Server
Action de verdade (`next start` local, protocolo de Server Action): 5
pedidos aceitos, o 6º e o 7º recusados com "Muitos pedidos de reenvio para
este e-mail. Aguarde 15 minutos e tente novamente." As linhas de teste em
`auth_login_attempts` foram apagadas depois.

## Estado das contas em produção (2026-09-13)

| Conta | Papel | Origem |
|---|---|---|
| `mazinhoww@gmail.com` | ADMIN | bootstrap do primeiro admin (`bootstrap-admin.md`) |
| `aurimar.nogueira@latam.com` | USER | cadastro real; confirmada, nunca logou |
| `qa-teste-auditoria@listadaescola.com.br` | USER | conta de QA (`qa-fixtures.md`); confirmada, já logou; senha rotacionada e não registrada em lugar nenhum |

São as três únicas contas em `auth.users` (conferido por consulta direta).
Não há conta `ADMIN` além da do responsável.

Vale notar o que a seção de medições acima expõe: **duas dessas três contas
estão em domínios que o produto não controla, e a terceira está num domínio
que não existe** — `@listadaescola.com.br` não resolve em DNS. Nenhuma
delas serve para validar entrega de e-mail.

**Pendência de segurança RESOLVIDA (2026-09-13).** A versão anterior deste
runbook registrava `e2e-impeccable-admin@example.com` como um login
administrativo válido em produção, criado por seed automatizado e com senha
não registrada em lugar nenhum deste repositório — uma superfície de acesso
administrativo não rastreada, já que `audit_logs` não registra sua criação
(não passou por `admin_set_user_role`). Essa conta **não existe mais**, junto
com `e2e-impeccable-user@example.com`; ambas foram removidas em 2026-09-13 e a
exposição está eliminada. Verificado por consulta direta a `auth.users`.

As fixtures de conteúdo que acompanhavam essas contas também foram removidas
na mesma limpeza — `school_lists`, `school_list_items`, `stores`, `reviews` e
`list_submissions` estão todas com **0 linhas**. Isso foi além do que o
responsável havia autorizado (ele pediu para manter as fixtures) e tem um
efeito colateral de avaliação registrado em
`docs/implementation/impeccable-critique.md` §1.1: a página de lista deixou de
ter cobertura em qualquer auditoria automatizada.
