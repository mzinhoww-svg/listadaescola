# Listada Escola — Product Requirements Document (PRD)

**Versão:** 1.0  
**Escopo inicial:** Mato Grosso (MT)  
**Stack alvo:** Next.js + TypeScript + Supabase + PostgreSQL/PostGIS + Vercel  
**Status:** especificação-base para wireframes e implementação

---

## 1. Visão

O Listada Escola é uma plataforma de descoberta e conversão para listas escolares. O usuário informa uma localização, encontra escolas relevantes, consulta o perfil da escola, escolhe série/ano e acessa a lista escolar. A partir da lista, pode comprar em parceiros de e-commerce ou solicitar orçamento em papelarias locais por WhatsApp, com a lista pré-preenchida.

O catálogo inicial de escolas será carregado a partir do arquivo de escolas do INEP fornecido para o projeto, começando por Mato Grosso e mantendo o modelo preparado para expansão nacional.

### Proposta de valor

> Encontre a escola, descubra a lista e resolva a compra em um só lugar.

---

## 2. Princípios do produto

1. **Consulta sem login:** qualquer visitante pode pesquisar escolas, consultar perfis e visualizar listas publicadas.
2. **Contribuição exige login:** para enviar lista, sugerir escola, salvar favoritos ou avaliar, o usuário precisa estar autenticado.
3. **INEP é a identidade-base da escola:** o `inep_code` identifica a escola na fonte oficial; dados editoriais do Listada são mantidos separadamente.
4. **Contribuição comunitária passa por moderação:** nenhuma lista ou escola enviada por usuário é publicada automaticamente.
5. **Frontend não é autoridade de segurança:** autorização deve ser verificada no servidor/banco e reforçada por RLS no Supabase.
6. **Patrocínio é separado de avaliação:** escola patrocinada deve ser identificada como patrocinada; pagamento não altera a nota orgânica da escola.
7. **Mobile first:** a jornada principal deve ser rápida no celular e igualmente utilizável no desktop.
8. **SEO desde a arquitetura:** escolas, cidades e listas publicadas precisam ser indexáveis e compartilháveis.

---

## 3. Escopo geográfico inicial e base de dados

O CSV recebido contém 181.065 escolas e 21 campos. O recorte de MT contém:

- 2.722 escolas
- 141 municípios
- 2.246 escolas públicas
- 476 escolas privadas
- 2.023 localizações urbanas
- 699 localizações rurais
- 2.722 códigos INEP distintos
- 123 escolas sem telefone informado
- 1.178 escolas sem latitude/longitude no CSV

**Implicação:** busca por proximidade deve usar coordenadas quando disponíveis e possuir fallback por CEP/município quando não houver geolocalização.

### Dados de origem INEP

Código INEP, nome, UF, município, localização, localidade diferenciada, categoria administrativa, endereço, telefone, dependência administrativa, categoria da escola privada, convênio com poder público, regulamentação, porte, etapas/modalidades, outras ofertas, latitude, longitude, CEP e fonte do CEP.

### Dados editoriais/comerciais do Listada

Descrição editorial, fotos, logo, website, Instagram, WhatsApp, avaliações, destaques, patrocínio, status de verificação e dados complementares.

Esses dois conjuntos não devem ser misturados nem sobrescritos de forma indistinta.

---

## 4. Personas

### 4.1 Usuário final

Pessoa que procura uma escola e/ou sua lista escolar. Pode navegar anonimamente.

### 4.2 Contributor

Usuário autenticado que envia listas, sugere escolas, salva conteúdo e/ou avalia escolas. Não ganha privilégios administrativos por contribuir.

### 4.3 School Manager

Usuário autorizado a administrar conteúdo editorial/listas de uma escola específica, quando a funcionalidade estiver habilitada.

### 4.4 Store Manager

Usuário autorizado a administrar uma papelaria específica.

### 4.5 Admin / Super Admin

