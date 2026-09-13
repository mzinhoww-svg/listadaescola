# Listada Escola — Papelaria: do cadastro ao orçamento (Onda 6)

Onda 6 do `docs/product/roadmap-ondas.md`. ICP: Store Manager (PRD §4.4).
Destrava o canal local: até aqui o produto tinha papelaria no schema, na
busca por proximidade e no admin, mas **nenhuma porta de entrada para o
dono da papelaria** — e a única tela voltada a ele, `/para-papelarias`,
era institucional e não tinha um único link de ação. A Onda 2 apontou um
CTA "Cadastrar minha papelaria" para lá. Este documento registra como esse
beco foi fechado e, principalmente, **por quê cada decisão é a que é**.

Estado medido em produção antes de começar: 1 papelaria (a fixture de QA
`qa-teste-papelaria-cuiaba`, ver `docs/operations/qa-fixtures.md`), 0
linhas em `store_managers`, 0 perfis com papel `STORE_MANAGER`.

Migration: `supabase/migrations/20260913030000_store_self_service.sql`.

---

## 1. O fluxo, de ponta a ponta

```
/para-papelarias  ──►  /cadastrar-papelaria  ──►  store_claims (SUBMITTED)
 (institucional)        (exige conta)                     │
                                                          │  admin
                                            /admin/moderacao/papelarias
                                                          │
                            ┌─────────────────────────────┴───────────┐
                            ▼                                         ▼
                 approve_store_claim()                     reject_store_claim()
                 · cria (ou reativa) `stores`              · motivo obrigatório
                 · cria `store_managers`                   · o solicitante lê o motivo
                 · promove o perfil (só se for USER)         em /minha-papelaria
                 · grava auditoria
                            │
                            ▼
                     /minha-papelaria
              perfil · horário · WhatsApp · endereço
              entrega/retirada · serviços · caixa de pedidos
```

E o outro lado, o que gera o pedido:

```
família na lista escolar ──► /api/store/whatsapp ──► wa.me (mensagem pronta)
                                     │
                                     └─► record_store_quote_request()
                                         → store_quote_requests
                                         → visível em /minha-papelaria/pedidos
```

---

## 2. Decisões que não são óbvias

### 2.1 O autocadastro não cria uma linha em `stores`

O caminho mais curto seria uma policy de `INSERT` em `stores` para
`authenticated` com `with check (not is_active)` — "nasce invisível". Foi
recusado: isso deixaria qualquer conta autenticada despejar linhas órfãs,
sem dono e sem revisão, na tabela que alimenta `nearby_stores`, o sitemap
e o ranking, apostando que ninguém repare quando uma delas for ativada por
engano.

A solicitação vive em `store_claims`. A linha em `stores` só passa a
existir quando um admin aprova. O efeito visível para o público é
exatamente o pedido ("nasce invisível"), sem o passivo: **não existe
papelaria escondida, existe papelaria que ainda não existe**.

Consequência prática: a papelaria criada na aprovação nasce
`is_active = true`, porque a aprovação do admin *é* o ato de torná-la
visível. Não há um segundo botão de publicar.

### 2.2 Reivindicação e cadastro novo são a mesma fila

`store_claims.store_id` é `NULL` para papelaria nova e preenchido para
reivindicação de uma que o admin já cadastrou. Um formulário, uma fila,
uma RPC de aprovação. Ao aprovar, `store_id` passa a apontar para a
papelaria resultante nos dois casos — é o elo que liga a solicitação ao
que ela virou.

Numa reivindicação, os dados que o solicitante digitou **não sobrescrevem**
o cadastro existente. Aprovar dá a posse, não reescreve o que o admin
curou; a partir daí o gestor edita pela área dele, sob RLS, e a edição é
dele.

### 2.3 Sem oráculo

`store_claims` tem `SELECT` só da própria linha. Não existe — e não pode
existir — uma leitura do tipo "esta papelaria já foi reivindicada?".
Quem reivindica uma papelaria que já tem solicitação pendente de outra
pessoa simplesmente entra na fila; o admin decide. O formulário mostra
apenas a lista de papelarias ativas, que já é pública em `/papelarias`.

Um índice parcial único em `(requester_id, coalesce(store_id, uuid-zero))
where status = 'SUBMITTED'` impede a **mesma pessoa** de empilhar pedidos
repetidos — e é por pessoa, então não vaza nada sobre terceiros.

### 2.4 O papel só sobe quando é promoção de verdade

`approve_store_claim()` reusa `admin_set_user_role()` (que já valida o
papel, tem rate limit embutido e grava auditoria própria), mas **só quando
o solicitante ainda é `USER`**. Um `EDITOR`, um `SCHOOL_MANAGER` ou um
`ADMIN` que também tenha papelaria não é rebaixado para `STORE_MANAGER`.

