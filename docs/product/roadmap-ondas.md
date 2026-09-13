# Roadmap — Ondas 3 a 10

Data: 2026-09-13. Estado de partida: Ondas 0–2 concluídas, produção no ar,
**2.722 escolas reais e 0 listas reais**.

Este documento existe para priorizar, não para ser executado em ordem. Cada
onda diz o que destrava, para quem, do que depende e como se prova que
funcionou.

---

## 0. A descoberta que reordena tudo

O responsável declarou que publicaria as listas **direto pelo portal de
admin**. Verificado no código: **essa capacidade não existe.**

| Evidência | Onde |
|---|---|
| A única criação de `school_lists` no sistema inteiro está dentro de `approve_submission()` | `20260911150000_moderation_guards.sql:70` |
| RPCs de lista disponíveis: só `admin_set_school_list_status` (arquivar/reativar) e `approve_submission` | `database.types.ts` |
| `/admin/listas` é uma **listagem read-only** — colunas Escola, Série/Ano, Status, Itens, Versão. Sem botão de criar. | `(admin)/admin/listas/page.tsx` |
| Um admin **não pode aprovar a própria submissão** | `moderation_guards.sql:48` — `raise exception 'you cannot review your own submission'` |

O encadeamento fecha em si mesmo: o único caminho para uma lista existir é
o wizard de contribuição → moderação. Mas o admin não aprova o que ele
mesmo enviou, então seriam necessárias **duas contas**. E criar a segunda
conta exige confirmação por e-mail, que exige SMTP, que ainda não está
configurado.

**Hoje, o responsável não consegue publicar uma única lista sozinho.**

(A fixture de QA entrou por SQL direto, contornando toda essa cadeia — foi
exatamente por isso que funcionou.)

Isso não é um item de backlog entre outros. É o gargalo do produto inteiro:
todo o resto está construído e ocioso esperando oferta.

---

## 1. Mapa de ICP — o que cada persona tem hoje

As cinco personas são as do PRD §4, não inventadas aqui.

| ICP | Produto hoje | Veredito |
|---|---|---|
| **Usuário final** (anônimo) | Busca, perfil de escola, lista, onde comprar — tudo construído e refinado | Bem servido, **mas a jornada morre no primeiro salto**: 0 listas |
| **Contributor** | Wizard de 4 passos completo + moderação completa | Construído e **inalcançável**: cadastro depende de SMTP |
| **School Manager** | Nada. O papel aparece só como rótulo no dropdown do admin | **Papel sem produto** |
| **Store Manager** | Nada. Idem | **Papel sem produto** |
| **Admin / Super Admin** | 17 rotas: moderação, CRUD, ranking, patrocínios, parceiros, analytics, vendas, usuários | Único ICP com produto completo — **menos criar listas** |

Dois dos cinco ICPs têm papel no enum, políticas de RLS escritas, atribuição
pelo admin — e nenhuma tela para onde ir depois.

---

## 2. As ondas

### Onda 3 — Home como captura de intenção
**ICP:** Usuário final · **Destrava:** sinal de demanda com zero oferta

A home hoje mostra zero escolas: as duas seções são condicionais e ambas as
queries voltam vazias. Vira um funil de intenção — a mãe procura a escola;
se tem lista, vai para ela; se não tem, deixa o e-mail para ser avisada.

- Uma busca só, não dois caminhos concorrentes com botões homônimos
- "Avise-me quando publicarem" — só e-mail, sem criar conta
- As duas seções órfãs viram uma seção honesta de cobertura

**Depende de:** o envio do aviso depende de SMTP. A captura, não.
**Prova:** e-mails capturados por escola = a lista priorizada de onde semear.

### Onda 4 — Publicação de listas pelo admin
**ICP:** Admin · **Destrava:** a existência de oferta. É o gargalo do §0.

- Criar lista direto no admin, sem passar pelo wizard nem pela moderação
- Entrada rápida: colar uma lista em texto e virar itens estruturados
- Deduplicação contra a unique constraint `(escola, etapa, série, ano)`
- Editar itens de uma lista publicada gerando nova versão (o versionamento
  já existe; falta a porta)

**Depende de:** nada. É a única onda sem dependência externa.
**Prova:** o responsável publica 10 listas reais em uma sessão, sem SQL.

### Onda 5 — Contas que funcionam
**ICP:** Contributor · **Destrava:** todo o lado da contribuição

O `signUpAction` não tem sinal de erro para tratar: o Supabase devolve HTTP
200 com o usuário criado mesmo quando não entrega o e-mail. Não é bug de
aplicação — é limite do SMTP embutido, documentado em
`docs/operations/smtp-setup.md`.

- SMTP customizado configurado (**tarefa do responsável**)
- Reenvio de confirmação, estados claros de "não recebeu"
- Decisão de produto: exigir confirmação, ou magic link?

**Depende de:** configuração de SMTP.
**Prova:** uma pessoa de fora cria conta e envia uma lista sem ajuda.