Usuário responsável por moderação, cadastros, patrocínios, parceiros, usuários, configurações e analytics.

---

## 5. Jornada principal

```text
Home
  ↓
Localização (CEP / cidade / localizar-me)
  ↓
Resultado de escolas
  ↓
Perfil da escola
  ↓
Série / ano letivo
  ↓
Lista escolar
  ↓
┌─────────────────────┬─────────────────────┐
│ Comprar online      │ Comprar local       │
│                     │                     │
│ E-commerce parceiro │ Papelarias próximas │
│ Deep link/carrinho  │ WhatsApp pré-fill   │
└─────────────────────┴─────────────────────┘
```

---

## 6. Sitemap

### 6.1 Público

- `/`
- `/escolas`
- `/escolas/[estado]`
- `/escolas/[estado]/[cidade]`
- `/escolas/[estado]/[cidade]/[school-slug]`
- `/listas`
- `/listas/[list-slug]`
- `/papelarias`
- `/papelarias/[estado]/[cidade]`
- `/papelarias/[store-slug]`
- `/como-funciona`
- `/para-escolas`
- `/para-papelarias`
- `/parceiros`
- `/enviar-lista`
- `/termos`
- `/privacidade`
- `/cookies`

### 6.2 Autenticação

- `/auth/entrar`
- `/auth/criar-conta`
- `/auth/recuperar-senha`
- `/auth/redefinir-senha`
- `/auth/verificar-email`

### 6.3 Conta

- `/minha-conta`
- `/minha-conta/perfil`
- `/minha-conta/listas`
- `/minha-conta/listas/rascunhos`
- `/minha-conta/listas/em-analise`
- `/minha-conta/listas/publicadas`
- `/minha-conta/listas/precisa-correcao`
- `/minha-conta/listas/rejeitadas`
- `/minha-conta/escolas-salvas`
- `/minha-conta/listas-salvas`
- `/minha-conta/historico`
- `/minha-conta/configuracoes`

### 6.4 Contribuição

- `/enviar-lista/escola`
- `/enviar-lista/ano-letivo`
- `/enviar-lista/serie`
- `/enviar-lista/itens`
- `/enviar-lista/anexo`
- `/enviar-lista/revisao`
- `/enviar-lista/enviado`
- `/sugerir-escola/dados`
- `/sugerir-escola/endereco`
- `/sugerir-escola/contato`
- `/sugerir-escola/revisao`
- `/sugerir-escola/enviado`

### 6.5 Administração

- `/admin/login`
- `/admin/dashboard`
- `/admin/escolas/*`
- `/admin/listas/*`
- `/admin/moderacao/*`
- `/admin/papelarias/*`
- `/admin/ecommerce/*`
- `/admin/produtos/*`
- `/admin/avaliacoes/*`
- `/admin/usuarios/*`
- `/admin/patrocinios/*`
- `/admin/analytics/*`
- `/admin/configuracoes/*`

---

## 7. Requisitos funcionais

### RF-001 — Localização

Aceitar CEP, cidade/bairro e geolocalização do navegador. O usuário deve poder alterar a localização.

### RF-002 — Busca por escolas

Retornar escolas ativas do território, priorizando proximidade quando coordenadas estiverem disponíveis e usando fallback por município/CEP quando não estiverem.

### RF-003 — Ranking

Separar três dimensões:

- **Relevância orgânica:** distância + popularidade + completude + disponibilidade de listas.
- **Avaliação:** nota baseada em avaliações moderadas.
- **Patrocínio:** posição/destaque comercial explicitamente sinalizado.

O algoritmo exato deve ser configurável no admin e não deve mascarar patrocínio como avaliação.

### RF-004 — Perfil da escola

Exibir dados públicos do cadastro, informações editoriais aprovadas, localização, contatos, etapas de ensino e listas disponíveis.

### RF-005 — Séries e anos

Uma escola pode possuir várias séries e várias listas por ano letivo. O ano letivo deve ser parte explícita da identidade da lista.