O que autoriza de verdade sobre a papelaria é a linha em `store_managers`
— é o que `is_store_manager()` consulta. O papel serve para navegação e
rótulo. Por isso o guard de rota de `/minha-papelaria` também é o vínculo,
e não o papel (ver §4).

Limite herdado, e é intencional: `admin_set_user_role()` tem teto de 20
trocas de papel por admin por hora. Aprovar mais de 20 solicitações de
usuários novos numa hora vai esbarrar nele; a mensagem de erro diz isso em
português na tela do admin.

### 2.5 A caixa de pedidos não sabe nada sobre o visitante

`store_quote_requests` guarda `store_id`, `school_id`, `school_list_id` e
`created_at`. Não guarda e-mail, telefone, IP, user agent — nem
`profile_id`, mesmo quando o visitante está logado. O gestor vê **quantos
pedidos, de quais listas/escolas, quando**, e a conversa continua no
WhatsApp dele.

A única coluna derivada do visitante é `dedupe_hash`: `SHA-256(token
opaco de sessão | store_id | school_list_id)`. O token é um UUID aleatório
num cookie `httpOnly` **de sessão** (sem `Max-Age`: morre quando o
navegador fecha), documentado em `/cookies`. O hash é unidirecional e
serve a um propósito só — não contar o mesmo clique duas vezes numa janela
de 30 minutos.

E o gestor **não lê nem o hash**: RLS recorta linhas, então a promessa
sobre colunas é feita por `GRANT`. A tabela tem `SELECT` revogado de
`anon`/`authenticated` e concedido coluna a coluna
(`id, store_id, school_id, school_list_id, created_at`). Duas
consequências a lembrar: `select=*` nesta tabela falha para
`authenticated`, e **coluna nova nasce invisível** até ganhar `GRANT`
explícito.

### 2.6 Proteção contra inflação do número

Três camadas, nenhuma delas dependendo do frontend:

1. **Escrita só por RPC.** `store_quote_requests` não tem policy de
   `INSERT`, `UPDATE` nem `DELETE` — para ninguém, nem admin. A única
   porta é `record_store_quote_request()` (`SECURITY DEFINER`). "Um número
   de pedidos que qualquer cliente pudesse escrever não seria um número,
   seria um campo de texto."
2. **Deduplicação** por `(sessão, papelaria, lista)` em janela de 30
   minutos.
3. **Teto por papelaria**: 120 pedidos por hora, contados na tabela
   `rate_limit_hits` que o projeto já usa para rate limiting
   (`20260912000000_hardening_rn004_sec008_expand.sql`), chaveada pelo
   `store_id`. O rate limiting existente chaveia por `auth.uid()`, que
   aqui é sempre nulo — o visitante é anônimo —, então a chave possível é
   a própria papelaria.

Isso não impede inflação artesanal (quem troca de sessão troca de hash),
e não finge impedir: limita o estrago a uma ordem de grandeza que não
muda a leitura do número.

O envio de solicitação (`store_claims`) tem rate limit próprio, esse sim
por `auth.uid()`: 5 por hora, num trigger `BEFORE INSERT` — no banco, não
só na Server Action, porque a policy de `INSERT` é aberta para
`authenticated` e o PostgREST fala com a tabela direto.

### 2.7 RLS trava linhas; colunas precisaram de um trigger

`stores_manager_update` (de `20260910201200_rls_stores.sql`) é
`using/with check (is_store_manager(id))` — por linha. Ou seja: até esta
onda, um gestor podia escrever **qualquer** coluna da própria papelaria,
inclusive `is_sponsored` (peso de ranking, vendido comercialmente),
`is_active` (reverter uma desativação do admin) e `slug`/`uf` (mudar a URL
pública e o recorte geográfico).

RLS não tem `WITH CHECK` por coluna e não enxerga `OLD`, então a trava é o
trigger `stores_protect_admin_columns_trg`: para quem não é admin, essas
quatro colunas são restauradas ao valor anterior em vez de a escrita ser
recusada — o gestor salva o que é dele e o resto não se move. Chamadas sem
contexto de request (`auth.uid() is null`: service role, psql, migrations)
passam intactas, e `admin_upsert_store()` continua controlando `is_active`
normalmente (verificado ao vivo).

`municipality` **é** editável pelo gestor: uma papelaria que muda de
endereço é caso real, e o slug — que é o que a URL resolve — está
protegido.

### 2.8 O gestor enxerga a própria papelaria mesmo despublicada

Antes desta onda, um gestor tinha `UPDATE` em `stores` mas `SELECT` só
pela policy pública `stores_select_active`. Se um admin desativasse a
papelaria, o gestor perdia a leitura do próprio cadastro enquanto o
`UPDATE` continuava permitido — um formulário que salva o que não
consegue mostrar. `stores_manager_select` e `store_services_manager_select`
fecham isso.

