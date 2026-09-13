# Listada Escola — Escola: perfil reivindicado (Onda 7)

Onda 7 do `docs/product/roadmap-ondas.md`. ICP: School Manager (PRD §4.3).
Destrava a fonte autoritativa de listas: uma escola publicando a própria
lista é oferta de qualidade muito superior à contribuição de terceiros, e
resolve o problema de confiança na origem.

Este documento existe por causa de uma frase específica do roadmap: a
Onda 7 dependia de **uma decisão de produto difícil — como alguém prova
que representa uma escola?** — listada em `roadmap-ondas.md` §"Decisões
que travam trabalho" como a pergunta que "bloqueia a Onda 7 inteira". A
decisão está tomada e registrada abaixo, com o raciocínio e com o que a
torna reversível.

Migrations: `supabase/migrations/20260913040000_school_claim_and_publish.sql`
(+ follow-ups `20260913040100`, `20260913040200`).
Prova de RLS e das guardas: `supabase/tests/onda7_school_claim.sql`.

Estado medido em produção antes de começar (2026-09-13): 2.722 escolas
INEP, **0 linhas em `school_managers`**, 0 perfis com papel
`SCHOOL_MANAGER`, 0 rotas do app para esse papel, e `/para-escolas` sem
um único link de ação relevante para uma escola já cadastrada.

---

## 1. A decisão: verificação por revisão humana

**Como alguém prova que representa uma escola: não prova sozinho. Declara,
e um humano da equipe confere antes de liberar.**

O reivindicante informa quatro coisas — nome, cargo/vínculo, um contato
institucional **da escola** e uma justificativa — e o admin decide vendo
isso lado a lado com os dados oficiais do INEP.

### Por que não existe verificação automática

A opção óbvia, e a que quase todo produto de marketplace usa, é **e-mail
em domínio da escola**: mande um código para `nome@escola.edu.br` e quem
receber está verificado. Ela não serve aqui, e não é por preguiça de
implementar:

- **A maioria das escolas públicas de MT não tem domínio próprio.** O
  contato que existe no Censo Escolar é um telefone fixo. Exigir domínio
  excluiria justamente o grosso do catálogo — 2.722 escolas em que a
  rede pública é a maior parte — e deixaria a Onda 7 valendo só para
  escolas privadas de capital.
- **Um sinal que a maioria não consegue produzir não é verificação, é
  filtro.** Ele não separa quem é de quem não é; separa quem tem
  infraestrutura de quem não tem.

As alternativas automáticas seguintes são piores pelo mesmo motivo de
fundo:

| Alternativa | Por que não |
|---|---|
| Código por SMS/ligação para `schools.phone` (INEP) | O telefone do Censo está desatualizado em parte relevante da base e, quando funciona, atende a secretaria inteira — não identifica *quem* atendeu. Custa dinheiro por tentativa e ainda assim depende de alguém confirmar do outro lado. |
| Upload de "comprovante de vínculo" | Não existe documento padronizado de "sou diretor desta escola". Pedir um PDF que ninguém tem obrigação de possuir, e que a nossa equipe não tem competência técnica nem legal para autenticar, é **teatro de verificação**: cria a aparência de rigor sem nenhum rigor. |
| Confiar e liberar na hora, moderando depois | Dá poder editorial sobre uma escola real, com nome e endereço reais, para qualquer conta. O dano (uma lista de material falsa que uma família compra) acontece antes de qualquer moderação. |

**A conclusão é a regra que o `CLAUDE.md` já aplica à distância: não
fabricar.** Não há sinal automático confiável de vínculo escolar em MT.
Inventar um seria produzir um selo que não significa nada. O caminho
honesto é declarar que a verificação é humana — inclusive para o usuário,
na própria tela — e dar ao humano o material para decidir.

### O que o admin realmente confere

A tela de decisão (`/admin/moderacao/reivindicacoes/[id]`) coloca dois
blocos lado a lado:

- **o que a pessoa declarou** — nome, cargo, contato institucional,
  justificativa, e a conta que enviou;
- **o que a base já diz** — nome oficial, código INEP, endereço,
  `schools.phone`, tipo/dependência administrativa, `school_contacts` e o
  perfil editorial já cadastrados, mais um aviso quando a escola já tem
  gestor.

O ato de verificação é ligar ou escrever para o contato da escola que a
**base** conhece (não o que o solicitante mandou) e confirmar que aquela
pessoa trabalha lá. A tela não faz isso por ninguém; ela só garante que a
informação necessária está na mesma tela que o botão.

> Nota honesta sobre o material de conferência: `school_contacts` tinha
> **0 linhas** em produção em 2026-09-13. Na prática, hoje o que o admin
> tem para conferir é `schools.phone` e `schools.address` do INEP. A tela
> já mostra `school_contacts` porque é lá que o contato curado vai passar
> a existir (inclusive cadastrado pelos próprios gestores aprovados), mas
> não vale fingir que ele existe agora.