### RF-006 — Listas publicadas

Somente listas aprovadas podem ser exibidas publicamente.

### RF-007 — Contribuição

Usuário autenticado pode criar rascunho, adicionar itens, anexar arquivo, revisar e enviar uma lista para moderação.

### RF-008 — Sugestão de escola

Usuário autenticado pode sugerir escola não encontrada. A sugestão não cria registro oficial diretamente.

### RF-009 — Moderação

Admin pode aprovar, rejeitar ou pedir correção em contribuições. Cada ação relevante deve gerar registro de auditoria.

### RF-010 — E-commerce

Exibir parceiros ativos, logo, nome, botão e integração disponível. A integração pode ser deep link, página/lista ou carrinho, dependendo do parceiro.

### RF-011 — Papelarias locais

Exibir papelarias ativas próximas, com distância quando disponível, e botão para pedir orçamento via WhatsApp.

### RF-012 — WhatsApp

Gerar mensagem com escola, série, ano, itens e pergunta de preço/disponibilidade. O telefone deve ser validado e normalizado no servidor antes da geração do link.

### RF-013 — Favoritos

Usuário autenticado pode salvar escolas e listas.

### RF-014 — Avaliações

Usuário autenticado pode avaliar escola. Avaliações precisam de moderação antes de publicação.

### RF-015 — Analytics

Registrar buscas, visualizações e cliques por mecanismos server-side seguros, sem expor tabelas de analytics diretamente ao browser.

### RF-016 — Admin

CRUD, moderação, ranking, parceiros, patrocínios, usuários, permissões e métricas.

---

## 8. Regras de negócio

### RN-001 — Identidade da escola

`schools.inep_code` é único e não deve ser duplicado.

### RN-002 — Dados INEP

Importações atualizam apenas campos de origem INEP. Dados editoriais são mantidos separadamente.

### RN-003 — Publicação

Contribuições de usuários não podem tornar conteúdo público sem aprovação.

### RN-004 — Ownership

Toda contribuição deve estar vinculada a `submitted_by/created_by`.

### RN-005 — Alteração de escola

Usuário comum não altera diretamente uma escola INEP. Deve sugerir alteração/conteúdo.

### RN-006 — Exclusão

Registros mestre não devem ser fisicamente excluídos para corrigir mudanças de origem; preferir status/inativação e histórico.

### RN-007 — Histórico

Listas devem ser versionadas. A publicação de uma nova versão não deve apagar a versão anterior.

### RN-008 — Patrocínio

Campanhas patrocinadas devem ter período/status e ser explicitamente identificadas na interface.

### RN-009 — Distância

Quando latitude/longitude não estiverem disponíveis, a interface não deve fabricar uma distância. Deve usar fallback por município/CEP e indicar ausência de distância exata quando relevante.

### RN-010 — Upload

Anexos originais enviados pelo usuário ficam privados até que o conteúdo seja moderado/publicado.

---

## 9. Estados principais da lista

```text
DRAFT
SUBMITTED
UNDER_REVIEW
NEEDS_CORRECTION
APPROVED
REJECTED
ARCHIVED
```

Transições esperadas:

```text
DRAFT → SUBMITTED
SUBMITTED → UNDER_REVIEW
UNDER_REVIEW → APPROVED
UNDER_REVIEW → REJECTED
UNDER_REVIEW → NEEDS_CORRECTION
NEEDS_CORRECTION → SUBMITTED
APPROVED → ARCHIVED
```

Usuário comum não pode saltar para `APPROVED`, `REJECTED` ou `ARCHIVED`.

---

## 10. Modelo de dados conceitual

```text
profiles
    │
    ├── list_submissions ── submission_items ── products
    │          │
    │          └── submission_attachments
    │
    ├── reviews
    └── favorites

schools ── school_profiles
   │      ├── school_contacts
   │      ├── school_images
   │      ├── school_education_levels
   │      ├── school_series
   │      └── school_managers
   │
   └── school_lists
           └── school_list_versions
                   └── school_list_items

stores ── store_contacts
       ├── store_services
       └── store_managers

school_lists → list_product_mappings → ecommerce_products → ecommerce_partners
```