### Onda 6 — Papelaria: do cadastro ao orçamento
**ICP:** Store Manager · **Destrava:** o canal local e o lado da receita

Hoje há 0 papelarias e nenhum caminho de entrada: `/para-papelarias` é uma
página institucional **sem um único link**. A Onda 2 colocou um CTA
"Cadastrar minha papelaria" apontando para lá — que é um beco sem saída, e
isso é dívida que eu criei.

- Autocadastro de papelaria + reivindicação
- Área do gestor: perfil, horário, WhatsApp, raio de atendimento
- Caixa de pedidos de orçamento recebidos
- Fechar o laço com `store_sale_reports`, que já tem tela no admin

**Depende de:** Onda 5 (o gestor precisa de conta).
**Prova:** uma papelaria real se cadastra e recebe um pedido pelo WhatsApp.

### Onda 7 — Escola: perfil reivindicado
**ICP:** School Manager · **Destrava:** a fonte autoritativa de listas

Uma escola publicando a própria lista é oferta de qualidade muito superior
à contribuição de terceiros — e resolve o problema de confiança na origem.

- Fluxo de reivindicação com verificação de vínculo
- Área do gestor: perfil editorial, fotos, contatos
- Publicar e manter as listas da própria escola, com moderação mais leve

**Depende de:** Onda 5. E de uma decisão de produto difícil: **como alguém
prova que representa uma escola?** E-mail no domínio da escola não serve
para a maioria das escolas públicas de MT.
**Prova:** uma escola reivindica o perfil e publica a lista dela.

### Onda 8 — Comércio com profundidade
**ICP:** Usuário final + parceiro · **Destrava:** a tese de receita

O caminho existe ponta a ponta (deep link + tracking + relatório de vendas),
com 1 parceiro cadastrado e 0 ofertas mapeadas. A seção "Onde comprar"
aparece sempre, o que está certo — mas hoje aparece vazia.

- Catálogo de produtos e casamento item-da-lista → oferta
- Mais parceiros de e-commerce
- Relatório de conversão que feche o laço com o parceiro

**Depende de:** listas existirem (Onda 4). Sem itens, não há o que casar.
**Fronteira que não se move:** termina em link externo + tracking. Sem
checkout, carrinho ou pagamento — regra absoluta do `CLAUDE.md`.
**Prova:** primeiro clique de saída rastreado até uma venda reportada.

### Onda 9 — Confiança e prova social
**ICP:** Usuário final · **Destrava:** razão para escolher uma escola

O caminho de escrita de avaliação foi construído no Prompt 20, mas há 0
avaliações e o filtro "Avaliação mínima" só pode retornar zero.

- Tornar a avaliação alcançável e valer a pena escrever
- Dar significado ao selo "Verificada"
- Sinais de completude de perfil no card

**Depende de:** Onda 5 (avaliar exige conta) e de ter usuários reais.
**Prova:** primeira avaliação orgânica.

### Onda 10 — Alcance
**ICP:** todos · **Destrava:** crescimento além do bootstrap manual

- SEO de verdade: hoje o sitemap tem 2.867 URLs e quase nenhuma responde à
  intenção "lista de material da escola X"
- Expansão além de MT (o import do INEP já é reprodutível)
- Performance com volume real

**Depende de:** ter conteúdo que mereça ser indexado. Indexar 2.722 perfis
sem lista é o que a Onda 2 acabou de decidir **não** fazer na navegação.
**Prova:** tráfego orgânico chegando em páginas de lista.

---

## 3. Prioridade recomendada

**Onda 4 primeiro, sozinha.** É a única sem dependência externa e a única
que destrava a existência de oferta. Enquanto ela não existir, todo o resto
é infraestrutura para um produto vazio — e o plano declarado do responsável
(publicar via admin) está bloqueado.

**Onda 3 em seguida, ou em paralelo.** As duas se complementam: a 3 diz
*quais* escolas semear, a 4 permite semear. Juntas formam o motor de
bootstrap. A 3 sozinha captura demanda que não pode ser atendida; a 4
sozinha semeia às cegas.

**Onda 5 logo depois**, porque destrava três ondas de uma vez (6, 7 e 9
todas exigem conta). A parte de configuração é do responsável — quanto antes
começar, menos ela vira caminho crítico.

Depois disso a ordem passa a ser escolha de estratégia, não de dependência:

- **6 antes de 7** se a aposta é o canal local e a receita mais próxima
- **7 antes de 6** se a aposta é qualidade e volume de oferta
- **8** só faz sentido com listas em volume
- **9 e 10** são consequência, não causa

---

## 4. O que é decisão do responsável, não minha

1. **A home é buscador ou pedido de lista?** Minha recomendação é
   *nenhum dos dois* — é captura de intenção (Onda 3). Muda se a estratégia
   for crescer por contribuição da comunidade em vez de curadoria própria.