### O que torna esta decisão reversível

A decisão está isolada em três lugares, e nenhum deles é um formato de
dado que trave o futuro:

1. **A tabela `school_claims` guarda declarações, não provas.** Adicionar
   um sinal automático depois (e-mail de domínio, código por telefone,
   integração com a Secretaria de Educação) é adicionar coluna e passar a
   preencher `reviewed_by` automaticamente — nenhuma linha existente
   precisa ser reinterpretada.
2. **Quem autoriza é `school_managers`, não o caminho pela qual a linha
   chegou lá.** `is_school_manager()` — o helper que 15 policies usam —
   olha só o vínculo. Trocar o critério de aprovação não toca em RLS
   nenhuma.
3. **A aprovação é uma função só**, `approve_school_claim()`. Um critério
   novo é um `if` dentro dela, ou uma segunda função que a chama depois
   de um sinal automático passar.

O que **não** é reversível de graça, e por isso foi escolhido com cuidado:
o vínculo aprovado dá poder de publicar lista sem fila. Retirar isso
depois de gente estar usando é uma quebra de contrato com a escola. Por
isso o poder concedido é deliberadamente estreito (§3).

---

## 2. O fluxo, de ponta a ponta

```
perfil público da escola          /para-escolas
"É a sua escola?"                 (institucional)
        └──────────────┬──────────────┘
                       ▼
             /reivindicar-escola            (exige conta)
                       │
                       ▼
             school_claims (SUBMITTED)
                       │  admin
        /admin/moderacao/reivindicacoes
                       │
        ┌──────────────┴───────────────┐
        ▼                              ▼
approve_school_claim()        reject_school_claim()
· cria `school_managers`      · motivo OBRIGATÓRIO
· promove o perfil            · o solicitante lê o motivo
  (só se ainda for USER)        e pode reenviar corrigido
· grava auditoria
        │
        ▼
   /minha-escola
   perfil editorial · contatos · fotos · listas
```

Detalhes que não são acidentais:

- **`/reivindicar-escola` mora em `(contribution)`**, junto de
  `/enviar-lista`, `/sugerir-escola` e `/cadastrar-papelaria`: é a mesma
  forma de interação — manda uma solicitação, uma vez, e vai embora. O
  painel permanente é `/minha-escola`.
- **O CTA no perfil público é discreto**, um parágrafo no rodapé da
  página. O público daquela página é a família procurando a lista; a
  diretora é a minoria dos acessos e chega ali uma vez só.
- **`/para-escolas` deixou de ser um beco.** Antes, o único link de ação
  apontava para `/sugerir-escola` — o formulário de "escola que não existe
  na base". Uma escola que já está no INEP (as 2.722 de MT estão) não tem
  o que sugerir: ela precisa de acesso ao próprio perfil.
- **Reivindicação ≠ sugestão.** `school_suggestions` (RF-008) continua
  sendo o caminho de "esta escola não existe na base". `school_claims` é
  "esta escola existe e é minha". São filas diferentes porque são decisões
  diferentes.
- **Rejeitar exige motivo** — no banco (`reject_school_claim` levanta
  exceção, e a constraint `school_claims_rejected_needs_reason` recusa a
  linha), não só na tela. Rejeitar sem dizer por quê não é rejeitar, é
  sumir com o pedido. E o motivo é o que permite reenviar corrigido: o
  índice único parcial só bloqueia uma segunda solicitação **pendente**.
- **Sem oráculo.** Um usuário lê a própria reivindicação e nada além. Não
  existe (nem pode existir) consulta do tipo "esta escola já foi
  reivindicada, e por quem".

---

## 3. O que o gestor aprovado ganha — e o que não ganha

A regra que governa o recorte já estava no `CLAUDE.md`: **INEP é master
data**. Ela não abre exceção para o gestor da escola.

**Ganha (conteúdo editorial da própria escola):**

- descrição, site, Instagram, WhatsApp (`school_profiles`);
- contatos adicionais, públicos ou internos (`school_contacts`);
- fotos (`school_images`, até 12);
- **publicar e republicar as listas de material da própria escola**, sem
  fila de moderação (`school_manager_publish_list`).

**Não ganha:**

- nome, código INEP, endereço oficial, coordenadas, `is_active`
  (`schools` continua com escrita só de admin — `schools_admin_all`);
- o selo **"Verificada"** (`school_profiles.is_verified`) nem
  `is_sponsored`;
- reverter uma foto que o admin escondeu, ou atribuir a si mesmo um
  revisor que não existiu (`school_images.approved_by`);
- qualquer poder sobre outra escola.