---

## 11. Requisitos de segurança

### SEC-001 — RLS

Todas as tabelas expostas ao cliente no schema público devem ter RLS habilitado e políticas explícitas.

### SEC-002 — IDOR

Qualquer acesso a objeto por ID deve verificar ownership, vínculo com escola/loja ou privilégio administrativo.

### SEC-003 — RBAC

Toda ação administrativa deve ser autorizada no servidor/banco. Esconder botão no frontend não é controle de segurança.

### SEC-004 — Secrets

Somente chaves publicáveis podem chegar ao browser. Secret/service keys ficam em runtime server-side e Vercel env vars não públicas.

### SEC-005 — XSS

Campos de usuário são texto por padrão. Rich text/Markdown só poderá ser renderizado após sanitização explícita.

### SEC-006 — Storage

Uploads de usuários ficam em bucket privado e são acessíveis apenas pelo dono/admin conforme RLS.

### SEC-007 — Audit log

Alterações administrativas e eventos de moderação devem ser auditáveis.

### SEC-008 — Rate limiting

Busca, autenticação, upload, avaliação, submissão e endpoints que disparem mensagens/analytics devem ter rate limiting no edge/server.

### SEC-009 — Validação de entrada

UUIDs, enums, datas, quantidades, CEP, URLs, telefones e payloads devem ser validados no servidor.

---

## 12. Supabase e segurança por domínio

| Domínio | Leitura pública | Escrita do usuário | Escrita administrativa |
|---|---:|---:|---:|
| Escolas INEP | Ativas | Não | Sim |
| Perfil editorial | Ativo | Não* | Sim |
| Listas publicadas | Aprovadas | Não* | Sim |
| Submissions | Não | Próprias | Sim |
| Anexos | Não | Próprios | Sim |
| Favoritos | Não | Próprios | Sim |
| Reviews | Aprovadas | Próprias | Sim/moderação |
| Papelarias | Ativas | Não* | Sim |
| E-commerce | Ativos | Não | Sim |
| Analytics | Não | Server-side | Sim |
| Patrocínios | Não | Não | Sim |

`*` School Manager/Store Manager podem receber permissões específicas e sempre devem ser limitados à entidade vinculada.

---

## 13. Performance e índices

Requisitos mínimos:

- índice GIST em pontos geográficos de escolas e lojas;
- índices por `status`, `state_id`, `city_id` e `school_id`;
- índice trigram para busca textual por nome de escola e papelaria;
- constraints de unicidade para INEP e slugs;
- paginação em resultados públicos e admin;
- consultas de proximidade limitadas por raio e quantidade;
- evitar N+1 para escola → listas → séries.

---

## 14. SEO

Páginas públicas e indexáveis:

- cidade/estado;
- escola;
- lista escolar;
- papelaria;
- páginas institucionais.

Devem existir `title`, `description`, canonical, Open Graph e JSON-LD apropriado quando aplicável.

---

## 15. Analytics de produto

Eventos mínimos:

```text
location_search
location_detected
school_search
school_impression
school_view
list_view
list_share
commerce_click
whatsapp_click
store_view
favorite_added
review_created
submission_started
submission_submitted
submission_approved
```

KPIs:

- buscas por localização;
- escolas vistas por busca;
- taxa de abertura de lista;
- clique em e-commerce;
- clique em WhatsApp;
- listas submetidas;
- taxa de aprovação;
- escolas/listas com maior demanda;
- CTR patrocinado.

---

## 16. Administração

### Dashboard

Visitas, buscas, escolas, listas, submissões pendentes, cliques e conversão.

### Escolas

Importar, visualizar, editar dados editoriais, verificar, ativar/inativar, patrocinar.

