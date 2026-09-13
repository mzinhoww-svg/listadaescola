# Fixtures de QA em produção

Conjunto mínimo de linhas semeadas no banco de produção para que as telas
que dependem de conteúdo tenham cobertura em auditoria automatizada
(`impeccable detect`, E2E). Sem elas, `/listas/[slug]` e
`/papelarias/.../[slug]` retornam 404 e as duas telas mais importantes do
produto ficam sem avaliação em toda rodada — ver
[`impeccable-critique.md`](../implementation/impeccable-critique.md) §1.1.

Autorizado pelo responsável em 2026-09-13.

## Por que isso precisa de cuidado

Conteúdo semeado fica **público e ancorado numa escola INEP real**:

- `src/app/sitemap.ts` submete toda lista publicada ao Google.
- `src/app/(public)/listas/[slug]/page.tsx` emite JSON-LD `ItemList` +
  `BreadcrumbList` nomeando a escola.

Uma lista de material fictícia indexada como conteúdo genuíno de uma escola
que existe é um dano real e difícil de desfazer: uma família pode agir em
cima dela. As fixtures são, por isso, seguras **por construção** e não por
promessa de remoção — a promessa anterior já falhou uma vez (as fixtures
`e2e-impeccable-*` que o responsável mandou manter foram apagadas por outra
sessão sem aviso).

## As três camadas de proteção

| Camada | Contra | Como |
|---|---|---|
| **Máquina** | indexação | Slug com prefixo `qa-teste-` sai do sitemap e é servido com `noindex, nofollow` (`src/lib/qa/fixtures.ts`) |
| **Humano** | ser enganado | O `series_name` é o `<h1>` da página e diz literalmente que é teste; o nome da papelaria idem |
| **Terceiro** | ser contatado | O WhatsApp da papelaria é `5565900000000` — formato válido para `normalizeWhatsappNumber` (DDD 65) mas **não atribuível**: um celular brasileiro real exige 6–9 logo após o 9 inicial |

Nenhuma delas depende de alguém lembrar de limpar.

## O que existe hoje

| Objeto | Identificador | Observação |
|---|---|---|
| Lista | `qa-teste-lista-educacao-infantil-2026` | 11 itens (8 obrigatórios, 3 opcionais), ancorada em `BERCARIO E DUCACAO INFANTIL TIA CORUJA` (Cuiabá) |
| Papelaria | `qa-teste-papelaria-cuiaba` | ~200 m da escola, para exercitar `nearby_stores()` |

Os **itens são realistas de propósito** — uma lista toda escrita "QA QA QA"
não exerceria comprimento de linha, quebra de nome nem distribuição de
badge, que é exatamente o que a auditoria mede. O aviso vive no título, que
é o texto maior da tela.

## Ordem de operações (importante)

O guard tem que estar **em produção** antes de a fixture ficar visível.
Semear primeiro e proteger depois é uma janela de exposição.

1. Guard mergeado e **deployado** (confirmar, não presumir — o fingerprint
   dos chunks em `/_next/static/` muda a cada build).
2. Semear com `school_lists.status = 'ARCHIVED'` e `stores.is_active = false`
   → as linhas existem e as URLs retornam 404.
3. Confirmar 404 nas duas URLs e zero ocorrências de `qa-teste` no
   `/sitemap.xml`.
4. Só então liberar (passo abaixo).

```sql
-- LIBERAR (torna público)
update school_lists set status = 'APPROVED' where slug like 'qa-teste-%';
update stores       set is_active = true    where slug like 'qa-teste-%';

-- ESCONDER de novo (rollback instantâneo, preserva as linhas)
update school_lists set status = 'ARCHIVED' where slug like 'qa-teste-%';
update stores       set is_active = false   where slug like 'qa-teste-%';
```

Depois de liberar, verificar que o guard está de fato agindo:

```bash
curl -s https://listadaescola.vercel.app/sitemap.xml | grep -c qa-teste   # tem que dar 0
curl -s https://listadaescola.vercel.app/listas/qa-teste-lista-educacao-infantil-2026 \
  | grep -o '<meta name="robots"[^>]*>'                                   # tem que ter noindex
```

## Remoção definitiva

```sql
begin;
delete from school_list_items
 where school_list_version_id in (
   select v.id from school_list_versions v
   join school_lists l on l.id = v.school_list_id
   where l.slug like 'qa-teste-%');
delete from school_list_versions
 where school_list_id in (select id from school_lists where slug like 'qa-teste-%');
delete from school_lists where slug like 'qa-teste-%';
delete from stores      where slug like 'qa-teste-%';
commit;
```

O guard em `src/lib/qa/fixtures.ts` pode ficar: é inerte sem fixtures e
volta a proteger na próxima vez que alguém precisar semear.

## Contas de QA

**Nenhuma conta `ADMIN` de QA deve existir em produção.** A anterior
(`e2e-impeccable-admin@example.com`) era um login administrativo com senha
não registrada em lugar nenhum — exposição registrada em
[`smtp-setup.md`](./smtp-setup.md), hoje resolvida por remoção.

Para auditar rotas autenticadas (`/enviar-lista`, `/minha-conta`), o padrão
é: conta com papel **`USER`**, senha **não armazenada em lugar nenhum**,
redefinida na hora pelo operador da auditoria e rotacionada ao final. Uma
senha em runbook, `.env.example` ou variável de CI é um segredo de longa
duração para uma necessidade de minutos.