2. ~~**Como uma escola prova que é ela?** Bloqueia a Onda 7 inteira.~~
   **Decidido na Onda 7 (2026-09-13):** reivindicação com revisão humana
   pelo admin — não existe sinal automático confiável em MT, e inventar um
   seria fabricar verificação. Raciocínio completo, alternativas descartadas
   e o que torna a decisão reversível em `docs/product/school-claim.md`.
   Reversível: o responsável pode trocar o critério sem tocar em RLS.
3. **Papelaria ou escola primeiro?** Receita mais próxima vs. oferta de
   melhor qualidade.
4. **Confirmação por e-mail ou magic link?** Muda o custo de entrada do
   contributor.
5. **A fixture de QA sai agora ou fica?** Se a home passar a listar escolas
   com lista, ela aparece lá — o guard cobre sitemap e `noindex`, não a home.

---

## 5. Estado de execução

Atualizado em 2026-09-13, depois do Lote 1. Esta seção é registro do que
aconteceu, não plano — o plano está acima e não foi reescrito.

### Concluído e em produção

| Onda | PR | O que mudou de verdade |
|---|---|---|
| 3 — Home | #39 | Busca unificada, cobertura honesta (2.722 escolas / 141 cidades / **0 cidades com lista**), captura de intenção por e-mail em `list_notification_requests` |
| 4 — Publicação pelo admin | #39 | `admin_publish_list()` + `/admin/listas/nova` com parser de colagem. **O gargalo do produto caiu**: o responsável publica lista sozinho |
| 5 — Contas recuperáveis | #39 | `/auth/verificar-email` diz o estado real e oferece reenvio com cooldown; runbook de SMTP ampliado |

### Decisões que estavam listadas como "do responsável" e foram tomadas

O responsável delegou a priorização e pediu execução autônoma. As decisões
abaixo foram tomadas por mim, com o raciocínio registrado, e são todas
reversíveis:

1. **A home é captura de intenção.** Implementado na Onda 3.
2. **Como uma escola prova que é ela: reivindicação com revisão humana pelo
   admin.** E-mail em domínio da escola não serve para a maioria das escolas
   públicas de MT, que não têm domínio. Não existe sinal automático
   confiável, e inventar um seria fabricar verificação — a mesma classe de
   erro que "nunca fabricar distância". O admin decide vendo a solicitação ao
   lado dos dados INEP. Detalhe na doc da Onda 7.
3. **Papelaria e escola ao mesmo tempo**, não uma antes da outra: as duas
   dependiam só da Onda 5 e têm escopos de arquivo disjuntos, então foram
   paralelizadas em vez de sequenciadas.
4. **Confirmação por e-mail continua**, sem magic link: trocar o mecanismo
   não resolve o problema real, que é não haver SMTP. A Onda 5 tratou o
   sintoma (usuário preso) sem esconder a causa.
5. **A fixture de QA fica**, e o vazamento dela foi fechado — ver abaixo.

### Rastro da fixture de QA

A Onda 3 achou uma contradição na própria tela: a home renderizava o card
"QA — LISTA DE TESTE (conteúdo fictício, não usar)" logo acima de uma linha
dizendo "0 listas". `getRecentLists()` não voltava vazio, voltava a fixture.

Fechado em quatro lugares (`getRecentLists`, `getCoverageSummary`, e antes
disso sitemap e `robots: noindex`) e, por último, na RPC de busca:
`search_schools.list_count` contava a fixture, então o catálogo dizia "1
lista" para a escola-âncora. Como existe exatamente 1 `school_lists`
APPROVED no banco e ela é a fixture, **100% do `list_count` exibido era
ficção** — e `list_count` entra no `organic_score` com peso próprio, ou
seja, a fixture também mexia na ordenação de uma escola real.

**Incidente**: a primeira versão dessa correção escreveu `slug` sem
qualificar a tabela. `slug` também é OUT parameter de `search_schools`,
então o PL/pgSQL levantou `42702` em toda chamada e o catálogo caiu em
produção por cerca de 2 minutos até a reaplicação com alias. A armadilha já
estava documentada em `20260911170100_ranking_patrocinio_fix_ambiguous_id.sql`
— foi lida e repetida mesmo assim. Registro completo no cabeçalho de
`supabase/migrations/20260913060000_search_schools_exclude_qa_fixture.sql`.

### Em andamento

Ondas 6, 7 e 8 em paralelo na branch `feat/onda-6-7-8`, com escopos de
arquivo disjuntos e timestamps de migration reservados por onda.

### Sequenciamento pendente e por quê

- **Onda 9 (confiança)** espera a PR #38, de **outra sessão rodando em
  paralelo no mesmo repositório**, que mexe exatamente em rejeição e reenvio
  de avaliação (`reviews.rejection_reason`, `admin_reject_review`). Executar
  as duas ao mesmo tempo seria conflito garantido no mesmo arquivo.
- **Onda 10 (alcance)** por último, como o próprio roadmap previa: SEO com 0
  listas otimiza uma página que não tem o que oferecer. As 2.722 escolas e
  141 municípios já são conteúdo indexável e já estão no sitemap desde o
  Prompt 15 — o que falta é motivo para alguém chegar nelas.