### Por que a moderação fica mais leve depois de aprovado

Moderação de contribuição existe porque quem envia é um terceiro sem
relação declarada com a escola — o moderador confere o documento anexado
contra os itens digitados. Aqui não há terceiro: o gestor **é** a fonte, e
foi verificado por um humano antes. Manter a fila seria pedir que a nossa
equipe confirme com a escola aquilo que a própria escola acabou de
publicar.

O que substitui a fila não é confiança cega, são três coisas:

1. **A verificação humana aconteceu antes**, na aprovação da
   reivindicação — é ela que paga por esta concessão;
2. **Auditoria completa e distinguível.** Toda publicação grava
   `SCHOOL_MANAGER_PUBLISH_LIST` em `audit_logs`, separado de
   `ADMIN_PUBLISH_LIST` e de `APPROVE_SUBMISSION`. Sem esse nome próprio o
   log não responderia "quem colocou esta lista no ar, a equipe ou a
   escola?" — que é exatamente a pergunta que a Onda 7 cria;
3. **O admin continua podendo arquivar** qualquer lista
   (`admin_set_school_list_status`) e esconder qualquer foto.

Republicar a mesma (escola, etapa, série, ano) **nunca sobrescreve**: cria
uma versão nova e preserva o histórico (RN-007), igual a
`admin_publish_list` e a `approve_submission`.

### Papel vs. vínculo

`approve_school_claim()` promove o perfil para `SCHOOL_MANAGER` **apenas
quando ele ainda é `USER`**. Um EDITOR, um STORE_MANAGER ou um ADMIN que
também dirija uma escola mantém o papel maior — papel é valor único, não
conjunto, e rebaixar seria pior que não promover.

Isso é possível porque **quem autoriza é o vínculo, não o papel**:
`is_school_manager()` lê `school_managers`. O papel serve para navegação e
telemetria. Por consequência, o guard de rota de `/minha-escola` também
checa o vínculo (e não `requireRole`) — senão trancaria do lado de fora
exatamente essas pessoas.

---

## 4. Um buraco que a Onda 7 acordou (e fechou)

Até esta onda, `school_managers` tinha **zero linhas** em produção. As dez
policies que dependiam de `is_school_manager()` eram, na prática, código
morto — e um problema nelas era teórico.

`school_profiles_manager_update` (de `20260910201000`) era
`using/with check (is_school_manager(school_id))` e mais nada: por
**linha**, não por coluna. Com um gestor real existindo, isso significa
que ele poderia dar `update school_profiles set is_verified = true` na
própria escola e ganhar o selo **"Verificada"** que a página pública
renderiza — exatamente o que o selo existe para não deixar acontecer.

A correção não pôde ser feita dentro da própria policy: RLS não tem
`WITH CHECK` por coluna, não enxerga `OLD`, e um `WITH CHECK` que relê a
própria tabela numa subconsulta **estoura** — testado ao vivo, o Postgres
devolve `42P17: infinite recursion detected in policy for relation
"school_profiles"`. (O truque equivalente em `profiles_update_own` só não
estoura porque passa por `is_admin()`, que é SECURITY DEFINER.)

A trava é um trigger `BEFORE INSERT OR UPDATE` que **restaura a coluna em
silêncio** para quem não é admin — mesmo padrão e mesma escolha de
`stores_protect_admin_columns()` (Onda 6): o gestor salva o que é dele e o
resto simplesmente não se move. `school_images` ganhou o equivalente para
`is_approved` (no UPDATE) e `approved_by`.

---

## 5. Limites conhecidos, registrados e não escondidos

- **Uma escola por gestor na UI.** O schema permite N
  (`unique (school_id, profile_id)`), mas `/minha-escola` usa a primeira
  (ordenada por `created_at`, para ser estável entre requests). Rede com
  várias escolas precisa de um seletor; quando aparecer, `getManagedSchool`
  vira lista.
- **Não há tela de revogar vínculo.** Hoje o admin remove a linha de
  `school_managers` direto no banco. É a mesma lacuna que
  `store_managers` tem desde a Onda 6.
- **O solicitante não é notificado.** A resposta aparece em
  `/minha-escola` quando ele volta. Notificação por e-mail depende do SMTP
  próprio, que ainda não está configurado (`docs/operations/smtp-setup.md`).
- **Fotos do gestor entram com `is_approved = true`.** É a decisão da §3
  aplicada a fotos; o admin pode esconder depois, e a partir daí o gestor
  não reverte. `approved_by` fica NULL, o que é literalmente verdade:
  ninguém revisou.
- **`school_manager_publish_list` não tem rate limit**, espelhando
  `admin_publish_list`. O gestor só publica na própria escola e passou por
  verificação humana; se isso virar problema, o mecanismo
  (`check_rate_limit`) já existe.