### Listas

Criar, revisar, versionar, publicar, arquivar.

### Moderação

Fila por prioridade, comparação do documento original com dados digitados, ações e observações.

### Usuários

Conta, status, papel, histórico de ações relevantes.

### Parceiros

Papelarias e e-commerce.

### Catálogo

Produtos, marcas, categorias e mapeamentos de parceiros.

### Patrocínios

Campanhas, períodos, prioridades, destinos e performance.

---

## 17. Wireframes que devem ser produzidos primeiro

### Grupo A — jornada principal

1. Home
2. Busca/localização
3. Resultados
4. Perfil da escola
5. Seleção de série/ano
6. Lista escolar
7. Comprar online
8. Papelarias próximas / bottom sheet
9. WhatsApp

### Grupo B — contribuição

10. Login
11. Seleção da escola
12. Ano/série
13. Itens
14. Upload
15. Revisão
16. Confirmação
17. Status da contribuição

### Grupo C — administração

18. Dashboard
19. Fila de moderação
20. Detalhe da submissão
21. Edição da escola
22. Edição da lista
23. Parceiros
24. Patrocínios
25. Analytics

---

## 18. MVP

### Incluído

- base INEP de MT;
- busca por CEP/localização;
- escolas por proximidade/fallback;
- perfil de escola;
- séries e listas;
- autenticação;
- envio comunitário de lista;
- upload privado;
- moderação;
- e-commerce parceiro;
- papelarias + WhatsApp;
- admin;
- analytics básicos;
- RLS + Storage policies;
- SEO básico.

### Fora do MVP

- pagamento dentro do Listada;
- estoque em tempo real de papelarias;
- checkout próprio;
- automação completa via WhatsApp Business API;
- marketplace proprietário;
- app nativo;
- IA para criar listas;
- expansão nacional antes da validação do fluxo MT.

---

## 19. Critérios de aceite do MVP

1. Um usuário anônimo consegue localizar e consultar uma escola ativa.
2. Um usuário anônimo consegue consultar uma lista aprovada.
3. Um usuário anônimo que tente enviar lista é direcionado ao login e retorna ao fluxo após autenticar.
4. Usuário A não consegue ler ou editar submission privada do usuário B.
5. Usuário comum não consegue aprovar sua própria lista.
6. Admin consegue moderar e publicar uma submission.
7. Uma lista publicada aparece no perfil correto da escola.
8. Escola patrocinada é identificada como patrocinada.
9. A busca por proximidade usa PostGIS quando há coordenadas.
10. Escolas sem coordenadas continuam encontráveis por município/CEP.
11. Upload privado não é publicamente acessível antes da aprovação.
12. Nenhum secret server-side aparece no bundle do cliente.
13. Alterações administrativas relevantes geram audit log.
14. Tentativas de acesso por ID sem autorização retornam negação de acesso, nunca dados de terceiros.

---

## 20. Decisões de arquitetura

### ADR resumido — Escolas INEP vs. conteúdo comunitário

A escola mestre pertence ao domínio de dados do INEP/Listada. O conteúdo enviado pelo usuário passa por `list_submissions` e só depois vira conteúdo público.

### ADR resumido — RLS

RLS é a barreira primária de isolamento dos dados no Supabase; autorização de negócio também é verificada em server actions/route handlers.

### ADR resumido — Geolocalização

PostGIS é utilizado para proximidade. Dados incompletos de coordenadas não são tratados como erro fatal: há fallback geográfico mais amplo.

---

## 21. Definition of Done — engenharia

- TypeScript sem erros;
- migrations reproduzíveis;
- RLS testado para anon/authenticated/admin;
- testes de IDOR para IDs arbitrários;
- testes de RBAC;
- testes de upload e Storage policies;
- validação de secrets e bundle;
- testes básicos de XSS nos campos livres;
- seed controlado para MT;
- documentação atualizada;
- build Vercel concluído;
- smoke test da jornada completa.