---

## 3. Onde cada coisa mora

| Peça | Arquivo |
| --- | --- |
| Schema, RLS, RPCs, triggers | `supabase/migrations/20260913030000_store_self_service.sql` |
| Vocabulário de serviços | `src/lib/stores/services.ts` |
| Autocadastro (Server Action) | `src/lib/stores/store-claim-actions.ts` |
| Autocadastro (leituras) | `src/lib/stores/store-claims.ts` |
| Autocadastro (rota) | `src/app/(contribution)/cadastrar-papelaria/` |
| Área do gestor (leituras) | `src/lib/stores/manager.ts` |
| Área do gestor (Server Action) | `src/lib/stores/manager-actions.ts` |
| Área do gestor (rotas) | `src/app/(store)/minha-papelaria/` |
| Moderação (leituras) | `src/lib/admin/store-claims.ts` |
| Moderação (Server Actions) | `src/lib/admin/store-claim-actions.ts` |
| Moderação (rotas) | `src/app/(admin)/admin/moderacao/papelarias/` |
| Registro do handoff | `src/app/api/store/whatsapp/route.ts` |

### Por que `(contribution)` e não `(account)`

`/cadastrar-papelaria` mora em `(contribution)`, junto de `/enviar-lista`
e `/sugerir-escola`, porque é a mesma coisa que eles: um usuário
autenticado manda uma solicitação que cai numa fila de moderação, uma vez,
e vai embora — mesmo layout de tarefa focada, com um X para sair.
`(account)` é painel permanente de quem já tem algo. É lá que a papelaria
**aprovada** vive, em `/minha-papelaria` (grupo `(store)`, com o header e
a navegação de área logada).

---

## 4. Autorização

A regra do projeto vale inteira: **o frontend não autoriza nada**.

- `/cadastrar-papelaria` e `/minha-papelaria` entram na lista de prefixos
  protegidos do proxy (`src/lib/supabase/proxy.ts`) — isso só resolve "tem
  alguém logado".
- O layout de `/minha-papelaria` checa o **vínculo** (`store_managers`),
  não o papel. Diferente de `(admin)`, que usa `requireRole`: como
  `approve_store_claim()` não rebaixa quem já é mais que `USER`, um guard
  por papel trancaria gente do lado de fora da própria loja. O vínculo é
  exatamente o que `is_store_manager()` consulta, então guard e banco
  dizem a mesma coisa.
- Quem decide de verdade é a RLS, e ela foi provada por requisição HTTPS
  real com a chave publishable (não lendo a policy) — anônimo não escreve
  pedido de orçamento, usuário não lê solicitação alheia, gestor não lê
  pedido nem edita loja de outra papelaria, gestor não se patrocina nem se
  republica.

### Papéis por tabela

| Tabela | anon | authenticated | gestor | admin |
| --- | --- | --- | --- | --- |
| `store_claims` | nada | INSERT da própria, SELECT da própria | — | tudo |
| `store_quote_requests` | nada | nada | SELECT das da sua loja (5 colunas) | SELECT (mesma policy) |
| `stores` | SELECT das ativas | SELECT das ativas | + SELECT/UPDATE da sua (sem `is_active`, `is_sponsored`, `slug`, `uf`) | tudo |
| `store_services` | SELECT das ativas | SELECT das ativas | + SELECT/INSERT/DELETE das da sua loja | tudo |

Escrita em `store_quote_requests`: nenhuma linha da tabela acima. Só a
RPC.

---

## 5. O que esta onda deliberadamente não faz

- **Nenhum pagamento.** Sem checkout, PIX, cartão, boleto, gateway,
  carrinho ou cálculo de total. A papelaria termina em WhatsApp +
  tracking, e o texto de `/para-papelarias` e do formulário diz isso ao
  dono da loja com todas as letras (CLAUDE.md, regra absoluta).
- **Não fecha o laço com `store_sale_reports`.** O roadmap da Onda 6
  menciona isso; a tabela existe e tem tela no admin, mas hoje só tem
  policy de admin. Dar ao gestor a capacidade de reportar a conversão do
  próprio pedido é trabalho de uma próxima passada — e depende de existir
  pelo menos uma papelaria real usando a caixa de pedidos.
- **Não notifica ninguém.** Nem o gestor quando chega pedido, nem o
  solicitante quando a solicitação é decidida. SMTP não está configurado
  neste projeto (`docs/operations/smtp-setup.md`); o solicitante vê o
  estado e o motivo em `/minha-papelaria`.
- **Não trata gestor com várias papelarias.** O schema permite (unique é
  `(store_id, profile_id)`), e a área do gestor mostra a primeira. Um
  seletor de loja é trabalho de quando existir alguém nessa situação.
