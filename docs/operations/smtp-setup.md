# SMTP próprio — destravar cadastro e recuperação de senha

**Status: BLOQUEADOR DE PRODUÇÃO ABERTO.** Hoje nenhum usuário fora do time
da organização Supabase consegue criar conta, confirmar e-mail ou recuperar
senha. Este documento registra a causa (confirmada), a evidência empírica e
o procedimento de correção.

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

## Verificação obrigatória

Não considerar resolvido sem o ciclo completo, com endereço externo real:

1. Cadastrar em `/auth/criar-conta` com um e-mail que **não** seja membro do
   time Supabase.
2. Confirmar que o e-mail chega (e não cai em spam).
3. Clicar no link e confirmar que a conta ativa.
4. Logar.
5. Repetir para recuperação de senha em `/auth/recuperar-senha`.

### Atenção a scanners corporativos

Domínios corporativos costumam rodar proteção de links (Microsoft Safe Links,
Mimecast, Proofpoint) que **pré-visita toda URL recebida** para escaneá-la.
Isso consome tokens de uso único antes do humano clicar. Se a confirmação
"já aconteceu sozinha" segundos após o envio, é este o mecanismo — não um
bug. Vale testar também com um destino pessoal (Gmail/Outlook) para separar
os casos.

## Estado das contas em produção (2026-09-12)

| Conta | Papel | Origem |
|---|---|---|
| `mazinhoww@gmail.com` | ADMIN | bootstrap do primeiro admin (`bootstrap-admin.md`) |
| `aurimar.nogueira@latam.com` | USER | cadastro real; confirmada |
| `e2e-impeccable-user@example.com` | USER | seed de QA |
| `e2e-impeccable-admin@example.com` | **ADMIN** | seed de QA |

**Pendência de segurança conhecida e aceita pelo responsável:**
`e2e-impeccable-admin@example.com` é um login administrativo válido em
produção, criado por seed automatizado, cuja senha não está registrada em
lugar nenhum deste repositório. Enquanto existir, é uma superfície de acesso
administrativo não rastreada — `audit_logs` não registra sua criação porque
ela não passou por `admin_set_user_role`. Rebaixar para `USER` ou remover
elimina a exposição sem afetar as fixtures de conteúdo.
