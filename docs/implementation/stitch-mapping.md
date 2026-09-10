# Mapeamento Stitch → Rotas do PRD — Listada Escola

- **Data:** 2026-09-10
- **Status:** 🔴 **BLOQUEADO** — não foi possível produzir nenhum mapeamento real.

## Por que está bloqueado

Este mapeamento depende de duas coisas que precisam existir simultaneamente,
e nenhuma delas existe nesta sessão:

### 1. O MCP `stitch` não está disponível nesta sessão

O prompt presume que o MCP `stitch` já estaria configurado no ambiente. Ele
não está — a lista completa de servidores/ferramentas MCP disponíveis nesta
sessão foi conferida e não há nenhuma ferramenta `stitch`. O comando
`claude mcp add stitch --transport http --header "X-Goog-Api-Key: ..." ...`
enviado junto ao prompt **não foi executado**, por dois motivos:

- Servidores MCP são carregados na inicialização do ambiente da sessão;
  rodar esse comando dentro da sessão em andamento não teria adicionado as
  ferramentas do Stitch à lista de ferramentas já carregada nesta conversa.
- A chave de API incluída em texto puro no comando é um segredo. Ela não foi
  usada nem gravada em nenhum lugar deste repositório. Veja a nota de
  segurança em `docs/implementation/repository-audit.md` — recomenda-se
  rotacionar essa chave imediatamente, já que foi exposta em texto puro no
  histórico da conversa.

Sem acesso real ao MCP, não é possível listar, localizar ou inspecionar
nenhum design (composição, hierarquia, componentes, textos, responsividade,
estados) como pedido nas etapas 3–5 do prompt.

### 2. Não existe PRD no repositório para definir as rotas

Mesmo que o Stitch estivesse acessível, o mapeamento pedido é
"design → rota do PRD". O repositório está vazio: não existe
`docs/product/PRD.md`, então não há lista de rotas/telas do MVP contra a
qual comparar designs do Stitch. Ver `docs/implementation/repository-audit.md`
para a auditoria completa do estado do repositório.

## O que precisa acontecer antes deste mapeamento ser refeito

1. `docs/product/PRD.md` precisa existir e definir as rotas/telas do escopo
   Mato Grosso (incluindo quais fluxos são e-commerce/outbound, quais são
   papelaria/WhatsApp, e a lista de telas fora do MVP).
2. A chave do Stitch precisa ser rotacionada (a atual está comprometida) e
   configurada como variável de ambiente/segredo na plataforma que provisiona
   esta sessão — não colada em um prompt — para que o MCP `stitch` apareça
   na lista de ferramentas disponíveis desta sessão.
3. Com ambos disponíveis, repetir as etapas 3–5 do prompt: listar todos os
   designs no Stitch, mapear cada um a uma rota do PRD, e preencher a tabela
   abaixo.

## Estrutura do mapeamento (a ser preenchida quando desbloqueado)

Esqueleto de tabela para a próxima execução — nenhuma linha pode ser
preenchida honestamente agora, então nenhuma foi inventada:

| Rota (PRD) | Design (Stitch) | Desktop | Mobile | Componentes | Estados | Textos | Dependências | Divergências | Fora do MVP? |
|---|---|---|---|---|---|---|---|---|---|
| _(pendente PRD)_ | _(pendente Stitch)_ | | | | | | | | |

Regra a aplicar quando a tabela for preenchida: qualquer tela do Stitch que
envolva checkout, PIX, cartão, boleto, gateway, payment intent ou carrinho
próprio deve ser marcada explicitamente como **FORA DO MVP** na última
coluna, conforme regra absoluta do produto (e-commerce termina em
outbound/deep link + tracking; papelaria termina em WhatsApp + tracking).

## Conclusão

Nenhum design foi listado, nenhuma rota foi mapeada, e nenhuma divergência
foi registrada — porque não há dados reais de nenhum dos dois lados
(Stitch inacessível, PRD inexistente) para basear essas afirmações. Preencher
esta tabela sem acesso real teria significado inventar conteúdo, o que foi
evitado deliberadamente.
