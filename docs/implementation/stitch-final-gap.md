# Stitch — comparação final design vs. implementação (Prompt de hardening)

**Status do MCP:** `STITCH_UNAVAILABLE`. Verificado nesta sessão via
`ToolSearch` por "stitch" contra a lista de ferramentas MCP carregadas —
`No matching deferred tools found`. Consistente com todas as sessões
anteriores deste projeto (`docs/implementation/stitch-mapping.md`,
`docs/development/WORKFLOW.md`): o MCP `stitch` nunca apareceu na lista de
ferramentas disponível, do Prompt 00 a este.

**Sobre a chave `STITCH_API_KEY` recebida junto com esta tarefa:** não foi
usada, não foi gravada em nenhum arquivo, e não foi passada a nenhum
comando. Ela chegou colada em texto puro numa mensagem de tarefa — exatamente
o cenário que `CLAUDE.md` proíbe ("Nunca peça, aceite ou grave uma
`STITCH_API_KEY` em código, Git, documentação, `.env.example`, bundle ou
logs — configuração de MCP com segredo é feita a nível de ambiente, nunca
colada em uma mensagem de tarefa. Qualquer chave que já tenha aparecido em
texto puro numa conversa deve ser tratada como comprometida e nunca
reutilizada"). Tratá-la como comprometida: **recomendação é rotacionar essa
chave agora**, independente de ter sido usada ou não — ela já está exposta
no histórico desta conversa. Também não há como configurar um MCP novo
*dentro* de uma sessão em andamento — servidores MCP são carregados na
inicialização do ambiente, não por um comando rodado em runtime (mesmo
motivo já registrado em `stitch-mapping.md` para a tentativa original).

## O que mudou nesta rodada: acesso real a um export do Stitch

O usuário anexou um arquivo (`stitch_design_system_listada_escola.zip`) com
32 telas exportadas do Stitch (cada uma com `code.html` + `screen.png`),
mais dois arquivos de design system (`design.md` e `caderno_vivo/DESIGN.md`)
e um mapa de fluxos de navegação. Isso **não é acesso ao MCP** (não dá para
"listar todos os designs do projeto" nem inspecionar interativamente), mas
é acesso real a conteúdo real do Stitch — então a comparação abaixo é feita
contra esse conteúdo, não inventada.

**Nota sobre `design.md`:** esse arquivo específico do zip descreve um
design system de um site completamente não relacionado
("Salários por empresa no Brasil", `salariotransparente.com.br`) — não é
sobre o Listada Escola. Ignorado. O arquivo real e relevante é
`caderno_vivo/DESIGN.md`.

## 1. Design system real ("Caderno Vivo") vs. o que foi implementado

Esta é a divergência mais impactante, porque afeta 100% das telas.

| Token | Caderno Vivo (Stitch) | Implementação atual | Divergência |
|---|---|---|---|
| Cor primária | `#5c6b8a` (slate-navy) | Tailwind `blue-600` (`#2563eb`) | Total — cor de marca diferente |
| Cor secundária/destaque | `#96aaff` (periwinkle) | Não existe token equivalente | Ausente |
| Superfície/fundo alternativo | `#ebefff`, `#fbf9f8` (papel/lavanda suave) | Só `#ffffff` e cinzas `slate` | Ausente |
| Tipografia de título | Plus Jakarta Sans, 600, tracking negativo | Geist (`next/font/google`) | Total — fonte diferente |
| Tipografia de corpo | Inter | Geist | Diferente |
| Raio de borda | 8px (pequenos) / 16–20px (cards) / pill (botões) | Ver `src/components/ui/*` (geralmente `rounded-lg` ~8px, sem raio grande em cards) | Parcial |
| Sombra | Difusa, baixo contraste (`0px 4px 16px -4px rgba(22,22,22,.06)`) | Sombras padrão Tailwind (`shadow-sm`) | Diferente, mais genérica |
| Personalidade visual | "Quentinho, tátil, papel/caderno escolar" (citação literal do `DESIGN.md`) | Neutra, estilo SaaS genérico | Total |

**Confirmado no próprio código:** `src/app/globals.css` já documenta isso
explicitamente desde o Prompt 01 —

> "PROVISÓRIO: não existe referência do Stitch nesta sessão (...) Estes
> valores são um ponto de partida coerente e acessível, não uma decisão de
> marca final."

Ou seja, isto não é uma alegação nova — é uma lacuna conhecida e
documentada desde o início, agora finalmente com uma referência real para
medir o tamanho dela. **Não alterei nenhum token nesta tarefa** (instrução
explícita: "não faça alterações visuais automaticamente nesta etapa").

## 2. Achado estrutural mais importante: duas visões de produto diferentes

O mapa de navegação do Stitch (`mapa_de_navegacao_prototipo_interativo/`)
e um conjunto de ~14 telas descrevem um fluxo completo que **inclui**:
carrinho/cesta própria → checkout → **geração de PIX** → separação/picking
em papelaria (esteira de bipagem) → retirada no balcão com scanner
validador → **cashback creditado** → **repasse de fundo de APM** →
extrato financeiro/conciliação → **sincronização com ERP (Bling)**.

Isso é, ponto a ponto, exatamente o que o PRD proíbe de forma absoluta e
repetida em todas as 21 prompts:

> "Proibido implementar checkout, PIX, cartão, boleto, gateway, payment
> intent, carrinho próprio ou processamento de pagamento (...) E-commerce
> termina em outbound/deep link + tracking. Papelaria termina em WhatsApp
> + tracking."

**Conclusão, não é ambígua:** o Stitch foi desenhado para uma versão do
produto mais madura/completa (marketplace transacional com fulfillment e
financeiro próprio) do que o MVP que o PRD define. A regra do projeto é
explícita sobre qual dos dois manda nesse conflito: *"PRD governa regra
funcional, segurança e escopo. Stitch governa referência visual — nunca o
contrário."* Portanto, a ausência dessas telas na implementação **não é um
gap a corrigir — é o comportamento correto**, e teria sido correto mesmo
que o Stitch estivesse disponível desde o Prompt 00. Marcadas como
**FORA DO MVP** abaixo, conforme a própria instrução original do Prompt 00
já prescrevia para esse cenário.

## 3. Tabela de telas

| # | Tela (Stitch) | Rota real equivalente | Design Stitch (resumo) | Implementação atual | Diferenças | Prioridade |
|---|---|---|---|---|---|---|
| 01 | Home / landing | `/` | Busca central, "não precisa criar conta", explicador "como funciona em 4 passos", destaques | Busca + escolas em destaque existem; **sem explicador em 4 passos** | Funcional: menor, mas não viola PRD. Visual: paleta/fonte divergente (seção 1) | Baixa |
| 02 | Busca/localização | `/` (LocationInput) | CEP + "usar minha localização atual", dica para pais | Implementado (CEP + geolocalização) | Visual apenas | Baixa |
| 03 + 03.1 | Resultados + filtros | `/escolas` | Mapa embutido na lista, filtros em bottom sheet | Implementado (`ResultsFilters`, `ResultsMap` separado, não embutido na lista) | Estrutural: mapa é painel lateral/sticky, não embutido por card; funcionalmente equivalente | Baixa |
| 04 | Perfil da escola | `/escolas/[uf]/[cidade]/[slug]` | "Validado há 3 dias pela coordenação" (selo com autor+data) | `is_verified` é booleano simples, sem autor/data | Funcional: menor granularidade de confiança | Baixa |
| 05 | Lista de material | `/listas/[slug]` | Checklist "já tenho" por item, estimativa de preço médio agregada | Lista mostra itens + ofertas de parceiro por item; **sem checklist "já tenho"** nem estimativa agregada de preço | Funcional real, mas é feature nova não pedida pelo PRD (RF-006 só exige mostrar a lista) | Baixa (feature nova — fora do escopo desta tarefa de hardening) |
| 06 | Comparador de papelarias | `NearbyStoresSheet` | Filtro por "menor preço"/"mais rápida", ETA de retirada/entrega | Mostra papelarias próximas + botão WhatsApp; **sem comparação de preço/tempo** (não há dado de preço/estoque em tempo real no schema) | Stitch presume um modelo de dados (preço/estoque por papelaria) que o PRD/schema atual não tem — não é um bug, é escopo de dado diferente | Baixa |
| 13 | Perfil com "dependentes/alunos" | `/minha-conta/perfil` | Perfil lista filhos/alunos vinculados | Perfil só tem nome/e-mail, sem conceito de dependente | PRD não define "dependente" como entidade — feature nova | Fora de escopo |
| 14 | Envio de lista não cadastrada | `/sugerir-escola`, `/enviar-lista` | Fluxo aparentemente com envio por foto (ver tela 19) | Fluxo real é formulário estruturado item a item, sem OCR/foto | Stitch presume captura por foto/OCR; PRD não pede isso (RF-007 é wizard estruturado) | Fora de escopo |
| 19 | "Cotação concluída da lista enviada por foto" | — | Depende de OCR de foto (não implementado) | N/A | Feature não prevista no PRD | Fora de escopo |
| 20 | Notificações via WhatsApp in-app | — | Central de notificações in-app + WhatsApp | Não existe sistema de notificação nenhum hoje | RF-015 não pede notificação, só analytics | Fora de escopo |
| 21 | Avaliação da papelaria (pós-retirada) | — | Avaliação por **papelaria**, associada a retirada de um aluno nomeado | `reviews` no schema real é só por **escola** (RF-014), sem conceito de retirada/aluno | Divergência estrutural: Stitch desenha um review de loja pós-transação; o que existe (e o que este próprio prompt de hardening pediu testar, seção 6) é review de escola | Fora de escopo (exigiria nova tabela + fluxo de "retirada") |
| 24 | Onboarding multi-perfil | `/auth/entrar`, `/auth/criar-conta` | 3 perfis distintos no login (Família / Papelaria / Escola) + login por código via WhatsApp | Login único genérico (e-mail+senha), sem diferenciação de perfil na tela, sem OTP WhatsApp | Divergência real de UX — mas os 3 perfis de "portal próprio" (escola/papelaria) nunca foram especificados como feature no PRD além do RBAC (que existe no banco, sem UI — "RBAC morto", já confirmado no Prompt 16) | Média (WhatsApp OTP é feature nova; mas o *texto* de onboarding poderia ser mais claro para o usuário sem violar escopo — não alterado aqui) |
| 25 | Central de ajuda | — | Menciona "Cashback", "carteira", "digitalizar foto" | Não existe central de ajuda no app hoje | Reforça achado da seção 2 (cashback é conceito real e recorrente no Stitch, mas fora do MVP) | Fora de escopo |
| logo | Logomarca | Header (`src/components/ui/header.tsx`) | Ícone + wordmark, cores `#5c6b8a`/`#96aaff` | Só texto "Listada Escola", sem ícone | Visual, sem risco funcional | Baixa |
| 07, 08 | Checkout / confirmação PIX | — | Carrinho próprio + geração de PIX | **Não existe, corretamente** | Proibido pelo PRD | **FORA DO MVP — nunca implementar** |
| 09, 11, 15 | Rastreamento/separação/scanner de balcão | — | Fulfillment físico com picking e validação por scanner | Não existe | Exigiria operação logística própria, fora do modelo "outbound + WhatsApp" | **FORA DO MVP** |
| 10, 16 | Portal da papelaria (dashboard/catálogo) | — | Autoatendimento completo para lojista | Papelarias são só registro admin-gerenciado — RBAC `STORE_MANAGER` existe no schema, zero UI (confirmado Prompt 16, "RBAC morto") | Portal de manager nunca foi especificado no PRD como entregável do MVP | Fora de escopo (não é "corrigir", é feature não pedida) |
| 12 | Minhas cestas / histórico de pedidos | — | Depende de carrinho/pedido próprio | N/A — não existe conceito de "pedido" no schema (só `store_sale_reports`, autorreportado manualmente por admin) | Depende de checkout, proibido | **FORA DO MVP** |
| 17, 18 | Convênios/cashback e financeiro/repasses | — | Cashback, fundo de APM, conciliação financeira | Não existe | Envolve movimentação financeira própria — adjacente a pagamento, proibido | **FORA DO MVP** |
| 22, 23 | Portal da escola (homologação, métricas) | — | Autoatendimento para coordenação escolar | `SCHOOL_MANAGER` existe no schema, zero UI | Mesma situação do portal de papelaria — feature de portal de manager nunca especificada no PRD como entregável do MVP | Fora de escopo |

## Conclusão

- **O design system de marca real (Caderno Vivo) nunca foi implementado.**
  Isso é uma lacuna visual real e grande, mas nenhuma alteração foi feita
  aqui — está fora do escopo desta tarefa de hardening ("não faça
  alterações visuais automaticamente"). Recomendação: se o usuário quiser
  fechar essa lacuna, é um prompt visual dedicado (trocar tokens de cor/
  fonte/raio/sombra em `globals.css` + `design-system.md`), não uma
  correção pontual.
- **Nenhuma das telas transacionais do Stitch (checkout/PIX/cashback/
  fulfillment/ERP) deve ser implementada** — confirma, com evidência
  concreta pela primeira vez, que a decisão de nunca construir essas
  telas (tomada às cegas, sem nunca ter visto o Stitch) foi a decisão
  certa.
- **Os dois "portais de manager" (escola e papelaria) explicam a origem
  dos papéis `SCHOOL_MANAGER`/`STORE_MANAGER`** que existem no RBAC desde
  o Prompt 02 mas nunca tiveram UI — eles foram desenhados no Stitch, mas
  nunca especificados como entregável do MVP no PRD. Não implementados
  aqui pelo mesmo motivo (feature nova, fora do escopo desta tarefa).
